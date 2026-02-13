import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PizzaCanvas from '@/components/PizzaCanvas';

// Mock server actions
vi.mock('@/app/actions/pizza', () => ({
  savePizza: vi.fn().mockResolvedValue({ pizza: { id: '1', name: 'Test', toppings: [] } }),
  getUserPizzas: vi.fn().mockResolvedValue({ pizzas: [] }),
  deletePizza: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock canvas getContext since jsdom doesn't support canvas
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  fillRect: vi.fn(),
  closePath: vi.fn(),
  ellipse: vi.fn(),
  quadraticCurveTo: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  globalAlpha: 1,
  lineCap: 'butt',
});

import { savePizza, getUserPizzas, deletePizza } from '@/app/actions/pizza';

describe('PizzaCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserPizzas).mockResolvedValue({ pizzas: [] });
  });

  it('renders the page heading', async () => {
    render(<PizzaCanvas />);
    expect(screen.getByText('Build Your Pizza')).toBeInTheDocument();
  });

  it('renders all topping buttons', () => {
    render(<PizzaCanvas />);

    expect(screen.getByText('Pepperoni')).toBeInTheDocument();
    expect(screen.getByText('Mushrooms')).toBeInTheDocument();
    expect(screen.getByText('Olives')).toBeInTheDocument();
    expect(screen.getByText('Peppers')).toBeInTheDocument();
    expect(screen.getByText('Pineapple')).toBeInTheDocument();
    expect(screen.getByText('Ham')).toBeInTheDocument();
    expect(screen.getByText('Chicken')).toBeInTheDocument();
    expect(screen.getByText('Onions')).toBeInTheDocument();
    expect(screen.getByText('Bacon')).toBeInTheDocument();
    expect(screen.getByText('Ranch')).toBeInTheDocument();
  });

  it('shows topping counter', () => {
    render(<PizzaCanvas />);
    expect(screen.getByText('0/4 selected')).toBeInTheDocument();
  });

  it('prevents selecting more than 4 toppings', async () => {
    const user = userEvent.setup();
    render(<PizzaCanvas />);

    await user.click(screen.getByText('Pepperoni'));
    await user.click(screen.getByText('Mushrooms'));
    await user.click(screen.getByText('Olives'));
    await user.click(screen.getByText('Bacon'));

    // 5th topping button should be disabled
    const chickenBtn = screen.getByText('Chicken');
    expect(chickenBtn).toBeDisabled();

    // Counter should show 4/4
    expect(screen.getByText('4/4 selected')).toBeInTheDocument();
  });

  it('toggles topping selection on click', async () => {
    const user = userEvent.setup();
    render(<PizzaCanvas />);

    const pepperoniBtn = screen.getByText('Pepperoni');

    // Initially unselected (light bg)
    expect(pepperoniBtn.className).toContain('bg-stone-100');

    // Click to select
    await user.click(pepperoniBtn);
    expect(pepperoniBtn.className).toContain('bg-stone-800');

    // Click again to deselect
    await user.click(pepperoniBtn);
    expect(pepperoniBtn.className).toContain('bg-stone-100');
  });

  it('shows save dialog when Save Pizza is clicked', async () => {
    const user = userEvent.setup();
    render(<PizzaCanvas />);

    await user.click(screen.getByText('Save Pizza'));

    expect(screen.getByText('Name Your Pizza')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/friday night special/i)).toBeInTheDocument();
  });

  it('hides save dialog when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<PizzaCanvas />);

    await user.click(screen.getByText('Save Pizza'));
    expect(screen.getByText('Name Your Pizza')).toBeInTheDocument();

    await user.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Name Your Pizza')).not.toBeInTheDocument();
  });

  it('shows validation message when saving without a name', async () => {
    const user = userEvent.setup();
    render(<PizzaCanvas />);

    await user.click(screen.getByText('Save Pizza'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Please enter a name for your pizza')).toBeInTheDocument();
  });

  it('calls savePizza with correct data on save', async () => {
    const user = userEvent.setup();
    vi.mocked(savePizza).mockResolvedValue({
      pizza: { id: '1', name: 'My Pizza', toppings: '["pepperoni"]' } as any,
    });

    render(<PizzaCanvas />);

    // Select a topping
    await user.click(screen.getByText('Pepperoni'));

    // Open save dialog
    await user.click(screen.getByText('Save Pizza'));

    // Type name and save
    await user.type(screen.getByPlaceholderText(/friday night special/i), 'My Pizza');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(savePizza).toHaveBeenCalledWith({
        name: 'My Pizza',
        toppings: ['pepperoni'],
      });
    });
  });

  it('renders saved pizzas list', async () => {
    vi.mocked(getUserPizzas).mockResolvedValue({
      pizzas: [
        { id: '1', name: 'Margherita', toppings: ['mushroom'], createdAt: new Date() },
        { id: '2', name: 'Supreme', toppings: ['pepperoni', 'olive'], createdAt: new Date() },
      ],
    });

    render(<PizzaCanvas />);

    await waitFor(() => {
      expect(screen.getByText('Margherita')).toBeInTheDocument();
      expect(screen.getByText('Supreme')).toBeInTheDocument();
    });
  });

  it('shows empty state when no saved pizzas', () => {
    render(<PizzaCanvas />);

    expect(screen.getByText('No saved pizzas yet')).toBeInTheDocument();
  });

  it('loads a saved pizza toppings on Load click', async () => {
    const user = userEvent.setup();
    vi.mocked(getUserPizzas).mockResolvedValue({
      pizzas: [
        { id: '1', name: 'Test Pizza', toppings: ['pepperoni', 'olive'], createdAt: new Date() },
      ],
    });

    render(<PizzaCanvas />);

    await waitFor(() => {
      expect(screen.getByText('Test Pizza')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Load'));

    // After loading, pepperoni and olive buttons should be selected
    const pepperoniBtn = screen.getByText('Pepperoni');
    const oliveBtn = screen.getByText('Olives');
    expect(pepperoniBtn.className).toContain('bg-stone-800');
    expect(oliveBtn.className).toContain('bg-stone-800');
  });

  it('calls deletePizza when delete button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(getUserPizzas).mockResolvedValue({
      pizzas: [
        { id: 'abc-123', name: 'Delete Me', toppings: [], createdAt: new Date() },
      ],
    });

    render(<PizzaCanvas />);

    await waitFor(() => {
      expect(screen.getByText('Delete Me')).toBeInTheDocument();
    });

    await user.click(screen.getByText('✕'));

    await waitFor(() => {
      expect(deletePizza).toHaveBeenCalledWith('abc-123');
    });
  });

  it('displays toppings summary for saved pizza or plain cheese', async () => {
    vi.mocked(getUserPizzas).mockResolvedValue({
      pizzas: [
        { id: '1', name: 'Cheese Only', toppings: [], createdAt: new Date() },
        { id: '2', name: 'Loaded', toppings: ['pepperoni', 'olive'], createdAt: new Date() },
      ],
    });

    render(<PizzaCanvas />);

    await waitFor(() => {
      expect(screen.getByText('Plain cheese')).toBeInTheDocument();
      expect(screen.getByText('pepperoni, olive')).toBeInTheDocument();
    });
  });
});
