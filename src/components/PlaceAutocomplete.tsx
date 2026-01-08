import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGooglePlaces, PlacePrediction, PlaceDetails } from "@/hooks/useGooglePlaces";

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  rating?: number;
  types?: string[];
}

interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceResult) => void;
  placeholder?: string;
  id?: string;
  types?: string; // "(cities)" for cities, "establishment" for businesses
  fetchDetails?: boolean; // Whether to fetch full details on selection
  className?: string;
}

export function PlaceAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Search places...",
  id,
  types = "(cities)",
  fetchDetails = true,
  className,
}: PlaceAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  const { autocomplete, getPlaceDetails, isLoading } = useGooglePlaces();

  // Search for locations when input changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < 2) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    // Don't search if we have a selected place that matches input
    if (selectedPlace && value === selectedPlace.name) {
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await autocomplete(value, types);
      setPredictions(results);
      setIsOpen(results.length > 0);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, selectedPlace, autocomplete, types]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(async (prediction: PlacePrediction) => {
    onChange(prediction.mainText);
    setIsOpen(false);
    setPredictions([]);

    let result: PlaceResult = {
      placeId: prediction.placeId,
      name: prediction.mainText,
      address: prediction.description,
      types: prediction.types,
    };

    // Optionally fetch full details
    if (fetchDetails) {
      const details = await getPlaceDetails(prediction.placeId);
      if (details) {
        result = {
          ...result,
          lat: details.lat,
          lng: details.lng,
          rating: details.rating,
        };
      }
    }

    setSelectedPlace(result);
    onPlaceSelect(result);
  }, [onChange, onPlaceSelect, fetchDetails, getPlaceDetails]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSelectedPlace(null);
          }}
          placeholder={placeholder}
          className={cn(
            "pr-10",
            selectedPlace && "border-success"
          )}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : selectedPlace?.rating ? (
            <div className="flex items-center gap-1 text-xs text-amber-500">
              <Star className="h-3 w-3 fill-current" />
              {selectedPlace.rating.toFixed(1)}
            </div>
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && predictions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg animate-fade-in">
          <ul className="max-h-60 overflow-auto py-1">
            {predictions.map((prediction) => (
              <li key={prediction.placeId}>
                <button
                  type="button"
                  onClick={() => handleSelect(prediction)}
                  className="w-full px-3 py-2.5 text-left hover:bg-accent/10 focus:bg-accent/10 focus:outline-none transition-colors flex items-center gap-3"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {prediction.mainText}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {prediction.secondaryText}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
