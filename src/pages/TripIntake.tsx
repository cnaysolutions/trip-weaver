import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TripIntakeForm } from "@/components/TripIntakeForm";
import { TripResults } from "@/components/TripResults";
import { generateMockTripPlan } from "@/data/mockTripData";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { TripDetails, TripPlan } from "@/types/trip";

function setMetaTag(name: string, content: string) {
  const existing = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (existing) {
    existing.setAttribute("content", content);
    return;
  }

  const meta = document.createElement("meta");
  meta.setAttribute("name", name);
  meta.setAttribute("content", content);
  document.head.appendChild(meta);
}

function setCanonical(url: string) {
  const existing = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (existing) {
    existing.setAttribute("href", url);
    return;
  }

  const link = document.createElement("link");
  link.setAttribute("rel", "canonical");
  link.setAttribute("href", url);
  document.head.appendChild(link);
}

export default function TripIntake() {
  const [tripDetails, setTripDetails] = useState<TripDetails | null>(null);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [tripId, setTripId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { theme, toggleTheme, setResultsMode, setPlanningMode, themeClass, modeClass } = useTheme();

  useEffect(() => {
    document.title = "Plan a Trip | Best Holiday Plan";
    setMetaTag("description", "Plan an international trip with calm guidance, real prices, and reversible choices.");
    setCanonical(`${window.location.origin}/trip/new`);
  }, []);

  const handleFormSubmit = async (details: TripDetails) => {
    setIsLoading(true);
    setTripDetails(details);

    // Simulate API call delay for realistic experience
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const plan = await generateMockTripPlan(details);

    // Save to Supabase if user is logged in
    if (user) {
      try {
        const { data: tripData, error: tripError } = await supabase
          .from("trips")
          .insert({
            user_id: user.id,
            origin_city: details.departureCity,
            destination_city: details.destinationCity,
            departure_date: details.departureDate?.toISOString() || new Date().toISOString(),
            return_date: details.returnDate?.toISOString() || new Date().toISOString(),
            adults: details.passengers.adults,
            children: details.passengers.children,
            infants: details.passengers.infants,
            flight_class: details.flightClass,
            include_car: details.includeCarRental,
            include_hotel: details.includeHotel,
            status: "planning",
          })
          .select()
          .single();

        if (tripError) throw tripError;

        // Store the trip ID for email functionality
        setTripId(tripData.id);

        // Save itinerary items
        if (tripData && plan.itinerary) {
          const allItems = plan.itinerary.flatMap((day) =>
            day.items.map((item) => ({
              trip_id: tripData.id,
              day_number: day.day,
              name: item.title,
              description: item.description,
              item_type: item.type,
              cost: item.cost || 0,
              included: item.included,
              image_url: item.imageUrl,
              booking_url: item.bookingUrl,
            })),
          );

          const { error: itemsError } = await supabase.from("trip_items").insert(allItems);

          if (itemsError) throw itemsError;
        }
      } catch (error) {
        console.error("Error saving trip:", error);
      }
    }

    setTripPlan(plan);
    setIsLoading(false);

    // Switch to results mode
    setResultsMode();

    // Scroll to results
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  const handleToggleItem = (type: string, id: string) => {
    if (!tripPlan) return;

    setTripPlan((prev) => {
      if (!prev) return prev;

      if (type === "outboundFlight" && prev.outboundFlight) {
        return {
          ...prev,
          outboundFlight: { ...prev.outboundFlight, included: !prev.outboundFlight.included },
        };
      }
      if (type === "returnFlight" && prev.returnFlight) {
        return {
          ...prev,
          returnFlight: { ...prev.returnFlight, included: !prev.returnFlight.included },
        };
      }
      if (type === "carRental" && prev.carRental) {
        return {
          ...prev,
          carRental: { ...prev.carRental, included: !prev.carRental.included },
        };
      }
      if (type === "hotel" && prev.hotel) {
        return {
          ...prev,
          hotel: { ...prev.hotel, included: !prev.hotel.included },
        };
      }
      if (type === "itinerary") {
        return {
          ...prev,
          itinerary: prev.itinerary.map((day) => ({
            ...day,
            items: day.items.map((item) => (item.id === id ? { ...item, included: !item.included } : item)),
          })),
        };
      }

      return prev;
    });
  };

  const handleReset = () => {
    setTripDetails(null);
    setTripPlan(null);
    setTripId(undefined);
    setPlanningMode();
  };

  return (
    <div className={`app-shell ${themeClass} ${modeClass} flex flex-col`}>
      <Header theme={theme} onToggleTheme={toggleTheme} />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        {!tripPlan ? (
          <section className="max-w-2xl mx-auto">
            <header className="text-center mb-12 animate-fade-in">
              <h1 className="font-display text-3xl font-semibold text-foreground mb-3">Plan Your Trip</h1>
              <p className="text-muted-foreground leading-relaxed">
                Share the essentials. We'll orchestrate the details—calmly, with full control.
              </p>
            </header>

            <TripIntakeForm onSubmit={handleFormSubmit} isLoading={isLoading} />
          </section>
        ) : (
          <section>
            {tripDetails && (
              <TripResults
                tripDetails={tripDetails}
                tripPlan={tripPlan}
                tripId={tripId}
                onToggleItem={handleToggleItem}
                onReset={handleReset}
              />
            )}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
