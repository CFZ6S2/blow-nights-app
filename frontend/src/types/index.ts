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
  blocked_users?: string[];
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
  cityId?: string;
  cruisingMode?: boolean;
  incognito?: boolean;
  lastBoost?: any;
  ghostMode?: boolean;
  notificationsEnabled?: boolean;
  invitesCount?: number;
  verificationStatus?: string;
  complexion?: string;
  needsUpdate?: boolean;
}

export interface Venue {
  id: string;
  name: string;
  description?: string;
  type?: string;
  address?: string;
  coverImage?: string;
  isActive?: boolean;
  location: {
    latitude: number;
    longitude: number;
  };
  ownerId: string;
  cityId: string;
  currentCount: number;
  ticketPricing?: Record<string, {
    name?: string;
    description?: string;
    amount?: number;
    stripePriceId: string;
    quota?: number;
  }>;
  ticketsSold?: Record<string, number>;
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
  status: 'active' | 'full' | 'ended';
  created_at: any;
  expires_at: any;
  boosted?: boolean;
  tags?: string[];
}

export interface ChillRequest {
  id: string;
  chill_id: string;
  user_uid: string;
  user_nick: string;
  user_foto: string;
  user_edad: number | null;
  user_bio?: string;
  status: 'pending' | 'accepted' | 'denied';
  created_at: any;
}
