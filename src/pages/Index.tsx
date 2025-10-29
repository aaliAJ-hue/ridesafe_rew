import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { RecentRides } from "@/components/Dashboard/RecentRides";
import { SafetyScore } from "@/components/Dashboard/SafetyScore";
import { Leaderboard } from "@/components/Dashboard/Leaderboard";
import { ActionButtons } from "@/components/Dashboard/ActionButtons";
import { Achievements } from "@/components/Dashboard/Achievements";
import { BikeIcon, LogOut, Bike, Coins, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import heroBike from "@/assets/hero-bike.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentScore, setCurrentScore] = useState(0);
  const [totalRides, setTotalRides] = useState(0);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [recentRides, setRecentRides] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadUserData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUserData = async (userId: string) => {
    try {
      // Load user stats
      const { data: stats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (stats) {
        setTotalRides(stats.total_rides);
        setTokensEarned(stats.total_tokens);
        setCurrentStreak(stats.current_streak);
        setCurrentScore(Math.round(stats.average_safety_score));
      }

      // Load recent rides
      const { data: rides } = await supabase
        .from('rides')
        .select('*')
        .eq('user_id', userId)
        .order('ride_date', { ascending: false })
        .limit(5);

      if (rides) {
        setRecentRides(rides.map(ride => ({
          id: ride.id,
          date: new Date(ride.ride_date).toLocaleDateString(),
          duration: `${ride.duration_minutes} min`,
          distance: `${ride.distance_km} km`,
          score: ride.safety_score,
          tokensEarned: ride.tokens_earned,
        })));
      }

      // Load achievements
      const { data: userAchievements } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId);

      if (userAchievements) {
        setAchievements(userAchievements);
      }

      // Load leaderboard
      const { data: leaderboardData } = await supabase.functions.invoke('get-leaderboard');
      
      if (leaderboardData?.leaderboard) {
        setLeaderboard(leaderboardData.leaderboard);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[60vh] overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={heroBike} 
            alt="Motorbike rider"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background"></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center text-center">
          <div className="absolute top-4 right-4">
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
          
          <BikeIcon className="w-20 h-20 text-accent mb-6 animate-pulse-glow" />
          <h1 className="text-5xl md:text-7xl font-bold mb-4 animate-fade-in">
            <span className="text-gradient">RideSafe</span> Rewards
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Earn crypto rewards for safe riding. AI-powered analytics meet blockchain transparency.
          </p>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="container mx-auto px-4 -mt-8 relative z-20 mb-12">
        <ActionButtons userId={user?.id} onRideUploaded={() => loadUserData(user?.id)} />
      </div>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 pb-12 space-y-8">
        {/* Safety Score and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="flex justify-center">
            <SafetyScore score={currentScore} />
          </div>
          
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard
              title="Total Rides"
              value={totalRides}
              icon={Bike}
              color="primary"
            />
            <StatsCard
              title="Tokens Earned"
              value={tokensEarned}
              icon={Coins}
              color="accent"
            />
            <StatsCard
              title="Current Streak"
              value={`${currentStreak} days`}
              icon={Flame}
              color="secondary"
            />
          </div>
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <Achievements achievements={achievements} />
        )}

        {/* Recent Rides and Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentRides rides={recentRides} />
          <Leaderboard entries={leaderboard} currentUserRank={leaderboard.findIndex(e => e.user_id === user?.id) + 1 || undefined} />
        </div>
      </div>
    </div>
  );
};

export default Index;
