import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getCountFromServer: vi.fn(() => Promise.resolve({ data: () => ({ count: 42 }) })),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  logEvent: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
  default: {},
}));

import LandingPage from '@/components/LandingPage';

describe('LandingPage', () => {
  test('renders hardcoded brand name', () => {
    render(<LandingPage onStart={vi.fn()} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain('DARKNIGHTS');
    expect(heading.textContent).toContain('NIGHTS');
  });

  test('renders CTA button', () => {
    render(<LandingPage onStart={vi.fn()} />);
    expect(screen.getByText('landing.enter_free')).toBeInTheDocument();
  });

  test('calls onStart when CTA clicked', () => {
    const onStart = vi.fn();
    render(<LandingPage onStart={onStart} />);
    fireEvent.click(screen.getByText('landing.enter_free'));
    expect(onStart).toHaveBeenCalled();
  });

  test('renders footer links', () => {
    render(<LandingPage onStart={vi.fn()} />);
    expect(screen.getByText('landing.footer_business')).toBeInTheDocument();
    expect(screen.getByText('landing.footer_terms')).toBeInTheDocument();
    expect(screen.getByText('landing.footer_privacy')).toBeInTheDocument();
  });

  test('renders how it works section', () => {
    render(<LandingPage onStart={vi.fn()} />);
    const howItWorks = screen.getAllByText('landing.how_it_works');
    expect(howItWorks.length).toBeGreaterThanOrEqual(1);
  });
});
