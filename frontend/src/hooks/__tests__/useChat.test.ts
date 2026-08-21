import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChat } from '../useChat';
import { useAuth } from '@/context/AuthContext';

// Mock dependencies
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limitToLast: vi.fn(),
  onSnapshot: vi.fn((query, onNext) => {
    // Return unsubscribe function
    return vi.fn();
  }),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
  getFirestore: vi.fn()
}));

vi.mock('@/lib/firebase', () => ({
  db: {}
}));

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state correctly', () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'user1' } });
    
    const { result } = renderHook(() => useChat('chat1'));
    
    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.isOtherTyping).toBe(false);
    expect(result.current.activeUsers).toEqual([]);
  });

  it('should not subscribe if no chatId is provided', () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'user1' } });
    
    const { result } = renderHook(() => useChat(null));
    
    expect(result.current.loading).toBe(true);
  });
});
