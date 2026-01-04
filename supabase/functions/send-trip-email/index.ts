import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmailViaResend(payload: { from: string; to: string[]; subject: string; html?: string; text?: string }) {
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

interface ItineraryItem {
  title: string;
  time: string;
  cost?: number;
  included: boolean;
}

interface DayItinerary {
  day: number;
  items: ItineraryItem[];
}

interface TripData {
  outboundFlight?: { 
    airline: string; 
    originCode: string; 
    destinationCode: string; 
    departureTime: string; 
    arrivalTime: string; 
    pricePerPerson: number; 
    included: boolean;
  };
  returnFlight?: { 
    airline: string; 
    originCode: string; 
    destinationCode: string; 
    departureTime: string; 
    arrivalTime: string; 
    pricePerPerson: number; 
    included: boolean;
  };
  carRental?: { 
    vehicleName: string; 
    company: string; 
    totalPrice: number; 
    included: boolean;
  };
  hotel?: { 
    name: string; 
    pricePerNight: number; 
    totalPrice: number; 
    included: boolean;
  };
  itinerary?: DayItinerary[];
  passengers: number; // Required - no default
  totalCost: number;  // Pre-calculated from frontend
}

interface TripEmailRequest {
  email: string;
  data: TripData;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function generateHtmlEmail(tripData: TripData): string {
  // Use pre-calculated total from frontend to ensure exact match
  const totalCost = tripData.totalCost;
  const passengers = tripData.passengers;

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
                Your personalized travel plan for ${passengers} passengers
              </p>
            </td>
          </tr>

          ${tripData.outboundFlight?.included || tripData.returnFlight?.included ? `
          <!-- Flights -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; color: #1a2744; font-size: 18px; border-bottom: 2px solid #c9a962; padding-bottom: 8px;">✈️ Flights</h2>
              ${tripData.outboundFlight?.included ? `
              <div style="background: #f8f5f0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">OUTBOUND</div>
                <div style="font-size: 20px; font-weight: 600;">${tripData.outboundFlight.originCode} → ${tripData.outboundFlight.destinationCode}</div>
                <div style="color: #666; margin-top: 4px;">${tripData.outboundFlight.airline} • ${tripData.outboundFlight.departureTime} - ${tripData.outboundFlight.arrivalTime}</div>
                <div style="color: #c9a962; font-weight: 600; margin-top: 8px;">${formatCurrency(tripData.outboundFlight.pricePerPerson * passengers)} (${formatCurrency(tripData.outboundFlight.pricePerPerson)} x ${passengers})</div>
              </div>
              ` : ""}
              ${tripData.returnFlight?.included ? `
              <div style="background: #f8f5f0; border-radius: 8px; padding: 16px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">RETURN</div>
                <div style="font-size: 20px; font-weight: 600;">${tripData.returnFlight.originCode} → ${tripData.returnFlight.destinationCode}</div>
                <div style="color: #666; margin-top: 4px;">${tripData.returnFlight.airline} • ${tripData.returnFlight.departureTime} - ${tripData.returnFlight.arrivalTime}</div>
                <div style="color: #c9a962; font-weight: 600; margin-top: 8px;">${formatCurrency(tripData.returnFlight.pricePerPerson * passengers)} (${formatCurrency(tripData.returnFlight.pricePerPerson)} x ${passengers})</div>
              </div>
              ` : ""}
            </td>
          </tr>
          ` : ""}

          ${tripData.carRental?.included ? `
          <!-- Car Rental -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; color: #1a2744; font-size: 18px; border-bottom: 2px solid #c9a962; padding-bottom: 8px;">🚗 Car Rental</h2>
              <div style="background: #f8f5f0; border-radius: 8px; padding: 16px;">
                <div style="font-size: 18px; font-weight: 600;">${tripData.carRental.vehicleName}</div>
                <div style="color: #666; margin-top: 4px;">${tripData.carRental.company}</div>
                <div style="color: #c9a962; font-weight: 600; margin-top: 8px;">${formatCurrency(tripData.carRental.totalPrice)}</div>
              </div>
            </td>
          </tr>
          ` : ""}

          ${tripData.hotel?.included ? `
          <!-- Hotel -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; color: #1a2744; font-size: 18px; border-bottom: 2px solid #c9a962; padding-bottom: 8px;">🏨 Accommodation</h2>
              <div style="background: #f8f5f0; border-radius: 8px; padding: 16px;">
                <div style="font-size: 18px; font-weight: 600;">${tripData.hotel.name}</div>
                <div style="color: #666; margin-top: 4px;">${formatCurrency(tripData.hotel.pricePerNight)}/night</div>
                <div style="color: #c9a962; font-weight: 600; margin-top: 8px;">${formatCurrency(tripData.hotel.totalPrice)} total</div>
              </div>
            </td>
          </tr>
          ` : ""}

          ${tripData.itinerary && tripData.itinerary.length > 0 ? `
          <!-- Daily Itinerary -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; color: #1a2744; font-size: 18px; border-bottom: 2px solid #c9a962; padding-bottom: 8px;">📅 Daily Itinerary</h2>
              ${tripData.itinerary.map((day: DayItinerary) => `
                <div style="margin-bottom: 20px;">
                  <div style="font-weight: 600; color: #1a2744; margin-bottom: 12px; background: #e8e4de; padding: 8px 12px; border-radius: 6px;">Day ${day.day}</div>
                  ${day.items.filter((item: ItineraryItem) => item.included).map((item: ItineraryItem) => `
                    <div style="display: flex; padding: 8px 0; border-bottom: 1px solid #eee;">
                      <span style="color: #c9a962; font-weight: 500; min-width: 60px;">${item.time}</span>
                      <span style="flex: 1;">${item.title}</span>
                      ${item.cost ? `<span style="color: #666;">${formatCurrency(item.cost * passengers)}</span>` : ""}
                    </div>
                  `).join("")}
                </div>
              `).join("")}
            </td>
          </tr>
          ` : ""}

          <!-- Total -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a2744 0%, #2d3c5a 100%); padding: 32px; text-align: center;">
              <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 14px;">ESTIMATED TOTAL FOR ${passengers} PASSENGER${passengers !== 1 ? 'S' : ''}</p>
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: TripEmailRequest = await req.json();
    
    // Validate passenger count
    if (!requestData.data.passengers || requestData.data.passengers <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid passenger count" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const subject = "Your TripWeave Itinerary";
    const html = generateHtmlEmail(requestData.data);

    const emailResponse = await sendEmailViaResend({
      from: "Best Travel Plan <contacts@best-travel-plan.cloud>",
      to: [requestData.email],
      subject,
      html,
    });

    return new Response(JSON.stringify({ success: true, id: emailResponse.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Failed to send email: ${errorMessage}` }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
