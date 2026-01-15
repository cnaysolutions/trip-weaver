import type { TripPlan, TripDetails } from "@/types/trip";
import { addDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

// Helper function to fetch real photos from Pexels API (FREE - already working!)
async function fetchPlacePhoto(placeName: string, city: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("get-place-photo", {
      body: { placeName, city },
    });

    if (error) {
      console.error(`Error fetching photo for ${placeName}:`, error);
      return null;
    }

    return data?.photoUrl || null;
  } catch (error) {
    console.error(`Exception fetching photo for ${placeName}:`, error);
    return null;
  }
}

// Helper function to fetch attractions from OpenTripMap (FREE!)
async function fetchAttractions(city: string, lat: number, lon: number, limit: number = 15) {
  try {
    console.log(`Fetching attractions for ${city} using OpenTripMap...`);

    const { data, error } = await supabase.functions.invoke("get-attractions-opentripmap", {
      body: {
        city,
        lat,
        lon,
        limit,
        radius: 5000, // 5km radius
      },
    });

    if (error) {
      console.error(`Error fetching attractions for ${city}:`, error);
      return [];
    }

    const attractions = data?.attractions || [];
    console.log(`Found ${attractions.length} attractions for ${city}`);

    return attractions;
  } catch (error) {
    console.error(`Exception fetching attractions for ${city}:`, error);
    return [];
  }
}

// City coordinates for OpenTripMap API
const cityCoordinates: Record<string, { lat: number; lon: number }> = {
  // Europe
  Paris: { lat: 48.8566, lon: 2.3522 },
  Barcelona: { lat: 41.3874, lon: 2.1686 },
  Rome: { lat: 41.9028, lon: 12.4964 },
  London: { lat: 51.5074, lon: -0.1278 },
  Amsterdam: { lat: 52.3676, lon: 4.9041 },
  Berlin: { lat: 52.52, lon: 13.405 },
  Madrid: { lat: 40.4168, lon: -3.7038 },
  Prague: { lat: 50.0755, lon: 14.4378 },
  Vienna: { lat: 48.2082, lon: 16.3738 },
  Athens: { lat: 37.9838, lon: 23.7275 },

  // Asia
  Tokyo: { lat: 35.6762, lon: 139.6503 },
  Dubai: { lat: 25.2048, lon: 55.2708 },
  Bangkok: { lat: 13.7563, lon: 100.5018 },
  Singapore: { lat: 1.3521, lon: 103.8198 },
  "Hong Kong": { lat: 22.3193, lon: 114.1694 },
  Seoul: { lat: 37.5665, lon: 126.978 },
  Istanbul: { lat: 41.0082, lon: 28.9784 },

  // Americas
  "New York": { lat: 40.7128, lon: -74.006 },
  "Los Angeles": { lat: 34.0522, lon: -118.2437 },
  Miami: { lat: 25.7617, lon: -80.1918 },
  Toronto: { lat: 43.6532, lon: -79.3832 },
  "Mexico City": { lat: 19.4326, lon: -99.1332 },
  "Rio de Janeiro": { lat: -22.9068, lon: -43.1729 },
  "Buenos Aires": { lat: -34.6037, lon: -58.3816 },

  // Oceania
  Sydney: { lat: -33.8688, lon: 151.2093 },
  Melbourne: { lat: -37.8136, lon: 144.9631 },
  Auckland: { lat: -36.8485, lon: 174.7633 },

  // Africa & Middle East
  Cairo: { lat: 30.0444, lon: 31.2357 },
  "Cape Town": { lat: -33.9249, lon: 18.4241 },
  "Tel Aviv": { lat: 32.0853, lon: 34.7818 },
};

function getCityCoordinates(city: string): { lat: number; lon: number } | null {
  // Strip country name if present (e.g., "Barcelona, Spain" -> "Barcelona")
  const cityName = city.includes(',') ? city.split(',')[0].trim() : city;
  
  // Try exact match first
  if (cityCoordinates[cityName]) {
    return cityCoordinates[cityName];
  }

  // Try case-insensitive match
  const cityLower = cityName.toLowerCase();
  for (const [key, coords] of Object.entries(cityCoordinates)) {
    if (key.toLowerCase() === cityLower) {
      return coords;
    }
  }

  // Default to Paris if not found
  console.warn(`Coordinates not found for ${cityName}, using Paris as default`);
  return cityCoordinates["Paris"];
}

