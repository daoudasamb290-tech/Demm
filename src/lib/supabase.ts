import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const rawKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// Initialize Supabase Client if URL and Key are available, otherwise use placeholders to avoid startup crash
export const isSupabaseConfigured = !!(rawUrl && rawKey);

const supabaseUrl = rawUrl || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper SQL statement for user to copy-paste into Supabase SQL editor to create tables
export const SUPABASE_SETUP_SQL = `-- 1. Table des Chauffeurs
create table if not exists public.drivers (
  id text primary key,
  name text not null,
  avatar text,
  rating numeric default 4.5,
  trips_count integer default 0,
  vehicle_name text not null,
  vehicle_plate text not null,
  departure_time text not null,
  terminus text not null,
  seats_available integer not null,
  price numeric not null,
  verified text default 'VÉRIFIÉE',
  phone text not null,
  password text,
  boarding_place text,
  is_online boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activez Row Level Security (RLS) mais permettez l'accès en lecture/écriture publique pour cette démo
alter table public.drivers enable row level security;
create policy "Allow public read" on public.drivers for select using (true);
create policy "Allow public insert" on public.drivers for insert with check (true);
create policy "Allow public update" on public.drivers for update using (true);

-- Insérer les chauffeurs par défaut
insert into public.drivers (id, name, avatar, rating, trips_count, vehicle_name, vehicle_plate, departure_time, terminus, seats_available, price, verified, phone, boarding_place, is_online)
values 
('driver-moussa-sow', 'Moussa Sow', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCaljOEWF2M1u1iR7FPJngJxMuZ1rqoFehQP4WTlGRe9W3lA5AzVE2NK8T16FbgewGch4hdrKMK65ceUpCdR_YnfiVHJHTB4TK73B1muUvpz-0FLmoVjksFoUghdHGWxnyDkE9dXvnYn1z7XzXZ7VGk16j3DLfMF6Buez-zjZP9a4ik650l-d2NxpIhpx6LFWrh4lo1athhUy6ORVCLlgMzcIkjdQpimnu8Jm7PZ56X01lZgm_wTtMa3hOO8Rmr8jZQAkLPslqKjuf8', 4.8, 124, 'Toyota Hiace', 'DK-4521-A', '08:15', 'Tivaouane', 3, 6000, 'CONFIRMÉ', '+221 77 654 32 10', 'Garage Pompiers, Dakar', true)
on conflict (id) do nothing;

insert into public.drivers (id, name, avatar, rating, trips_count, vehicle_name, vehicle_plate, departure_time, terminus, seats_available, price, verified, phone, boarding_place, is_online)
values 
('driver-awa-diallo', 'Awa Diallo', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAADAt8vgr2pvqJlfHC0tt9X57f0asrwgHXyjcNjUMJOSHOgw0FKR5N7A5WAQzr90udi6VABk43uLwsJ7o3HhMaRGT5LQhKBw4nBGOSNdmk3-4TauEONF4AdSc8gpt9-oGFtSQwnPkXnxKBMscKjtnRGhSVSWv3zF_oUzqn2Tqpkd_cHlC-eFfwl9CmcHVwsy2ZyF7UXxoerbJrCya-I_P77N9OI_WXjQ2K34GnvBBK4o3WAggnQv4ZLNaE5g2TTclMx8XWPynRMz7r', 4.6, 89, 'Hyundai i10', 'DK-8891-B', '08:30', 'Tivaouane', 1, 6000, 'VÉRIFIÉE', '+221 77 987 65 43', 'Gare des Beaux Maraîchers, Dakar', true)
on conflict (id) do nothing;

insert into public.drivers (id, name, avatar, rating, trips_count, vehicle_name, vehicle_plate, departure_time, terminus, seats_available, price, verified, phone, boarding_place, is_online)
values 
('driver-ibrahima-kane', 'Ibrahima Kane', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLheGhfTuXIcSkxl_wRVeunVlIMg_jJpE6wn8JAryUVUaez3qvGEt_aGrO1KUbyVv4hb64E6i-2839-sCQP6rkL0G7ou3RSNN4zsPddcUz0QtpcQaUeDeHGAykAS1q9I7EQbBKPh3KwheD7nwIRjEsmFsXF10Q_c7tZkHkRH_RKZ-nLe9S80GdTOdj2mZRN-U-EivsAefSUz1Mm7K9TsmA8082dz-J5a9TlFeLo45YvdGHs-i-gEXeDNEN-wD4JhCuAwXtxF7S4bhg', 4.9, 210, 'Peugeot 508', 'DK-1022-C', '08:45', 'Tivaouane', 0, 6000, 'COMPLET', '+221 77 123 45 67', 'Gare Routière de Colobane, Dakar', false)
on conflict (id) do nothing;


-- 2. Table des Réservations (Bookings)
create table if not exists public.bookings (
  id text primary key,
  reference text not null,
  "from" text not null,
  "to" text not null,
  date text not null,
  time text not null,
  passenger_name text not null,
  phone text not null,
  status text default 'active',
  price numeric not null,
  driver_name text not null,
  driver_avatar text,
  driver_phone text,
  vehicle_name text,
  vehicle_plate text,
  pickup_address text,
  seats_count integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- IMPORTANT: Si votre table bookings existe déjà sur Supabase, exécutez cette requête SQL dans votre éditeur SQL Supabase :
-- alter table public.bookings add column if not exists seats_count integer default 1;

alter table public.bookings enable row level security;
create policy "Allow public read" on public.bookings for select using (true);
create policy "Allow public insert" on public.bookings for insert with check (true);
create policy "Allow public update" on public.bookings for update using (true);


-- 3. Table des Trajets Conducteur (Driver Trips)
create table if not exists public.driver_trips (
  id text primary key,
  "from" text not null,
  "to" text not null,
  date text not null,
  time text not null,
  passenger_count integer default 0,
  max_passengers integer default 15,
  status text default 'pending',
  boarding_place text,
  driver_id text,
  driver_name text,
  driver_phone text,
  driver_avatar text,
  vehicle_name text,
  vehicle_plate text,
  price numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- IMPORTANT: Si votre table driver_trips existe déjà sur Supabase, exécutez ces requêtes SQL dans votre éditeur SQL Supabase :
-- alter table public.driver_trips add column if not exists driver_id text;
-- alter table public.driver_trips add column if not exists driver_name text;
-- alter table public.driver_trips add column if not exists driver_phone text;
-- alter table public.driver_trips add column if not exists driver_avatar text;
-- alter table public.driver_trips add column if not exists vehicle_name text;
-- alter table public.driver_trips add column if not exists vehicle_plate text;
-- alter table public.driver_trips add column if not exists price numeric;

alter table public.driver_trips enable row level security;
create policy "Allow public read" on public.driver_trips for select using (true);
create policy "Allow public insert" on public.driver_trips for insert with check (true);
create policy "Allow public update" on public.driver_trips for update using (true);

-- 4. Table des Passagers (Passengers)
create table if not exists public.passengers (
  id text primary key,
  name text not null,
  phone text not null,
  password text,
  referral text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.passengers enable row level security;
create policy "Allow public read" on public.passengers for select using (true);
create policy "Allow public insert" on public.passengers for insert with check (true);
create policy "Allow public update" on public.passengers for update using (true);
`;

