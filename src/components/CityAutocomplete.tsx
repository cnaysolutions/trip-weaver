import { useState, useEffect, useRef } from "react";
import { MapPin, Plane, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Location } from "@/types/location";

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: Location) => void;
  placeholder?: string;
  id?: string;
  selectedLocation?: Location | null;
}

export function CityAutocomplete({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Search cities or airports...",
  id,
  selectedLocation,
}: CityAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search for locations when input changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < 2) {
      setLocations([]);
      setIsOpen(false);
      return;
    }

    // Don't search if we have a selected location that matches input
    if (selectedLocation && value === formatLocationDisplay(selectedLocation)) {
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('amadeus-city-search', {
          body: { keyword: value }
        });

        if (fnError) throw fnError;

        setLocations(data.locations || []);
        setIsOpen(true);
      } catch (err) {
        console.error('City search error:', err);
        setError('Unable to search locations');
        setLocations([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, selectedLocation]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function formatLocationDisplay(location: Location): string {
    const parts = [location.cityName];
    if (location.countryName) parts.push(location.countryName);
    return parts.join(', ');
  }

  function handleSelect(location: Location) {
    onChange(formatLocationDisplay(location));
    onLocationSelect(location);
    setIsOpen(false);
    setLocations([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "pr-10",
            selectedLocation && "border-success"
          )}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : selectedLocation ? (
            <div className="text-xs font-mono text-success">{selectedLocation.iataCode}</div>
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (locations.length > 0 || error) && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg animate-fade-in">
          {error ? (
            <div className="p-3 text-sm text-destructive">{error}</div>
          ) : (
            <ul className="max-h-60 overflow-auto py-1">
              {locations.map((location, index) => (
                <li key={`${location.iataCode}-${index}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(location)}
                    className="w-full px-3 py-2.5 text-left hover:bg-accent/10 focus:bg-accent/10 focus:outline-none transition-colors flex items-center gap-3"
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      location.subType === 'AIRPORT' ? "bg-accent/20" : "bg-primary/10"
                    )}>
                      {location.subType === 'AIRPORT' ? (
                        <Plane className="h-4 w-4 text-accent" />
                      ) : (
                        <MapPin className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {location.cityName}
                        </span>
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {location.iataCode}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {location.subType === 'AIRPORT' ? location.name : location.countryName}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
