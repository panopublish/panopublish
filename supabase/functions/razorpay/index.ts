import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// HMAC-SHA256 signature verification using native Deno Web Crypto API
async function verifySignature(paymentId: string, subscriptionId: string, signature: string, secret: string): Promise<boolean> {
  const text = `${paymentId}|${subscriptionId}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(text);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    messageData
  );
  
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const computedSignature = signatureArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  return computedSignature === signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const keyId = Deno.env.get('RAZORPAY_KEY_ID') || 'rzp_test_SvUlzHxrvbZ3KW';
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keySecret) {
      throw new Error("RAZORPAY_KEY_SECRET is not configured in Supabase Secrets.");
    }

    // 1. Detect and handle Razorpay Webhooks
    const webhookSignature = req.headers.get('x-razorpay-signature');
    if (webhookSignature) {
      const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || keySecret;
      const rawBody = await req.text();

      // Verify webhook signature
      const encoder = new TextEncoder();
      const keyData = encoder.encode(webhookSecret);
      const messageData = encoder.encode(rawBody);
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        messageData
      );
      
      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      const computedSignature = signatureArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
        
      if (computedSignature !== webhookSignature) {
        console.error("Invalid webhook signature computed:", computedSignature, "vs received:", webhookSignature);
        return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), { status: 400, headers: corsHeaders });
      }

      const webhookPayload = JSON.parse(rawBody);
      const event = webhookPayload.event;

      if (event === 'subscription.cancelled' || event === 'subscription.halted') {
        const subscriptionEntity = webhookPayload.payload.subscription.entity;
        const subscriptionId = subscriptionEntity.id;

        // Fetch user from subscriptions log
        const { data: subRow } = await supabaseClient
          .from('subscriptions')
          .select('user_id')
          .eq('razorpay_subscription_id', subscriptionId)
          .maybeSingle();

        if (subRow?.user_id) {
          // Downgrade profiles plan to trial tier
          await supabaseClient
            .from('profiles')
            .update({ plan: 'trial' })
            .eq('id', subRow.user_id);

          // Update subscription log status
          await supabaseClient
            .from('subscriptions')
            .update({ status: 'cancelled' })
            .eq('razorpay_subscription_id', subscriptionId);
            
          console.log(`Successfully cancelled subscription ${subscriptionId} for user ${subRow.user_id}`);
        }
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // 2. Handle Standard JSON Actions
    const { action, ...payload } = await req.json()
    const planPrices: Record<string, number> = {
      basic: 499,
      pro: 1499,
      agency: 2999
    };

    if (action === 'create_subscription') {
      const { plan_name, email } = payload;
      const planAmount = planPrices[plan_name.toLowerCase()];
      if (!planAmount) throw new Error("Invalid plan selection");

      // 1. Dynamically create plan on Razorpay (Ensures dynamic self-healing test flow)
      const planRes = await fetch('https://api.razorpay.com/v1/plans', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${keyId}:${keySecret}`)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          period: 'monthly',
          interval: 1,
          item: {
            name: `TourVista ${plan_name.toUpperCase()} Subscription`,
            amount: planAmount * 100, // in paisa
            currency: 'INR',
            description: `Recurring monthly subscription for TourVista ${plan_name} tier`
          }
        })
      });

      const planData = await planRes.json();
      if (!planRes.ok) throw new Error(planData.error?.description || 'Failed to create plan on Razorpay');
      const planId = planData.id;

      // 2. Create Razorpay Subscription
      const subRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${keyId}:${keySecret}`)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan_id: planId,
          total_count: 12, // 1 year
          quantity: 1,
          customer_notify: 1
        })
      });

      const subData = await subRes.json();
      if (!subRes.ok) throw new Error(subData.error?.description || 'Failed to initialize subscription');

      return new Response(
        JSON.stringify({ 
          success: true, 
          subscription_id: subData.id, 
          plan_id: planId,
          amount: planAmount 
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify_subscription') {
      const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, plan_name, user_id } = payload;
      const planAmount = planPrices[plan_name.toLowerCase()];

      // Verify the Razorpay payment signature
      const isValid = await verifySignature(razorpay_payment_id, razorpay_subscription_id, razorpay_signature, keySecret);
      
      if (!isValid) {
        throw new Error("Invalid Razorpay payment signature.");
      }

      // Update public.profiles table
      const { error: profileErr } = await supabaseClient
        .from('profiles')
        .update({ plan: plan_name.toLowerCase() })
        .eq('id', user_id);

      if (profileErr) throw profileErr;

      // Log subscription in public.subscriptions
      const { error: subErr } = await supabaseClient
        .from('subscriptions')
        .insert({
          user_id,
          plan: plan_name.toLowerCase(),
          status: 'active',
          razorpay_subscription_id,
          amount_inr: planAmount
        });

      if (subErr) throw subErr;

      return new Response(
        JSON.stringify({ success: true }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error("Error in razorpay edge function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
