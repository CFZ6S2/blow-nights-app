import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';

const mockChangeLanguage = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: {
      language: 'es',
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

import LanguageSelector from '@/components/LanguageSelector';

describe('LanguageSelector', () => {
  beforeEach(() => {
    mockChangeLanguage.mockClear();
  });

  test('renders current language label', () => {
    render(<LanguageSelector />);
    expect(screen.getByText('ES')).toBeInTheDocument();
  });

  test('opens language dropdown on click', () => {
    render(<LanguageSelector />);
    fireEvent.click(screen.getByText('ES'));
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('DE')).toBeInTheDocument();
    expect(screen.getByText('FR')).toBeInTheDocument();
    expect(screen.getByText('PT')).toBeInTheDocument();
  });

  test('changes language when option clicked', () => {
    render(<LanguageSelector />);
    fireEvent.click(screen.getByText('ES'));
    fireEvent.click(screen.getByText('EN'));
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });

  test('shows all 10 languages', () => {
    render(<LanguageSelector />);
    fireEvent.click(screen.getByText('ES'));
    const labels = ['ES', 'EN', 'DE', 'PT', 'CA', 'FR', 'IT', 'GR', 'RU', 'AR'];
    labels.forEach(label => {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    });
  });
});
