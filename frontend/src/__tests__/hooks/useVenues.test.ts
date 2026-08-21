import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVenues, useVenueCheckins } from '../../hooks/useVenues';

vi.mock('@/lib/firebase', () => ({
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn((q, cb) => vi.fn()),
}));

describe('useVenues hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useVenues', () => {
    it('debería inicializar con arrays vacíos', () => {
      const { result } = renderHook(() => useVenues('madrid'));
      
      expect(result.current.venues).toEqual([]);
      expect(result.current.grouped).toBeDefined();
      expect(result.current.loading).toBe(true);
    });
  });

  describe('useVenueCheckins', () => {
    it('debería inicializar con 0', () => {
      const { result } = renderHook(() => useVenueCheckins('venue-123'));
      
      expect(result.current).toBe(0);
    });
  });
});
