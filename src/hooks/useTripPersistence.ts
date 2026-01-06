import { supabase } from "@/integrations/supabase/client";
import type { TripDetails, TripPlan, Flight, CarRental, Hotel } from "@/types/trip";
import type { Json } from "@/integrations/supabase/types";
import { format } from "date-fns";

interface SaveTripResult {
  tripId: string | null;
  error: Error | null;
}

export function useTripPersistence() {
  /**
   * Save trip to database. Credit deduction happens BEFORE this is called
   * in the form submission flow. This function purely handles persistence.
   */
  const saveTrip = async (
    userId: string,
    tripDetails: TripDetails,
    tripPlan: TripPlan
  ): Promise<SaveTripResult> => {
    try {
      // 1. Insert the trip record
      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .insert({
          user_id: userId,
          origin_city: tripDetails.departureCity,
          origin_iata_code: tripDetails.departureLocation?.iataCode || null,
          origin_airport_codes: tripDetails.departureLocation?.cityCode ? [tripDetails.departureLocation.cityCode] : null,
          origin_country: tripDetails.departureLocation?.countryName || null,
          origin_lat: tripDetails.departureLocation?.lat || null,
          origin_lon: tripDetails.departureLocation?.lon || null,
          destination_city: tripDetails.destinationCity,
          destination_iata_code: tripDetails.destinationLocation?.iataCode || null,
          destination_airport_codes: tripDetails.destinationLocation?.cityCode ? [tripDetails.destinationLocation.cityCode] : null,
          destination_country: tripDetails.destinationLocation?.countryName || null,
          destination_lat: tripDetails.destinationLocation?.lat || null,
          destination_lon: tripDetails.destinationLocation?.lon || null,
          departure_date: tripDetails.departureDate
            ? format(tripDetails.departureDate, "yyyy-MM-dd")
            : format(new Date(), "yyyy-MM-dd"),
          return_date: tripDetails.returnDate
            ? format(tripDetails.returnDate, "yyyy-MM-dd")
            : format(new Date(), "yyyy-MM-dd"),
          adults: tripDetails.passengers.adults,
          children: tripDetails.passengers.children,
          infants: tripDetails.passengers.infants,
          flight_class: tripDetails.flightClass,
          include_car: tripDetails.includeCarRental,
          include_hotel: tripDetails.includeHotel,
          status: "complete",
        })
        .select("id")
        .single();

      if (tripError) {
        console.error("Trip insert error:", tripError);
        throw tripError;
      }
      if (!tripData) throw new Error("Failed to create trip");

      const tripId = tripData.id;

      // 2. Prepare all trip items
      const tripItems: Array<{
        trip_id: string;
        item_type: string;
        name: string;
        description: string | null;
        cost: number;
        included: boolean;
        day_number: number | null;
        order_in_day: number | null;
        provider_data: Json | null;
      }> = [];

      // Add outbound flight
      if (tripPlan.outboundFlight) {
        tripItems.push(mapFlightToItem(tripId, tripPlan.outboundFlight, "outbound", 1, 0));
      }

      // Add return flight
      if (tripPlan.returnFlight) {
        const lastDay = tripPlan.itinerary.length || 1;
        tripItems.push(mapFlightToItem(tripId, tripPlan.returnFlight, "return", lastDay, 99));
      }

      // Add car rental
      if (tripPlan.carRental) {
        tripItems.push(mapCarRentalToItem(tripId, tripPlan.carRental));
      }

      // Add hotel
      if (tripPlan.hotel) {
        tripItems.push(mapHotelToItem(tripId, tripPlan.hotel));
      }

      // Add itinerary activities
      tripPlan.itinerary.forEach((day) => {
        day.items.forEach((item, idx) => {
          tripItems.push({
            trip_id: tripId,
            item_type: item.type === "attraction" ? "activity" : item.type,
            name: item.title,
            description: item.description,
            cost: item.cost || 0,
            included: item.included,
            day_number: day.day,
            order_in_day: idx,
            provider_data: {
              time: item.time,
              distance: item.distance || null,
              duration: item.duration || null,
              originalType: item.type,
            } as Json,
          });
        });
      });

      // 3. Insert all trip items
      if (tripItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("trip_items")
          .insert(tripItems);

        if (itemsError) {
          console.error("Trip items insert error:", itemsError);
          throw itemsError;
        }
      }

      console.log(`Trip ${tripId} saved with ${tripItems.length} items`);
      return { tripId, error: null };
    } catch (error) {
      console.error("Error saving trip:", error);
      return { tripId: null, error: error as Error };
    }
  };

  return { saveTrip };
}

function mapFlightToItem(
  tripId: string,
  flight: Flight,
  direction: "outbound" | "return",
  dayNumber: number,
  orderInDay: number
) {
  return {
    trip_id: tripId,
    item_type: "flight" as const,
    name: `${flight.airline} ${flight.flightNumber} (${direction})`,
    description: `${flight.origin} (${flight.originCode}) → ${flight.destination} (${flight.destinationCode})`,
    cost: flight.pricePerPerson,
    included: flight.included,
    day_number: dayNumber,
    order_in_day: orderInDay,
    provider_data: {
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      origin: flight.origin,
      originCode: flight.originCode,
      destination: flight.destination,
      destinationCode: flight.destinationCode,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      duration: flight.duration,
      class: flight.class,
      direction,
    } as Json,
  };
}

function mapCarRentalToItem(tripId: string, car: CarRental) {
  return {
    trip_id: tripId,
    item_type: "car" as const,
    name: `${car.company} - ${car.vehicleName}`,
    description: `${car.vehicleType} | Pickup: ${car.pickupLocation}`,
    cost: car.totalPrice,
    included: car.included,
    day_number: null,
    order_in_day: null,
    provider_data: {
      company: car.company,
      vehicleType: car.vehicleType,
      vehicleName: car.vehicleName,
      pickupLocation: car.pickupLocation,
      dropoffLocation: car.dropoffLocation,
      pickupTime: car.pickupTime,
      dropoffTime: car.dropoffTime,
      pricePerDay: car.pricePerDay,
    } as Json,
  };
}

function mapHotelToItem(tripId: string, hotel: Hotel) {
  return {
    trip_id: tripId,
    item_type: "hotel" as const,
    name: hotel.name,
    description: `${hotel.rating}★ | ${hotel.address}`,
    cost: hotel.totalPrice,
    included: hotel.included,
    day_number: null,
    order_in_day: null,
    provider_data: {
      rating: hotel.rating,
      address: hotel.address,
      distanceFromAirport: hotel.distanceFromAirport,
      pricePerNight: hotel.pricePerNight,
      amenities: hotel.amenities,
    } as Json,
  };
}