function getAirportCode(city: string): string {
  // Strip country name if present (e.g., "Madrid, Spain" -> "Madrid")
  const cityName = city.includes(',') ? city.split(',')[0].trim() : city;
  
  const codes: Record<string, string> = {
    Paris: "CDG",
    Barcelona: "BCN",
    Rome: "FCO",
    London: "LHR",
    Amsterdam: "AMS",
    Berlin: "BER",
    Madrid: "MAD",
    Prague: "PRG",
    Vienna: "VIE",
    Athens: "ATH",
    Tokyo: "NRT",
    Dubai: "DXB",
    Bangkok: "BKK",
    Singapore: "SIN",
    "Hong Kong": "HKG",
    Seoul: "ICN",
    Istanbul: "IST",
    "New York": "JFK",
    "Los Angeles": "LAX",
    Miami: "MIA",
    Toronto: "YYZ",
    "Mexico City": "MEX",
    "Rio de Janeiro": "GIG",
    "Buenos Aires": "EZE",
    Sydney: "SYD",
    Melbourne: "MEL",
    Auckland: "AKL",
    Cairo: "CAI",
    "Cape Town": "CPT",
    "Tel Aviv": "TLV",
    Frankfurt: "FRA",
    Munich: "MUC",
    Lisbon: "LIS",
    Dublin: "DUB",
    Brussels: "BRU",
    Zurich: "ZRH",
    Geneva: "GVA",
    Copenhagen: "CPH",
    Stockholm: "ARN",
    Oslo: "OSL",
    Helsinki: "HEL",
    Warsaw: "WAW",
    Budapest: "BUD",
    Bucharest: "OTP",
    Sofia: "SOF",
    Zagreb: "ZAG",
    Belgrade: "BEG",
  };

  // Try exact match first
  if (codes[cityName]) {
    return codes[cityName];
  }

  // Try case-insensitive match
  const cityLower = cityName.toLowerCase();
  for (const [key, code] of Object.entries(codes)) {
    if (key.toLowerCase() === cityLower) {
      return code;
    }
  }

  return "XXX";
}

