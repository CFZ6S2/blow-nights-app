import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WalletPage from '@/app/[city]/wallet/page';

// Mock de hooks
const mockPush = vi.fn();
const mockCityPath = vi.fn((path) => `/madrid${path}`);

vi.mock('@/hooks/useCityRouter', () => ({
  useCityRouter: () => ({
    cityPath: mockCityPath,
    router: { push: mockPush },
  }),
}));

const mockUseAuth = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseTickets = vi.fn();
vi.mock('@/hooks/useTickets', () => ({
  useTickets: () => mockUseTickets(),
}));

// Mock de i18n
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'wallet.title': 'Wallet',
    'wallet.subtitle': 'Your tickets',
    'wallet.tab_active': 'Active',
    'wallet.tab_used': 'Used',
    'wallet.empty_active': 'No active tickets',
    'wallet.empty_used': 'No used tickets',
    'wallet.view_venues': 'View venues',
    'wallet.ticket_valid': 'Valid',
    'wallet.ticket_used': 'Used',
    'wallet.ticket_already_scanned': 'Already scanned',
    'wallet.download_pdf': 'Download PDF',
    'wallet.add_to_apple_wallet': 'Add to Apple Wallet',
    'wallet.close': 'Close'
  };
  return translations[key] || key;
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}));

// Mock de firebase
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  functions: {},
}));

describe('WalletPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to login if not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false });
    mockUseTickets.mockReturnValue({ tickets: [], valid: [], used: [], loading: false });

    render(<WalletPage />);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('shows loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: true });
    mockUseTickets.mockReturnValue({ tickets: [], valid: [], used: [], loading: false });

    const { container } = render(<WalletPage />);
    // Debería renderizar un div con la clase animate que está rotando
    expect(container.querySelector('.animate-pulse') || container.querySelector('.rounded-full')).toBeInTheDocument();
  });

  it('renders empty active tickets state correctly', () => {
    mockUseAuth.mockReturnValue({ user: { uid: '123' }, profile: { role: 'user' }, loading: false });
    mockUseTickets.mockReturnValue({ tickets: [], valid: [], used: [], loading: false });

    render(<WalletPage />);

    expect(screen.getByText('Wallet')).toBeInTheDocument();
    expect(screen.getByText('Your tickets')).toBeInTheDocument();
    expect(screen.getByText(/Active \(/i)).toBeInTheDocument();
    expect(screen.getByText('No active tickets')).toBeInTheDocument();
    expect(screen.getByText('View venues')).toBeInTheDocument();
  });

  it('renders empty used tickets state correctly', () => {
    mockUseAuth.mockReturnValue({ user: { uid: '123' }, profile: { role: 'user' }, loading: false });
    mockUseTickets.mockReturnValue({ tickets: [], valid: [], used: [], loading: false });

    render(<WalletPage />);

    // Cambiar a la pestaña de "Usados"
    // Use getAllByText because 'Used' matches 'Used (0)' tab and 'Used' in empty state translations
    fireEvent.click(screen.getByText(/Used \(/i));

    expect(screen.getByText('No used tickets')).toBeInTheDocument();
    expect(screen.queryByText('View venues')).not.toBeInTheDocument();
  });

  it('renders valid tickets list and can click to see details', () => {
    const mockValidTicket = {
      id: 'ticket1',
      status: 'valid',
      venueName: 'Club A',
      ticketType: 'standard',
      qrToken: 'dummy-token',
      purchasedAt: { toDate: () => new Date('2026-08-20') }
    };

    mockUseAuth.mockReturnValue({ user: { uid: '123' }, profile: { role: 'user' }, loading: false });
    mockUseTickets.mockReturnValue({ tickets: [mockValidTicket], valid: [mockValidTicket], used: [], loading: false });

    render(<WalletPage />);

    // Verificar que el ticket está en la lista
    expect(screen.getByText('Club A')).toBeInTheDocument();
    expect(screen.getByText('standard')).toBeInTheDocument();

    // Hacer click en el ticket
    fireEvent.click(screen.getByText('Club A'));

    // Verificar que el modal de detalle se abre
    expect(screen.getByText('Download PDF')).toBeInTheDocument();
    expect(screen.getByText('Add to Apple Wallet')).toBeInTheDocument();
    
    // Cerrar el modal
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByText('Download PDF')).not.toBeInTheDocument();
  });

  it('renders used tickets list', () => {
    const mockUsedTicket = {
      id: 'ticket2',
      status: 'used',
      venueName: 'Club B',
      ticketType: 'vip',
      purchasedAt: { toDate: () => new Date('2026-08-20') }
    };

    mockUseAuth.mockReturnValue({ user: { uid: '123' }, profile: { role: 'user' }, loading: false });
    mockUseTickets.mockReturnValue({ tickets: [mockUsedTicket], valid: [], used: [mockUsedTicket], loading: false });

    render(<WalletPage />);
    
    fireEvent.click(screen.getByText(/Used \(/i));
    
    expect(screen.getByText('Club B')).toBeInTheDocument();
    expect(screen.getByText('vip')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Club B'));
    expect(screen.getByText('Already scanned')).toBeInTheDocument();
  });
});
