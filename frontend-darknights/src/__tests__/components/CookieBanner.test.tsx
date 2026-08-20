import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  isSupported: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@/lib/firebase', () => ({
  default: {},
}));

import CookieBanner from '@/components/CookieBanner';

describe('CookieBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  test('shows banner when no consent stored', () => {
    render(<CookieBanner />);
    expect(screen.getByText('cookie.text')).toBeInTheDocument();
  });

  test('hides banner when consent already accepted', () => {
    localStorage.setItem('cookie_consent', 'accepted');
    const { container } = render(<CookieBanner />);
    expect(container.innerHTML).toBe('');
  });

  test('hides banner when consent already rejected', () => {
    localStorage.setItem('cookie_consent', 'rejected');
    const { container } = render(<CookieBanner />);
    expect(container.innerHTML).toBe('');
  });

  test('accept sets localStorage and hides banner', async () => {
    render(<CookieBanner />);
    fireEvent.click(screen.getByText('cookie.accept'));
    expect(localStorage.getItem('cookie_consent')).toBe('accepted');
    expect(screen.queryByText('cookie.text')).not.toBeInTheDocument();
  });

  test('reject sets localStorage and hides banner', () => {
    render(<CookieBanner />);
    fireEvent.click(screen.getByText('cookie.reject'));
    expect(localStorage.getItem('cookie_consent')).toBe('rejected');
    expect(screen.queryByText('cookie.text')).not.toBeInTheDocument();
  });
});
