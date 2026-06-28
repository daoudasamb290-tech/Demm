/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PassengerBooking } from '../types';
import { LOCATIONS, SEARCH_DRIVERS, SPECIAL_AIBD_CARD, SearchDriver } from '../data';
import { supabase, isSupabaseConfigured, SUPABASE_SETUP_SQL } from '../lib/supabase';
import DestinationCarousel from './DestinationCarousel';

interface PassengerFlowProps {
  bookings: PassengerBooking[];
  addBooking: (booking: PassengerBooking) => void;
  deleteBooking: (id: string) => void;
  currentScreen: 'register' | 'login' | 'home' | 'search_results' | 'pay' | 'ticket' | 'bookings' | 'profil' | 'aibd_booking';
  setScreen: (screen: 'register' | 'login' | 'home' | 'search_results' | 'pay' | 'ticket' | 'bookings' | 'profil' | 'aibd_booking') => void;
  onBackToWelcome: () => void;
}

const getCityAbbreviation = (city: string): string => {
  if (!city) return '';
  const cleanCity = city.trim().toLowerCase();
  if (cleanCity === 'dakar') return 'DKR';
  return city.slice(0, 3).toUpperCase();
};

const formatDateISO = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayDate = new Date();
const tomorrowDate = new Date(Date.now() + 86400000);
const afterTomorrowDate = new Date(Date.now() + 172800000);

const todayStr = formatDateISO(todayDate);
const tomorrowStr = formatDateISO(tomorrowDate);
const afterTomorrowStr = formatDateISO(afterTomorrowDate);

const getFrenchDayMonth = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const monthsFull = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return `${day} ${monthsFull[monthIndex] || 'Juin'}`;
  }
  return dateStr;
};

const todayFrench = getFrenchDayMonth(todayStr);
const tomorrowFrench = getFrenchDayMonth(tomorrowStr);
const afterTomorrowFrench = getFrenchDayMonth(afterTomorrowStr);

