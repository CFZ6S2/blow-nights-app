import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import CitySelector from '@/components/CitySelector';

const mockSetCurrentCity = vi.fn();

vi.mock('@/context/CityContext', () => ({
  useCity: () => ({
    cities: [
      { id: 'london', name: 'London', emoji: '🇬🇧', country: 'UK' },
      { id: 'barcelona', name: 'Barcelona', emoji: '🇪🇸', country: 'Spain' },
      { id: 'madrid', name: 'Madrid', emoji: '🇪🇸', country: 'Spain' },
    ],
    currentCity: { id: 'london', name: 'London', emoji: '🇬🇧', country: 'UK' },
    setCurrentCity: mockSetCurrentCity,
    detectedByGPS: false,
  }),
}));

describe('CitySelector', () => {
  test('renders current city name', () => {
    render(<CitySelector />);
    expect(screen.getByText('London')).toBeInTheDocument();
  });

  test('opens dropdown on click', () => {
    render(<CitySelector />);
    fireEvent.click(screen.getByText('London'));
    expect(screen.getByText('Barcelona')).toBeInTheDocument();
    expect(screen.getByText('Madrid')).toBeInTheDocument();
  });

  test('selects a different city', () => {
    render(<CitySelector />);
    fireEvent.click(screen.getByText('London'));
    fireEvent.click(screen.getByText('Barcelona'));
    expect(mockSetCurrentCity).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'barcelona', name: 'Barcelona' })
    );
  });

  test('shows check icon for current city', () => {
    render(<CitySelector />);
    fireEvent.click(screen.getByText('London'));
    const checkIcons = screen.getAllByText('check_circle');
    expect(checkIcons.length).toBe(1);
  });
});
