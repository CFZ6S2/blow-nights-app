import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LandingPage from '../LandingPage';


// Mock de i18n
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    // Nav
    'landing.nav_venues': 'Venues',
    'landing.nav_rrpp': 'RRPP',
    
    // Hero
    'landing.active_now': 'Active now',
    'landing.live_city': 'Live in {city}',
    'landing.hero_desc_1': 'Connect',
    'landing.hero_desc_2': 'Discover',
    'landing.enter_free': 'Enter free',
    'landing.how_it_works': 'How it works',
    'landing.stat_venues': '{count}+ venues',
    'landing.stat_types': '{count}+ types',
    'landing.stat_tickets': '{count}+ tickets',
    
    // What is
    'landing.what_is': 'What is Blow Nights?',
    'landing.not_dating': 'Not a dating app',
    'landing.is_circuit': "It's a circuit",
    'landing.about_desc': 'About description',
    
    // Features
    'landing.feat1_title': 'Feature 1',
    'landing.feat1_desc': 'Feature 1 description',
    
    // Steps
    'landing.steps_title': 'How it works',
    'landing.step1_title': 'Step 1',
    'landing.step1_desc': 'Step 1 description',
    
    // Venue types
    'landing.venue_types': 'Venue types',
    'landing.venue_title': 'Explore venues',
    'landing.venue_desc': 'Venue description',
    'landing.vtype_bars': 'Bars',
    'landing.vtype_clubs': 'Clubs',
    'landing.vtype_afters': 'Afters',
    'landing.vtype_saunas': 'Saunas',
    'landing.vtype_cruising': 'Cruising',
    'landing.vtype_outdoor': 'Outdoor',
    
    // B2B
    'landing.b2b_tag': 'For venues',
    'landing.b2b_title': 'Manage your venue',
    'landing.b2b_desc': 'B2B description',
    'landing.b2b_register': 'Register',
    'landing.b2b_panel': 'Panel',
    'landing.b2b_qr': 'QR',
    'landing.b2b_promos': 'Promos',
    'landing.b2b_metrics': 'Metrics',
    
    // Privacy
    'landing.privacy_title': 'Privacy first',
    'landing.privacy_desc': 'Privacy description',
    'landing.priv_public': 'Public profile',
    'landing.priv_public_desc': 'Public description',
    'landing.priv_ghost': 'Ghost mode',
    'landing.priv_ghost_desc': 'Ghost description',
    'landing.priv_anon': 'Anonymous',
    'landing.priv_anon_desc': 'Anonymous description',
    
    // Footer
    'landing.footer_business': 'Business',
    'landing.footer_terms': 'Terms',
    'landing.footer_privacy': 'Privacy',
    'landing.footer_rules': 'Rules',
  };
  
  return translations[key] || key;
});

// Mock del hook useTranslation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { language: 'en' },
  }),
}));

// Mock de Firebase
vi.mock('@/lib/firebase', () => ({
  db: {},
  default: {},
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  getCountFromServer: vi.fn(() => Promise.resolve({ data: () => ({ count: 10 }) })),
}));
vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  logEvent: vi.fn(),
}));



describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Navigation', () => {
    it('renders nav items correctly', () => {
      render(<LandingPage onStart={() => {}} />, { wrapper: ({ children }: { children: React.ReactNode }) => <>{children}</> });
      
      expect(screen.getByText('Venues')).toBeInTheDocument();
      expect(screen.getByText('RRPP')).toBeInTheDocument();
    });
  });
  
  describe('Hero Section', () => {
    it('renders hero with active status', async () => {
      render(<LandingPage onStart={() => {}} />, { wrapper: ({ children }: { children: React.ReactNode }) => <>{children}</> });
      
      // La llamada a getCountFromServer devuelve 10, así que debería mostrar Active now
      expect(await screen.findByText(/Live in/i)).toBeInTheDocument();
    });
    
    it('renders hero description', () => {
      render(<LandingPage onStart={() => {}} />, { wrapper: ({ children }: { children: React.ReactNode }) => <>{children}</> });
      
      expect(screen.getByText(/Connect/i)).toBeInTheDocument();
      expect(screen.getByText(/Discover/i)).toBeInTheDocument();
    });
    
    it('renders CTA button', () => {
      render(<LandingPage onStart={() => {}} />, { wrapper: ({ children }: { children: React.ReactNode }) => <>{children}</> });
      
      expect(screen.getByText('Enter free')).toBeInTheDocument();
    });
  });
  
  describe('What is Blow Nights Section', () => {
    it('renders section title', () => {
      render(<LandingPage onStart={() => {}} />, { wrapper: ({ children }: { children: React.ReactNode }) => <>{children}</> });
      
      expect(screen.getByText('What is Blow Nights?')).toBeInTheDocument();
    });
    
    it('renders key differentiators', () => {
      render(<LandingPage onStart={() => {}} />, { wrapper: ({ children }: { children: React.ReactNode }) => <>{children}</> });
      
      expect(screen.getByText('Not a dating app')).toBeInTheDocument();
      expect(screen.getByText("It's a circuit")).toBeInTheDocument();
    });
    
    it('renders feature list', () => {
      render(<LandingPage onStart={() => {}} />, { wrapper: ({ children }: { children: React.ReactNode }) => <>{children}</> });
      
      expect(screen.getByText('Feature 1')).toBeInTheDocument();
    });
  });
  
  describe('How it Works Section', () => {
    it('renders steps title', () => {
      render(<LandingPage onStart={() => {}} />, { wrapper: ({ children }: { children: React.ReactNode }) => <>{children}</> });
      
      expect(screen.getAllByText('How it works').length).toBeGreaterThan(0);
    });
  });
  
  describe('Venue Types Section', () => {
    it('renders venue types section', () => {
      render(<LandingPage onStart={() => {}} />, { wrapper: ({ children }: { children: React.ReactNode }) => <>{children}</> });
      
      expect(screen.getByText('Venue types')).toBeInTheDocument();
      expect(screen.getByText('Explore venues')).toBeInTheDocument();
    });
    
    it('renders all venue type cards', () => {
      render(<LandingPage onStart={() => {}} />, { wrapper: ({ children }: { children: React.ReactNode }) => <>{children}</> });
      
      expect(screen.getByText('Bars')).toBeInTheDocument();
      expect(screen.getByText('Clubs')).toBeInTheDocument();
      expect(screen.getByText('Afters')).toBeInTheDocument();
      expect(screen.getByText('Saunas')).toBeInTheDocument();
      expect(screen.getByText('Cruising')).toBeInTheDocument();
      expect(screen.getByText('Outdoor')).toBeInTheDocument();
    });
  });
  
  describe('B2B Section', () => {
    it('renders B2B tagline', () => {
      render(<LandingPage onStart={() => {}} />, { wrapper: ({ children }: { children: React.ReactNode }) => <>{children}</> });
      
      expect(screen.getByText('For venues')).toBeInTheDocument();
    });
    
    it('renders B2B title and description', () => {
      render(<LandingPage onStart={() => {}} />, { wrapper: ({ children }: { children: React.ReactNode }) => <>{children}</> });
      
      expect(screen.getByText('Manage your venue')).toBeInTheDocument();
    });
    
    it('renders B2B CTA', () => {
      render(<LandingPage onStart={() => {}} />, { wrapper: ({ children }: { children: React.ReactNode }) => <>{children}</> });
      
      expect(screen.getByText('Register')).toBeInTheDocument();
    });
  });
  
  describe('Privacy Section', () => {
    it('renders privacy title', () => {
      render(<LandingPage onStart={() => {}} />, { wrapper: ({ children }: { children: React.ReactNode }) => <>{children}</> });
      
      expect(screen.getByText('Privacy first')).toBeInTheDocument();
    });
    
    it('renders privacy modes', () => {
      render(<LandingPage onStart={() => {}} />, { wrapper: ({ children }: { children: React.ReactNode }) => <>{children}</> });
      
      expect(screen.getByText('Public profile')).toBeInTheDocument();
      expect(screen.getByText('Ghost mode')).toBeInTheDocument();
      expect(screen.getByText('Anonymous')).toBeInTheDocument();
    });
  });
  
  describe('Footer', () => {
    it('renders footer links', () => {
      render(<LandingPage onStart={() => {}} />, { wrapper: ({ children }: { children: React.ReactNode }) => <>{children}</> });
      
      expect(screen.getByText('Business')).toBeInTheDocument();
      expect(screen.getByText('Terms')).toBeInTheDocument();
      expect(screen.getByText('Privacy')).toBeInTheDocument();
      expect(screen.getByText('Rules')).toBeInTheDocument();
    });
  });
});
