-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  wallet_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create rides table for storing ride telemetry and analysis
CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ride_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  duration_minutes INTEGER NOT NULL,
  distance_km DECIMAL(10,2) NOT NULL,
  avg_speed_kmh DECIMAL(10,2) NOT NULL,
  max_speed_kmh DECIMAL(10,2) NOT NULL,
  harsh_braking_count INTEGER DEFAULT 0,
  harsh_acceleration_count INTEGER DEFAULT 0,
  speed_violations_count INTEGER DEFAULT 0,
  safety_score INTEGER NOT NULL CHECK (safety_score >= 0 AND safety_score <= 100),
  tokens_earned INTEGER DEFAULT 0,
  telemetry_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  unlocked BOOLEAN DEFAULT false,
  progress INTEGER DEFAULT 0,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, achievement_type)
);

-- Create user_stats table for aggregated statistics
CREATE TABLE public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_rides INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  total_distance_km DECIMAL(10,2) DEFAULT 0,
  average_safety_score DECIMAL(5,2) DEFAULT 0,
  last_ride_date TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for rides
CREATE POLICY "Users can view their own rides"
  ON public.rides FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rides"
  ON public.rides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for achievements
CREATE POLICY "Users can view their own achievements"
  ON public.achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON public.achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements"
  ON public.achievements FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_stats
CREATE POLICY "Users can view their own stats"
  ON public.user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
  ON public.user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON public.user_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Public leaderboard view policy
CREATE POLICY "Anyone can view leaderboard"
  ON public.user_stats FOR SELECT
  USING (true);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  
  INSERT INTO public.user_stats (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user stats after ride
CREATE OR REPLACE FUNCTION public.update_user_stats_after_ride()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  days_since_last_ride INTEGER;
BEGIN
  -- Get days since last ride
  SELECT EXTRACT(DAY FROM (NEW.ride_date - last_ride_date))::INTEGER
  INTO days_since_last_ride
  FROM public.user_stats
  WHERE user_id = NEW.user_id;

  -- Update user stats
  UPDATE public.user_stats
  SET
    total_rides = total_rides + 1,
    total_tokens = total_tokens + NEW.tokens_earned,
    total_distance_km = total_distance_km + NEW.distance_km,
    average_safety_score = (
      SELECT AVG(safety_score)
      FROM public.rides
      WHERE user_id = NEW.user_id
    ),
    current_streak = CASE
      WHEN days_since_last_ride IS NULL OR days_since_last_ride <= 1 THEN current_streak + 1
      ELSE 1
    END,
    best_streak = CASE
      WHEN days_since_last_ride IS NULL OR days_since_last_ride <= 1 THEN
        GREATEST(best_streak, current_streak + 1)
      ELSE
        GREATEST(best_streak, 1)
    END,
    last_ride_date = NEW.ride_date,
    updated_at = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_stats_after_ride
  AFTER INSERT ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.update_user_stats_after_ride();

-- Function to check and unlock achievements
CREATE OR REPLACE FUNCTION public.check_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_total_rides INTEGER;
  user_current_streak INTEGER;
BEGIN
  SELECT total_rides, current_streak
  INTO user_total_rides, user_current_streak
  FROM public.user_stats
  WHERE user_id = NEW.user_id;

  -- First Ride Achievement
  IF user_total_rides = 1 THEN
    INSERT INTO public.achievements (user_id, achievement_type, title, description, icon, unlocked, progress, unlocked_at)
    VALUES (NEW.user_id, 'first_ride', 'First Ride', 'Complete your first safe ride', 'shield', true, 100, now())
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;

  -- Speed Demon Achievement (10 rides)
  IF user_total_rides >= 10 THEN
    INSERT INTO public.achievements (user_id, achievement_type, title, description, icon, unlocked, progress, unlocked_at)
    VALUES (NEW.user_id, 'speed_demon', 'Speed Demon', 'Complete 10 safe rides', 'flame', true, 100, now())
    ON CONFLICT (user_id, achievement_type) DO UPDATE SET unlocked = true, progress = 100, unlocked_at = now();
  ELSIF user_total_rides < 10 THEN
    INSERT INTO public.achievements (user_id, achievement_type, title, description, icon, unlocked, progress)
    VALUES (NEW.user_id, 'speed_demon', 'Speed Demon', 'Complete 10 safe rides', 'flame', false, user_total_rides * 10)
    ON CONFLICT (user_id, achievement_type) DO UPDATE SET progress = user_total_rides * 10;
  END IF;

  -- Safety Streak Achievement (7 day streak)
  IF user_current_streak >= 7 THEN
    INSERT INTO public.achievements (user_id, achievement_type, title, description, icon, unlocked, progress, unlocked_at)
    VALUES (NEW.user_id, 'safety_streak', 'Safety Streak', 'Ride safely for 7 days in a row', 'target', true, 100, now())
    ON CONFLICT (user_id, achievement_type) DO UPDATE SET unlocked = true, progress = 100, unlocked_at = now();
  ELSIF user_current_streak < 7 THEN
    INSERT INTO public.achievements (user_id, achievement_type, title, description, icon, unlocked, progress)
    VALUES (NEW.user_id, 'safety_streak', 'Safety Streak', 'Ride safely for 7 days in a row', 'target', false, (user_current_streak::DECIMAL / 7 * 100)::INTEGER)
    ON CONFLICT (user_id, achievement_type) DO UPDATE SET progress = (user_current_streak::DECIMAL / 7 * 100)::INTEGER;
  END IF;

  -- Perfect Score Achievement
  IF NEW.safety_score = 100 THEN
    INSERT INTO public.achievements (user_id, achievement_type, title, description, icon, unlocked, progress, unlocked_at)
    VALUES (NEW.user_id, 'perfect_score', 'Perfect Score', 'Achieve a perfect safety score', 'zap', true, 100, now())
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_achievements_after_ride
  AFTER INSERT ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.check_achievements();