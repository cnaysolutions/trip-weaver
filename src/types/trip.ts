export interface Passenger {
  adults: number;
  children: number;
  infants: number;
}

export type FlightClass = "economy" | "business" | "first";

export interface TripDetails {
  departureCity: string;
  destinationCity: string;
  departureDate: Date | null;
  returnDate: Date | null;
  passengers: Passenger;
  flightClass: FlightClass;
  includeCarRental: boolean;
  includeHotel: boolean;
}

export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  class: FlightClass;
  pricePerPerson: number;
  included: boolean;
}

export interface CarRental {
  id: string;
  company: string;
  vehicleType: string;
  vehicleName: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupTime: string;
  dropoffTime: string;
  pricePerDay: number;
  totalPrice: number;
  included: boolean;
}

export interface Hotel {
  id: string;
  name: string;
  rating: number;
  address: string;
  distanceFromAirport: string;
  pricePerNight: number;
  totalPrice: number;
  amenities: string[];
  included: boolean;
}

export interface ItineraryItem {
  id: string;
  time: string;
  title: string;
  description: string;
  type: "flight" | "transport" | "hotel" | "meal" | "attraction" | "rest";
  distance?: string;
  duration?: string;
  cost?: number;
  included: boolean;
}

export interface DayItinerary {
  day: number;
  date: string;
  items: ItineraryItem[];
}

export interface TripPlan {
  outboundFlight: Flight | null;
  returnFlight: Flight | null;
  carRental: CarRental | null;
  hotel: Hotel | null;
  itinerary: DayItinerary[];
  totalCost: number;
}
