import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TripResults } from "@/components/TripResults";
import { Loader2, ArrowLeft, Sparkles, Plane, Hotel, Car, MapPin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TripPlan, TripDetails } from "@/types/trip";
import { format, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Helper function for safe date parsing
function safeParseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string);
  return isValid(date) ? date : null;
}

// Helper function for safe date formatting
function safeFormatDate(value: unknown, formatStr: string, fallback: string = "Date not available"): string {
  const date = safeParseDate(value);
  if (!date) return fallback;
  try {
    return format(date, formatStr);
  } catch {
    return fallback;
  }
}

export default function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tripRecord, setTripRecord] = useState<any>(null);
  const [tripItems, setTripItems] = useState<any[]>([]);
  const [data, setData] = useState<{plan: TripPlan, details: TripDetails} | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    async function fetchSavedTrip() {
      if (!id) return;
      
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

      setTripRecord(trip);

      // Check if this is a preview trip (no trip_items)
      const items = Array.isArray(trip.trip_items) ? trip.trip_items : [];
      setTripItems(items);
      
      if (items.length === 0) {
        setIsPreview(true);
        setLoading(false);
        return;
      }

      // Reconstruct TripDetails
      const details: TripDetails = {
        departureCity: trip.origin_city,
        destinationCity: trip.destination_city,
        departureDate: safeParseDate(trip.departure_date),
        returnDate: safeParseDate(trip.return_date),
        passengers: { adults: trip.adults, children: trip.children, infants: trip.infants },
        flightClass: trip.flight_class as any,
        includeCarRental: trip.include_car,
        includeHotel: trip.include_hotel,
      };

      // Reconstruct TripPlan
      const flights = items.filter((i: any) => i.item_type === 'flight');
      const outboundFlightItem = flights.find((i: any) => (i.provider_data as any)?.direction === 'outbound');
      const returnFlightItem = flights.find((i: any) => (i.provider_data as any)?.direction === 'return');
      const carItem = items.find((i: any) => i.item_type === 'car');
      const hotelItem = items.find((i: any) => i.item_type === 'hotel');

      // Build flight objects with included status from DB
      const outboundFlight = outboundFlightItem ? {
        ...(outboundFlightItem.provider_data as any),
        included: outboundFlightItem.included,
        pricePerPerson: Number(outboundFlightItem.cost) || 0,
      } : null;

      const returnFlight = returnFlightItem ? {
        ...(returnFlightItem.provider_data as any),
        included: returnFlightItem.included,
        pricePerPerson: Number(returnFlightItem.cost) || 0,
      } : null;

      const carRental = carItem ? {
        ...(carItem.provider_data as any),
        included: carItem.included,
        totalPrice: Number(carItem.cost) || 0,
      } : null;

      const hotel = hotelItem ? {
        ...(hotelItem.provider_data as any),
        included: hotelItem.included,
        totalPrice: Number(hotelItem.cost) || 0,
      } : null;

      const plan: TripPlan = {
        outboundFlight,
        returnFlight,
        carRental,
        hotel,
        itinerary: [],
        totalCost: items.filter((i: any) => i.included).reduce((sum: number, i: any) => sum + Number(i.cost || 0), 0)
      };

      // Rebuild the daily itinerary from ALL non-flight/car/hotel items
      const itineraryItems = items.filter((i: any) => 
        !['flight', 'car', 'hotel'].includes(i.item_type)
      );
      
      const daysMap = new Map<number, any>();
      itineraryItems.forEach((item: any) => {
        const dayNum = item.day_number || 1;
        if (!daysMap.has(dayNum)) {
          daysMap.set(dayNum, { day: dayNum, date: "", items: [] });
        }
        daysMap.get(dayNum).items.push({
          id: item.id,
          title: item.name,
          description: item.description,
          time: (item.provider_data as any)?.time || "09:00",
          type: (item.provider_data as any)?.originalType || item.item_type || "attraction",
          cost: Number(item.cost) || 0,
          included: item.included,
          imageUrl: item.image_url,
          bookingUrl: item.booking_url,
          distance: (item.provider_data as any)?.distance,
          duration: (item.provider_data as any)?.duration,
        });
      });
      
      // Sort by day and then by order_in_day
      plan.itinerary = Array.from(daysMap.values())
        .sort((a, b) => a.day - b.day)
        .map(day => ({
          ...day,
          items: day.items.sort((a: any, b: any) => (a.order_in_day || 0) - (b.order_in_day || 0))
        }));

      setData({ plan, details });
      setLoading(false);
    }

    fetchSavedTrip();
  }, [id, navigate]);

  const sendEmail = async () => {
    if (!tripRecord || !user?.email) {
      toast({
        title: "Error",
        description: "Unable to send email. Please make sure you're logged in.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);

    try {
      const { data: result, error } = await supabase.functions.invoke("send-trip-email", {
        body: {
          tripId: tripRecord.id,
          email: user.email,
        },
      });

      if (error) throw error;

      toast({
        title: "Email sent!",
        description: `Your itinerary has been sent to ${user.email}`,
      });
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Failed to send email",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-body">Loading your journey...</p>
      </div>
    );
  }

  // Preview state for free trips
  if (isPreview && tripRecord) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate("/trips")} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Trips
          </Button>
          
          <Card className="max-w-2xl mx-auto border-primary/20 bg-gradient-to-br from-background to-muted/30">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-semibold text-foreground">
                  Trip Preview
                </h2>
                <p className="text-lg text-muted-foreground">
                  {tripRecord.origin_city} → {tripRecord.destination_city}
                </p>
                <p className="text-sm text-muted-foreground">
                  {safeFormatDate(tripRecord.departure_date, "MMM d")} – {safeFormatDate(tripRecord.return_date, "MMM d, yyyy")}
                </p>
              </div>

              <div className="py-6 border-y border-border/50 space-y-4">
                <p className="text-muted-foreground font-body">
                  This trip is a preview. Upgrade to unlock:
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-left">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Plane className="h-4 w-4 text-primary" />
                    <span>Flight options</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hotel className="h-4 w-4 text-primary" />
                    <span>Hotel recommendations</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Car className="h-4 w-4 text-primary" />
                    <span>Car rental deals</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>Daily itinerary</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  size="lg" 
                  className="w-full max-w-xs"
                  onClick={() => navigate("/#pricing")}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Buy Credits to Unlock
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full max-w-xs"
                  onClick={sendEmail}
                  disabled={isSendingEmail || !user?.email}
                >
                  {isSendingEmail ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send Preview to Email
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  1 credit = 1 fully planned trip
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
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
        {data && (
          <TripResults 
            tripPlan={data.plan} 
            tripDetails={data.details}
            tripId={id}
            onToggleItem={() => {}} 
            onReset={() => navigate("/trips")}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
