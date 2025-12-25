import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  try {
    const { keyword } = await req.json();

    if (!keyword) {
      return new Response(JSON.stringify([]), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // TODO: Replace with real Amadeus API logic
    // For now we return mock data to unblock frontend
    return new Response(
      JSON.stringify([
        {
          name: keyword,
          iataCode: keyword.slice(0, 3).toUpperCase(),
          cityCode: keyword.slice(0, 3).toUpperCase(),
          countryCode: "XX",
        },
      ]),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
