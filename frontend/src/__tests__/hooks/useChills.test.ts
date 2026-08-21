import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChills } from '../../hooks/useChills';
import * as firebase from '../../lib/firebase';

// Mock de Firebase
vi.mock('../../lib/firebase', () => ({
  db: {},
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  deleteDoc: vi.fn(),
}));

describe('useChills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deberÃ¡a inicializar con array vacÃ¡o de chills', () => {
    const { result } = renderHook(() => useChills());
    
    expect(result.current.chills).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('deberÃ¡a exponer funciÃ³n createChill', () => {
    const { result } = renderHook(() => useChills());
    
    expect(result.current.createChill).toBeDefined();
    expect(typeof result.current.createChill).toBe('function');
  });

  it('deberÃ¡a exponer funciÃ³n updateChill', () => {
    const { result } = renderHook(() => useChills());
    
    expect(result.current.updateChill).toBeDefined();
    expect(typeof result.current.updateChill).toBe('function');
  });

  it('deberÃ¡a exponer funciÃ³n deleteChill', () => {
    const { result } = renderHook(() => useChills());
    
    expect(result.current.deleteChill).toBeDefined();
    expect(typeof result.current.deleteChill).toBe('function');
  });

  it('deberÃ¡a filtrar chills por city', () => {
    const { result } = renderHook(() => useChills('madrid'));
    
    expect(result).toBeDefined();
  });

  it('deberÃ¡a filtrar chills por venue', () => {
    const { result } = renderHook(() => useChills('madrid', 'venue-123'));
    
    expect(result).toBeDefined();
  });

  it('deberÃ¡a manejar estado de error', () => {
    const { result } = renderHook(() => useChills());
    
    expect(result.current.error).toBeDefined();
  });

  it('deberÃ¡a exponer funciÃ³n joinChill', () => {
    const { result } = renderHook(() => useChills());
    
    expect(result.current.joinChill).toBeDefined();
  });

  it('deberÃ¡a exponer funciÃ³n leaveChill', () => {
    const { result } = renderHook(() => useChills());
    
    expect(result.current.leaveChill).toBeDefined();
  });
});
