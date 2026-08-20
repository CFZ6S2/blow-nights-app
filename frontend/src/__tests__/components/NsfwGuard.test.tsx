import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import NsfwGuard from '@/components/NsfwGuard';

describe('NsfwGuard', () => {
  test('renders image without blur when not nsfw', () => {
    render(<NsfwGuard src="/photo.jpg" alt="test" />);
    const img = screen.getByAltText('test');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/photo.jpg');
  });

  test('renders image without blur when nsfw but nsfwBlur disabled', () => {
    render(<NsfwGuard src="/photo.jpg" alt="test" isNsfw={true} nsfwBlur={false} />);
    const img = screen.getByAltText('test');
    expect(img.className).not.toContain('blur');
  });

  test('renders blurred image when nsfw and nsfwBlur enabled', () => {
    render(<NsfwGuard src="/photo.jpg" alt="test" isNsfw={true} nsfwBlur={true} />);
    const img = screen.getByAltText('test');
    expect(img.className).toContain('blur');
  });

  test('shows reveal button when blurred', () => {
    render(<NsfwGuard src="/photo.jpg" isNsfw={true} nsfwBlur={true} />);
    expect(screen.getByText('nsfw.tap_to_view')).toBeInTheDocument();
  });

  test('removes blur on reveal click', () => {
    render(<NsfwGuard src="/photo.jpg" alt="test" isNsfw={true} nsfwBlur={true} />);
    fireEvent.click(screen.getByText('nsfw.tap_to_view'));
    const img = screen.getByAltText('test');
    expect(img.className).not.toContain('blur');
    expect(screen.queryByText('nsfw.tap_to_view')).not.toBeInTheDocument();
  });

  test('defaults nsfwBlur to true', () => {
    render(<NsfwGuard src="/photo.jpg" alt="test" isNsfw={true} />);
    const img = screen.getByAltText('test');
    expect(img.className).toContain('blur');
  });
});
