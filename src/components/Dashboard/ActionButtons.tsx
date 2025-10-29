import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Wallet, Gift } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface ActionButtonsProps {
  userId?: string;
  onRideUploaded?: () => void;
}

export const ActionButtons = ({ userId, onRideUploaded }: ActionButtonsProps) => {
  const [uploading, setUploading] = useState(false);

  const generateSampleRideData = () => {
    const duration = 30 + Math.floor(Math.random() * 30); // 30-60 minutes
    const distance = 15 + Math.random() * 20; // 15-35 km
    const pointCount = duration * 60; // 1 point per second
    
    const speed: number[] = [];
    const acceleration: number[] = [];
    const braking: number[] = [];
    const timestamps: number[] = [];
    const gps: { lat: number; lng: number }[] = [];
    
    let currentSpeed = 40;
    
    for (let i = 0; i < pointCount; i++) {
      timestamps.push(i);
      
      // Generate realistic speed variations
      const speedChange = (Math.random() - 0.5) * 4;
      currentSpeed = Math.max(20, Math.min(80, currentSpeed + speedChange));
      speed.push(currentSpeed);
      
      // Calculate acceleration/braking
      if (i > 0) {
        const speedDiff = speed[i] - speed[i - 1];
        if (speedDiff > 0) {
          acceleration.push(speedDiff);
          braking.push(0);
        } else {
          acceleration.push(0);
          braking.push(Math.abs(speedDiff));
        }
      } else {
        acceleration.push(0);
        braking.push(0);
      }
      
      // Generate GPS coordinates (simulated route)
      gps.push({
        lat: 28.6139 + (Math.random() - 0.5) * 0.1,
        lng: 77.2090 + (Math.random() - 0.5) * 0.1
      });
    }
    
    return {
      duration_minutes: duration,
      distance_km: Math.round(distance * 100) / 100,
      telemetry: {
        speed,
        timestamps,
        gps,
        acceleration,
        braking
      }
    };
  };

  const handleUploadRide = async () => {
    if (!userId) {
      toast.error("Please sign in to upload rides");
      return;
    }

    setUploading(true);
    
    try {
      // Generate sample ride data
      const rideData = generateSampleRideData();
      
      toast.info("Analyzing ride data...", {
        description: "AI is computing your safety score"
      });

      // Call the analyze-ride edge function
      const { data, error } = await supabase.functions.invoke('analyze-ride', {
        body: { ride_data: rideData }
      });

      if (error) throw error;

      toast.success("Ride analyzed successfully!", {
        description: `Safety Score: ${data.analysis.safety_score} | Tokens Earned: ${data.analysis.tokens_earned}`
      });

      if (onRideUploaded) {
        onRideUploaded();
      }
    } catch (error: any) {
      console.error('Error uploading ride:', error);
      toast.error("Failed to analyze ride", {
        description: error.message
      });
    } finally {
      setUploading(false);
    }
  };

  const handleConnectWallet = () => {
    toast.info("Connect Wallet", {
      description: "MetaMask integration coming soon for claiming your SafeRide Tokens."
    });
  };

  const handleClaimRewards = () => {
    toast.info("Claim Rewards", {
      description: "Your earned tokens will be transferred to your connected wallet."
    });
  };

  return (
    <Card className="glass p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button 
          size="lg" 
          className="w-full h-auto py-6 px-8 text-lg"
          onClick={handleUploadRide}
          disabled={uploading}
        >
          <Upload className="w-6 h-6 mr-3" />
          {uploading ? "Analyzing..." : "Upload Ride Data"}
        </Button>
        
        <Button 
          size="lg" 
          variant="secondary"
          className="w-full h-auto py-6 px-8 text-lg"
          onClick={handleConnectWallet}
        >
          <Wallet className="w-6 h-6 mr-3" />
          Connect Wallet
        </Button>
        
        <Button 
          size="lg" 
          className="w-full h-auto py-6 px-8 text-lg bg-accent hover:bg-accent/90"
          onClick={handleClaimRewards}
        >
          <Gift className="w-6 h-6 mr-3" />
          Claim Rewards
        </Button>
      </div>
    </Card>
  );
};
