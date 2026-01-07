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
import { supabase } from "@/integrations/supabase/client";
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
    const totalPassengers = (tripDetails.passengers.adults || 0) + (tripDetails.passengers.children || 0);
    
    // Flights are already priced per person
    if (tripPlan.outboundFlight?.included) {
      cost += tripPlan.outboundFlight.pricePerPerson * totalPassengers;
    }
    if (tripPlan.returnFlight?.included) {
      cost += tripPlan.returnFlight.pricePerPerson * totalPassengers;
    }
    
    // Hotel and car rental are total prices for the group
    if (tripPlan.carRental?.included) {
      cost += tripPlan.carRental.totalPrice;
    }
    if (tripPlan.hotel?.included) {
      cost += tripPlan.hotel.totalPrice;
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
    
    // Calculate total passengers right here to be absolutely sure
    const currentPassengers = (tripDetails.passengers.adults || 0) + (tripDetails.passengers.children || 0) || 1;
    
    console.log("Sending email with passengers:", currentPassengers);

    try {
      const { data, error } = await supabase.functions.invoke("send-trip-email", {
        body: {
          email: loggedInEmail,
          data: {
            ...tripPlan,
            passengers: currentPassengers
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
      console.error("Failed to send email:", error);
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
            <Button
              variant={emailFormat === "html" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setEmailFormat("html")}
              className="text-xs h-8"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Formatted HTML
            </Button>
          </div>
          <Button 
            onClick={sendEmail} 
            disabled={isSendingEmail}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isSendingEmail ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send to my email
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onReset}>
            Start Over
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-primary text-primary-foreground overflow-hidden border-none shadow-xl">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-2 text-center md:text-left">
              <p className="text-primary-foreground/70 text-sm font-medium uppercase tracking-wider">Estimated Total</p>
              <p className="text-5xl font-display font-bold">{formatCurrency(totalCost)}</p>
            </div>
            <div className="text-center md:text-right space-y-1">
              <p className="text-primary-foreground/80 font-medium">Costs adjust instantly as you refine.</p>
              <p className="text-primary-foreground/60 text-sm">You're always in control.</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
              passengers={(tripDetails.passengers.adults || 0) + (tripDetails.passengers.children || 0)}
              onToggle={() => onToggleItem("outboundFlight", tripPlan.outboundFlight!.id)}
              formatCurrency={formatCurrency}
            />
          )}
          {tripPlan.returnFlight && (
            <FlightCard
              flight={tripPlan.returnFlight}
              label="Return"
              passengers={(tripDetails.passengers.adults || 0) + (tripDetails.passengers.children || 0)}
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
                  <GoogleMapsLink 
                    query={tripPlan.hotel.address} 
                    className="mt-2"
                  />
                </div>
                <div className="text-right ml-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(tripPlan.hotel.pricePerNight)} / night
                    </p>
                    <p className="font-display text-2xl font-semibold">
                      {formatCurrency(tripPlan.hotel.totalPrice)}
                    </p>
                  </div>
                  <Button
                    variant={tripPlan.hotel.included ? "soft" : "outline"}
                    size="sm"
                    className="mt-2"
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
            <Clock className="h-5 w-5 text-accent" />
            Daily Itinerary
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {tripPlan.itinerary.map((day, idx) => (
              <Button
                key={day.day}
                variant={activeDay === idx ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveDay(idx)}
                className={cn(
                  "whitespace-nowrap",
                  activeDay === idx && "bg-accent/10 text-accent hover:bg-accent/20"
                )}
              >
                Day {day.day}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {tripPlan.itinerary[activeDay].items.map((item, idx) => (
            <Card
              key={idx}
              className={cn(
                "transition-all duration-300 border-l-4",
                item.included ? "border-l-accent" : "border-l-muted opacity-60"
              )}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex gap-4 w-full">
                    <div className="mt-1 p-2 bg-muted rounded-lg shrink-0">
                      {(() => {
                        const Icon = getItemIcon(item.type);
                        return <Icon className="h-5 w-5 text-muted-foreground" />;
                      })()}
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-accent">{item.time}</span>
                        <h4 className="font-medium">{item.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                      {item.imageUrl && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-muted aspect-video max-w-md">
                          <img 
                            src={item.imageUrl} 
                            alt={item.title} 
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <GoogleMapsLink 
                          query={`${item.title} ${tripDetails.destinationCity}`} 
                        />
                        {item.bookingUrl && (
                          <a
                            href={item.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Book Tickets
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-muted/50">
                    {item.cost && (
                      <p className="font-medium">{formatCurrency(item.cost)}</p>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-muted"
                      onClick={() => onToggleItem("itinerary", `${activeDay}-${idx}`)}
                    >
                      {item.included ? (
                        <Check className="h-4 w-4 text-accent" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function FlightCard({ 
  flight, 
  label, 
  passengers, 
  onToggle, 
  formatCurrency 
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
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-accent/10 text-accent rounded-full">
                {label}
              </span>
              <span className="text-sm text-muted-foreground">{flight.airline}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-display font-bold">{flight.originCode}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{flight.departureTime}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
              <div className="text-center">
                <p className="text-2xl font-display font-bold">{flight.destinationCode}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{flight.arrivalTime}</p>
              </div>
            </div>
          </div>
          <div className="text-right ml-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {formatCurrency(flight.pricePerPerson)} × {passengers}
              </p>
              <p className="font-display text-2xl font-semibold">
                {formatCurrency(flight.pricePerPerson * passengers)}
              </p>
            </div>
            <Button
              variant={flight.included ? "soft" : "outline"}
              size="sm"
              className="mt-2"
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
        </div>
      </CardContent>
    </Card>
  );
}
