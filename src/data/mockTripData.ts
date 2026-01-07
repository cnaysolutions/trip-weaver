import { TripDetails, TripPlan, Flight, CarRental, Hotel, DayItinerary, ItineraryItem } from "@/types/trip";

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 15);

export const generateMockTripPlan = (details: TripDetails): TripPlan => {
  const { departureCity, destinationCity, departureDate, returnDate, passengers, flightClass, includeCarRental, includeHotel } = details;

  const numTravelers = passengers.adults + passengers.children + passengers.infants;

  const mockOutboundFlight: Flight = {
    id: generateId(),
    airline: "SkyWings Airlines",
    flightNumber: "SW123",
    origin: departureCity,
    originCode: "PAR",
    destination: destinationCity,
    destinationCode: "TOK",
    departureTime: "09:15",
    arrivalTime: "12:45",
    duration: "12h 30m",
    class: flightClass,
    pricePerPerson: 356,
    included: true,
  };

  const mockReturnFlight: Flight = {
    id: generateId(),
    airline: "SkyWings Airlines",
    flightNumber: "SW321",
    origin: destinationCity,
    originCode: "TOK",
    destination: departureCity,
    destinationCode: "PAR",
    departureTime: "18:30",
    arrivalTime: "22:00",
    duration: "11h 30m",
    class: flightClass,
    pricePerPerson: 378,
    included: true,
  };

  const mockCarRental: CarRental | null = includeCarRental ? {
    id: generateId(),
    company: "EuroMobility",
    vehicleType: "SUV",
    vehicleName: "Volkswagen Tiguan or similar",
    pickupLocation: "Tokyo Narita Airport (NRT)",
    dropoffLocation: "Tokyo Narita Airport (NRT)",
    pickupTime: new Date(departureDate!).toISOString(),
    dropoffTime: new Date(returnDate!).toISOString(),
    pricePerDay: 80,
    totalPrice: 520, // Example total for 6.5 days
    included: true,
  } : null;

  const mockHotel: Hotel | null = includeHotel ? {
    id: generateId(),
    name: "Grand Hyatt Tokyo",
    rating: 4.5,
    address: "Roppongi Hills, 6-10-3 Roppongi, Minato City, Tokyo 106-0032, Japan",
    distanceFromAirport: "60km",
    pricePerNight: 250,
    totalPrice: 1750, // Example total for 7 nights
    amenities: ["Free WiFi", "Pool", "Spa", "Fitness Center"],
    included: true,
  } : null;

  const mockItinerary: DayItinerary[] = [
    {
      day: 1,
      date: departureDate ? format(departureDate, "yyyy-MM-dd") : "",
      items: [
        {
          id: generateId(),
          time: "15:00",
          title: "Check-in at Grand Hyatt Tokyo",
          description: "Settle into your luxurious accommodation in the heart of Roppongi.",
          type: "hotel",
          included: true,
          imageUrl: "https://example.com/grand-hyatt-tokyo.jpg",
          bookingUrl: "https://www.hyatt.com/en-US/hotel/japan/grand-hyatt-tokyo/tyogh",
        },
        {
          id: generateId( ),
          time: "19:00",
          title: "Dinner at Gonpachi Nishiazabu",
          description: "Enjoy traditional Japanese cuisine in a vibrant atmosphere, famous for its appearance in \"Kill Bill.\"",
          type: "meal",
          cost: 70,
          included: true,
          imageUrl: "https://example.com/gonpachi.jpg",
          bookingUrl: "https://gonpachi.jp/nishiazabu/",
        },
      ],
    },
    {
      day: 2,
      date: departureDate ? format(addDays(departureDate, 1 ), "yyyy-MM-dd") : "",
      items: [
        {
          id: generateId(),
          time: "09:00",
          title: "Visit Meiji Jingu Shrine",
          description: "Explore the serene Shinto shrine dedicated to Emperor Meiji and Empress Shoken.",
          type: "attraction",
          included: true,
          imageUrl: "https://example.com/meiji-jingu.jpg",
          bookingUrl: "https://www.meijijingu.or.jp/en/",
        },
        {
          id: generateId( ),
          time: "12:00",
          title: "Lunch in Harajuku",
          description: "Experience the unique fashion and culture of Takeshita Street.",
          type: "meal",
          cost: 30,
          included: true,
          imageUrl: "https://example.com/harajuku-lunch.jpg",
          bookingUrl: "",
        },
        {
          id: generateId( ),
          time: "15:00",
          title: "Shibuya Crossing & Hachiko Statue",
          description: "Witness the iconic scramble crossing and visit the loyal dog Hachiko statue.",
          type: "attraction",
          included: true,
          imageUrl: "https://example.com/shibuya-crossing.jpg",
          bookingUrl: "",
        },
      ],
    },
    {
      day: 3,
      date: departureDate ? format(addDays(departureDate, 2 ), "yyyy-MM-dd") : "",
      items: [
        {
          id: generateId(),
          time: "09:30",
          title: "Explore Asakusa and Senso-ji Temple",
          description: "Tokyo's oldest temple, with Nakamise-dori market leading up to it.",
          type: "attraction",
          included: true,
          imageUrl: "https://example.com/sensoji-temple.jpg",
          bookingUrl: "",
        },
        {
          id: generateId( ),
          time: "13:00",
          title: "Sumida River Cruise",
          description: "Enjoy views of the Tokyo Skytree and other landmarks from the water.",
          type: "attraction",
          cost: 20,
          included: true,
          imageUrl: "https://example.com/sumida-river-cruise.jpg",
          bookingUrl: "https://www.suijobus.co.jp/en/",
        },
        {
          id: generateId( ),
          time: "18:00",
          title: "Dinner in Ginza",
          description: "Dine in Tokyo's upscale shopping district.",
          type: "meal",
          cost: 80,
          included: true,
          imageUrl: "https://example.com/ginza-dinner.jpg",
          bookingUrl: "",
        },
      ],
    },
    {
      day: 4,
      date: departureDate ? format(addDays(departureDate, 3 ), "yyyy-MM-dd") : "",
      items: [
        {
          id: generateId(),
          time: "08:00",
          title: "Day Trip to Hakone",
          description: "Scenic views of Mount Fuji, Hakone Open-Air Museum, and a cruise on Lake Ashi.",
          type: "attraction",
          cost: 100,
          included: true,
          imageUrl: "https://example.com/hakone.jpg",
          bookingUrl: "https://www.hakone-japan.com/",
        },
        {
          id: generateId( ),
          time: "19:00",
          title: "Return to Tokyo, Dinner at local izakaya",
          description: "Experience casual Japanese dining with small dishes and drinks.",
          type: "meal",
          cost: 40,
          included: true,
          imageUrl: "https://example.com/izakaya.jpg",
          bookingUrl: "",
        },
      ],
    },
    {
      day: 5,
      date: departureDate ? format(addDays(departureDate, 4 ), "yyyy-MM-dd") : "",
      items: [
        {
          id: generateId(),
          time: "10:00",
          title: "Ghibli Museum (requires advance booking)",
          description: "Immerse yourself in the world of Studio Ghibli. Book tickets well in advance!",
          type: "attraction",
          cost: 10,
          included: true,
          imageUrl: "https://example.com/ghibli-museum.jpg",
          bookingUrl: "https://www.ghibli-museum.jp/en/",
        },
        {
          id: generateId( ),
          time: "14:00",
          title: "Explore Kichijoji",
          description: "Enjoy shopping and cafes around Kichijoji, near the Ghibli Museum.",
          type: "attraction",
          included: true,
          imageUrl: "https://example.com/kichijoji.jpg",
          bookingUrl: "",
        },
        {
          id: generateId( ),
          time: "19:00",
          title: "Farewell Dinner in Shinjuku",
          description: "Enjoy panoramic city views from a skyscraper restaurant.",
          type: "meal",
          cost: 90,
          included: true,
          imageUrl: "https://example.com/shinjuku-dinner.jpg",
          bookingUrl: "",
        },
      ],
    },
    {
      day: 6,
      date: departureDate ? format(addDays(departureDate, 5 ), "yyyy-MM-dd") : "",
      items: [
        {
          id: generateId(),
          time: "10:00",
          title: "Free time for last-minute souvenir shopping",
          description: "Explore local markets or revisit favorite spots.",
          type: "rest",
          included: true,
          imageUrl: "https://example.com/souvenir-shopping.jpg",
          bookingUrl: "",
        },
        {
          id: generateId( ),
          time: "14:00",
          title: "Depart from Tokyo Narita Airport (NRT)",
          description: "Head to the airport for your return flight.",
          type: "flight",
          included: true,
          imageUrl: "https://example.com/narita-airport.jpg",
          bookingUrl: "",
        },
      ],
    },
  ];

  const totalCost = (
    (mockOutboundFlight.included ? mockOutboundFlight.pricePerPerson * numTravelers : 0 ) +
    (mockReturnFlight.included ? mockReturnFlight.pricePerPerson * numTravelers : 0) +
    (mockCarRental?.included ? mockCarRental.totalPrice : 0) +
    (mockHotel?.included ? mockHotel.totalPrice : 0) +
    mockItinerary.reduce((sum, day) => sum + day.items.reduce((daySum, item) => daySum + (item.included && item.cost ? item.cost * numTravelers : 0), 0), 0)
  );

  return {
    outboundFlight: mockOutboundFlight,
    returnFlight: mockReturnFlight,
    carRental: mockCarRental,
    hotel: mockHotel,
    itinerary: mockItinerary,
    totalCost: totalCost,
  };
};
