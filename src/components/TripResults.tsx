import { useState, useMemo } from "react";
import { format } from "date-fns";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { TripDetails, TripPlan, DayItinerary } from "@/types/trip";

// Helper function to generate Google Maps URL
const getGoogleMapsLink = (locationQuery: string): string => {
  const encodedLocation = encodeURIComponent(locationQuery);
  return `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
};

// Google Maps link component
function GoogleMapsLink({ query, className }: { query: string; className?: string }) {
  return (
    <a
      href={getGoogleMapsLink(query)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors",
        className
      )}
    >
      <ExternalLink className="h-3 w-3" />
      View on Google Maps
    </a>
  );
}

interface TripResultsProps {
  tripDetails: TripDetails;
  tripPlan: TripPlan;
  onToggleItem: (type: string, id: string) => void;
  onReset: () => void;
}

export function TripResults({ tripDetails, tripPlan, onToggleItem, onReset }: TripResultsProps) {
  const [activeDay, setActiveDay] = useState(0);
  const [emailFormat, setEmailFormat] = useState<"text" | "html">("html");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const totalCost = useMemo(() => {
    let cost = 0;
    const totalPassengers = tripDetails.passengers.adults + tripDetails.passengers.children;
    
    // Flights are already priced per person
    if (tripPlan.outboundFlight?.included) {
      cost += tripPlan.outboundFlight.pricePerPerson * totalPassengers;
    }
    if (tripPlan.returnFlight?.included) {
      cost += tripPlan.returnFlight.pricePerPerson * totalPassengers;
    }
    
    // Hotel, car rental, and itinerary costs multiplied by passengers
    if (tripPlan.carRental?.included) {
      cost += tripPlan.carRental.totalPrice * totalPassengers;
    }
    if (tripPlan.hotel?.included) {
      cost += tripPlan.hotel.totalPrice * totalPassengers;
    }

    tripPlan.itinerary.forEach((day) => {
      day.items.forEach((item) => {
        if (item.included && item.cost) {
          cost += item.cost * totalPassengers;
        }
      });
    });

    return cost;
  }, [tripPlan, tripDetails]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const sendEmail = async () => {
    const loggedInEmail = user?.email || user?.user_metadata?.email;

    if (!loggedInEmail) {
      toast({
        title: "Email not available",
        description: "Please sign in to send the itinerary to your email.",
        variant: "destructive",
      });
      return;
    }

    if (!tripPlan) {
      toast({
        title: "No itinerary",
        description: "Please complete a trip search first.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("send-trip-email", {
        body: {
          email: loggedInEmail,
          data: {
            ...tripPlan,
            passengers: tripDetails.passengers.adults + tripDetails.passengers.children
          },
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email sent!",
        description: "Check your inbox for your trip itinerary.",
      });
    } catch (error) {
      toast({
        title: "Failed to send email",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "flight":
        return Plane;
      case "transport":
        return Car;
      case "hotel":
        return Building2;
      case "meal":
        return Utensils;
      case "attraction":
        return Camera;
      case "rest":
        return Coffee;
      default:
        return MapPin;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl font-semibold text-foreground">
            Your Itinerary
          </h2>
          <p className="text-muted-foreground mt-1">
            {tripDetails.departureCity} → {tripDetails.destinationCity}
          </p>
        </div>
        <Button variant="outline" onClick={onReset}>
          Start Over
        </Button>
      </div>

      {/* Flights Section */}
      <div className="space-y-4">
        <h3 className="font-display text-xl font-medium flex items-center gap-2">
          <Plane className="h-5 w-5 text-accent" />
          Flights
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {tripPlan.outboundFlight && (
            <FlightCard
              flight={tripPlan.outboundFlight}
              label="Outbound"
              passengers={tripDetails.passengers.adults + tripDetails.passengers.children}
              onToggle={() => onToggleItem("outboundFlight", tripPlan.outboundFlight!.id)}
              formatCurrency={formatCurrency}
            />
          )}
          {tripPlan.returnFlight && (
            <FlightCard
              flight={tripPlan.returnFlight}
              label="Return"
              passengers={tripDetails.passengers.adults + tripDetails.passengers.children}
              onToggle={() => onToggleItem("returnFlight", tripPlan.returnFlight!.id)}
              formatCurrency={formatCurrency}
            />
          )}
        </div>
      </div>

      {/* Car Rental Section */}
      {tripPlan.carRental && (
        <div className="space-y-4">
          <h3 className="font-display text-xl font-medium flex items-center gap-2">
            <Car className="h-5 w-5 text-accent" />
            Airport Car Rental
          </h3>
          <Card
            variant={tripPlan.carRental.included ? "premium" : "default"}
            className={cn(
              "transition-all duration-300",
              !tripPlan.carRental.included && "opacity-60"
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div>
                    <p className="font-medium text-lg">{tripPlan.carRental.vehicleName}</p>
                    <p className="text-sm text-muted-foreground">{tripPlan.carRental.company}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {tripPlan.carRental.pickupLocation}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {tripPlan.carRental.pickupTime} - {tripPlan.carRental.dropoffTime}
                    </span>
                  </div>
                  <GoogleMapsLink 
                    query={tripPlan.carRental.pickupLocation} 
                    className="mt-2"
                  />
                </div>
                <div className="text-right ml-4">
                  <p className="font-display text-2xl font-semibold">
                    {formatCurrency(tripPlan.carRental.totalPrice)}
                  </p>
                  <Button
                    variant={tripPlan.carRental.included ? "soft" : "outline"}
                    size="sm"
                    className="mt-2"
                    onClick={() => onToggleItem("carRental", tripPlan.carRental!.id)}
                  >
                    {tripPlan.carRental.included ? (
                      <>
                        <Check className="h-4 w-4 mr-1" /> Included
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-1" /> Excluded
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hotel Section */}
      {tripPlan.hotel && (
        <div className="space-y-4">
          <h3 className="font-display text-xl font-medium flex items-center gap-2">
            <Building2 className="h-5 w-5 text-accent" />
            Accommodation
          </h3>
          <Card
            variant={tripPlan.hotel.included ? "premium" : "default"}
            className={cn(
              "transition-all duration-300",
              !tripPlan.hotel.included && "opacity-60"
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div>
                    <p className="font-medium text-lg">{tripPlan.hotel.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(tripPlan.hotel.rating)].map((_, i) => (
                        <span key={i} className="text-accent">★</span>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{tripPlan.hotel.address}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tripPlan.hotel.amenities.slice(0, 4).map((amenity) => (
                      <span
                        key={amenity}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                  <GoogleMapsLink 
                    query={tripPlan.hotel.address} 
                    className="mt-2"
                  />
                </div>
                <div className="text-right ml-4">
                  <div className="mb-2">
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(tripPlan.hotel.pricePerNight)}/night
                    </p>
                    <p className="font-display text-2xl font-semibold">
                      {formatCurrency(tripPlan.hotel.totalPrice)}
                    </p>
                  </div>
                  <Button
                    variant={tripPlan.hotel.included ? "soft" : "outline"}
                    size="sm"
                    onClick={() => onToggleItem("hotel", tripPlan.hotel!.id)}
                  >
                    {tripPlan.hotel.included ? (
                      <>
                        <Check className="h-4 w-4 mr-1" /> Included
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-1" /> Excluded
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Itinerary Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-medium flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" />
            Daily Plan
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="soft"
              size="sm"
              onClick={sendEmail}
              disabled={isSendingEmail}
              className="gap-2"
            >
              {isSendingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send to my email
            </Button>
          </div>
        </div>

        {/* Day Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tripPlan.itinerary.map((day, idx) => (
            <button
              key={day.day}
              onClick={() => setActiveDay(idx)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                activeDay === idx
                  ? "bg-accent text-accent-foreground shadow-md"
                  : "bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              Day {day.day}
            </button>
          ))}
        </div>

        {/* Day Content */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h4 className="font-medium text-lg">
                {tripPlan.itinerary[activeDay].date}
              </h4>
              <p className="text-sm text-muted-foreground">
                {tripPlan.itinerary[activeDay].items.filter(i => i.included).length} activities planned
              </p>
            </div>
          </div>

          <DayTimeline
            day={tripPlan.itinerary[activeDay]}
            onToggleItem={(itemId) => onToggleItem("itinerary", itemId)}
            formatCurrency={formatCurrency}
            getItemIcon={getItemIcon}
            destinationCity={tripDetails.destinationCity}
          />
        </div>
      </div>

      {/* Total Cost Footer */}
      <div className="sticky bottom-6 left-0 right-0 z-10">
        <Card className="bg-primary text-primary-foreground shadow-2xl border-none overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/70 text-sm font-medium uppercase tracking-wider">
                  Estimated Total Cost
                </p>
                <p className="text-xs text-primary-foreground/50 mt-0.5">
                  Based on {tripDetails.passengers.adults + tripDetails.passengers.children} passengers
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-4xl font-bold text-accent">
                  {formatCurrency(totalCost)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FlightCard({
  flight,
  label,
  passengers,
  onToggle,
  formatCurrency,
}: {
  flight: any;
  label: string;
  passengers: number;
  onToggle: () => void;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <Card
      variant={flight.included ? "premium" : "default"}
      className={cn(
        "transition-all duration-300",
        !flight.included && "opacity-60"
      )}
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded">
            {label}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {flight.class.charAt(0).toUpperCase() + flight.class.slice(1)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="font-display text-2xl font-semibold">{flight.originCode}</p>
            <p className="text-sm text-muted-foreground">{flight.departureTime}</p>
            <GoogleMapsLink 
              query={`${flight.origin} Airport`} 
              className="mt-1"
            />
          </div>
          <div className="flex-1 px-4 flex flex-col items-center">
            <p className="text-[10px] text-muted-foreground mb-1">{flight.duration}</p>
            <div className="w-full flex items-center">
              <div className="h-px flex-1 bg-accent/30" />
              <Plane className="h-4 w-4 text-accent mx-2 rotate-90" />
              <div className="h-px flex-1 bg-accent/30" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{flight.airline}</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-semibold">{flight.destinationCode}</p>
            <p className="text-sm text-muted-foreground">{flight.arrivalTime}</p>
            <GoogleMapsLink 
              query={`${flight.destination} Airport`} 
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <p className="font-display text-xl font-semibold">
              {formatCurrency(flight.pricePerPerson * passengers)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(flight.pricePerPerson)} × {passengers} passengers
            </p>
          </div>
          <Button
            variant={flight.included ? "soft" : "outline"}
            size="sm"
            onClick={onToggle}
          >
            {flight.included ? (
              <>
                <Check className="h-4 w-4 mr-1" /> Included
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-1" /> Excluded
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DayTimeline({
  day,
  onToggleItem,
  formatCurrency,
  getItemIcon,
  destinationCity,
}: {
  day: DayItinerary;
  onToggleItem: (itemId: string) => void;
  formatCurrency: (amount: number) => string;
  getItemIcon: (type: string) => React.ComponentType<{ className?: string }>;
  destinationCity: string;
}) {
  return (
    <div className="space-y-0">
      {day.items.map((item, index) => {
        const Icon = getItemIcon(item.type);
        return (
          <div
            key={item.id}
            className={cn(
              "relative pl-10 pb-8 animate-fade-in",
              !item.included && "opacity-50"
            )}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {/* Timeline line */}
            {index < day.items.length - 1 && (
              <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gradient-to-b from-accent to-accent/20" />
            )}
            
            {/* Timeline dot */}
            <div
              className={cn(
                "absolute left-2 top-1 h-5 w-5 rounded-full border-2 flex items-center justify-center",
                item.included
                  ? "border-accent bg-accent/20"
                  : "border-border bg-card"
              )}
            >
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  item.included ? "bg-accent" : "bg-border"
                )}
              />
            </div>

            {/* Content */}
            <Card variant={item.included ? "timeline" : "default"} className="ml-2">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-accent">{item.time}</span>
                        {item.distance && (
                          <span className="text-xs text-muted-foreground">• {item.distance}</span>
                        )}
                      </div>
                      <p className="font-medium mt-0.5">{item.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        {item.description}
                      </p>
                      {/* Show Google Maps link for attractions, meals, and hotel activities */}
                      {(item.type === "attraction" || item.type === "meal" || item.type === "hotel") && (
                        <GoogleMapsLink 
                          query={`${item.title}, ${destinationCity}`} 
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {item.cost !== undefined && item.cost > 0 && (
                      <span className="font-medium text-sm whitespace-nowrap">
                        {formatCurrency(item.cost)}
                      </span>
                    )}
                    <button
                      onClick={() => onToggleItem(item.id)}
                      className={cn(
                        "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        item.included
                          ? "border-success bg-success"
                          : "border-border hover:border-accent"
                      )}
                    >
                      {item.included && (
                        <Check className="h-3.5 w-3.5 text-success-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
