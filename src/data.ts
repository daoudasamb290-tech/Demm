/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PassengerBooking, DriverTrip, DriverTransaction } from './types';

export const LOCATIONS = [
  'Aéroport AIBD',
  'Dakar',
  'Diourbel',
  'Fatick',
  'Kaffrine',
  'Kaolack',
  'Kédougou',
  'Kolda',
  'Louga',
  'Matam',
  'Mboro',
  'Saint-Louis',
  'Sédhiou',
  'Tambacounda',
  'Thiès',
  'Tivaouane',
  'Touba',
  'Ziguinchor'
];

export interface SearchDriver {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  tripsCount: number;
  vehicleName: string;
  vehiclePlate: string;
  departureTime: string;
  terminus: string;
  seatsAvailable: number;
  price: number;
  verified: 'CONFIRMÉ' | 'VÉRIFIÉE' | 'COMPLET';
  phone: string;
  isDriverTrip?: boolean;
  passengerCount?: number;
  maxPassengers?: number;
  date?: string;
  from?: string;
  boardingPlace?: string;
}

export const SEARCH_DRIVERS: SearchDriver[] = [
  {
    id: 'driver-moussa-sow',
    name: 'Moussa Sow',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCaljOEWF2M1u1iR7FPJngJxMuZ1rqoFehQP4WTlGRe9W3lA5AzVE2NK8T16FbgewGch4hdrKMK65ceUpCdR_YnfiVHJHTB4TK73B1muUvpz-0FLmoVjksFoUghdHGWxnyDkE9dXvnYn1z7XzXZ7VGk16j3DLfMF6Buez-zjZP9a4ik650l-d2NxpIhpx6LFWrh4lo1athhUy6ORVCLlgMzcIkjdQpimnu8Jm7PZ56X01lZgm_wTtMa3hOO8Rmr8jZQAkLPslqKjuf8',
    rating: 4.8,
    tripsCount: 124,
    vehicleName: 'Toyota Hiace',
    vehiclePlate: 'DK-4521-A',
    departureTime: '08:15',
    terminus: 'Tivaouane',
    seatsAvailable: 3,
    price: 6000,
    verified: 'CONFIRMÉ',
    phone: '+221 77 654 32 10',
    date: '24 Juin',
    from: 'Dakar'
  },
  {
    id: 'driver-awa-diallo',
    name: 'Awa Diallo',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAADAt8vgr2pvqJlfHC0tt9X57f0asrwgHXyjcNjUMJOSHOgw0FKR5N7A5WAQzr90udi6VABk43uLwsJ7o3HhMaRGT5LQhKBw4nBGOSNdmk3-4TauEONF4AdSc8gpt9-oGFtSQwnPkXnxKBMscKjtnRGhSVSWv3zF_oUzqn2Tqpkd_cHlC-eFfwl9CmcHVwsy2ZyF7UXxoerbJrCya-I_P77N9OI_WXjQ2K34GnvBBK4o3WAggnQv4ZLNaE5g2TTclMx8XWPynRMz7r',
    rating: 4.6,
    tripsCount: 89,
    vehicleName: 'Hyundai i10',
    vehiclePlate: 'DK-8891-B',
    departureTime: '08:30',
    terminus: 'Tivaouane',
    seatsAvailable: 1,
    price: 6000,
    verified: 'VÉRIFIÉE',
    phone: '+221 77 987 65 43',
    date: '25 Juin',
    from: 'Dakar'
  },
  {
    id: 'driver-ibrahima-kane',
    name: 'Ibrahima Kane',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLheGhfTuXIcSkxl_wRVeunVlIMg_jJpE6wn8JAryUVUaez3qvGEt_aGrO1KUbyVv4hb64E6i-2839-sCQP6rkL0G7ou3RSNN4zsPddcUz0QtpcQaUeDeHGAykAS1q9I7EQbBKPh3KwheD7nwIRjEsmFsXF10Q_c7tZkHkRH_RKZ-nLe9S80GdTOdj2mZRN-U-EivsAefSUz1Mm7K9TsmA8082dz-J5a9TlFeLo45YvdGHs-i-gEXeDNEN-wD4JhCuAwXtxF7S4bhg',
    rating: 4.9,
    tripsCount: 210,
    vehicleName: 'Peugeot 508',
    vehiclePlate: 'DK-1022-C',
    departureTime: '08:45',
    terminus: 'Tivaouane',
    seatsAvailable: 0,
    price: 6000,
    verified: 'COMPLET',
    phone: '+221 77 123 45 67',
    date: '26 Juin',
    from: 'Dakar'
  }
];

