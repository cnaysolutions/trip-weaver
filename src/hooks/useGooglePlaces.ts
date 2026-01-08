import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface PlaceDetails {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  totalRatings: number;
  reviews: PlaceReview[];
  photos: PlacePhoto[];
  openingHours: string[];
  isOpen?: boolean;
  website?: string;
  phone?: string;
  priceLevel?: number;
  types: string[];
}

export interface PlaceReview {
  authorName: string;
  rating: number;
  text: string;
  relativeTime: string;
}

export interface PlacePhoto {
  photoReference: string;
  width: number;
  height: number;
  photoUrl: string;
}

export interface NearbyPlace {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  totalRatings: number;
  priceLevel?: number;
  types: string[];
  photoUrl: string | null;
  isOpen?: boolean;
}

export function useGooglePlaces() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autocomplete = useCallback(async (input: string, types = "(cities)"): Promise<PlacePrediction[]> => {
    if (!input || input.length < 2) return [];
    
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("google-places", {
        body: { action: "autocomplete", input, types },
      });

      if (fnError) throw fnError;
      return data?.predictions || [];
    } catch (err) {
      console.error("Autocomplete error:", err);
      setError("Unable to search locations");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPlaceDetails = useCallback(async (placeId: string): Promise<PlaceDetails | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("google-places", {
        body: { action: "details", placeId },
      });

      if (fnError) throw fnError;
      return data?.place || null;
    } catch (err) {
      console.error("Place details error:", err);
      setError("Unable to fetch place details");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchNearby = useCallback(async (
    lat: number,
    lng: number,
    type = "tourist_attraction",
    radius = 5000
  ): Promise<NearbyPlace[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("google-places", {
        body: { action: "nearby", lat, lng, type, radius },
      });

      if (fnError) throw fnError;
      return data?.places || [];
    } catch (err) {
      console.error("Nearby search error:", err);
      setError("Unable to search nearby places");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const textSearch = useCallback(async (query: string): Promise<NearbyPlace[]> => {
    if (!query) return [];
    
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("google-places", {
        body: { action: "search", query },
      });

      if (fnError) throw fnError;
      return data?.places || [];
    } catch (err) {
      console.error("Text search error:", err);
      setError("Unable to search places");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    autocomplete,
    getPlaceDetails,
    searchNearby,
    textSearch,
  };
}
