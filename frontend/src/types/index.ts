export interface User {
  id: string;
  uid?: string;
  nick: string;
  edad: number | null;
  rol: string;
  intencion: string;
  fotoUrl: string;
  online: boolean;
  premium: boolean;
  fcmToken?: string;
  lat?: number;
  lng?: number;
  geohash?: string;
  blockedUsers?: string[];
  boostedUntil?: any;
  mood?: string;
  verified?: boolean;
  extraPhotos?: string[];
  privatePhotos?: string[];
  nsfwPhotos?: number[];
  bio?: string;
  altura?: number;
  peso?: number;
  matches?: string[];
  lastSeen?: any;
  intereses?: string[];
  nsfwBlur?: boolean;
  role?: string;
  dailyPingsLeft?: number;
  lastPingReset?: any;
  isVIPNight?: boolean;
  activePlatforms?: string[];
  currentCity?: string;
  cityId?: string;
  cruisingMode?: boolean;
  incognito?: boolean;
  lastBoost?: any;
  ghostMode?: boolean;
  notificationsEnabled?: boolean;
  verificationStatus?: string;
  complexion?: string;
  needsUpdate?: boolean;
  venueId?: string;
  qrCredits?: number;
  membershipTier?: 'free' | 'plus' | 'black' | null;
  membershipStatus?: 'active' | 'canceled' | null;
  blackBoostExpires?: any; // Timestamp for Black 8h boost
  promoMember?: boolean;   // first 100 Black‑for‑life flag
}

export interface Venue {
  id: string;
  name: string;
  description?: string;
  type?: string;
  address?: string;
  coverImage?: string;
  isActive?: boolean;
  externalTicketUrl?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  ownerId: string;
  cityId: string;
  isClaimed?: boolean;
  currentCount: number;
  capacity?: number;
  affiliatedBy?: string;
  hasTicketing?: boolean;
  boostActive?: boolean;
  subscription?: any;
  promoBanner?: any;
  ticketPricing?: Record<string, {
    name?: string;
    description?: string;
    amount?: number;
    stripePriceId: string;
    quota?: number;
  }>;
  ticketsSold?: Record<string, number>;
  subscriptionTier?: 'basico' | 'promo' | 'ticketing';
  subscriptionStatus?: string;
  stripeSubscriptionId?: string;
  stripeAccountId?: string;
  isVerified?: boolean;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: any; // Firebase Timestamp
  location: { latitude: number; longitude: number; address?: string };
  capacity: number;
  organizerId: string;
  organizerType: 'user' | 'venue';
  organizerName: string;
  cityId: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  ticket_tiers?: any[];
  coverImage?: string;
  door_access_token?: string;
  stripeAccountId?: string;
}

export interface Ticket {
  id: string;
  userId: string;
  venueId: string;
  ticketType: string;
  status: 'valid' | 'used' | 'cancelled';
  qrToken: string;
  purchasedAt: any; // Firebase Timestamp
  usedAt?: any; // Firebase Timestamp
  pin?: string;
}

export interface Checkin {
  id: string;
  userId: string;
  venueId: string;
  createdAt: any; // Firebase Timestamp
  expiresAt: any; // Firebase Timestamp
}

export interface Chill {
  id: string;
  host_uid: string;
  host_nick: string;
  host_foto: string;
  city_slug: string;
  title: string;
  description?: string;
  approx_lat: number;
  approx_lng: number;
  exact_address: string;
  max_capacity: number;
  accepted_users: string[];
  pending_users: string[];
  denied_users: string[];
  status: 'active' | 'full' | 'ended' | 'closed' | 'purged';
  created_at: any;
  expires_at: any;
  boosted?: boolean;
  tags?: string[];
  instructions?: string;
  scanner_token?: string;
  type?: ChillType;
  stats?: any;
}

export type ChillType = 'social' | 'commercial';
export type MonetizationType = 'in_app' | 'out_of_app';

export interface ChillRequest {
  id: string;
  chill_id: string;
  chillId?: string;
  user_uid: string;
  user_nick: string;
  userName?: string;
  user_foto: string;
  user_edad: number | null;
  user_bio?: string;
  status: 'pending' | 'accepted' | 'denied';
  created_at: any;
  qrToken?: string;
  qr_code?: string;
  pin?: string;
  checkedIn?: boolean;
}
