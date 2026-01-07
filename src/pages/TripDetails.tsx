import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TripResults } from "@/components/TripResults";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TripPlan, TripDetails } from "@/types/trip";

export default function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{plan: TripPlan, details: TripDetails} | null>(null);

  useEffect(() => {
    async function fetchSavedTrip() {
      if (!id) return;
      
      // 1. Fetch the trip and all its items from Supabase
      const { data: trip, error } = await supabase
        .from("trips")
        .select(`*, trip_items(*)`)
        .eq("id", id)
        .single();

      if (error || !trip) {
        console.error("Error:", error);
        navigate("/trips");
        return;
      }

      // 2. Reconstruct the TripDetails (The search parameters)
      const details: TripDetails = {
        departureCity: trip.origin_city,
        destinationCity: trip.destination_city,
        departureDate: new Date(trip.departure_date),
        returnDate: new Date(trip.return_date),
        passengers: { adults: trip.adults, children: trip.children, infants: trip.infants },
        flightClass: trip.flight_class as any,
        includeCarRental: trip.include_car,
        includeHotel: trip.include_hotel,
      };

      // 3. Reconstruct the TripPlan (The AI results)
      const items = trip.trip_items || [];
      const plan: TripPlan = {
        outboundFlight: items.find((i: any) => i.item_type === 'flight' && (i.provider_data as any)?.direction === 'outbound')?.provider_data as any,
        returnFlight: items.find((i: any) => i.item_type === 'flight' && (i.provider_data as any)?.direction === 'return')?.provider_data as any,
        carRental: items.find((i: any) => i.item_type === 'car')?.provider_data as any,
        hotel: items.find((i: any) => i.item_type === 'hotel')?.provider_data as any,
        itinerary: [] // We'll fill this below
      };

      // Rebuild the daily itinerary
      const days: any[] = [];
      items.filter((i: any) => i.item_type === 'activity').forEach((item: any) => {
        const dayNum = item.day_number || 1;
        if (!days[dayNum - 1]) days[dayNum - 1] = { day: dayNum, items: [] };
        days[dayNum - 1].items.push({
          id: item.id,
          title: item.name,
          description: item.description,
          time: (item.provider_data as any)?.time || "09:00",
          type: "attraction",
          cost: item.cost,
          included: item.included,
          imageUrl: item.image_url,
          bookingUrl: item.booking_url
        });
      });
      plan.itinerary = days.filter(d => d !== undefined);

      setData({ plan, details });
      setLoading(false);
    }

    fetchSavedTrip();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-body">Loading your journey...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/trips")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Trips
        </Button>
        {data && <TripResults tripPlan={data.plan} tripDetails={data.details} />}
      </main>
      <Footer />
    </div>
  );
}

