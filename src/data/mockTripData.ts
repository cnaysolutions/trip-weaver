import type { TripPlan, TripDetails } from "@/types/trip";
import { addDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

// Helper function to fetch real photos from Google Places API
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
    console.error(`Failed to fetch photo for ${placeName}:`, error);
    return null;
  }
}

// Get attractions with real photos
async function getAttractions(city: string) {
  const attractionsByCity: Record<
    string,
    Array<{ name: string; description: string; distance: string; cost: number; bookingUrl: string }>
  > = {
    London: [
      {
        name: "London Eye",
        description: "Iconic observation wheel with panoramic city views",
        distance: "2.5 km",
        cost: 35,
        bookingUrl: "https://www.getyourguide.com/london-l57/london-eye-t61789/",
      },
      {
        name: "Tower of London",
        description: "Historic castle and former royal residence",
        distance: "4.2 km",
        cost: 32,
        bookingUrl: "https://www.getyourguide.com/london-l57/tower-of-london-t61788/",
      },
      {
        name: "British Museum",
        description: "World-famous museum with extensive collections",
        distance: "3.8 km",
        cost: 0,
        bookingUrl: "https://www.getyourguide.com/london-l57/british-museum-t194318/",
      },
    ],
    Paris: [
      {
        name: "Eiffel Tower",
        description: "Iconic iron lattice tower and symbol of Paris",
        distance: "3.2 km",
        cost: 28,
        bookingUrl: "https://www.getyourguide.com/paris-l16/eiffel-tower-t5021/",
      },
      {
        name: "Louvre Museum",
        description: "World's largest art museum",
        distance: "2.8 km",
        cost: 22,
        bookingUrl: "https://www.getyourguide.com/paris-l16/louvre-museum-t5022/",
      },
      {
        name: "Notre-Dame Cathedral",
        description: "Medieval Catholic cathedral",
        distance: "1.5 km",
        cost: 0,
        bookingUrl: "https://www.getyourguide.com/paris-l16/notre-dame-cathedral-t194319/",
      },
    ],
    Rome: [
      {
        name: "Colosseum",
        description: "Ancient amphitheater and iconic Roman landmark",
        distance: "3.5 km",
        cost: 18,
        bookingUrl: "https://www.getyourguide.com/rome-l33/colosseum-t5023/",
      },
      {
        name: "Vatican Museums",
        description: "World-renowned art and historical collections",
        distance: "5.2 km",
        cost: 20,
        bookingUrl: "https://www.getyourguide.com/rome-l33/vatican-museums-t5024/",
      },
      {
        name: "Trevi Fountain",
        description: "Baroque fountain and popular tourist attraction",
        distance: "2.1 km",
        cost: 0,
        bookingUrl: "https://www.getyourguide.com/rome-l33/trevi-fountain-t194320/",
      },
    ],
    Barcelona: [
      {
        name: "Sagrada Familia",
        description: "Gaudí's masterpiece basilica",
        distance: "3.8 km",
        cost: 26,
        bookingUrl: "https://www.getyourguide.com/barcelona-l45/sagrada-familia-t5025/",
      },
      {
        name: "Park Güell",
        description: "Colorful park designed by Antoni Gaudí",
        distance: "4.5 km",
        cost: 10,
        bookingUrl: "https://www.getyourguide.com/barcelona-l45/park-guell-t5026/",
      },
      {
        name: "La Rambla",
        description: "Famous tree-lined pedestrian street",
        distance: "1.2 km",
        cost: 0,
        bookingUrl: "https://www.getyourguide.com/barcelona-l45/la-rambla-t194321/",
      },
    ],
    Amsterdam: [
      {
        name: "Anne Frank House",
        description: "Historic house and biographical museum",
        distance: "2.3 km",
        cost: 14,
        bookingUrl: "https://www.getyourguide.com/amsterdam-l36/anne-frank-house-t5027/",
      },
      {
        name: "Van Gogh Museum",
        description: "World's largest collection of Van Gogh's works",
        distance: "3.1 km",
        cost: 20,
        bookingUrl: "https://www.getyourguide.com/amsterdam-l36/van-gogh-museum-t5028/",
      },
      {
        name: "Canal Cruise",
        description: "Scenic boat tour through Amsterdam's canals",
        distance: "City center",
        cost: 18,
        bookingUrl: "https://www.getyourguide.com/amsterdam-l36/canal-cruise-t194322/",
      },
    ],
  };

  const defaultAttractions = [
    {
      name: `${city} City Center`,
      description: "Explore the heart of the city",
      distance: "1.2 km",
      cost: 0,
      bookingUrl: `https://www.getyourguide.com/s/?q=${encodeURIComponent(city + " city tour")}`,
    },
    {
      name: `${city} Historic Quarter`,
      description: "Walk through historic streets",
      distance: "2.5 km",
      cost: 15,
      bookingUrl: `https://www.getyourguide.com/s/?q=${encodeURIComponent(city + " historic tour")}`,
    },
    {
      name: `${city} Cultural Museum`,
      description: "Discover local art and history",
      distance: "3.1 km",
      cost: 18,
      bookingUrl: `https://www.getyourguide.com/s/?q=${encodeURIComponent(city + " museum")}`,
    },
  ];

  const attractions = attractionsByCity[city] || defaultAttractions;

  // Fetch real photos for each attraction
  const attractionsWithPhotos = await Promise.all(
    attractions.map(async (attraction) => {
      const photoUrl = await fetchPlacePhoto(attraction.name, city);
      return {
        ...attraction,
        imageUrl:
          photoUrl || `https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80`,
      };
    }),
  );

  return attractionsWithPhotos;
}

