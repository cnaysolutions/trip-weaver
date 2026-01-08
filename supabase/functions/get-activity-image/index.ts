import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const IMAGE_API_KEY = Deno.env.get("IMAGE_API_KEY");

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders(),
    });
  }

  try {
    if (!IMAGE_API_KEY) {
      throw new Error("Missing IMAGE_API_KEY");
    }

    const { query } = await req.json();

    if (!query) {
      return jsonResponse(
        { error: "Missing query parameter" },
        400
      );
    }

    // 🔁 Example using Unsplash
    const apiUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      query
    )}&per_page=1&orientation=landscape`;

    const imageRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Client-ID ${IMAGE_API_KEY}`,
      },
    });

    if (!imageRes.ok) {
      const errorText = await imageRes.text();
      throw new Error(`Image API error: ${errorText}`);
    }

    const data = await imageRes.json();

    const imageUrl =
      data.results?.[0]?.urls?.regular ??
      null;

    return jsonResponse({
      imageUrl,
    });
  } catch (err) {
    console.error("Edge Function Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse(
      { error: message },
      500
    );
  }
});

// 🔧 Helpers

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

