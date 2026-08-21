// SwipeCards.test.tsx - Tests for SwipeCards component
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SwipeCards from '../SwipeCards';
import { User } from '@/types';

// Mocks are already set up in src/__tests__/setup.tsx (next/navigation, next/link, framer-motion, firebase, etc.)

const mockUsers: User[] = [
  {
    id: 'user1',
    nick: 'Alice',
    fotoUrl: '/alice.png',
    edad: 28,
    rol: 'activo',
  } as any,
  {
    id: 'user2',
    nick: 'Bob',
    fotoUrl: '/bob.png',
    edad: 30,
    rol: 'pasivo',
  } as any,
];

describe('SwipeCards component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a stack of user cards', async () => {
    render(<SwipeCards users={mockUsers} onSwipe={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Alice, 28/)).toBeInTheDocument();
    });
    // Both cards should be rendered initially
    expect(screen.getByText(/Bob, 30/)).toBeInTheDocument();
  });

  it('calls onSwipe with right direction when like button is clicked', async () => {
    const onSwipe = vi.fn();
    render(<SwipeCards users={mockUsers} onSwipe={onSwipe} />);
    await waitFor(() => {
      expect(screen.getByText(/Alice, 28/)).toBeInTheDocument();
    });
    // There are two favorite buttons (one per card). Pick the first (front card).
    const likeButtons = screen.getAllByRole('button', { name: /favorite/i });
    fireEvent.click(likeButtons[0]);
    await waitFor(() => {
      expect(onSwipe).toHaveBeenCalledWith('user1', 'right');
    });
    // Alice should be removed, Bob remains
    expect(screen.queryByText(/Alice, 28/)).not.toBeInTheDocument();
    expect(screen.getByText(/Bob, 30/)).toBeInTheDocument();
  });

  it('calls onSwipe with left direction when dislike button is clicked', async () => {
    const onSwipe = vi.fn();
    render(<SwipeCards users={mockUsers} onSwipe={onSwipe} />);
    await waitFor(() => {
      expect(screen.getByText(/Alice, 28/)).toBeInTheDocument();
    });
    // Multiple close buttons exist; select the first (front card).
    const dislikeButtons = screen.getAllByRole('button', { name: /close/i });
    fireEvent.click(dislikeButtons[0]);
    await waitFor(() => {
      expect(onSwipe).toHaveBeenCalledWith('user1', 'left');
    });
    expect(screen.queryByText(/Alice, 28/)).not.toBeInTheDocument();
    expect(screen.getByText(/Bob, 30/)).toBeInTheDocument();
  });
});
