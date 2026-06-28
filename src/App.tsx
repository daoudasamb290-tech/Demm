/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import PassengerFlow from './components/PassengerFlow';
import DriverFlow from './components/DriverFlow';
import { PassengerBooking, AppState } from './types';
import { INITIAL_BOOKINGS } from './data';
import { supabase, isSupabaseConfigured } from './lib/supabase';

export default function App() {
  // Primary app role state
  const [role, setRole] = useState<AppState['role']>('welcome');
  
  // Specific screen states
  const [passengerScreen, setPassengerScreen] = useState<AppState['passengerScreen']>('login');
  const [driverScreen, setDriverScreen] = useState<AppState['driverScreen']>('login');

  // Load Bookings from Supabase
  const [bookings, setBookings] = useState<PassengerBooking[]>([]);

  // Load Bookings from Supabase if configured
  useEffect(() => {
    if (isSupabaseConfigured) {
      const fetchBookings = async () => {
        try {
          const { data, error } = await supabase
            .from('bookings')
            .select('*');
          if (error) {
            console.warn("Supabase load warning (table might not exist yet):", error.message);
          } else if (data && data.length > 0) {
            const mapped: PassengerBooking[] = data.map((b: any) => ({
              id: b.id,
              reference: b.reference,
              from: b.from,
              to: b.to,
              date: b.date,
              time: b.time,
              passengerName: b.passenger_name,
              phone: b.phone,
              status: b.status,
              price: Number(b.price),
              driverName: b.driver_name,
              driverAvatar: b.driver_avatar,
              driverPhone: b.driver_phone,
              vehicleName: b.vehicle_name,
              vehiclePlate: b.vehicle_plate,
              pickupAddress: b.pickup_address,
            }));
            setBookings(mapped);
          } else {
            setBookings([]);
          }
        } catch (err: any) {
          console.warn("Fetch bookings warning:", err?.message || err);
        }
      };
      fetchBookings();

      const interval = setInterval(fetchBookings, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  // Booking handlers
  const handleAddBooking = async (newBooking: PassengerBooking) => {
    setBookings(prev => [newBooking, ...prev]);
    if (isSupabaseConfigured) {
      try {
        await supabase.from('bookings').insert([{
          id: newBooking.id,
          reference: newBooking.reference,
          from: newBooking.from,
          to: newBooking.to,
          date: newBooking.date,
          time: newBooking.time,
          passenger_name: newBooking.passengerName,
          phone: newBooking.phone,
          status: newBooking.status,
          price: newBooking.price,
          driver_name: newBooking.driverName,
          driver_avatar: newBooking.driverAvatar,
          driver_phone: newBooking.driverPhone,
          vehicle_name: newBooking.vehicleName,
          vehicle_plate: newBooking.vehiclePlate,
          pickup_address: newBooking.pickupAddress,
        }]);
      } catch (err: any) {
        console.warn("Booking insert warning:", err?.message || err);
      }
    }
  };

  const handleDeleteBooking = async (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
    if (isSupabaseConfigured) {
      try {
        await supabase.from('bookings').delete().eq('id', id);
      } catch (err: any) {
        console.warn("Booking delete warning:", err?.message || err);
      }
    }
  };

  const handleUpdateBookingStatus = async (id: string, nextStatus: 'active' | 'completed' | 'cancelled' | 'pending' | 'accepted' | 'refused') => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: nextStatus } : b));
    if (isSupabaseConfigured) {
      try {
        await supabase.from('bookings').update({ status: nextStatus }).eq('id', id);
      } catch (err: any) {
        console.warn("Booking update status warning:", err?.message || err);
      }
    }
  };

  // Helper role switcher
  const handleSelectRole = (selectedRole: 'passenger' | 'driver') => {
    setRole(selectedRole);
    if (selectedRole === 'passenger') {
      setPassengerScreen('login');
    } else {
      setDriverScreen('login');
    }
  };

  const handleBackToWelcome = () => {
    setRole('welcome');
  };

  return (
    <div className="relative min-h-screen bg-slate-900 flex items-center justify-center font-sans">
      
      {/* Main Core Frame */}
      <div className="w-full max-w-[428px] min-h-screen bg-[#FAFAF8] shadow-2xl relative flex flex-col justify-between overflow-x-hidden">
        {role === 'welcome' && (
          <WelcomeScreen onSelectRole={handleSelectRole} />
        )}

        {role === 'passenger' && (
          <PassengerFlow
            bookings={bookings}
            addBooking={handleAddBooking}
            deleteBooking={handleDeleteBooking}
            currentScreen={passengerScreen}
            setScreen={setPassengerScreen}
            onBackToWelcome={handleBackToWelcome}
          />
        )}

        {role === 'driver' && (
          <DriverFlow
            currentScreen={driverScreen}
            setScreen={setDriverScreen}
            onBackToWelcome={handleBackToWelcome}
            bookings={bookings}
            onUpdateBookingStatus={handleUpdateBookingStatus}
          />
        )}
      </div>
    </div>
  );
}
