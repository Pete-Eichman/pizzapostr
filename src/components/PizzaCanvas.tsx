'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { savePizza, getUserPizzas, deletePizza } from '@/app/actions/pizza';

type AnimationType = 'cw' | 'ccw' | 'wave' | 'wave-ccw' | null;
type FilterType = 'mono' | 'neon' | null;

interface SavedPizza {
  id: string;
  name: string;
  toppings: string[];
  animation: string | null;
  filter: string | null;
  createdAt: Date;
}

type PositionedRenderer = (ctx: CanvasRenderingContext2D, x: number, y: number) => void;
type OverlayRenderer = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  startAngle: number,
  sliceWidth: number,
  innerR: number,
  outerR: number
) => void;

// Fixed positions within each slice: af = angle fraction (0-1), rf = radius fraction (0-1)
const SLICE_POSITIONS: Array<{ af: number; rf: number }> = [
  { af: 0.50, rf: 0.15 }, // 0: inner center
  { af: 0.30, rf: 0.37 }, // 1: mid-inner left
  { af: 0.70, rf: 0.37 }, // 2: mid-inner right
  { af: 0.22, rf: 0.58 }, // 3: middle left
  { af: 0.50, rf: 0.55 }, // 4: middle center
  { af: 0.78, rf: 0.58 }, // 5: middle right
  { af: 0.22, rf: 0.80 }, // 6: outer left
  { af: 0.50, rf: 0.78 }, // 7: outer center
  { af: 0.78, rf: 0.80 }, // 8: outer right
];

// Distribute 9 slot positions among N toppings — more toppings = fewer per topping
function distributePositions(count: number): number[][] {
  if (count === 0) return [];
  if (count === 1) return [[0, 1, 4, 6, 8]];
  if (count === 2) return [[0, 2, 5, 7], [1, 3, 6, 8]];
  if (count === 3) return [[0, 4, 8], [1, 5, 6], [2, 3, 7]];
  return [[0, 8], [1, 5], [4, 6], [3, 7]];
}

const MAX_TOPPINGS = 4;

// Easing function for smooth slice rotation
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Calculate per-slice rotation offsets for the wave animation.
// Each slice does a full 360° flip, staggered so the next slice
// begins when the previous is ~25% through its flip.
// reverse=true starts the cascade from the last slice (CCW feel).
function getWaveOffsets(time: number, reverse = false): number[] {
  const sliceDuration = 0.8; // seconds for one slice to complete its rotation
  const stagger = 0.25 * sliceDuration; // delay between successive slices
  const cycleDuration = sliceDuration + 7 * stagger; // full cycle for all 8 slices
  const t = ((time % cycleDuration) + cycleDuration) % cycleDuration; // positive modulo

  const offsets: number[] = [];
  for (let s = 0; s < 8; s++) {
    const idx = reverse ? 7 - s : s;
    const sliceStart = idx * stagger;
    const progress = Math.max(0, Math.min(1, (t - sliceStart) / sliceDuration));
    offsets.push(easeInOutCubic(progress) * Math.PI * 2);
  }
  return offsets;
}

interface PositionedTopping {
  label: string;
  type: 'positioned';
  render: PositionedRenderer;
}

interface OverlayTopping {
  label: string;
  type: 'overlay';
  renderSlice: OverlayRenderer;
}

type ToppingConfig = PositionedTopping | OverlayTopping;