export const INITIAL_BOOKINGS: PassengerBooking[] = [
  {
    id: 'b1',
    reference: 'TK-100626-114',
    from: 'Dakar',
    to: 'Tivaouane',
    date: '10 Juin 2026',
    time: '08h00',
    passengerName: 'DAOUDA SAMB',
    phone: '772783150',
    status: 'active',
    price: 6250,
    driverName: 'Amadou Diop',
    driverAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvNQrb-R7nFQf0onqIhFX2i2iMgQnaSMUB3TeQ-z3YOp5URgTiXTBe7w8uptVXIJ9_lfuvuevueAI2WrZ-LYeohISbnbjgcDE-ROD5PK7-gaLMJWZJ8MjZTYW3CHBFZp2ZB1KzdS_O1h6g5F5PnffRTNgHpFLu0ls7-5IDvkthxA8ZycrcigJ9EOZx08a20Je8Ox4sxucFn-NF5WDI62phobboDwe-hofULuQHvSxT9mzJTFee_kjUIujI0FfpS5394ExaeVi5Nq-i',
    driverPhone: '+221 77 111 22 33',
    vehicleName: 'Toyota Hiace',
    vehiclePlate: 'DK-4521-A',
    pickupAddress: 'yoff'
  },
  {
    id: 'b2',
    reference: 'TK-230526-282',
    from: 'Dakar',
    to: 'Touba',
    date: '23 Mai 2026',
    time: '10h30',
    passengerName: 'DAOUDA SAMB',
    phone: '772783150',
    status: 'active',
    price: 6250,
    driverName: 'Dave',
    driverAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB12oQk8t6RcC0ND2_cs5btzDDqk8FBtmDDLMBq17QD9BR96IbAIbXLp-uu2RqNNg9yrMtglZ6BTP7M86B6oVzouxT6H0YgIys6oITphE0zToarfht8rgVJhX-fXyjTyWHy0da_gNrJN9zJLxDJR5CJ3o_dg16DzyCKP8wU8ZzmL7sly1UqZEZooK1yxwg6qXFAhYvjxDGcYDt9pkwS1WMs_KE5pM5EzZGaAR3I7zz-GuuNgDOljHV9_8ao0jMGXxHMhltfzage7RTd',
    driverPhone: '+221 77 222 33 44',
    vehicleName: 'Toyota Hiace',
    vehiclePlate: 'DK-7788-X',
    pickupAddress: 'Grand Yoff'
  }
];

export const INITIAL_DRIVER_TRIPS: DriverTrip[] = [
  {
    id: 'dt1',
    from: 'Dakar',
    to: 'Touba',
    date: 'Aujourd\'hui',
    time: '07H00',
    passengerCount: 14,
    maxPassengers: 15,
    status: 'pending'
  },
  {
    id: 'dt2',
    from: 'Touba',
    to: 'Dakar',
    date: '14 Oct',
    time: '14:30',
    passengerCount: 15,
    maxPassengers: 15,
    status: 'pending'
  },
  {
    id: 'dt3',
    from: 'Dakar',
    to: 'Saint-Louis',
    date: '15 Oct',
    time: '06:00',
    passengerCount: 8,
    maxPassengers: 15,
    status: 'pending'
  }
];

export const INITIAL_TRANSACTIONS: DriverTransaction[] = [
  {
    id: 't1',
    title: 'Course #D239',
    date: 'Aujourd\'hui, 14:20',
    amount: 4500,
    type: 'income'
  },
  {
    id: 't2',
    title: 'Commission Wave',
    date: 'Aujourd\'hui, 10:15',
    amount: -200,
    type: 'commission'
  }
];

export const SPECIAL_AIBD_CARD = {
  title: 'AIBD · Aéroport',
  subtitle: 'Navette directe 24h/24',
  features: [
    'Bagages inclus',
    'Climatisation garantie'
  ],
  price: 10000,
  logo: '/src/assets/images/log.png'
};
