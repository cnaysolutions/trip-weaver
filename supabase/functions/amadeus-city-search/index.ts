import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword } = await req.json();
    console.log('City search request for keyword:', keyword);

    if (!keyword || keyword.length < 2) {
      return new Response(
        JSON.stringify({ locations: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Mock data that matches the Location type expected by frontend
    // TODO: Replace with real Amadeus API integration
    const mockLocations = getMockLocations(keyword);
    
    console.log('Returning locations:', mockLocations.length);

    return new Response(
      JSON.stringify({ locations: mockLocations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('City search error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, locations: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Mock location data - matches Location type from src/types/location.ts
function getMockLocations(keyword: string) {
  const lowercaseKeyword = keyword.toLowerCase();
  
  const allLocations = [
    {
      name: "Charles de Gaulle Airport",
      cityName: "Paris",
      iataCode: "CDG",
      countryName: "France",
      countryCode: "FR",
      lat: 49.0097,
      lon: 2.5479,
      subType: "AIRPORT" as const,
    },
    {
      name: "Orly Airport",
      cityName: "Paris",
      iataCode: "ORY",
      countryName: "France",
      countryCode: "FR",
      lat: 48.7262,
      lon: 2.3652,
      subType: "AIRPORT" as const,
    },
    {
      name: "Paris",
      cityName: "Paris",
      iataCode: "PAR",
      countryName: "France",
      countryCode: "FR",
      lat: 48.8566,
      lon: 2.3522,
      subType: "CITY" as const,
    },
    {
      name: "Heathrow Airport",
      cityName: "London",
      iataCode: "LHR",
      countryName: "United Kingdom",
      countryCode: "GB",
      lat: 51.4700,
      lon: -0.4543,
      subType: "AIRPORT" as const,
    },
    {
      name: "Gatwick Airport",
      cityName: "London",
      iataCode: "LGW",
      countryName: "United Kingdom",
      countryCode: "GB",
      lat: 51.1537,
      lon: -0.1821,
      subType: "AIRPORT" as const,
    },
    {
      name: "London",
      cityName: "London",
      iataCode: "LON",
      countryName: "United Kingdom",
      countryCode: "GB",
      lat: 51.5074,
      lon: -0.1278,
      subType: "CITY" as const,
    },
    {
      name: "John F. Kennedy International Airport",
      cityName: "New York",
      iataCode: "JFK",
      countryName: "United States",
      countryCode: "US",
      lat: 40.6413,
      lon: -73.7781,
      subType: "AIRPORT" as const,
    },
    {
      name: "LaGuardia Airport",
      cityName: "New York",
      iataCode: "LGA",
      countryName: "United States",
      countryCode: "US",
      lat: 40.7769,
      lon: -73.8740,
      subType: "AIRPORT" as const,
    },
    {
      name: "New York",
      cityName: "New York",
      iataCode: "NYC",
      countryName: "United States",
      countryCode: "US",
      lat: 40.7128,
      lon: -74.0060,
      subType: "CITY" as const,
    },
    {
      name: "Tokyo Narita Airport",
      cityName: "Tokyo",
      iataCode: "NRT",
      countryName: "Japan",
      countryCode: "JP",
      lat: 35.7720,
      lon: 140.3929,
      subType: "AIRPORT" as const,
    },
    {
      name: "Tokyo Haneda Airport",
      cityName: "Tokyo",
      iataCode: "HND",
      countryName: "Japan",
      countryCode: "JP",
      lat: 35.5494,
      lon: 139.7798,
      subType: "AIRPORT" as const,
    },
    {
      name: "Tokyo",
      cityName: "Tokyo",
      iataCode: "TYO",
      countryName: "Japan",
      countryCode: "JP",
      lat: 35.6762,
      lon: 139.6503,
      subType: "CITY" as const,
    },
    {
      name: "Dubai International Airport",
      cityName: "Dubai",
      iataCode: "DXB",
      countryName: "United Arab Emirates",
      countryCode: "AE",
      lat: 25.2532,
      lon: 55.3657,
      subType: "AIRPORT" as const,
    },
    {
      name: "Dubai",
      cityName: "Dubai",
      iataCode: "DXB",
      countryName: "United Arab Emirates",
      countryCode: "AE",
      lat: 25.2048,
      lon: 55.2708,
      subType: "CITY" as const,
    },
    {
      name: "Amsterdam Schiphol Airport",
      cityName: "Amsterdam",
      iataCode: "AMS",
      countryName: "Netherlands",
      countryCode: "NL",
      lat: 52.3105,
      lon: 4.7683,
      subType: "AIRPORT" as const,
    },
    {
      name: "Amsterdam",
      cityName: "Amsterdam",
      iataCode: "AMS",
      countryName: "Netherlands",
      countryCode: "NL",
      lat: 52.3676,
      lon: 4.9041,
      subType: "CITY" as const,
    },
    {
      name: "Barcelona El Prat Airport",
      cityName: "Barcelona",
      iataCode: "BCN",
      countryName: "Spain",
      countryCode: "ES",
      lat: 41.2971,
      lon: 2.0785,
      subType: "AIRPORT" as const,
    },
    {
      name: "Barcelona",
      cityName: "Barcelona",
      iataCode: "BCN",
      countryName: "Spain",
      countryCode: "ES",
      lat: 41.3851,
      lon: 2.1734,
      subType: "CITY" as const,
    },
    {
      name: "Sydney Kingsford Smith Airport",
      cityName: "Sydney",
      iataCode: "SYD",
      countryName: "Australia",
      countryCode: "AU",
      lat: -33.9399,
      lon: 151.1753,
      subType: "AIRPORT" as const,
    },
    {
      name: "Sydney",
      cityName: "Sydney",
      iataCode: "SYD",
      countryName: "Australia",
      countryCode: "AU",
      lat: -33.8688,
      lon: 151.2093,
      subType: "CITY" as const,
    },
    {
      name: "Singapore Changi Airport",
      cityName: "Singapore",
      iataCode: "SIN",
      countryName: "Singapore",
      countryCode: "SG",
      lat: 1.3644,
      lon: 103.9915,
      subType: "AIRPORT" as const,
    },
    {
      name: "Singapore",
      cityName: "Singapore",
      iataCode: "SIN",
      countryName: "Singapore",
      countryCode: "SG",
      lat: 1.3521,
      lon: 103.8198,
      subType: "CITY" as const,
    },
    {
      name: "Rome Fiumicino Airport",
      cityName: "Rome",
      iataCode: "FCO",
      countryName: "Italy",
      countryCode: "IT",
      lat: 41.8003,
      lon: 12.2389,
      subType: "AIRPORT" as const,
    },
    {
      name: "Rome",
      cityName: "Rome",
      iataCode: "ROM",
      countryName: "Italy",
      countryCode: "IT",
      lat: 41.9028,
      lon: 12.4964,
      subType: "CITY" as const,
    },
    {
      name: "Frankfurt Airport",
      cityName: "Frankfurt",
      iataCode: "FRA",
      countryName: "Germany",
      countryCode: "DE",
      lat: 50.0379,
      lon: 8.5622,
      subType: "AIRPORT" as const,
    },
    {
      name: "Frankfurt",
      cityName: "Frankfurt",
      iataCode: "FRA",
      countryName: "Germany",
      countryCode: "DE",
      lat: 50.1109,
      lon: 8.6821,
      subType: "CITY" as const,
    },
    {
      name: "Los Angeles International Airport",
      cityName: "Los Angeles",
      iataCode: "LAX",
      countryName: "United States",
      countryCode: "US",
      lat: 33.9416,
      lon: -118.4085,
      subType: "AIRPORT" as const,
    },
    {
      name: "Los Angeles",
      cityName: "Los Angeles",
      iataCode: "LAX",
      countryName: "United States",
      countryCode: "US",
      lat: 34.0522,
      lon: -118.2437,
      subType: "CITY" as const,
    },
    {
      name: "Madrid Barajas Airport",
      cityName: "Madrid",
      iataCode: "MAD",
      countryName: "Spain",
      countryCode: "ES",
      lat: 40.4983,
      lon: -3.5676,
      subType: "AIRPORT" as const,
    },
    {
      name: "Madrid",
      cityName: "Madrid",
      iataCode: "MAD",
      countryName: "Spain",
      countryCode: "ES",
      lat: 40.4168,
      lon: -3.7038,
      subType: "CITY" as const,
    },
  ];

  // Filter by keyword match on city name, country name, or IATA code
  return allLocations.filter(loc => 
    loc.cityName.toLowerCase().includes(lowercaseKeyword) ||
    loc.countryName.toLowerCase().includes(lowercaseKeyword) ||
    loc.iataCode.toLowerCase().includes(lowercaseKeyword) ||
    loc.name.toLowerCase().includes(lowercaseKeyword)
  ).slice(0, 8); // Limit to 8 results
}
