import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '@/context/AuthContext';

// Mock dependencias
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limitToLast: vi.fn(),
  onSnapshot: vi.fn((q, cb) => {
    // Retornamos un unsubscribe mockeado
    return vi.fn();
  }),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
}));

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería inicializar con array vacío de mensajes y estado loading', () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'user1' } });
    const { result } = renderHook(() => useChat('chat-123'));
    
    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.isOtherTyping).toBe(false);
    expect(result.current.activeUsers).toEqual([]);
  });

  it('debería exponer función sendMessage y setTypingStatus', () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'user1' } });
    const { result } = renderHook(() => useChat('chat-123'));
    
    expect(result.current.sendMessage).toBeDefined();
    expect(typeof result.current.sendMessage).toBe('function');
    
    expect(result.current.setTypingStatus).toBeDefined();
    expect(typeof result.current.setTypingStatus).toBe('function');
  });

  it('debería exponer función markAsRead', () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'user1' } });
    const { result } = renderHook(() => useChat('chat-123'));
    
    expect(result.current.markAsRead).toBeDefined();
    expect(typeof result.current.markAsRead).toBe('function');
  });

  it('debería exponer función grantPrivateAccess', () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'user1' } });
    const { result } = renderHook(() => useChat('chat-123'));
    
    expect(result.current.grantPrivateAccess).toBeDefined();
    expect(typeof result.current.grantPrivateAccess).toBe('function');
  });
});
