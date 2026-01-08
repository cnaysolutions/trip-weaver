import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmailViaResend(payload: {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return res.json();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Authenticate user and return their email - ensures users can only send to their own email
async function authenticateUser(req: Request): Promise<{ userId: string; email: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return {
    userId: data.user.id,
    email: data.user.email || "",
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function getGoogleMapsLink(query: string, lat?: number, lon?: number): string {
  if (lat && lon) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

interface TripRecord {
  id: string;
  origin_city: string;
  destination_city: string;
  departure_date: string;
  return_date: string;
  adults: number;
  children: number;
  infants: number;
  flight_class: string;
  include_car: boolean;
  include_hotel: boolean;
  origin_iata_code?: string;
  destination_iata_code?: string;
  destination_lat?: number;
  destination_lon?: number;
}

interface TripItem {
  id: string;
  item_type: string;
  name: string;
  description?: string;
  cost: number;
  included: boolean;
  day_number?: number;
  lat?: number;
  lon?: number;
  provider_data?: any;
  image_url?: string;
  booking_url?: string;
}

interface TripEmailRequest {
  email: string;
  trip: TripRecord;
  tripItems: TripItem[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function generateHtmlEmail(trip: TripRecord, tripItems: TripItem[]): string {
  const passengers = trip.adults + trip.children + trip.infants;
  const isPreview = false; // Always show full details - no preview mode

  // Organize items by type
  const flights = tripItems.filter((i) => i.item_type === "flight");
  const outboundFlight = flights.find((f) => (f.provider_data as any)?.direction === "outbound");
  const returnFlight = flights.find((f) => (f.provider_data as any)?.direction === "return");
  const carRental = tripItems.find((i) => i.item_type === "car");
  const hotel = tripItems.find((i) => i.item_type === "hotel");
  const activities = tripItems.filter((i) => i.item_type === "activity");

  // Group activities by day
  const dayMap: Record<number, TripItem[]> = {};
  activities.forEach((a) => {
    const day = a.day_number || 1;
    if (!dayMap[day]) dayMap[day] = [];
    dayMap[day].push(a);
  });
  const days = Object.keys(dayMap)
    .map(Number)
    .sort((a, b) => a - b);

  // Calculate total cost
  const totalCost = tripItems.filter((i) => i.included).reduce((sum, i) => sum + Number(i.cost || 0), 0);

  const previewBadge = `
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 12px 20px; border-radius: 8px; text-align: center; margin-bottom: 16px;">
      <strong>🔒 Preview Trip</strong> – Upgrade to unlock full details
    </div>
  `;

  const previewSection = `
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; text-align: center; color: #92400e;">
      <p style="margin: 0;">Preview – upgrade to unlock full details</p>
    </div>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your TripWeave Itinerary</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f5f0; color: #1a2744;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f5f0; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(26, 39, 68, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a2744 0%, #2d3c5a 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">TripWeave Itinerary</h1>
              <p style="margin: 16px 0 0; color: #c9a962; font-size: 22px; font-weight: 500;">
                ${trip.origin_city} → ${trip.destination_city}
              </p>
            </td>
          </tr>

          <!-- Trip Summary -->
          <tr>
            <td style="padding: 32px;">
              ${isPreview ? previewBadge : ""}
              <div style="background: #f8f5f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%" style="padding: 8px 0;">
                      <div style="font-size: 12px; color: #666; margin-bottom: 4px;">DEPARTURE</div>
                      <div style="font-weight: 600;">${formatDate(trip.departure_date)}</div>
                    </td>
                    <td width="50%" style="padding: 8px 0;">
                      <div style="font-size: 12px; color: #666; margin-bottom: 4px;">RETURN</div>
                      <div style="font-weight: 600;">${formatDate(trip.return_date)}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <div style="font-size: 12px; color: #666; margin-bottom: 4px;">TRAVELERS</div>
                      <div style="font-weight: 600;">
                        ${trip.adults} Adult${trip.adults !== 1 ? "s" : ""}
                        ${trip.children > 0 ? `, ${trip.children} Child${trip.children !== 1 ? "ren" : ""}` : ""}
                        ${trip.infants > 0 ? `, ${trip.infants} Infant${trip.infants !== 1 ? "s" : ""}` : ""}
                      </div>
                    </td>
                    <td style="padding: 8px 0;">
                      <div style="font-size: 12px; color: #666; margin-bottom: 4px;">CLASS</div>
                      <div style="font-weight: 600; text-transform: capitalize;">${trip.flight_class}</div>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Flights Section -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; color: #1a2744; font-size: 18px; border-bottom: 2px solid #c9a962; padding-bottom: 8px;">✈️ Flights</h2>
              ${
                isPreview || flights.length === 0
                  ? previewSection
                  : `
                ${
                  outboundFlight
                    ? `
                <div style="background: #f8f5f0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                  <div style="font-size: 12px; color: #666; margin-bottom: 8px;">OUTBOUND</div>
                  <div style="font-size: 20px; font-weight: 600;">
                    ${(outboundFlight.provider_data as any)?.originCode || trip.origin_iata_code || ""} → ${(outboundFlight.provider_data as any)?.destinationCode || trip.destination_iata_code || ""}
                  </div>
                  <div style="color: #666; margin-top: 4px;">
                    ${(outboundFlight.provider_data as any)?.airline || "Airline"} • 
                    ${(outboundFlight.provider_data as any)?.departureTime || ""} - ${(outboundFlight.provider_data as any)?.arrivalTime || ""}
                  </div>
                  <div style="color: #c9a962; font-weight: 600; margin-top: 8px;">${formatCurrency(Number(outboundFlight.cost))}</div>
                  <a href="${getGoogleMapsLink(trip.origin_city + " Airport")}" style="color: #2563eb; font-size: 12px; display: inline-block; margin-top: 8px;">📍 View Departure Airport</a>
                </div>
                `
                    : ""
                }
                ${
                  returnFlight
                    ? `
                <div style="background: #f8f5f0; border-radius: 8px; padding: 16px;">
                  <div style="font-size: 12px; color: #666; margin-bottom: 8px;">RETURN</div>
                  <div style="font-size: 20px; font-weight: 600;">
                    ${(returnFlight.provider_data as any)?.originCode || trip.destination_iata_code || ""} → ${(returnFlight.provider_data as any)?.destinationCode || trip.origin_iata_code || ""}
                  </div>
                  <div style="color: #666; margin-top: 4px;">
                    ${(returnFlight.provider_data as any)?.airline || "Airline"} • 
                    ${(returnFlight.provider_data as any)?.departureTime || ""} - ${(returnFlight.provider_data as any)?.arrivalTime || ""}
                  </div>
                  <div style="color: #c9a962; font-weight: 600; margin-top: 8px;">${formatCurrency(Number(returnFlight.cost))}</div>
                  <a href="${getGoogleMapsLink(trip.destination_city + " Airport")}" style="color: #2563eb; font-size: 12px; display: inline-block; margin-top: 8px;">📍 View Departure Airport</a>
                </div>
                `
                    : ""
                }
              `
              }
            </td>
          </tr>

          <!-- Hotel Section -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; color: #1a2744; font-size: 18px; border-bottom: 2px solid #c9a962; padding-bottom: 8px;">🏨 Accommodation</h2>
              ${
                isPreview || !hotel
                  ? previewSection
                  : `
                <div style="background: #f8f5f0; border-radius: 8px; padding: 16px;">
                  <div style="font-size: 18px; font-weight: 600;">${hotel.name}</div>
                  ${hotel.description ? `<div style="color: #666; margin-top: 4px; font-size: 14px;">${hotel.description}</div>` : ""}
                  <div style="color: #c9a962; font-weight: 600; margin-top: 8px;">${formatCurrency(Number(hotel.cost))} total</div>
                  <a href="${getGoogleMapsLink(hotel.name + " " + trip.destination_city, hotel.lat, hotel.lon)}" style="color: #2563eb; font-size: 12px; display: inline-block; margin-top: 8px;">📍 View on Google Maps</a>
                  ${hotel.booking_url ? `<br><a href="${hotel.booking_url}" style="color: #2563eb; font-size: 12px; display: inline-block; margin-top: 4px;">🔗 Book Now</a>` : ""}
                </div>
              `
              }
            </td>
          </tr>

          <!-- Car Rental Section -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; color: #1a2744; font-size: 18px; border-bottom: 2px solid #c9a962; padding-bottom: 8px;">🚗 Car Rental</h2>
              ${
                isPreview || !carRental
                  ? previewSection
                  : `
                <div style="background: #f8f5f0; border-radius: 8px; padding: 16px;">
                  <div style="font-size: 18px; font-weight: 600;">${carRental.name}</div>
                  ${carRental.description ? `<div style="color: #666; margin-top: 4px; font-size: 14px;">${carRental.description}</div>` : ""}
                  <div style="color: #c9a962; font-weight: 600; margin-top: 8px;">${formatCurrency(Number(carRental.cost))}</div>
                  <a href="${getGoogleMapsLink(trip.destination_city + " Airport Car Rental")}" style="color: #2563eb; font-size: 12px; display: inline-block; margin-top: 8px;">📍 Pickup Location</a>
                </div>
              `
              }
            </td>
          </tr>

          <!-- Daily Itinerary Section -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; color: #1a2744; font-size: 18px; border-bottom: 2px solid #c9a962; padding-bottom: 8px;">📅 Daily Itinerary</h2>
              ${
                isPreview || days.length === 0
                  ? previewSection
                  : `
                ${days
                  .map(
                    (dayNum) => `
                  <div style="margin-bottom: 20px;">
                    <div style="font-weight: 600; color: #1a2744; margin-bottom: 12px; background: #e8e4de; padding: 8px 12px; border-radius: 6px;">Day ${dayNum}</div>
                    ${dayMap[dayNum]
                      .filter((item) => item.included)
                      .map(
                        (item) => `
                      <div style="padding: 12px 0; border-bottom: 1px solid #eee;">
                        <div style="display: flex; align-items: flex-start;">
                          <span style="color: #c9a962; font-weight: 500; min-width: 60px;">${(item.provider_data as any)?.time || "09:00"}</span>
                          <div style="flex: 1;">
                            <div style="font-weight: 500;">${item.name}</div>
                            ${item.description ? `<div style="color: #666; font-size: 13px; margin-top: 4px;">${item.description.substring(0, 100)}${item.description.length > 100 ? "..." : ""}</div>` : ""}
                            <div style="margin-top: 8px;">
                              <a href="${getGoogleMapsLink(item.name + " " + trip.destination_city, item.lat, item.lon)}" style="color: #2563eb; font-size: 12px;">📍 View on Map</a>
                              ${item.booking_url ? `<a href="${item.booking_url}" style="color: #2563eb; font-size: 12px; margin-left: 12px;">🔗 Book</a>` : ""}
                            </div>
                          </div>
                          ${item.cost ? `<span style="color: #666; font-size: 14px;">${formatCurrency(Number(item.cost))}</span>` : ""}
                        </div>
                      </div>
                    `,
                      )
                      .join("")}
                  </div>
                `,
                  )
                  .join("")}
              `
              }
            </td>
          </tr>

          <!-- Total -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a2744 0%, #2d3c5a 100%); padding: 32px; text-align: center;">
              <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 14px;">
                ${isPreview ? "PREVIEW TRIP" : `ESTIMATED TOTAL FOR ${passengers} TRAVELER${passengers !== 1 ? "S" : ""}`}
              </p>
              <p style="margin: 8px 0 0; color: #c9a962; font-size: 36px; font-weight: 600;">
                ${isPreview ? "Upgrade to see pricing" : formatCurrency(totalCost)}
              </p>
              ${isPreview ? `<a href="https://best-travel-plan.cloud/#pricing" style="display: inline-block; margin-top: 16px; background: #c9a962; color: #1a2744; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Buy Credits to Unlock</a>` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; text-align: center; color: #999; font-size: 12px;">
              <p style="margin: 0;">This itinerary was generated by TripWeave Concierge.</p>
              <p style="margin: 8px 0 0;">Prices are estimates and subject to change.</p>
              <p style="margin: 8px 0 0;">
                <a href="${getGoogleMapsLink(trip.destination_city)}" style="color: #2563eb;">📍 Explore ${trip.destination_city} on Google Maps</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user - required for all requests
    const authResult = await authenticateUser(req);
    if (!authResult) {
      return new Response(JSON.stringify({ error: "Unauthorized - valid authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const requestData: TripEmailRequest = await req.json();

    console.log("Received email request for trip:", requestData.trip?.id);
    console.log("Trip items count:", requestData.tripItems?.length || 0);
    console.log("Authenticated user:", authResult.userId);

    if (!requestData.trip) {
      return new Response(JSON.stringify({ error: "Missing trip data" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Security: Always send to the authenticated user's email, ignore any provided email
    const recipientEmail = authResult.email;
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "User has no verified email address" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const subject = `Your Trip: ${requestData.trip.origin_city} → ${requestData.trip.destination_city}`;
    const html = generateHtmlEmail(requestData.trip, requestData.tripItems || []);

    const emailResponse = await sendEmailViaResend({
      from: "Best Travel Plan <contacts@best-travel-plan.cloud>",
      to: [recipientEmail],
      subject,
      html,
    });

    console.log("Email sent successfully to:", recipientEmail, "id:", emailResponse.id);

    return new Response(JSON.stringify({ success: true, id: emailResponse.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: `Failed to send email: ${errorMessage}` }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
