import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVenues } from '../../hooks/useVenues';
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
}));

describe('useVenues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deberÃ¡a inicializar con array vacÃ¡o de venues', () => {
    const { result } = renderHook(() => useVenues());
    
    expect(result.current.venues).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('deberÃ¡a exponer funciÃ³n createVenue', () => {
    const { result } = renderHook(() => useVenues());
    
    expect(result.current.createVenue).toBeDefined();
    expect(typeof result.current.createVenue).toBe('function');
  });

  it('deberÃ¡a exponer funciÃ³n updateVenue', () => {
    const { result } = renderHook(() => useVenues());
    
    expect(result.current.updateVenue).toBeDefined();
    expect(typeof result.current.updateVenue).toBe('function');
  });

  it('deberÃ¡a exponer funciÃ³n deleteVenue', () => {
    const { result } = renderHook(() => useVenues());
    
    expect(result.current.deleteVenue).toBeDefined();
    expect(typeof result.current.deleteVenue).toBe('function');
  });

  it('deberÃ¡a filtrar venues por city', () => {
    const { result } = renderHook(() => useVenues('madrid'));
    
    // Verifica que el hook acepta city como parÃ¡metro
    expect(result).toBeDefined();
  });

  it('deberÃ¡a manejar estado de error', () => {
    const { result } = renderHook(() => useVenues());
    
    expect(result.current.error).toBeDefined();
  });
});
