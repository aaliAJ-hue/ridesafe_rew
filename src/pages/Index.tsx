import { SafetyScore } from "@/components/Dashboard/SafetyScore";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { RecentRides } from "@/components/Dashboard/RecentRides";
import { Leaderboard } from "@/components/Dashboard/Leaderboard";
import { ActionButtons } from "@/components/Dashboard/ActionButtons";
import { Achievements } from "@/components/Dashboard/Achievements";
import { Bike, Coins, Flame } from "lucide-react";
import heroBike from "@/assets/hero-bike.jpg";

const Index = () => {
  // Mock data - will be replaced with real API data
  const currentScore = 87;
  const stats = {
    totalRides: 156,
    tokensEarned: 3420,
    currentStreak: 12
  };

  const recentRides = [
    {
      id: "1",
      date: "Today, 2:30 PM",
      duration: "45 min",
      distance: "28.5 km",
      score: 92,
      tokensEarned: 25,
      route: "Downtown → Airport"
    },
    {
      id: "2",
      date: "Yesterday, 8:15 AM",
      duration: "32 min",
      distance: "19.2 km",
      score: 85,
      tokensEarned: 18,
      route: "Home → Office"
    },
    {
      id: "3",
      date: "2 days ago, 6:00 PM",
      duration: "55 min",
      distance: "42.8 km",
      score: 88,
      tokensEarned: 30,
      route: "City Center → Suburb"
    }
  ];

  const leaderboard = [
    { rank: 1, rider: "SpeedDemon", score: 95, tokens: 8520, rides: 342 },
    { rank: 2, rider: "SafeRider", score: 94, tokens: 7890, rides: 298 },
    { rank: 3, rider: "RoadWarrior", score: 92, tokens: 6750, rides: 267 },
    { rank: 4, rider: "You", score: 87, tokens: 3420, rides: 156 },
    { rank: 5, rider: "BikeNinja", score: 86, tokens: 5240, rides: 223 },
    { rank: 6, rider: "ThrottleMaster", score: 85, tokens: 4980, rides: 201 },
    { rank: 7, rider: "CruiseControl", score: 84, tokens: 4120, rides: 189 },
    { rank: 8, rider: "GearShifter", score: 82, tokens: 3890, rides: 178 },
  ];

  const achievements = [
    {
      id: "1",
      title: "First Ride",
      description: "Complete your first safe ride",
      icon: "shield" as const,
      unlocked: true
    },
    {
      id: "2",
      title: "Week Streak",
      description: "7 days of safe riding",
      icon: "flame" as const,
      unlocked: true
    },
    {
      id: "3",
      title: "Century Club",
      description: "Complete 100 rides",
      icon: "target" as const,
      unlocked: true
    },
    {
      id: "4",
      title: "Speed Demon",
      description: "Earn 5000 tokens",
      icon: "zap" as const,
      unlocked: false,
      progress: 68
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header 
        className="relative h-[400px] bg-cover bg-center flex items-center justify-center overflow-hidden"
        style={{ backgroundImage: `url(${heroBike})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        
        <div className="relative z-10 text-center px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 text-gradient animate-fade-in">
            RideSafe Rewards
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-6 animate-fade-in">
            Earn Tokens for Every Safe Ride
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-fade-in">
            <span className="flex items-center gap-1">
              <Bike className="w-4 h-4 text-primary" />
              AI-Powered
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Coins className="w-4 h-4 text-accent" />
              Blockchain Verified
            </span>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Score and Stats Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          <div className="lg:col-span-1 flex justify-center items-start">
            <div className="glass p-8 rounded-2xl">
              <SafetyScore score={currentScore} />
            </div>
          </div>
          
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard
              title="Total Rides"
              value={stats.totalRides}
              icon={Bike}
              trend={{ value: 12, isPositive: true }}
              color="primary"
            />
            <StatsCard
              title="Tokens Earned"
              value={stats.tokensEarned}
              icon={Coins}
              trend={{ value: 8, isPositive: true }}
              color="accent"
            />
            <StatsCard
              title="Current Streak"
              value={`${stats.currentStreak} days`}
              icon={Flame}
              color="secondary"
            />
          </div>
        </section>

        {/* Action Buttons */}
        <ActionButtons />

        {/* Achievements */}
        <Achievements achievements={achievements} />

        {/* Recent Rides and Leaderboard */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RecentRides rides={recentRides} />
          <Leaderboard entries={leaderboard} currentUserRank={4} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="text-sm">
            Powered by AI Analytics + Blockchain Technology
          </p>
          <p className="text-xs mt-2">
            Ride safe. Earn rewards. Build a safer community.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
