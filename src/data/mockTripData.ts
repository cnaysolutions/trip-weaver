import type { TripPlan, TripDetails } from "@/types/trip";
import { addDays, format } from "date-fns";

export function generateMockTripPlan(details: TripDetails): TripPlan {
  const departureDate = details.departureDate || new Date();
  const returnDate = details.returnDate || addDays(departureDate, 5);
  const tripDays = Math.ceil((returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const originCode = getAirportCode(details.departureCity);
  const destCode = getAirportCode(details.destinationCity);

  const baseFlightPrice = details.flightClass === "first" 
    ? 1200 
    : details.flightClass === "business" 
      ? 650 
      : 320;

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
    itinerary: generateDayItineraries(details, tripDays),
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

function generateDayItineraries(details: TripDetails, tripDays: number) {
  const departureDate = details.departureDate || new Date();
  const itineraries = [];

  // Day 1 - Arrival
  itineraries.push({
    day: 1,
    date: format(departureDate, "EEEE, MMMM d"),
    items: [
      {
        id: "d1-1",
        time: "12:45",
        title: `Arrival at ${details.destinationCity} Airport`,
        description: "Your flight has landed. Welcome to your destination!",
        type: "flight" as const,
        included: true,
        imageUrl: "https://images.unsplash.com/photo-1556388158-158ea5b6d841?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " airport" )
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
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " car rental" )
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
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent("Grand " + details.destinationCity + " Palace Hotel" )
      },
      {
        id: "d1-4",
        time: "16:00",
        title: "Light Exploration",
        description: "Take a leisurely walk around your hotel neighborhood. Discover local cafes and get your bearings.",
        type: "attraction" as const,
        distance: "Walking distance",
        included: true,
        imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " walking tour" )
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
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " restaurants" )
      },
    ],
  });

  // Middle days - Exploration
  for (let day = 2; day < tripDays; day++) {
    const dayDate = addDays(departureDate, day - 1);
    const attractions = getRandomAttractions(details.destinationCity, day);
    
    itineraries.push({
      day,
      date: format(dayDate, "EEEE, MMMM d"),
      items: [
        {
          id: `d${day}-1`,
          time: "08:00",
          title: "Breakfast at Hotel",
          description: "Start your day with a relaxed breakfast. Review your day's itinerary.",
          type: "meal" as const,
          included: true,
          imageUrl: "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80",
          bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " breakfast" )
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
          bookingUrl: attractions[0].bookingUrl
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
          bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " restaurants" )
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
          bookingUrl: attractions[1].bookingUrl
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
          bookingUrl: attractions[2].bookingUrl
        },
        {
          id: `d${day}-6`,
          time: "19:00",
          title: "Return to Hotel",
          description: "Head back to freshen up before dinner.",
          type: "rest" as const,
          included: true,
          imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
          bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " hotel" )
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
          bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " dining" )
        },
      ],
    });
  }

  // Last day - Departure
  const lastDate = addDays(departureDate, tripDays - 1);
  itineraries.push({
    day: tripDays,
    date: format(lastDate, "EEEE, MMMM d"),
    items: [
      {
        id: `d${tripDays}-1`,
        time: "08:00",
        title: "Final Breakfast",
        description: "Enjoy your last morning at the hotel. Double-check your belongings.",
        type: "meal" as const,
        included: true,
        imageUrl: "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " breakfast" )
      },
      {
        id: `d${tripDays}-2`,
        time: "10:00",
        title: "Hotel Check-out",
        description: "Complete check-out. Ensure nothing is left behind.",
        type: "hotel" as const,
        included: details.includeHotel,
        imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent("Grand " + details.destinationCity + " Palace Hotel" )
      },
      {
        id: `d${tripDays}-3`,
        time: "11:00",
        title: "Last-minute Shopping",
        description: "Pick up any souvenirs or last-minute gifts for loved ones back home.",
        type: "attraction" as const,
        cost: 0,
        included: true,
        imageUrl: "https://images.unsplash.com/photo-1555529669-e69e7ea0bb29?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " shopping" )
      },
      {
        id: `d${tripDays}-4`,
        time: "14:00",
        title: "Car Return",
        description: "Return rental vehicle at the airport. Allow extra time for inspection.",
        type: "transport" as const,
        distance: "Airport terminal",
        included: details.includeCarRental,
        imageUrl: "https://images.unsplash.com/photo-1552820728-8ac41f1ce891?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " car rental" )
      },
      {
        id: `d${tripDays}-5`,
        time: "15:30",
        title: "Airport Check-in",
        description: "Arrive at the airport with plenty of time. Browse duty-free if desired.",
        type: "flight" as const,
        included: true,
        imageUrl: "https://images.unsplash.com/photo-1556388158-158ea5b6d841?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.destinationCity + " airport" )
      },
      {
        id: `d${tripDays}-6`,
        time: "18:30",
        title: `Departure to ${details.departureCity}`,
        description: "Board your flight home. Safe travels!",
        type: "flight" as const,
        included: true,
        imageUrl: "https://images.unsplash.com/photo-1556388158-158ea5b6d841?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(details.departureCity + " airport" )
      },
    ],
  });

  return itineraries;
}

