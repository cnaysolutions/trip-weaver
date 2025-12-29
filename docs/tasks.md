# TripWeave Concierge - Implementation Tasks

> **Source of Truth** for feature implementation. Reference this document for current progress.
> Last updated: 2025-12-23

---

## 📊 Progress Overview

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | 🟢 Complete | Foundation & Authentication |
| Phase 2 | 🟡 In Progress | Concierge Trip Intake |
| Phase 3 | ⚪ Not Started | Flight Curation |
| Phase 4 | ⚪ Not Started | Cost Intelligence Core |
| Phase 5 | ⚪ Not Started | Airport Mobility |
| Phase 6 | ⚪ Not Started | Hotel Discovery |
| Phase 7 | ⚪ Not Started | Daily Itinerary Orchestration |
| Phase 8 | ⚪ Not Started | Concierge AI Layer |

---

## Phase 1: Foundation & Authentication

### 1.1 Database Schema Setup
**Status:** ⚪ Not Started

Create core database tables for the application.

#### Subtask 1.1.1: Create `profiles` table
```sql
-- Create profiles table for user data
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

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

#### Subtask 1.1.2: Create `trips` table
```sql
-- Create trips table
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

-- Index for user lookups
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_trips_status ON public.trips(status);
```

#### Subtask 1.1.3: Create `trip_items` table
```sql
-- Create trip_items table for flights, cars, hotels, activities
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
  day_number INTEGER, -- For itinerary ordering
  order_in_day INTEGER, -- Order within the day
  
  -- Location (for distance calculations)
  lat DECIMAL(10, 7),
  lon DECIMAL(10, 7),
  distance_from_previous DECIMAL(10, 2), -- km
  
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
```

---

### 1.2 Authentication Implementation
**Status:** 🟢 Complete

#### Subtask 1.2.1: Create Auth Page (`/auth`)
- [x] Create `src/pages/Auth.tsx`
- [x] Implement email/password sign up with validation (zod)
- [x] Implement email/password sign in
- [x] Add Google OAuth button (full-page redirect; avoids iframe/popup 403)
- [x] Handle auth errors gracefully with toast notifications
- [x] Set `emailRedirectTo` for signup
- [x] Match design system (navy, ivory, champagne)

**Reference files:**
- `src/index.css` - Design tokens
- `src/components/ui/button.tsx` - Button variants

**Code snippet for auth hook:**
```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithGoogle = async () => {
    const redirectTo = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (!error && data?.url) {
      try {
        if (window.top && window.top !== window) {
          window.open(data.url, '_top');
          return { error: null };
        }
      } catch {
        // ignore
      }

      window.location.href = data.url;
      return { error: null };
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return { user, session, loading, signUp, signIn, signInWithGoogle, signOut };
}
```

#### Subtask 1.2.2: Protected Routes
- [x] Create `src/components/auth/ProtectedRoute.tsx`
- [x] Redirect unauthenticated users to `/auth`
- [x] Show loading state during auth check

#### Subtask 1.2.3: Update Header with Auth State
- [x] Show user avatar/name when logged in
- [x] Add sign out button
- [x] Show "Sign In" link when logged out

---

### 1.3 Routing Setup
**Status:** ⚪ Not Started

**Routes to create:**
| Route | Component | Auth Required | Purpose |
|-------|-----------|---------------|---------|
| `/` | `Index.tsx` | No | Landing page |
| `/auth` | `Auth.tsx` | No | Login/signup |
| `/trips` | `Trips.tsx` | Yes | User's saved trips |
| `/trip/new` | `TripIntake.tsx` | Yes | Concierge intake |
| `/trip/:id` | `TripOverview.tsx` | Yes | Trip dashboard |
| `/trip/:id/flights` | `Flights.tsx` | Yes | Flight selection |
| `/trip/:id/mobility` | `Mobility.tsx` | Yes | Car rental |
| `/trip/:id/hotels` | `Hotels.tsx` | Yes | Hotel discovery |
| `/trip/:id/itinerary` | `Itinerary.tsx` | Yes | Daily itinerary |
| `/trip/:id/costs` | `Costs.tsx` | Yes | Cost intelligence |
| `/trip/:id/summary` | `Summary.tsx` | Yes | Final summary |

---

## Phase 2: Concierge Trip Intake

### 2.1 Amadeus API Integration
**Status:** 🟢 Complete

#### Subtask 2.1.1: Create Amadeus Edge Function for City Search ✅
**File:** `supabase/functions/amadeus-city-search/index.ts`

```typescript
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache token in memory (edge functions are short-lived)
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAmadeusToken(): Promise<string> {
  const now = Date.now();
  
  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.token;
  }

  const clientId = Deno.env.get('AMADEUS_API_KEY');
  const clientSecret = Deno.env.get('AMADEUS_API_SECRET');

  const response = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`
  });

  const data = await response.json();
  
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in * 1000) - 60000 // 1 min buffer
  };

  return cachedToken.token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword } = await req.json();
    
    if (!keyword || keyword.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Keyword must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = await getAmadeusToken();

    const url = new URL('https://api.amadeus.com/v1/reference-data/locations');
    url.searchParams.set('keyword', keyword);
    url.searchParams.set('subType', 'CITY,AIRPORT');
    url.searchParams.set('page[limit]', '10');

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    // Normalize response
    const locations = (data.data || []).map((loc: any) => ({
      name: loc.name,
      iataCode: loc.iataCode,
      subType: loc.subType,
      cityName: loc.address?.cityName || loc.name,
      countryCode: loc.address?.countryCode,
      countryName: loc.address?.countryName,
      lat: loc.geoCode?.latitude,
      lon: loc.geoCode?.longitude,
      // For airports, include the city code
      cityCode: loc.address?.cityCode
    }));

    console.log(`City search for "${keyword}": ${locations.length} results`);

    return new Response(
      JSON.stringify({ locations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Amadeus city search error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Update `supabase/config.toml`:**
```toml
project_id = "wpadifvbkmgnbwztcfli"

[functions.amadeus-city-search]
verify_jwt = false
```

#### Subtask 2.1.2: Create City Autocomplete Component ✅
**File:** `src/components/CityAutocomplete.tsx`

Features:
- [x] Debounced input (300ms)
- [x] Show loading state
- [x] Display city name + country + IATA code
- [x] Handle selection with full location data
- [x] Graceful error handling
- [x] Match design system

---

### 2.2 Trip Intake Form (Conversational)
**Status:** 🟢 Complete

#### Subtask 2.2.1: Refactor TripIntakeForm ✅
- [x] Replace free text inputs with CityAutocomplete
- [x] Show normalized city data after selection
- [x] Add conversational microcopy
- [x] Button enables when human input is complete (city text, dates, adults)
- [x] Post-click IATA normalization if user typed but didn't select
- [x] Gentle inline error if normalization fails
- [ ] Add form validation with zod (optional enhancement)
- [ ] Auto-save to database on changes (debounced)

**Microcopy examples from design-guidelines.md:**
- "Where would you like to start your journey?" ✅
- "And where are you dreaming of going?" ✅
- "When works best for you?" ✅
- "Who's coming along?" ✅

#### Subtask 2.2.2: Create /trip/new Route ✅
- [x] Created `src/pages/TripIntake.tsx` with SEO meta tags
- [x] Added protected route `/trip/new` in `src/App.tsx`
- [x] Renders TripIntakeForm with results display

---

## Phase 3: Flight Curation

### 3.1 Amadeus Flight Search
**Status:** ⚪ Not Started

#### Subtask 3.1.1: Create Flight Search Edge Function
**File:** `supabase/functions/amadeus-flight-search/index.ts`

```typescript
// Key parameters:
// - originLocationCode: IATA code
// - destinationLocationCode: IATA code
// - departureDate: YYYY-MM-DD
// - returnDate: YYYY-MM-DD (optional for one-way)
// - adults: number
// - children: number (optional)
// - infants: number (optional)
// - travelClass: ECONOMY | BUSINESS | FIRST
// - currencyCode: EUR (default)
// - max: 20 (limit results)

// Apply "reasonable pricing" filter:
// 1. Remove outliers (> 2 std dev from median)
// 2. Sort by value score (price vs duration ratio)
// 3. Return top 5-10 curated options
```

#### Subtask 3.1.2: Create Flight Card Component
**File:** `src/components/FlightCard.tsx`

Display:
- [ ] Airline logo/name
- [ ] Departure → Arrival airports (with IATA codes)
- [ ] Times and duration
- [ ] Number of stops
- [ ] Travel class badge
- [ ] Price per person
- [ ] Total price
- [ ] "Include/Exclude" toggle

---

### 3.2 Flight Selection Page
**Status:** ⚪ Not Started

**File:** `src/pages/Flights.tsx`

Features:
- [ ] Fetch flights on mount
- [ ] Show loading skeleton
- [ ] Display curated flight options
- [ ] Allow selection (updates trip_items)
- [ ] Show running total in sticky footer
- [ ] Navigation to next step (Mobility or Hotels)

---

## Phase 4: Cost Intelligence Core

### 4.1 Cost Engine
**Status:** ⚪ Not Started

#### Subtask 4.1.1: Create Cost Context/Hook
**File:** `src/hooks/useTripCost.ts`

```typescript
// Calculate total from trip_items where included = true
// React to item changes instantly
// Provide breakdown by category
// Handle currency conversion if needed

interface CostBreakdown {
  flights: number;
  cars: number;
  hotels: number;
  activities: number;
  total: number;
  currency: string;
}
```

#### Subtask 4.1.2: Create Cost Summary Component
**File:** `src/components/CostSummary.tsx`

Features:
- [ ] Sticky footer on trip pages
- [ ] Animated total updates (fade, not jump)
- [ ] Breakdown by category
- [ ] "Costs adjust instantly as you refine" microcopy

---

### 4.2 Toggle Functionality
**Status:** ⚪ Not Started

- [ ] "Do not consider in calculation" toggle on every item
- [ ] Optimistic UI updates
- [ ] Persist to database
- [ ] Recalculate distances when activities excluded

---

## Phase 5: Airport Mobility

### 5.1 Amadeus Car Rental Search
**Status:** ⚪ Not Started

#### Subtask 5.1.1: Create Car Rental Edge Function
**File:** `supabase/functions/amadeus-car-search/index.ts`

```typescript
// Amadeus Transfer Search or Car Rental endpoint
// Parameters:
// - pickUpLocation: IATA airport code
// - pickUpDateTime: ISO 8601
// - dropOffDateTime: ISO 8601
```

#### Subtask 5.1.2: Create Car Rental Card Component
**File:** `src/components/CarRentalCard.tsx`

Display:
- [ ] Vehicle type/category
- [ ] Provider name
- [ ] Pickup/dropoff times
- [ ] Total rental cost
- [ ] Include/Exclude toggle

---

### 5.2 Mobility Page
**Status:** ⚪ Not Started

**File:** `src/pages/Mobility.tsx`

Features:
- [ ] Toggle: "Include airport car rental?"
- [ ] Fetch options when enabled
- [ ] Curated selection (random within quality band)
- [ ] Auto-add to trip items

---

## Phase 6: Hotel Discovery

### 6.1 Amadeus Hotel Search
**Status:** ⚪ Not Started

#### Subtask 6.1.1: Create Hotel Search Edge Function
**File:** `supabase/functions/amadeus-hotel-search/index.ts`

```typescript
// Two-step process:
// 1. Hotel List by city (get hotel IDs)
// 2. Hotel Offers for selected hotels

// Parameters:
// - cityCode: IATA city code
// - checkInDate: YYYY-MM-DD
// - checkOutDate: YYYY-MM-DD
// - adults: number
// - roomQuantity: number
```

#### Subtask 6.1.2: Create Hotel Card Component
**File:** `src/components/HotelCard.tsx`

Display:
- [ ] Hotel name
- [ ] Star rating (if available)
- [ ] Price per night
- [ ] Total stay cost
- [ ] Distance from airport
- [ ] Include/Exclude toggle
- [ ] "Informational only" badge

---

### 6.2 Hotels Page
**Status:** ⚪ Not Started

**File:** `src/pages/Hotels.tsx`

Features:
- [ ] Toggle: "Include hotel in cost estimate?"
- [ ] View-only (no booking)
- [ ] Distance calculations from airport
- [ ] Reassuring microcopy: "For reference only. Book directly with the hotel."

---

## Phase 7: Daily Itinerary Orchestration

### 7.1 Attractions API Integration
**Status:** ⚪ Not Started

#### Subtask 7.1.1: Create Attractions Edge Function
**File:** `supabase/functions/attractions-search/index.ts`

Sources:
- OpenTripMap API (free tier)
- Google Places API (requires key)

```typescript
// Parameters:
// - lat, lon: center point (hotel location)
// - radius: meters (default 10000)
// - kinds: cultural, natural, architecture, etc.

// Return:
// - name
// - description (max 4 rows)
// - lat, lon
// - rating
// - image URL
```

#### Subtask 7.1.2: Create Attraction Card Component
**File:** `src/components/AttractionCard.tsx`

---

### 7.2 Itinerary Generation
**Status:** ⚪ Not Started

#### Subtask 7.2.1: Create Itinerary Generator
**File:** `src/lib/itineraryGenerator.ts`

Logic:
- [ ] Group activities by day
- [ ] Sequence by time and distance
- [ ] Include fixed events (flight arrival, hotel check-in, meals)
- [ ] Calculate distances between consecutive stops
- [ ] Apply pacing buffers (rest time after flight, meal breaks)

---

### 7.3 Itinerary Page
**Status:** ⚪ Not Started

**File:** `src/pages/Itinerary.tsx`

Features:
- [ ] Timeline-based layout (vertical)
- [ ] Day-by-day tabs or sections
- [ ] Each item shows time, duration, distance from previous
- [ ] Exclude toggle per activity
- [ ] Recalculate on exclusion

---

## Phase 8: Concierge AI Layer

### 8.1 AI Integration
**Status:** ⚪ Not Started

#### Subtask 8.1.1: Create AI Concierge Edge Function
**File:** `supabase/functions/ai-concierge/index.ts`

Requires: `OPENAI_API_KEY` secret

Personality (from design-guidelines.md):
- Calm
- Experienced
- Reassuring
- Never clever
- Explains only when asked

Capabilities:
- [ ] "Why this flight?" explanations
- [ ] "Optimize my itinerary" suggestions
- [ ] Alternative recommendations
- [ ] Budget adjustment guidance

---

### 8.2 AI UI Components
**Status:** ⚪ Not Started

#### Subtask 8.2.1: Create "Ask Concierge" Button
- [ ] Subtle placement (not intrusive)
- [ ] Expands to chat interface
- [ ] Maintains context of current trip

---

## Phase 9: Polish & Launch

### 9.1 Trip Summary Page
**Status:** ⚪ Not Started

**File:** `src/pages/Summary.tsx`

Features:
- [ ] Complete overview of trip
- [ ] All items with costs
- [ ] Final total
- [ ] Share link generation (read-only)
- [ ] Export as PDF (nice-to-have)

---

### 9.2 Saved Trips Dashboard
**Status:** ⚪ Not Started

**File:** `src/pages/Trips.tsx`

Features:
- [ ] List of user's trips
- [ ] Status badges (Draft, Planning, Complete)
- [ ] Quick actions (Continue, Delete)
- [ ] Create new trip button

---

### 9.3 Final QA Checklist
**Status:** ⚪ Not Started

From design-guidelines.md:
- [ ] Typography adheres to scale and rhythm
- [ ] Contrast ratios meet AA+
- [ ] Motion stays within 150–300ms
- [ ] Interactive states are distinct but quiet
- [ ] No component introduces urgency
- [ ] Full keyboard navigation
- [ ] ARIA-compliant components

Emotional audit:
- [ ] Does this feel calm?
- [ ] Does this respect the user's pace?
- [ ] Can the user change their mind safely?
- [ ] Would this feel supportive when tired?

---

## API Keys & Secrets Checklist

| Secret | Status | Used By |
|--------|--------|---------|
| `AMADEUS_API_KEY` | ✅ Added | Edge functions |
| `AMADEUS_API_SECRET` | ✅ Added | Edge functions |
| `OPENAI_API_KEY` | ⚪ Not Added | AI Concierge (Phase 8) |
| `GOOGLE_PLACES_API_KEY` | ⚪ Optional | Attractions (Phase 7) |

---

## File Structure (Target)

```
src/
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx
│   ├── concierge/
│   │   ├── CityAutocomplete.tsx
│   │   └── AskConcierge.tsx
│   ├── itinerary/
│   │   ├── DayTimeline.tsx
│   │   ├── TimelineItem.tsx
│   │   └── ItineraryGenerator.tsx
│   ├── pricing/
│   │   ├── CostSummary.tsx
│   │   ├── CostBreakdown.tsx
│   │   └── ItemToggle.tsx
│   ├── trips/
│   │   ├── FlightCard.tsx
│   │   ├── CarRentalCard.tsx
│   │   ├── HotelCard.tsx
│   │   └── AttractionCard.tsx
│   └── ui/ (shadcn components)
├── hooks/
│   ├── useAuth.ts
│   ├── useTripCost.ts
│   ├── useAmadeusSearch.ts
│   └── useAutoSave.ts
├── lib/
│   ├── amadeus.ts (client helpers)
│   ├── geo.ts (distance calculations)
│   ├── itineraryGenerator.ts
│   └── utils.ts
├── pages/
│   ├── Auth.tsx
│   ├── Trips.tsx
│   ├── TripIntake.tsx
│   ├── TripOverview.tsx
│   ├── Flights.tsx
│   ├── Mobility.tsx
│   ├── Hotels.tsx
│   ├── Itinerary.tsx
│   ├── Costs.tsx
│   └── Summary.tsx
├── types/
│   └── trip.ts (already exists)
└── integrations/
    └── supabase/

supabase/
├── config.toml
└── functions/
    ├── amadeus-city-search/
    │   └── index.ts
    ├── amadeus-flight-search/
    │   └── index.ts
    ├── amadeus-car-search/
    │   └── index.ts
    ├── amadeus-hotel-search/
    │   └── index.ts
    ├── attractions-search/
    │   └── index.ts
    └── ai-concierge/
        └── index.ts
```

---

## Notes for AI Agent

1. **Always check this document** before implementing features
2. **Mark tasks complete** when finished
3. **Reference SQL snippets** directly when running migrations
4. **Follow design-guidelines.md** for all UI decisions
5. **Use semantic tokens** from index.css, never raw colors
6. **Test RLS policies** - users should only see their own data
