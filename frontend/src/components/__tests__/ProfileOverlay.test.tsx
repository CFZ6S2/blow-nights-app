import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProfileOverlay from '../ProfileOverlay';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    useScroll: () => ({ scrollY: { get: () => 0, on: vi.fn(() => () => {}), onChange: vi.fn(() => () => {}) } }),
    useTransform: () => ({ get: () => 0, on: vi.fn(() => () => {}), onChange: vi.fn(() => () => {}) }),
  };
});

vi.mock('@/lib/geo', () => ({
  calculateDistance: () => 1.5,
}));

vi.mock('@/lib/timeUtils', () => ({
  formatLastSeen: () => '5m ago',
}));

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCityRouter', () => ({
  useCityRouter: () => ({
    cityPath: vi.fn((path) => `/madrid${path || ''}`),
  }),
}));

const mockUser = { uid: 'currentUser123' };
const mockProfile = { nick: 'Cesar', lat: 40, lng: -3 };

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/hooks/useLikes', () => ({
  useLikes: () => ({
    sendLike: vi.fn().mockResolvedValue({ isMatch: false }),
  }),
}));

vi.mock('@/hooks/useSafeActions', () => ({
  useSafeActions: () => ({
    blockUser: vi.fn(),
    reportUser: vi.fn(),
  }),
}));

vi.mock('@/hooks/useChat', () => ({
  getOrCreateChat: vi.fn().mockResolvedValue('chat123'),
}));

vi.mock('@/components/MatchOverlay', () => ({
  default: () => <div data-testid="match-overlay">Match!</div>,
}));

// Mock Firebase
const mockProfileData = {
  id: 'user123',
  nick: 'Alex',
  fotoUrl: 'https://example.com/photo.jpg',
  bio: 'Software dev',
  edad: 25,
  intereses: ['tech', 'music', 'travel'],
  premium: false,
};

vi.mock('firebase/firestore', () => ({
  doc: (db, collectionName, docId) => ({
    path: `${collectionName}/${docId}`,
  }),
  getDoc: vi.fn((docRef) => {
    // If checking likes
    if (docRef?.path?.includes('likes')) {
      return Promise.resolve({ exists: () => false });
    }
    // Profile fetch
    return Promise.resolve({
      exists: () => true,
      id: 'user123',
      data: () => mockProfileData,
    });
  }),
  collection: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

describe('ProfileOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with correct data', async () => {
    render(<ProfileOverlay id="user123" onClose={vi.fn()} />);

    // Waits for loading to finish
    await waitFor(() => {
      expect(screen.queryByTestId('profile-skeleton')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Alex, 25/)).toBeInTheDocument();
    expect(screen.getByText('Software dev')).toBeInTheDocument();
    expect(screen.getByText('tech')).toBeInTheDocument();
    expect(screen.getByText('music')).toBeInTheDocument();
  });

  it('renders like and chat buttons', async () => {
    render(<ProfileOverlay id="user123" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('overlay.like')).toBeInTheDocument();
    });
    
    // Check buttons by text or icon
    const likeButton = screen.getByText('overlay.like');
    expect(likeButton).toBeInTheDocument();
  });
});