export async function generateMockTripPlan(details: TripDetails): Promise<TripPlan> {
  const departureDate = details.departureDate || new Date();
  const returnDate = details.returnDate || addDays(departureDate, 5);
  const tripDays = Math.ceil((returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const originCode = getAirportCode(details.departureCity);
  const destCode = getAirportCode(details.destinationCity);

  const baseFlightPrice = details.flightClass === "first" ? 1200 : details.flightClass === "business" ? 650 : 320;

  return {
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
      pricePerPerson: baseFlightPrice + Math.floor(Math.random() * 80),
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
      pricePerPerson: baseFlightPrice + Math.floor(Math.random() * 80),
      included: true,
    },
    carRental: details.includeCarRental
      ? {
          id: "car-1",
          company: "EuroMobility",
          vehicleType: "SUV",
          vehicleName: "Volkswagen Tiguan or similar",
          pickupLocation: `${details.destinationCity} Airport`,
          dropoffLocation: `${details.destinationCity} Airport`,
          pickupTime: format(departureDate, "MMM d, HH:mm"),
          dropoffTime: format(returnDate, "MMM d, HH:mm"),
          pricePerDay: 65,
          totalPrice: 65 * tripDays,
          included: true,
        }
      : null,
    hotel: details.includeHotel
      ? {
          id: "hotel-1",
          name: `Grand ${details.destinationCity} Palace Hotel`,
          rating: 4,
          address: `123 Central Avenue, ${details.destinationCity}`,
          distanceFromAirport: "18 km",
          pricePerNight: 185,
          totalPrice: 185 * (tripDays - 1),
          amenities: ["Free WiFi", "Spa", "Restaurant", "Pool", "Gym", "Room Service"],
          included: true,
        }
      : null,
    itinerary: await generateDayItineraries(details, tripDays),
    totalCost: 0,
  };
}

function getAirportCode(city: string): string {
  const codes: Record<string, string> = {
    london: "LHR",
    paris: "CDG",
    "new york": "JFK",
    rome: "FCO",
    tokyo: "NRT",
    bali: "DPS",
    dubai: "DXB",
    barcelona: "BCN",
    amsterdam: "AMS",
    berlin: "BER",
    madrid: "MAD",
    lisbon: "LIS",
    vienna: "VIE",
    prague: "PRG",
    sydney: "SYD",
    singapore: "SIN",
    bangkok: "BKK",
    istanbul: "IST",
    athens: "ATH",
    zurich: "ZRH",
  };

  const normalized = city.toLowerCase().trim();
  return codes[normalized] || city.substring(0, 3).toUpperCase();
}

async function generateDayItineraries(details: TripDetails, tripDays: number) {
  const departureDate = details.departureDate || new Date();
  const itineraries = [];

  // Day 1 - Arrival
  itineraries.push({
    day: 1,
    date: format(departureDate, "yyyy-MM-dd"),
    items: [
      {
        id: "d1-1",
        time: "12:45",
        title: `Arrival at ${details.destinationCity} Airport`,
        description: "Your flight has landed. Welcome to your destination!",
        type: "flight" as const,
        included: true,
        imageUrl: "https://images.unsplash.com/photo-1556388158-158ea5b6d841?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " airport"),
      },
      {
        id: "d1-2",
        time: "13:30",
        title: "Car Rental Pickup",
        description: `Collect your vehicle from the airport rental desk. Allow 30-45 minutes for paperwork and vehicle inspection.`,
        type: "transport" as const,
        distance: "Airport terminal",
        included: details.includeCarRental,
        imageUrl: "https://images.unsplash.com/photo-1552820728-8ac41f1ce891?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " car rental"),
      },
      {
        id: "d1-3",
        time: "14:30",
        title: "Hotel Check-in",
        description: `Arrive at Grand ${details.destinationCity} Palace Hotel. Take time to settle in and refresh after your journey.`,
        type: "hotel" as const,
        distance: "18 km from airport",
        included: details.includeHotel,
        imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
        bookingUrl:
          "https://www.getyourguide.com/s/?q=" +
          encodeURIComponent("Grand " + details.destinationCity + " Palace Hotel"),
      },
      {
        id: "d1-4",
        time: "16:00",
        title: "Light Exploration",
        description:
          "Take a leisurely walk around your hotel neighborhood. Discover local cafes and get your bearings.",
        type: "attraction" as const,
        distance: "Walking distance",
        included: true,
        imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80",
        bookingUrl:
          "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " walking tour"),
      },
      {
        id: "d1-5",
        time: "19:30",
        title: "Welcome Dinner",
        description: `Enjoy an authentic local dining experience. Ask your hotel concierge for recommendations nearby.`,
        type: "meal" as const,
        cost: 75,
        included: true,
        imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " restaurants"),
      },
    ],
  });

  // Middle days - Exploration
  for (let day = 2; day < tripDays; day++) {
    const dayDate = addDays(departureDate, day - 1);
    const attractions = await getAttractions(details.destinationCity);

    itineraries.push({
      day,
      date: format(dayDate, "yyyy-MM-dd"),
      items: [
        {
          id: `d${day}-1`,
          time: "08:00",
          title: "Breakfast at Hotel",
          description: "Start your day with a relaxed breakfast. Review your day's itinerary.",
          type: "meal" as const,
          included: true,
          imageUrl: "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80",
          bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " breakfast"),
        },
        {
          id: `d${day}-2`,
          time: "09:30",
          title: attractions[0].name,
          description: attractions[0].description,
          type: "attraction" as const,
          distance: attractions[0].distance,
          cost: attractions[0].cost,
          included: true,
          imageUrl: attractions[0].imageUrl,
          bookingUrl: attractions[0].bookingUrl,
        },
        {
          id: `d${day}-3`,
          time: "12:30",
          title: "Lunch Break",
          description: "Find a local restaurant for lunch. Take time to rest and recharge.",
          type: "meal" as const,
          cost: 40,
          included: true,
          imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
          bookingUrl:
            "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " restaurants"),
        },
        {
          id: `d${day}-4`,
          time: "14:30",
          title: attractions[1].name,
          description: attractions[1].description,
          type: "attraction" as const,
          distance: attractions[1].distance,
          cost: attractions[1].cost,
          included: true,
          imageUrl: attractions[1].imageUrl,
          bookingUrl: attractions[1].bookingUrl,
        },
        {
          id: `d${day}-5`,
          time: "17:00",
          title: attractions[2].name,
          description: attractions[2].description,
          type: "attraction" as const,
          distance: attractions[2].distance,
          cost: attractions[2].cost,
          included: true,
          imageUrl: attractions[2].imageUrl,
          bookingUrl: attractions[2].bookingUrl,
        },
        {
          id: `d${day}-6`,
          time: "19:00",
          title: "Return to Hotel",
          description: "Head back to freshen up before dinner.",
          type: "rest" as const,
          included: true,
          imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
          bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " hotel"),
        },
        {
          id: `d${day}-7`,
          time: "20:00",
          title: "Dinner",
          description: "Evening dining experience. Explore different neighborhoods each night.",
          type: "meal" as const,
          cost: 85,
          included: true,
          imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
          bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " dining"),
        },
      ],
    });
  }

  // Last day - Departure
  const lastDate = addDays(departureDate, tripDays - 1);
  itineraries.push({
    day: tripDays,
    date: format(lastDate, "yyyy-MM-dd"),
    items: [
      {
        id: `d${tripDays}-1`,
        time: "08:00",
        title: "Final Breakfast",
        description: "Enjoy your last morning at the hotel. Double-check your belongings.",
        type: "meal" as const,
        included: true,
        imageUrl: "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " breakfast"),
      },
      {
        id: `d${tripDays}-2`,
        time: "10:00",
        title: "Hotel Check-out",
        description: "Complete check-out. Ensure nothing is left behind.",
        type: "hotel" as const,
        included: details.includeHotel,
        imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
        bookingUrl:
          "https://www.getyourguide.com/s/?q=" +
          encodeURIComponent("Grand " + details.destinationCity + " Palace Hotel"),
      },
      {
        id: `d${tripDays}-3`,
        time: "11:00",
        title: "Car Rental Return",
        description: "Return your rental car at the airport. Allow time for inspection and shuttle to the terminal.",
        type: "transport" as const,
        included: details.includeCarRental,
        imageUrl: "https://images.unsplash.com/photo-1552820728-8ac41f1ce891?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " car rental"),
      },
      {
        id: `d${tripDays}-4`,
        time: "14:00",
        title: `Departure from ${details.destinationCity} Airport`,
        description: "Board your flight home. We hope you had a wonderful trip!",
        type: "flight" as const,
        included: true,
        imageUrl: "https://images.unsplash.com/photo-1556388158-158ea5b6d841?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " airport"),
      },
    ],
  });

  return itineraries;
}
