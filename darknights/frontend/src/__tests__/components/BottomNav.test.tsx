import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { BottomNav } from '@/components/BottomNav';

const mockAuth = {
  user: null as any,
  isAdmin: false,
  isSuperAdmin: false,
  isCityAdmin: false,
  isVenueManager: false,
};

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('@/context/CityContext', () => ({
  useCity: () => ({ citySlug: 'madrid' }),
}));

describe('BottomNav', () => {
  test('renders nothing when user is not logged in', () => {
    mockAuth.user = null;
    const { container } = render(<BottomNav />);
    expect(container.innerHTML).toBe('');
  });

  test('renders nav items for logged in user', () => {
    mockAuth.user = { uid: 'u1' };
    render(<BottomNav />);
    expect(screen.getByText('Mapa')).toBeInTheDocument();
    expect(screen.getByText('Locales')).toBeInTheDocument();
    expect(screen.getByText('Chills')).toBeInTheDocument();
    expect(screen.getByText('Cartera')).toBeInTheDocument();
    expect(screen.getByText('Chats')).toBeInTheDocument();
    expect(screen.getByText('Perfil')).toBeInTheDocument();
  });

  test('shows admin link for admin users', () => {
    mockAuth.user = { uid: 'u1' };
    mockAuth.isAdmin = true;
    render(<BottomNav />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    mockAuth.isAdmin = false;
  });

  test('shows venue-admin link for venue managers', () => {
    mockAuth.user = { uid: 'u1' };
    mockAuth.isVenueManager = true;
    render(<BottomNav />);
    expect(screen.getByText('nav.my_venue')).toBeInTheDocument();
    mockAuth.isVenueManager = false;
  });

  test('links use correct city slug in paths', () => {
    mockAuth.user = { uid: 'u1' };
    render(<BottomNav />);
    const mapLink = screen.getByText('Mapa').closest('a');
    expect(mapLink).toHaveAttribute('href', '/madrid');
    const venueLink = screen.getByText('Locales').closest('a');
    expect(venueLink).toHaveAttribute('href', '/madrid/venues');
  });
});
