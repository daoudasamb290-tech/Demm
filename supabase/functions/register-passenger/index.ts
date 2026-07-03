// Follow standard Supabase Edge Function conventions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, phone, password } = await req.json()

    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return new Response(JSON.stringify({ error: 'Le nom est requis et doit être une chaîne valide.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!phone || typeof phone !== 'string' || phone.trim() === '') {
      return new Response(JSON.stringify({ error: 'Le numéro de téléphone est requis.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return new Response(JSON.stringify({ error: 'Le mot de passe doit faire au moins 4 caractères.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const cleanPhone = phone.replace(/\s+/g, '');

    // Setup service_role client to bypass RLS safely
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Vérifier l'unicité du téléphone
    const { data: existing, error: findError } = await supabaseClient
      .from('passengers')
      .select('id')
      .eq('phone', cleanPhone)
      .maybeSingle()

    if (findError) {
      return new Response(JSON.stringify({ error: 'Erreur lors de la vérification du numéro: ' + findError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (existing) {
      return new Response(JSON.stringify({ error: 'Ce numéro de téléphone est déjà associé à un compte passager.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Hashage bcrypt
    const hashedPassword = await bcrypt.hash(password)

    // Générer l'id passager
    const passengerId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)

    // Insérer le passager avec service_role
    const { data, error: insertError } = await supabaseClient
      .from('passengers')
      .insert({
        id: passengerId,
        name: name.trim(),
        phone: cleanPhone,
        password: hashedPassword,
        referral: null
      })
      .select('id')
      .single()

    if (insertError) {
      return new Response(JSON.stringify({ error: 'Erreur lors de la création du compte: ' + insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ id: data.id, message: 'Compte passager créé avec succès.' }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
