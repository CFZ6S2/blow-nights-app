import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import ChillPaywall from '@/components/ChillPaywall';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('ChillPaywall', () => {
  const onClose = vi.fn();

  test('renders paywall with upgrade button', () => {
    render(<ChillPaywall onClose={onClose} />);
    expect(screen.getByText('paywall.only_black')).toBeInTheDocument();
    expect(screen.getByText('paywall.view_plans')).toBeInTheDocument();
  });

  test('shows feature list', () => {
    render(<ChillPaywall onClose={onClose} />);
    expect(screen.getByText('paywall.feat_chills')).toBeInTheDocument();
    expect(screen.getByText('paywall.feat_create')).toBeInTheDocument();
    expect(screen.getByText('paywall.feat_vip')).toBeInTheDocument();
    expect(screen.getByText('paywall.feat_pings')).toBeInTheDocument();
  });

  test('navigates to premium page on upgrade click', () => {
    render(<ChillPaywall onClose={onClose} />);
    fireEvent.click(screen.getByText('paywall.view_plans'));
    expect(mockPush).toHaveBeenCalledWith('/premium');
  });

  test('calls onClose when close button clicked', () => {
    render(<ChillPaywall onClose={onClose} />);
    fireEvent.click(screen.getByText('close'));
    expect(onClose).toHaveBeenCalled();
  });

  test('calls onClose when backdrop clicked', () => {
    const { container } = render(<ChillPaywall onClose={onClose} />);
    const backdrop = container.firstElementChild;
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });
});