const TOPPING_CONFIGS: Record<string, ToppingConfig> = {
  pepperoni: {
    label: 'Pepperoni',
    type: 'positioned',
    render: (ctx, x, y) => {
      ctx.fillStyle = '#C23B22';
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#A83020';
      ctx.beginPath();
      ctx.arc(x - 3, y - 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 2, y + 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  mushroom: {
    label: 'Mushrooms',
    type: 'positioned',
    render: (ctx, x, y) => {
      ctx.fillStyle = '#F5F0E0';
      ctx.fillRect(x - 3, y, 6, 8);
      ctx.fillStyle = '#C4A87C';
      ctx.beginPath();
      ctx.arc(x, y, 8, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#A88B60';
      ctx.beginPath();
      ctx.arc(x, y, 5, Math.PI, 0);
      ctx.fill();
    },
  },
  olive: {
    label: 'Olives',
    type: 'positioned',
    render: (ctx, x, y) => {
      ctx.fillStyle = '#2D2D2D';
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8B8B3A';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  pepper: {
    label: 'Peppers',
    type: 'positioned',
    render: (ctx, x, y) => {
      ctx.fillStyle = '#4A8C3F';
      ctx.fillRect(x - 5, y - 7, 10, 14);
      ctx.fillStyle = '#367030';
      ctx.fillRect(x - 2, y - 7, 4, 14);
    },
  },
  pineapple: {
    label: 'Pineapple',
    type: 'positioned',
    render: (ctx, x, y) => {
      // Chunky golden-orange wedge with dark outline for contrast
      ctx.fillStyle = '#E8A317';
      ctx.strokeStyle = '#8B6914';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x + 7, y + 6);
      ctx.lineTo(x - 7, y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Inner detail lines
      ctx.strokeStyle = '#C47F10';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 1);
      ctx.lineTo(x + 3, y - 1);
      ctx.moveTo(x - 5, y + 3);
      ctx.lineTo(x + 5, y + 3);
      ctx.stroke();
    },
  },
  ham: {
    label: 'Ham',
    type: 'positioned',
    render: (ctx, x, y) => {
      ctx.fillStyle = '#F0A0B0';
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 5);
      ctx.lineTo(x + 6, y - 7);
      ctx.lineTo(x + 8, y + 5);
      ctx.lineTo(x - 6, y + 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#F8C8D0';
      ctx.beginPath();
      ctx.arc(x - 2, y + 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  chicken: {
    label: 'Chicken',
    type: 'positioned',
    render: (ctx, x, y) => {
      // Rectangular grilled chicken strip
      ctx.fillStyle = '#E8C888';
      ctx.fillRect(x - 12, y - 4, 24, 8);
      // Rounded ends
      ctx.beginPath();
      ctx.arc(x - 12, y, 4, Math.PI * 0.5, Math.PI * 1.5);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 12, y, 4, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.fill();
      // Grill marks
      ctx.strokeStyle = '#A07830';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 4);
      ctx.lineTo(x - 7, y + 4);
      ctx.moveTo(x - 1, y - 4);
      ctx.lineTo(x - 1, y + 4);
      ctx.moveTo(x + 5, y - 4);
      ctx.lineTo(x + 5, y + 4);
      ctx.stroke();
    },
  },
  onion: {
    label: 'Onions',
    type: 'positioned',
    render: (ctx, x, y) => {
      // Red onion ring
      ctx.strokeStyle = '#8B2252';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();
      // Inner concentric ring
      ctx.strokeStyle = '#C44D80';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.stroke();
      // Center highlight
      ctx.strokeStyle = '#D87DA0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.stroke();
    },
  },
  bacon: {
    label: 'Bacon',
    type: 'positioned',
    render: (ctx, x, y) => {
      // Wavy bacon strip
      ctx.fillStyle = '#8B2500';
      ctx.beginPath();
      ctx.moveTo(x - 9, y - 3);
      ctx.quadraticCurveTo(x - 4, y - 7, x, y - 3);
      ctx.quadraticCurveTo(x + 4, y + 1, x + 9, y - 3);
      ctx.lineTo(x + 9, y + 3);
      ctx.quadraticCurveTo(x + 4, y + 7, x, y + 3);
      ctx.quadraticCurveTo(x - 4, y - 1, x - 9, y + 3);
      ctx.closePath();
      ctx.fill();
      // Fat streaks
      ctx.fillStyle = '#C87050';
      ctx.fillRect(x - 5, y - 1, 4, 2);
      ctx.fillRect(x + 2, y - 1, 3, 2);
    },
  },
  ranch: {
    label: 'Ranch',
    type: 'overlay',
    renderSlice: (ctx, cx, cy, startAngle, sliceWidth, innerR, outerR) => {
      // Smooth wavy drizzle line using a sine wave across the slice
      ctx.strokeStyle = '#FAF8F0';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.8;

      ctx.beginPath();
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const r = innerR * 0.5 + t * (outerR * 0.93 - innerR * 0.5);
        // Smooth sine wave oscillation across the slice
        const wave = Math.sin(t * Math.PI * 6) * 0.28;
        const a = startAngle + (0.5 + wave) * sliceWidth;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
    },
  },
};

export default function PizzaCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedToppings, setSelectedToppings] = useState<Set<string>>(new Set());
  const [animation, setAnimation] = useState<AnimationType>(null);
  const [filter, setFilter] = useState<FilterType>(null);
  const [savedPizzas, setSavedPizzas] = useState<SavedPizza[]>([]);
  const [pizzaName, setPizzaName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const rotationRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    loadSavedPizzas();
  }, []);

  const loadSavedPizzas = async () => {
    const result = await getUserPizzas();
    if (result.pizzas) {
      setSavedPizzas(result.pizzas as SavedPizza[]);
    }
  };

  const drawPizza = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, rotation = 0, sliceOffsets?: number[], activeFilter?: FilterType) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const pizzaRadius = 180;
    const numSlices = 8;
    const sliceWidth = (Math.PI * 2) / numSlices;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Helper: draw full pizza content (crust, sauce, cheese, toppings, slice lines) ---
    const drawContent = () => {
      // Draw crust
      ctx.beginPath();
      ctx.arc(centerX, centerY, pizzaRadius + 10, 0, Math.PI * 2);
      ctx.fillStyle = '#D4A55A';
      ctx.fill();
      ctx.strokeStyle = '#8B5E34';
      ctx.lineWidth = 14;
      ctx.stroke();

      // Draw sauce
      ctx.beginPath();
      ctx.arc(centerX, centerY, pizzaRadius - 5, 0, Math.PI * 2);
      ctx.fillStyle = '#C43E2A';
      ctx.fill();

      // Draw cheese
      ctx.beginPath();
      ctx.arc(centerX, centerY, pizzaRadius - 10, 0, Math.PI * 2);
      ctx.fillStyle = '#EFC050';
      ctx.fill();

      // Draw toppings with dynamic density
      const toppingArray = Array.from(selectedToppings);
      const minR = 40;
      const maxR = 155;

      const positionedToppings = toppingArray.filter(
        (t) => TOPPING_CONFIGS[t]?.type === 'positioned'
      );
      const overlayToppings = toppingArray.filter(
        (t) => TOPPING_CONFIGS[t]?.type === 'overlay'
      );

      const positionSets = distributePositions(positionedToppings.length);

      positionedToppings.forEach((topping, tIdx) => {
        const config = TOPPING_CONFIGS[topping];
        if (!config || config.type !== 'positioned') return;
        const positions = positionSets[tIdx] ?? [];

        for (let sliceIndex = 0; sliceIndex < numSlices; sliceIndex++) {
          const sliceStartAngle = sliceIndex * sliceWidth;

          positions.forEach((posIndex) => {
            const pos = SLICE_POSITIONS[posIndex];
            const angle = sliceStartAngle + pos.af * sliceWidth;
            const radius = minR + pos.rf * (maxR - minR);
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            config.render(ctx, x, y);
          });
        }
      });

      overlayToppings.forEach((topping) => {
        const config = TOPPING_CONFIGS[topping];
        if (!config || config.type !== 'overlay') return;

        for (let sliceIndex = 0; sliceIndex < numSlices; sliceIndex++) {
          const sliceStartAngle = sliceIndex * sliceWidth;
          config.renderSlice(ctx, centerX, centerY, sliceStartAngle, sliceWidth, minR, maxR);
        }
      });

      // Draw slice lines
      ctx.strokeStyle = '#C8874A';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < numSlices; i++) {
        const angle = i * sliceWidth;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + Math.cos(angle) * pizzaRadius,
          centerY + Math.sin(angle) * pizzaRadius
        );
        ctx.stroke();
      }
    };

    // --- Helper: draw the back face of the pizza (crust bottom with texture) ---
    const drawBackFace = () => {
      // Outer crust ring – same as front
      ctx.beginPath();
      ctx.arc(centerX, centerY, pizzaRadius + 10, 0, Math.PI * 2);
      ctx.fillStyle = '#C8944A';
      ctx.fill();
      ctx.strokeStyle = '#8B5E34';
      ctx.lineWidth = 14;
      ctx.stroke();

      // Baked-dough bottom
      ctx.beginPath();
      ctx.arc(centerX, centerY, pizzaRadius - 5, 0, Math.PI * 2);
      ctx.fillStyle = '#D9B06A';
      ctx.fill();

      // Flour spots — deterministic positions using simple hash
      ctx.fillStyle = 'rgba(255, 255, 240, 0.35)';
      for (let i = 0; i < 28; i++) {
        const a = (i * 2.399) % (Math.PI * 2);           // golden-angle spread
        const r = 25 + ((i * 97 + 13) % 130);             // pseudo-random radius
        const sz = 3 + ((i * 43) % 5);
        ctx.beginPath();
        ctx.arc(centerX + Math.cos(a) * r, centerY + Math.sin(a) * r, sz, 0, Math.PI * 2);
        ctx.fill();
      }

      // Char marks — darker oblong patches
      ctx.fillStyle = 'rgba(100, 60, 20, 0.25)';
      for (let i = 0; i < 12; i++) {
        const a = (i * 3.83 + 1.0) % (Math.PI * 2);
        const r = 30 + ((i * 71 + 29) % 120);
        const w = 8 + ((i * 37) % 10);
        const h = 3 + ((i * 19) % 4);
        const rot = (i * 1.17) % Math.PI;
        ctx.save();
        ctx.translate(centerX + Math.cos(a) * r, centerY + Math.sin(a) * r);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Slice lines on the bottom too
      ctx.strokeStyle = '#B8844A';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < numSlices; i++) {
        const angle = i * sliceWidth;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + Math.cos(angle) * pizzaRadius,
          centerY + Math.sin(angle) * pizzaRadius
        );
        ctx.stroke();
      }
    };

    if (sliceOffsets) {
      // Flip animation: each slice flips in place around its bisector axis
      const clipRadius = pizzaRadius + 25;
      for (let s = 0; s < numSlices; s++) {
        const flipAngle = sliceOffsets[s]; // 0 → 2π, full rotation
        const cosFlip = Math.cos(flipAngle);
        const scalePerp = Math.abs(cosFlip) || 0.001; // avoid zero
        const showBack = cosFlip < 0;

        // Bisector of this slice
        const bisector = s * sliceWidth + sliceWidth / 2;

        ctx.save();

        // Scale perpendicular to bisector to simulate 3-D flip:
        // 1. origin → center  2. align bisector to X  3. squash Y  4. un-rotate  5. restore origin
        ctx.translate(centerX, centerY);
        ctx.rotate(bisector);
        ctx.scale(1, scalePerp);
        ctx.rotate(-bisector);
        ctx.translate(-centerX, -centerY);

        // Clip to this slice's wedge
        const startAngle = s * sliceWidth;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, clipRadius, startAngle, startAngle + sliceWidth);
        ctx.closePath();
        ctx.clip();

        if (showBack) {
          drawBackFace();
        } else {
          drawContent();
        }

        ctx.restore();
      }
    } else {
      // Global rotation (static, CW, CCW)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.translate(-centerX, -centerY);
      drawContent();
      ctx.restore();
    }

    // --- Apply visual filter ---
    if (activeFilter) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      const w = canvas.width;
      const h = canvas.height;

      if (activeFilter === 'mono') {
        for (let i = 0; i < d.length; i += 4) {
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          d[i] = lum;
          d[i + 1] = lum;
          d[i + 2] = lum;
        }
        ctx.putImageData(imageData, 0, 0);
      } else if (activeFilter === 'neon') {
        // --- Neon tube sign effect ---
        // 1. Edge detection via Sobel gradient magnitude
        const grey = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) {
          const p = i * 4;
          grey[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
        }

        const edge = new Float32Array(w * h);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            // Sobel X & Y
            const gx =
              -grey[idx - w - 1] + grey[idx - w + 1]
              - 2 * grey[idx - 1] + 2 * grey[idx + 1]
              - grey[idx + w - 1] + grey[idx + w + 1];
            const gy =
              -grey[idx - w - 1] - 2 * grey[idx - w] - grey[idx - w + 1]
              + grey[idx + w - 1] + 2 * grey[idx + w] + grey[idx + w + 1];
            edge[idx] = Math.sqrt(gx * gx + gy * gy);
          }
        }

        // Normalise edges to 0-1
        let maxEdge = 0;
        for (let i = 0; i < edge.length; i++) {
          if (edge[i] > maxEdge) maxEdge = edge[i];
        }
        const invMax = maxEdge > 0 ? 1 / maxEdge : 0;

        // 2. Map original colours to neon palette based on the actual pizza part
        const neonR = new Uint8ClampedArray(w * h);
        const neonG = new Uint8ClampedArray(w * h);
        const neonB = new Uint8ClampedArray(w * h);

        for (let i = 0; i < w * h; i++) {
          const p = i * 4;
          const r = d[p], g = d[p + 1], b = d[p + 2];
          if (d[p + 3] === 0) continue; // transparent

          const mx = Math.max(r, g, b);
          const mn = Math.min(r, g, b);
          const chroma = mx - mn;
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const sat = mx > 0 ? chroma / mx : 0;

          // Compute hue 0-6
          let hue = 0;
          if (chroma > 10) {
            if (mx === r) hue = ((g - b) / chroma + 6) % 6;
            else if (mx === g) hue = (b - r) / chroma + 2;
            else hue = (r - g) / chroma + 4;
          }

          // Classify pizza regions by colour signature:
          // Sauce: high saturation red (hue ~0, sat > 0.5, lum 80-160)
          // Pepperoni/salami: dark saturated red (hue ~0, sat > 0.3, lum < 130)
          // Crust: warm brown/tan (hue 0.5-1.5, low-med sat, med-high lum)
          // Cheese: bright yellow-ish (hue 0.7-1.8, lum > 170)
          // Olives/dark: very low lum
          // Green peppers/pineapple/greens: hue 1.5-3.5
          // Mushroom/onion/light toppings: low sat, medium lum
          // Purple/onion: hue 4.5-6

          let nr: number, ng: number, nb: number;

          if (lum < 35) {
            // Very dark pixels (olives, dark outlines) → deep blue
            nr = 20; ng = 40; nb = 200;
          } else if (sat < 0.15 && lum > 60) {
            // Low saturation, lighter (mushrooms, mozzarella blobs) → cool white/ice blue
            nr = 180; ng = 220; nb = 255;
          } else if (hue < 0.6 && sat > 0.45 && lum < 140) {
            // Deep saturated red → sauce / pepperoni → neon red
            nr = 255; ng = 20; nb = 30;
          } else if (hue < 0.6 && sat > 0.45 && lum >= 140) {
            // Bright saturated red → sauce highlights → neon coral-red
            nr = 255; ng = 60; nb = 50;
          } else if (hue >= 0.6 && hue < 1.3 && lum < 160) {
            // Orange-brown → crust → warm neon orange
            nr = 255; ng = 140; nb = 20;
          } else if (hue >= 0.6 && hue < 1.3 && lum >= 160) {
            // Light orange/tan → crust highlight → golden neon
            nr = 255; ng = 200; nb = 50;
          } else if (hue >= 1.3 && hue < 2.0 && lum > 150) {
            // Bright yellow → cheese → neon yellow
            nr = 255; ng = 255; nb = 30;
          } else if (hue >= 1.3 && hue < 2.0) {
            // Darker yellow/olive tone → amber neon
            nr = 255; ng = 180; nb = 10;
          } else if (hue >= 2.0 && hue < 3.5) {
            // Greens → peppers, pineapple, basil → electric green
            nr = 30; ng = 255; nb = 80;
          } else if (hue >= 3.5 && hue < 5.0) {
            // Blue range (unlikely but possible) → electric blue
            nr = 30; ng = 150; nb = 255;
          } else {
            // Magenta/purple range → onion, purple toppings → neon magenta
            nr = 255; ng = 50; nb = 220;
          }

          neonR[i] = nr;
          neonG[i] = ng;
          neonB[i] = nb;
        }

        // 3. Build output: dark bg + neon edges + soft glow
        // First pass: create raw neon image
        const out = new Uint8ClampedArray(d.length);
        for (let i = 0; i < w * h; i++) {
          const p = i * 4;
          const e = Math.min(1, edge[i] * invMax * 2.5); // boost edges
          const brightness = e * e; // square for sharper cutoff
          out[p]     = 8  + brightness * neonR[i];
          out[p + 1] = 5  + brightness * neonG[i];
          out[p + 2] = 20 + brightness * neonB[i];
          out[p + 3] = d[p + 3]; // preserve alpha
        }

        // 4. Glow pass: simple 5×5 box blur of bright pixels, added on top
        const glowRadius = 3;
        const glowStrength = 0.18;
        for (let y = glowRadius; y < h - glowRadius; y++) {
          for (let x = glowRadius; x < w - glowRadius; x++) {
            const ci = y * w + x;
            const e = edge[ci] * invMax;
            if (e < 0.15) continue; // skip non-edge pixels for performance
            let sumR = 0, sumG = 0, sumB = 0;
            for (let dy = -glowRadius; dy <= glowRadius; dy++) {
              for (let dx = -glowRadius; dx <= glowRadius; dx++) {
                const ni = (y + dy) * w + (x + dx);
                const np = ni * 4;
                sumR += out[np];
                sumG += out[np + 1];
                sumB += out[np + 2];
              }
            }
            const count = (glowRadius * 2 + 1) ** 2;
            const p = ci * 4;
            out[p]     = Math.min(255, out[p]     + sumR / count * glowStrength);
            out[p + 1] = Math.min(255, out[p + 1] + sumG / count * glowStrength);
            out[p + 2] = Math.min(255, out[p + 2] + sumB / count * glowStrength);
          }
        }

        // Write result
        for (let i = 0; i < d.length; i++) d[i] = out[i];
        ctx.putImageData(imageData, 0, 0);

        // 5. Second glow layer via canvas shadow for wider bloom
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tCtx = tempCanvas.getContext('2d')!;
        tCtx.drawImage(canvas, 0, 0);

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.filter = 'blur(6px)';
        ctx.globalAlpha = 0.45;
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();

        // Redraw sharp edges on top of bloom
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.3;
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();
      }
    }
  }, [selectedToppings]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!animation) {
      // Static: draw once
      rotationRef.current = 0;
      drawPizza(ctx, canvas, 0, undefined, filter);
      return;
    }

    if (animation === 'wave' || animation === 'wave-ccw') {
      const reverse = animation === 'wave-ccw';
      const startTime = performance.now() / 1000;
      const animate = () => {
        const elapsed = performance.now() / 1000 - startTime;
        const offsets = getWaveOffsets(elapsed, reverse);
        drawPizza(ctx, canvas, 0, offsets, filter);
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafRef.current);
    }

    // CW / CCW
    const speed = animation === 'cw' ? 0.008 : -0.008;

    const animate = () => {
      rotationRef.current += speed;
      drawPizza(ctx, canvas, rotationRef.current, undefined, filter);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [selectedToppings, animation, filter, drawPizza]);

  const toggleTopping = (topping: string) => {
    setSelectedToppings((prev) => {
      const newToppings = new Set(prev);
      if (newToppings.has(topping)) {
        newToppings.delete(topping);
      } else if (newToppings.size < MAX_TOPPINGS) {
        newToppings.add(topping);
      }
      return newToppings;
    });
  };

  const handleSavePizza = async () => {
    if (!pizzaName.trim()) {
      setSaveStatus('Please enter a name for your pizza');
      return;
    }

    setSaveStatus('Saving...');
    const result = await savePizza({
      name: pizzaName,
      toppings: Array.from(selectedToppings),
      animation: animation,
      filter: filter,
    });

    if (result.error) {
      setSaveStatus(`Error: ${result.error}`);
    } else {
      setSaveStatus('Pizza saved successfully!');
      setPizzaName('');
      setShowSaveDialog(false);
      loadSavedPizzas();
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleLoadPizza = (pizza: SavedPizza) => {
    setSelectedToppings(new Set(pizza.toppings));
    setAnimation((pizza.animation as AnimationType) ?? null);
    setFilter((pizza.filter as FilterType) ?? null);
  };

  const handleDeletePizza = async (pizzaId: string) => {
    const result = await deletePizza(pizzaId);
    if (!result.error) {
      loadSavedPizzas();
    }
  };

  const toggleAnimation = (type: 'cw' | 'ccw' | 'wave' | 'wave-ccw') => {
    setAnimation((prev) => (prev === type ? null : type));
  };

  const toggleFilter = (type: 'mono' | 'neon') => {
    setFilter((prev) => (prev === type ? null : type));
  };

  const handleExportGif = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !animation) return;

    setExporting(true);
    try {
      const { encode } = await import('modern-gif');

      const frames: Array<{ data: CanvasImageSource; delay: number }> = [];
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (animation === 'wave' || animation === 'wave-ccw') {
        // Wave: capture one full cycle
        const reverse = animation === 'wave-ccw';
        const sliceDuration = 0.8;
        const stagger = 0.25 * sliceDuration;
        const cycleDuration = sliceDuration + 7 * stagger;
        const totalFrames = 80; // more frames for the longer cycle
        for (let i = 0; i < totalFrames; i++) {
          const t = (i / totalFrames) * cycleDuration;
          const offsets = getWaveOffsets(t, reverse);
          drawPizza(ctx, canvas, 0, offsets, filter);
          const offscreen = document.createElement('canvas');
          offscreen.width = canvas.width;
          offscreen.height = canvas.height;
          offscreen.getContext('2d')!.drawImage(canvas, 0, 0);
          frames.push({ data: offscreen, delay: 33 });
        }
      } else {
        // CW/CCW: one full rotation
        const totalFrames = 60;
        const speed = animation === 'cw' ? (Math.PI * 2) / totalFrames : -(Math.PI * 2) / totalFrames;
        for (let i = 0; i < totalFrames; i++) {
          const angle = speed * i;
          drawPizza(ctx, canvas, angle, undefined, filter);
          const offscreen = document.createElement('canvas');
          offscreen.width = canvas.width;
          offscreen.height = canvas.height;
          offscreen.getContext('2d')!.drawImage(canvas, 0, 0);
          frames.push({ data: offscreen, delay: 33 });
        }
      }

      // Restore current animation frame
      drawPizza(ctx, canvas, rotationRef.current, undefined, filter);

      const gif = await encode({
        width: canvas.width,
        height: canvas.height,
        frames,
      });

      // Download
      const blob = new Blob([gif], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pizza.gif';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('GIF export failed:', error);
      setSaveStatus('GIF export failed');
      setTimeout(() => setSaveStatus(''), 3000);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Canvas Area */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-800 rounded-xl border border-stone-200/80 dark:border-zinc-700 shadow-md dark:shadow-none p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-stone-900 dark:text-zinc-100 mb-6">Build Your Pizza</h1>

          <canvas
            ref={canvasRef}
            width={500}
            height={500}
            className="border-2 border-stone-200 dark:border-zinc-600 rounded-lg mx-auto block mb-6 max-w-full"
          />

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-stone-500 dark:text-zinc-400 uppercase tracking-wider">
                  Toppings
                </p>
                <p className={`text-xs font-medium ${
                  selectedToppings.size >= MAX_TOPPINGS
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-stone-400 dark:text-zinc-500'
                }`}>
                  {selectedToppings.size}/{MAX_TOPPINGS} selected
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TOPPING_CONFIGS).map(([id, config]) => {
                  const isSelected = selectedToppings.has(id);
                  const isDisabled = !isSelected && selectedToppings.size >= MAX_TOPPINGS;
                  return (
                    <button
                      key={id}
                      onClick={() => toggleTopping(id)}
                      disabled={isDisabled}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-stone-800 text-white dark:bg-amber-600 dark:text-white'
                          : isDisabled
                          ? 'bg-stone-50 text-stone-300 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                      }`}
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Animation Selection */}
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                Animation
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => toggleAnimation('cw')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    animation === 'cw'
                      ? 'bg-stone-800 text-white dark:bg-amber-600 dark:text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                  }`}
                >
                  Rotate CW ↻
                </button>
                <button
                  onClick={() => toggleAnimation('ccw')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    animation === 'ccw'
                      ? 'bg-stone-800 text-white dark:bg-amber-600 dark:text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                  }`}
                >
                  Rotate CCW ↺
                </button>
                <button
                  onClick={() => toggleAnimation('wave')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    animation === 'wave'
                      ? 'bg-stone-800 text-white dark:bg-amber-600 dark:text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                  }`}
                >
                  Wave CW 🍕
                </button>
                <button
                  onClick={() => toggleAnimation('wave-ccw')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    animation === 'wave-ccw'
                      ? 'bg-stone-800 text-white dark:bg-amber-600 dark:text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                  }`}
                >
                  Wave CCW 🍕
                </button>
              </div>
            </div>

            {/* Visual Effects */}
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                Visual Effects
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => toggleFilter('mono')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    filter === 'mono'
                      ? 'bg-stone-800 text-white dark:bg-amber-600 dark:text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                  }`}
                >
                  Monochrome 🖤
                </button>
                <button
                  onClick={() => toggleFilter('neon')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    filter === 'neon'
                      ? 'bg-stone-800 text-white dark:bg-amber-600 dark:text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                  }`}
                >
                  Neon 💜
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveDialog(true)}
                className="flex-1 bg-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-700 dark:bg-amber-600 dark:hover:bg-amber-700 transition-colors"
              >
                Save Pizza
              </button>
              {animation && (
                <button
                  onClick={handleExportGif}
                  disabled={exporting}
                  className="bg-emerald-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting ? 'Exporting...' : 'Export GIF'}
                </button>
              )}
            </div>
          </div>

          {saveStatus && (
            <div className="mt-4 p-3 bg-stone-50 dark:bg-zinc-700 text-stone-600 dark:text-zinc-300 rounded-lg text-sm border border-stone-200 dark:border-zinc-600">
              {saveStatus}
            </div>
          )}

          {showSaveDialog && (
            <div className="mt-4 p-5 bg-stone-50 dark:bg-zinc-700/50 rounded-lg border border-stone-200 dark:border-zinc-600">
              <h3 className="font-semibold text-stone-900 dark:text-zinc-100 text-sm mb-3">Name Your Pizza</h3>
              <input
                type="text"
                value={pizzaName}
                onChange={(e) => setPizzaName(e.target.value)}
                placeholder="e.g. Friday Night Special"
                className="w-full px-3 py-2.5 border border-stone-300 dark:border-zinc-600 rounded-lg mb-3 text-sm bg-white dark:bg-zinc-700 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-amber-500 focus:border-transparent"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSavePizza}
                  className="flex-1 bg-blue-600 dark:bg-amber-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 dark:hover:bg-amber-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1 bg-stone-200 dark:bg-zinc-600 text-stone-600 dark:text-zinc-300 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-300 dark:hover:bg-zinc-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Saved Pizzas Sidebar */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-stone-200/80 dark:border-zinc-700 shadow-md dark:shadow-none p-6">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-zinc-100 mb-4">Saved Pizzas</h2>

          {savedPizzas.length === 0 ? (
            <p className="text-stone-500 dark:text-zinc-400 text-sm text-center py-8">No saved pizzas yet</p>
          ) : (
            <div className="space-y-2">
              {savedPizzas.map((pizza) => (
                <div
                  key={pizza.id}
                  className="p-3 rounded-lg bg-stone-50 dark:bg-zinc-700/50 border border-stone-200 dark:border-zinc-600 hover:border-stone-300 dark:hover:border-zinc-500 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-stone-900 dark:text-zinc-100 text-sm">{pizza.name}</h3>
                    <button
                      onClick={() => handleDeletePizza(pizza.id)}
                      className="text-stone-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 text-xs transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 mb-2">
                    {pizza.toppings.join(', ') || 'Plain cheese'}
                    {pizza.animation && ` · ${pizza.animation === 'cw' ? '↻' : pizza.animation === 'ccw' ? '↺' : '🍕'}`}
                    {pizza.filter && ` · ${pizza.filter === 'mono' ? '🖤' : '💜'}`}
                  </p>
                  <button
                    onClick={() => handleLoadPizza(pizza)}
                    className="w-full bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-zinc-300 py-1.5 rounded text-xs font-medium hover:bg-stone-200 dark:hover:bg-zinc-600 transition-colors"
                  >
                    Load
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
