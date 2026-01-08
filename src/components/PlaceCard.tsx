import { Star, MapPin, Clock, ExternalLink, Phone, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NearbyPlace, PlaceDetails } from "@/hooks/useGooglePlaces";

interface PlaceCardProps {
  place: NearbyPlace | PlaceDetails;
  variant?: "compact" | "detailed";
  onViewDetails?: () => void;
  className?: string;
}

export function PlaceCard({ place, variant = "compact", onViewDetails, className }: PlaceCardProps) {
  const isDetailed = variant === "detailed" && "reviews" in place;
  const photoUrl = "photoUrl" in place ? place.photoUrl : (place as PlaceDetails).photos?.[0]?.photoUrl;
  
  const priceLabel = place.priceLevel !== undefined 
    ? "$".repeat(place.priceLevel || 1) 
    : null;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + " " + place.address)}`;

  return (
    <Card className={cn("overflow-hidden transition-shadow hover:shadow-md", className)}>
      {photoUrl && (
        <div className="aspect-video relative overflow-hidden">
          <img
            src={photoUrl}
            alt={place.name}
            className="object-cover w-full h-full"
            loading="lazy"
          />
          {place.isOpen !== undefined && (
            <Badge 
              variant={place.isOpen ? "default" : "secondary"}
              className="absolute top-2 right-2"
            >
              {place.isOpen ? "Open" : "Closed"}
            </Badge>
          )}
        </div>
      )}
      
      <CardContent className={cn("p-4", !photoUrl && "pt-4")}>
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground line-clamp-2">{place.name}</h3>
            {place.rating && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="h-4 w-4 text-amber-500 fill-current" />
                <span className="text-sm font-medium">{place.rating.toFixed(1)}</span>
                {place.totalRatings && (
                  <span className="text-xs text-muted-foreground">
                    ({place.totalRatings > 1000 ? `${(place.totalRatings / 1000).toFixed(1)}k` : place.totalRatings})
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{place.address}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {priceLabel && (
              <Badge variant="outline" className="text-xs">
                {priceLabel}
              </Badge>
            )}
            {place.types?.slice(0, 2).map((type) => (
              <Badge key={type} variant="secondary" className="text-xs capitalize">
                {type.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>

          {/* Detailed view extras */}
          {isDetailed && (
            <>
              {(place as PlaceDetails).openingHours?.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                    <Clock className="h-3 w-3" />
                    <span>Opening Hours</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5 max-h-24 overflow-auto">
                    {(place as PlaceDetails).openingHours.map((hours, i) => (
                      <div key={i}>{hours}</div>
                    ))}
                  </div>
                </div>
              )}

              {(place as PlaceDetails).phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <a href={`tel:${(place as PlaceDetails).phone}`} className="text-primary hover:underline">
                    {(place as PlaceDetails).phone}
                  </a>
                </div>
              )}

              {(place as PlaceDetails).website && (
                <a
                  href={(place as PlaceDetails).website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Visit Website
                </a>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            asChild
          >
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
              <MapPin className="h-3 w-3 mr-1" />
              View on Map
            </a>
          </Button>
          {onViewDetails && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={onViewDetails}
            >
              Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
