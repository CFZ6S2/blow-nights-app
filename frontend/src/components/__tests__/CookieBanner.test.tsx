import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CookieBanner from '../CookieBanner';

// Mock de i18n
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'cookie.text': 'We use cookies',
    'cookie.accept': 'Accept',
    'cookie.reject': 'Reject',
  };
  return translations[key] || key;
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { language: 'en' },
  }),
}));

describe('CookieBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });
  
  it('renders cookie consent banner', () => {
    render(<CookieBanner />);
    
    expect(screen.getByText('We use cookies')).toBeInTheDocument();
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });
  
  it('handles cookie accept', async () => {
    const user = userEvent.setup();
    render(<CookieBanner />);
    
    expect(screen.getByText('We use cookies')).toBeInTheDocument();
    
    await user.click(screen.getByText('Accept'));
    
    // Verificar que el banner desaparece
    await waitFor(() => {
      expect(screen.queryByText('We use cookies')).not.toBeInTheDocument();
    });
    
    expect(localStorage.getItem('cookieConsent')).toBe('true');
  });

  it('handles cookie reject', async () => {
    const user = userEvent.setup();
    render(<CookieBanner />);
    
    expect(screen.getByText('We use cookies')).toBeInTheDocument();
    
    await user.click(screen.getByText('Reject'));
    
    // Verificar que el banner desaparece
    await waitFor(() => {
      expect(screen.queryByText('We use cookies')).not.toBeInTheDocument();
    });
    
    expect(localStorage.getItem('cookieConsent')).toBe('false');
  });
});
