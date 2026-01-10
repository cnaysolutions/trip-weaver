import { useState, useMemo } from "react";
import { format, isValid } from "date-fns";
import {
  Plane,
  Car,
  Building2,
  MapPin,
  Clock,
  DollarSign,
  ChevronRight,
  X,
  Check,
  Utensils,
  Camera,
  Coffee,
  Bed,
  Mail,
  FileText,
  Loader2,
  ExternalLink,
} from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { TripDetails, TripPlan, DayItinerary } from "@/types/trip";

// Helper function to generate Google Maps URL
const getGoogleMapsLink = (locationQuery: string): string => {
  const encodedLocation = encodeURIComponent(locationQuery);
  return `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
};

// Google Maps link component
const GoogleMapsLink = ({ query }: { query: string } ) => (
  <a
    href={getGoogleMapsLink(query)}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 hover:underline flex items-center text-sm"
  >
    <MapPin className="h-3 w-3 mr-1" /> View on Map
  </a>
);

interface TripResultsProps {
  tripDetails: TripDetails;
  tripPlan: TripPlan;
  tripId?: string;
  onToggleItem: (type: string, id: string) => void;
  onReset: () => void;
}

export function TripResults({
  tripDetails,
  tripPlan,
  tripId,
  onToggleItem,
  onReset,
}: TripResultsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const totalCost = useMemo(() => {
    let cost = 0;
    if (tripPlan.outboundFlight?.included) {
      cost += tripPlan.outboundFlight.pricePerPerson * (tripDetails.passengers.adults + tripDetails.passengers.children + tripDetails.passengers.infants);
    }
    if (tripPlan.returnFlight?.included) {
      cost += tripPlan.returnFlight.pricePerPerson * (tripDetails.passengers.adults + tripDetails.passengers.children + tripDetails.passengers.infants);
    }
    if (tripPlan.carRental?.included) {
      cost += tripPlan.carRental.totalPrice;
    }
    if (tripPlan.hotel?.included) {
      cost += tripPlan.hotel.totalPrice;
    }
    tripPlan.itinerary.forEach((day) => {
      day.items.forEach((item) => {
        if (item.included && item.cost) {
          cost += item.cost * (tripDetails.passengers.adults + tripDetails.passengers.children + tripDetails.passengers.infants);
        }
      });
    });
    return cost;
  }, [tripPlan, tripDetails]);

  const sendEmail = async () => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to send the trip to your email.",
        variant: "destructive",
      });
      return;
    }

    if (!tripId) {
      toast({
        title: "Trip not saved",
        description: "This trip hasn't been saved yet. Please save your trip first.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const loggedInEmail = user.email;
      if (!loggedInEmail) {
        throw new Error("User email not found.");
      }

      const { data, error } = await supabase.functions.invoke("send-trip-email", {
        body: {
          tripId: tripId,
          email: loggedInEmail,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email sent!",
        description: "Your trip itinerary has been sent to your email address.",
      });
    } catch (error) {
      console.error("Failed to send email:", error);
      toast({
        title: "Failed to send email",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">
          Your Itinerary: {tripDetails.departureCity} → {tripDetails.destinationCity}
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Button onClick={sendEmail} disabled={isSendingEmail}>
            {isSendingEmail ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Send to my email
          </Button>
          <Button variant="outline" onClick={onReset}>
            Start Over
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium text-gray-500">Estimated Total</p>
            <p className="text-4xl font-bold text-primary">
              €{totalCost.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>

          {/* Flights */}
          {tripPlan.outboundFlight || tripPlan.returnFlight ? (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center">
                <Plane className="mr-2 h-5 w-5 text-primary" /> Flights
              </h3>
              {tripPlan.outboundFlight && (
                <Card className={cn(!tripPlan.outboundFlight.included && "opacity-50")}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {tripPlan.outboundFlight.originCode} → {tripPlan.outboundFlight.destinationCode}
                      </p>
                      <p className="text-sm text-gray-500">
                        {tripPlan.outboundFlight.airline} • {tripPlan.outboundFlight.flightNumber}
                      </p>
                      <p className="text-sm text-gray-500">
                        {tripPlan.outboundFlight.departureTime} - {tripPlan.outboundFlight.arrivalTime} ({(tripPlan.outboundFlight.duration)})
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold">
                        €{(tripPlan.outboundFlight.pricePerPerson * (tripDetails.passengers.adults + tripDetails.passengers.children + tripDetails.passengers.infants)).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleItem("outboundFlight", tripPlan.outboundFlight!.id)}
                      >
                        {tripPlan.outboundFlight.included ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {tripPlan.returnFlight && (
                <Card className={cn(!tripPlan.returnFlight.included && "opacity-50")}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {tripPlan.returnFlight.originCode} → {tripPlan.returnFlight.destinationCode}
                      </p>
                      <p className="text-sm text-gray-500">
                        {tripPlan.returnFlight.airline} • {tripPlan.returnFlight.flightNumber}
                      </p>
                      <p className="text-sm text-gray-500">
                        {tripPlan.returnFlight.departureTime} - {tripPlan.returnFlight.arrivalTime} ({(tripPlan.returnFlight.duration)})
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold">
                        €{(tripPlan.returnFlight.pricePerPerson * (tripDetails.passengers.adults + tripDetails.passengers.children + tripDetails.passengers.infants)).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleItem("returnFlight", tripPlan.returnFlight!.id)}
                      >
                        {tripPlan.returnFlight.included ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}

          {/* Hotel */}
          {tripPlan.hotel ? (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center">
                <Building2 className="mr-2 h-5 w-5 text-primary" /> Accommodation
              </h3>
              <Card className={cn(!tripPlan.hotel.included && "opacity-50")}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{tripPlan.hotel.name}</p>
                    <p className="text-sm text-gray-500">
                      ⭐ {tripPlan.hotel.rating}/5 • {tripPlan.hotel.distanceFromAirport} from airport
                    </p>
                    <p className="text-sm text-gray-500">{tripPlan.hotel.address}</p>
                    <GoogleMapsLink query={`${tripPlan.hotel.name} ${tripDetails.destinationCity}`} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="font-semibold">
                      €{tripPlan.hotel.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleItem("hotel", tripPlan.hotel!.id)}
                    >
                      {tripPlan.hotel.included ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Car Rental */}
          {tripPlan.carRental ? (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center">
                <Car className="mr-2 h-5 w-5 text-primary" /> Car Rental
              </h3>
              <Card className={cn(!tripPlan.carRental.included && "opacity-50")}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{tripPlan.carRental.vehicleName}</p>
                    <p className="text-sm text-gray-500">{tripPlan.carRental.company}</p>
                    <p className="text-sm text-gray-500">
                      Pickup: {safeFormatDate(tripPlan.carRental.pickupTime, "MMM d, p")}
                    </p>
                    <p className="text-sm text-gray-500">
                      Dropoff: {safeFormatDate(tripPlan.carRental.dropoffTime, "MMM d, p")}
                    </p>
                    <GoogleMapsLink query={`${tripPlan.carRental.pickupLocation} ${tripDetails.destinationCity}`} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="font-semibold">
                      €{tripPlan.carRental.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleItem("carRental", tripPlan.carRental!.id)}
                    >
                      {tripPlan.carRental.included ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Daily Itinerary */}
          {tripPlan.itinerary && tripPlan.itinerary.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" /> Daily Itinerary
              </h3>
              {tripPlan.itinerary.map((day) => (
                <Card key={day.day}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Day {day.day}{day.date ? `: ${safeFormatDate(day.date, "EEEE, MMM d")}` : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {day.items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start justify-between",
                          !item.included && "opacity-50"
                        )}
                      >
                        <div className="flex items-start space-x-3">
                          <Clock className="h-4 w-4 text-gray-500 mt-1" />
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-sm text-gray-500">{item.time}</p>
                            {item.description && (
                              <p className="text-sm text-gray-500">{item.description}</p>
                            )}
                            {item.imageUrl && (
                              <img src={item.imageUrl} alt={item.title} className="w-24 h-auto rounded-md mt-2" />
                            )}
                            <div className="flex space-x-3 mt-2">
                              <GoogleMapsLink query={`${item.title} ${tripDetails.destinationCity}`} />
                              {item.bookingUrl && (
                                <a
                                  href={item.bookingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center text-sm"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" /> Book Now
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        {item.cost && (
                          <div className="flex items-center space-x-2">
                            <p className="font-semibold">
                              €{(item.cost * (tripDetails.passengers.adults + tripDetails.passengers.children + tripDetails.passengers.infants)).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onToggleItem("itinerary", item.id)}
                            >
                              {item.included ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-red-500" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
