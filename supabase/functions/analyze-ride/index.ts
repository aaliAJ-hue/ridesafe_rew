import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelemetryData {
  speed: number[];
  timestamps: number[];
  gps: { lat: number; lng: number }[];
  acceleration: number[];
  braking: number[];
}

interface RideData {
  duration_minutes: number;
  distance_km: number;
  telemetry: TelemetryData;
}

// AI/ML Safety Score Calculation Algorithm
function calculateSafetyScore(data: RideData) {
  let score = 100;
  const { telemetry, distance_km, duration_minutes } = data;
  
  // Calculate metrics
  const avgSpeed = telemetry.speed.reduce((a, b) => a + b, 0) / telemetry.speed.length;
  const maxSpeed = Math.max(...telemetry.speed);
  
  // Detect harsh braking (sudden decrease > 15 km/h in 1 second)
  let harshBrakingCount = 0;
  for (let i = 1; i < telemetry.braking.length; i++) {
    if (telemetry.braking[i] > 15) {
      harshBrakingCount++;
    }
  }
  
  // Detect harsh acceleration (sudden increase > 15 km/h in 1 second)
  let harshAccelerationCount = 0;
  for (let i = 1; i < telemetry.acceleration.length; i++) {
    if (telemetry.acceleration[i] > 15) {
      harshAccelerationCount++;
    }
  }
  
  // Detect speed violations (> 80 km/h on normal roads, > 120 km/h on highways)
  const speedLimit = maxSpeed > 100 ? 120 : 80;
  const speedViolations = telemetry.speed.filter(s => s > speedLimit).length;
  
  // Deduct points based on violations
  score -= harshBrakingCount * 5;
  score -= harshAccelerationCount * 5;
  score -= speedViolations * 2;
  
  // Bonus for consistent safe speeds (40-60 km/h)
  const safeSpeedRatio = telemetry.speed.filter(s => s >= 40 && s <= 60).length / telemetry.speed.length;
  if (safeSpeedRatio > 0.7) {
    score += 5;
  }
  
  // Ensure score is within 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  // Calculate tokens earned (1 token per 10 points above 60)
  const tokensEarned = score >= 60 ? Math.floor((score - 50) / 10) * 10 : 0;
  
  return {
    safety_score: score,
    tokens_earned: tokensEarned,
    avg_speed_kmh: Math.round(avgSpeed * 10) / 10,
    max_speed_kmh: Math.round(maxSpeed * 10) / 10,
    harsh_braking_count: harshBrakingCount,
    harsh_acceleration_count: harshAccelerationCount,
    speed_violations_count: speedViolations,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid token');
    }

    const { ride_data } = await req.json();
    
    if (!ride_data || !ride_data.telemetry) {
      throw new Error('Invalid ride data');
    }

    console.log('Analyzing ride for user:', user.id);
    
    // Run AI/ML analysis
    const analysis = calculateSafetyScore(ride_data);
    
    // Store ride in database
    const { data: rideRecord, error: insertError } = await supabaseClient
      .from('rides')
      .insert({
        user_id: user.id,
        duration_minutes: ride_data.duration_minutes,
        distance_km: ride_data.distance_km,
        avg_speed_kmh: analysis.avg_speed_kmh,
        max_speed_kmh: analysis.max_speed_kmh,
        harsh_braking_count: analysis.harsh_braking_count,
        harsh_acceleration_count: analysis.harsh_acceleration_count,
        speed_violations_count: analysis.speed_violations_count,
        safety_score: analysis.safety_score,
        tokens_earned: analysis.tokens_earned,
        telemetry_data: ride_data.telemetry,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting ride:', insertError);
      throw insertError;
    }

    console.log('Ride analyzed successfully:', rideRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        ride: rideRecord,
        analysis,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-ride:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