export default function PassengerFlow({
  bookings,
  addBooking,
  deleteBooking,
  currentScreen,
  setScreen,
  onBackToWelcome
}: PassengerFlowProps) {
  // Scroll Position for parallax Home screen
  const [scrollTop, setScrollTop] = useState(0);

  // Passenger Form State
  const [fullName, setFullName] = useState(() => localStorage.getItem('dem_passenger_name') || 'Daouda Samb');
  const [phone, setPhone] = useState(() => localStorage.getItem('dem_passenger_phone') || '772783150');
  const [referral, setReferral] = useState('');
  const [loginPhone, setLoginPhone] = useState(() => localStorage.getItem('dem_passenger_phone') || '772783150');
  const [loginFullName, setLoginFullName] = useState(() => localStorage.getItem('dem_passenger_name') || 'Daouda Samb');
  const [loginError, setLoginError] = useState('');

  // Regular Booking Custom Pickup and Pricing State
  const [regularPickupZone, setRegularPickupZone] = useState('Dakar Plateau');
  const [regularPickupAddress, setRegularPickupAddress] = useState('');
  const [regularPassengersCount, setRegularPassengersCount] = useState(1);

  // Search State
  const [searchFrom, setSearchFrom] = useState('Dakar');
  const [searchTo, setSearchTo] = useState('Tivaouane');
  const [searchTab, setSearchTab] = useState<'today' | 'tomorrow' | 'after_tomorrow' | 'custom'>('tomorrow');
  const [selectedDate, setSelectedDate] = useState<string>(tomorrowStr); // Format: YYYY-MM-DD (Default 25 June 2026)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date()); // June 2026

  // Dedicated Airport Booking State
  const [aibdDirection, setAibdDirection] = useState<'to_airport' | 'from_airport'>('to_airport');
  const [aibdCity, setAibdCity] = useState('Dakar');
  const [aibdFormula, setAibdFormula] = useState<'shared' | 'private' | 'premium'>('shared');
  const [aibdFlightDate, setAibdFlightDate] = useState(tomorrowStr);
  const [aibdFlightTime, setAibdFlightTime] = useState('14:30');
  const [aibdFlightNumber, setAibdFlightNumber] = useState('');
  const [aibdLuggageCount, setAibdLuggageCount] = useState(1);
  const [aibdPassengersCount, setAibdPassengersCount] = useState(1);
  const [aibdPickupAddress, setAibdPickupAddress] = useState('');

  const getFrenchDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const monthsFull = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
      ];
      return `${day} ${monthsFull[monthIndex] || 'Juin'} ${parts[0]}`;
    }
    return dateStr;
  };
  
  const [availableDrivers, setAvailableDrivers] = useState<SearchDriver[]>([]);

  // Supabase state & fetching
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlDetails, setShowSqlDetails] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  useEffect(() => {
    if (isSupabaseConfigured) {
      const fetchDrivers = async () => {
        try {
          let finalDrivers: SearchDriver[] = [];

          const { data: driversData, error: driversError } = await supabase
            .from('drivers')
            .select('*');

          if (driversError) {
            console.warn("Error loading drivers from Supabase:", driversError.message);
          } else if (driversData && driversData.length > 0) {
            finalDrivers = driversData.map((d: any) => ({
              id: d.id,
              name: d.name,
              avatar: d.avatar,
              rating: Number(d.rating),
              tripsCount: Number(d.trips_count),
              vehicleName: d.vehicle_name,
              vehiclePlate: d.vehicle_plate,
              departureTime: d.departure_time,
              terminus: d.terminus,
              seatsAvailable: Number(d.seats_available),
              price: Number(d.price),
              verified: d.verified as any,
              phone: d.phone,
              boardingPlace: d.boarding_place || undefined,
              date: d.date || tomorrowFrench,
              from: d.from || 'Dakar'
            }));
          }

          // Fetch driver trips from driver_trips table
          const { data: tripsData, error: tripsError } = await supabase
            .from('driver_trips')
            .select('*');

          if (tripsError) {
            console.warn("Error loading driver trips from Supabase:", tripsError.message);
          } else if (tripsData && tripsData.length > 0) {
            const activeTrips = tripsData.filter((t: any) => t.status === 'pending' || t.status === 'running');
            const tripDrivers: SearchDriver[] = activeTrips.map((t: any) => {
              const maxP = Number(t.max_passengers || 15);
              const curP = Number(t.passenger_count || 0);
              const seatsLeft = Math.max(0, maxP - curP);

              return {
                id: t.id,
                name: "Moussa Diop",
                avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsMI9DoKFAVDDaoqwh1khlHQ8NPiAYTt8guT3fAZoykrOJuaQxfbEFKQQN82sOWKLoD2TTgVMLpa6g-_d8ltwSIMbakMQ9JddCiU1QUAOOeq15kHzgF216HhzcCcGPY4FNL9mT40Rj4k8kcf-tK-kdiabt4XgkKX2OBv0G58L25Yw4m2TVUb_tuD4PxrvMStAAmCdQF6LkoMA0vtf8dt2fAqohs52vsdbcvpI1JL9NQnRgpfPlHS22Lo48tL36M1uYn5buDUFpL5KA',
                rating: 4.9,
                tripsCount: 142,
                vehicleName: maxP === 15 ? 'Toyota Hiace' : maxP === 7 ? 'Peugeot Espace (7 places)' : 'Berline Privée (4 places)',
                vehiclePlate: 'DK-4521-A',
                departureTime: t.time || '12:00',
                terminus: t.to || 'Touba',
                seatsAvailable: seatsLeft,
                price: 6500,
                verified: seatsLeft === 0 ? 'COMPLET' : 'CONFIRMÉ' as any,
                phone: '+221 77 452 11 00',
                isDriverTrip: true,
                passengerCount: curP,
                maxPassengers: maxP,
                date: t.date,
                from: t.from || 'Dakar',
                boardingPlace: t.boarding_place || undefined
              };
            });
            // Combine both sets
            finalDrivers = [...finalDrivers, ...tripDrivers];
          }

          setAvailableDrivers(finalDrivers);
        } catch (err: any) {
          console.warn("Supabase driver fetch error:", err?.message || err);
        }
      };
      fetchDrivers();

      const interval = setInterval(fetchDrivers, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  // Filter & Sorting States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('all'); // 'all', '4', '7', '15'
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all'); // 'all', 'morning', 'afternoon', 'evening'
  const [sortBy, setSortBy] = useState<string>('time_asc'); // 'time_asc', 'time_desc', 'price_asc', 'seats_desc'

  const getVehicleCapacity = (vehicleName: string): number => {
    const name = vehicleName.toLowerCase();
    if (name.includes('hiace') || name.includes('minibus') || name.includes('van') || name.includes('15')) {
      return 15;
    }
    if (name.includes('7') || name.includes('suv') || name.includes('espace') || name.includes('grand')) {
      return 7;
    }
    return 4;
  };

  // Filtered and sorted drivers
  const getFilteredDrivers = (): SearchDriver[] => {
    const rawFiltered = availableDrivers.filter(driver => {
      // 1. Vehicle Type Filter
      if (selectedVehicleType !== 'all') {
        const cap = getVehicleCapacity(driver.vehicleName);
        if (selectedVehicleType === '4' && cap !== 4) return false;
        if (selectedVehicleType === '7' && cap !== 7) return false;
        if (selectedVehicleType === '15' && cap !== 15) return false;
      }

      // 2. Time Range Filter
      if (selectedTimeRange !== 'all') {
        const timeStr = driver.departureTime; // e.g. "08:15"
        const hour = parseInt(timeStr.split(':')[0], 10);
        if (selectedTimeRange === 'morning' && (hour < 5 || hour >= 12)) return false;
        if (selectedTimeRange === 'afternoon' && (hour < 12 || hour >= 18)) return false;
        if (selectedTimeRange === 'evening' && (hour < 18 && hour >= 5)) return false;
      }

      // 3. Date Filter (Today, Tomorrow, After-tomorrow, or Custom)
      const matchesSelectedDate = (driverDate: string | undefined, tab: 'today' | 'tomorrow' | 'after_tomorrow' | 'custom') => {
        if (!driverDate) return tab === 'today';
        const normalizedDate = driverDate.toLowerCase().trim();
        
        // Define target dates in both ISO and French labels
        const todayFr = todayFrench.toLowerCase();
        const tomorrowFr = tomorrowFrench.toLowerCase();
        const afterTomorrowFr = afterTomorrowFrench.toLowerCase();
        const selectedFr = getFrenchDayMonth(selectedDate).toLowerCase();

        if (tab === 'today') {
          return normalizedDate === "aujourd'hui" || normalizedDate === "aujourd’hui" || normalizedDate.includes("today") || normalizedDate.includes(todayFr) || normalizedDate.includes(todayStr);
        }
        if (tab === 'tomorrow') {
          return normalizedDate === "demain" || normalizedDate.includes("tomorrow") || normalizedDate.includes(tomorrowFr) || normalizedDate.includes(tomorrowStr);
        }
        if (tab === 'after_tomorrow') {
          return normalizedDate === "après-demain" || normalizedDate === "apres-demain" || normalizedDate.includes("after_tomorrow") || normalizedDate.includes(afterTomorrowFr) || normalizedDate.includes(afterTomorrowStr);
        }
        if (tab === 'custom') {
          const parts = selectedDate.split('-');
          if (parts.length === 3) {
            const day = parseInt(parts[2], 10);
            const monthIndex = parseInt(parts[1], 10) - 1;
            const monthsShort = [
              'janv', 'févr', 'mars', 'avril', 'mai', 'juin',
              'juil', 'août', 'sept', 'oct', 'nov', 'déc'
            ];
            const monthsFull = [
              'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
              'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
            ];
            const shortStr = `${day} ${monthsShort[monthIndex]}`.toLowerCase();
            const fullStr = `${day} ${monthsFull[monthIndex]}`.toLowerCase();
            
            return normalizedDate.includes(shortStr) || normalizedDate.includes(fullStr) || normalizedDate.includes(selectedDate) || normalizedDate.includes(selectedFr);
          }
        }
        return false;
      };

      if (!matchesSelectedDate(driver.date, searchTab)) {
        return false;
      }

      // 4. Route (Trajet) Filter: Must match searchFrom and searchTo
      const driverFrom = (driver.from || 'Dakar').toLowerCase().trim();
      const driverTo = (driver.terminus || '').toLowerCase().trim();
      if (driverFrom !== searchFrom.toLowerCase().trim() || driverTo !== searchTo.toLowerCase().trim()) {
        return false;
      }

      return true;
    });

    return rawFiltered;
  };

  const displayedDrivers = getFilteredDrivers().sort((a, b) => {
    if (sortBy === 'time_asc') {
      return a.departureTime.localeCompare(b.departureTime);
    }
    if (sortBy === 'time_desc') {
      return b.departureTime.localeCompare(a.departureTime);
    }
    if (sortBy === 'price_asc') {
      return a.price - b.price;
    }
    if (sortBy === 'seats_desc') {
      return b.seatsAvailable - a.seatsAvailable;
    }
    return 0;
  });

  // Selection/Payment States
  const [selectedDriver, setSelectedDriver] = useState<SearchDriver>(() => {
    const saved = localStorage.getItem('dem_available_drivers');
    if (saved) {
      try {
        const drivers = JSON.parse(saved);
        if (drivers && drivers.length > 0) return drivers[0];
      } catch (e) {}
    }
    return SEARCH_DRIVERS[0];
  });
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange_money' | 'card'>('wave');
  const [isPaying, setIsPaying] = useState(false);
  
  // Active viewed ticket (if opened from history)
  const [viewedBooking, setViewedBooking] = useState<PassengerBooking | null>(null);

  // Phone Lookup State inside Bookings History
  const [phoneLookup, setPhoneLookup] = useState('772783150');
  const [searchQuery, setSearchQuery] = useState('');

  const getAibdPrice = () => {
    let base = 10000;
    if (aibdFormula === 'private') base = 25000;
    if (aibdFormula === 'premium') base = 45000;

    // Adjust by city
    const city = aibdCity.toLowerCase();
    if (city.includes('thiès') || city.includes('mboro')) {
      base -= (aibdFormula === 'shared' ? 2000 : 5000);
    } else if (city.includes('touba') || city.includes('saint-louis')) {
      base += (aibdFormula === 'shared' ? 5000 : 15000);
    } else if (city.includes('diourbel') || city.includes('fatick') || city.includes('kaolack')) {
      base += (aibdFormula === 'shared' ? 3000 : 10000);
    }

    // Multiply shared by passengers count
    if (aibdFormula === 'shared') {
      base *= aibdPassengersCount;
    }

    // Add extra luggage cost (if luggage > 2, + 1500 F CFA per extra bag)
    if (aibdLuggageCount > 2) {
      base += (aibdLuggageCount - 2) * 1500;
    }

    return base;
  };

  const handleConfirmAibdBooking = () => {
    const finalPrice = getAibdPrice();
    const routeFrom = aibdDirection === 'to_airport' ? aibdCity : 'Aéroport AIBD';
    const routeTo = aibdDirection === 'to_airport' ? 'Aéroport AIBD' : aibdCity;

    setSearchFrom(routeFrom);
    setSearchTo(routeTo);
    setSelectedDate(aibdFlightDate);

    const airportDriver: SearchDriver = {
      id: `aibd-${aibdFormula}-${Date.now()}`,
      name: aibdFormula === 'shared' 
        ? 'Navette Collective AIBD' 
        : aibdFormula === 'private' 
          ? 'Chauffeur Privé AIBD' 
          : 'Service Limousine VIP AIBD',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNTqCc11lwzq5vi4zpCeF-7U5qkNreNg4IdX6lP7hUeW_DtKYG5_RvVQFLpqTJX35gykXCglpPwQ0cTG3-3N_AGBMdF6WLKOTdDVvCB0wNbxIUd4VtfoI08g6DL4cL_T0K6N9aRQyFI-mpQjAU5sQp1MVyciGXupHEyIW18wu6jCuf9LjAzdFtKtRy_JYN1IKRBy_XcZEVtDlgm4cksMk14Nu9jobSG2K6atm9MjxkWCkvWsQmihXTekF8a0B0KhGo0vpAdLR5TEG7',
      rating: 4.9,
      tripsCount: 350,
      vehicleName: aibdFormula === 'shared' 
        ? 'Minibus Climatisé (Toyota Hiace)' 
        : aibdFormula === 'private' 
          ? 'Berline Confort (Peugeot 508)' 
          : 'Berline VIP (Mercedes Classe E)',
      vehiclePlate: 'DK-0918-B',
      departureTime: aibdFlightTime,
      terminus: routeTo,
      seatsAvailable: aibdFormula === 'shared' ? Math.max(1, 15 - aibdPassengersCount) : 4,
      price: finalPrice,
      verified: 'CONFIRMÉ',
      phone: '+221 77 123 45 67',
      date: getFrenchDateLabel(aibdFlightDate),
      from: routeFrom,
      boardingPlace: aibdPickupAddress || (aibdDirection === 'to_airport' ? `Domicile à ${aibdCity}` : 'Zone d\'arrivée AIBD (Porte 2)')
    };

    setSelectedDriver(airportDriver);
    setScreen('pay');
  };

  // Handle passenger register submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setLoginError('Veuillez saisir votre nom complet');
      return;
    }
    if (!phone.trim()) {
      setLoginError('Veuillez saisir votre numéro de téléphone');
      return;
    }

    if (isSupabaseConfigured) {
      try {
        const { data: existingPassenger, error: checkError } = await supabase
          .from('passengers')
          .select('*')
          .eq('phone', phone.trim());

        if (checkError) {
          console.warn('Check existing passenger error:', checkError.message);
        }

        if (existingPassenger && existingPassenger.length > 0) {
          setLoginError('Vous avez déjà un compte');
          return;
        }

        const id = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const { error } = await supabase
          .from('passengers')
          .insert([{
            id,
            name: fullName,
            phone: phone,
            referral: referral || null
          }]);
        if (error) {
          console.warn('Error inserting passenger to Supabase:', error.message);
        }
        localStorage.setItem('dem_passenger_id', id);
        localStorage.setItem('dem_passenger_name', fullName);
        localStorage.setItem('dem_passenger_phone', phone);
      } catch (err: any) {
        console.warn('Failed to register passenger in Supabase (falling back to local):', err.message);
        const id = 'p_' + Date.now();
        localStorage.setItem('dem_passenger_id', id);
        localStorage.setItem('dem_passenger_name', fullName);
        localStorage.setItem('dem_passenger_phone', phone);
      }
    } else {
      const id = 'p_' + Date.now();
      localStorage.setItem('dem_passenger_id', id);
      localStorage.setItem('dem_passenger_name', fullName);
      localStorage.setItem('dem_passenger_phone', phone);
    }
    setLoginError('');
    setScreen('home');
  };

  // Handle passenger login submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginFullName.trim()) {
      setLoginError('Veuillez saisir votre nom complet');
      return;
    }
    if (!loginPhone.trim()) {
      setLoginError('Veuillez saisir votre numéro de téléphone');
      return;
    }
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('passengers')
          .select('*')
          .eq('phone', loginPhone);
        
        if (error) {
          console.warn('Supabase passenger login query error (falling back to local):', error.message);
          setFullName(loginFullName);
          setPhone(loginPhone);
          localStorage.setItem('dem_passenger_id', 'p_' + Date.now());
          localStorage.setItem('dem_passenger_name', loginFullName);
          localStorage.setItem('dem_passenger_phone', loginPhone);
          setLoginError('');
          setScreen('home');
          return;
        }
 
        const matchedPassenger = data && data.length > 0 ? data[0] : null;
 
        if (matchedPassenger) {
          setFullName(matchedPassenger.name);
          setPhone(matchedPassenger.phone);
          localStorage.setItem('dem_passenger_id', matchedPassenger.id);
          localStorage.setItem('dem_passenger_name', matchedPassenger.name);
          localStorage.setItem('dem_passenger_phone', matchedPassenger.phone);
        } else {
          // Si le passager n'existe pas encore dans la DB, on le crée
          const id = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          const { error: insertError } = await supabase
            .from('passengers')
            .insert([{
              id,
              name: loginFullName,
              phone: loginPhone,
              referral: null
            }]);
          if (insertError) {
            console.warn('Auto-registration error on login:', insertError.message);
          }
          setFullName(loginFullName);
          setPhone(loginPhone);
          localStorage.setItem('dem_passenger_id', id);
          localStorage.setItem('dem_passenger_name', loginFullName);
          localStorage.setItem('dem_passenger_phone', loginPhone);
        }
      } catch (err: any) {
        console.warn('Unexpected passenger login error (falling back to local):', err.message);
        setFullName(loginFullName);
        setPhone(loginPhone);
        localStorage.setItem('dem_passenger_id', 'p_' + Date.now());
        localStorage.setItem('dem_passenger_name', loginFullName);
        localStorage.setItem('dem_passenger_phone', loginPhone);
      }
    } else {
      setFullName(loginFullName);
      setPhone(loginPhone);
      localStorage.setItem('dem_passenger_id', 'p_' + Date.now());
      localStorage.setItem('dem_passenger_name', loginFullName);
      localStorage.setItem('dem_passenger_phone', loginPhone);
    }
    setLoginError('');
    setScreen('home');
  };

  // Select driver from list to navigate to payment
  const handleSelectDriver = (driver: SearchDriver) => {
    setSelectedDriver(driver);
    setScreen('pay');
  };

  // Perform Simulated Payment
  const handlePay = () => {
    setIsPaying(true);
    setTimeout(() => {
      // Create new booking
      const refId = `TK-${Math.floor(100000 + Math.random() * 900000)}-114`;
      const dateText = searchTab === 'today' ? todayFrench : searchTab === 'tomorrow' ? tomorrowFrench : searchTab === 'after_tomorrow' ? afterTomorrowFrench : getFrenchDateLabel(selectedDate);
      
      const isAibd = selectedDriver.id.startsWith('aibd-');
      let finalPrice = selectedDriver.price || 6000;
      let finalPickupAddress = selectedDriver.boardingPlace || 'Gare Routière';

      if (!isAibd) {
        // Regular booking rules
        const basePrice = selectedDriver.price || 6000;
        const isSurcharged = ['Fann', 'Point E', 'Ouakam', 'Mamelles', 'Almadies', 'Ngor'].includes(regularPickupZone);
        const surchargeVal = isSurcharged ? 1000 : 0;
        finalPrice = (basePrice * regularPassengersCount) + surchargeVal + (100 * regularPassengersCount);
        
        const isMeetingPoint = ['Keur Massar', 'Rufisque'].includes(regularPickupZone) && regularPassengersCount < 4;
        finalPickupAddress = isMeetingPoint 
          ? `Point de ralliement Sedima, ${regularPickupZone} (Pas de ramassage)` 
          : `${regularPickupZone} : ${regularPickupAddress || 'Ramassage à domicile'}`;
      } else {
        // AIBD booking total price includes the 100 service fee per seat
        finalPrice = (selectedDriver.price || 10000) + (100 * aibdPassengersCount);
      }

      const newBooking: PassengerBooking = {
        id: `b-${Date.now()}`,
        reference: refId,
        from: searchFrom,
        to: searchTo,
        date: dateText,
        time: selectedDriver.departureTime,
        passengerName: fullName.toUpperCase(),
        phone: phone,
        status: 'pending',
        price: finalPrice,
        driverName: selectedDriver.name,
        driverAvatar: selectedDriver.avatar,
        driverPhone: selectedDriver.phone,
        vehicleName: selectedDriver.vehicleName,
        vehiclePlate: selectedDriver.vehiclePlate,
        pickupAddress: finalPickupAddress,
        paymentMethod: paymentMethod
      };
      
      // Decrease the seats count for that specific driver
      const seatsToDeduct = isAibd ? aibdPassengersCount : regularPassengersCount;
      setAvailableDrivers(prevDrivers => 
        prevDrivers.map(d => {
          if (d.id === selectedDriver.id) {
            const nextSeats = Math.max(0, d.seatsAvailable - seatsToDeduct);
            
            // Sync to Supabase
            if (isSupabaseConfigured) {
              if (d.isDriverTrip) {
                // If it is a driver trip, increment passenger_count
                const nextPassengerCount = Math.min(d.maxPassengers || 15, (d.passengerCount || 0) + seatsToDeduct);
                supabase.from('driver_trips').update({
                  passenger_count: nextPassengerCount
                }).eq('id', d.id).then(({ error }) => {
                  if (error) console.warn("Error updating driver_trips in Supabase:", error.message);
                });
              } else {
                supabase.from('drivers').update({
                  seats_available: nextSeats,
                  verified: nextSeats === 0 ? 'COMPLET' : d.verified
                }).eq('id', d.id).then(({ error }) => {
                  if (error) console.warn("Error updating seats in Supabase:", error.message);
                });
              }
            }

            return {
              ...d,
              seatsAvailable: nextSeats,
              verified: nextSeats === 0 ? 'COMPLET' as const : d.verified,
              passengerCount: d.isDriverTrip ? (d.passengerCount || 0) + seatsToDeduct : undefined,
            };
          }
          return d;
        })
      );

      if (paymentMethod === 'wave') {
        try {
          window.open("https://pay.wave.com/m/M_sn_f_tcYvA8qrtr/c/sn/", "_blank");
        } catch (err) {
          console.warn("Popup blocked, fallback on screen banner will be available:", err);
        }
      }

      addBooking(newBooking);
      setViewedBooking(newBooking);
      setIsPaying(false);
      setScreen('ticket');
    }, 1800);
  };

  // Simulated ticket image download
  const handleDownloadImage = () => {
    alert("Téléchargement du ticket en format image lancé ! Le pass sera enregistré dans votre galerie.");
  };

  // Dynamic pricing calculations for payment screen
  const isSelectedDriverAibd = !!(selectedDriver && selectedDriver.id && selectedDriver.id.startsWith('aibd-'));
  const currentPassengersCount = isSelectedDriverAibd ? aibdPassengersCount : regularPassengersCount;
  const regularBasePrice = selectedDriver ? (selectedDriver.price || 6000) : 6000;
  const isRegularSurcharged = !isSelectedDriverAibd && ['Fann', 'Point E', 'Ouakam', 'Mamelles', 'Almadies', 'Ngor'].includes(regularPickupZone);
  const regularSurchargeVal = isRegularSurcharged ? 1000 : 0;
  const regularTicketSubtotal = isSelectedDriverAibd ? regularBasePrice : regularBasePrice * regularPassengersCount;
  const totalServiceFee = 100 * currentPassengersCount;
  const totalAmountToPay = regularTicketSubtotal + regularSurchargeVal + totalServiceFee;

  return (
    <div className="w-full max-w-[428px] min-h-screen bg-[#FAFAF8] relative overflow-hidden flex flex-col mx-auto shadow-2xl border-x border-gray-100">
      <AnimatePresence mode="wait">
        
        {/* SCREEN 1: REGISTER */}
        {currentScreen === 'register' && (
          <motion.div
            key="register"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col min-h-screen px-5 pb-10 relative"
          >
            {/* Ambient Background decoration */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none" />
            
            {/* Header Back */}
            <header className="flex items-center h-16 shrink-0 z-10">
              <button
                onClick={onBackToWelcome}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Retour"
              >
                <span className="material-symbols-outlined text-[#10204A]">arrow_back</span>
              </button>
            </header>

            <div className="flex-grow flex flex-col justify-between">
              {/* Logo */}
              <div className="flex justify-center mt-2 mb-6">
                <div className="w-24 h-24 rounded-2xl bg-white shadow-lg p-3 flex items-center justify-center animate-bounce duration-1000">
                  <img
                    src="/src/assets/images/log.png"
                    alt="Logo DEM Transport"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-6">
                <h1 className="font-space font-bold text-2xl text-[#10204A] mb-2">
                  S'inscrire comme Passager
                </h1>
                <p className="font-sans text-sm text-gray-500 max-w-[280px] mx-auto">
                  Rejoignez la communauté DEM pour des trajets confortables et sûrs.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleRegister} className="space-y-5 flex-grow">
                {loginError && (
                  <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-100 font-sans">
                    {loginError}
                  </div>
                )}
                {/* Full Name */}
                <div className="space-y-2">
                  <label htmlFor="fullName" className="block font-sans font-semibold text-xs text-[#10204A] ml-1">
                    Nom Complet
                  </label>
                  <div className="relative flex items-center bg-white border border-gray-200 focus-within:border-brand-blue focus-within:ring-1 focus-within:ring-brand-blue rounded-2xl transition-all duration-200">
                    <span className="material-symbols-outlined absolute left-4 text-gray-400">person</span>
                    <input
                      id="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Moussa Diop"
                      className="w-full bg-transparent border-none py-3.5 pl-12 pr-4 focus:outline-none text-sm text-gray-800 placeholder:text-gray-300"
                    />
                  </div>
                </div>

                {/* Telephone */}
                <div className="space-y-2">
                  <label htmlFor="phone" className="block font-sans font-semibold text-xs text-[#10204A] ml-1">
                    Numéro de Téléphone
                  </label>
                  <div className="relative flex items-center bg-white border border-gray-200 focus-within:border-brand-blue focus-within:ring-1 focus-within:ring-brand-blue rounded-2xl transition-all duration-200">
                    <span className="material-symbols-outlined absolute left-4 text-gray-400">phone_iphone</span>
                    <div className="flex items-center pl-12 w-full">
                      <span className="font-sans font-semibold text-sm text-gray-400 pr-2 border-r border-gray-200 mr-3">+221</span>
                      <input
                        id="phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="77 000 00 00"
                        className="w-full bg-transparent border-none py-3.5 px-0 focus:outline-none text-sm text-gray-800 font-mono placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Referral (Optional) */}
                <div className="space-y-2">
                  <label htmlFor="referral" className="block font-sans font-semibold text-xs text-[#10204A] ml-1">
                    Code de parrainage <span className="text-gray-400 font-normal">(Optionnel)</span>
                  </label>
                  <div className="relative flex items-center bg-white border border-gray-200 focus-within:border-brand-blue focus-within:ring-1 focus-within:ring-brand-blue rounded-2xl transition-all duration-200">
                    <span className="material-symbols-outlined absolute left-4 text-gray-400">redeem</span>
                    <input
                      id="referral"
                      type="text"
                      value={referral}
                      onChange={(e) => setReferral(e.target.value.toUpperCase())}
                      placeholder="CODE123"
                      className="w-full bg-transparent border-none py-3.5 pl-12 pr-4 focus:outline-none text-sm text-gray-800 font-mono placeholder:text-gray-300 uppercase"
                    />
                  </div>
                </div>

                {/* Terms Notice */}
                <p className="text-center font-sans text-xs text-gray-400 px-4 py-2 leading-relaxed">
                  En vous inscrivant, vous acceptez nos <a className="text-brand-orange font-semibold underline" href="#terms">Conditions d'utilisation</a> et notre <a className="text-brand-orange font-semibold underline" href="#privacy">Politique de confidentialité</a>.
                </p>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full h-14 bg-brand-orange text-white rounded-2xl font-space font-bold shadow-lg shadow-brand-orange/20 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-3 cursor-pointer hover:brightness-105"
                  >
                    <span>Créer mon compte passager</span>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </form>

              {/* Skip / Login link */}
              <footer className="mt-6 text-center">
                <p className="font-sans text-sm text-gray-500">
                  Vous avez déjà un compte ?{' '}
                  <button
                    type="button"
                    onClick={() => setScreen('login')}
                    className="text-[#10204A] font-bold ml-1 hover:underline cursor-pointer"
                  >
                    Se connecter
                  </button>
                </p>
              </footer>
            </div>
          </motion.div>
        )}

        {/* SCREEN 1.5: PASSENGER LOGIN */}
        {currentScreen === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col min-h-screen px-5 pb-10 relative"
          >
            {/* Ambient Background decoration */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none" />
            
            {/* Header Back */}
            <header className="flex items-center h-16 shrink-0 z-10">
              <button
                onClick={() => setScreen('register')}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Retour"
              >
                <span className="material-symbols-outlined text-[#10204A]">arrow_back</span>
              </button>
            </header>

            <div className="flex-grow flex flex-col justify-between">
              {/* Logo */}
              <div className="flex justify-center mt-2 mb-6">
                <div className="w-24 h-24 rounded-2xl bg-white shadow-lg p-3 flex items-center justify-center animate-bounce duration-1000">
                  <img
                    src="/src/assets/images/log.png"
                    alt="Logo DEM Transport"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-6">
                <h1 className="font-space font-bold text-2xl text-[#10204A] mb-2">
                  Se Connecter (Passager)
                </h1>
                <p className="font-sans text-sm text-gray-500 max-w-[280px] mx-auto">
                  Saisissez vos coordonnées pour accéder instantanément à votre espace de réservation.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5 flex-grow">
                {loginError && (
                  <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-100 font-sans">
                    {loginError}
                  </div>
                )}

                {/* Full Name */}
                <div className="space-y-2">
                  <label htmlFor="loginFullName" className="block font-sans font-semibold text-xs text-[#10204A] ml-1">
                    Nom Complet
                  </label>
                  <div className="relative flex items-center bg-white border border-gray-200 focus-within:border-brand-blue focus-within:ring-1 focus-within:ring-brand-blue rounded-2xl transition-all duration-200">
                    <span className="material-symbols-outlined absolute left-4 text-gray-400">person</span>
                    <input
                      id="loginFullName"
                      type="text"
                      required
                      value={loginFullName}
                      onChange={(e) => setLoginFullName(e.target.value)}
                      placeholder="Ex: Moussa Diop"
                      className="w-full bg-transparent border-none py-3.5 pl-12 pr-4 focus:outline-none text-sm text-gray-800 placeholder:text-gray-300"
                    />
                  </div>
                </div>

                {/* Telephone */}
                <div className="space-y-2">
                  <label htmlFor="loginPhone" className="block font-sans font-semibold text-xs text-[#10204A] ml-1">
                    Numéro de Téléphone
                  </label>
                  <div className="relative flex items-center bg-white border border-gray-200 focus-within:border-brand-blue focus-within:ring-1 focus-within:ring-brand-blue rounded-2xl transition-all duration-200">
                    <span className="material-symbols-outlined absolute left-4 text-gray-400">phone_iphone</span>
                    <div className="flex items-center pl-12 w-full">
                      <span className="font-sans font-semibold text-sm text-gray-400 pr-2 border-r border-gray-200 mr-3">+221</span>
                      <input
                        id="loginPhone"
                        type="tel"
                        required
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        placeholder="77 000 00 00"
                        className="w-full bg-transparent border-none py-3.5 px-0 focus:outline-none text-sm text-gray-800 font-mono placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-6">
                  <button
                    type="submit"
                    className="w-full h-14 bg-brand-orange text-white rounded-2xl font-space font-bold shadow-lg shadow-brand-orange/20 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-3 cursor-pointer hover:brightness-105"
                  >
                    <span>Se connecter à mon compte</span>
                    <span className="material-symbols-outlined">login</span>
                  </button>
                </div>
              </form>

              {/* Back to signup link */}
              <footer className="mt-6 text-center">
                <p className="font-sans text-sm text-gray-500">
                  Nouveau sur DEM Transport ?{' '}
                  <button
                    type="button"
                    onClick={() => setScreen('register')}
                    className="text-brand-orange font-bold ml-1 hover:underline cursor-pointer"
                  >
                    S'inscrire
                  </button>
                </p>
              </footer>
            </div>
          </motion.div>
        )}

        {/* SCREEN 2: PASSENGER HOME DASHBOARD */}
        {currentScreen === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative flex flex-col min-h-screen overflow-y-auto bg-slate-50 pb-24"
            onScroll={(e) => {
              setScrollTop(e.currentTarget.scrollTop);
            }}
          >
            {/* Hero Banner header - Immersive fixed with parallax */}
            <section
              className="fixed top-0 left-0 right-0 w-full h-[360px] z-10 overflow-hidden pointer-events-none text-left"
              style={{
                transform: `translateY(-${scrollTop * 0.3}px) scale(${1 + scrollTop * 0.0005})`,
              }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url('/src/assets/images/vtc_bg_1782664469599.jpg')`
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

              {/* Controls overlay */}
              <div className="absolute top-0 left-0 right-0 px-5 pt-8 flex justify-between items-start z-20 pointer-events-auto">
                <div className="bg-black/35 backdrop-blur-md rounded-full pl-1.5 pr-4 py-1 flex items-center gap-2 border border-white/20">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-0.5 overflow-hidden">
                    <img
                      src="/src/assets/images/log.png"
                      alt="Profile logo"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <div className="flex flex-col leading-none text-left">
                    <span className="text-white font-bold text-xs">DEM</span>
                    <span className="text-white/70 text-[9px]">niou_dem</span>
                  </div>
                </div>
                <button className="bg-black/35 backdrop-blur-md w-9 h-9 rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/10 transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-base">notifications</span>
                </button>
              </div>

              {/* Greeting */}
              <div
                className="absolute top-24 left-5 right-5 z-15 transition-opacity duration-75"
                style={{
                  opacity: Math.max(0, 1 - scrollTop / 180),
                }}
              >
                <p className="text-white/80 font-mono text-xs uppercase tracking-wider mb-1">
                  Salut , {fullName.split(' ')[0]}
                </p>
                <h2 className="text-white font-space font-extrabold text-3xl">Où allez-vous ?</h2>
              </div>
            </section>

            {/* Espaceur de flux to reserve space for the fixed background */}
            <div className="h-[360px] w-full shrink-0 pointer-events-none" />

            {/* Overlapping Content Box (Sliding Panel) */}
            <section className="relative z-20 bg-white rounded-t-[32px] -mt-6 px-5 pb-24 flex-1 shadow-[0_-15px_35px_rgba(0,0,0,0.06)] space-y-6">
              {/* Handlebar spacer poignée de tiroir */}
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

              {/* Search Trip Selection Box */}
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-brand-orange">directions_bus</span>
                  <div className="flex-1 text-left">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Recherche rapide</p>
                    <div className="flex gap-2 font-space font-bold text-[#10204A]">
                      <select
                        value={searchFrom}
                        onChange={(e) => setSearchFrom(e.target.value)}
                        className="bg-transparent border-none font-bold py-0.5 pl-0 focus:ring-0 text-sm cursor-pointer"
                      >
                        {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const temp = searchFrom;
                          setSearchFrom(searchTo);
                          setSearchTo(temp);
                        }}
                        className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-50 hover:bg-orange-100 text-brand-orange active:scale-95 transition-all cursor-pointer border border-orange-100/60 self-center shadow-xs"
                        title="Inverser les directions (dans les deux sens)"
                        style={{ outline: 'none' }}
                      >
                        <span className="text-sm font-extrabold leading-none select-none">⇆</span>
                      </button>
                      <select
                        value={searchTo}
                        onChange={(e) => setSearchTo(e.target.value)}
                        className="bg-transparent border-none font-bold py-0.5 pl-0 focus:ring-0 text-sm cursor-pointer"
                      >
                        {LOCATIONS.filter(l => l !== searchFrom).map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Date de voyage selection */}
                <div className="flex items-center gap-3 border-t border-gray-100 pt-3">
                  <span className="material-symbols-outlined text-brand-blue">calendar_month</span>
                  <div className="flex-1 text-left">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Date de voyage</p>
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(true)}
                      className="font-space font-bold text-xs text-brand-blue hover:underline text-left cursor-pointer flex items-center gap-1 mt-0.5"
                    >
                      <span>{getFrenchDateLabel(selectedDate)}</span>
                      <span className="material-symbols-outlined text-xs">edit</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setScreen('search_results')}
                  className="w-full py-3 bg-brand-orange text-white font-space font-bold text-xs tracking-wider uppercase rounded-xl flex items-center justify-center gap-2 shadow shadow-brand-orange/15 hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Rechercher trajets</span>
                  <span className="material-symbols-outlined text-sm">search</span>
                </button>
              </div>

              {/* Destination Carousel */}
              <DestinationCarousel
                onSelectDestination={(destName) => {
                  if (searchFrom === destName) {
                    setSearchFrom(destName === 'Dakar' ? 'Thiès' : 'Dakar');
                  }
                  setSearchTo(destName);
                  setScreen('search_results');
                }}
              />

              {/* Trajets Disponibles Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-space font-bold text-base text-[#10204A]">Trajets réguliers</h3>
                  <span className="text-gray-400 font-mono text-[11px]">Glisser pour voir</span>
                </div>

                <div className="flex overflow-x-auto scroll-smooth gap-4 pb-4 snap-x snap-mandatory select-none hide-scrollbar">
                  {/* Card 1: Dakar ➜ Tivaouane */}
                  <div
                    onClick={() => {
                      setSearchFrom('Dakar');
                      setSearchTo('Tivaouane');
                      setScreen('search_results');
                    }}
                    className="w-[220px] flex-shrink-0 snap-start bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md active:scale-98 cursor-pointer transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-brand-orange mb-4">
                      <span className="material-symbols-outlined text-lg">commute</span>
                    </div>
                    <div className="space-y-2 mb-4 text-left">
                      <p className="font-space font-bold text-[#10204A] text-sm leading-tight">Dakar</p>
                      <div className="flex items-center gap-2 text-brand-orange">
                        <span className="text-base font-extrabold leading-none select-none">⇆</span>
                        <span className="text-gray-400 text-[10px] uppercase font-mono">aller-retour</span>
                      </div>
                      <p className="font-space font-bold text-[#10204A] text-sm leading-tight">Tivaouane</p>
                    </div>
                    <div className="flex justify-end items-end border-t border-gray-50 pt-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-blue/5 hover:bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Dakar ➜ Touba */}
                  <div
                    onClick={() => {
                      setSearchFrom('Dakar');
                      setSearchTo('Touba');
                      setScreen('search_results');
                    }}
                    className="w-[220px] flex-shrink-0 snap-start bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md active:scale-98 cursor-pointer transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-brand-orange mb-4">
                      <span className="material-symbols-outlined text-lg">commute</span>
                    </div>
                    <div className="space-y-2 mb-4 text-left">
                      <p className="font-space font-bold text-[#10204A] text-sm leading-tight">Dakar</p>
                      <div className="flex items-center gap-2 text-brand-orange">
                        <span className="text-base font-extrabold leading-none select-none">⇆</span>
                        <span className="text-gray-400 text-[10px] uppercase font-mono">aller-retour</span>
                      </div>
                      <p className="font-space font-bold text-[#10204A] text-sm leading-tight">Touba</p>
                    </div>
                    <div className="flex justify-end items-end border-t border-gray-50 pt-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-blue/5 hover:bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Dakar ➜ Thiès */}
                  <div
                    onClick={() => {
                      setSearchFrom('Dakar');
                      setSearchTo('Thiès');
                      setScreen('search_results');
                    }}
                    className="w-[220px] flex-shrink-0 snap-start bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md active:scale-98 cursor-pointer transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-brand-orange mb-4">
                      <span className="material-symbols-outlined text-lg">commute</span>
                    </div>
                    <div className="space-y-2 mb-4 text-left">
                      <p className="font-space font-bold text-[#10204A] text-sm leading-tight">Dakar</p>
                      <div className="flex items-center gap-2 text-brand-orange">
                        <span className="text-base font-extrabold leading-none select-none">⇆</span>
                        <span className="text-gray-400 text-[10px] uppercase font-mono">aller-retour</span>
                      </div>
                      <p className="font-space font-bold text-[#10204A] text-sm leading-tight">Thiès</p>
                    </div>
                    <div className="flex justify-end items-end border-t border-gray-50 pt-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-blue/5 hover:bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Dakar ➜ Saint-Louis */}
                  <div
                    onClick={() => {
                      setSearchFrom('Dakar');
                      setSearchTo('Saint-Louis');
                      setScreen('search_results');
                    }}
                    className="w-[220px] flex-shrink-0 snap-start bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md active:scale-98 cursor-pointer transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-brand-orange mb-4">
                      <span className="material-symbols-outlined text-lg">commute</span>
                    </div>
                    <div className="space-y-2 mb-4 text-left">
                      <p className="font-space font-bold text-[#10204A] text-sm leading-tight">Dakar</p>
                      <div className="flex items-center gap-2 text-brand-orange">
                        <span className="text-base font-extrabold leading-none select-none">⇆</span>
                        <span className="text-gray-400 text-[10px] uppercase font-mono">aller-retour</span>
                      </div>
                      <p className="font-space font-bold text-[#10204A] text-sm leading-tight">Saint-Louis</p>
                    </div>
                    <div className="flex justify-end items-end border-t border-gray-50 pt-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-blue/5 hover:bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 5: Dakar ➜ Mboro */}
                  <div
                    onClick={() => {
                      setSearchFrom('Dakar');
                      setSearchTo('Mboro');
                      setScreen('search_results');
                    }}
                    className="w-[220px] flex-shrink-0 snap-start bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md active:scale-98 cursor-pointer transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-brand-orange mb-4">
                      <span className="material-symbols-outlined text-lg">commute</span>
                    </div>
                    <div className="space-y-2 mb-4 text-left">
                      <p className="font-space font-bold text-[#10204A] text-sm leading-tight">Dakar</p>
                      <div className="flex items-center gap-2 text-brand-orange">
                        <span className="text-base font-extrabold leading-none select-none">⇆</span>
                        <span className="text-gray-400 text-[10px] uppercase font-mono">aller-retour</span>
                      </div>
                      <p className="font-space font-bold text-[#10204A] text-sm leading-tight">Mboro</p>
                    </div>
                    <div className="flex justify-end items-end border-t border-gray-50 pt-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-blue/5 hover:bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Spécial Aéroport Card */}
              <div className="bg-brand-blue text-white rounded-2xl p-5 relative overflow-hidden shadow-md">
                <div className="absolute -right-4 -top-4 opacity-5">
                  <span className="material-symbols-outlined text-[100px]">flight</span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center text-white shrink-0">
                    <span className="material-symbols-outlined text-xl">flight_takeoff</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-space font-bold text-sm text-white">{SPECIAL_AIBD_CARD.title}</h4>
                      <span className="bg-brand-orange text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        Spécial
                      </span>
                    </div>
                    <p className="text-white/60 text-[11px] font-sans">{SPECIAL_AIBD_CARD.subtitle}</p>
                  </div>
                </div>

                <div className="space-y-1.5 mb-5 pl-1 text-[11px] text-white/80 font-sans">
                  {SPECIAL_AIBD_CARD.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-brand-orange rounded-full" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setAibdDirection('to_airport');
                    setAibdCity('Dakar');
                    setScreen('aibd_booking');
                  }}
                  className="w-full bg-white text-brand-blue hover:bg-gray-50 py-3 rounded-xl font-space font-bold text-xs flex items-center justify-center gap-2 shadow active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Réserver maintenant</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>

              {/* Mes Réservations Section */}
              <div
                onClick={() => setScreen('bookings')}
                className="bg-white border border-gray-100 p-4 rounded-xl flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 bg-[#F4F7FF] rounded-xl flex items-center justify-center text-brand-blue shadow-sm">
                      <span className="material-symbols-outlined text-xl">confirmation_number</span>
                    </div>
                    {bookings.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                        {bookings.length}
                      </span>
                    )}
                  </div>
                  <div className="text-left">
                    <h4 className="font-space font-bold text-sm text-[#10204A]">Mes réservations</h4>
                    <p className="text-gray-400 text-xs font-sans">Consultez vos billets actifs</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
              </div>

              {/* Logout button */}
              <button
                onClick={onBackToWelcome}
                className="w-full py-3 rounded-xl bg-red-50 text-red-600 border border-red-100 font-sans font-bold text-xs flex items-center justify-center gap-2 active:bg-red-100 transition-colors cursor-pointer mt-2"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                Déconnexion
              </button>
            </section>

            {/* Bottom Nav Bar */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] h-16 bg-white/95 backdrop-blur-md border-t border-gray-100 flex justify-around items-center px-4 pb-2 z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
              {/* Tab 1: Accueil */}
              <button
                onClick={() => setScreen('home')}
                className="flex flex-col items-center text-[#1B3D8A] relative py-1 shrink-0 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
                <span className="font-sans text-[10px] mt-0.5 font-bold">Accueil</span>
                <span className="absolute -top-1.5 w-1 h-1 bg-[#1B3D8A] rounded-full" />
              </button>

              {/* Tab 2: Tickets */}
              <button
                onClick={() => setScreen('bookings')}
                className="flex flex-col items-center text-gray-400 hover:text-gray-600 py-1 shrink-0 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-xl">confirmation_number</span>
                <span className="font-sans text-[10px] mt-0.5">Tickets</span>
              </button>

              {/* Tab 3: Profil */}
              <button
                onClick={() => setScreen('profil')}
                className="flex flex-col items-center text-gray-400 hover:text-gray-600 py-1 shrink-0 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-xl">person</span>
                <span className="font-sans text-[10px] mt-0.5">Profil</span>
              </button>
            </nav>
            
            {/* WhatsApp floating support button */}
            <div className="fixed bottom-20 right-5 z-40">
              <a
                href="https://wa.me/221772783150"
                target="_blank"
                rel="noreferrer"
                className="w-12 h-12 bg-[#25D366] text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
              >
                <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793 0-.853.448-1.273.607-1.446.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.088.275.073.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087.158.058 1.012.477 1.185.564.173.087.289.129.332.202.043.073.043.419-.101.824z" />
                </svg>
              </a>
            </div>
          </motion.div>
        )}

        {/* SCREEN 2.5: DEDICATED AIRPORT BOOKING (AIBD) */}
        {currentScreen === 'aibd_booking' && (
          <motion.div
            key="aibd_booking"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col min-h-screen pb-32 bg-[#FAFAF8]"
          >
            {/* Header */}
            <header className="sticky top-0 z-50 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-5 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setScreen('home')}
                  className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[#1B3D8A]">arrow_back</span>
                </button>
                <div className="text-left">
                  <h1 className="font-space font-bold text-base text-[#10204A]">Service Aéroport</h1>
                  <p className="font-sans text-[11px] text-gray-400">Navette directe 24h/24 & Transferts</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-brand-blue/5 flex items-center justify-center text-brand-blue">
                <span className="material-symbols-outlined text-sm">flight</span>
              </div>
            </header>

            <div className="px-5 pt-5 space-y-5 flex-grow overflow-y-auto">
              
              {/* Sens du trajet (Direction selector) */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
                <label className="text-[10px] font-mono text-gray-400 font-bold uppercase block text-left">
                  Direction du trajet
                </label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => setAibdDirection('to_airport')}
                    className={`py-2 px-3 rounded-lg text-xs font-space font-bold transition-all ${
                      aibdDirection === 'to_airport' 
                        ? 'bg-white text-brand-blue shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Vers l'Aéroport AIBD
                  </button>
                  <button
                    onClick={() => setAibdDirection('from_airport')}
                    className={`py-2 px-3 rounded-lg text-xs font-space font-bold transition-all ${
                      aibdDirection === 'from_airport' 
                        ? 'bg-white text-brand-blue shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Départ de l'Aéroport
                  </button>
                </div>
              </div>

              {/* Ville de provenance/destination */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2 text-left">
                <label className="text-[10px] font-mono text-gray-400 font-bold uppercase block">
                  {aibdDirection === 'to_airport' ? "Ville de départ" : "Ville de destination"}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">
                    location_on
                  </span>
                  <select
                    value={aibdCity}
                    onChange={(e) => setAibdCity(e.target.value)}
                    className="w-full bg-gray-50 hover:bg-gray-100/70 border border-gray-200/80 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold text-[#10204A] outline-none transition-colors appearance-none cursor-pointer"
                  >
                    {LOCATIONS.filter(loc => loc !== 'Aéroport AIBD').map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-sm pointer-events-none">
                    unfold_more
                  </span>
                </div>
              </div>

              {/* Formules de transport (Formula/Vehicle Card choices) */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-mono text-gray-400 font-bold uppercase block text-left">
                  Formule de transport
                </label>
                
                <div className="space-y-3">
                  {[
                    {
                      id: 'shared',
                      title: 'Navette Collective',
                      desc: 'Départ régulier, voyage climatisé partagé.',
                      priceText: '10 000 F CFA / place',
                      icon: 'group',
                      badge: 'Populaire'
                    },
                    {
                      id: 'private',
                      title: 'Berline Privée (4 places)',
                      desc: 'Votre chauffeur privé vous prend à domicile.',
                      priceText: '25 000 F CFA la course',
                      icon: 'directions_car'
                    },
                    {
                      id: 'premium',
                      title: 'SUV VIP Premium',
                      desc: 'Haut confort, idéal familles, rafraîchissements.',
                      priceText: '45 000 F CFA la course',
                      icon: 'airport_shuttle',
                      badge: 'Luxe'
                    }
                  ].map((formula) => {
                    const isSelected = aibdFormula === formula.id;
                    return (
                      <div
                        key={formula.id}
                        onClick={() => setAibdFormula(formula.id as any)}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-300 relative ${
                          isSelected 
                            ? 'border-brand-blue bg-[#f6f8ff] shadow-sm' 
                            : 'border-gray-100 bg-white hover:border-gray-200 shadow-xs'
                        }`}
                      >
                        {formula.badge && (
                          <span className="absolute top-3 right-3 bg-brand-orange text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                            {formula.badge}
                          </span>
                        )}
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <span className="material-symbols-outlined text-xl">{formula.icon}</span>
                          </div>
                          <div className="space-y-1 flex-1 pr-12 text-left">
                            <h4 className="font-space font-bold text-xs text-[#10204A]">{formula.title}</h4>
                            <p className="text-[10px] text-gray-400 leading-normal">{formula.desc}</p>
                            <p className="font-mono font-bold text-xs text-brand-orange mt-1">{formula.priceText}</p>
                          </div>
                        </div>
                        <div className="absolute bottom-4 right-4 w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center">
                          {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-brand-blue" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Flight Details section */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4 text-left">
                <h3 className="font-space font-bold text-xs text-[#10204A] border-b border-gray-50 pb-2">
                  Détails du vol & Prise en charge
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-gray-400 font-bold uppercase block">
                      Date du vol
                    </label>
                    <input
                      type="date"
                      value={aibdFlightDate}
                      onChange={(e) => setAibdFlightDate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#10204A] outline-none"
                    />
                  </div>

                  {/* Time */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-gray-400 font-bold uppercase block">
                      Heure du vol
                    </label>
                    <input
                      type="time"
                      value={aibdFlightTime}
                      onChange={(e) => setAibdFlightTime(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#10204A] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Flight Number */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-gray-400 font-bold uppercase block">
                      N° de Vol (Optionnel)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-base">
                        flight
                      </span>
                      <input
                        type="text"
                        placeholder="Ex: HC 407"
                        value={aibdFlightNumber}
                        onChange={(e) => setAibdFlightNumber(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-[#10204A] outline-none placeholder-gray-400"
                      />
                    </div>
                  </div>

                  {/* Pickup Address */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-gray-400 font-bold uppercase block">
                      {aibdDirection === 'to_airport' ? "Adresse de Prise" : "Lieu de Dépose"}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-base">
                        home
                      </span>
                      <input
                        type="text"
                        placeholder="Adresse ou quartier"
                        value={aibdPickupAddress}
                        onChange={(e) => setAibdPickupAddress(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-[#10204A] outline-none placeholder-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Counters for Baggage and Passengers */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {/* Passengers count */}
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-150">
                    <div className="text-left">
                      <p className="text-[9px] font-mono text-gray-400 font-bold uppercase">Passagers</p>
                      <p className="font-space font-bold text-xs text-[#10204A]">{aibdPassengersCount}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setAibdPassengersCount(prev => Math.max(1, prev - 1))}
                        className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100 active:scale-95 cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        onClick={() => setAibdPassengersCount(prev => Math.min(aibdFormula === 'shared' ? 7 : 4, prev + 1))}
                        className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100 active:scale-95 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Luggage count */}
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-150">
                    <div className="text-left">
                      <p className="text-[9px] font-mono text-gray-400 font-bold uppercase">Bagages</p>
                      <p className="font-space font-bold text-xs text-[#10204A]">{aibdLuggageCount}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setAibdLuggageCount(prev => Math.max(0, prev - 1))}
                        className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100 active:scale-95 cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        onClick={() => setAibdLuggageCount(prev => Math.min(10, prev + 1))}
                        className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100 active:scale-95 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[9px] text-gray-400 leading-normal pl-1">
                  💡 2 bagages cabines inclus d'office. Des frais légers (+1 500F) s'appliquent au-delà de 2 bagages supplémentaires.
                </p>
              </div>

              {/* Booking Summary pricing card */}
              <div className="bg-orange-50/50 border border-dashed border-brand-orange/30 rounded-2xl p-4 text-xs font-sans space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tarif de base ({aibdFormula === 'shared' ? 'Navette' : 'Course privée'})</span>
                  <span className="font-mono font-bold text-gray-800">
                    {(aibdFormula === 'shared' ? 10000 : aibdFormula === 'private' ? 25000 : 45000).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                {aibdFormula === 'shared' && aibdPassengersCount > 1 && (
                  <div className="flex justify-between text-gray-500 text-[11px]">
                    <span>Multiplié par {aibdPassengersCount} passagers</span>
                    <span>x {aibdPassengersCount}</span>
                  </div>
                )}
                {aibdLuggageCount > 2 && (
                  <div className="flex justify-between text-gray-500 text-[11px]">
                    <span>Supplément {aibdLuggageCount - 2} bagages</span>
                    <span>+ {((aibdLuggageCount - 2) * 1500).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-brand-orange/20">
                  <span className="font-space font-bold text-xs text-[#10204A]">Prix Total Estimé</span>
                  <span className="font-space font-extrabold text-sm text-brand-orange">
                    {getAibdPrice().toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

            </div>

            {/* Floating bottom footer action button */}
            <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] bg-white border-t border-gray-100 p-4 z-40 shadow-[0_-8px_20px_rgba(0,0,0,0.04)] rounded-t-2xl">
              <button
                onClick={handleConfirmAibdBooking}
                className="w-full py-4 bg-brand-orange text-white font-space font-bold text-sm flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-brand-orange/20 cursor-pointer active:scale-95 transition-all"
              >
                <span>Confirmer et Payer ({getAibdPrice().toLocaleString('fr-FR')} FCFA)</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </footer>

          </motion.div>
        )}

        {/* SCREEN 3: SEARCH RESULTS */}
        {currentScreen === 'search_results' && (
          <motion.div
            key="search_results"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col min-h-screen pb-10 bg-[#FAFAF8]"
          >
            {/* Header */}
            <header className="sticky top-0 z-50 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setScreen('home')}
                  className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[#1B3D8A]">arrow_back</span>
                </button>
                <div className="text-left">
                  <h1 className="font-space font-bold text-sm text-[#1B3D8A] leading-tight">
                    {searchFrom} ➜ {searchTo}
                  </h1>
                  <p className="font-mono text-[10px] text-gray-500">
                    {searchTab === 'today' ? "Aujourd'hui" : searchTab === 'tomorrow' ? 'Demain' : searchTab === 'after_tomorrow' ? 'Après-demain' : getFrenchDateLabel(selectedDate)}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`p-2 rounded-full transition-colors cursor-pointer ${isFilterOpen ? 'bg-[#1B3D8A]/10 text-[#1B3D8A]' : 'hover:bg-gray-100 text-[#1B3D8A]'}`}
              >
                <span className="material-symbols-outlined text-xl">tune</span>
              </button>
            </header>

            {/* Date Tab filter */}
            <div className="px-5 py-3.5 bg-white border-b border-gray-100 flex items-center gap-2">
              <div className="flex bg-gray-100 p-1 rounded-full flex-1">
                <button
                  onClick={() => setSearchTab('today')}
                  className={`flex-1 py-1.5 text-center text-[11px] font-mono font-medium rounded-full transition-all duration-200 cursor-pointer ${
                    searchTab === 'today' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Auj.
                </button>
                <button
                  onClick={() => setSearchTab('tomorrow')}
                  className={`flex-1 py-1.5 text-center text-[11px] font-mono font-medium rounded-full transition-all duration-200 cursor-pointer ${
                    searchTab === 'tomorrow' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Demain
                </button>
                <button
                  onClick={() => setSearchTab('after_tomorrow')}
                  className={`flex-1 py-1.5 text-center text-[11px] font-mono font-medium rounded-full transition-all duration-200 cursor-pointer ${
                    searchTab === 'after_tomorrow' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Après-dem.
                </button>
              </div>
              
              {/* Calendar Icon Button */}
              <button
                onClick={() => setIsCalendarOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono font-bold transition-all duration-200 cursor-pointer ${
                  searchTab === 'custom'
                    ? 'bg-[#1B3D8A] text-white border-[#1B3D8A] shadow-sm'
                    : 'bg-white hover:bg-gray-50 text-[#1B3D8A] border-gray-200'
                }`}
              >
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                <span>{searchTab === 'custom' ? getFrenchDateLabel(selectedDate).split(' ').slice(0, 2).join(' ') : 'Calendrier'}</span>
              </button>
            </div>

            {/* Collapsible Advanced Filters Section */}
            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-[#F8FAFC] border-b border-gray-150 px-5 py-4 space-y-4"
                >
                  {/* Vehicle Type (4 places, 7 places, 15 places) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">Type de véhicule</span>
                      {selectedVehicleType !== 'all' && (
                        <button 
                          onClick={() => setSelectedVehicleType('all')}
                          className="text-[10px] font-mono text-[#3d5ba9] font-bold underline cursor-pointer"
                        >
                          Réinitialiser
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'all', label: 'Tous', icon: 'directions_car' },
                        { id: '4', label: '4 places (Berline)', icon: 'minor_crash' },
                        { id: '7', label: '7 places (Grand Taxi)', icon: 'suv' },
                        { id: '15', label: '15 places (Minibus)', icon: 'airport_shuttle' }
                      ].map(type => (
                        <button
                          key={type.id}
                          onClick={() => setSelectedVehicleType(type.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            selectedVehicleType === type.id
                              ? 'bg-[#1B3D8A] text-white shadow-sm'
                              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">{type.icon}</span>
                          <span>{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Departure Hour filter */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">Heure de départ</span>
                      {selectedTimeRange !== 'all' && (
                        <button 
                          onClick={() => setSelectedTimeRange('all')}
                          className="text-[10px] font-mono text-[#3d5ba9] font-bold underline cursor-pointer"
                        >
                          Réinitialiser
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'all', label: 'Toute la journée', icon: 'schedule' },
                        { id: 'morning', label: 'Matin (05h - 12h)', icon: 'light_mode' },
                        { id: 'afternoon', label: 'Après-midi (12h - 18h)', icon: 'wb_sunny' },
                        { id: 'evening', label: 'Soir (18h - 00h)', icon: 'dark_mode' }
                      ].map(range => (
                        <button
                          key={range.id}
                          onClick={() => setSelectedTimeRange(range.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            selectedTimeRange === range.id
                              ? 'bg-[#1B3D8A] text-white shadow-sm'
                              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">{range.icon}</span>
                          <span>{range.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trier par */}
                  <div>
                    <span className="text-[10px] font-mono text-gray-400 font-bold uppercase block mb-2">Trier par</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'time_asc', label: 'Heure de départ ↗', desc: 'Plus tôt au plus tard' },
                        { id: 'time_desc', label: 'Heure de départ ↘', desc: 'Plus tard au plus tôt' },
                        { id: 'price_asc', label: 'Prix ↗', desc: 'Moins cher au plus cher' },
                        { id: 'seats_desc', label: 'Places libres ↘', desc: 'Plus de places disponibles' }
                      ].map(option => (
                        <button
                          key={option.id}
                          onClick={() => setSortBy(option.id)}
                          className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                            sortBy === option.id
                              ? 'bg-[#F3F6FF] border-[#1B3D8A] text-[#1B3D8A]'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-xs font-bold block">{option.label}</span>
                          <span className="text-[9px] text-gray-400 font-medium block">{option.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Driver Results Count */}
            <div className="px-5 pt-4 flex justify-between items-center text-xs">
              <span className="font-mono text-gray-500">
                {displayedDrivers.length} chauffeur{displayedDrivers.length > 1 ? 's' : ''} trouvé{displayedDrivers.length > 1 ? 's' : ''}
              </span>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="font-mono text-[#1B3D8A] flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-0 focus:outline-none"
              >
                <span>Filtrer / Trier</span>
                <span className="material-symbols-outlined text-sm">{isFilterOpen ? 'expand_less' : 'expand_more'}</span>
              </button>
            </div>

            {/* List */}
            <div className="px-5 space-y-4 pt-3 flex-grow">
              {displayedDrivers.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-gray-100 text-center text-xs text-gray-500 font-sans flex flex-col items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-gray-300 text-4xl">no_accounts</span>
                  <p className="font-medium text-gray-600">Aucun chauffeur disponible pour ce trajet à cette date</p>
                  <p className="text-[10px] text-gray-400">Les trajets réels enregistrés s'afficheront ici.</p>
                </div>
              ) : (
                displayedDrivers.map((driver) => {
                  const isFull = driver.verified === 'COMPLET';
                  return (
                    <div
                      key={driver.id}
                      className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between transition-all duration-150 ${
                        isFull ? 'opacity-70 grayscale-[0.3]' : 'hover:scale-[1.01] hover:shadow-md'
                      }`}
                    >
                      {/* Driver details top row */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                            <img
                              src={driver.avatar}
                              alt={driver.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="text-left">
                            <h3 className="font-space font-bold text-[#10204A] text-sm">{driver.name}</h3>
                            <div className="flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-brand-orange text-sm font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                              <span className="font-sans font-bold text-xs text-gray-800">{driver.rating}</span>
                              <span className="text-gray-400 text-[10px] ml-1">({driver.tripsCount} trajets)</span>
                            </div>
                          </div>
                        </div>

                        {/* Badge status */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-tight flex items-center gap-1 ${
                            driver.verified === 'CONFIRMÉ'
                              ? 'bg-green-50 text-green-700'
                              : driver.verified === 'VÉRIFIÉE'
                              ? 'bg-blue-50 text-brand-blue'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {driver.verified === 'CONFIRMÉ' && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
                          {driver.verified === 'VÉRIFIÉE' && <span className="material-symbols-outlined text-[11px] font-bold">verified</span>}
                          {driver.verified}
                        </span>
                      </div>

                      {/* Timeline / vehicle middle row */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex flex-col items-center shrink-0">
                          <span className="material-symbols-outlined text-[#1B3D8A] text-xl">directions_car</span>
                          <span className="font-mono text-[9px] text-gray-400 font-bold uppercase">{driver.vehicleName.split(' ')[0]}</span>
                        </div>
                        <div className="h-8 w-[1px] bg-gray-200" />
                        <div className="text-left flex-1">
                          <p className="font-sans text-xs text-gray-500">{driver.vehicleName} · Blanc</p>
                          <p className="font-mono text-[11px] font-bold text-[#1B3D8A]">
                            Départ à {driver.departureTime} · Terminus {driver.terminus}
                          </p>
                          {driver.boardingPlace && (
                            <p className="font-sans text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px] text-emerald-600">storefront</span>
                              <span className="font-bold text-emerald-700">Embarquement :</span> {driver.boardingPlace}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Lower row details and booking action */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex flex-col text-left gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`material-symbols-outlined text-base ${isFull ? 'text-gray-400' : driver.seatsAvailable === 1 ? 'text-red-500' : 'text-brand-blue'}`}>
                              {isFull ? 'block' : 'event_seat'}
                            </span>
                            <span className={`font-mono text-xs font-semibold ${isFull ? 'text-gray-400' : driver.seatsAvailable === 1 ? 'text-red-500 font-bold' : 'text-[#10204A]'}`}>
                              {isFull ? 'Plus de places' : driver.seatsAvailable === 1 ? '1 place restante' : `${driver.seatsAvailable} places libres`}
                            </span>
                          </div>
                          {driver.price !== undefined && (
                            <div className="flex items-center gap-1 font-sans text-xs font-bold text-[#1B3D8A]">
                              <span className="material-symbols-outlined text-xs">payments</span>
                              <span>{driver.price.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                          )}
                        </div>

                        {isFull ? (
                          <button
                            disabled
                            className="bg-gray-200 text-gray-500 px-5 py-2 rounded-xl font-space font-bold text-xs cursor-not-allowed"
                          >
                            Indisponible
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSelectDriver(driver)}
                            className="bg-brand-orange text-white px-5 py-2 rounded-xl font-space font-bold text-xs shadow shadow-brand-orange/10 cursor-pointer active:scale-95 transition-all hover:brightness-105"
                          >
                            {driver.verified === 'VÉRIFIÉE' ? 'Réserver' : 'Choisir'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {/* SCREEN 4: PAYMENT PAGE */}
        {currentScreen === 'pay' && (
          <motion.div
            key="pay"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col min-h-screen pb-28 bg-[#FAFAF8]"
          >
            {/* Header */}
            <header className="sticky top-0 z-50 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-5">
              <button
                onClick={() => {
                  if (selectedDriver.id.startsWith('aibd-')) {
                    setScreen('aibd_booking');
                  } else {
                    setScreen('search_results');
                  }
                }}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-[#1B3D8A] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h1 className="font-space font-bold text-base text-[#10204A]">Paiement</h1>
              <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-base">notifications</span>
              </button>
            </header>

            <div className="px-5 pt-5 space-y-6 flex-grow">
              {/* Trip Summary Card */}
              <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-left">
                    <span className="font-mono text-[9px] text-gray-400 uppercase tracking-wider block mb-0.5">
                      Résumé du trajet
                    </span>
                    <h2 className="font-space font-bold text-base text-[#10204A]">
                      {searchFrom} ➜ {searchTo}
                    </h2>
                  </div>
                  <span className="bg-[#ebedff] text-[#1B3D8A] px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase">
                    {searchTab === 'today' ? "Aujourd'hui" : searchTab === 'tomorrow' ? "Demain" : searchTab === 'after_tomorrow' ? "Après-demain" : getFrenchDateLabel(selectedDate)}
                  </span>
                </div>

                {/* Timeline visual layout */}
                <div className="flex items-start gap-4 mb-4 relative pl-1">
                  <div className="flex flex-col items-center py-1">
                    <span className="w-2.5 h-2.5 rounded-full border border-[#1B3D8A] bg-white z-10 shrink-0" />
                    <span className="w-[1px] h-9 border-l border-dashed border-gray-300 my-0.5 shrink-0" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1B3D8A] z-10 shrink-0" />
                  </div>
                  <div className="flex-1 space-y-4 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-[#10204A]">{selectedDriver.departureTime}</span>
                      <span className="text-gray-400 font-sans text-[11px]">Gare des Beaux Maraîchers</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-[#10204A]">10:15</span>
                      <span className="text-gray-400 font-sans text-[11px]">Gare de Tivaouane</span>
                    </div>
                  </div>
                </div>

                {/* Driver Identity block */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden shrink-0">
                    <img
                      src={selectedDriver.avatar}
                      alt={selectedDriver.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-[10px] text-gray-400 font-sans">Chauffeur assigné</p>
                    <p className="font-sans font-bold text-xs text-[#10204A]">{selectedDriver.name}</p>
                  </div>
                  <div className="flex items-center gap-0.5 bg-yellow-50 px-2 py-0.5 rounded-md">
                    <span className="material-symbols-outlined text-yellow-500 text-xs font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-mono text-[10px] font-bold text-gray-700">{selectedDriver.rating}</span>
                  </div>
                </div>
              </section>

              {/* Pickup and Passenger Options Card (Regular Driver Booking only) */}
              {!selectedDriver.id.startsWith('aibd-') && (
                <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left space-y-4">
                  <div>
                    <span className="font-mono text-[9px] text-gray-400 uppercase tracking-wider block mb-0.5">
                      Prise en charge &amp; Passagers
                    </span>
                    <h3 className="font-space font-bold text-sm text-[#10204A]">
                      Options de voyage
                    </h3>
                  </div>

                  {/* Passengers Counter */}
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-150">
                    <div className="text-left">
                      <p className="text-[9px] font-mono text-gray-400 font-bold uppercase">Nombre de places</p>
                      <p className="font-space font-bold text-xs text-[#10204A]">{regularPassengersCount} {regularPassengersCount > 1 ? 'passagers' : 'passager'}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRegularPassengersCount(prev => Math.max(1, prev - 1))}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-gray-100 active:scale-95 cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegularPassengersCount(prev => Math.min(selectedDriver.seatsAvailable || 15, prev + 1))}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-gray-100 active:scale-95 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Pickup Zone Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 font-bold uppercase block text-left">
                      Quartier / Zone de ramassage
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">
                        location_on
                      </span>
                      <select
                        value={regularPickupZone}
                        onChange={(e) => setRegularPickupZone(e.target.value)}
                        className="w-full bg-gray-50 hover:bg-gray-100/70 border border-gray-200/80 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold text-[#10204A] outline-none transition-colors appearance-none cursor-pointer"
                      >
                        <optgroup label="Ramassage à domicile (+1000 FCFA)">
                          <option value="Fann">Fann</option>
                          <option value="Point E">Point E</option>
                          <option value="Ouakam">Ouakam</option>
                          <option value="Mamelles">Mamelles</option>
                          <option value="Almadies">Almadies</option>
                          <option value="Ngor">Ngor</option>
                        </optgroup>
                        <optgroup label="Point de ralliement obligatoire">
                          <option value="Keur Massar">Keur Massar (Sedima)</option>
                          <option value="Rufisque">Rufisque (Sedima)</option>
                        </optgroup>
                        <optgroup label="Autres zones (Sans supplément, à domicile)">
                          <option value="Dakar Plateau">Dakar Plateau</option>
                          <option value="Medina">Medina</option>
                          <option value="Liberté">Liberté</option>
                          <option value="Mermoz">Mermoz</option>
                          <option value="Yoff">Yoff</option>
                          <option value="Grand Yoff">Grand Yoff</option>
                          <option value="Parcelles Assainies">Parcelles Assainies</option>
                          <option value="Guédiawaye">Guédiawaye</option>
                          <option value="Pikine">Pikine</option>
                          <option value="Colobane">Colobane</option>
                          <option value="Sacre Coeur">Sacre Coeur</option>
                          <option value="Autre quartier">Autre quartier</option>
                        </optgroup>
                      </select>
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-sm pointer-events-none">
                        unfold_more
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Alert Messages / Badges */}
                  {['Fann', 'Point E', 'Ouakam', 'Mamelles', 'Almadies', 'Ngor'].includes(regularPickupZone) && (
                    <div className="bg-orange-50 text-brand-orange border border-orange-100 rounded-xl p-3 flex items-center gap-2 text-[11px] font-sans font-bold">
                      <span className="material-symbols-outlined text-base">home_work</span>
                      <span>+1000 FCFA — ramassage à domicile inclus</span>
                    </div>
                  )}

                  {['Keur Massar', 'Rufisque'].includes(regularPickupZone) && regularPassengersCount < 4 && (
                    <div className="bg-amber-50 text-amber-800 border border-amber-200/60 rounded-xl p-3 text-left space-y-1.5 text-xs font-sans">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <span className="material-symbols-outlined text-base text-amber-600">info</span>
                        <span>Point de rendez-vous obligatoire</span>
                      </div>
                      <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                        Pas de ramassage à domicile depuis {regularPickupZone} pour moins de 4 passagers. Merci de venir au point <strong className="text-amber-900">Sedima</strong>.
                      </p>
                      <a 
                        href="https://maps.google.com/?q=Sedima+Senegal" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-blue hover:underline cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">location_on</span>
                        <span>Voir la localisation de Sedima</span>
                      </a>
                    </div>
                  )}

                  {['Keur Massar', 'Rufisque'].includes(regularPickupZone) && regularPassengersCount >= 4 && (
                    <div className="bg-green-50 text-green-800 border border-green-200/60 rounded-xl p-3 text-left space-y-1 text-xs font-sans">
                      <div className="flex items-center gap-2 font-bold text-green-900">
                        <span className="material-symbols-outlined text-base text-green-600">verified_user</span>
                        <span>Groupe de {regularPassengersCount} passagers</span>
                      </div>
                      <p className="text-[11px] text-green-700 leading-relaxed font-medium">
                        Le chauffeur vient vous chercher directement à l'adresse indiquée à {regularPickupZone} (sans passer par le point Sedima).
                      </p>
                    </div>
                  )}

                  {!['Fann', 'Point E', 'Ouakam', 'Mamelles', 'Almadies', 'Ngor', 'Keur Massar', 'Rufisque'].includes(regularPickupZone) && (
                    <div className="bg-blue-50 text-brand-blue border border-blue-100 rounded-xl p-3 flex items-center gap-2 text-[11px] font-sans font-bold">
                      <span className="material-symbols-outlined text-base">home</span>
                      <span>Ramassage à domicile inclus (sans supplément)</span>
                    </div>
                  )}

                  {/* Pickup Address details */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 font-bold uppercase block text-left">
                      {['Keur Massar', 'Rufisque'].includes(regularPickupZone) && regularPassengersCount < 4 
                        ? "Note d'embarquement" 
                        : "Adresse précise (Rue, n°, repère)"}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-base">
                        {['Keur Massar', 'Rufisque'].includes(regularPickupZone) && regularPassengersCount < 4 ? 'meeting_room' : 'home'}
                      </span>
                      <input
                        type="text"
                        placeholder={
                          ['Keur Massar', 'Rufisque'].includes(regularPickupZone) && regularPassengersCount < 4
                            ? "Ex: Je viendrai au point Sedima"
                            : "Ex: Villa 43, Rue 12 face Mosquée"
                        }
                        value={regularPickupAddress}
                        onChange={(e) => setRegularPickupAddress(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-[#10204A] outline-none placeholder-gray-400 focus:border-brand-blue transition-colors"
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Mode de Paiement Section */}
              <section className="space-y-3">
                <h3 className="font-space font-bold text-sm text-[#10204A] text-left">Mode de paiement</h3>
                <div className="space-y-2">
                  {/* Wave option */}
                  <label
                    onClick={() => setPaymentMethod('wave')}
                    className={`flex items-center justify-between p-3.5 bg-white border rounded-xl cursor-pointer transition-all duration-150 ${
                      paymentMethod === 'wave' ? 'border-[#1B3D8A] bg-[#f3f2ff]' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1DA1F2] rounded-lg flex items-center justify-center text-white shrink-0">
                        <span className="material-symbols-outlined text-2xl font-bold">waves</span>
                      </div>
                      <div className="text-left">
                        <p className="font-sans font-bold text-xs text-[#10204A]">Wave</p>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center">
                      {paymentMethod === 'wave' && <span className="w-2.5 h-2.5 rounded-full bg-[#1B3D8A]" />}
                    </div>
                  </label>
                </div>
              </section>

              {/* Price Calculations Card */}
              <section className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4 text-xs font-sans space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {isSelectedDriverAibd ? "Prix du billet" : `Prix du billet (${regularPassengersCount} place${regularPassengersCount > 1 ? 's' : ''})`}
                  </span>
                  <span className="font-mono font-bold text-gray-800">
                    {regularTicketSubtotal.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                
                {regularSurchargeVal > 0 && (
                  <div className="flex justify-between text-orange-600 font-semibold">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">home_work</span>
                      <span>Supplément ramassage à domicile</span>
                    </span>
                    <span className="font-mono">+{regularSurchargeVal.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}

                <div className="flex justify-between pb-3.5 border-b border-gray-200">
                  <span className="text-gray-500">
                    Service &amp; Frais de traitement {currentPassengersCount > 1 ? `(${currentPassengersCount} places)` : ''}
                  </span>
                  <span className="font-mono font-bold text-gray-800">{totalServiceFee.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="font-space font-bold text-sm text-[#10204A]">Total à payer</span>
                  <span className="font-space font-extrabold text-base text-brand-orange">
                    {totalAmountToPay.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </section>

              {/* Secure Badge */}
              <div className="flex items-center justify-center gap-1.5 py-1 text-xs text-gray-500">
                <span className="material-symbols-outlined text-green-600 font-bold text-base" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                <span>Paiement 100% sécurisé et certifié</span>
              </div>
            </div>

            {/* Bottom Action sticky footer */}
            <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] bg-white border-t border-gray-100 p-4 z-40 shadow-[0_-8px_20px_rgba(0,0,0,0.04)] rounded-t-2xl">
              <button
                onClick={handlePay}
                disabled={isPaying}
                className="w-full py-4 bg-brand-orange text-white font-space font-bold text-sm flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-brand-orange/20 cursor-pointer active:scale-95 transition-all"
              >
                {isPaying ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    <span>Validation du paiement...</span>
                  </>
                ) : (
                  <>
                    <span>Payer {totalAmountToPay.toLocaleString('fr-FR')} FCFA</span>
                    <span className="material-symbols-outlined text-sm">lock</span>
                  </>
                )}
              </button>
            </footer>
          </motion.div>
        )}

        {/* SCREEN 5: TICKETS HISTORY */}
        {currentScreen === 'bookings' && (
          <motion.div
            key="bookings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col min-h-screen pb-24 bg-[#FAFAF8]"
          >
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#10204A] text-white px-5 pt-8 pb-6 rounded-b-[2rem] shadow-md shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setScreen('home')}
                  className="p-1 -ml-1 text-white hover:opacity-85 cursor-pointer"
                  aria-label="Retour"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="text-left">
                  <h1 className="font-space font-bold text-lg leading-tight">Mes Tickets DEM</h1>
                  <p className="text-[10px] text-white/70 font-sans font-light">Historique de vos réservations au Sénégal</p>
                </div>
              </div>
            </header>

            <main className="px-5 -mt-4 space-y-6 flex-grow">
              {/* Phone Cloud recovery card */}
              <section className="bg-white rounded-2xl shadow-sm p-5 border border-blue-50/50">
                <h2 className="text-xs font-bold text-[#10204A] uppercase tracking-wide mb-1 leading-tight text-left">
                  Récupérer mes tickets cloud par téléphone
                </h2>
                <p className="text-[11px] text-gray-400 text-left mb-4 leading-relaxed">
                  Recherchez vos réservations réelles sur votre base de données Supabase en saisissant votre numéro.
                </p>
                
                <div className="flex flex-col gap-3">
                  {/* Telephone field */}
                  <div className="flex items-center border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus-within:border-brand-orange transition-colors">
                    <span className="text-gray-400 border-r border-gray-200 pr-3 mr-3 font-semibold text-xs font-sans">+221</span>
                    <input
                      type="tel"
                      value={phoneLookup}
                      onChange={(e) => setPhoneLookup(e.target.value)}
                      placeholder="Numéro de téléphone"
                      className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-mono font-bold text-[#10204A]"
                    />
                  </div>
                  
                  {/* Action button */}
                  <button
                    onClick={() => {
                      setSearchQuery(phoneLookup);
                      alert(`Recherche des tickets pour le numéro +221 ${phoneLookup}...`);
                    }}
                    className="bg-brand-orange hover:bg-brand-orange/95 text-white font-space font-bold text-xs py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Rechercher
                  </button>
                </div>
              </section>

              {/* Reservations List */}
              <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="font-space font-bold text-xs uppercase tracking-wider text-[#10204A]">
                    Réservations ({bookings.filter(b => b.phone.includes(searchQuery)).length})
                  </h3>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setPhoneLookup('');
                    }}
                    className="text-[10px] font-mono text-[#1B3D8A] font-semibold hover:underline"
                  >
                    Réinitialiser
                  </button>
                </div>

                <div className="space-y-3">
                  {bookings.filter(b => b.phone.includes(searchQuery)).map((b) => (
                    <article
                      key={b.id}
                      onClick={() => {
                        setViewedBooking(b);
                        setScreen('ticket');
                      }}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-blue-50/20 hover:border-brand-orange/30 transition-all cursor-pointer flex items-center gap-3 relative"
                    >
                      {/* Left icon */}
                      <div className="bg-[#FFF4E5] p-2.5 rounded-xl text-brand-orange shrink-0">
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
                      </div>
                      
                      {/* Core description */}
                      <div className="flex-grow text-left space-y-1">
                        <h4 className="font-space font-bold text-xs text-[#10204A]">
                          {b.from} <span className="mx-0.5 text-brand-orange">➜</span> {b.to}
                        </h4>
                        
                        <div className="flex items-center text-[10px] text-blue-600 font-semibold">
                          <span className="material-symbols-outlined text-xs mr-1">calendar_today</span>
                          <span>{b.date} à {b.time}</span>
                        </div>

                        {/* Status Badge */}
                        <div className="mt-1">
                          {b.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[9px] font-bold border border-amber-100">
                              <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
                              En attente d'approbation
                            </span>
                          )}
                          {(b.status === 'accepted' || b.status === 'active') && (
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[9px] font-bold border border-green-100">
                              <span className="w-1 h-1 rounded-full bg-green-500"></span>
                              Accepté par chauffeur
                            </span>
                          )}
                          {b.status === 'refused' && (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-[9px] font-bold border border-red-100">
                              <span className="w-1 h-1 rounded-full bg-red-500"></span>
                              Refusé par chauffeur
                            </span>
                          )}
                          {b.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[9px] font-bold border border-blue-100">
                              <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                              Voyage terminé
                            </span>
                          )}
                          {b.status === 'cancelled' && (
                            <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full text-[9px] font-bold border border-gray-150">
                              Annulé
                            </span>
                          )}
                        </div>
                        
                        <p className="font-mono text-[8px] text-gray-400 tracking-tight uppercase">
                          REF: {b.reference} • Passager: {b.passengerName.split(' ')[0]}
                        </p>
                      </div>

                      {/* Right icons */}
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-300 text-base">chevron_right</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Voulez-vous supprimer ce ticket ?")) {
                              deleteBooking(b.id);
                            }
                          }}
                          className="text-gray-300 hover:text-red-500 pl-2 border-l border-gray-100 py-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </article>
                  ))}

                  {bookings.filter(b => b.phone.includes(searchQuery)).length === 0 && (
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center space-y-2">
                      <span className="material-symbols-outlined text-3xl text-gray-300">search_off</span>
                      <p className="font-sans text-xs text-gray-400">Aucun ticket trouvé pour ce numéro.</p>
                    </div>
                  )}
                </div>
              </section>
            </main>

            {/* Bottom Nav Bar */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] h-16 bg-white/95 backdrop-blur-md border-t border-gray-100 flex justify-around items-center px-4 pb-2 z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
              {/* Tab 1: Accueil */}
              <button
                onClick={() => setScreen('home')}
                className="flex flex-col items-center text-gray-400 hover:text-gray-600 py-1 shrink-0 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-xl">home</span>
                <span className="font-sans text-[10px] mt-0.5">Accueil</span>
              </button>

              {/* Tab 2: Tickets */}
              <button
                onClick={() => setScreen('bookings')}
                className="flex flex-col items-center text-[#1B3D8A] relative py-1 shrink-0 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
                <span className="font-sans text-[10px] mt-0.5 font-bold">Tickets</span>
                <span className="absolute -top-1.5 w-1 h-1 bg-[#1B3D8A] rounded-full" />
              </button>

              {/* Tab 3: Profil */}
              <button
                onClick={() => setScreen('profil')}
                className="flex flex-col items-center text-gray-400 hover:text-gray-600 py-1 shrink-0 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-xl">person</span>
                <span className="font-sans text-[10px] mt-0.5">Profil</span>
              </button>
            </nav>
            
            {/* WhatsApp floating support button */}
            <div className="fixed bottom-20 right-5 z-40">
              <a
                href="https://wa.me/221772783150"
                target="_blank"
                rel="noreferrer"
                className="w-12 h-12 bg-[#25D366] text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
              >
                <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793 0-.853.448-1.273.607-1.446.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.088.275.073.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087.158.058 1.012.477 1.185.564.173.087.289.129.332.202.043.073.043.419-.101.824z" />
                </svg>
              </a>
            </div>
          </motion.div>
        )}

        {/* SCREEN 7: PASSENGER PROFIL */}
        {currentScreen === 'profil' && (
          <motion.div
            key="profil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col min-h-screen pb-24 bg-[#FAFAF8]"
          >
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#10204A] text-white px-5 pt-8 pb-6 rounded-b-[2rem] shadow-md shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setScreen('home')}
                  className="p-1 -ml-1 text-white hover:opacity-85 cursor-pointer"
                  aria-label="Retour"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="text-left">
                  <h1 className="font-space font-bold text-lg leading-tight">Mon Profil DEM</h1>
                  <p className="text-[10px] text-white/70 font-sans font-light">Gérez vos informations et préférences</p>
                </div>
              </div>
            </header>

            <main className="px-5 -mt-4 space-y-6 flex-grow">
              {/* User Avatar & Status Card */}
              <section className="bg-white rounded-2xl shadow-sm p-5 border border-blue-50/50 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-brand-orange/10 border-2 border-brand-orange/20 flex items-center justify-center text-brand-orange text-2xl font-bold font-space">
                  {fullName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <h2 className="font-space font-bold text-base text-[#10204A]">{fullName || 'Utilisateur'}</h2>
                  <p className="text-xs text-gray-400 font-mono">+221 {phone || '77 XXX XX XX'}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Passager Vérifié</span>
                  </div>
                </div>
              </section>

              {/* Editable Fields Form */}
              <section className="bg-white rounded-2xl shadow-sm p-5 border border-blue-50/50 space-y-4">
                <h3 className="font-space font-bold text-xs uppercase tracking-wider text-[#10204A] text-left">
                  Modifier mes informations
                </h3>

                <div className="space-y-3">
                  {/* Full Name input */}
                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-mono text-gray-400 font-bold uppercase mb-1">Nom complet</label>
                    <div className="flex items-center border border-gray-100 rounded-xl px-3 py-2.5 bg-gray-50/50 focus-within:border-[#1B3D8A] focus-within:bg-white transition-all">
                      <span className="material-symbols-outlined text-gray-400 text-sm mr-2">person</span>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ex: Daouda Samb"
                        className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-bold text-[#10204A] bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Phone input */}
                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-mono text-gray-400 font-bold uppercase mb-1">Téléphone mobile</label>
                    <div className="flex items-center border border-gray-100 rounded-xl px-3 py-2.5 bg-gray-50/50 focus-within:border-[#1B3D8A] focus-within:bg-white transition-all">
                      <span className="text-gray-400 border-r border-gray-200 pr-3 mr-3 font-semibold text-xs font-sans">+221</span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ex: 772783150"
                        className="flex-1 border-none p-0 focus:outline-none focus:ring-0 text-xs font-mono font-bold text-[#10204A] bg-transparent"
                      />
                    </div>
                  </div>
                </div>
              </section>



              {/* Statistics & Rewards */}
              <section className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl p-4 border border-blue-50/50 shadow-sm text-left">
                  <span className="material-symbols-outlined text-brand-orange text-lg mb-1">local_taxi</span>
                  <p className="text-[10px] text-gray-400 font-sans uppercase">Réservations</p>
                  <p className="font-space font-bold text-lg text-[#10204A]">{bookings.length} trajets</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-blue-50/50 shadow-sm text-left">
                  <span className="material-symbols-outlined text-[#1B3D8A] text-lg mb-1">military_tech</span>
                  <p className="text-[10px] text-gray-400 font-sans uppercase">Statut fidélité</p>
                  <p className="font-space font-bold text-lg text-[#10204A]">{bookings.length > 2 ? 'Premium' : 'Standard'}</p>
                </div>
              </section>

              {/* Preference & Log Out */}
              <section className="space-y-3">
                {/* Simulated wallet preference */}
                <div className="bg-white rounded-2xl p-4 border border-blue-50/50 shadow-sm flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-500">account_balance_wallet</span>
                    <div className="text-left">
                      <h4 className="font-space font-bold text-xs text-[#10204A]">Mode de paiement</h4>
                      <p className="text-[10px] text-gray-400 font-sans">Wave</p>
                    </div>
                  </div>
                  <span className="bg-gray-100 text-gray-600 font-mono text-[9px] px-2 py-0.5 rounded font-bold">Actif</span>
                </div>

                {/* Log Out button */}
                <button
                  onClick={onBackToWelcome}
                  className="w-full py-3 rounded-xl bg-red-50 text-red-600 border border-red-100 font-sans font-bold text-xs flex items-center justify-center gap-2 active:bg-red-100 transition-colors cursor-pointer mt-2"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  Se déconnecter
                </button>
              </section>
            </main>

            {/* Bottom Nav Bar */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] h-16 bg-white/95 backdrop-blur-md border-t border-gray-100 flex justify-around items-center px-4 pb-2 z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
              {/* Tab 1: Accueil */}
              <button
                onClick={() => setScreen('home')}
                className="flex flex-col items-center text-gray-400 hover:text-gray-600 py-1 shrink-0 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-xl">home</span>
                <span className="font-sans text-[10px] mt-0.5">Accueil</span>
              </button>

              {/* Tab 2: Tickets */}
              <button
                onClick={() => setScreen('bookings')}
                className="flex flex-col items-center text-gray-400 hover:text-gray-600 py-1 shrink-0 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-xl">confirmation_number</span>
                <span className="font-sans text-[10px] mt-0.5">Tickets</span>
              </button>

              {/* Tab 3: Profil */}
              <button
                onClick={() => setScreen('profil')}
                className="flex flex-col items-center text-[#1B3D8A] relative py-1 shrink-0 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                <span className="font-sans text-[10px] mt-0.5 font-bold">Profil</span>
                <span className="absolute -top-1.5 w-1 h-1 bg-[#1B3D8A] rounded-full" />
              </button>
            </nav>

            {/* WhatsApp floating support button */}
            <div className="fixed bottom-20 right-5 z-40">
              <a
                href="https://wa.me/221772783150"
                target="_blank"
                rel="noreferrer"
                className="w-12 h-12 bg-[#25D366] text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
              >
                <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793 0-.853.448-1.273.607-1.446.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.088.275.073.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087.158.058 1.012.477 1.185.564.173.087.289.129.332.202.043.073.043.419-.101.824z" />
                </svg>
              </a>
            </div>
          </motion.div>
        )}

        {/* SCREEN 6: BOARDING PASS CONFIRMATION */}
        {currentScreen === 'ticket' && viewedBooking && (
          <motion.div
            key="ticket"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col min-h-screen text-white bg-brand-blue"
          >
            {/* Header / success title */}
            <header className="pt-8 pb-8 px-6 text-center">
              <div className="flex justify-center mb-3">
                <div className="bg-orange-100 rounded-full p-1 border-4 border-orange-50/20">
                  <div className="bg-white rounded-full w-12 h-12 flex items-center justify-center">
                    <svg className="w-8 h-8 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                    </svg>
                  </div>
                </div>
              </div>
              <h1 className="text-xl font-bold font-space mb-0.5">Réservé avec succès !</h1>
              <p className="text-gray-300 text-xs">Votre ticket est prêt &amp; enregistré</p>
            </header>

            {/* Ticket wrapper layout */}
            <main className="flex-grow bg-[#F3F6FF] rounded-t-[40px] px-6 pt-8 pb-28 relative">
              {viewedBooking.paymentMethod === 'wave' && (
                <div className="mb-5 bg-[#F3F4FF] border border-[#d5d7ff] rounded-2xl p-4 text-brand-blue shadow-sm">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-[#1B3D8A]/10 flex items-center justify-center text-[#1B3D8A]">
                      <span className="material-symbols-outlined font-bold text-lg">waves</span>
                    </div>
                    <div className="flex-grow text-left">
                      <p className="font-space font-extrabold text-xs text-[#10204A]">Paiement par Wave</p>
                      <p className="font-sans text-[11px] text-gray-600 mt-1 leading-relaxed">
                        Veuillez payer DEM niou_dem avec Wave en cliquant sur ce lien :
                      </p>
                      <a
                        href="https://pay.wave.com/m/M_sn_f_tcYvA8qrtr/c/sn/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 text-[#1B3D8A] hover:text-[#15316F] font-sans font-bold text-[11px] break-all underline block"
                      >
                        https://pay.wave.com/m/M_sn_f_tcYvA8qrtr/c/sn/
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-2 border-brand-blue/10 rounded-[32px] p-2">
                
                {/* Board pass body */}
                <article className="bg-white rounded-[24px] overflow-hidden shadow-md text-brand-blue">
                  
                  {/* Top pass header */}
                  <header className="bg-brand-blue p-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center p-0.5 overflow-hidden">
                        <img
                          src="/src/assets/images/log.png"
                          alt="DEM logo"
                          referrerPolicy="no-referrer"
                          className="w-full h-auto object-contain"
                        />
                      </div>
                      <div className="text-left">
                        <p className="font-space font-bold text-brand-orange leading-none text-xs">DEM</p>
                        <p className="text-[9px] opacity-85 font-mono">niou_dem</p>
                      </div>
                    </div>
                    <div className="bg-white/15 px-3 py-1 rounded-md text-[9px] font-mono font-bold tracking-wider">
                      ALLER SIMPLE
                    </div>
                  </header>

                  {/* Destinations details */}
                  <section className="px-5 py-6 flex items-center justify-between">
                    <div className="text-left">
                      <h2 className="text-2xl font-extrabold font-space leading-tight">
                        {getCityAbbreviation(viewedBooking.from)}
                      </h2>
                      <p className="text-gray-400 text-[10px] uppercase tracking-widest">{viewedBooking.from}</p>
                    </div>

                    {/* Route connector */}
                    <div className="flex-grow flex items-center justify-center px-2 relative">
                      <div className="w-full border-t border-dashed border-brand-orange/40" />
                      <div className="absolute bg-orange-50 w-7 h-7 rounded-full border border-orange-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-brand-orange text-sm font-bold">directions_bus</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <h2 className="text-2xl font-extrabold font-space leading-tight">
                        {getCityAbbreviation(viewedBooking.to)}
                      </h2>
                      <p className="text-gray-400 text-[10px] uppercase tracking-widest">{viewedBooking.to}</p>
                    </div>
                  </section>

                  {/* Grid attributes */}
                  <section className="px-5 pb-5 grid grid-cols-2 gap-y-4 text-xs">
                    <div className="text-left">
                      <p className="text-gray-400 text-[9px] font-mono font-semibold uppercase mb-0.5">Passager</p>
                      <p className="font-bold text-gray-800 uppercase tracking-tight">{viewedBooking.passengerName}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-gray-400 text-[9px] font-mono font-semibold uppercase mb-0.5">Mobile</p>
                      <p className="font-bold text-gray-800 font-mono">+221 {viewedBooking.phone}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-gray-400 text-[9px] font-mono font-semibold uppercase mb-0.5">Date de départ</p>
                      <p className="font-bold text-gray-800 font-sans">{viewedBooking.date}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-gray-400 text-[9px] font-mono font-semibold uppercase mb-0.5">Heure précise</p>
                      <p className="font-bold text-gray-800 font-mono">{viewedBooking.time}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-gray-400 text-[9px] font-mono font-semibold uppercase mb-0.5">Prix du trajet</p>
                      <p className="font-extrabold text-[#1B3D8A] font-sans">{(viewedBooking.price || 6000).toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    <div className="text-left">
                      <p className="text-gray-400 text-[9px] font-mono font-semibold uppercase mb-0.5">Statut</p>
                      <p className="font-bold text-emerald-600 uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span>Confirmé</span>
                      </p>
                    </div>
                    <div className="col-span-2 text-left">
                      <p className="text-gray-400 text-[9px] font-mono font-semibold uppercase mb-0.5">Adresse de prise en charge</p>
                      <p className="font-bold text-gray-800 uppercase">{viewedBooking.pickupAddress}</p>
                    </div>
                  </section>

                  {/* Perforated Fold fold details */}
                  <section className="px-5 py-6 ticket-perforation text-center bg-gray-50/50">
                    <p className="text-gray-400 text-[9px] font-mono font-semibold uppercase mb-1">
                      Référence de réservation
                    </p>
                    <p className="text-base font-bold font-space text-brand-blue mb-3">{viewedBooking.reference}</p>
                    
                    {/* Barcode representation */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-end gap-0.5 h-10 mb-1.5 bg-white p-1 px-2 rounded border border-gray-100">
                        <div className="w-0.5 h-8 bg-brand-blue" />
                        <div className="w-1 h-8 bg-brand-blue" />
                        <div className="w-0.5 h-6 bg-brand-blue" />
                        <div className="w-1.5 h-8 bg-brand-blue" />
                        <div className="w-0.5 h-7 bg-brand-blue" />
                        <div className="w-0.5 h-8 bg-brand-blue" />
                        <div className="w-1 h-8 bg-brand-blue" />
                        <div className="w-0.5 h-6 bg-brand-blue" />
                        <div className="w-1.5 h-8 bg-brand-blue" />
                        <div className="w-1 h-7 bg-brand-blue" />
                        <div className="w-0.5 h-8 bg-brand-blue" />
                        <div className="w-1.5 h-7 bg-brand-blue" />
                        <div className="w-0.5 h-8 bg-brand-blue" />
                        <div className="w-1 h-8 bg-brand-blue" />
                        <div className="w-0.5 h-6 bg-brand-blue" />
                        <div className="w-1.5 h-8 bg-brand-blue" />
                      </div>
                      <p className="text-[8px] font-mono text-gray-400">DEM-SNTK-0212073536</p>
                    </div>
                  </section>

                </article>
              </div>

              {/* Close Ticket Button */}
              <button
                onClick={() => setScreen('home')}
                className="mt-4 w-full py-3 bg-[#10204A]/5 hover:bg-[#10204A]/10 text-[#10204A] border border-[#10204A]/10 font-sans font-bold text-xs rounded-xl cursor-pointer"
              >
                Retour à l'accueil
              </button>
            </main>

            {/* Bottom Download Bar */}
            <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] bg-[#F3F6FF] px-6 pb-6 pt-2 z-10">
              <button
                onClick={handleDownloadImage}
                className="w-full bg-brand-orange text-white font-space font-bold py-4 rounded-xl shadow-lg hover:brightness-105 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Télécharger en image</span>
              </button>
            </footer>

            {/* WhatsApp floating support button */}
            <div className="fixed bottom-24 right-5 z-40">
              <a
                href="https://wa.me/221772783150"
                target="_blank"
                rel="noreferrer"
                className="w-12 h-12 bg-[#25D366] text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
              >
                <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793 0-.853.448-1.273.607-1.446.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.088.275.073.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087.158.058 1.012.477 1.185.564.173.087.289.129.332.202.043.073.043.419-.101.824z" />
                </svg>
              </a>
            </div>
          </motion.div>
        )}

        {/* Custom Calendar Modal */}
        <AnimatePresence>
          {isCalendarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4"
              onClick={() => setIsCalendarOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white rounded-[28px] shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-[#1B3D8A] text-white p-5 text-left relative">
                  <p className="text-[10px] uppercase font-mono tracking-widest text-white/70">Choisir une date</p>
                  <h3 className="font-space font-bold text-lg mt-1">
                    {getFrenchDateLabel(selectedDate)}
                  </h3>
                  <button
                    onClick={() => setIsCalendarOpen(false)}
                    className="absolute top-5 right-5 text-white/80 hover:text-white cursor-pointer"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Calendar Body */}
                <div className="p-5 flex-1 space-y-4">
                  {/* Month Selector */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const newMonth = new Date(currentCalendarMonth);
                        newMonth.setMonth(newMonth.getMonth() - 1);
                        setCurrentCalendarMonth(newMonth);
                      }}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-gray-600">chevron_left</span>
                    </button>
                    <span className="font-space font-bold text-sm text-[#10204A]">
                      {currentCalendarMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase())}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newMonth = new Date(currentCalendarMonth);
                        newMonth.setMonth(newMonth.getMonth() + 1);
                        setCurrentCalendarMonth(newMonth);
                      }}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-gray-600">chevron_right</span>
                    </button>
                  </div>

                  {/* Weekday Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono font-bold text-gray-400">
                    <div>LUN</div>
                    <div>MAR</div>
                    <div>MER</div>
                    <div>JEU</div>
                    <div>VEN</div>
                    <div>SAM</div>
                    <div>DIM</div>
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {(() => {
                      const year = currentCalendarMonth.getFullYear();
                      const month = currentCalendarMonth.getMonth();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      
                      // Day of the week for day 1 (0 is Sunday, 1 is Monday... 6 is Saturday)
                      let firstDayIndex = new Date(year, month, 1).getDay();
                      // Convert Sunday=0 to 6 (so Monday starts at index 0)
                      firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

                      const cells = [];
                      // Empty cells for padding
                      for (let i = 0; i < firstDayIndex; i++) {
                        cells.push(<div key={`empty-${i}`} className="aspect-square" />);
                      }

                      // Month days
                      for (let day = 1; day <= daysInMonth; day++) {
                        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isSelected = dateString === selectedDate;
                        const isCurrentDate = year === todayDate.getFullYear() && month === todayDate.getMonth() && day === todayDate.getDate();

                        cells.push(
                          <button
                            key={`day-${day}`}
                            type="button"
                            onClick={() => {
                              setSelectedDate(dateString);
                              setSearchTab('custom');
                              setIsCalendarOpen(false);
                            }}
                            className={`aspect-square text-xs font-mono font-semibold rounded-full flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#1B3D8A] text-white font-bold shadow-md shadow-[#1B3D8A]/20 scale-105'
                                : isCurrentDate
                                ? 'border border-[#1B3D8A] text-[#1B3D8A] font-bold'
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                </div>

                {/* Shortcuts Footer */}
                <div className="bg-gray-50 p-4 border-t border-gray-100 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(todayStr);
                      setSearchTab('today');
                      setIsCalendarOpen(false);
                    }}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-sans font-bold transition-all border cursor-pointer ${
                      searchTab === 'today'
                        ? 'bg-[#1B3D8A] text-white border-[#1B3D8A] shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Aujourd'hui
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(tomorrowStr);
                      setSearchTab('tomorrow');
                      setIsCalendarOpen(false);
                    }}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-sans font-bold transition-all border cursor-pointer ${
                      searchTab === 'tomorrow'
                        ? 'bg-[#1B3D8A] text-white border-[#1B3D8A] shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Demain
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(afterTomorrowStr);
                      setSearchTab('after_tomorrow');
                      setIsCalendarOpen(false);
                    }}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-sans font-bold transition-all border cursor-pointer ${
                      searchTab === 'after_tomorrow'
                        ? 'bg-[#1B3D8A] text-white border-[#1B3D8A] shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Après-demain
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </AnimatePresence>
    </div>
  );
}
