import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeName, city } = await req.json();

    if (!placeName || !city) {
      return new Response(JSON.stringify({ error: "placeName and city are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");

    if (!PEXELS_API_KEY) {
      console.error("[ERROR] PEXELS_API_KEY environment variable is not set");
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[INFO] Searching for: ${placeName}, ${city}`);

    // Search for photos on Pexels
    const searchQuery = `${placeName} ${city}`;
    const searchUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      searchQuery,
    )}&per_page=1&orientation=landscape`;

    console.log(`[DEBUG] Search URL: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    console.log(`[DEBUG] Search response status: ${response.status}`);

    if (!response.ok) {
      console.error(`[ERROR] Pexels API returned ${response.status}: ${response.statusText}`);
      return new Response(JSON.stringify({ error: "Failed to fetch from Pexels API" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    if (!data.photos || data.photos.length === 0) {
      console.log(`[INFO] No photos found for: ${searchQuery}`);
      return new Response(
        JSON.stringify({
          photoUrl: null,
          placeName,
          message: "No photos found",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const photo = data.photos[0];
    const photoUrl = photo.src.large; // High quality image

    console.log(`[SUCCESS] Photo found: ${photoUrl}`);

    return new Response(
      JSON.stringify({
        photoUrl,
        placeName,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        attribution: `Photo by ${photo.photographer} on Pexels`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("[ERROR] Exception caught:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch place photo",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
