import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const GOOGLE_MAPS_PROXY_URL = "https://maps-api.manus.computer";

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

    const query = `${placeName}, ${city}`;
    console.log(`[DEBUG] Searching for: ${query}`);

    // Step 1: Search for the place using Text Search
    const searchUrl = `${GOOGLE_MAPS_PROXY_URL}/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}`;
    console.log(`[DEBUG] Search URL: ${searchUrl}`);

    const searchResponse = await fetch(searchUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    console.log(`[DEBUG] Search response status: ${searchResponse.status}`);

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`[ERROR] Search API failed: ${errorText}`);
      throw new Error(`Search API returned ${searchResponse.status}: ${errorText}`);
    }

    const searchData = await searchResponse.json();
    console.log(`[DEBUG] Search API status: ${searchData.status}`);

    if (searchData.status !== "OK") {
      console.log(`[WARNING] Search API status not OK: ${searchData.status}`);
      if (searchData.error_message) {
        console.error(`[ERROR] API error message: ${searchData.error_message}`);
      }
    }

    if (!searchData.results || searchData.results.length === 0) {
      console.log(`[INFO] No results found for: ${query}`);
      return new Response(
        JSON.stringify({
          photoUrl: null,
          message: "No place found",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        },
      );
    }

    const place = searchData.results[0];
    console.log(`[INFO] Found place: ${place.name}`);

    // Step 2: Check if the place has photos
    if (!place.photos || place.photos.length === 0) {
      console.log(`[INFO] No photos available for: ${place.name}`);
      return new Response(
        JSON.stringify({
          photoUrl: null,
          message: "No photos available",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        },
      );
    }

    // Step 3: Get the photo reference
    const photoReference = place.photos[0].photo_reference;
    console.log(`[DEBUG] Photo reference: ${photoReference.substring(0, 20)}...`);

    // Step 4: Construct the photo URL (maxwidth=800 for good quality)
    const photoUrl = `${GOOGLE_MAPS_PROXY_URL}/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}`;

    console.log(`[SUCCESS] Photo URL generated for: ${place.name}`);

    return new Response(
      JSON.stringify({
        photoUrl,
        placeName: place.name,
        address: place.formatted_address,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      },
    );
  } catch (error) {
    console.error("[ERROR] Exception caught:", error);

    // More detailed error logging
    if (error instanceof Error) {
      console.error(`[ERROR] Error name: ${error.name}`);
      console.error(`[ERROR] Error message: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: "Failed to fetch place photo",
        details: message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      },
    );
  }
});
