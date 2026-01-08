import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Pexels API endpoint
const PEXELS_API_URL = "https://api.pexels.com/v1/search";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { placeName, city } = await req.json();

    if (!placeName || !city) {
      return new Response(JSON.stringify({ error: "placeName and city are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Create search query combining place name and city
    const query = `${placeName} ${city}`;
    console.log(`[INFO] Searching Pexels for: ${query}`);

    // Get Pexels API key from environment variable
    const apiKey = Deno.env.get("PEXELS_API_KEY");

    if (!apiKey) {
      console.error("[ERROR] PEXELS_API_KEY not configured");
      return new Response(
        JSON.stringify({
          error: "Pexels API key not configured",
          photoUrl: null,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        },
      );
    }

    // Search Pexels for photos
    const searchUrl = `${PEXELS_API_URL}?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;

    console.log(`[DEBUG] Fetching from Pexels API...`);

    const response = await fetch(searchUrl, {
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ERROR] Pexels API failed: ${response.status} - ${errorText}`);
      throw new Error(`Pexels API returned ${response.status}`);
    }

    const data = await response.json();
    console.log(`[DEBUG] Pexels response: ${data.total_results} results found`);

    // Check if we got any results
    if (!data.photos || data.photos.length === 0) {
      console.log(`[WARNING] No photos found for: ${query}`);
      return new Response(
        JSON.stringify({
          photoUrl: null,
          message: "No photos found",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        },
      );
    }

    // Get the first photo
    const photo = data.photos[0];
    const photoUrl = photo.src.large; // High quality image (940px wide)
    const photographer = photo.photographer;
    const photographerUrl = photo.photographer_url;

    console.log(`[SUCCESS] Found photo by ${photographer}`);

    return new Response(
      JSON.stringify({
        photoUrl,
        placeName,
        photographer,
        photographerUrl,
        attribution: `Photo by ${photographer} on Pexels`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      },
    );
  } catch (error) {
    console.error("[ERROR] Exception caught:", error);

    if (error instanceof Error) {
      console.error(`[ERROR] Error message: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: "Failed to fetch place photo",
        details: message,
        photoUrl: null,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      },
    );
  }
});