// Helper to get random price within a range
function getRandomPrice(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Get realistic attraction price based on category
function getAttractionPrice(category: string, rating: number): number {
  const categoryLower = (category || "").toLowerCase();
  
  // Museums: €15-30
  if (categoryLower.includes("museum")) {
    return getRandomPrice(15, 30);
  }
  
  // Historic sites & architecture: €10-25
  if (categoryLower.includes("historic") || categoryLower.includes("architecture") || categoryLower.includes("monument")) {
    return getRandomPrice(10, 25);
  }
  
  // Religious sites: often free or €5-15
  if (categoryLower.includes("religion") || categoryLower.includes("church") || categoryLower.includes("temple")) {
    return getRandomPrice(0, 15);
  }
  
  // Natural sites: €5-20
  if (categoryLower.includes("natural") || categoryLower.includes("park") || categoryLower.includes("garden")) {
    return getRandomPrice(5, 20);
  }
  
  // Entertainment & activities: €20-50
  if (categoryLower.includes("entertainment") || categoryLower.includes("theatre") || categoryLower.includes("sport")) {
    return getRandomPrice(20, 50);
  }
  
  // Cultural sites: €10-35
  if (categoryLower.includes("cultural")) {
    return getRandomPrice(10, 35);
  }
  
  // Default: base on rating (higher rating = more popular = higher price)
  if (rating >= 7) return getRandomPrice(20, 45);
  if (rating >= 5) return getRandomPrice(12, 30);
  if (rating >= 3) return getRandomPrice(8, 20);
  return getRandomPrice(0, 15); // Low rated or free attractions
}

// Fallback images by category when Pexels fails
function getCategoryFallbackImage(category: string, index: number): string {
  const categoryLower = (category || "").toLowerCase();
  
  // Museum images
  if (categoryLower.includes("museum")) {
    const museumImages = [
      "https://images.unsplash.com/photo-1554907984-15263bfd63bd?auto=format&fit=crop&w=800&q=80", // Museum interior
      "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=800&q=80", // Art gallery
      "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=800&q=80", // Modern museum
    ];
    return museumImages[index % museumImages.length];
  }
  
  // Historic & architecture
  if (categoryLower.includes("historic") || categoryLower.includes("architecture") || categoryLower.includes("monument")) {
    const historicImages = [
      "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=800&q=80", // Historic building
      "https://images.unsplash.com/photo-1549144511-f099e773c147?auto=format&fit=crop&w=800&q=80", // Monument
      "https://images.unsplash.com/photo-1548445929-4f60a497f851?auto=format&fit=crop&w=800&q=80", // Castle
    ];
    return historicImages[index % historicImages.length];
  }
  
  // Religious sites
  if (categoryLower.includes("religion") || categoryLower.includes("church") || categoryLower.includes("temple")) {
    const religiousImages = [
      "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80", // Cathedral
      "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=800&q=80", // Church interior
      "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=800&q=80", // Temple
    ];
    return religiousImages[index % religiousImages.length];
  }
  
  // Natural sites & parks
  if (categoryLower.includes("natural") || categoryLower.includes("park") || categoryLower.includes("garden")) {
    const natureImages = [
      "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80", // Park
      "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=800&q=80", // Garden
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80", // Forest
    ];
    return natureImages[index % natureImages.length];
  }
  
  // Entertainment & cultural
  if (categoryLower.includes("entertainment") || categoryLower.includes("theatre") || categoryLower.includes("cultural")) {
    const entertainmentImages = [
      "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=800&q=80", // Theatre
      "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=800&q=80", // Concert hall
      "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?auto=format&fit=crop&w=800&q=80", // Performance
    ];
    return entertainmentImages[index % entertainmentImages.length];
  }
  
  // Default varied travel images
  const defaultImages = [
    "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80", // City landmark
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80", // City street
    "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?auto=format&fit=crop&w=800&q=80", // Tourist spot
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80", // Scenic view
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80", // Landmark
    "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=800&q=80", // Square
  ];
  return defaultImages[index % defaultImages.length];
}

// Meal images with variety
function getMealImage(mealType: string, dayIndex: number): string {
  const lunchImages = [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80", // Fine dining
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80", // Gourmet meal
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80", // Salad plate
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80", // Pizza
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80", // Colorful dish
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80", // Seafood
  ];
  
  return lunchImages[dayIndex % lunchImages.length];
}

export async function generateMockTripPlan(details: TripDetails): Promise<TripPlan> {
  const departureDate = details.departureDate || new Date();
  const returnDate = details.returnDate || addDays(departureDate, 5);
  const tripDays = Math.ceil((returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const originCode = getAirportCode(details.departureCity);
  const destCode = getAirportCode(details.destinationCity);

  const baseFlightPrice = details.flightClass === "first" ? 1200 : details.flightClass === "business" ? 650 : 320;

  // Get coordinates for destination city
  const destCoords = getCityCoordinates(details.destinationCity);
  // Fetch real attractions from OpenTripMap (FREE!)
  let attractions: any[] = [];
  if (destCoords) {
    attractions = await fetchAttractions(
      details.destinationCity,
      destCoords.lat,
      destCoords.lon,
      Math.min(tripDays * 3, 20), // Get 3 attractions per day, max 20
    );
  }

  // ✅ ADD FALLBACK: If API fails or returns empty, use generic attractions
  if (attractions.length === 0) {
    console.log(`OpenTripMap returned no attractions for ${details.destinationCity}, using fallback attractions`);
    attractions = getFallbackAttractions(details.destinationCity, Math.min(tripDays * 3, 20));
  }
  

  // Fetch photos for attractions using Pexels (FREE!) with proper fallbacks
  const attractionsWithPhotos = await Promise.all(
    attractions.map(async (attraction, index) => {
      const photoUrl = await fetchPlacePhoto(attraction.name, details.destinationCity);
      return {
        ...attraction,
        imageUrl: photoUrl || getCategoryFallbackImage(attraction.category, index),
      };
    }),
  );

  // Build daily itinerary from real attractions
  const itinerary = [];
  for (let day = 1; day <= tripDays; day++) {
    const dayDate = addDays(departureDate, day - 1);
    const dayItems = [];

    // First day: arrival
    if (day === 1) {
      dayItems.push({
        id: `day${day}-arrival`,
        title: `Arrival at ${details.destinationCity} Airport`,
        description: `Welcome to ${details.destinationCity}! Collect your luggage and proceed to your accommodation.`,
        time: "12:45",
        type: "transport",
        cost: 0,
        included: true,
        imageUrl: `https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80`,
      });
    }

    // Add 2-3 attractions per day
    const startIdx = (day - 1) * 3;
    const dayAttractions = attractionsWithPhotos.slice(startIdx, startIdx + 3);

    dayAttractions.forEach((attraction, idx) => {
      const hour = 9 + idx * 3; // 9am, 12pm, 3pm
      
      // Generate realistic price based on category
      const attractionCost = getAttractionPrice(attraction.category, attraction.rating);
      
      dayItems.push({
        id: `day${day}-attraction${idx}`,
        title: attraction.name,
        description: attraction.description || `Explore this ${attraction.category} in ${details.destinationCity}`,
        time: `${hour.toString().padStart(2, "0")}:00`,
        type: "attraction",
        cost: attractionCost,
        included: true,
        imageUrl: attraction.imageUrl,
        distance: idx > 0 ? "2.5 km" : undefined,
        duration: "2h",
      });
    });

    // Add lunch with varied pricing and images
    const lunchPrice = getRandomPrice(20, 40);
    dayItems.push({
      id: `day${day}-lunch`,
      title: "Lunch Break",
      description: `Enjoy a local restaurant. Take time to rest and recharge.`,
      time: "12:30",
      type: "meal",
      cost: lunchPrice,
      included: true,
      imageUrl: getMealImage("lunch", day - 1),
    });

    // Last day: departure
    if (day === tripDays) {
      dayItems.push({
        id: `day${day}-departure`,
        title: `Return to ${details.destinationCity} Airport`,
        description: `Check out and head to the airport for your return flight.`,
        time: "16:00",
        type: "transport",
        cost: 0,
        included: true,
        imageUrl: `https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80`,
      });
    }

    itinerary.push({
      day,
      date: format(dayDate, "EEE, MMM d"),
      items: dayItems,
    });
  }

  // Calculate total activity costs
  const activityCosts = itinerary.reduce((sum, day) => {
    return sum + day.items.filter((i) => i.included).reduce((daySum, item) => daySum + (item.cost || 0), 0);
  }, 0);

  const plan: TripPlan = {
    outboundFlight: {
      id: "outbound-1",
      airline: "SkyWings Airlines",
      flightNumber: "SW 1247",
      origin: details.departureCity,
      originCode,
      destination: details.destinationCity,
      destinationCode: destCode,
      departureTime: "09:15",
      arrivalTime: "12:45",
      duration: "3h 30m",
      class: details.flightClass,
      pricePerPerson: baseFlightPrice,
      included: true,
    },
    returnFlight: {
      id: "return-1",
      airline: "SkyWings Airlines",
      flightNumber: "SW 1248",
      origin: details.destinationCity,
      originCode: destCode,
      destination: details.departureCity,
      destinationCode: originCode,
      departureTime: "18:30",
      arrivalTime: "22:00",
      duration: "3h 30m",
      class: details.flightClass,
      pricePerPerson: baseFlightPrice,
      included: true,
    },
    carRental: details.includeCarRental
      ? {
          id: "car-1",
          company: "EuroMobility",
          vehicleType: "Compact",
          vehicleName: "Volkswagen Tiguan or similar",
          pickupLocation: `${details.destinationCity} Airport`,
          dropoffLocation: `${details.destinationCity} Airport`,
          pickupTime: format(departureDate, "MMM d, h:mm a"),
          dropoffTime: format(returnDate, "MMM d, h:mm a"),
          pricePerDay: 45,
          totalPrice: 45 * (tripDays - 1),
          included: true,
        }
      : undefined,
    hotel: details.includeHotel
      ? {
          id: "hotel-1",
          name: `Grand ${details.destinationCity}, Spain Palace Hotel`,
          rating: 4.5,
          address: `123 Central Avenue, ${details.destinationCity}, Spain`,
          distanceFromAirport: "18 km from airport",
          pricePerNight: 180,
          totalPrice: 180 * (tripDays - 1),
          amenities: ["Free WiFi", "Pool", "Gym", "Restaurant"],
          included: true,
        }
      : undefined,
    itinerary,
    totalCost: 0, // Will be calculated below
  };

  // Calculate total cost
  const flightCost = (plan.outboundFlight?.pricePerPerson || 0) + (plan.returnFlight?.pricePerPerson || 0);
  const carCost = plan.carRental?.totalPrice || 0;
  const hotelCost = plan.hotel?.totalPrice || 0;

  plan.totalCost = flightCost + carCost + hotelCost + activityCosts;

  return plan;
}
