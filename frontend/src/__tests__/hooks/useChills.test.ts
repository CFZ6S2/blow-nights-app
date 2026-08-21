import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChills, useChillRequests, useMyChills } from '../../hooks/useChills';
import { useAuth } from '@/context/AuthContext';

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
  functions: {}
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn((q, cb) => vi.fn()),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn()),
}));

describe('useChills hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useChills', () => {
    it('debería inicializar con chills vacíos', () => {
      (useAuth as any).mockReturnValue({ user: { uid: 'user1' }, loading: false });
      const { result } = renderHook(() => useChills('madrid'));
      
      expect(result.current.chills).toEqual([]);
      expect(result.current.loading).toBe(true);
    });
  });

  describe('useChillRequests', () => {
    it('debería inicializar requests vacíos', () => {
      (useAuth as any).mockReturnValue({ user: { uid: 'user1' }, loading: false });
      const { result } = renderHook(() => useChillRequests('chill-123'));
      
      expect(result.current.requests).toEqual([]);
      expect(result.current.loading).toBe(true);
    });
  });

  describe('useMyChills', () => {
    it('debería inicializar myChills vacíos', () => {
      (useAuth as any).mockReturnValue({ user: { uid: 'user1' }, loading: false });
      const { result } = renderHook(() => useMyChills());
      
      expect(result.current.myChills).toEqual([]);
      expect(result.current.loading).toBe(true);
    });
  });
});
