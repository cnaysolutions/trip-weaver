import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-08-27.basil",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

// Product ID mapping: Map Stripe Product ID to the number of credits
const PRODUCT_CREDIT_MAP: { [key: string]: number } = {
  "prod_TjithQuJxJ9DGQ": 15, // Traveler Pack - 15 credits
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

  if (!userId) {
    console.error("Webhook Error: Missing user_id in session metadata.");
    return { status: 400, message: "Missing user_id" };
  }

  // Find the product purchased and the corresponding credits
  const productId = lineItems.data[0]?.price?.product as string;
  const creditsToAdd = PRODUCT_CREDIT_MAP[productId];

  if (!creditsToAdd) {
    console.error(`Webhook Error: Unknown product ID: ${productId}`);
    return { status: 400, message: "Unknown product" };
  }

  console.log(`Processing credit purchase for user ${userId}: +${creditsToAdd} credits`);

  // 1. Get current credits
  const { data: profile, error: fetchError } = await supabaseAdmin
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();

  if (fetchError || !profile) {
    console.error("Supabase Error: Could not find profile:", fetchError);
    return { status: 500, message: "Profile fetch failed" };
  }

  const newCredits = profile.credits + creditsToAdd;

  // 2. Update credits
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ credits: newCredits })
    .eq("id", userId);

  if (updateError) {
    console.error("Supabase Error: Credit update failed:", updateError);
    return { status: 500, message: "Credit update failed" };
  }

  // 3. Log the transaction
  const { error: logError } = await supabaseAdmin
    .from("credit_transactions")
    .insert({
      user_id: userId,
      type: "purchase",
      amount: creditsToAdd,
      description: `Purchased ${creditsToAdd} credits via Stripe`,
      stripe_checkout_session_id: session.id,
    });

  if (logError) {
    console.error("Supabase Error: Transaction log failed:", logError);
    // Continue - credit was added successfully
  }

  console.log(`Successfully added ${creditsToAdd} credits to user ${userId}. New balance: ${newCredits}`);
  return { status: 200, message: "Success" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing Stripe signature", { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err}`);
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    console.log(`Received Stripe event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await handleCheckoutSessionCompleted(session);
        return new Response(result.message, { status: result.status });

      default:
        console.log(`Unhandled event type: ${event.type}`);
        return new Response("Unhandled event type", { status: 200 });
    }
  } catch (error) {
    console.error("General Webhook Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
