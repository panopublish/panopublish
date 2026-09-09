/// <reference path="../deno-types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HMAC-SHA256 signature verification using native Deno Web Crypto API
async function verifySignature(
  paymentId: string,
  subscriptionId: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const text = `${paymentId}|${subscriptionId}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(text);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);

  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const computedSignature = signatureArray.map((b) => b.toString(16).padStart(2, "0")).join("");

// HMAC-SHA256 signature verification for one-time orders
async function verifyOrderSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const text = `${orderId}|${paymentId}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(text);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);

  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const computedSignature = signatureArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return computedSignature === signature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const keyId = Deno.env.get("RAZORPAY_KEY_ID") || "rzp_test_SvUlzHxrvbZ3KW";
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!keySecret) {
      throw new Error("RAZORPAY_KEY_SECRET is not configured in Supabase Secrets.");
    }

    // 1. Detect and handle Razorpay Webhooks
    const webhookSignature = req.headers.get("x-razorpay-signature");
    if (webhookSignature) {
      const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || keySecret;
      const rawBody = await req.text();

      // Verify webhook signature
      const encoder = new TextEncoder();
      const keyData = encoder.encode(webhookSecret);
      const messageData = encoder.encode(rawBody);

      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );

      const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);

      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      const computedSignature = signatureArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      if (computedSignature !== webhookSignature) {
        console.error(
          "Invalid webhook signature computed:",
          computedSignature,
          "vs received:",
          webhookSignature,
        );
        return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const webhookPayload = JSON.parse(rawBody);
      const event = webhookPayload.event;

      if (event === "subscription.cancelled" || event === "subscription.halted") {
        const subscriptionEntity = webhookPayload.payload.subscription.entity;
        const subscriptionId = subscriptionEntity.id;

        // Fetch user from subscriptions log
        const { data: subRow } = await supabaseClient
          .from("subscriptions")
          .select("user_id")
          .eq("razorpay_subscription_id", subscriptionId)
          .maybeSingle();

        if (subRow?.user_id) {
          // Downgrade profiles plan to trial tier
          await supabaseClient.from("profiles").update({ plan: "trial" }).eq("id", subRow.user_id);

          // Update subscription log status
          await supabaseClient
            .from("subscriptions")
            .update({ status: "cancelled" })
            .eq("razorpay_subscription_id", subscriptionId);

          console.log(
            `Successfully cancelled subscription ${subscriptionId} for user ${subRow.user_id}`,
          );
        }
      } else if (event === "subscription.charged") {
        const subscriptionEntity = webhookPayload.payload.subscription.entity;
        const subscriptionId = subscriptionEntity.id;

        // Fetch user from subscriptions log
        const { data: subRow } = await supabaseClient
          .from("subscriptions")
          .select("user_id")
          .eq("razorpay_subscription_id", subscriptionId)
          .maybeSingle();

        if (subRow?.user_id) {
          // Reset the billing cycle tours used count on renewal
          await supabaseClient
            .from("profiles")
            .update({ billing_cycle_tours_used: 0 })
            .eq("id", subRow.user_id);

          console.log(
            `Successfully renewed subscription and reset tour count for subscription ${subscriptionId}, user ${subRow.user_id}`,
          );
        }
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // 2. Handle Standard JSON Actions
    const { action, ...payload } = await req.json();
    const planPrices: Record<string, number> = {
      basic: 499,
      pro: 1499,
      agency: 2999,
    };

    const staticPlanIds: Record<string, string> = {
      basic: "plan_Sx8pyS9J75kPLf",
      pro: "plan_Sx9MoqhOSiSQYh",
      agency: "plan_Sx9O12idzkpCLD",
    };

    if (action === "create_subscription") {
      const { plan_name, email } = payload;
      const planAmount = planPrices[plan_name.toLowerCase()];
      if (!planAmount) throw new Error("Invalid plan selection");

      const planId = staticPlanIds[plan_name.toLowerCase()];
      if (!planId) throw new Error("Plan ID not found for selection");

      // 2. Create Razorpay Subscription
      const subRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: planId,
          total_count: 12, // 1 year
          quantity: 1,
          customer_notify: 1,
        }),
      });

      const subData = await subRes.json();
      if (!subRes.ok)
        throw new Error(subData.error?.description || "Failed to initialize subscription");

      return new Response(
        JSON.stringify({
          success: true,
          subscription_id: subData.id,
          plan_id: planId,
          amount: planAmount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "verify_subscription") {
      const {
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
        plan_name,
        user_id,
      } = payload;
      const planAmount = planPrices[plan_name.toLowerCase()];

      // Verify the Razorpay payment signature
      const isValid = await verifySignature(
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
        keySecret,
      );

      if (!isValid) {
        throw new Error("Invalid Razorpay payment signature.");
      }

      // Update public.profiles table
      const { error: profileErr } = await supabaseClient
        .from("profiles")
        .update({
          plan: plan_name.toLowerCase(),
          billing_cycle_tours_used: 0,
        })
        .eq("id", user_id);

      if (profileErr) throw profileErr;

      // Log subscription in public.subscriptions
      const { error: subErr } = await supabaseClient.from("subscriptions").insert({
        user_id,
        plan: plan_name.toLowerCase(),
        status: "active",
        razorpay_subscription_id,
        amount_inr: planAmount,
      });

      if (subErr) throw subErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_order") {
      const { credits_count, user_id } = payload;
      const count = Number(credits_count);
      if (!count || count <= 0) {
        throw new Error("Invalid credits count");
      }

      // Verify user has an active paid plan
      const { data: userProfile, error: profErr } = await supabaseClient
        .from("profiles")
        .select("plan, credits")
        .eq("id", user_id)
        .single();

      if (profErr || !userProfile) {
        throw new Error("User profile not found");
      }

      if (userProfile.plan === "trial") {
        throw new Error("Pay as you go extra credits are exclusive to active paid subscribers. Please upgrade your plan first.");
      }

      const pricePerCredit = 100; // ₹100 INR per credit
      const totalAmountInPaise = count * pricePerCredit * 100;

      const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: totalAmountInPaise,
          currency: "INR",
          receipt: `credit_${user_id.slice(0, 8)}_${Date.now()}`,
          notes: {
            user_id,
            credits_count: count,
            type: "pay_as_you_go",
          },
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error?.description || "Failed to create Razorpay order");
      }

      return new Response(
        JSON.stringify({
          success: true,
          order_id: orderData.id,
          amount: totalAmountInPaise,
          currency: "INR",
          credits_count: count,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "verify_order_payment") {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        credits_count,
        user_id,
      } = payload;

      const count = Number(credits_count);
      if (!count || count <= 0) throw new Error("Invalid credits count");

      const isValid = await verifyOrderSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        keySecret,
      );

      if (!isValid) {
        throw new Error("Invalid Razorpay payment signature.");
      }

      // Fetch current profile to calculate new credits
      const { data: userProfile, error: pErr } = await supabaseClient
        .from("profiles")
        .select("plan, credits")
        .eq("id", user_id)
        .single();

      if (pErr || !userProfile) throw new Error("User profile not found");

      const basePlanLimits: Record<string, number> = { basic: 5, pro: 20, agency: 50 };
      const baseLimit = basePlanLimits[userProfile.plan] ?? 5;
      const currentAllowance = Math.max(userProfile.credits ?? 0, baseLimit);
      const newCredits = currentAllowance + count;

      const { error: updateErr } = await supabaseClient
        .from("profiles")
        .update({
          credits: newCredits,
        })
        .eq("id", user_id);

      if (updateErr) throw updateErr;

      // Log into subscriptions / payment history table
      await supabaseClient.from("subscriptions").insert({
        user_id,
        plan: "pay_as_you_go",
        status: "active",
        razorpay_subscription_id: razorpay_payment_id,
        amount_inr: count * 100,
      });

      return new Response(
        JSON.stringify({
          success: true,
          new_credits: newCredits,
          added_credits: count,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in razorpay edge function:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
