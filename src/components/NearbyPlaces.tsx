import { useState, useEffect } from "react";
import { Loader2, MapPin, Utensils, Camera, Coffee, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaceCard } from "@/components/PlaceCard";
import { useGooglePlaces, NearbyPlace } from "@/hooks/useGooglePlaces";
import { cn } from "@/lib/utils";

interface NearbyPlacesProps {
  lat: number;
  lng: number;
  title?: string;
  className?: string;
}

const PLACE_TYPES = [
  { id: "tourist_attraction", label: "Attractions", icon: Camera },
  { id: "restaurant", label: "Restaurants", icon: Utensils },
  { id: "cafe", label: "Cafes", icon: Coffee },
  { id: "shopping_mall", label: "Shopping", icon: ShoppingBag },
];

export function NearbyPlaces({ lat, lng, title = "Nearby Places", className }: NearbyPlacesProps) {
  const [selectedType, setSelectedType] = useState("tourist_attraction");
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const { searchNearby, isLoading, error } = useGooglePlaces();

  useEffect(() => {
    async function fetchPlaces() {
      const results = await searchNearby(lat, lng, selectedType);
      setPlaces(results);
    }

    if (lat && lng) {
      fetchPlaces();
    }
  }, [lat, lng, selectedType, searchNearby]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          {title}
        </h3>
      </div>

      {/* Type filter buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {PLACE_TYPES.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={selectedType === id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType(id)}
            className="shrink-0"
          >
            <Icon className="h-4 w-4 mr-1" />
            {label}
          </Button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Finding places...</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          <p>{error}</p>
        </div>
      )}

      {/* Results grid */}
      {!isLoading && places.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {places.slice(0, 6).map((place) => (
            <PlaceCard key={place.placeId} place={place} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && places.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No {PLACE_TYPES.find(t => t.id === selectedType)?.label.toLowerCase()} found nearby</p>
        </div>
      )}
    </div>
  );
}
