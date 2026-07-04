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
  // Security hooks: prevent inspecting, right-clicks, and standard shortcuts
  useEffect(() => {
    // Disable right click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Disable standard developer/inspection shortcut keys
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. F12 key
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
      
      // 2. Ctrl+Shift+I or Cmd+Opt+I (Inspect)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
        e.preventDefault();
        return false;
      }

      // 3. Ctrl+Shift+J or Cmd+Opt+J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
        e.preventDefault();
        return false;
      }

      // 4. Ctrl+Shift+C or Cmd+Opt+C (Select element)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
        e.preventDefault();
        return false;
      }

      // 5. Ctrl+U or Cmd+Opt+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
        e.preventDefault();
        return false;
      }

      // 6. Ctrl+S or Cmd+S (Save page)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Dynamic devtools detection & deterrence (clearing console & active warnings)
    const threshold = 160;
    const detectDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      if (widthThreshold || heightThreshold) {
        console.clear();
        console.log("%cAccès Sécurisé - DEM niou_dem", "color: #3d5ba9; font-size: 20px; font-weight: bold;");
        console.log("L'inspection de cette application de transport est sécurisée et désactivée.");
      }
    };

    window.addEventListener('resize', detectDevTools);
    
    // Periodically clear console as extra safety measure
    const consoleInterval = setInterval(() => {
      try {
        console.clear();
      } catch (e) {}
    }, 2000);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', detectDevTools);
      clearInterval(consoleInterval);
    };
  }, []);

  // Primary app role state
  const [role, setRole] = useState<AppState['role']>('welcome');
  
  // Specific screen states
  const [passengerScreen, setPassengerScreen] = useState<AppState['passengerScreen']>('login');
  const [driverScreen, setDriverScreen] = useState<AppState['driverScreen']>('login');

  // Load Bookings from Supabase
  const [bookings, setBookings] = useState<PassengerBooking[]>(INITIAL_BOOKINGS);

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
            const mapped: PassengerBooking[] = data.map((b: any) => {
              const rawAddress = b.pickup_address || '';
              const match = rawAddress.match(/\[Places:\s*(\d+)\]/);
              const seatsCount = b.seats_count !== undefined && b.seats_count !== null 
                ? Number(b.seats_count) 
                : (match ? parseInt(match[1], 10) : undefined);
              const cleanAddress = rawAddress.replace(/\s*\[Places:\s*\d+\]/, '');

              return {
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
                pickupAddress: cleanAddress,
                seatsCount: seatsCount
              };
            });
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
        const { error } = await supabase.from('bookings').insert([{
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
          seats_count: newBooking.seatsCount || 1,
        }]);
        if (error) {
          console.error("Booking insert error from Supabase:", error.message);
        } else {
          // Insertion réussie ! On appelle l'API de notification (Gemini + Twilio WhatsApp)
          try {
            const notifyRes = await fetch('/api/send-booking-notification', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(newBooking),
            });
            const notifyData = await notifyRes.json();
            console.log('[Notification API]', notifyData);
          } catch (notifyErr: any) {
            console.warn('[Notification API] Erreur lors de l’appel :', notifyErr?.message || notifyErr);
          }
        }
      } catch (err: any) {
        console.warn("Booking insert warning:", err?.message || err);
      }
    }
  };

  const handleDeleteBooking = async (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('bookings').delete().eq('id', id);
        if (error) {
          console.error("Booking delete error from Supabase:", error.message);
        }
      } catch (err: any) {
        console.warn("Booking delete warning:", err?.message || err);
      }
    }
  };

  const handleUpdateBookingStatus = async (id: string, nextStatus: 'active' | 'completed' | 'cancelled' | 'pending' | 'accepted' | 'refused') => {
    // Save current state for rollback
    let previousBookings: PassengerBooking[] = [];
    setBookings(prev => {
      previousBookings = prev;
      return prev.map(b => b.id === id ? { ...b, status: nextStatus } : b);
    });

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('bookings').update({ status: nextStatus }).eq('id', id);
        if (error) {
          console.error("Booking update status error from Supabase:", error.message);
          // Rollback local state if database update failed
          setBookings(previousBookings);
          alert(`Erreur lors de la mise à jour de la réservation : ${error.message}`);
        }
      } catch (err: any) {
        console.warn("Booking update status warning:", err?.message || err);
        setBookings(previousBookings);
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
