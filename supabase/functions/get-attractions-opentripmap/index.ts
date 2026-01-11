import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AttractionRequest {
  city: string;
  lat: number;
  lon: number;
  limit?: number;
  radius?: number;
}

interface OpenTripMapPlace {
  xid: string;
  name: string;
  dist?: number;
  rate?: number;
  osm?: string;
  kinds?: string;
  point?: { lat: number; lon: number };
  wikidata?: string;
}

interface Attraction {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  lat?: number;
  lon?: number;
  distance?: number;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, lat, lon, limit = 15, radius = 5000 }: AttractionRequest = await req.json();

    console.log(`Fetching attractions for ${city} at (${lat}, ${lon}) with radius ${radius}m`);

    // OpenTripMap API is FREE - no API key required for basic usage!
    // But rate limited, so we use the free tier
    const apiKey = "5ae2e3f221c38a28845f05b6b62cc7de2ddbee1f06a99fdb44e43aca"; // Free demo key

    // Fetch places from OpenTripMap
    const placesUrl = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius}&lon=${lon}&lat=${lat}&kinds=cultural,historic,architecture,museums,natural&rate=2&format=json&limit=${limit}&apikey=${apiKey}`;

    console.log(`Calling OpenTripMap API...`);

    const response = await fetch(placesUrl);

    if (!response.ok) {
      console.error(`OpenTripMap API error: ${response.status} ${response.statusText}`);
      throw new Error(`OpenTripMap API error: ${response.status}`);
    }

    const places: OpenTripMapPlace[] = await response.json();

    console.log(`OpenTripMap returned ${places.length} places`);

    // Filter out places without names and transform to our format
    const attractions: Attraction[] = places
      .filter((place) => place.name && place.name.trim() !== "")
      .map((place) => {
        // Parse the kinds string to get a category
        const kinds = place.kinds?.split(",") || [];
        const category = kinds[0] || "attraction";

        // Convert OpenTripMap rate (1-7) to a 1-10 scale
        const rating = place.rate ? Math.min(10, place.rate + 3) : 5;

        return {
          id: place.xid,
          name: place.name,
          description: `A ${category.replace(/_/g, " ")} in ${city}. ${getCategoryDescription(category)}`,
          category: formatCategory(category),
          rating,
          lat: place.point?.lat,
          lon: place.point?.lon,
          distance: place.dist ? Math.round(place.dist) : undefined,
        };
      })
      .slice(0, limit);

    console.log(`Returning ${attractions.length} valid attractions`);

    return new Response(
      JSON.stringify({
        attractions,
        city,
        count: attractions.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error fetching attractions:", error);

    // Return empty array instead of error to prevent frontend crash
    return new Response(
      JSON.stringify({
        attractions: [],
        error: error.message,
        city: "",
        count: 0,
      }),
      {
        status: 200, // Return 200 with empty data to prevent frontend errors
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});

function formatCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    cultural: "Explore the rich cultural heritage.",
    historic: "Step back in time and discover the history.",
    architecture: "Marvel at the stunning architectural design.",
    museums: "Discover fascinating exhibits and collections.",
    natural: "Enjoy the natural beauty and scenery.",
    historic_architecture: "A beautiful blend of history and architecture.",
    religion: "A place of spiritual significance.",
    theatres_and_entertainments: "Enjoy live performances and entertainment.",
    urban_environment: "Experience the vibrant city atmosphere.",
  };

  return descriptions[category] || "A must-see destination for visitors.";
}
