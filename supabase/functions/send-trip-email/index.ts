import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(payload: { from: string; to: string[]; subject: string; html?: string; text?: string }) {
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

interface TripEmailRequest {
  email: string;
  format: "text" | "pdf";
  tripDetails: {
    departureCity: string;
    destinationCity: string;
    departureDate: string;
    returnDate: string;
    passengers: { adults: number; children: number; infants: number };
    flightClass: string;
  };
  tripPlan: {
    outboundFlight?: { airline: string; originCode: string; destinationCode: string; departureTime: string; arrivalTime: string; pricePerPerson: number; included: boolean };
    returnFlight?: { airline: string; originCode: string; destinationCode: string; departureTime: string; arrivalTime: string; pricePerPerson: number; included: boolean };
    carRental?: { vehicleName: string; company: string; totalPrice: number; included: boolean };
    hotel?: { name: string; pricePerNight: number; totalPrice: number; included: boolean };
    itinerary: Array<{ day: number; items: Array<{ title: string; time: string; cost?: number; included: boolean }> }>;
  };
  totalCost: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function generatePlainTextEmail(data: TripEmailRequest): string {
  const { tripDetails, tripPlan, totalCost } = data;
  const passengers = tripDetails.passengers.adults + tripDetails.passengers.children;
  
  let text = `
═══════════════════════════════════════════════════════════════
                    TRIPWEAVE ITINERARY
═══════════════════════════════════════════════════════════════

TRIP OVERVIEW
─────────────────────────────────────────────────────────────────
Route:          ${tripDetails.departureCity} → ${tripDetails.destinationCity}
Dates:          ${tripDetails.departureDate} - ${tripDetails.returnDate}
Passengers:     ${tripDetails.passengers.adults} Adult(s)${tripDetails.passengers.children > 0 ? `, ${tripDetails.passengers.children} Child(ren)` : ""}${tripDetails.passengers.infants > 0 ? `, ${tripDetails.passengers.infants} Infant(s)` : ""}
Class:          ${tripDetails.flightClass.charAt(0).toUpperCase() + tripDetails.flightClass.slice(1)}

`;

  // Flights
  if (tripPlan.outboundFlight || tripPlan.returnFlight) {
    text += `
FLIGHTS
─────────────────────────────────────────────────────────────────
`;
    if (tripPlan.outboundFlight && tripPlan.outboundFlight.included) {
      text += `Outbound:       ${tripPlan.outboundFlight.originCode} → ${tripPlan.outboundFlight.destinationCode}
                ${tripPlan.outboundFlight.airline}
                Departs: ${tripPlan.outboundFlight.departureTime} | Arrives: ${tripPlan.outboundFlight.arrivalTime}
                Cost: ${formatCurrency(tripPlan.outboundFlight.pricePerPerson * passengers)}

`;
    }
    if (tripPlan.returnFlight && tripPlan.returnFlight.included) {
      text += `Return:         ${tripPlan.returnFlight.originCode} → ${tripPlan.returnFlight.destinationCode}
                ${tripPlan.returnFlight.airline}
                Departs: ${tripPlan.returnFlight.departureTime} | Arrives: ${tripPlan.returnFlight.arrivalTime}
                Cost: ${formatCurrency(tripPlan.returnFlight.pricePerPerson * passengers)}

`;
    }
  }

  // Car Rental
  if (tripPlan.carRental && tripPlan.carRental.included) {
    text += `
CAR RENTAL
─────────────────────────────────────────────────────────────────
Vehicle:        ${tripPlan.carRental.vehicleName}
Company:        ${tripPlan.carRental.company}
Cost:           ${formatCurrency(tripPlan.carRental.totalPrice)}

`;
  }

  // Hotel
  if (tripPlan.hotel && tripPlan.hotel.included) {
    text += `
ACCOMMODATION
─────────────────────────────────────────────────────────────────
Hotel:          ${tripPlan.hotel.name}
Rate:           ${formatCurrency(tripPlan.hotel.pricePerNight)}/night
Total:          ${formatCurrency(tripPlan.hotel.totalPrice)}

`;
  }

  // Daily Itinerary
  text += `
DAILY ITINERARY
─────────────────────────────────────────────────────────────────
`;

  tripPlan.itinerary.forEach((day) => {
    text += `
Day ${day.day}
`;
    day.items
      .filter((item) => item.included)
      .forEach((item) => {
        text += `  ${item.time.padEnd(8)} ${item.title}${item.cost ? ` (${formatCurrency(item.cost)})` : ""}
`;
      });
  });

  // Total
  text += `

═══════════════════════════════════════════════════════════════
ESTIMATED TOTAL: ${formatCurrency(totalCost)}
═══════════════════════════════════════════════════════════════

This itinerary was generated by TripWeave Concierge.
Prices are estimates and subject to change.
`;

  return text;
}

function generateHtmlEmail(data: TripEmailRequest): string {
  const { tripDetails, tripPlan, totalCost } = data;
  const passengers = tripDetails.passengers.adults + tripDetails.passengers.children;

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
              <p style="margin: 16px 0 0; color: rgba(255,255,255,0.8); font-size: 16px;">
                ${tripDetails.departureCity} → ${tripDetails.destinationCity}
              </p>
            </td>
          </tr>
          
          <!-- Trip Overview -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; color: #1a2744; font-size: 18px; border-bottom: 2px solid #c9a962; padding-bottom: 8px;">Trip Overview</h2>
              <table width="100%" cellpadding="8" cellspacing="0">
                <tr>
                  <td style="color: #666; width: 120px;">Dates</td>
                  <td style="font-weight: 500;">${tripDetails.departureDate} - ${tripDetails.returnDate}</td>
                </tr>
                <tr>
                  <td style="color: #666;">Passengers</td>
                  <td style="font-weight: 500;">${tripDetails.passengers.adults} Adult(s)${tripDetails.passengers.children > 0 ? `, ${tripDetails.passengers.children} Child(ren)` : ""}</td>
                </tr>
                <tr>
                  <td style="color: #666;">Class</td>
                  <td style="font-weight: 500;">${tripDetails.flightClass.charAt(0).toUpperCase() + tripDetails.flightClass.slice(1)}</td>
                </tr>
              </table>
            </td>
          </tr>

          ${tripPlan.outboundFlight?.included || tripPlan.returnFlight?.included ? `
          <!-- Flights -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; color: #1a2744; font-size: 18px; border-bottom: 2px solid #c9a962; padding-bottom: 8px;">✈️ Flights</h2>
              ${tripPlan.outboundFlight?.included ? `
              <div style="background: #f8f5f0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">OUTBOUND</div>
                <div style="font-size: 20px; font-weight: 600;">${tripPlan.outboundFlight.originCode} → ${tripPlan.outboundFlight.destinationCode}</div>
                <div style="color: #666; margin-top: 4px;">${tripPlan.outboundFlight.airline} • ${tripPlan.outboundFlight.departureTime} - ${tripPlan.outboundFlight.arrivalTime}</div>
                <div style="color: #c9a962; font-weight: 600; margin-top: 8px;">${formatCurrency(tripPlan.outboundFlight.pricePerPerson * passengers)}</div>
              </div>
              ` : ""}
              ${tripPlan.returnFlight?.included ? `
              <div style="background: #f8f5f0; border-radius: 8px; padding: 16px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">RETURN</div>
                <div style="font-size: 20px; font-weight: 600;">${tripPlan.returnFlight.originCode} → ${tripPlan.returnFlight.destinationCode}</div>
                <div style="color: #666; margin-top: 4px;">${tripPlan.returnFlight.airline} • ${tripPlan.returnFlight.departureTime} - ${tripPlan.returnFlight.arrivalTime}</div>
                <div style="color: #c9a962; font-weight: 600; margin-top: 8px;">${formatCurrency(tripPlan.returnFlight.pricePerPerson * passengers)}</div>
              </div>
              ` : ""}
            </td>
          </tr>
          ` : ""}

          ${tripPlan.carRental?.included ? `
          <!-- Car Rental -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; color: #1a2744; font-size: 18px; border-bottom: 2px solid #c9a962; padding-bottom: 8px;">🚗 Car Rental</h2>
              <div style="background: #f8f5f0; border-radius: 8px; padding: 16px;">
                <div style="font-size: 18px; font-weight: 600;">${tripPlan.carRental.vehicleName}</div>
                <div style="color: #666; margin-top: 4px;">${tripPlan.carRental.company}</div>
                <div style="color: #c9a962; font-weight: 600; margin-top: 8px;">${formatCurrency(tripPlan.carRental.totalPrice)}</div>
              </div>
            </td>
          </tr>
          ` : ""}

          ${tripPlan.hotel?.included ? `
          <!-- Hotel -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; color: #1a2744; font-size: 18px; border-bottom: 2px solid #c9a962; padding-bottom: 8px;">🏨 Accommodation</h2>
              <div style="background: #f8f5f0; border-radius: 8px; padding: 16px;">
                <div style="font-size: 18px; font-weight: 600;">${tripPlan.hotel.name}</div>
                <div style="color: #666; margin-top: 4px;">${formatCurrency(tripPlan.hotel.pricePerNight)}/night</div>
                <div style="color: #c9a962; font-weight: 600; margin-top: 8px;">${formatCurrency(tripPlan.hotel.totalPrice)} total</div>
              </div>
            </td>
          </tr>
          ` : ""}

          <!-- Daily Itinerary -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; color: #1a2744; font-size: 18px; border-bottom: 2px solid #c9a962; padding-bottom: 8px;">📅 Daily Itinerary</h2>
              ${tripPlan.itinerary.map((day) => `
                <div style="margin-bottom: 20px;">
                  <div style="font-weight: 600; color: #1a2744; margin-bottom: 12px; background: #e8e4de; padding: 8px 12px; border-radius: 6px;">Day ${day.day}</div>
                  ${day.items.filter((item) => item.included).map((item) => `
                    <div style="display: flex; padding: 8px 0; border-bottom: 1px solid #eee;">
                      <span style="color: #c9a962; font-weight: 500; min-width: 60px;">${item.time}</span>
                      <span style="flex: 1;">${item.title}</span>
                      ${item.cost ? `<span style="color: #666;">${formatCurrency(item.cost)}</span>` : ""}
                    </div>
                  `).join("")}
                </div>
              `).join("")}
            </td>
          </tr>

          <!-- Total -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a2744 0%, #2d3c5a 100%); padding: 32px; text-align: center;">
              <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 14px;">ESTIMATED TOTAL</p>
              <p style="margin: 8px 0 0; color: #c9a962; font-size: 36px; font-weight: 600;">${formatCurrency(totalCost)}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; text-align: center; color: #999; font-size: 12px;">
              <p style="margin: 0;">This itinerary was generated by TripWeave Concierge.</p>
              <p style="margin: 8px 0 0;">Prices are estimates and subject to change.</p>
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: TripEmailRequest = await req.json();
    
    const isPlainText = data.format === "text";
    const subject = `Your TripWeave Itinerary: ${data.tripDetails.departureCity} → ${data.tripDetails.destinationCity}`;

    const emailResponse = await sendEmail({
      from: "TripWeave <onboarding@resend.dev>",
      to: [data.email],
      subject,
      ...(isPlainText 
        ? { text: generatePlainTextEmail(data) }
        : { html: generateHtmlEmail(data) }
      ),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending trip email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
