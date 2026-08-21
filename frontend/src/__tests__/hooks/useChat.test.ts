import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChat } from '../../hooks/useChat';
import * as firebase from '../../lib/firebase';

// Mock de Firebase
vi.mock('../../lib/firebase', () => ({
  db: {},
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deberÃ¡a inicializar con array vacÃ¡o de mensajes', () => {
    const { result } = renderHook(() => useChat('venue-123'));
    
    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('deberÃ¡a exponer funciÃ³n sendMessage', () => {
    const { result } = renderHook(() => useChat('venue-123'));
    
    expect(result.current.sendMessage).toBeDefined();
    expect(typeof result.current.sendMessage).toBe('function');
  });

  it('deberÃ¡a exponer funciÃ³n markAsRead', () => {
    const { result } = renderHook(() => useChat('venue-123'));
    
    expect(result.current.markAsRead).toBeDefined();
    expect(typeof result.current.markAsRead).toBe('function');
  });

  it('deberÃ¡a aceptar venueId como parÃ¡metro', () => {
    const { result } = renderHook(() => useChat('venue-456'));
    
    expect(result).toBeDefined();
  });

  it('deberÃ¡a manejar estado de error', () => {
    const { result } = renderHook(() => useChat('venue-123'));
    
    expect(result.current.error).toBeDefined();
  });

  it('deberÃ¡a tener funciÃ³n para adjuntar archivos', () => {
    const { result } = renderHook(() => useChat('venue-123'));
    
    expect(result.current.attachFile).toBeDefined();
  });

  it('deberÃ¡a exponer mÃ©todo de limpieza', () => {
    const { result } = renderHook(() => useChat('venue-123'));
    
    expect(result.current.cleanup).toBeDefined();
  });
});
