import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '@/components/ThemeToggle';

const mockToggle = vi.fn();
let mockTheme = 'light';

vi.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({ theme: mockTheme, toggle: mockToggle }),
}));

describe('ThemeToggle', () => {
  it('renders a button with accessible label for dark mode switch', () => {
    mockTheme = 'light';
    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(button).toBeInTheDocument();
  });

  it('renders a button with accessible label for light mode switch when dark', () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: /switch to light mode/i });
    expect(button).toBeInTheDocument();
  });

  it('calls toggle when clicked', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button'));
    expect(mockToggle).toHaveBeenCalledOnce();
  });

  it('renders an SVG icon', () => {
    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
