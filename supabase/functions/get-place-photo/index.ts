import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const GOOGLE_MAPS_PROXY_URL = "https://maps-api.manus.computer";

serve(async (req ) => {
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
      return new Response(
        JSON.stringify({ error: "placeName and city are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const query = `${placeName}, ${city}`;
    console.log(`Searching for: ${query}`);

    // Step 1: Search for the place using Text Search
    const searchUrl = `${GOOGLE_MAPS_PROXY_URL}/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== "OK" || !searchData.results || searchData.results.length === 0) {
      console.log(`No results found for: ${query}`);
      return new Response(
        JSON.stringify({ 
          photoUrl: null,
          message: "No place found" 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const place = searchData.results[0];
    console.log(`Found place: ${place.name}`);

    // Step 2: Check if the place has photos
    if (!place.photos || place.photos.length === 0) {
      console.log(`No photos available for: ${place.name}`);
      return new Response(
        JSON.stringify({ 
          photoUrl: null,
          message: "No photos available" 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    // Step 3: Get the photo reference
    const photoReference = place.photos[0].photo_reference;
    
    // Step 4: Construct the photo URL (maxwidth=800 for good quality)
    const photoUrl = `${GOOGLE_MAPS_PROXY_URL}/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}`;

    console.log(`Photo URL generated for: ${place.name}`);

    return new Response(
      JSON.stringify({ 
        photoUrl,
        placeName: place.name,
        address: place.formatted_address
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );

  } catch (error) {
    console.error("Error fetching place photo:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to fetch place photo",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});
