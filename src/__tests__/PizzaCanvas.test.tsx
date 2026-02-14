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
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  clip: vi.fn(),
  getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(500 * 500 * 4) }),
  putImageData: vi.fn(),
  drawImage: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  filter: 'none',
  lineCap: 'butt',
  lineJoin: 'miter',
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

  it('renders animation buttons', () => {
    render(<PizzaCanvas />);
    expect(screen.getByText('Rotate CW ↻')).toBeInTheDocument();
    expect(screen.getByText('Rotate CCW ↺')).toBeInTheDocument();
    expect(screen.getByText('Wave CW 🍕')).toBeInTheDocument();
    expect(screen.getByText('Wave CCW 🍕')).toBeInTheDocument();
    expect(screen.getByText('Flip 🪙')).toBeInTheDocument();
  });

  it('renders visual effects buttons', () => {
    render(<PizzaCanvas />);
    expect(screen.getByText('Monochrome 🖤')).toBeInTheDocument();
    expect(screen.getByText('Neon 💜')).toBeInTheDocument();
    expect(screen.getByText('Negative 🔲')).toBeInTheDocument();
  });

  it('toggles filter selection', async () => {
    const user = userEvent.setup();
    render(<PizzaCanvas />);

    const monoBtn = screen.getByText('Monochrome 🖤');
    expect(monoBtn.className).toContain('bg-stone-100');

    await user.click(monoBtn);
    expect(monoBtn.className).toContain('bg-stone-800');

    // Click again to deselect
    await user.click(monoBtn);
    expect(monoBtn.className).toContain('bg-stone-100');
  });

  it('toggles negative filter selection', async () => {
    const user = userEvent.setup();
    render(<PizzaCanvas />);

    const negBtn = screen.getByText('Negative 🔲');
    expect(negBtn.className).toContain('bg-stone-100');

    await user.click(negBtn);
    expect(negBtn.className).toContain('bg-stone-800');

    // Selecting another filter deselects negative
    await user.click(screen.getByText('Monochrome 🖤'));
    expect(negBtn.className).toContain('bg-stone-100');
  });

  it('toggles animation selection', async () => {
    const user = userEvent.setup();
    render(<PizzaCanvas />);

    const cwBtn = screen.getByText('Rotate CW ↻');
    expect(cwBtn.className).toContain('bg-stone-100');

    await user.click(cwBtn);
    expect(cwBtn.className).toContain('bg-stone-800');

    // Click again to deselect
    await user.click(cwBtn);
    expect(cwBtn.className).toContain('bg-stone-100');
  });

  it('toggles flip animation selection', async () => {
    const user = userEvent.setup();
    render(<PizzaCanvas />);

    const flipBtn = screen.getByText('Flip 🪙');
    expect(flipBtn.className).toContain('bg-stone-100');

    await user.click(flipBtn);
    expect(flipBtn.className).toContain('bg-stone-800');

    // Selecting another animation deselects flip
    await user.click(screen.getByText('Rotate CW ↻'));
    expect(flipBtn.className).toContain('bg-stone-100');
  });

  it('shows Export GIF button only when animation is active', async () => {
    const user = userEvent.setup();
    render(<PizzaCanvas />);

    expect(screen.queryByText('Export GIF')).not.toBeInTheDocument();

    await user.click(screen.getByText('Rotate CW ↻'));
    expect(screen.getByText('Export GIF')).toBeInTheDocument();
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
        mode: 'whole',
        leftToppings: [],
        rightToppings: [],
        animation: null,
        filter: null,
      });
    });
  });

  it('renders saved pizzas list', async () => {
    vi.mocked(getUserPizzas).mockResolvedValue({
      pizzas: [
        { id: '1', name: 'Margherita', toppings: ['mushroom'], mode: 'whole', leftToppings: [], rightToppings: [], animation: null, filter: null, createdAt: new Date() },
        { id: '2', name: 'Supreme', toppings: ['pepperoni', 'olive'], mode: 'whole', leftToppings: [], rightToppings: [], animation: null, filter: null, createdAt: new Date() },
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
        { id: '1', name: 'Test Pizza', toppings: ['pepperoni', 'olive'], mode: 'whole', leftToppings: [], rightToppings: [], animation: null, filter: null, createdAt: new Date() },
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
        { id: 'abc-123', name: 'Delete Me', toppings: [], mode: 'whole', leftToppings: [], rightToppings: [], animation: null, filter: null, createdAt: new Date() },
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
        { id: '1', name: 'Cheese Only', toppings: [], mode: 'whole', leftToppings: [], rightToppings: [], animation: null, filter: null, createdAt: new Date() },
        { id: '2', name: 'Loaded', toppings: ['pepperoni', 'olive'], mode: 'whole', leftToppings: [], rightToppings: [], animation: 'cw', filter: null, createdAt: new Date() },
      ],
    });

    render(<PizzaCanvas />);

    await waitFor(() => {
      expect(screen.getByText('Plain cheese')).toBeInTheDocument();
      expect(screen.getByText('pepperoni, olive · ↻')).toBeInTheDocument();
    });
  });

  it('displays flip animation icon in saved pizza summary', async () => {
    vi.mocked(getUserPizzas).mockResolvedValue({
      pizzas: [
        { id: '1', name: 'Flipper', toppings: ['pepperoni'], mode: 'whole', leftToppings: [], rightToppings: [], animation: 'flip', filter: null, createdAt: new Date() },
      ],
    });

    render(<PizzaCanvas />);

    await waitFor(() => {
      expect(screen.getByText('pepperoni · 🪙')).toBeInTheDocument();
    });
  });

  it('displays negative filter icon in saved pizza summary', async () => {
    vi.mocked(getUserPizzas).mockResolvedValue({
      pizzas: [
        { id: '1', name: 'Inverted', toppings: ['pepperoni'], mode: 'whole', leftToppings: [], rightToppings: [], animation: null, filter: 'negative', createdAt: new Date() },
      ],
    });

    render(<PizzaCanvas />);

    await waitFor(() => {
      expect(screen.getByText('pepperoni · 🔲')).toBeInTheDocument();
    });
  });

  // ── Pizza mode toggle tests ──────────────────────────────────────────────

  it('renders pizza style toggle buttons', () => {
    render(<PizzaCanvas />);
    expect(screen.getByText('Whole')).toBeInTheDocument();
    expect(screen.getByText('Half & Half')).toBeInTheDocument();
  });

  it('defaults to whole pizza mode', () => {
    render(<PizzaCanvas />);
    const wholeBtn = screen.getByText('Whole');
    expect(wholeBtn.className).toContain('bg-stone-800');
  });

  it('switches to half mode and shows two topping sections', async () => {
    const user = userEvent.setup();
    render(<PizzaCanvas />);

    await user.click(screen.getByText('Half & Half'));

    expect(screen.getByText('Left Half')).toBeInTheDocument();
    expect(screen.getByText('Right Half')).toBeInTheDocument();
    // Should show two counters
    const counters = screen.getAllByText('0/4 selected');
    expect(counters.length).toBe(2);
  });

  it('hides whole topping section when in half mode', async () => {
    const user = userEvent.setup();
    render(<PizzaCanvas />);

    // In whole mode, "Toppings" label should exist
    expect(screen.getByText('Toppings')).toBeInTheDocument();

    await user.click(screen.getByText('Half & Half'));

    // "Toppings" label should be replaced by "Left Half" and "Right Half"
    expect(screen.queryByText('Toppings')).not.toBeInTheDocument();
    expect(screen.getByText('Left Half')).toBeInTheDocument();
    expect(screen.getByText('Right Half')).toBeInTheDocument();
  });

  it('allows selecting toppings independently on each half', async () => {
    const user = userEvent.setup();
    render(<PizzaCanvas />);

    await user.click(screen.getByText('Half & Half'));

    // In half mode, each topping appears twice (once per half)
    const pepperoniBtns = screen.getAllByText('Pepperoni');
    expect(pepperoniBtns.length).toBe(2);

    // Select pepperoni on left half
    await user.click(pepperoniBtns[0]);
    expect(pepperoniBtns[0].className).toContain('bg-stone-800');
    // Right half pepperoni should remain unselected
    expect(pepperoniBtns[1].className).toContain('bg-stone-100');
  });

  it('enforces 4 topping max per half independently', async () => {
    const user = userEvent.setup();
    render(<PizzaCanvas />);

    await user.click(screen.getByText('Half & Half'));

    // Select 4 toppings on the left half (first instance of each)
    const leftPepperoni = screen.getAllByText('Pepperoni')[0];
    const leftMushrooms = screen.getAllByText('Mushrooms')[0];
    const leftOlives = screen.getAllByText('Olives')[0];
    const leftBacon = screen.getAllByText('Bacon')[0];

    await user.click(leftPepperoni);
    await user.click(leftMushrooms);
    await user.click(leftOlives);
    await user.click(leftBacon);

    // Left half should show 4/4
    const counters = screen.getAllByText(/\/4 selected/);
    expect(counters[0].textContent).toBe('4/4 selected');

    // Right half should still have 0/4 and not be blocked
    expect(counters[1].textContent).toBe('0/4 selected');

    // Can still select toppings on the right half
    const rightPepperoni = screen.getAllByText('Pepperoni')[1];
    expect(rightPepperoni).not.toBeDisabled();
  });

  it('saves half pizza with correct data', async () => {
    const user = userEvent.setup();
    vi.mocked(savePizza).mockResolvedValue({
      pizza: { id: '1', name: 'Half Special', toppings: '[]' } as any,
    });

    render(<PizzaCanvas />);

    await user.click(screen.getByText('Half & Half'));

    // Select pepperoni on left
    const leftPepperoni = screen.getAllByText('Pepperoni')[0];
    await user.click(leftPepperoni);

    // Select mushrooms on right
    const rightMushrooms = screen.getAllByText('Mushrooms')[1];
    await user.click(rightMushrooms);

    await user.click(screen.getByText('Save Pizza'));
    await user.type(screen.getByPlaceholderText(/friday night special/i), 'Half Special');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(savePizza).toHaveBeenCalledWith({
        name: 'Half Special',
        toppings: [],
        mode: 'half',
        leftToppings: ['pepperoni'],
        rightToppings: ['mushroom'],
        animation: null,
        filter: null,
      });
    });
  });

  it('loads a half pizza and restores mode and toppings', async () => {
    const user = userEvent.setup();
    vi.mocked(getUserPizzas).mockResolvedValue({
      pizzas: [
        {
          id: '1',
          name: 'Half Loaded',
          toppings: [],
          mode: 'half',
          leftToppings: ['pepperoni', 'olive'],
          rightToppings: ['mushroom'],
          animation: null,
          filter: null,
          createdAt: new Date(),
        },
      ],
    });

    render(<PizzaCanvas />);

    await waitFor(() => {
      expect(screen.getByText('Half Loaded')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Load'));

    // Should switch to half mode
    const halfBtn = screen.getByText('Half & Half');
    expect(halfBtn.className).toContain('bg-stone-800');

    // Left half and right half sections should appear
    expect(screen.getByText('Left Half')).toBeInTheDocument();
    expect(screen.getByText('Right Half')).toBeInTheDocument();
  });

  it('displays half pizza summary in saved list', async () => {
    vi.mocked(getUserPizzas).mockResolvedValue({
      pizzas: [
        {
          id: '1',
          name: 'Split Pizza',
          toppings: [],
          mode: 'half',
          leftToppings: ['pepperoni'],
          rightToppings: ['mushroom'],
          animation: null,
          filter: null,
          createdAt: new Date(),
        },
      ],
    });

    render(<PizzaCanvas />);

    await waitFor(() => {
      expect(screen.getByText('L: pepperoni | R: mushroom')).toBeInTheDocument();
    });
  });
});
