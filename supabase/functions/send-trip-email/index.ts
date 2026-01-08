import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TripEmailRequest {
  tripId: string;
  email: string;
}

interface TripItem {
  id: string;
  name: string;
  item_type: string;
  cost: number;
  currency: string;
  included: boolean;
  description?: string;
  day_number?: number;
  start_time?: string;
  end_time?: string;
  image_url?: string;
  booking_url?: string;
}

interface Trip {
  id: string;
  origin_city: string;
  destination_city: string;
  destination_country?: string;
  departure_date: string;
  return_date: string;
  adults: number;
  children: number;
  infants: number;
  flight_class: string;
  include_car: boolean;
  include_hotel: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email;

    const { tripId, email }: TripEmailRequest = await req.json();

    if (!tripId || !email) {
      return new Response(
        JSON.stringify({ error: "tripId and email are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Security: Ensure user can only send to their own email
    if (email !== userEmail) {
      return new Response(
        JSON.stringify({ error: "You can only send emails to your own email address" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch trip data
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .eq("user_id", userId)
      .single();

    if (tripError || !trip) {
      console.error("Trip fetch error:", tripError);
      return new Response(
        JSON.stringify({ error: "Trip not found or access denied" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch trip items
    const { data: tripItems, error: itemsError } = await supabase
      .from("trip_items")
      .select("*")
      .eq("trip_id", tripId)
      .order("day_number", { ascending: true })
      .order("order_in_day", { ascending: true });

    if (itemsError) {
      console.error("Trip items fetch error:", itemsError);
    }

    // Always show full details (no preview mode)
    const isPreview = false;

    // Generate email HTML
    const emailHtml = generateEmailHtml(trip as Trip, (tripItems || []) as TripItem[], isPreview);

    const emailResponse = await resend.emails.send({
      from: "TripWeave <onboarding@resend.dev>",
      to: [email],
      subject: `Your Trip to ${trip.destination_city} - TripWeave Itinerary`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, ...emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in send-trip-email function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

function generateEmailHtml(trip: Trip, tripItems: TripItem[], isPreview: boolean): string {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  // Group items by type
  const flights = tripItems.filter((item) => item.item_type === "flight" && item.included);
  const hotels = tripItems.filter((item) => item.item_type === "hotel" && item.included);
  const cars = tripItems.filter((item) => item.item_type === "car" && item.included);
  const activities = tripItems.filter((item) => item.item_type === "activity" && item.included);

  // Calculate totals
  const includedItems = tripItems.filter((item) => item.included);
  const totalCost = includedItems.reduce((sum, item) => sum + (item.cost || 0), 0);
  const currency = includedItems[0]?.currency || "USD";

  // Group activities by day
  const activitiesByDay: Record<number, TripItem[]> = {};
  activities.forEach((activity) => {
    const day = activity.day_number || 1;
    if (!activitiesByDay[day]) {
      activitiesByDay[day] = [];
    }
    activitiesByDay[day].push(activity);
  });

  const passengerCount = trip.adults + trip.children + trip.infants;
  const passengerText = `${trip.adults} adult${trip.adults !== 1 ? "s" : ""}${
    trip.children > 0 ? `, ${trip.children} child${trip.children !== 1 ? "ren" : ""}` : ""
  }${trip.infants > 0 ? `, ${trip.infants} infant${trip.infants !== 1 ? "s" : ""}` : ""}`;

  const previewBanner = isPreview
    ? `
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 16px 24px; text-align: center; margin-bottom: 24px; border-radius: 8px;">
      <strong>✨ Preview Mode</strong> - Upgrade to unlock full trip details and booking links
    </div>
  `
    : "";

  const flightsSection =
    flights.length > 0
      ? `
    <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <h2 style="color: #1e3a5f; margin: 0 0 16px 0; font-size: 20px; display: flex; align-items: center; gap: 8px;">
        ✈️ Flights
      </h2>
      ${flights
        .map(
          (flight) => `
        <div style="border-left: 3px solid #3b82f6; padding-left: 16px; margin-bottom: 16px;">
          <div style="font-weight: 600; color: #1e3a5f;">${flight.name}</div>
          ${flight.description ? `<div style="color: #64748b; font-size: 14px; margin-top: 4px;">${flight.description}</div>` : ""}
          <div style="color: #059669; font-weight: 600; margin-top: 8px;">${formatCurrency(flight.cost, flight.currency)}</div>
        </div>
      `
        )
        .join("")}
    </div>
  `
      : isPreview
        ? `
    <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <h2 style="color: #1e3a5f; margin: 0 0 16px 0; font-size: 20px;">✈️ Flights</h2>
      <div style="background: #fef3c7; border: 1px dashed #f59e0b; border-radius: 8px; padding: 16px; text-align: center; color: #92400e;">
        Preview – upgrade to unlock full flight details
      </div>
    </div>
  `
        : "";

  const hotelsSection =
    hotels.length > 0
      ? `
    <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <h2 style="color: #1e3a5f; margin: 0 0 16px 0; font-size: 20px;">🏨 Accommodation</h2>
      ${hotels
        .map(
          (hotel) => `
        <div style="border-left: 3px solid #8b5cf6; padding-left: 16px; margin-bottom: 16px;">
          <div style="font-weight: 600; color: #1e3a5f;">${hotel.name}</div>
          ${hotel.description ? `<div style="color: #64748b; font-size: 14px; margin-top: 4px;">${hotel.description}</div>` : ""}
          <div style="color: #059669; font-weight: 600; margin-top: 8px;">${formatCurrency(hotel.cost, hotel.currency)}</div>
        </div>
      `
        )
        .join("")}
    </div>
  `
      : isPreview
        ? `
    <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <h2 style="color: #1e3a5f; margin: 0 0 16px 0; font-size: 20px;">🏨 Accommodation</h2>
      <div style="background: #fef3c7; border: 1px dashed #f59e0b; border-radius: 8px; padding: 16px; text-align: center; color: #92400e;">
        Preview – upgrade to unlock hotel recommendations
      </div>
    </div>
  `
        : "";

  const carsSection =
    cars.length > 0
      ? `
    <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <h2 style="color: #1e3a5f; margin: 0 0 16px 0; font-size: 20px;">🚗 Car Rental</h2>
      ${cars
        .map(
          (car) => `
        <div style="border-left: 3px solid #10b981; padding-left: 16px; margin-bottom: 16px;">
          <div style="font-weight: 600; color: #1e3a5f;">${car.name}</div>
          ${car.description ? `<div style="color: #64748b; font-size: 14px; margin-top: 4px;">${car.description}</div>` : ""}
          <div style="color: #059669; font-weight: 600; margin-top: 8px;">${formatCurrency(car.cost, car.currency)}</div>
        </div>
      `
        )
        .join("")}
    </div>
  `
      : "";

  const activitiesSection =
    Object.keys(activitiesByDay).length > 0
      ? `
    <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <h2 style="color: #1e3a5f; margin: 0 0 16px 0; font-size: 20px;">🎯 Daily Itinerary</h2>
      ${Object.entries(activitiesByDay)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(
          ([day, dayActivities]) => `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #475569; font-size: 16px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
            Day ${day}
          </h3>
          ${dayActivities
            .map(
              (activity) => `
            <div style="border-left: 3px solid #f59e0b; padding-left: 16px; margin-bottom: 12px;">
              <div style="font-weight: 600; color: #1e3a5f;">${activity.name}</div>
              ${activity.start_time ? `<div style="color: #64748b; font-size: 13px;">⏰ ${activity.start_time}${activity.end_time ? ` - ${activity.end_time}` : ""}</div>` : ""}
              ${activity.description ? `<div style="color: #64748b; font-size: 14px; margin-top: 4px;">${activity.description}</div>` : ""}
              ${activity.cost > 0 ? `<div style="color: #059669; font-weight: 600; margin-top: 8px;">${formatCurrency(activity.cost, activity.currency)}</div>` : ""}
            </div>
          `
            )
            .join("")}
        </div>
      `
        )
        .join("")}
    </div>
  `
      : isPreview
        ? `
    <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <h2 style="color: #1e3a5f; margin: 0 0 16px 0; font-size: 20px;">🎯 Daily Itinerary</h2>
      <div style="background: #fef3c7; border: 1px dashed #f59e0b; border-radius: 8px; padding: 16px; text-align: center; color: #92400e;">
        Preview – upgrade to unlock your personalized daily itinerary
      </div>
    </div>
  `
        : "";

  const totalSection = `
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; color: white;">
      <h2 style="margin: 0 0 16px 0; font-size: 20px;">💰 Trip Summary</h2>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 14px; opacity: 0.8;">Estimated Total Cost</div>
          <div style="font-size: 28px; font-weight: 700;">${formatCurrency(totalCost, currency)}</div>
        </div>
        <div style="text-align: right; font-size: 14px; opacity: 0.8;">
          ${includedItems.length} items included
        </div>
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Trip to ${trip.destination_city}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: white; margin: 0 0 8px 0; font-size: 28px;">✨ TripWeave</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 16px;">Your Personalized Trip Itinerary</p>
        </div>

        ${previewBanner}

        <!-- Trip Overview -->
        <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h2 style="color: #1e3a5f; margin: 0 0 16px 0; font-size: 24px;">
            ${trip.origin_city} → ${trip.destination_city}${trip.destination_country ? `, ${trip.destination_country}` : ""}
          </h2>
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #64748b;">📅</span>
              <span style="color: #475569;">${formatDate(trip.departure_date)} - ${formatDate(trip.return_date)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #64748b;">👥</span>
              <span style="color: #475569;">${passengerText}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #64748b;">💺</span>
              <span style="color: #475569;">${trip.flight_class.charAt(0).toUpperCase() + trip.flight_class.slice(1)} Class</span>
            </div>
          </div>
        </div>

        ${flightsSection}
        ${hotelsSection}
        ${carsSection}
        ${activitiesSection}
        ${totalSection}

        <!-- Footer -->
        <div style="text-align: center; color: #64748b; font-size: 14px; padding: 24px;">
          <p style="margin: 0 0 8px 0;">This itinerary was generated by TripWeave</p>
          <p style="margin: 0;">Prices are estimates and may vary at time of booking</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
