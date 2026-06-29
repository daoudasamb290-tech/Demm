/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DriverTrip, DriverTransaction, PassengerBooking } from '../types';
import { INITIAL_DRIVER_TRIPS, INITIAL_TRANSACTIONS, LOCATIONS } from '../data';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const getTodayISODate = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface DriverFlowProps {
  currentScreen: 'register' | 'login' | 'home' | 'portal' | 'revenus' | 'profil';
  setScreen: (screen: 'register' | 'login' | 'home' | 'portal' | 'revenus' | 'profil') => void;
  onBackToWelcome: () => void;
  bookings: PassengerBooking[];
  onUpdateBookingStatus: (id: string, status: 'active' | 'completed' | 'cancelled' | 'pending' | 'accepted' | 'refused') => void;
}

export default function DriverFlow({
  currentScreen,
  setScreen,
  onBackToWelcome,
  bookings,
  onUpdateBookingStatus
}: DriverFlowProps) {
  // Register form state
  const [driverAvatar, setDriverAvatar] = useState(() => localStorage.getItem('dem_driver_avatar') || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsMI9DoKFAVDDaoqwh1khlHQ8NPiAYTt8guT3fAZoykrOJuaQxfbEFKQQN82sOWKLoD2TTgVMLpa6g-_d8ltwSIMbakMQ9JddCiU1QUAOOeq15kHzgF216HhzcCcGPY4FNL9mT40Rj4k8kcf-tK-kdiabt4XgkKX2OBv0G58L25Yw4m2TVUb_tuD4PxrvMStAAmCdQF6LkoMA0vtf8dt2fAqohs52vsdbcvpI1JL9NQnRgpfPlHS22Lo48tL36M1uYn5buDUFpL5KA');
  const [driverName, setDriverName] = useState(() => localStorage.getItem('dem_driver_name') || '');
  const [driverEmail, setDriverEmail] = useState(() => localStorage.getItem('dem_driver_email') || '');
  const [driverPhone, setDriverPhone] = useState(() => localStorage.getItem('dem_driver_phone') || '');
  const [licenseType, setDriverLicense] = useState(() => localStorage.getItem('dem_driver_license') || 'D');
  const [experienceYears, setExperience] = useState(() => localStorage.getItem('dem_driver_experience') || '8');
  const [vehicleBrand, setVehicleBrand] = useState(() => localStorage.getItem('dem_driver_vehicle_brand') || '');
  const [vehiclePlate, setVehiclePlate] = useState(() => localStorage.getItem('dem_driver_vehicle_plate') || '');
  const [vehicleSeats, setVehicleSeats] = useState(() => localStorage.getItem('dem_driver_vehicle_seats') || '');
  const [vehicleImage, setVehicleImage] = useState(() => localStorage.getItem('dem_driver_vehicle_image') || 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9TVVPgjd2IX2DGV2fbpVShVAXHyQKmBT0274-gR8kDxcUcUEWkmAM1Lviuz-b7Zr1YB6_neSlzXKjitOvKH66k7xa1X_6GBUhMSQG3Jc5Fsc0QpUEZ49OQeG91yXWM67A5cMHOp47Y90Th0N0A1YfMMf2lLH8PdMYChzMD_ol2JKv1_WTgQOJSL70osXCK9JkiwiJFL4Ijz7XipZWtpedd_1TJexJyyJzB40obG9NVdLUA8dZ4JH4_4KZVjh0vqx248QNuCcEK0HA');
  const [loginDriverPhone, setLoginDriverPhone] = useState(() => localStorage.getItem('dem_driver_phone') || '');
  const [loginDriverName, setLoginDriverName] = useState(() => localStorage.getItem('dem_driver_name') || '');
  const [driverLoginError, setDriverLoginError] = useState('');

  // Interactivity States
  const [isOnline, setIsOnline] = useState(true);
  const [walletBalance, setWalletBalance] = useState(47500);
  const [isCommissionPaid, setIsCommissionPaid] = useState(false);
  const [driverTrips, setDriverTrips] = useState<DriverTrip[]>([]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      const fetchDriverTrips = async () => {
        try {
          const { data, error } = await supabase
            .from('driver_trips')
            .select('*');
          if (error) {
            console.warn("Error loading driver trips from Supabase:", error.message);
          } else if (data && data.length > 0) {
            const mapped: DriverTrip[] = data.map((t: any) => ({
              id: t.id,
              from: t.from,
              to: t.to,
              date: t.date,
              time: t.time,
              passengerCount: Number(t.passenger_count),
              maxPassengers: Number(t.max_passengers),
              status: t.status as any,
              boardingPlace: t.boarding_place || undefined,
            }));
            setDriverTrips(mapped);
          } else {
            setDriverTrips([]);
          }
        } catch (err: any) {
          console.warn("Supabase driver trips fetch warning:", err?.message || err);
        }
      };
      fetchDriverTrips();

      const interval = setInterval(fetchDriverTrips, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured && driverPhone) {
      const fetchOnlineStatus = async () => {
        try {
          const formattedPhone = driverPhone.trim();
          const phoneQueries = [formattedPhone];
          if (!formattedPhone.startsWith('+221')) {
            phoneQueries.push('+221 ' + formattedPhone);
            phoneQueries.push('+221' + formattedPhone);
          } else {
            phoneQueries.push(formattedPhone.replace(/^\+221\s*/, ''));
          }

          const { data, error } = await supabase
            .from('drivers')
            .select('is_online')
            .in('phone', phoneQueries);

          if (error) {
            console.warn("Error fetching online status from Supabase:", error.message);
          } else if (data && data.length > 0) {
            setIsOnline(!!data[0].is_online);
          }
        } catch (err: any) {
          console.warn("Failed to fetch online status:", err);
        }
      };
      fetchOnlineStatus();

      const interval = setInterval(fetchOnlineStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [driverPhone]);

  const toggleOnlineStatus = async () => {
    const nextOnlineStatus = !isOnline;
    
    // Optimistic UI update
    setIsOnline(nextOnlineStatus);
    
    if (isSupabaseConfigured) {
      try {
        const driverId = localStorage.getItem('dem_driver_id');
        let updateQuery;
        
        if (driverId) {
          updateQuery = supabase
            .from('drivers')
            .update({ is_online: nextOnlineStatus })
            .eq('id', driverId);
        } else if (driverPhone) {
          const formattedPhone = driverPhone.trim();
          const phoneQueries = [formattedPhone];
          if (!formattedPhone.startsWith('+221')) {
            phoneQueries.push('+221 ' + formattedPhone);
            phoneQueries.push('+221' + formattedPhone);
          } else {
            phoneQueries.push(formattedPhone.replace(/^\+221\s*/, ''));
          }
          
          updateQuery = supabase
            .from('drivers')
            .update({ is_online: nextOnlineStatus })
            .in('phone', phoneQueries);
        }
        
        if (updateQuery) {
          const { error } = await updateQuery;
          if (error) {
            console.warn("Failed to update is_online in Supabase:", error.message);
          } else {
            console.log("Successfully updated driver online status in Supabase to:", nextOnlineStatus);
          }
        }
      } catch (err: any) {
        console.warn("Error toggling online status in Supabase:", err);
      }
    }
  };

  const getTripSortScore = (trip: DriverTrip): number => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    let day = now.getDate();

    const dateStr = trip.date;
    if (dateStr && !dateStr.toLowerCase().includes("aujourd'hui")) {
      const match = dateStr.match(/^(\d+)\s+([a-zA-Z\u00C0-\u00FF\w]+)/);
      if (match) {
        day = parseInt(match[1], 10);
        const mStr = match[2].toLowerCase();
        const months = [
          'jan', 'fév', 'mar', 'avr', 'mai', 'juin',
          'juil', 'aoû', 'sep', 'oct', 'nov', 'déc'
        ];
        const foundMonth = months.findIndex(m => mStr.startsWith(m));
        if (foundMonth !== -1) {
          month = foundMonth;
        }
      }
    }

    let hour = 12;
    let minute = 0;
    const timeStr = trip.time.replace('H', ':');
    const timeParts = timeStr.split(':');
    if (timeParts.length >= 2) {
      hour = parseInt(timeParts[0], 10) || 0;
      minute = parseInt(timeParts[1], 10) || 0;
    }

    return new Date(year, month, day, hour, minute).getTime();
  };

  const sortedActiveTrips = [...driverTrips]
    .filter(t => t.status === 'pending' || t.status === 'running')
    .sort((a, b) => {
      if (a.status === 'running' && b.status !== 'running') return -1;
      if (b.status === 'running' && a.status !== 'running') return 1;
      return getTripSortScore(a) - getTripSortScore(b);
    });

  const activeTrip = sortedActiveTrips[0] || null;
  const upcomingTrips = [...driverTrips]
    .filter(t => t.status === 'pending' && (!activeTrip || t.id !== activeTrip.id))
    .sort((a, b) => getTripSortScore(a) - getTripSortScore(b));
  const completedTrips = driverTrips.filter(t => t.status === 'completed');
  const [portalTab, setPortalTab] = useState<'alerts' | 'upcoming' | 'completed'>('alerts');
  const [transactions, setTransactions] = useState<DriverTransaction[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create Trip States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTripFrom, setNewTripFrom] = useState('Dakar');
  const [newTripTo, setNewTripTo] = useState('Touba');
  const [newTripDate, setNewTripDate] = useState(getTodayISODate());
  const [newTripTime, setNewTripTime] = useState('12:00');
  const [newTripSeats, setNewTripSeats] = useState(15);
  const [newTripBoardingPlace, setNewTripBoardingPlace] = useState('');

  // Edit Trip States
  const [selectedTripForEdit, setSelectedTripForEdit] = useState<DriverTrip | null>(null);
  const [editTripPassengerCount, setEditTripPassengerCount] = useState<number>(0);
  const [editTripMaxPassengers, setEditTripMaxPassengers] = useState<number>(15);

  // Edit Profile States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editAvatar, setEditAvatar] = useState(driverAvatar);
  const [editName, setEditName] = useState(driverName);
  const [editEmail, setEditEmail] = useState(driverEmail);
  const [editPhone, setEditPhone] = useState(driverPhone);
  const [editLicense, setEditLicense] = useState(licenseType);
  const [editExperience, setEditExperience] = useState(experienceYears);
  const [editVehicleBrand, setEditVehicleBrand] = useState(vehicleBrand);
  const [editVehiclePlate, setEditVehiclePlate] = useState(vehiclePlate);
  const [editVehicleSeats, setEditVehicleSeats] = useState(vehicleSeats);
  const [editVehicleImage, setEditVehicleImage] = useState(vehicleImage);

  const handleOpenEditProfile = () => {
    setEditAvatar(driverAvatar);
    setEditName(driverName);
    setEditEmail(driverEmail);
    setEditPhone(driverPhone);
    setEditLicense(licenseType);
    setEditExperience(experienceYears);
    setEditVehicleBrand(vehicleBrand);
    setEditVehiclePlate(vehiclePlate);
    setEditVehicleSeats(vehicleSeats);
    setEditVehicleImage(vehicleImage);
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert("Le nom complet est obligatoire.");
      return;
    }
    if (!editPhone.trim()) {
      alert("Le numéro de téléphone est obligatoire.");
      return;
    }
    setDriverAvatar(editAvatar);
    setDriverName(editName);
    setDriverEmail(editEmail);
    setDriverPhone(editPhone);
    setDriverLicense(editLicense);
    setExperience(editExperience);
    setVehicleBrand(editVehicleBrand);
    setVehiclePlate(editVehiclePlate);
    setVehicleSeats(editVehicleSeats);
    setVehicleImage(editVehicleImage);

    // Save to localStorage to persist locally
    localStorage.setItem('dem_driver_name', editName);
    localStorage.setItem('dem_driver_phone', editPhone);
    localStorage.setItem('dem_driver_email', editEmail);
    localStorage.setItem('dem_driver_license', editLicense);
    localStorage.setItem('dem_driver_experience', editExperience);
    localStorage.setItem('dem_driver_vehicle_brand', editVehicleBrand);
    localStorage.setItem('dem_driver_vehicle_plate', editVehiclePlate);
    localStorage.setItem('dem_driver_vehicle_seats', editVehicleSeats);
    localStorage.setItem('dem_driver_avatar', editAvatar);
    localStorage.setItem('dem_driver_vehicle_image', editVehicleImage);

    // Sync profile to Supabase
    if (isSupabaseConfigured) {
      const driverId = localStorage.getItem('dem_driver_id');
      const updatedData = {
        name: editName,
        phone: editPhone,
        avatar: editAvatar,
        vehicle_name: editVehicleBrand,
        vehicle_plate: editVehiclePlate,
        seats_available: parseInt(editVehicleSeats) || 15
      };

      const updateQuery = driverId 
        ? supabase.from('drivers').update(updatedData).eq('id', driverId)
        : supabase.from('drivers').update(updatedData).eq('phone', driverPhone);

      updateQuery.then(({ error }) => {
        if (error) {
          console.warn("Erreur de mise à jour du profil dans Supabase:", error.message);
        } else {
          console.log("Profil mis à jour avec succès dans Supabase");
        }
      });
    }

    setIsEditProfileOpen(false);
  };

  const handleOpenEditModal = (trip: DriverTrip) => {
    setSelectedTripForEdit(trip);
    setEditTripPassengerCount(trip.passengerCount);
    setEditTripMaxPassengers(trip.maxPassengers);
  };

  const handleSaveEditTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripForEdit) return;

    if (editTripPassengerCount > editTripMaxPassengers) {
      alert("Le nombre de passagers ne peut pas dépasser la capacité maximale.");
      return;
    }

    setDriverTrips(prev => prev.map(t => {
      if (t.id === selectedTripForEdit.id) {
        return {
          ...t,
          passengerCount: editTripPassengerCount,
          maxPassengers: editTripMaxPassengers
        };
      }
      return t;
    }));

    // Sync to Supabase
    if (isSupabaseConfigured) {
      supabase.from('driver_trips').update({
        passenger_count: editTripPassengerCount,
        max_passengers: editTripMaxPassengers
      }).eq('id', selectedTripForEdit.id).then(({ error }) => {
        if (error) console.warn("Error updating trip in Supabase:", error.message);
      });
    }

    setSelectedTripForEdit(null);
    alert("Le trajet a été mis à jour avec succès !");
  };

  const handleCloseTripFromEdit = () => {
    if (!selectedTripForEdit) return;

    const earnings = editTripPassengerCount * 1200 || 18000;
    setWalletBalance(prev => prev + earnings);

    const newTx: DriverTransaction = {
      id: `t-${Date.now()}`,
      title: `Course ${selectedTripForEdit.from} ➜ ${selectedTripForEdit.to} (Clôturé)`,
      date: "Aujourd'hui, à l'instant",
      amount: earnings,
      type: 'income'
    };
    setTransactions([newTx, ...transactions]);

    setDriverTrips(prev => prev.map(t => {
      if (t.id === selectedTripForEdit.id) {
        return {
          ...t,
          passengerCount: editTripPassengerCount,
          maxPassengers: editTripMaxPassengers,
          status: 'completed'
        };
      }
      return t;
    }));

    // Sync to Supabase
    if (isSupabaseConfigured) {
      supabase.from('driver_trips').update({
        passenger_count: editTripPassengerCount,
        max_passengers: editTripMaxPassengers,
        status: 'completed'
      }).eq('id', selectedTripForEdit.id).then(({ error }) => {
        if (error) console.warn("Error completing trip in Supabase:", error.message);
      });
    }

    setSelectedTripForEdit(null);
    alert(`Félicitations ! Le trajet a été clôturé avec succès. Votre solde a été crédité de +${earnings.toLocaleString()} FCFA.`);
  };

  const formatToFrenchDate = (dateStr: string): string => {
    if (!dateStr) return 'Aujourd\'hui';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const months = [
        'Janv', 'Févr', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'
      ];
      return `${day} ${months[monthIndex] || 'Juin'}`;
    }
    return dateStr;
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTripFrom === newTripTo) {
      alert("La ville de départ et la ville de destination ne peuvent pas être identiques.");
      return;
    }
    const formattedDate = formatToFrenchDate(newTripDate);
    const newTrip: DriverTrip = {
      id: `dt-${Date.now()}`,
      from: newTripFrom,
      to: newTripTo,
      date: formattedDate,
      time: newTripTime || '12:00',
      passengerCount: 0,
      maxPassengers: Number(newTripSeats) || 15,
      status: 'pending',
      boardingPlace: newTripBoardingPlace || undefined
    };
    setDriverTrips([newTrip, ...driverTrips]);

    // Sync locally so passenger flow can see the trip instantly
    try {
      const saved = localStorage.getItem('dem_available_drivers');
      let currentDrivers = [];
      if (saved) {
        currentDrivers = JSON.parse(saved);
      }
      const newSearchDriver = {
        id: newTrip.id,
        name: driverName || "Moussa Diop",
        avatar: driverAvatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuAsMI9DoKFAVDDaoqwh1khlHQ8NPiAYTt8guT3fAZoykrOJuaQxfbEFKQQN82sOWKLoD2TTgVMLpa6g-_d8ltwSIMbakMQ9JddCiU1QUAOOeq15kHzgF216HhzcCcGPY4FNL9mT40Rj4k8kcf-tK-kdiabt4XgkKX2OBv0G58L25Yw4m2TVUb_tuD4PxrvMStAAmCdQF6LkoMA0vtf8dt2fAqohs52vsdbcvpI1JL9NQnRgpfPlHS22Lo48tL36M1uYn5buDUFpL5KA",
        rating: 4.9,
        tripsCount: 142,
        vehicleName: vehicleBrand || "Toyota Hiace",
        vehiclePlate: vehiclePlate || "DK-4521-A",
        departureTime: newTrip.time,
        terminus: newTrip.to,
        seatsAvailable: newTrip.maxPassengers,
        price: 6500,
        verified: 'CONFIRMÉ',
        phone: driverPhone || '+221 77 452 11 00',
        isDriverTrip: true,
        passengerCount: 0,
        maxPassengers: newTrip.maxPassengers,
        date: newTrip.date,
        from: newTrip.from,
        boardingPlace: newTrip.boardingPlace
      };
      localStorage.setItem('dem_available_drivers', JSON.stringify([newSearchDriver, ...currentDrivers]));
    } catch (err) {
      console.warn("Error syncing to dem_available_drivers:", err);
    }
    
    // Sync to Supabase
    if (isSupabaseConfigured) {
      supabase.from('driver_trips').insert([{
        id: newTrip.id,
        from: newTrip.from,
        to: newTrip.to,
        date: newTrip.date,
        time: newTrip.time,
        passenger_count: newTrip.passengerCount,
        max_passengers: newTrip.maxPassengers,
        status: newTrip.status,
        boarding_place: newTrip.boardingPlace,
      }]).then(({ error }) => {
        if (error) console.warn("Error inserting driver trip to Supabase:", error.message);
      });
    }

    setIsCreateModalOpen(false);
    setNewTripBoardingPlace('');
    alert(`Votre trajet ${newTripFrom} ➜ ${newTripTo} a été créé et publié avec succès ! Il est désormais votre trajet en cours.`);
  };

  // Submit become driver
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim()) {
      setDriverLoginError('Le nom complet est obligatoire');
      return;
    }
    if (!driverPhone.trim()) {
      setDriverLoginError('Le numéro de téléphone est obligatoire');
      return;
    }

    if (isSupabaseConfigured) {
      try {
        const { data: existingDriver, error: checkError } = await supabase
          .from('drivers')
          .select('*')
          .eq('phone', driverPhone.trim());

        if (checkError) {
          console.warn('Check existing driver error:', checkError.message);
        }

        if (existingDriver && existingDriver.length > 0) {
          const matchedDriver = existingDriver[0];
          setDriverName(matchedDriver.name);
          setDriverPhone(matchedDriver.phone);
          if (matchedDriver.avatar) setDriverAvatar(matchedDriver.avatar);
          if (matchedDriver.vehicle_name) setVehicleBrand(matchedDriver.vehicle_name);
          if (matchedDriver.vehicle_plate) setVehiclePlate(matchedDriver.vehicle_plate);
          if (matchedDriver.seats_available) setVehicleSeats(String(matchedDriver.seats_available));
          setIsOnline(!!matchedDriver.is_online);

          localStorage.setItem('dem_driver_id', matchedDriver.id);
          localStorage.setItem('dem_driver_name', matchedDriver.name);
          localStorage.setItem('dem_driver_phone', matchedDriver.phone);
          if (matchedDriver.avatar) localStorage.setItem('dem_driver_avatar', matchedDriver.avatar);
          if (matchedDriver.vehicle_name) localStorage.setItem('dem_driver_vehicle_brand', matchedDriver.vehicle_name);
          if (matchedDriver.vehicle_plate) localStorage.setItem('dem_driver_vehicle_plate', matchedDriver.vehicle_plate);
          if (matchedDriver.seats_available) localStorage.setItem('dem_driver_vehicle_seats', String(matchedDriver.seats_available));

          setDriverLoginError('');
          setScreen('portal');
          return;
        }

        const id = 'driver_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const driverData: any = {
          id,
          name: driverName,
          avatar: driverAvatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsMI9DoKFAVDDaoqwh1khlHQ8NPiAYTt8guT3fAZoykrOJuaQxfbEFKQQN82sOWKLoD2TTgVMLpa6g-_d8ltwSIMbakMQ9JddCiU1QUAOOeq15kHzgF216HhzcCcGPY4FNL9mT40Rj4k8kcf-tK-kdiabt4XgkKX2OBv0G58L25Yw4m2TVUb_tuD4PxrvMStAAmCdQF6LkoMA0vtf8dt2fAqohs52vsdbcvpI1JL9NQnRgpfPlHS22Lo48tL36M1uYn5buDUFpL5KA',
          rating: 4.8,
          trips_count: 0,
          vehicle_name: vehicleBrand || 'Toyota Hiace',
          vehicle_plate: vehiclePlate || 'DK-4521-A',
          departure_time: '08:00',
          terminus: 'Tivaouane',
          seats_available: parseInt(vehicleSeats) || 15,
          price: 6000,
          verified: 'VÉRIFIÉE',
          phone: driverPhone,
          boarding_place: 'Dakar',
          is_online: true
        };

        let attempts = 0;
        let success = false;
        let lastError: any = null;

        while (attempts < 6 && !success) {
          const { error } = await supabase
            .from('drivers')
            .insert([driverData]);

          if (!error) {
            success = true;
            break;
          }

          lastError = error;
          console.warn(`Driver insert attempt ${attempts} failed:`, error.message);

          let missingColumn: string | null = null;
          const matchSingleQuote = error.message.match(/column '([^']+)'/i) || error.message.match(/'([^']+)' column/i);
          if (matchSingleQuote && matchSingleQuote[1]) {
            missingColumn = matchSingleQuote[1];
          } else if (error.message.toLowerCase().includes('column')) {
            const words = error.message.replace(/['"]/g, '').split(/\s+/);
            for (const key of Object.keys(driverData)) {
              if (words.includes(key)) {
                missingColumn = key;
                break;
              }
            }
          }

          if (missingColumn && driverData[missingColumn] !== undefined) {
            console.warn(`Removing missing column '${missingColumn}' from payload and retrying...`);
            delete driverData[missingColumn];
          } else {
            break;
          }
          attempts++;
        }

        if (lastError && !success) {
          console.warn('Could not insert driver to Supabase after retries:', lastError.message);
        }

        localStorage.setItem('dem_driver_id', id);
        localStorage.setItem('dem_driver_name', driverName);
        localStorage.setItem('dem_driver_phone', driverPhone);
        localStorage.setItem('dem_driver_email', driverEmail);
        localStorage.setItem('dem_driver_license', licenseType);
        localStorage.setItem('dem_driver_experience', experienceYears);
        localStorage.setItem('dem_driver_vehicle_brand', vehicleBrand);
        localStorage.setItem('dem_driver_vehicle_plate', vehiclePlate);
        localStorage.setItem('dem_driver_vehicle_seats', vehicleSeats);
        localStorage.setItem('dem_driver_avatar', driverAvatar);
      } catch (err: any) {
        console.warn('Failed to register driver in Supabase (falling back to local):', err);
        localStorage.setItem('dem_driver_name', driverName);
        localStorage.setItem('dem_driver_phone', driverPhone);
      }
    } else {
      localStorage.setItem('dem_driver_name', driverName);
      localStorage.setItem('dem_driver_phone', driverPhone);
    }

    setDriverLoginError('');
    setScreen('portal');
  };

  // Submit driver login
  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginDriverName.trim()) {
      setDriverLoginError('Veuillez saisir votre nom complet');
      return;
    }
    if (!loginDriverPhone.trim()) {
      setDriverLoginError('Veuillez saisir votre numéro de téléphone');
      return;
    }

    if (isSupabaseConfigured) {
      try {
        const cleanPhone = loginDriverPhone.trim();
        const phoneQueries = [cleanPhone];
        if (!cleanPhone.startsWith('+221')) {
          phoneQueries.push('+221 ' + cleanPhone);
          phoneQueries.push('+221' + cleanPhone);
        } else {
          phoneQueries.push(cleanPhone.replace(/^\+221\s*/, ''));
        }

        const { data, error } = await supabase
          .from('drivers')
          .select('*')
          .in('phone', phoneQueries);

        if (error) {
          console.warn('Supabase driver login error (falling back to local):', error.message);
          setDriverName(loginDriverName);
          setDriverPhone(loginDriverPhone);
          setDriverLoginError('');
          setScreen('portal');
          return;
        }

        const matchedDriver = data && data.length > 0 ? data[0] : null;

        if (matchedDriver) {
          setDriverName(matchedDriver.name);
          setDriverPhone(matchedDriver.phone);
          if (matchedDriver.avatar) setDriverAvatar(matchedDriver.avatar);
          if (matchedDriver.vehicle_name) setVehicleBrand(matchedDriver.vehicle_name);
          if (matchedDriver.vehicle_plate) setVehiclePlate(matchedDriver.vehicle_plate);
          if (matchedDriver.seats_available) setVehicleSeats(String(matchedDriver.seats_available));
          setIsOnline(!!matchedDriver.is_online);

          localStorage.setItem('dem_driver_id', matchedDriver.id);
          localStorage.setItem('dem_driver_name', matchedDriver.name);
          localStorage.setItem('dem_driver_phone', matchedDriver.phone);
          if (matchedDriver.avatar) localStorage.setItem('dem_driver_avatar', matchedDriver.avatar);
          if (matchedDriver.vehicle_name) localStorage.setItem('dem_driver_vehicle_brand', matchedDriver.vehicle_name);
          if (matchedDriver.vehicle_plate) localStorage.setItem('dem_driver_vehicle_plate', matchedDriver.vehicle_plate);
          if (matchedDriver.seats_available) localStorage.setItem('dem_driver_vehicle_seats', String(matchedDriver.seats_available));
        } else {
          // Si le chauffeur n'existe pas encore, on le crée en tant que nouveau partenaire de démo
          const id = 'driver_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          const driverData: any = {
            id,
            name: loginDriverName,
            avatar: driverAvatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsMI9DoKFAVDDaoqwh1khlHQ8NPiAYTt8guT3fAZoykrOJuaQxfbEFKQQN82sOWKLoD2TTgVMLpa6g-_d8ltwSIMbakMQ9JddCiU1QUAOOeq15kHzgF216HhzcCcGPY4FNL9mT40Rj4k8kcf-tK-kdiabt4XgkKX2OBv0G58L25Yw4m2TVUb_tuD4PxrvMStAAmCdQF6LkoMA0vtf8dt2fAqohs52vsdbcvpI1JL9NQnRgpfPlHS22Lo48tL36M1uYn5buDUFpL5KA',
            rating: 4.8,
            trips_count: 12,
            vehicle_name: vehicleBrand || 'Toyota Hiace',
            vehicle_plate: vehiclePlate || 'DK-4521-A',
            departure_time: '08:00',
            terminus: 'Tivaouane',
            seats_available: parseInt(vehicleSeats) || 15,
            price: 6000,
            verified: 'VÉRIFIÉE',
            phone: loginDriverPhone,
            boarding_place: 'Dakar',
            is_online: true
          };

          let insertAttempts = 0;
          let insertSuccess = false;
          let lastInsertError: any = null;

          while (insertAttempts < 6 && !insertSuccess) {
            const { error: insertError } = await supabase
              .from('drivers')
              .insert([driverData]);

            if (!insertError) {
              insertSuccess = true;
              break;
            }

            lastInsertError = insertError;
            console.warn(`Driver auto-registration insert attempt ${insertAttempts} failed:`, insertError.message);

            let missingColumn: string | null = null;
            const matchSingleQuote = insertError.message.match(/column '([^']+)'/i) || insertError.message.match(/'([^']+)' column/i);
            if (matchSingleQuote && matchSingleQuote[1]) {
              missingColumn = matchSingleQuote[1];
            } else if (insertError.message.toLowerCase().includes('column')) {
              const words = insertError.message.replace(/['"]/g, '').split(/\s+/);
              for (const key of Object.keys(driverData)) {
                if (words.includes(key)) {
                  missingColumn = key;
                  break;
                }
              }
            }

            if (missingColumn && driverData[missingColumn] !== undefined) {
              console.warn(`Removing missing column '${missingColumn}' from login payload and retrying...`);
              delete driverData[missingColumn];
            } else {
              break;
            }
            insertAttempts++;
          }

          if (lastInsertError && !insertSuccess) {
            console.warn('Auto-registration error on driver login:', lastInsertError.message);
          }

          setDriverName(loginDriverName);
          setDriverPhone(loginDriverPhone);
          setIsOnline(true);

          localStorage.setItem('dem_driver_id', id);
          localStorage.setItem('dem_driver_name', loginDriverName);
          localStorage.setItem('dem_driver_phone', loginDriverPhone);
        }
      } catch (err: any) {
        console.warn('Unexpected error in login (falling back to local):', err.message);
        setDriverName(loginDriverName);
        setDriverPhone(loginDriverPhone);
      }
    } else {
      setDriverName(loginDriverName);
      setDriverPhone(loginDriverPhone);
    }

    setDriverLoginError('');
    setScreen('portal');
  };

  // Trigger simulated Refresh of demands
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      alert("Aucune nouvelle demande disponible pour l'instant. Les alertes de trajet s'afficheront en temps réel.");
    }, 1200);
  };

  // Start trip simulation
  const handleStartTrip = () => {
    const currentActive = driverTrips.find(t => t.status === 'pending' || t.status === 'running');
    if (!currentActive) return;

    if (currentActive.status === 'pending') {
      setDriverTrips(prev => prev.map(t => t.id === currentActive.id ? { ...t, status: 'running' } : t));
      
      // Sync to Supabase
      if (isSupabaseConfigured) {
        supabase.from('driver_trips').update({ status: 'running' }).eq('id', currentActive.id).then(({ error }) => {
          if (error) console.warn("Error starting trip in Supabase:", error.message);
        });
      }
      
      alert(`Le trajet ${currentActive.from} ➜ ${currentActive.to} a démarré ! Les passagers ont été notifiés de votre départ.`);
    } else if (currentActive.status === 'running') {
      const passengers = currentActive.passengerCount || currentActive.maxPassengers;
      const earnings = passengers * 1200 || 18000;
      setWalletBalance(prev => prev + earnings);
      
      const newTx: DriverTransaction = {
        id: `t-${Date.now()}`,
        title: `Course ${currentActive.from} ➜ ${currentActive.to} (Clôturé)`,
        date: 'Aujourd\'hui, à l\'instant',
        amount: earnings,
        type: 'income'
      };
      setTransactions([newTx, ...transactions]);
      
      // Update trip status in list to completed
      setDriverTrips(prev => prev.map(t => t.id === currentActive.id ? { ...t, status: 'completed' } : t));
      
      // Sync to Supabase
      if (isSupabaseConfigured) {
        supabase.from('driver_trips').update({ status: 'completed' }).eq('id', currentActive.id).then(({ error }) => {
          if (error) console.warn("Error completing trip in Supabase:", error.message);
        });
      }

      alert(`Félicitations ! Trajet clôturé. Votre solde a été crédité de +${earnings.toLocaleString()} FCFA.`);
    }
  };

  // Pay commission
  const handlePayCommission = () => {
    if (isCommissionPaid) return;
    
    // Open the Wave payment link
    window.open("https://pay.wave.com/m/M_sn_f_tcYvA8qrtr/c/sn/", "_blank");
    
    setIsCommissionPaid(true);
    setWalletBalance(prev => prev - 200);
    
    const newTx: DriverTransaction = {
      id: `t-${Date.now()}`,
      title: 'Paiement Commission',
      date: 'Aujourd\'hui, à l\'instant',
      amount: -200,
      type: 'commission'
    };
    setTransactions([newTx, ...transactions]);
    alert("Veuillez payer DEM niou_dem avec Wave en cliquant sur ce lien https://pay.wave.com/m/M_sn_f_tcYvA8qrtr/c/sn/. Ajoutez cet expéditeur à vos contacts pour rendre le lien cliquable.");
  };

  // Simulate Appointment tech maintenance
  const handleBookMaintenance = () => {
    alert("Votre rendez-vous pour le contrôle technique a été pré-enregistré au centre de contrôle de Colobane. Vous recevrez une confirmation SMS sous 24h.");
  };

  return (
    <div className="w-full max-w-[428px] min-h-screen bg-[#FAFAF8] relative overflow-hidden flex flex-col mx-auto shadow-2xl border-x border-gray-100">
      <AnimatePresence mode="wait">
        
        {/* SCREEN 1: PARTNER DRIVER REGISTRATION */}
        {currentScreen === 'register' && (
          <motion.div
            key="register"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col min-h-screen pb-10"
          >
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <img
                  alt="DEM niou_dem"
                  className="w-10 h-10 object-contain rounded-lg"
                  src="/src/assets/images/log.png"
                />
                <span className="font-space font-bold text-base text-[#10204A]">DEM niou_dem</span>
              </div>
              <button
                onClick={onBackToWelcome}
                className="p-2 rounded-full hover:bg-gray-100 text-[#10204A] cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </header>

            {/* Form Container */}
            <main className="px-5 py-6 space-y-6 flex-grow">
              <div className="text-left space-y-1">
                <h1 className="font-space font-bold text-xl text-[#10204A]">Devenir Chauffeur Partenaire</h1>
                <p className="font-sans text-xs text-gray-500">Rejoignez le réseau leader de transport au Sénégal et augmentez vos revenus.</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-6">
                {/* SECTION 1: Personal Info */}
                <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4 text-left">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-2 text-[#10204A]">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                    <h2 className="font-space font-bold text-sm">Infos Personnelles</h2>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-sans font-semibold text-[11px] text-[#10204A]">Nom Complet</label>
                    <input
                      type="text"
                      required
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-xs font-sans focus:outline-none focus:border-[#3d5ba9] transition-all"
                      placeholder="Prénom et Nom"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-sans font-semibold text-[11px] text-[#10204A]">Email</label>
                    <input
                      type="email"
                      required
                      value={driverEmail}
                      onChange={(e) => setDriverEmail(e.target.value)}
                      className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-xs font-sans focus:outline-none focus:border-[#3d5ba9] transition-all"
                      placeholder="votre@email.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-sans font-semibold text-[11px] text-[#10204A]">Téléphone</label>
                    <div className="flex h-11">
                      <div className="flex items-center justify-center px-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl font-mono text-xs text-gray-500">
                        +221
                      </div>
                      <input
                        type="tel"
                        required
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        className="flex-grow bg-white border border-gray-200 rounded-r-xl px-4 text-xs font-mono focus:outline-none focus:border-[#3d5ba9] transition-all"
                        placeholder="77 000 00 00"
                      />
                    </div>
                  </div>
                </section>

                {/* SECTION 2: Professional Details */}
                <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4 text-left">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-2 text-[#10204A]">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
                    <h2 className="font-space font-bold text-sm">Détails Professionnels</h2>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-sans font-semibold text-[11px] text-[#10204A]">Type de Permis</label>
                    <select
                      value={licenseType}
                      onChange={(e) => setDriverLicense(e.target.value)}
                      className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-xs font-sans focus:outline-none focus:border-[#3d5ba9] cursor-pointer"
                    >
                      <option value="B">Permis B (Léger)</option>
                      <option value="C">Permis C (Poids Lourd)</option>
                      <option value="D">Permis D (Transport en commun)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-sans font-semibold text-[11px] text-[#10204A]">Années d'Expérience</label>
                    <input
                      type="number"
                      required
                      value={experienceYears}
                      onChange={(e) => setExperience(e.target.value)}
                      min="0"
                      className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-xs font-mono focus:outline-none focus:border-[#3d5ba9]"
                      placeholder="Ex: 5"
                    />
                  </div>
                </section>

                {/* SECTION 3: Vehicle Info */}
                <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4 text-left">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-2 text-[#10204A]">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>directions_car</span>
                    <h2 className="font-space font-bold text-sm">Infos Véhicule</h2>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-sans font-semibold text-[11px] text-[#10204A]">Marque &amp; Modèle</label>
                    <input
                      type="text"
                      required
                      value={vehicleBrand}
                      onChange={(e) => setVehicleBrand(e.target.value)}
                      className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-xs font-sans focus:outline-none focus:border-[#3d5ba9]"
                      placeholder="Ex: Toyota Hiace"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-sans font-semibold text-[11px] text-[#10204A]">Plaque d'Immatriculation</label>
                    <input
                      type="text"
                      required
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                      className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-xs font-mono uppercase focus:outline-none focus:border-[#3d5ba9]"
                      placeholder="DK-0000-XX"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-sans font-semibold text-[11px] text-[#10204A]">Nombre de Places</label>
                    <input
                      type="number"
                      required
                      value={vehicleSeats}
                      onChange={(e) => setVehicleSeats(e.target.value)}
                      min="1"
                      className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-xs font-mono focus:outline-none focus:border-[#3d5ba9]"
                      placeholder="Ex: 15"
                    />
                  </div>
                </section>

                {/* CTA actions */}
                <div className="flex flex-col gap-3 py-4">
                  <button
                    type="submit"
                    className="w-full h-14 bg-brand-orange text-white font-space font-bold text-sm rounded-xl shadow-lg shadow-brand-orange/20 hover:brightness-105 active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Devenir Chauffeur Partenaire</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>

                  <div className="flex flex-col items-center gap-2 py-4">
                    <span className="font-sans text-xs text-gray-500">Déjà un compte ?</span>
                    <button
                      type="button"
                      onClick={() => setScreen('login')}
                      className="font-space text-sm text-[#10204A] font-bold border-b-2 border-[#10204A] pb-0.5"
                    >
                      Se connecter
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={onBackToWelcome}
                    className="text-center font-sans text-xs text-gray-500 hover:text-[#10204A] transition-colors cursor-pointer"
                  >
                    Retour à l'accueil
                  </button>
                </div>
              </form>
            </main>
          </motion.div>
        )}

        {/* SCREEN 1.5: PARTNER DRIVER LOGIN */}
        {currentScreen === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col min-h-screen pb-10"
          >
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <img
                  alt="DEM niou_dem"
                  className="w-10 h-10 object-contain rounded-lg"
                  src="/src/assets/images/log.png"
                />
                <span className="font-space font-bold text-base text-[#10204A]">DEM niou_dem</span>
              </div>
              <button
                onClick={() => setScreen('register')}
                className="p-2 rounded-full hover:bg-gray-100 text-[#10204A] cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </button>
            </header>

            {/* Form Container */}
            <main className="px-5 py-6 space-y-6 flex-grow flex flex-col justify-between">
              <div className="text-left space-y-1">
                <h1 className="font-space font-bold text-xl text-[#10204A]">Se Connecter (Chauffeur)</h1>
                <p className="font-sans text-xs text-gray-500">
                  Saisissez vos coordonnées de chauffeur partenaire pour accéder à vos courses en cours et alertes.
                </p>
              </div>

              <form onSubmit={handleDriverLogin} className="space-y-6 flex-grow mt-4">
                {driverLoginError && (
                  <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-100 font-sans text-left">
                    {driverLoginError}
                  </div>
                )}

                <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4 text-left">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-2 text-[#10204A]">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>login</span>
                    <h2 className="font-space font-bold text-sm">Identifiants de Connexion</h2>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-sans font-semibold text-[11px] text-[#10204A]">Nom Complet</label>
                    <input
                      type="text"
                      required
                      value={loginDriverName}
                      onChange={(e) => setLoginDriverName(e.target.value)}
                      className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-xs font-sans focus:outline-none focus:border-[#3d5ba9] transition-all"
                      placeholder="Prénom et Nom"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-sans font-semibold text-[11px] text-[#10204A]">Téléphone</label>
                    <div className="flex h-11">
                      <div className="flex items-center justify-center px-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl font-mono text-xs text-gray-500">
                        +221
                      </div>
                      <input
                        type="tel"
                        required
                        value={loginDriverPhone}
                        onChange={(e) => setLoginDriverPhone(e.target.value)}
                        className="flex-grow bg-white border border-gray-200 rounded-r-xl px-4 text-xs font-mono focus:outline-none focus:border-[#3d5ba9] transition-all"
                        placeholder="77 452 11 00"
                      />
                    </div>
                  </div>
                </section>

                {/* CTA actions */}
                <div className="flex flex-col gap-3 py-4">
                  <button
                    type="submit"
                    className="w-full h-14 bg-brand-orange text-white font-space font-bold text-sm rounded-xl shadow-lg shadow-brand-orange/20 hover:brightness-105 active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Se connecter à mon espace</span>
                    <span className="material-symbols-outlined text-base">login</span>
                  </button>

                  <div className="flex flex-col items-center gap-2 py-4">
                    <span className="font-sans text-xs text-gray-500">Nouveau chauffeur partenaire ?</span>
                    <button
                      type="button"
                      onClick={() => setScreen('register')}
                      className="font-space text-sm text-[#3d5ba9] font-bold border-b-2 border-[#3d5ba9] pb-0.5"
                    >
                      S'inscrire
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={onBackToWelcome}
                    className="text-center font-sans text-xs text-gray-500 hover:text-[#10204A] transition-colors cursor-pointer"
                  >
                    Retour à l'accueil
                  </button>
                </div>
              </form>
            </main>
          </motion.div>
        )}

        {/* SCREEN 2: ACTIVE DRIVER HOME DASHBOARD */}
        {currentScreen === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col min-h-screen pb-24 text-left"
          >
            {/* Header top bar */}
            <header className="sticky top-0 z-50 h-16 bg-[#3d5ba9] text-white shadow-md flex items-center justify-between px-5">
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setScreen('profil')}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-mono font-bold text-sm shadow-sm cursor-pointer overflow-hidden border border-white/20"
                >
                  <img
                    src={driverAvatar}
                    alt="Moussa"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-space font-bold text-sm text-white">{driverName}</span>
                  <div className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-gray-300'} ${isOnline ? 'animate-pulse' : ''}`} />
                    <span className={`text-[9px] uppercase font-bold ${isOnline ? 'text-green-300' : 'text-gray-300'} tracking-wider`}>
                      {isOnline ? 'Disponible' : 'Hors Ligne'}
                    </span>
                  </div>
                </div>
              </div>
            </header>

            {/* Core dashboard scroll content */}
            <main className="flex-grow px-5 py-6 space-y-6">
              {/* Active Trip Box */}
              <section className="space-y-3">
                <h3 className="font-space font-bold text-sm text-[#3d5ba9]">Trajet en cours</h3>
                {activeTrip ? (
                  <div
                    onClick={() => handleOpenEditModal(activeTrip)}
                    className="bg-white rounded-3xl p-5 shadow-sm border border-l-4 border-brand-orange border-gray-100 space-y-4 cursor-pointer hover:border-[#3d5ba9]/30 active:scale-[0.99] transition-all relative text-left"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-3 flex-1 text-left">
                        <span className="font-mono font-bold text-[9px] text-brand-orange bg-orange-50 px-2.5 py-0.5 rounded-full uppercase">
                          DÉPART {activeTrip.time}
                        </span>

                        {/* Map Points */}
                        <div className="flex flex-col gap-1.5 mt-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#3d5ba9] text-lg">trip_origin</span>
                            <span className="font-sans font-bold text-sm text-gray-800">{activeTrip.from}</span>
                          </div>
                          <div className="h-5 w-[1px] border-l-2 border-dotted border-gray-300 ml-2" />
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-brand-orange text-lg">location_on</span>
                            <span className="font-sans font-bold text-sm text-gray-800">{activeTrip.to}</span>
                          </div>
                        </div>
                      </div>

                      {/* Passenger capacity */}
                      <div className="bg-gray-50 rounded-xl p-3 text-center min-w-[85px] border border-gray-100 hover:bg-gray-100/80 transition-colors">
                        <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Passagers</p>
                        <p className="font-mono font-bold text-sm text-[#3d5ba9]">
                          {activeTrip.passengerCount}/{activeTrip.maxPassengers}
                        </p>
                        <span className="text-[8px] font-bold text-gray-500 uppercase flex items-center justify-center gap-0.5 mt-1">
                          <span className="material-symbols-outlined text-[10px]">edit</span> Gérer
                        </span>
                      </div>
                    </div>

                    <div className="w-full">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartTrip();
                        }}
                        className={`w-full py-3.5 rounded-xl font-space font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          activeTrip.status === 'running'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-[#3d5ba9] hover:bg-[#3d5ba9]/95 text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {activeTrip.status === 'running' ? 'check_circle' : 'play_circle'}
                        </span>
                        <span>
                          {activeTrip.status === 'running' ? 'Clôturer' : 'Démarrer'}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-white rounded-3xl border border-gray-100 text-center text-xs text-gray-400 font-sans">
                    Aucun trajet en cours. Créez-en un avec le bouton "+" ci-dessous.
                  </div>
                )}
              </section>

              {/* Upcoming Trips */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-space font-bold text-sm text-[#3d5ba9]">Trajets planifiés</h3>
                  <button onClick={() => setScreen('portal')} className="text-[#3d5ba9] font-mono text-xs">
                    Tout voir
                  </button>
                </div>

                <div className="space-y-3">
                  {upcomingTrips.length > 0 ? (
                    upcomingTrips.map((trip) => {
                      const dateParts = trip.date.split(' ');
                      const day = dateParts[0] || '24';
                      const month = dateParts[1] ? dateParts[1].toUpperCase() : 'JUIN';

                      return (
                        <div
                          key={trip.id}
                          onClick={() => handleOpenEditModal(trip)}
                          className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-gray-100 shadow-sm cursor-pointer hover:border-[#3d5ba9]/30 active:scale-98 transition-all text-left"
                        >
                          <div className="w-11 h-11 bg-gray-50 rounded-xl flex flex-col items-center justify-center text-[#3d5ba9] border border-gray-100 shrink-0">
                            <span className="font-mono text-xs font-bold leading-none">{day}</span>
                            <span className="text-[8px] uppercase font-bold leading-none mt-0.5">{month}</span>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-space font-bold text-sm text-[#10204A]">{trip.from} ➜ {trip.to}</p>
                            <p className="text-gray-400 text-xs flex items-center gap-1.5 mt-0.5">
                              <span className="material-symbols-outlined text-xs">schedule</span> {trip.time}
                              <span className="inline-block w-1 h-1 bg-gray-300 rounded-full" />
                              <span className="material-symbols-outlined text-xs">group</span> {trip.passengerCount}/{trip.maxPassengers} pl.
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 bg-white rounded-2xl border border-gray-100 text-center text-xs text-gray-400 font-sans">
                      Aucun autre trajet planifié pour l'instant.
                    </div>
                  )}
                </div>
              </section>

              {/* Quick Actions bento grid */}
              <section className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => alert("Scanner de ticket QR activé ! Prêt à valider les passagers.")}
                  className="bg-gray-100 rounded-2xl p-4 flex flex-col gap-2 hover:bg-gray-200 transition-colors cursor-pointer text-left"
                >
                  <span className="material-symbols-outlined text-[#3d5ba9] text-xl font-bold">qr_code_scanner</span>
                  <span className="font-space font-bold text-xs text-gray-800">Scanner Ticket</span>
                </div>
                <a
                  href="https://wa.me/221772783150"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-100 rounded-2xl p-4 flex flex-col gap-2 hover:bg-gray-200 transition-colors cursor-pointer text-left block"
                >
                  <span className="material-symbols-outlined text-[#3d5ba9] text-xl font-bold">support_agent</span>
                  <span className="font-space font-bold text-xs text-gray-800">Assistance</span>
                </a>
              </section>
            </main>

            {/* Sticky Bottom Nav */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] h-16 bg-white border-t border-gray-150 flex justify-around items-center px-2 pb-2 z-30 shadow-md rounded-t-2xl">
              <button onClick={() => setScreen('portal')} className="flex flex-col items-center text-gray-400 py-1 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-xl">route</span>
                <span className="font-sans text-[10px] mt-0.5">Courses</span>
              </button>
              <button className="flex flex-col items-center text-[#3d5ba9] relative py-1 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>directions_bus</span>
                <span className="font-sans text-[10px] mt-0.5 font-bold">Mes Trajets</span>
                <span className="absolute -top-1.5 w-1 h-1 bg-[#3d5ba9] rounded-full" />
              </button>

              {/* Central Floating Button Action to add trip */}
              <div className="relative -mt-6">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-12 h-12 bg-[#3d5ba9] text-white rounded-full shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-transform border-2 border-white"
                >
                  <span className="material-symbols-outlined text-2xl font-bold">add</span>
                </button>
              </div>

              <button onClick={() => setScreen('revenus')} className="flex flex-col items-center text-gray-400 py-1 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-xl">payments</span>
                <span className="font-sans text-[10px] mt-0.5">Revenus</span>
              </button>
              <button onClick={() => setScreen('profil')} className="flex flex-col items-center text-gray-400 py-1 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-xl">person</span>
                <span className="font-sans text-[10px] mt-0.5">Profil</span>
              </button>
            </nav>
          </motion.div>
        )}

        {/* SCREEN 3: DRIVER EMPTY STATE ALERTS / PORTAL */}
        {currentScreen === 'portal' && (
          <motion.div
            key="portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col min-h-screen pb-24 text-left bg-[#FAFAF8]"
          >
            {/* Header blue bar */}
            <header className="bg-[#1B3D8A] text-white pt-10 pb-6 px-5 rounded-b-[32px] shadow-md shrink-0">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => setScreen('profil')}
                    className="w-11 h-11 rounded-full border-2 border-brand-orange bg-white/10 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={driverAvatar}
                      alt={driverName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h1 className="font-space font-bold text-sm leading-tight">{driverName}</h1>
                    <div className="flex items-center gap-1.5 opacity-90">
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                      <span className="font-sans text-[10px] font-bold">
                        {isOnline ? 'Disponible (En ligne)' : 'Hors ligne'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button className="relative p-1.5 rounded-full hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-lg">download</span>
                  </button>
                  <button className="relative p-1.5 rounded-full hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-lg">notifications</span>
                    <span className="absolute top-1 right-1 w-2 h-2 bg-brand-orange rounded-full" />
                  </button>
                </div>
              </div>

              {/* Wallet bar */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex items-center justify-between border border-white/20">
                <div className="space-y-0.5">
                  <p className="font-mono text-[9px] text-white/70 uppercase">Solde Compte</p>
                  <p className="font-mono text-xs font-bold text-green-300">
                    <span className="text-base font-extrabold">17 950</span> FCFA
                  </p>
                </div>
                <div className="flex items-center gap-2" title="Changer de statut">
                  <span className="font-sans text-[11px] text-white/80 flex items-center gap-1">
                    Statut
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOnline}
                      onChange={toggleOnlineStatus}
                      className="sr-only peer"
                    />
                    <div 
                      onClick={toggleOnlineStatus}
                      className="w-9 h-5 bg-white/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500 cursor-pointer" 
                    />
                  </label>
                </div>
              </div>
            </header>

            {/* Alert sub-tabs list */}
            <main className="flex-grow px-5 pt-6">
              <div className="flex bg-gray-100 rounded-xl p-1 mb-6 border border-gray-200/50">
                <button
                  onClick={() => setPortalTab('alerts')}
                  className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                    portalTab === 'alerts'
                      ? 'bg-[#1B3D8A] text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-200/50'
                  }`}
                >
                  Alertes ({bookings.filter(b => b.status === 'pending').length})
                </button>
                <button
                  onClick={() => setPortalTab('upcoming')}
                  className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                    portalTab === 'upcoming'
                      ? 'bg-[#1B3D8A] text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-200/50'
                  }`}
                >
                  Bientôt ({upcomingTrips.length + bookings.filter(b => b.status === 'accepted' || b.status === 'active').length})
                </button>
                <button
                  onClick={() => setPortalTab('completed')}
                  className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                    portalTab === 'completed'
                      ? 'bg-[#1B3D8A] text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-200/50'
                  }`}
                >
                  Terminées ({completedTrips.length + bookings.filter(b => b.status === 'completed').length})
                </button>
              </div>

              {portalTab === 'alerts' && (
                <>
                  {/* Action refresh */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">Demandes en attente</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#1B3D8A] text-[#1B3D8A] font-mono text-[10px] hover:bg-gray-100"
                      >
                        <span className={`material-symbols-outlined text-sm ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
                        <span>Rafraîchir</span>
                      </button>
                      <span className="bg-orange-50 text-brand-orange px-2.5 py-1 rounded-full font-mono text-[10px] flex items-center gap-1 border border-orange-100">
                        <span className="w-1 h-1 bg-brand-orange rounded-full animate-ping" />
                        Activité intense
                      </span>
                    </div>
                  </div>

                  {bookings.filter(b => b.status === 'pending').length > 0 ? (
                    <div className="space-y-3 mt-2">
                      {bookings.filter(b => b.status === 'pending').map((b) => (
                        <div
                          key={b.id}
                          className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm text-left space-y-3 relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 bg-amber-50 text-amber-700 px-3 py-1 rounded-bl-xl text-[9px] font-bold font-mono uppercase tracking-wider flex items-center gap-1 border-l border-b border-amber-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Nouveau
                          </div>

                          {/* Route and Price */}
                          <div className="flex justify-between items-start pr-12">
                            <div>
                              <h4 className="font-space font-bold text-sm text-[#10204A]">
                                {b.from} <span className="text-brand-orange">➜</span> {b.to}
                              </h4>
                              <p className="text-[10px] font-mono text-gray-400 mt-0.5">REF: {b.reference}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-xs text-brand-orange bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100 block">
                                {b.price.toLocaleString('fr-FR')} F
                              </span>
                            </div>
                          </div>

                          {/* Date and Time */}
                          <div className="flex items-center gap-4 text-xs font-semibold text-gray-600 bg-gray-50/50 p-2 rounded-xl">
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-[#1B3D8A]">calendar_today</span>
                              <span>{b.date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-[#1B3D8A]">schedule</span>
                              <span>{b.time}</span>
                            </div>
                          </div>

                          {/* Passenger info */}
                          <div className="space-y-1.5 border-t border-b border-gray-100 py-2.5 text-xs text-gray-600">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-gray-400">person</span>
                              <span className="font-bold text-gray-800">{b.passengerName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-gray-400">phone</span>
                              <span className="font-mono text-gray-400 tracking-wider flex items-center gap-1.5">
                                •• ••• •• ••
                                <span className="text-[9px] text-amber-600 font-sans font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-normal">
                                  Masqué (Acceptez pour voir)
                                </span>
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-sm text-gray-400 shrink-0 mt-0.5">location_on</span>
                              <span className="text-gray-700 leading-tight">
                                Prise en charge: <strong className="text-gray-900">{b.pickupAddress}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Accept / Refuse Actions */}
                          <div className="grid grid-cols-2 gap-2.5 pt-1">
                            <button
                              onClick={() => {
                                onUpdateBookingStatus(b.id, 'refused');
                                alert("Réservation refusée avec succès.");
                              }}
                              className="border border-red-200 hover:bg-red-50 text-red-600 font-space font-bold text-[11px] py-2.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                              <span>Refuser</span>
                            </button>
                            <button
                              onClick={() => {
                                onUpdateBookingStatus(b.id, 'accepted');
                                alert("Réservation acceptée avec succès ! Le passager en est notifié.");
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white font-space font-bold text-[11px] py-2.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                            >
                              <span className="material-symbols-outlined text-sm">check</span>
                              <span>Accepter</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Empty state visual */
                    <div className="bg-white rounded-[24px] p-6 border border-gray-150 shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#1B3D8A]/5 rounded-bl-full -mr-16 -mt-16" />
                      <div className="w-16 h-16 bg-[#F4F7FF] rounded-full flex items-center justify-center mb-6 text-[#1B3D8A]">
                        <span className="material-symbols-outlined text-2xl font-bold">route</span>
                      </div>
                      <h3 className="font-space font-bold text-sm text-[#10204A] mb-2">Aucune nouvelle demande</h3>
                      <p className="font-sans text-[11px] text-gray-500 max-w-[270px] leading-relaxed">
                        Les réservations inter-villes (<span className="font-semibold text-[#1B3D8A]">Dakar, Thiès, Tivaouane, Touba</span>) apparaîtront ici en temps réel dès que l'un des clients placera une commande.
                      </p>

                      {/* Pulse visual ring */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-40 h-40 border border-[#1B3D8A]/5 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {portalTab === 'upcoming' && (
                <div className="space-y-4">
                  {/* Accepted passenger bookings */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">Réservations validées</span>
                      <span className="text-xs font-bold text-green-600">
                        {bookings.filter(b => b.status === 'accepted' || b.status === 'active').length} passagers
                      </span>
                    </div>

                    {bookings.filter(b => b.status === 'accepted' || b.status === 'active').length > 0 ? (
                      <div className="space-y-3">
                        {bookings.filter(b => b.status === 'accepted' || b.status === 'active').map((b) => (
                          <div
                            key={b.id}
                            className="bg-white rounded-2xl p-4 border border-green-100 shadow-sm text-left space-y-2 relative"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-space font-bold text-xs text-[#10204A]">
                                  {b.from} <span className="text-brand-orange">➜</span> {b.to}
                                </h4>
                                <p className="text-[9px] font-mono text-gray-400">Passager: {b.passengerName}</p>
                              </div>
                              <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-[8px] font-bold border border-green-100 uppercase font-mono">
                                Validé
                              </span>
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-50 pt-2 text-[11px] text-gray-500">
                              <span className="font-mono text-[9px] text-gray-400">REF: {b.reference}</span>
                              <div className="flex items-center gap-1 text-[#10204A] font-semibold">
                                <span className="material-symbols-outlined text-[11px]">schedule</span>
                                <span>{b.time}</span>
                              </div>
                            </div>

                            <div className="bg-gray-50 p-2.5 rounded-xl space-y-1 text-[10px] text-gray-600">
                              <p className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">phone</span>
                                <a href={`tel:${b.phone}`} className="font-mono font-bold text-[#1B3D8A] hover:underline">{b.phone}</a>
                              </p>
                              <p className="text-gray-700 leading-tight">
                                <strong className="text-gray-900">Adresse:</strong> {b.pickupAddress}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                onUpdateBookingStatus(b.id, 'completed');
                                alert("Voyage clôturé ! Le client a été transféré dans l'historique.");
                              }}
                              className="w-full bg-[#1B3D8A] hover:bg-[#1B3D8A]/90 text-white font-space font-bold text-[10px] py-2 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                            >
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              <span>Marquer comme terminé (Clôturer)</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                        <p className="text-[11px] text-gray-400">Aucun passager en attente de voyage.</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200/60 my-4" />

                  <div className="flex items-center justify-between mb-1 pt-1">
                    <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Trajets planifiés</span>
                    <span className="text-xs font-bold text-[#1B3D8A]">{upcomingTrips.length} à venir</span>
                  </div>

                  {upcomingTrips.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingTrips.map((trip) => {
                        const dateParts = trip.date.split(' ');
                        const day = dateParts[0] || '24';
                        const month = dateParts[1] ? dateParts[1].toUpperCase() : 'JUIN';

                        return (
                          <div
                            key={trip.id}
                            onClick={() => handleOpenEditModal(trip)}
                            className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-gray-100 shadow-sm cursor-pointer hover:border-[#3d5ba9]/30 active:scale-98 transition-all text-left"
                          >
                            <div className="w-11 h-11 bg-gray-50 rounded-xl flex flex-col items-center justify-center text-[#3d5ba9] border border-gray-100 shrink-0">
                              <span className="font-mono text-xs font-bold leading-none">{day}</span>
                              <span className="text-[8px] uppercase font-bold leading-none mt-0.5">{month}</span>
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-space font-bold text-sm text-[#10204A]">{trip.from} ➜ {trip.to}</p>
                              <p className="text-gray-400 text-xs flex items-center gap-1.5 mt-0.5">
                                <span className="material-symbols-outlined text-xs">schedule</span> {trip.time}
                                <span className="inline-block w-1 h-1 bg-gray-300 rounded-full" />
                                <span className="material-symbols-outlined text-xs">group</span> {trip.passengerCount}/{trip.maxPassengers} pl.
                              </p>
                            </div>
                            <span className="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white rounded-[24px] p-6 border border-gray-150 shadow-sm flex flex-col items-center justify-center min-h-[220px] text-center relative overflow-hidden">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 text-gray-400">
                        <span className="material-symbols-outlined text-xl">event_busy</span>
                      </div>
                      <h4 className="font-space font-bold text-xs text-[#10204A] mb-1">Aucun trajet planifié</h4>
                      <p className="font-sans text-[11px] text-gray-400 max-w-[200px] leading-relaxed mx-auto">
                        Créez un nouveau trajet planifié à l'aide du bouton "+" de la barre de navigation.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {portalTab === 'completed' && (
                <div className="space-y-4">
                  {/* Completed passenger bookings */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">Réservations clôturées</span>
                      <span className="text-xs font-bold text-green-600">
                        {bookings.filter(b => b.status === 'completed').length} terminées
                      </span>
                    </div>

                    {bookings.filter(b => b.status === 'completed').length > 0 ? (
                      <div className="space-y-3">
                        {bookings.filter(b => b.status === 'completed').map((b) => (
                          <div
                            key={b.id}
                            className="bg-white/70 rounded-2xl p-4 border border-gray-150 shadow-xs text-left space-y-1.5 opacity-90"
                          >
                            <div className="flex justify-between items-center">
                              <h4 className="font-space font-bold text-xs text-[#10204A] line-through decoration-gray-400">
                                {b.from} ➜ {b.to}
                              </h4>
                              <span className="bg-green-50 text-green-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-mono border border-green-100">
                                Terminé
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-medium">Passager: {b.passengerName}</p>
                            <div className="flex justify-between text-[9px] font-mono text-gray-400">
                              <span>REF: {b.reference} • {b.date} à {b.time}</span>
                              <span className="text-green-600 font-bold">+{b.price} FCFA</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                        <p className="text-[11px] text-gray-400">Aucune réservation archivée.</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200/60 my-4" />

                  <div className="flex items-center justify-between mb-1 pt-1">
                    <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Historique des trajets</span>
                    <span className="text-xs font-bold text-green-600">{completedTrips.length} terminés</span>
                  </div>

                  {completedTrips.length > 0 ? (
                    <div className="space-y-3">
                      {completedTrips.map((trip) => {
                        const dateParts = trip.date.split(' ');
                        const day = dateParts[0] || '24';
                        const month = dateParts[1] ? dateParts[1].toUpperCase() : 'JUIN';

                        return (
                          <div
                            key={trip.id}
                            className="bg-white/75 rounded-2xl p-4 flex items-center gap-4 border border-gray-100 shadow-xs text-left opacity-90"
                          >
                            <div className="w-11 h-11 bg-green-50 rounded-xl flex flex-col items-center justify-center text-green-600 border border-green-100 shrink-0">
                              <span className="font-mono text-xs font-bold leading-none">{day}</span>
                              <span className="text-[8px] uppercase font-bold leading-none mt-0.5">{month}</span>
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-space font-bold text-sm text-[#10204A] line-through decoration-gray-400">{trip.from} ➜ {trip.to}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                  Terminé
                                </span>
                                <span className="text-gray-400 text-xs flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">group</span> {trip.passengerCount}/{trip.maxPassengers} pl.
                                </span>
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-green-500 text-xl">check_circle</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white rounded-[24px] p-6 border border-gray-150 shadow-sm flex flex-col items-center justify-center min-h-[220px] text-center relative overflow-hidden">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 text-gray-400">
                        <span className="material-symbols-outlined text-xl">history</span>
                      </div>
                      <h4 className="font-space font-bold text-xs text-[#10204A] mb-1">Aucun trajet terminé</h4>
                      <p className="font-sans text-[11px] text-gray-400 max-w-[200px] leading-relaxed mx-auto">
                        Vos trajets complétés apparaîtront ici après les avoir clôturés.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] h-16 bg-white border-t border-gray-150 flex justify-around items-center px-2 pb-2 z-30 shadow-md rounded-t-2xl">
              <button className="flex flex-col items-center text-[#1B3D8A] relative py-1 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>route</span>
                <span className="font-sans text-[10px] mt-0.5 font-bold">Courses</span>
                <span className="absolute -top-1.5 w-1 h-1 bg-[#1B3D8A] rounded-full" />
              </button>
              <button onClick={() => setScreen('home')} className="flex flex-col items-center text-gray-400 py-1 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-xl">directions_bus</span>
                <span className="font-sans text-[10px] mt-0.5">Mes Trajets</span>
              </button>

              {/* Central Floating Button Action to add trip */}
              <div className="relative -mt-6">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-12 h-12 bg-[#3d5ba9] text-white rounded-full shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-transform border-2 border-white"
                >
                  <span className="material-symbols-outlined text-2xl font-bold">add</span>
                </button>
              </div>

              <button onClick={() => setScreen('revenus')} className="flex flex-col items-center text-gray-400 py-1 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-xl">payments</span>
                <span className="font-sans text-[10px] mt-0.5">Revenus</span>
              </button>
              <button onClick={() => setScreen('profil')} className="flex flex-col items-center text-gray-400 py-1 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-xl">person</span>
                <span className="font-sans text-[10px] mt-0.5">Profil</span>
              </button>
            </nav>
          </motion.div>
        )}

        {/* SCREEN 4: DRIVER REVENUS / EARNINGS */}
        {currentScreen === 'revenus' && (
          <motion.div
            key="revenus"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col min-h-screen pb-24 text-left"
          >
            {/* Header top bar */}
            <header className="sticky top-0 z-50 bg-white border-b border-gray-150 h-16 flex items-center justify-between px-5 shrink-0">
              <h1 className="font-space font-bold text-sm text-[#3d5ba9]">Portail Revenus</h1>
              <div className="flex items-center gap-3">
                <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                  <span className="material-symbols-outlined text-xl">settings</span>
                </button>
              </div>
            </header>

            {/* Scrollable incomes */}
            <main className="px-5 py-6 space-y-6 flex-grow overflow-y-auto">
              {/* Cash Wallet stats */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-mono text-[9px] text-gray-400 uppercase tracking-wider mb-1">SOLDE COMPTE</p>
                  <p className="font-mono text-xl font-bold text-gray-800">{walletBalance.toLocaleString()} FCFA</p>
                </div>
                <div className="flex flex-col items-end gap-1.5" title="Changer de statut">
                  <span className="font-mono text-xs font-bold text-[#3d5ba9] flex items-center gap-1">
                    Statut
                  </span>
                  <div 
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} 
                    onClick={toggleOnlineStatus}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isOnline ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>

              {/* Total collected card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-l-4 border-[#3d5ba9] border-gray-100 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-sans text-gray-400 font-semibold">Total encaissé en espèces</span>
                  <span className="material-symbols-outlined text-[#3d5ba9] text-base">payments</span>
                </div>
                <p className="font-mono text-2xl font-bold text-gray-800">17 950 FCFA</p>
                <div className="pt-3 border-t border-gray-100 flex justify-between text-[10px] text-gray-400 font-mono">
                  <span>Dernière mise à jour</span>
                  <span>Il y a 5 min</span>
                </div>
              </div>

              {/* Solde encaissé du jour progress goal */}
              <div className="space-y-2">
                <div className="flex justify-between items-end text-xs">
                  <h3 className="font-space font-bold text-xs text-gray-800">Solde encaissé du jour</h3>
                  <span className="font-mono font-bold text-[#3d5ba9]">99%</span>
                </div>
                <div className="w-full bg-gray-150 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-[#3d5ba9] h-full rounded-full transition-all duration-500" style={{ width: '99%' }} />
                </div>
                <div className="flex justify-between font-mono text-[10px] text-gray-400">
                  <span>0 FCFA</span>
                  <span className="font-bold text-[#3d5ba9]">Objectif: 18 000 FCFA</span>
                </div>
              </div>

              {/* Commission orange pay card */}
              <div className="bg-[#101744] text-white rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-28 h-28 bg-white/5 rounded-full" />
                <div className="relative z-10 space-y-3 text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm font-bold text-white">account_balance_wallet</span>
                    </div>
                    <h3 className="font-space font-bold text-sm text-white">Payer ma commission</h3>
                  </div>
                  <p className="font-sans text-[11px] text-white/80 leading-relaxed">
                    Le paiement de la commission de 50 Fcfa / client est obligatoire pour continuer à recevoir des trajets et maintenir votre compte actif.
                  </p>

                  <button
                    onClick={handlePayCommission}
                    className={`w-full py-3 font-space font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isCommissionPaid
                        ? 'bg-green-600 text-white cursor-default'
                        : 'bg-brand-orange hover:bg-brand-orange/90 text-white shadow shadow-brand-orange/15'
                    }`}
                  >
                    {isCommissionPaid ? (
                      <>
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span>COMMISSION PAYÉE !</span>
                      </>
                    ) : (
                      <>
                        <span>PAYER VIA WAVE (50 Fcfa / client)</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Weekly bar chart stats */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-space font-bold text-sm text-[#10204A] mb-4 text-left">Historique hebdomadaire</h3>
                <div className="flex items-end justify-between h-32 pt-2">
                  {[
                    { day: 'LUN', height: '40px', val: '8k' },
                    { day: 'MAR', height: '55px', val: '12k' },
                    { day: 'MER', height: '30px', val: '6k' },
                    { day: 'JEU', height: '75px', val: '14k' },
                    { day: 'VEN', height: '100px', val: '18k', active: true },
                    { day: 'SAM', height: '65px', val: '13k' },
                    { day: 'DIM', height: '45px', val: '9k' }
                  ].map((bar, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 flex-1 relative group cursor-pointer">
                      <div className="text-[9px] font-bold text-gray-500 font-mono mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-4">
                        {bar.val}
                      </div>
                      
                      <div
                        style={{ height: bar.height }}
                        className={`w-6 rounded-t transition-all ${
                          bar.active ? 'bg-[#3d5ba9] shadow-sm shadow-[#3d5ba9]/10' : 'bg-blue-100 group-hover:bg-blue-200'
                        }`}
                      />
                      
                      <span className={`font-mono text-[9px] ${bar.active ? 'text-[#3d5ba9] font-bold' : 'text-gray-400'}`}>
                        {bar.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>


            </main>

            {/* Bottom sticky nav */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] h-16 bg-white border-t border-gray-150 flex justify-around items-center px-2 pb-2 z-30 shadow-md rounded-t-2xl">
              <button onClick={() => setScreen('portal')} className="flex flex-col items-center text-gray-400 py-1 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-xl">route</span>
                <span className="font-sans text-[10px] mt-0.5">Courses</span>
              </button>
              <button onClick={() => setScreen('home')} className="flex flex-col items-center text-gray-400 py-1 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-xl">directions_bus</span>
                <span className="font-sans text-[10px] mt-0.5">Mes Trajets</span>
              </button>

              {/* Central Floating Button Action to add trip */}
              <div className="relative -mt-6">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-12 h-12 bg-[#3d5ba9] text-white rounded-full shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-transform border-2 border-white"
                >
                  <span className="material-symbols-outlined text-2xl font-bold">add</span>
                </button>
              </div>

              <button className="flex flex-col items-center text-[#3d5ba9] relative py-1 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                <span className="font-sans text-[10px] mt-0.5 font-bold">Revenus</span>
                <span className="absolute -top-1.5 w-1 h-1 bg-[#3d5ba9] rounded-full" />
              </button>
              <button onClick={() => setScreen('profil')} className="flex flex-col items-center text-gray-400 py-1 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-xl">person</span>
                <span className="font-sans text-[10px] mt-0.5">Profil</span>
              </button>
            </nav>
          </motion.div>
        )}

        {/* SCREEN 5: DRIVER PROFILE AND DOCUMENTS */}
        {currentScreen === 'profil' && (
          <motion.div
            key="profil"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex flex-col min-h-screen pb-24 text-left"
          >
            {/* Profil header avatar */}
            <header className="flex flex-col items-center text-center pt-8 pb-4 bg-white border-b border-gray-100">
              <div className="relative mb-3">
                <div className="w-20 h-20 rounded-full border-4 border-[#ebedff] overflow-hidden shadow">
                  <img
                    src={driverAvatar}
                    alt="Moussa"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute bottom-0 right-0 bg-[#8fabff] text-[#1a3d8a] rounded-full p-0.5 border-2 border-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-xs font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                </div>
              </div>
              <h1 className="font-space font-bold text-base text-[#10204A]">{driverName}</h1>
              <span className="inline-flex items-center px-3 py-0.5 bg-[#e4e7ff] text-[#1a3d8a] rounded-full text-[10px] font-mono font-bold mt-1 uppercase">
                Chauffeur Vérifié
              </span>
              <button
                onClick={handleOpenEditProfile}
                className="mt-3 flex items-center gap-1 px-3.5 py-1.5 bg-[#F3F6FF] text-[#1B3D8A] rounded-full font-sans text-xs font-bold hover:bg-[#e4e7ff] transition-all cursor-pointer border border-[#ebedff]"
              >
                <span className="material-symbols-outlined text-xs">edit</span>
                <span>Modifier le profil</span>
              </button>
            </header>

            {/* Scroll view details */}
            <main className="px-5 py-6 space-y-6 overflow-y-auto">
              {/* Mon véhicule section */}
              <section className="space-y-3">
                <h2 className="font-space font-bold text-sm text-[#3d5ba9]">Mon véhicule</h2>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="h-36 w-full relative bg-gray-100">
                    <img
                      src={vehicleImage}
                      alt="Toyota Hiace minibus"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-space font-bold text-sm text-gray-800">{vehicleBrand}</span>
                      <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded font-mono text-xs border border-gray-200">
                        {vehiclePlate}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <span className="material-symbols-outlined text-[#3d5ba9] text-base">airline_seat_recline_normal</span>
                      <span>{vehicleSeats} places total</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Mes documents checklist section */}
              <section className="space-y-3">
                <h2 className="font-space font-bold text-sm text-[#3d5ba9]">Mes documents pro</h2>
                <div className="space-y-2.5">
                  {/* Doc 1 */}
                  <div className="flex items-center justify-between p-3.5 bg-white rounded-xl shadow-sm border border-gray-150">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-[#3d5ba9] shrink-0 border border-gray-100">
                        <span className="material-symbols-outlined text-sm font-bold">badge</span>
                      </div>
                      <div className="text-left space-y-0.5">
                        <p className="font-sans font-bold text-xs text-gray-800">Carte d'identité nationale</p>
                        <p className="text-[10px] text-gray-400 font-mono">Exp: 12/2026</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 bg-green-50 text-green-700 rounded-full text-[9px] font-mono font-bold uppercase">
                      Vérifié
                    </span>
                  </div>

                  {/* Doc 2 */}
                  <div className="flex items-center justify-between p-3.5 bg-white rounded-xl shadow-sm border border-gray-150">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-[#3d5ba9] shrink-0 border border-gray-100">
                        <span className="material-symbols-outlined text-sm font-bold">directions_car</span>
                      </div>
                      <div className="text-left space-y-0.5">
                        <p className="font-sans font-bold text-xs text-gray-800">Permis de conduire pro</p>
                        <p className="text-[10px] text-gray-400 font-sans">Catégorie {licenseType} • Validé</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 bg-green-50 text-green-700 rounded-full text-[9px] font-mono font-bold uppercase">
                      Vérifié
                    </span>
                  </div>

                </div>
              </section>

              {/* Logout Chauffeur */}
              <button
                onClick={onBackToWelcome}
                className="w-full py-3 rounded-xl bg-red-50 text-red-600 border border-red-100 font-sans font-bold text-xs flex items-center justify-center gap-2 active:bg-red-100 transition-colors cursor-pointer mt-4"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                Se déconnecter de DEM
              </button>
            </main>

            {/* Bottom navigation sticky footer */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] h-16 bg-white border-t border-gray-150 flex justify-around items-center px-2 pb-2 z-30 shadow-md rounded-t-2xl">
              <button onClick={() => setScreen('portal')} className="flex flex-col items-center text-gray-400 py-1 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-xl">route</span>
                <span className="font-sans text-[10px] mt-0.5">Courses</span>
              </button>
              <button onClick={() => setScreen('home')} className="flex flex-col items-center text-gray-400 py-1 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-xl">directions_bus</span>
                <span className="font-sans text-[10px] mt-0.5">Mes Trajets</span>
              </button>

              {/* Central Floating Button Action to add trip */}
              <div className="relative -mt-6">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-12 h-12 bg-[#3d5ba9] text-white rounded-full shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-transform border-2 border-white"
                >
                  <span className="material-symbols-outlined text-2xl font-bold">add</span>
                </button>
              </div>

              <button onClick={() => setScreen('revenus')} className="flex flex-col items-center text-gray-400 py-1 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-xl">payments</span>
                <span className="font-sans text-[10px] mt-0.5">Revenus</span>
              </button>
              <button className="flex flex-col items-center text-[#3d5ba9] relative py-1 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                <span className="font-sans text-[10px] mt-0.5 font-bold">Profil</span>
                <span className="absolute -top-1.5 w-1 h-1 bg-[#3d5ba9] rounded-full" />
              </button>
            </nav>
          </motion.div>
        )}

      </AnimatePresence>

      {/* CREATE TRIP MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#10204A]/60 backdrop-blur-sm z-50 flex flex-col justify-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white rounded-t-[2.5rem] shadow-2xl p-6 text-left max-h-[90%] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
                <div>
                  <h3 className="font-space font-bold text-lg text-[#10204A]">Nouveau trajet</h3>
                  <p className="text-[10px] text-gray-400">Proposez un trajet inter-ville aux passagers</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateTrip} className="space-y-4 pb-6">
                {/* From */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-mono text-gray-400 font-bold uppercase mb-1">Ville de départ</label>
                  <div className="flex items-center border border-gray-100 rounded-xl px-3 py-2.5 bg-gray-50/50 focus-within:border-[#3d5ba9] focus-within:bg-white transition-all">
                    <span className="material-symbols-outlined text-gray-400 text-sm mr-2">location_on</span>
                    <select
                      value={newTripFrom}
                      onChange={(e) => {
                        setNewTripFrom(e.target.value);
                        if (newTripTo === e.target.value) {
                          const nextLoc = LOCATIONS.find(l => l !== e.target.value);
                          if (nextLoc) setNewTripTo(nextLoc);
                        }
                      }}
                      className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-bold text-[#10204A] bg-transparent cursor-pointer"
                    >
                      {LOCATIONS.map((loc) => (
                        <option key={`from-${loc}`} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* To */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-mono text-gray-400 font-bold uppercase mb-1">Destination</label>
                  <div className="flex items-center border border-gray-100 rounded-xl px-3 py-2.5 bg-gray-50/50 focus-within:border-[#3d5ba9] focus-within:bg-white transition-all">
                    <span className="material-symbols-outlined text-gray-400 text-sm mr-2">tour</span>
                    <select
                      value={newTripTo}
                      onChange={(e) => setNewTripTo(e.target.value)}
                      className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-bold text-[#10204A] bg-transparent cursor-pointer"
                    >
                      {LOCATIONS.filter(l => l !== newTripFrom).map((loc) => (
                        <option key={`to-${loc}`} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Grid Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-mono text-gray-400 font-bold uppercase mb-1">Date</label>
                    <div className="flex items-center border border-gray-100 rounded-xl px-3 py-2.5 bg-gray-50/50 focus-within:border-[#3d5ba9] focus-within:bg-white transition-all">
                      <span className="material-symbols-outlined text-gray-400 text-sm mr-2">calendar_today</span>
                      <input
                        type="date"
                        value={newTripDate}
                        onChange={(e) => setNewTripDate(e.target.value)}
                        className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-bold text-[#10204A] bg-transparent cursor-pointer"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] font-mono text-gray-400 font-bold uppercase mb-1">Heure de départ</label>
                    <div className="flex items-center border border-gray-100 rounded-xl px-3 py-2.5 bg-gray-50/50 focus-within:border-[#3d5ba9] focus-within:bg-white transition-all">
                      <span className="material-symbols-outlined text-gray-400 text-sm mr-2">schedule</span>
                      <input
                        type="time"
                        value={newTripTime}
                        onChange={(e) => setNewTripTime(e.target.value)}
                        className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-bold text-[#10204A] bg-transparent cursor-pointer"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Seats */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-mono text-gray-400 font-bold uppercase mb-1">Nombre de places</label>
                  <div className="flex items-center border border-gray-100 rounded-xl px-3 py-2.5 bg-gray-50/50 focus-within:border-[#3d5ba9] focus-within:bg-white transition-all">
                    <span className="material-symbols-outlined text-gray-400 text-sm mr-2">airline_seat_recline_normal</span>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={newTripSeats}
                      onChange={(e) => setNewTripSeats(Number(e.target.value))}
                      className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-bold text-[#10204A] bg-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Boarding place */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-mono text-gray-400 font-bold uppercase mb-1">Lieu d'embarquement (Point de départ précis)</label>
                  <div className="flex items-center border border-gray-100 rounded-xl px-3 py-2.5 bg-gray-50/50 focus-within:border-[#3d5ba9] focus-within:bg-white transition-all">
                    <span className="material-symbols-outlined text-gray-400 text-sm mr-2">storefront</span>
                    <input
                      type="text"
                      value={newTripBoardingPlace}
                      onChange={(e) => setNewTripBoardingPlace(e.target.value)}
                      placeholder="Ex: Gare des Beaux Maraîchers, Garage Pompiers..."
                      className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-bold text-[#10204A] bg-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="py-3 rounded-xl bg-gray-50 text-gray-500 font-space font-bold text-xs text-center border border-gray-100 active:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="py-3 rounded-xl bg-[#3d5ba9] text-white font-space font-bold text-xs text-center active:scale-98 transition-all shadow-md cursor-pointer hover:bg-[#3d5ba9]/95"
                  >
                    Créer le trajet
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT TRIP MODAL */}
      <AnimatePresence>
        {selectedTripForEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#10204A]/60 backdrop-blur-sm z-50 flex flex-col justify-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white rounded-t-[2.5rem] shadow-2xl p-6 text-left max-h-[90%] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5 pb-2 border-b border-gray-100">
                <div>
                  <span className="font-mono font-bold text-[9px] text-[#3d5ba9] bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                    {selectedTripForEdit.date} • {selectedTripForEdit.time}
                  </span>
                  <h3 className="font-space font-bold text-lg text-[#10204A] mt-1">
                    {selectedTripForEdit.from} ➜ {selectedTripForEdit.to}
                  </h3>
                  <p className="text-[10px] text-gray-400">Modifier les places restantes et l'occupation</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTripForEdit(null)}
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Stats Box */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-5 grid grid-cols-3 gap-2 border border-gray-100 text-center">
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Occupées</p>
                  <p className="font-mono font-bold text-lg text-gray-700">{editTripPassengerCount}</p>
                </div>
                <div className="border-x border-gray-100">
                  <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Capacité Max</p>
                  <p className="font-mono font-bold text-lg text-gray-700">{editTripMaxPassengers}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Restantes</p>
                  <p className={`font-mono font-bold text-lg ${editTripMaxPassengers - editTripPassengerCount <= 0 ? 'text-red-500 font-extrabold' : 'text-green-600'}`}>
                    {Math.max(0, editTripMaxPassengers - editTripPassengerCount)}
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveEditTrip} className="space-y-5 pb-6">
                {/* Modify Places Occupées */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono text-gray-400 font-bold uppercase">Places Occupées (Passagers)</label>
                    <span className="text-xs font-bold text-gray-500">{editTripPassengerCount} sur {editTripMaxPassengers}</span>
                  </div>
                  <div className="flex items-center justify-between border border-gray-100 rounded-xl p-2 bg-gray-50/50">
                    <button
                      type="button"
                      disabled={editTripPassengerCount <= 0}
                      onClick={() => setEditTripPassengerCount(prev => Math.max(0, prev - 1))}
                      className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-lg disabled:opacity-50 cursor-pointer"
                    >
                      -
                    </button>
                    <div className="text-center">
                      <span className="font-mono font-bold text-xl text-[#10204A]">{editTripPassengerCount}</span>
                      <span className="text-[10px] text-gray-400 block">passagers</span>
                    </div>
                    <button
                      type="button"
                      disabled={editTripPassengerCount >= editTripMaxPassengers}
                      onClick={() => setEditTripPassengerCount(prev => Math.min(editTripMaxPassengers, prev + 1))}
                      className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-lg disabled:opacity-50 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>



                {/* Closing Action Banner & Button in case of places pleines */}
                {editTripPassengerCount >= editTripMaxPassengers ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-orange-50 border border-orange-100 rounded-2xl space-y-3"
                  >
                    <div className="flex gap-2.5 items-start">
                      <span className="material-symbols-outlined text-orange-600 text-lg">warning</span>
                      <div className="text-left">
                        <p className="font-space font-bold text-xs text-orange-800">Trajet complet !</p>
                        <p className="text-[10px] text-orange-600 leading-relaxed mt-0.5">
                          Toutes les places sont actuellement réservées. Vous pouvez maintenant clôturer définitivement ce trajet et créditer votre compte.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseTripFromEdit}
                      className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-space font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                    >
                      <span className="material-symbols-outlined text-sm">lock_person</span>
                      Clôturer le trajet
                    </button>
                  </motion.div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCloseTripFromEdit}
                    className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-space font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">check</span>
                    Clôturer le trajet maintenant
                  </button>
                )}

                {/* Bottom Action buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTripForEdit(null)}
                    className="py-3 rounded-xl bg-gray-50 text-gray-500 font-space font-bold text-xs text-center border border-gray-100 active:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="py-3 rounded-xl bg-[#3d5ba9] text-white font-space font-bold text-xs text-center active:scale-98 transition-all shadow-md cursor-pointer hover:bg-[#3d5ba9]/95"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT PROFILE MODAL */}
      <AnimatePresence>
        {isEditProfileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#10204A]/60 backdrop-blur-sm z-50 flex flex-col justify-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-[#FAFAF8] rounded-t-[2.5rem] shadow-2xl p-6 text-left max-h-[90%] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5 pb-2 border-b border-gray-200">
                <div>
                  <h3 className="font-space font-bold text-lg text-[#10204A]">Modifier le profil</h3>
                  <p className="text-[10px] text-gray-400">Mettez à jour vos informations professionnelles</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4 pb-6">
                
                {/* Photo de Profil Selector */}
                <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex flex-col items-center space-y-3">
                  <h4 className="font-space font-bold text-xs text-[#3d5ba9] self-start">Photo de Profil</h4>
                  
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full border-4 border-[#ebedff] overflow-hidden shadow-md relative">
                      <img
                        src={editAvatar}
                        alt="Aperçu de la photo de profil"
                        className="w-full h-full object-cover"
                      />
                      <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                        <span className="material-symbols-outlined text-lg">photo_camera</span>
                        <span className="text-[9px] font-sans">Changer</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === 'string') {
                                  setEditAvatar(reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                    {/* Floating camera button for mobile tap */}
                    <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#3d5ba9] border-2 border-white flex items-center justify-center text-white cursor-pointer shadow hover:bg-[#3d5ba9]/90">
                      <span className="material-symbols-outlined text-xs">photo_camera</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === 'string') {
                                setEditAvatar(reader.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="w-full space-y-2">
                    <p className="text-[10px] text-gray-400 font-sans text-center">
                      Cliquez sur l'appareil photo pour importer ou choisissez un modèle ci-dessous :
                    </p>
                    <div className="flex justify-center gap-2 pt-1">
                      {[
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuAsMI9DoKFAVDDaoqwh1khlHQ8NPiAYTt8guT3fAZoykrOJuaQxfbEFKQQN82sOWKLoD2TTgVMLpa6g-_d8ltwSIMbakMQ9JddCiU1QUAOOeq15kHzgF216HhzcCcGPY4FNL9mT40Rj4k8kcf-tK-kdiabt4XgkKX2OBv0G58L25Yw4m2TVUb_tuD4PxrvMStAAmCdQF6LkoMA0vtf8dt2fAqohs52vsdbcvpI1JL9NQnRgpfPlHS22Lo48tL36M1uYn5buDUFpL5KA',
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
                        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
                        'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&q=80&w=150'
                      ].map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setEditAvatar(url)}
                          className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                            editAvatar === url ? 'border-[#3d5ba9] scale-110 shadow-sm' : 'border-gray-200 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={url} alt={`Option ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section 1: Informations Personnelles */}
                <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 space-y-3">
                  <h4 className="font-space font-bold text-xs text-[#3d5ba9] mb-1">Informations Personnelles</h4>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-400 font-bold uppercase">Nom complet</label>
                    <div className="flex items-center border border-gray-100 rounded-xl px-3 py-2 bg-gray-50/50 focus-within:border-[#3d5ba9] focus-within:bg-white transition-all">
                      <span className="material-symbols-outlined text-gray-400 text-sm mr-2">person</span>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Moussa Diop"
                        className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-bold text-[#10204A] bg-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-400 font-bold uppercase">Adresse email</label>
                    <div className="flex items-center border border-gray-100 rounded-xl px-3 py-2 bg-gray-50/50 focus-within:border-[#3d5ba9] focus-within:bg-white transition-all">
                      <span className="material-symbols-outlined text-gray-400 text-sm mr-2">mail</span>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="moussa.diop@ddd.sn"
                        className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-bold text-[#10204A] bg-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-400 font-bold uppercase">Numéro de téléphone</label>
                    <div className="flex items-center border border-gray-100 rounded-xl px-3 py-2 bg-gray-50/50 focus-within:border-[#3d5ba9] focus-within:bg-white transition-all">
                      <span className="material-symbols-outlined text-gray-400 text-sm mr-2">phone</span>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="77 452 11 00"
                        className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-bold text-[#10204A] bg-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-400 font-bold uppercase">Catégorie Permis</label>
                      <div className="flex items-center border border-gray-100 rounded-xl px-3 py-2 bg-gray-50/50 focus-within:border-[#3d5ba9] focus-within:bg-white transition-all">
                        <span className="material-symbols-outlined text-gray-400 text-sm mr-2">badge</span>
                        <input
                          type="text"
                          value={editLicense}
                          onChange={(e) => setEditLicense(e.target.value)}
                          placeholder="D"
                          className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-bold text-[#10204A] bg-transparent"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-400 font-bold uppercase">Expérience (ans)</label>
                      <div className="flex items-center border border-gray-100 rounded-xl px-3 py-2 bg-gray-50/50 focus-within:border-[#3d5ba9] focus-within:bg-white transition-all">
                        <span className="material-symbols-outlined text-gray-400 text-sm mr-2">star</span>
                        <input
                          type="number"
                          value={editExperience}
                          onChange={(e) => setEditExperience(e.target.value)}
                          placeholder="8"
                          className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-bold text-[#10204A] bg-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Informations Véhicule */}
                <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 space-y-3">
                  <h4 className="font-space font-bold text-xs text-[#3d5ba9] mb-1">Véhicule Partenaire</h4>

                  {/* Photo du Véhicule Selector */}
                  <div className="flex flex-col items-center space-y-3 pb-3 border-b border-gray-100">
                    <label className="text-[10px] font-mono text-gray-400 font-bold uppercase self-start">Photo du véhicule</label>
                    <div className="relative w-full h-32 rounded-xl border border-gray-200 overflow-hidden shadow-xs group">
                      <img
                        src={editVehicleImage}
                        alt="Aperçu du véhicule"
                        className="w-full h-full object-cover"
                      />
                      <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                        <span className="material-symbols-outlined text-xl">photo_camera</span>
                        <span className="text-[10px] font-sans">Changer la photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === 'string') {
                                  setEditVehicleImage(reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div className="w-full flex items-center justify-between">
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F3F6FF] text-[#1B3D8A] rounded-lg font-sans text-xs font-bold hover:bg-[#e4e7ff] transition-all cursor-pointer border border-[#ebedff]">
                        <span className="material-symbols-outlined text-sm">cloud_upload</span>
                        <span>Uploader une photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === 'string') {
                                  setEditVehicleImage(reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <div className="flex gap-1.5">
                        {[
                          'https://lh3.googleusercontent.com/aida-public/AB6AXuD9TVVPgjd2IX2DGV2fbpVShVAXHyQKmBT0274-gR8kDxcUcUEWkmAM1Lviuz-b7Zr1YB6_neSlzXKjitOvKH66k7xa1X_6GBUhMSQG3Jc5Fsc0QpUEZ49OQeG91yXWM67A5cMHOp47Y90Th0N0A1YfMMf2lLH8PdMYChzMD_ol2JKv1_WTgQOJSL70osXCK9JkiwiJFL4Ijz7XipZWtpedd_1TJexJyyJzB40obG9NVdLUA8dZ4JH4_4KZVjh0vqx248QNuCcEK0HA',
                          'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=250',
                          'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80&w=250'
                        ].map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditVehicleImage(url)}
                            className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                              editVehicleImage === url ? 'border-[#3d5ba9] scale-105 shadow-sm' : 'border-gray-200 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={url} alt={`Minibus ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-400 font-bold uppercase">Modèle / Marque</label>
                    <div className="flex items-center border border-gray-100 rounded-xl px-3 py-2 bg-gray-50/50 focus-within:border-[#3d5ba9] focus-within:bg-white transition-all">
                      <span className="material-symbols-outlined text-gray-400 text-sm mr-2">directions_bus</span>
                      <input
                        type="text"
                        value={editVehicleBrand}
                        onChange={(e) => setEditVehicleBrand(e.target.value)}
                        placeholder="Toyota Hiace"
                        className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-bold text-[#10204A] bg-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-400 font-bold uppercase">Immatriculation</label>
                      <div className="flex items-center border border-gray-100 rounded-xl px-3 py-2 bg-gray-50/50 focus-within:border-[#3d5ba9] focus-within:bg-white transition-all">
                        <span className="material-symbols-outlined text-gray-400 text-sm mr-2">pin</span>
                        <input
                          type="text"
                          value={editVehiclePlate}
                          onChange={(e) => setEditVehiclePlate(e.target.value)}
                          placeholder="DK-4521-A"
                          className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-bold text-[#10204A] bg-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-400 font-bold uppercase">Nombre de places</label>
                      <div className="flex items-center border border-gray-100 rounded-xl px-3 py-2 bg-gray-50/50 focus-within:border-[#3d5ba9] focus-within:bg-white transition-all">
                        <span className="material-symbols-outlined text-gray-400 text-sm mr-2">airline_seat_recline_normal</span>
                        <input
                          type="number"
                          value={editVehicleSeats}
                          onChange={(e) => setEditVehicleSeats(e.target.value)}
                          placeholder="15"
                          className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-bold text-[#10204A] bg-transparent"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action buttons */}
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(false)}
                    className="py-3 rounded-xl bg-gray-50 text-gray-500 font-space font-bold text-xs text-center border border-gray-100 active:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="py-3 rounded-xl bg-[#3d5ba9] text-white font-space font-bold text-xs text-center active:scale-98 transition-all shadow-md cursor-pointer hover:bg-[#3d5ba9]/95"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
