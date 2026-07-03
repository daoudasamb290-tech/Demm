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
    const { bookingData, tripId, seatsCount, isDriverTrip } = await req.json()

    if (!bookingData || !tripId) {
      return new Response(JSON.stringify({ error: 'bookingData et tripId sont requis.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const requestedSeats = parseInt(seatsCount) || 1;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Étape 1 : Vérification et réservation des places
    if (isDriverTrip) {
      // Pour les trajets publiés par les chauffeurs (driver_trips)
      const { data: trip, error: getError } = await supabaseClient
        .from('driver_trips')
        .select('passenger_count, max_passengers')
        .eq('id', tripId)
        .single()

      if (getError || !trip) {
        return new Response(JSON.stringify({ error: 'Trajet introuvable.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const max = trip.max_passengers ?? 15;
      const current = trip.passenger_count ?? 0;

      if (current + requestedSeats > max) {
        return new Response(JSON.stringify({ error: 'Pas assez de places disponibles sur ce trajet.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Concurrence optimiste pour l'incrémentation
      const { data: updatedTrip, error: updateErr } = await supabaseClient
        .from('driver_trips')
        .update({ passenger_count: current + requestedSeats })
        .eq('id', tripId)
        .eq('passenger_count', current)
        .select()

      if (updateErr || !updatedTrip || updatedTrip.length === 0) {
        return new Response(JSON.stringify({ error: 'Le trajet a été mis à jour par un autre utilisateur. Veuillez réessayer.' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

    } else {
      // Pour les chauffeurs classiques (drivers)
      const { data: driver, error: getError } = await supabaseClient
        .from('drivers')
        .select('seats_available, verified')
        .eq('id', tripId)
        .single()

      if (getError || !driver) {
        return new Response(JSON.stringify({ error: 'Chauffeur/Trajet introuvable.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const available = driver.seats_available ?? 0;
      if (available < requestedSeats) {
        return new Response(JSON.stringify({ error: 'Pas assez de places disponibles avec ce chauffeur.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const nextSeats = available - requestedSeats;

      // Décrémentation avec vérification du nombre de places initial
      const { data: updatedDriver, error: updateErr } = await supabaseClient
        .from('drivers')
        .update({ 
          seats_available: nextSeats,
          verified: nextSeats === 0 ? 'COMPLET' : driver.verified
        })
        .eq('id', tripId)
        .eq('seats_available', available)
        .select()

      if (updateErr || !updatedDriver || updatedDriver.length === 0) {
        return new Response(JSON.stringify({ error: 'Les places ont été réservées entre-temps. Veuillez réessayer.' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Étape 2 : Créer l'enregistrement de réservation (booking)
    const pickupAddressWithPlaces = `${bookingData.pickupAddress || bookingData.pickup_address || ''} [Places: ${requestedSeats}]`;

    const { data: newBooking, error: insertError } = await supabaseClient
      .from('bookings')
      .insert({
        id: bookingData.id || ('booking-' + crypto.randomUUID()),
        reference: bookingData.reference,
        from: bookingData.from,
        to: bookingData.to,
        date: bookingData.date,
        time: bookingData.time,
        passenger_name: bookingData.passengerName || bookingData.passenger_name,
        phone: bookingData.phone,
        status: bookingData.status || 'active',
        price: parseFloat(bookingData.price),
        driver_name: bookingData.driverName || bookingData.driver_name,
        driver_avatar: bookingData.driverAvatar || bookingData.driver_avatar,
        driver_phone: bookingData.driverPhone || bookingData.driver_phone,
        vehicle_name: bookingData.vehicleName || bookingData.vehicle_name,
        vehicle_plate: bookingData.vehiclePlate || bookingData.vehicle_plate,
        pickup_address: pickupAddressWithPlaces,
        seats_count: requestedSeats
      })
      .select('reference')
      .single()

    if (insertError) {
      return new Response(JSON.stringify({ error: 'Erreur lors de la création de la réservation: ' + insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      reference: newBooking.reference, 
      message: 'Réservation créée avec succès.' 
    }), {
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