function getRandomAttractions(city: string, seed: number) {
  const genericAttractions = [
    [
      { 
        name: "Historic City Center", 
        description: "Explore the charming old town with its cobblestone streets and centuries-old architecture.", 
        distance: "3 km", 
        cost: 0,
        imageUrl: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(city + " walking tour" )
      },
      { 
        name: "National Museum", 
        description: "Discover the rich cultural heritage through art and historical artifacts.", 
        distance: "2.5 km", 
        cost: 18,
        imageUrl: "https://images.unsplash.com/photo-1518998053502-53cc8efd9aee?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(city + " museum" )
      },
      { 
        name: "Central Park & Gardens", 
        description: "Stroll through beautifully manicured gardens and enjoy the local flora.", 
        distance: "4 km", 
        cost: 0,
        imageUrl: "https://images.unsplash.com/photo-1580137189272-c9379f8864fd?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(city + " park" )
      },
    ],
    [
      { 
        name: "Cathedral & Religious Quarter", 
        description: "Visit stunning religious architecture and learn about local traditions.", 
        distance: "2 km", 
        cost: 12,
        imageUrl: "https://images.unsplash.com/photo-1548661762-4646fa58339a?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(city + " cathedral" )
      },
      { 
        name: "Local Market Experience", 
        description: "Immerse yourself in local culture at the bustling market. Try street food and crafts.", 
        distance: "3.5 km", 
        cost: 25,
        imageUrl: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(city + " market" )
      },
      { 
        name: "Panoramic Viewpoint", 
        description: "Enjoy breathtaking views of the city from a famous observation point.", 
        distance: "6 km", 
        cost: 15,
        imageUrl: "https://images.unsplash.com/photo-1449156001935-d2863fb22690?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(city + " viewpoint" )
      },
    ],
    [
      { 
        name: "Modern Art Gallery", 
        description: "Explore contemporary works from local and international artists.", 
        distance: "2.8 km", 
        cost: 20,
        imageUrl: "https://images.unsplash.com/photo-1518998053502-53cc8efd9aee?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(city + " art gallery" )
      },
      { 
        name: "Waterfront Promenade", 
        description: "Walk along the scenic waterfront with cafes and street performers.", 
        distance: "4.5 km", 
        cost: 0,
        imageUrl: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(city + " waterfront" )
      },
      { 
        name: "Evening Food Tour", 
        description: "Sample local delicacies with a guided culinary walking tour.", 
        distance: "Walking tour", 
        cost: 55,
        imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
        bookingUrl: "https://www.getyourguide.com/s/?q=" + encodeURIComponent(city + " food tour" )
      },
    ],
  ];

  return genericAttractions[(seed - 1) % genericAttractions.length];
}
