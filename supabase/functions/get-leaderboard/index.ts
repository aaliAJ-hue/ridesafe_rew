import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
    );

    // Get top 10 riders by total tokens
    const { data: leaderboardData, error: leaderboardError } = await supabaseClient
      .from('user_stats')
      .select(`
        user_id,
        total_tokens,
        total_rides,
        average_safety_score,
        profiles!inner (
          full_name,
          email
        )
      `)
      .order('total_tokens', { ascending: false })
      .limit(10);

    if (leaderboardError) {
      throw leaderboardError;
    }

    // Format leaderboard data
    const leaderboard = leaderboardData.map((entry, index) => {
      const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
      return {
        rank: index + 1,
        rider: profile?.full_name || profile?.email?.split('@')[0] || 'Unknown Rider',
        score: Math.round(entry.average_safety_score),
        tokens: entry.total_tokens,
        rides: entry.total_rides,
        user_id: entry.user_id,
      };
    });

    return new Response(
      JSON.stringify({ leaderboard }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-leaderboard:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
