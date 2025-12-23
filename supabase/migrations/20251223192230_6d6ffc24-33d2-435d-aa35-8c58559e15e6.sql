-- =============================================
-- TripWeave Concierge: Phase 1 Database Schema
-- =============================================

-- 1. Create update_updated_at function (used by all tables)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. TRIPS TABLE
-- =============================================
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Trip details
  origin_city TEXT NOT NULL,
  origin_iata_code TEXT,
  origin_airport_codes TEXT[],
  origin_country TEXT,
  origin_lat DECIMAL(10, 7),
  origin_lon DECIMAL(10, 7),
  
  destination_city TEXT NOT NULL,
  destination_iata_code TEXT,
  destination_airport_codes TEXT[],
  destination_country TEXT,
  destination_lat DECIMAL(10, 7),
  destination_lon DECIMAL(10, 7),
  
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  
  -- Passengers
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  infants INTEGER NOT NULL DEFAULT 0,
  
  -- Preferences
  flight_class TEXT NOT NULL DEFAULT 'economy' CHECK (flight_class IN ('economy', 'business', 'first')),
  include_car BOOLEAN NOT NULL DEFAULT false,
  include_hotel BOOLEAN NOT NULL DEFAULT false,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planning', 'complete')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own trips"
  ON public.trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trips"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips"
  ON public.trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips"
  ON public.trips FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_trips_status ON public.trips(status);

-- =============================================
-- 4. TRIP_ITEMS TABLE
-- =============================================
CREATE TABLE public.trip_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  
  -- Item type
  item_type TEXT NOT NULL CHECK (item_type IN ('flight', 'car', 'hotel', 'activity')),
  
  -- Common fields
  name TEXT NOT NULL,
  description TEXT,
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  included BOOLEAN NOT NULL DEFAULT true,
  
  -- Provider data (JSON for flexibility)
  provider_data JSONB,
  
  -- Scheduling
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  day_number INTEGER,
  order_in_day INTEGER,
  
  -- Location
  lat DECIMAL(10, 7),
  lon DECIMAL(10, 7),
  distance_from_previous DECIMAL(10, 2),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_items ENABLE ROW LEVEL SECURITY;

-- RLS via trip ownership
CREATE POLICY "Users can view their trip items"
  ON public.trip_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = trip_items.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create trip items"
  ON public.trip_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = trip_items.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update trip items"
  ON public.trip_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = trip_items.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete trip items"
  ON public.trip_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = trip_items.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_trip_items_updated_at
  BEFORE UPDATE ON public.trip_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_trip_items_trip_id ON public.trip_items(trip_id);
CREATE INDEX idx_trip_items_type ON public.trip_items(item_type);
CREATE INDEX idx_trip_items_day ON public.trip_items(day_number, order_in_day);