/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PassengerBooking {
  id: string;
  reference: string;
  from: string;
  to: string;
  date: string;
  time: string;
  passengerName: string;
  phone: string;
  status: 'active' | 'completed' | 'cancelled' | 'pending' | 'accepted' | 'refused';
  price: number;
  driverName: string;
  driverAvatar: string;
  driverPhone: string;
  vehicleName: string;
  vehiclePlate: string;
  pickupAddress: string;
  paymentMethod?: 'wave' | 'orange_money' | 'card';
  seatsCount?: number;
}

export interface DriverTrip {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  passengerCount: number;
  maxPassengers: number;
  status: 'pending' | 'running' | 'completed';
  boardingPlace?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverAvatar?: string;
  vehicleName?: string;
  vehiclePlate?: string;
  price?: number;
}

export interface DriverTransaction {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: 'income' | 'commission';
}

export interface AppState {
  role: 'welcome' | 'passenger' | 'driver';
  passengerScreen: 'register' | 'login' | 'home' | 'search_results' | 'pay' | 'ticket' | 'bookings' | 'profil' | 'aibd_booking';
  driverScreen: 'register' | 'login' | 'home' | 'portal' | 'revenus' | 'profil';
}
