import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, password } = await req.json()

    if (!phone || typeof phone !== 'string') {
      return new Response(JSON.stringify({ error: 'Le numéro de téléphone est requis.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!password || typeof password !== 'string') {
      return new Response(JSON.stringify({ error: 'Le mot de passe est requis.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const cleanPhone = phone.replace(/\s+/g, '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Chercher le chauffeur par téléphone
    const { data: driver, error: findError } = await supabaseClient
      .from('drivers')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle()

    if (findError) {
      return new Response(JSON.stringify({ error: 'Erreur lors de la recherche du chauffeur: ' + findError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!driver) {
      return new Response(JSON.stringify({ error: 'Identifiants invalides ou chauffeur introuvable.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Vérifier le mot de passe
    const storedHash = driver.password || '';
    const isValid = await bcrypt.compare(password, storedHash)

    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Identifiants invalides (mot de passe incorrect).' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Exclure le mot de passe hashé
    const { password: _, ...driverData } = driver

    return new Response(JSON.stringify({ driver: driverData, message: 'Connexion réussie.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
