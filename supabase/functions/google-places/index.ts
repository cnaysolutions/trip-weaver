import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const GOOGLE_MAPS_PROXY_URL = "https://maps-api.manus.computer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface AutocompleteRequest {
  action: "autocomplete";
  input: string;
  types?: string; // e.g., "(cities)" or "establishment"
}

interface PlaceDetailsRequest {
  action: "details";
  placeId: string;
}

interface NearbySearchRequest {
  action: "nearby";
  lat: number;
  lng: number;
  radius?: number;
  type?: string; // e.g., "restaurant", "tourist_attraction"
}

interface TextSearchRequest {
  action: "search";
  query: string;
}

interface PhotoRequest {
  action: "photo";
  photoReference: string;
  maxWidth?: number;
}

type PlacesRequest = 
  | AutocompleteRequest 
  | PlaceDetailsRequest 
  | NearbySearchRequest 
  | TextSearchRequest
  | PhotoRequest;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: PlacesRequest = await req.json();

    switch (body.action) {
      case "autocomplete":
        return handleAutocomplete(body);
      case "details":
        return handlePlaceDetails(body);
      case "nearby":
        return handleNearbySearch(body);
      case "search":
        return handleTextSearch(body);
      case "photo":
        return handlePhoto(body);
      default:
        return jsonResponse({ error: "Invalid action" }, 400);
    }
  } catch (error) {
    console.error("Google Places API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: "Failed to process request", details: message }, 500);
  }
});

function jsonResponse(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function handleAutocomplete(body: AutocompleteRequest) {
  const { input, types = "(cities)" } = body;

  if (!input || input.length < 2) {
    return jsonResponse({ predictions: [] });
  }

  const url = `${GOOGLE_MAPS_PROXY_URL}/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=${encodeURIComponent(types)}`;
  
  console.log(`Autocomplete request: ${input}`);

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("Autocomplete error:", data.status, data.error_message);
    return jsonResponse({ predictions: [], error: data.error_message });
  }

  const predictions = (data.predictions || []).map((p: any) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text || p.description,
    secondaryText: p.structured_formatting?.secondary_text || "",
    types: p.types || [],
  }));

  return jsonResponse({ predictions });
}

async function handlePlaceDetails(body: PlaceDetailsRequest) {
  const { placeId } = body;

  if (!placeId) {
    return jsonResponse({ error: "placeId is required" }, 400);
  }

  const fields = "name,formatted_address,geometry,rating,user_ratings_total,reviews,photos,opening_hours,website,formatted_phone_number,price_level,types";
  const url = `${GOOGLE_MAPS_PROXY_URL}/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${encodeURIComponent(fields)}`;

  console.log(`Place details request: ${placeId}`);

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK") {
    console.error("Place details error:", data.status, data.error_message);
    return jsonResponse({ place: null, error: data.error_message });
  }

  const place = data.result;
  const photos = (place.photos || []).slice(0, 5).map((photo: any) => ({
    photoReference: photo.photo_reference,
    width: photo.width,
    height: photo.height,
    photoUrl: `${GOOGLE_MAPS_PROXY_URL}/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}`,
  }));

  const reviews = (place.reviews || []).slice(0, 5).map((review: any) => ({
    authorName: review.author_name,
    rating: review.rating,
    text: review.text,
    relativeTime: review.relative_time_description,
  }));

  return jsonResponse({
    place: {
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry?.location?.lat,
      lng: place.geometry?.location?.lng,
      rating: place.rating,
      totalRatings: place.user_ratings_total,
      reviews,
      photos,
      openingHours: place.opening_hours?.weekday_text || [],
      isOpen: place.opening_hours?.open_now,
      website: place.website,
      phone: place.formatted_phone_number,
      priceLevel: place.price_level,
      types: place.types || [],
    },
  });
}

async function handleNearbySearch(body: NearbySearchRequest) {
  const { lat, lng, radius = 5000, type = "tourist_attraction" } = body;

  if (!lat || !lng) {
    return jsonResponse({ error: "lat and lng are required" }, 400);
  }

  const url = `${GOOGLE_MAPS_PROXY_URL}/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${encodeURIComponent(type)}&rankby=prominence`;

  console.log(`Nearby search: ${lat},${lng} type=${type}`);

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("Nearby search error:", data.status, data.error_message);
    return jsonResponse({ places: [], error: data.error_message });
  }

  const places = (data.results || []).slice(0, 20).map((place: any) => ({
    placeId: place.place_id,
    name: place.name,
    address: place.vicinity,
    lat: place.geometry?.location?.lat,
    lng: place.geometry?.location?.lng,
    rating: place.rating,
    totalRatings: place.user_ratings_total,
    priceLevel: place.price_level,
    types: place.types || [],
    photoUrl: place.photos?.[0]?.photo_reference
      ? `${GOOGLE_MAPS_PROXY_URL}/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}`
      : null,
    isOpen: place.opening_hours?.open_now,
  }));

  return jsonResponse({ places });
}

async function handleTextSearch(body: TextSearchRequest) {
  const { query } = body;

  if (!query) {
    return jsonResponse({ error: "query is required" }, 400);
  }

  const url = `${GOOGLE_MAPS_PROXY_URL}/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}`;

  console.log(`Text search: ${query}`);

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("Text search error:", data.status, data.error_message);
    return jsonResponse({ places: [], error: data.error_message });
  }

  const places = (data.results || []).slice(0, 10).map((place: any) => ({
    placeId: place.place_id,
    name: place.name,
    address: place.formatted_address,
    lat: place.geometry?.location?.lat,
    lng: place.geometry?.location?.lng,
    rating: place.rating,
    totalRatings: place.user_ratings_total,
    types: place.types || [],
    photoUrl: place.photos?.[0]?.photo_reference
      ? `${GOOGLE_MAPS_PROXY_URL}/maps/api/place/photo?maxwidth=800&photo_reference=${place.photos[0].photo_reference}`
      : null,
  }));

  return jsonResponse({ places });
}

async function handlePhoto(body: PhotoRequest) {
  const { photoReference, maxWidth = 800 } = body;

  if (!photoReference) {
    return jsonResponse({ error: "photoReference is required" }, 400);
  }

  const photoUrl = `${GOOGLE_MAPS_PROXY_URL}/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}`;

  return jsonResponse({ photoUrl });
}
