export type AnimationType = 'cw' | 'ccw' | 'wave' | 'wave-ccw' | 'flip' | null;
export type FilterType = 'mono' | 'neon' | 'negative' | null;
export type PizzaMode = 'whole' | 'half';

export interface SavedPizza {
  id: string;
  name: string;
  toppings: string[];
  mode: PizzaMode;
  leftToppings: string[];
  rightToppings: string[];
  animation: string | null;
  filter: string | null;
  createdAt: Date;
}

export type PositionedRenderer = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) => void;

export type OverlayRenderer = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  startAngle: number,
  sliceWidth: number,
  innerR: number,
  outerR: number
) => void;

export interface PositionedTopping {
  label: string;
  type: 'positioned';
  render: PositionedRenderer;
}

export interface OverlayTopping {
  label: string;
  type: 'overlay';
  renderSlice: OverlayRenderer;
}

export type ToppingConfig = PositionedTopping | OverlayTopping;
