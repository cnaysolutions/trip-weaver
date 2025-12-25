import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Minus, Plus, Plane, Users, CalendarDays, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { TripDetails, FlightClass } from "@/types/trip";
import type { Location } from "@/types/location";

interface TripIntakeFormProps {
  onSubmit: (details: TripDetails) => void;
  isLoading?: boolean;
}

export function TripIntakeForm({ onSubmit, isLoading }: TripIntakeFormProps) {
  const [departureCity, setDepartureCity] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [departureLocation, setDepartureLocation] = useState<Location | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<Location | null>(null);
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [flightClass, setFlightClass] = useState<FlightClass>("economy");
  const [includeCarRental, setIncludeCarRental] = useState(true);
  const [includeHotel, setIncludeHotel] = useState(true);

  // Inline error states for gentle feedback
  const [departureError, setDepartureError] = useState<string | null>(null);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [isNormalizing, setIsNormalizing] = useState(false);

  // Attempt to normalize a city name to a Location via Amadeus API
  async function normalizeCity(cityText: string): Promise<Location | null> {
    if (!cityText.trim()) return null;

    try {
      const { data, error } = await supabase.functions.invoke("amadeus-city-search", {
        body: { keyword: cityText.trim() },
      });

      if (error) {
        console.error("City normalization error:", error);
        return null;
      }

      const locations = data?.locations as Location[] | undefined;
      if (locations && locations.length > 0) {
        // Return best match (first result)
        return locations[0];
      }
      return null;
    } catch (err) {
      console.error("City normalization exception:", err);
      return null;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepartureError(null);
    setDestinationError(null);

    let finalDeparture = departureLocation;
    let finalDestination = destinationLocation;

    // If user typed but didn't select, attempt normalization
    if (!finalDeparture && departureCity.trim()) {
      setIsNormalizing(true);
      finalDeparture = await normalizeCity(departureCity);
      if (!finalDeparture) {
        setDepartureError("We couldn't find this city. Please select from the suggestions.");
        setIsNormalizing(false);
        return;
      }
      setDepartureLocation(finalDeparture);
    }

    if (!finalDestination && destinationCity.trim()) {
      setIsNormalizing(true);
      finalDestination = await normalizeCity(destinationCity);
      if (!finalDestination) {
        setDestinationError("We couldn't find this city. Please select from the suggestions.");
        setIsNormalizing(false);
        return;
      }
      setDestinationLocation(finalDestination);
    }

    setIsNormalizing(false);

    onSubmit({
      departureCity,
      destinationCity,
      departureLocation: finalDeparture,
      destinationLocation: finalDestination,
      departureDate,
      returnDate,
      passengers: { adults, children, infants },
      flightClass,
      includeCarRental,
      includeHotel,
    });
  };

  const handleDepartureLocationSelect = (location: Location) => {
    setDepartureLocation(location);
    setDepartureError(null);
  };

  const handleDestinationLocationSelect = (location: Location) => {
    setDestinationLocation(location);
    setDestinationError(null);
  };

  // Clear location and error when input changes manually
  const handleDepartureCityChange = (value: string) => {
    setDepartureCity(value);
    setDepartureError(null);
    if (departureLocation && value !== formatLocation(departureLocation)) {
      setDepartureLocation(null);
    }
  };

  const handleDestinationCityChange = (value: string) => {
    setDestinationCity(value);
    setDestinationError(null);
    if (destinationLocation && value !== formatLocation(destinationLocation)) {
      setDestinationLocation(null);
    }
  };

  function formatLocation(location: Location): string {
    const parts = [location.cityName];
    if (location.countryName) parts.push(location.countryName);
    return parts.join(', ');
  }

  const PassengerControl = ({
    label,
    sublabel,
    value,
    onChange,
    min = 0,
  }: {
    label: string;
    sublabel: string;
    value: number;
    onChange: (val: number) => void;
    min?: number;
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{sublabel}</p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-8 w-8 rounded-full"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center font-display text-xl">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(value + 1)}
          className="h-8 w-8 rounded-full"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const flightClasses: { value: FlightClass; label: string }[] = [
    { value: "economy", label: "Economy" },
    { value: "business", label: "Business" },
    { value: "first", label: "First Class" },
  ];

  // Separate human input completeness from normalized API readiness
  // Button enables when user intent is complete (text filled), not when IATA codes exist
  const isHumanInputComplete =
    Boolean(departureCity.trim()) &&
    Boolean(destinationCity.trim()) &&
    Boolean(departureDate) &&
    Boolean(returnDate) &&
    adults > 0;

  // Optional services don't block submission - they're handled after click
  // Car rental and hotel toggles are preferences, not validation requirements
  const isFormValid = isHumanInputComplete;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Destination Section */}
      <Card variant="premium" className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Plane className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle>Where would you like to go?</CardTitle>
              <CardDescription>Let's begin crafting your journey</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="departure">Where are you starting from?</Label>
              <CityAutocomplete
                id="departure"
                value={departureCity}
                onChange={handleDepartureCityChange}
                onLocationSelect={handleDepartureLocationSelect}
                selectedLocation={departureLocation}
                placeholder="London, Paris, New York..."
              />
              {departureError && (
                <p className="flex items-center gap-1.5 text-sm text-destructive animate-fade-in">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {departureError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">And where are you dreaming of going?</Label>
              <CityAutocomplete
                id="destination"
                value={destinationCity}
                onChange={handleDestinationCityChange}
                onLocationSelect={handleDestinationLocationSelect}
                selectedLocation={destinationLocation}
                placeholder="Rome, Tokyo, Bali..."
              />
              {destinationError && (
                <p className="flex items-center gap-1.5 text-sm text-destructive animate-fade-in">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {destinationError}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dates Section */}
      <Card variant="premium" className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle>When works best for you?</CardTitle>
              <CardDescription>Select your travel dates</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Departure Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11",
                      !departureDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {departureDate ? format(departureDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={departureDate || undefined}
                    onSelect={(date) => setDepartureDate(date || null)}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Return Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11",
                      !returnDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {returnDate ? format(returnDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={returnDate || undefined}
                    onSelect={(date) => setReturnDate(date || null)}
                    disabled={(date) => date < (departureDate || new Date())}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Passengers Section */}
      <Card variant="premium" className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle>Who's coming along?</CardTitle>
              <CardDescription>Tell us about your travel party</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PassengerControl
            label="Adults"
            sublabel="Age 18+"
            value={adults}
            onChange={setAdults}
            min={1}
          />
          <PassengerControl
            label="Children"
            sublabel="Age 2-17"
            value={children}
            onChange={setChildren}
          />
          <PassengerControl
            label="Infants"
            sublabel="Under 2"
            value={infants}
            onChange={setInfants}
          />
        </CardContent>
      </Card>

      {/* Flight Class Section */}
      <Card variant="premium" className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
        <CardHeader>
          <CardTitle>Flight Class</CardTitle>
          <CardDescription>Select your preferred cabin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {flightClasses.map((fc) => (
              <button
                key={fc.value}
                type="button"
                onClick={() => setFlightClass(fc.value)}
                className={cn(
                  "py-4 px-4 rounded-lg border-2 transition-all duration-200 font-medium",
                  flightClass === fc.value
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border bg-card hover:border-accent/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {fc.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optional Services */}
      <Card variant="premium" className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
        <CardHeader>
          <CardTitle>Additional Services</CardTitle>
          <CardDescription>Enhance your travel experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            type="button"
            onClick={() => setIncludeCarRental(!includeCarRental)}
            className={cn(
              "w-full p-4 rounded-lg border-2 text-left transition-all duration-200 flex items-center justify-between",
              includeCarRental
                ? "border-success bg-success/5"
                : "border-border bg-card hover:border-accent/50"
            )}
          >
            <div>
              <p className="font-medium">Airport Car Rental</p>
              <p className="text-sm text-muted-foreground">Pick up a vehicle at your destination</p>
            </div>
            <div
              className={cn(
                "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors",
                includeCarRental ? "border-success bg-success" : "border-border"
              )}
            >
              {includeCarRental && (
                <svg className="h-3.5 w-3.5 text-success-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setIncludeHotel(!includeHotel)}
            className={cn(
              "w-full p-4 rounded-lg border-2 text-left transition-all duration-200 flex items-center justify-between",
              includeHotel
                ? "border-success bg-success/5"
                : "border-border bg-card hover:border-accent/50"
            )}
          >
            <div>
              <p className="font-medium">Hotel Accommodation</p>
              <p className="text-sm text-muted-foreground">Find the perfect place to stay</p>
            </div>
            <div
              className={cn(
                "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors",
                includeHotel ? "border-success bg-success" : "border-border"
              )}
            >
              {includeHotel && (
                <svg className="h-3.5 w-3.5 text-success-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          type="submit"
          variant="hero"
          size="xl"
          className="w-full"
          disabled={isLoading || isNormalizing || !isFormValid}
        >
          {isLoading || isNormalizing ? (
            <span className="animate-pulse">
              {isNormalizing ? "Verifying locations..." : "Preparing your itinerary..."}
            </span>
          ) : (
            "Plan My Journey"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Your itinerary is being prepared with care. You're always in control.
        </p>
      </div>
    </form>
  );
}
