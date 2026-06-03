import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, ...payload } = await req.json()
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const redirectUri = payload.redirect_uri || Deno.env.get('REDIRECT_URI')

    if (action === 'get_auth_url') {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri!)}&response_type=code&scope=https://www.googleapis.com/auth/streetviewpublish&access_type=offline&prompt=select_account`
      return new Response(JSON.stringify({ authUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'exchange_code') {
      const { code, user_id } = payload
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri!,
          grant_type: 'authorization_code',
        })
      })
      const tokenData = await tokenRes.json()
      if (!tokenRes.ok) throw new Error(tokenData.error_description || 'Failed to exchange code')

      const expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      
      // Query existing tokens as a list to prevent crashes if duplicates exist
      const { data: tokens, error: selectError } = await supabaseClient
        .from('google_tokens')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })

      if (selectError) throw selectError
      const existingToken = tokens && tokens.length > 0 ? tokens[0] : null

      const tokenPayload: any = {
        user_id,
        access_token: tokenData.access_token,
        expires_at
      }

      if (tokenData.refresh_token) {
        tokenPayload.refresh_token = tokenData.refresh_token
      } else if (existingToken?.refresh_token) {
        tokenPayload.refresh_token = existingToken.refresh_token
      }

      let saveError;
      if (existingToken) {
        // Update all existing records for this user to keep them synced
        const { error } = await supabaseClient
          .from('google_tokens')
          .update(tokenPayload)
          .eq('user_id', user_id)
        saveError = error
      } else {
        // Insert new record
        const { error } = await supabaseClient
          .from('google_tokens')
          .insert(tokenPayload)
        saveError = error
      }

      if (saveError) throw saveError

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'get_valid_token') {
      const { user_id } = payload
      const { data: tokens, error } = await supabaseClient
        .from('google_tokens')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error("Database error in get_valid_token:", error);
        throw new Error("Database error: " + error.message)
      }
      
      const tokenRecord = tokens && tokens.length > 0 ? tokens[0] : null
      if (!tokenRecord) {
        return new Response(JSON.stringify({ access_token: null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const expiresAt = new Date(tokenRecord.expires_at).getTime()
      if (Date.now() > expiresAt - 5 * 60 * 1000) {
        // refresh token
        try {
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId!,
              client_secret: clientSecret!,
              refresh_token: tokenRecord.refresh_token,
              grant_type: 'refresh_token',
            })
          })
          const refreshData = await refreshRes.json()
          if (!refreshRes.ok) {
            console.error('Failed to refresh token:', refreshData);
            return new Response(JSON.stringify({ access_token: null, error: refreshData.error_description || 'Failed to refresh token' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
          const { error: updateError } = await supabaseClient.from('google_tokens').update({
            access_token: refreshData.access_token,
            expires_at: newExpiresAt
          }).eq('user_id', user_id)
          if (updateError) throw updateError

          return new Response(JSON.stringify({ access_token: refreshData.access_token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (refreshErr: any) {
          console.error('Error refreshing token:', refreshErr);
          return new Response(JSON.stringify({ access_token: null, error: refreshErr.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      return new Response(JSON.stringify({ access_token: tokenRecord.access_token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'disconnect') {
      const { user_id } = payload
      const { error } = await supabaseClient.from('google_tokens').delete().eq('user_id', user_id)
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error("Error in google-oauth:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