/**
 * Appel des Supabase Edge Functions sécurisées pour remplacer les opérations sensibles en front-end
 */

export async function registerPassengerEdge(name: string, phone: string, password: string) {
  const { data, error } = await supabase.functions.invoke('register-passenger', {
    body: { name, phone, password }
  });
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

export async function loginPassengerEdge(phone: string, password: string) {
  const { data, error } = await supabase.functions.invoke('login-passenger', {
    body: { phone, password }
  });
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data; // { passenger: {...} }
}

export async function registerDriverEdge(driverData: any) {
  const { data, error } = await supabase.functions.invoke('register-driver', {
    body: driverData
  });
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

export async function loginDriverEdge(phone: string, password: string) {
  const { data, error } = await supabase.functions.invoke('login-driver', {
    body: { phone, password }
  });
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data; // { driver: {...} }
}

export async function createBookingEdge(bookingData: any, tripId: string, seatsCount: number, isDriverTrip: boolean) {
  const { data, error } = await supabase.functions.invoke('create-booking', {
    body: { bookingData, tripId, seatsCount, isDriverTrip }
  });
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

export async function updateTripStatusEdge(tripId: string, driverId: string, newStatus: string) {
  const { data, error } = await supabase.functions.invoke('update-trip-status', {
    body: { trip_id: tripId, driver_id: driverId, new_status: newStatus }
  });
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

