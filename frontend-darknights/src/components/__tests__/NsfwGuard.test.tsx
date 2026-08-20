import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NsfwGuard from '../NsfwGuard';

// Mock de i18n
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'nsfw.tap_to_view': 'Tap to view',
  };
  return translations[key] || key;
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { language: 'en' },
  }),
}));

describe('NsfwGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders standard image when not nsfw', () => {
    render(<NsfwGuard src="/test.jpg" alt="Test" isNsfw={false} />);
    
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/test.jpg');
    expect(screen.queryByText('Tap to view')).not.toBeInTheDocument();
  });

  it('renders NSFW guard overlay when isNsfw is true', () => {
    render(<NsfwGuard src="/test.jpg" alt="Test" isNsfw={true} />);
    
    expect(screen.getByText('Tap to view')).toBeInTheDocument();
  });
  
  it('handles NSFW guard tap and reveals image', async () => {
    const user = userEvent.setup();
    render(<NsfwGuard src="/test.jpg" alt="Test" isNsfw={true} />);
    
    expect(screen.getByText('Tap to view')).toBeInTheDocument();
    
    // Tap to reveal
    await user.click(screen.getByText('Tap to view'));
    
    expect(screen.queryByText('Tap to view')).not.toBeInTheDocument();
    
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/test.jpg');
  });
});
