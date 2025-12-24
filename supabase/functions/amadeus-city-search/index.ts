import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache token in memory (edge functions are short-lived)
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAmadeusToken(): Promise<string> {
  const now = Date.now();
  
  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.token;
  }

  const clientId = Deno.env.get('AMADEUS_API_KEY');
  const clientSecret = Deno.env.get('AMADEUS_API_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Amadeus API credentials not configured');
  }

  const response = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`
  });

  if (!response.ok) {
    throw new Error('Failed to obtain Amadeus token');
  }

  const data = await response.json();
  
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in * 1000) - 60000 // 1 min buffer
  };

  return cachedToken.token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword } = await req.json();
    
    if (!keyword || keyword.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Keyword must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = await getAmadeusToken();

    const url = new URL('https://api.amadeus.com/v1/reference-data/locations');
    url.searchParams.set('keyword', keyword);
    url.searchParams.set('subType', 'CITY,AIRPORT');
    url.searchParams.set('page[limit]', '10');

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Amadeus API error:', errorData);
      throw new Error(errorData.errors?.[0]?.detail || 'Amadeus API request failed');
    }

    const data = await response.json();

    // Normalize response for frontend consumption
    const locations = (data.data || []).map((loc: any) => ({
      name: loc.name,
      iataCode: loc.iataCode,
      subType: loc.subType,
      cityName: loc.address?.cityName || loc.name,
      countryCode: loc.address?.countryCode,
      countryName: loc.address?.countryName,
      lat: loc.geoCode?.latitude,
      lon: loc.geoCode?.longitude,
      cityCode: loc.address?.cityCode
    }));

    console.log(`City search for "${keyword}": ${locations.length} results`);

    return new Response(
      JSON.stringify({ locations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Amadeus city search error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
