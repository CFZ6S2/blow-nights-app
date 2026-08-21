import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVenues } from '../useVenues';
import { useAuth } from '@/context/AuthContext';

// Mock dependencies
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  onSnapshot: vi.fn((query, onNext) => {
    return vi.fn();
  }),
  getFirestore: vi.fn()
}));

vi.mock('@/lib/firebase', () => ({
  db: {}
}));

describe('useVenues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state correctly', () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'user1' } });
    
    const { result } = renderHook(() => useVenues());
    
    expect(result.current.venues).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
  });
});
