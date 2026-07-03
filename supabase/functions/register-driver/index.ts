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
    const { 
      name, 
      phone, 
      password, 
      vehicle_name, 
      vehicle_plate, 
      seats_available, 
      price, 
      boarding_place, 
      departure_time, 
      terminus, 
      avatar 
    } = await req.json()

    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return new Response(JSON.stringify({ error: 'Le nom est requis.' }), {
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Vérifier si le chauffeur existe déjà
    const { data: existing, error: findError } = await supabaseClient
      .from('drivers')
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
      return new Response(JSON.stringify({ error: 'Ce numéro de téléphone est déjà associé à un compte chauffeur.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password)

    // Générer l'id chauffeur
    const driverId = 'driver_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)

    // Insérer le chauffeur
    const { data, error: insertError } = await supabaseClient
      .from('drivers')
      .insert({
        id: driverId,
        name: name.trim(),
        phone: cleanPhone,
        password: hashedPassword,
        avatar: avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsMI9DoKFAVDDaoqwh1khlHQ8NPiAYTt8guT3fAZoykrOJuaQxfbEFKQQN82sOWKLoD2TTgVMLpa6g-_d8ltwSIMbakMQ9JddCiU1QUAOOeq15kHzgF216HhzcCcGPY4FNL9mT40Rj4k8kcf-tK-kdiabt4XgkKX2OBv0G58L25Yw4m2TVUb_tuD4PxrvMStAAmCdQF6LkoMA0vtf8dt2fAqohs52vsdbcvpI1JL9NQnRgpfPlHS22Lo48tL36M1uYn5buDUFpL5KA',
        rating: 4.8,
        trips_count: 0,
        vehicle_name: vehicle_name || 'Toyota Hiace',
        vehicle_plate: vehicle_plate || 'DK-4521-A',
        departure_time: departure_time || '08:00',
        terminus: terminus || 'Tivaouane',
        seats_available: parseInt(seats_available) || 15,
        price: parseFloat(price) || 6000,
        verified: 'VÉRIFIÉE',
        boarding_place: boarding_place || 'Dakar',
        is_online: true
      })
      .select('id')
      .single()

    if (insertError) {
      return new Response(JSON.stringify({ error: 'Erreur lors de la création du compte chauffeur: ' + insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ id: data.id, message: 'Compte chauffeur créé avec succès.' }), {
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
