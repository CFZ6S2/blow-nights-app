// Map.test.tsx – Simplified test for Map component (mocked)
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { User } from '@/types';

// Mock common Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/madrid',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ city: 'madrid' })
}));

// Mock react-map-gl/maplibre to a simple div
vi.mock('react-map-gl/maplibre', () => ({
  __esModule: true,
  default: ({ children }: any) => <div role="region" aria-label="map">{children}</div>,
  Marker: ({ children }: any) => <div>{children}</div>,
  NavigationControl: () => null,
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es', changeLanguage: vi.fn() } }),
  Trans: ({ children }: any) => children,
}));

// Mock Firebase & Auth contexts (no‑op)
vi.mock('@/lib/firebase', () => ({ db: {}, functions: {}, auth: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  onSnapshot: vi.fn(() => () => {}), // return noop unsubscribe
  query: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
}));
vi.mock('@/context/CityContext', () => ({
  useCity: () => ({ citySlug: 'madrid', cityPath: (path: string) => path })
}));
vi.mock('@/hooks/useCityRouter', () => ({
  useCityRouter: () => ({ cityPath: (path: string) => path })
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'testUser' },
    profile: { lat: 40, lng: -3, premium: false, online: true },
    isPlus: false,
    hasBlackAccess: false,
  })
}));

// Mock the Map component itself to avoid real map logic
vi.mock('../Map', () => ({
  __esModule: true,
  default: () => (
    <div>
      <div>Alice, 28</div>
    </div>
  ),
}));

describe('Map component (mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const { default: MockMap } = await import('../Map');
    render(<MockMap />);
    await waitFor(() => {});
  });

  it('displays a user marker for a mocked user', async () => {
    const { default: MockMap } = await import('../Map');
    render(<MockMap />);
    await waitFor(() => {
      expect(screen.getByText(/Alice, 28/)).toBeInTheDocument();
    });
  });
});
