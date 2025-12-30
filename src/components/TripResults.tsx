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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { TripDetails, TripPlan, DayItinerary } from "@/types/trip";

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
    
    if (tripPlan.outboundFlight?.included) {
      cost += tripPlan.outboundFlight.pricePerPerson * 
        (tripDetails.passengers.adults + tripDetails.passengers.children);
    }
    if (tripPlan.returnFlight?.included) {
      cost += tripPlan.returnFlight.pricePerPerson * 
        (tripDetails.passengers.adults + tripDetails.passengers.children);
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
          cost += item.cost;
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
    const email = user?.email || user?.user_metadata?.email;
    
    if (!email) {
      alert("Logged-in user email not found");
      return;
    }
    if (!tripPlan) {
      alert("Search result not found. Please run the search again.");
      return;
    }

    console.log("Sending email to:", email);
    console.log("Search data:", tripPlan);

    setIsSendingEmail(true);
    const res = await fetch(
      "https://wpadifvbkmgnbwztcfli.supabase.co/functions/v1/send-trip-email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          data: tripPlan,
        }),
      }
    );

    const json = await res.json();
    console.log("Edge function response:", json);
    setIsSendingEmail(false);

    if (!res.ok) {
      alert("Failed to send email");
      return;
    }
    alert("Email sent to your inbox");
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
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {tripPlan.hotel.address}
                    </span>
                    <span className="flex items-center gap-1">
                      <Plane className="h-4 w-4" />
                      {tripPlan.hotel.distanceFromAirport} from airport
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tripPlan.hotel.amenities.slice(0, 4).map((amenity) => (
                      <span
                        key={amenity}
                        className="text-xs px-2 py-1 bg-secondary rounded-full text-secondary-foreground"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(tripPlan.hotel.pricePerNight)}/night
                  </p>
                  <p className="font-display text-2xl font-semibold">
                    {formatCurrency(tripPlan.hotel.totalPrice)}
                  </p>
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
          <p className="text-sm text-muted-foreground italic">
            Hotels shown are for reference only and cannot be booked through this platform.
          </p>
        </div>
      )}

      {/* Daily Itinerary */}
      <div className="space-y-4">
        <h3 className="font-display text-xl font-medium">Daily Itinerary</h3>
        
        {/* Day Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tripPlan.itinerary.map((day, index) => (
            <button
              key={day.day}
              onClick={() => setActiveDay(index)}
              className={cn(
                "px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200",
                activeDay === index
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              Day {day.day}
            </button>
          ))}
        </div>

        {/* Day Content */}
        {tripPlan.itinerary[activeDay] && (
          <DayTimeline
            day={tripPlan.itinerary[activeDay]}
            onToggleItem={(itemId) => onToggleItem("itinerary", itemId)}
            formatCurrency={formatCurrency}
            getItemIcon={getItemIcon}
          />
        )}
      </div>

      {/* Total Cost Summary */}
      <Card variant="elevated" className="bg-gradient-hero text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm">Estimated Total</p>
              <p className="font-display text-4xl font-semibold mt-1">
                {formatCurrency(totalCost)}
              </p>
            </div>
            <div className="text-right text-primary-foreground/80 text-sm">
              <p>Costs adjust instantly as you refine.</p>
              <p>You're always in control.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Send to Email Section */}
      <div className="flex items-center justify-end gap-3">
        <select
          value={emailFormat}
          onChange={(e) => setEmailFormat(e.target.value as "text" | "html")}
          className="px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          disabled={isSendingEmail}
        >
          <option value="html">Formatted HTML</option>
          <option value="text">Plain Text</option>
        </select>
        <Button
          variant="outline"
          onClick={sendEmail}
          disabled={isSendingEmail}
          className="gap-2"
        >
          {isSendingEmail ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              Send to my email
            </>
          )}
        </Button>
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
  flight: NonNullable<TripPlan["outboundFlight"]>;
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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-xs font-medium px-2 py-1 bg-secondary rounded-full capitalize">
            {flight.class}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="font-display text-2xl font-semibold">{flight.originCode}</p>
            <p className="text-sm text-muted-foreground">{flight.departureTime}</p>
          </div>
          <div className="flex-1 px-4 flex flex-col items-center">
            <p className="text-xs text-muted-foreground mb-1">{flight.duration}</p>
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
}: {
  day: DayItinerary;
  onToggleItem: (itemId: string) => void;
  formatCurrency: (amount: number) => string;
  getItemIcon: (type: string) => React.ComponentType<{ className?: string }>;
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
