import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { trip_id, driver_id, new_status } = await req.json()

    if (!trip_id || !driver_id || !new_status) {
      return new Response(JSON.stringify({ error: 'trip_id, driver_id, et new_status sont requis.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Étape 1 : Récupérer le trajet concerné
    const { data: trip, error: getError } = await supabaseClient
      .from('driver_trips')
      .select('driver_id')
      .eq('id', trip_id)
      .maybeSingle()

    if (getError) {
      return new Response(JSON.stringify({ error: 'Erreur lors de la récupération du trajet: ' + getError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!trip) {
      return new Response(JSON.stringify({ error: 'Trajet introuvable.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Étape 2 : Vérification de l'identité du chauffeur (ownership check)
    if (trip.driver_id !== driver_id) {
      return new Response(JSON.stringify({ error: 'Non autorisé : vous ne pouvez modifier que vos propres trajets.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Étape 3 : Mettre à jour le statut du trajet
    const { data: updatedTrip, error: updateError } = await supabaseClient
      .from('driver_trips')
      .update({ status: new_status })
      .eq('id', trip_id)
      .select()

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Erreur de mise à jour du trajet: ' + updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Statut du trajet mis à jour avec succès.',
      trip: updatedTrip[0] 
    }), {
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
