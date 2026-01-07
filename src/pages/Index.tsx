import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { TripIntakeForm } from "@/components/TripIntakeForm";
import { TripResults } from "@/components/TripResults";
import { Footer } from "@/components/Footer";
import { ContactForm } from "@/components/ContactForm";
import { generateMockTripPlan } from "@/data/mockTripData";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { TripDetails, TripPlan } from "@/types/trip";

const Index = () => {
  const [tripDetails, setTripDetails] = useState<TripDetails | null>(null);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { theme, mode, toggleTheme, setResultsMode, setPlanningMode, themeClass, modeClass } = useTheme();

  const handleFormSubmit = async (details: TripDetails) => {
    setIsLoading(true);
    setTripDetails(details);

    // Simulate API call delay for realistic experience
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const plan = generateMockTripPlan(details);
    
    // Save to Supabase if user is logged in
    if (user) {
      try {
        const { data: tripData, error: tripError } = await supabase
          .from('trips')
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
            status: 'planning',
            is_paid: false, // Explicitly set is_paid to false for newly generated trips
          })
          .select()
          .single();

        if (tripError) throw tripError;

        // Save itinerary items
        if (tripData && plan.itinerary) {
          const allItems = plan.itinerary.flatMap(day => 
            day.items.map(item => ({
              trip_id: tripData.id,
              day_number: day.day,
              name: item.title,
              description: item.description,
              item_type: item.type,
              time: item.time,
              cost: item.cost || 0,
              included: item.included
            }))
          );

          const { error: itemsError } = await supabase
            .from('trip_items')
            .insert(allItems);

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
            items: day.items.map((item) =>
              item.id === id ? { ...item, included: !item.included } : item
            ),
          })),
        };
      }

      return prev;
    });
  };

  const handleReset = () => {
    setTripDetails(null);
    setTripPlan(null);
    setPlanningMode();
  };

  return (
    <div className={`app-shell ${themeClass} ${modeClass}`}>
      <Header theme={theme} onToggleTheme={toggleTheme} />

      {!tripPlan ? (
        <>
          <HeroSection />
          <main className="container mx-auto px-4 py-16 max-w-2xl">
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="font-display text-3xl font-semibold text-foreground mb-3">
                Plan My Holiday Cost
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-lg mx-auto">
                Get a clear estimate of your full holiday — flights, hotel, car rental, 
                and daily expenses — using real-time prices.
              </p>
              <p className="text-muted-foreground/80 text-sm mt-2">
                No booking. No commitment. Just clarity.
              </p>
            </div>
            <TripIntakeForm onSubmit={handleFormSubmit} isLoading={isLoading} />
          </main>

          <section id="contact" className="bg-secondary/20 py-20 border-y border-border">
            <div className="container mx-auto px-4 max-w-2xl">
              <ContactForm />
            </div>
          </section>
        </>
      ) : (
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          {tripDetails && (
            <TripResults
              tripDetails={tripDetails}
              tripPlan={tripPlan}
              onToggleItem={handleToggleItem}
              onReset={handleReset}
            />
          )}
        </main>
      )}

      <Footer />
    </div>
  );
};

export default Index;
