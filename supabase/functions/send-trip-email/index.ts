import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Best Holiday Plan <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Resend API error: ${error}`);
  }
  
  return res.json();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper function to generate Google Maps link
function getGoogleMapsLink(query: string, lat?: number | null, lon?: number | null): string {
  if (lat && lon) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// Format currency
function formatCurrency(amount: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface TripEmailRequest {
  tripId: string;
  email: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tripId, email }: TripEmailRequest = await req.json();

    if (!tripId || !email) {
      return new Response(
        JSON.stringify({ error: "tripId and email are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch trip data
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      console.error("Trip fetch error:", tripError);
      return new Response(
        JSON.stringify({ error: "Trip not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
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

    const items = tripItems || [];

    // Calculate total cost
    let totalCost = 0;
    const passengerCount = trip.adults + trip.children + trip.infants;
    
    items.forEach((item: any) => {
      if (item.included) {
        if (item.item_type === "flight") {
          totalCost += item.cost * passengerCount;
        } else if (item.item_type === "hotel" || item.item_type === "car") {
          totalCost += item.cost;
        } else {
          totalCost += item.cost * passengerCount;
        }
      }
    });

    // Separate items by type
    const flights = items.filter((item: any) => item.item_type === "flight" && item.included);
    const hotels = items.filter((item: any) => item.item_type === "hotel" && item.included);
    const cars = items.filter((item: any) => item.item_type === "car" && item.included);
    const activities = items.filter((item: any) => 
      ["activity", "attraction"].includes(item.item_type) && item.included
    );

    // Group activities by day
    const activitiesByDay: Record<number, any[]> = {};
    activities.forEach((item: any) => {
      const day = item.day_number || 1;
      if (!activitiesByDay[day]) {
        activitiesByDay[day] = [];
      }
      activitiesByDay[day].push(item);
    });

    // Build HTML email
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Trip Itinerary</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px; font-weight: 600;">Your Trip Itinerary</h1>
      <p style="color: #d4af37; margin: 0; font-size: 20px; font-weight: 500;">
        ${trip.origin_city} → ${trip.destination_city}
      </p>
    </div>

    <!-- Trip Summary -->
    <div style="padding: 30px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">Departure:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formatDate(trip.departure_date)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">Return:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formatDate(trip.return_date)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">Travelers:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 500;">
            ${trip.adults} adult${trip.adults !== 1 ? "s" : ""}${trip.children > 0 ? `, ${trip.children} child${trip.children !== 1 ? "ren" : ""}` : ""}${trip.infants > 0 ? `, ${trip.infants} infant${trip.infants !== 1 ? "s" : ""}` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">Flight Class:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 500; text-transform: capitalize;">${trip.flight_class}</td>
        </tr>
      </table>
      <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #d4af37; text-align: center;">
        <p style="margin: 0; color: #6c757d; font-size: 14px;">Estimated Total</p>
        <p style="margin: 5px 0 0 0; color: #1e3a5f; font-size: 32px; font-weight: 700;">${formatCurrency(totalCost)}</p>
      </div>
    </div>

    <!-- Flights Section -->
    ${flights.length > 0 ? `
    <div style="padding: 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1e3a5f; font-size: 20px; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">
        ✈️ Flights
      </h2>
      ${flights.map((flight: any) => `
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px;">${flight.name}</p>
          ${flight.description ? `<p style="margin: 0 0 8px 0; color: #6c757d; font-size: 14px;">${flight.description}</p>` : ""}
          <p style="margin: 0; font-weight: 500; color: #1e3a5f;">${formatCurrency(flight.cost * passengerCount)}</p>
        </div>
      `).join("")}
    </div>
    ` : ""}

    <!-- Hotel Section -->
    ${hotels.length > 0 ? `
    <div style="padding: 30px; background-color: #f8f9fa;">
      <h2 style="margin: 0 0 20px 0; color: #1e3a5f; font-size: 20px; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">
        🏨 Accommodation
      </h2>
      ${hotels.map((hotel: any) => `
        <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
          ${hotel.image_url ? `
            <div style="margin-bottom: 15px;">
              <img src="${hotel.image_url}" alt="${hotel.name}" style="width: 100%; max-width: 560px; height: auto; border-radius: 8px; display: block;" />
            </div>
          ` : ""}
          <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px;">${hotel.name}</p>
          ${hotel.description ? `<p style="margin: 0 0 8px 0; color: #6c757d; font-size: 14px;">${hotel.description}</p>` : ""}
          <p style="margin: 0 0 8px 0; font-weight: 500; color: #1e3a5f;">${formatCurrency(hotel.cost)}</p>
          <a href="${getGoogleMapsLink(hotel.name + ' ' + trip.destination_city, hotel.lat, hotel.lon)}" style="color: #2563eb; font-size: 12px; text-decoration: none;">📍 View on Map</a>
        </div>
      `).join("")}
    </div>
    ` : ""}

    <!-- Car Rental Section -->
    ${cars.length > 0 ? `
    <div style="padding: 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1e3a5f; font-size: 20px; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">
        🚗 Car Rental
      </h2>
      ${cars.map((car: any) => `
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px;">${car.name}</p>
          ${car.description ? `<p style="margin: 0 0 8px 0; color: #6c757d; font-size: 14px;">${car.description}</p>` : ""}
          <p style="margin: 0; font-weight: 500; color: #1e3a5f;">${formatCurrency(car.cost)}</p>
        </div>
      `).join("")}
    </div>
    ` : ""}

    <!-- Daily Itinerary Section -->
    ${Object.keys(activitiesByDay).length > 0 ? `
    <div style="padding: 30px; background-color: #f8f9fa;">
      <h2 style="margin: 0 0 20px 0; color: #1e3a5f; font-size: 20px; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">
        📅 Daily Itinerary
      </h2>
      ${Object.entries(activitiesByDay).sort(([a], [b]) => Number(a) - Number(b)).map(([day, dayItems]) => `
        <div style="margin-bottom: 25px;">
          <h3 style="margin: 0 0 15px 0; color: #1e3a5f; font-size: 16px; font-weight: 600;">
            Day ${day}
          </h3>
          ${(dayItems as any[]).map((item: any) => `
            <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 12px; border-left: 4px solid #d4af37;">
              ${item.image_url ? `
                <div style="margin-bottom: 12px;">
                  <img src="${item.image_url}" alt="${item.name}" style="width: 100%; max-width: 520px; height: auto; border-radius: 8px; display: block;" />
                </div>
              ` : ""}
              <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 15px;">${item.name}</p>
              ${item.start_time ? `<p style="margin: 0 0 6px 0; color: #6c757d; font-size: 13px;">🕐 ${item.start_time}</p>` : ""}
              ${item.description ? `<p style="margin: 0 0 10px 0; color: #6c757d; font-size: 14px;">${item.description}</p>` : ""}
              <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                ${item.cost > 0 ? `<span style="font-weight: 500; color: #1e3a5f;">${formatCurrency(item.cost * passengerCount)}</span>` : ""}
                <a href="${getGoogleMapsLink(item.name + ' ' + trip.destination_city, item.lat, item.lon)}" style="color: #2563eb; font-size: 12px; text-decoration: none;">📍 View on Map</a>
                ${item.booking_url ? `<a href="${item.booking_url}" style="color: #2563eb; font-size: 12px; text-decoration: none;">🔗 Book Now</a>` : ""}
              </div>
            </div>
          `).join("")}
        </div>
      `).join("")}
    </div>
    ` : ""}

    <!-- Footer -->
    <div style="padding: 30px; background-color: #1e3a5f; text-align: center;">
      <p style="margin: 0 0 10px 0; color: #d4af37; font-size: 16px; font-weight: 500;">Best Holiday Plan</p>
      <p style="margin: 0; color: #a0aec0; font-size: 13px;">
        Your journey, thoughtfully orchestrated.
      </p>
    </div>

  </div>
</body>
</html>
    `;

    // Send email
    const emailResponse = await sendEmail(
      email,
      `Your Trip Itinerary: ${trip.origin_city} → ${trip.destination_city}`,
      html
    );

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-trip-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
