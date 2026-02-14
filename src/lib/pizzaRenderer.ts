/**
 * pizzaRenderer.ts
 *
 * Pure canvas drawing logic for the pizza — completely decoupled from React.
 * Handles: front face, back face, neon zone-map, Sobel edge detection, glow,
 * monochrome filter, and wave/rotation transforms.
 */

import type { FilterType, PizzaMode } from '@/types/pizza';
import {
  TOPPING_CONFIGS,
  SLICE_POSITIONS,
  NEON_TOPPING_COLORS,
  distributePositions,
} from '@/lib/toppings';

// ── Constants ────────────────────────────────────────────────────────────────

const NUM_SLICES = 8;
const SLICE_WIDTH = (Math.PI * 2) / NUM_SLICES;
const PIZZA_RADIUS = 180;
const MIN_R = 40;
const MAX_R = 155;

// Vertical split: left half = slices whose midpoints point left,
// right half = slices whose midpoints point right.
// Slice 0 starts at angle 0 (3 o'clock). The split line runs through
// angles π/2 (6 o'clock) and 3π/2 (12 o'clock).
const LEFT_SLICES = new Set([2, 3, 4, 5]);
const RIGHT_SLICES = new Set([0, 1, 6, 7]);

// ── Half-pizza topping info passed through the renderer ─────────────────────

export interface HalfPizzaInfo {
  leftToppings: ReadonlySet<string>;
  rightToppings: ReadonlySet<string>;
}

// ── Helpers: front / back face drawing ───────────────────────────────────────

function drawContent(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  selectedToppings: ReadonlySet<string>,
  mode: PizzaMode = 'whole',
  halfInfo?: HalfPizzaInfo,
) {
  // Crust
  ctx.beginPath();
  ctx.arc(centerX, centerY, PIZZA_RADIUS + 10, 0, Math.PI * 2);
  ctx.fillStyle = '#D4A55A';
  ctx.fill();
  ctx.strokeStyle = '#8B5E34';
  ctx.lineWidth = 14;
  ctx.stroke();

  // Sauce
  ctx.beginPath();
  ctx.arc(centerX, centerY, PIZZA_RADIUS - 5, 0, Math.PI * 2);
  ctx.fillStyle = '#C43E2A';
  ctx.fill();

  // Cheese
  ctx.beginPath();
  ctx.arc(centerX, centerY, PIZZA_RADIUS - 15, 0, Math.PI * 2);
  ctx.fillStyle = '#EFC050';
  ctx.fill();

  // Cheese ring border
  ctx.beginPath();
  ctx.arc(centerX, centerY, PIZZA_RADIUS - 15, 0, Math.PI * 2);
  ctx.strokeStyle = '#F5D060';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Toppings
  if (mode === 'whole') {
    drawToppingsOnSlices(ctx, centerX, centerY, selectedToppings, [0, 1, 2, 3, 4, 5, 6, 7]);
  } else if (halfInfo) {
    drawToppingsOnSlices(ctx, centerX, centerY, halfInfo.leftToppings, [2, 3, 4, 5]);
    drawToppingsOnSlices(ctx, centerX, centerY, halfInfo.rightToppings, [0, 1, 6, 7]);
  }

  // Slice lines
  ctx.strokeStyle = '#C8874A';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < NUM_SLICES; i++) {
    const angle = i * SLICE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(angle) * PIZZA_RADIUS, centerY + Math.sin(angle) * PIZZA_RADIUS);
    ctx.stroke();
  }

  // Half-pizza divider line (thicker line along the vertical split)
  if (mode === 'half') {
    ctx.strokeStyle = '#A06030';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(Math.PI / 2) * PIZZA_RADIUS, centerY + Math.sin(Math.PI / 2) * PIZZA_RADIUS);
    ctx.lineTo(centerX + Math.cos(3 * Math.PI / 2) * PIZZA_RADIUS, centerY + Math.sin(3 * Math.PI / 2) * PIZZA_RADIUS);
    ctx.stroke();
  }
}

/** Render positioned + overlay toppings only onto the given slice indices. */
function drawToppingsOnSlices(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  toppings: ReadonlySet<string>,
  slices: number[],
) {
  const toppingArray = Array.from(toppings);
  const positioned = toppingArray.filter(t => TOPPING_CONFIGS[t]?.type === 'positioned');
  const overlays = toppingArray.filter(t => TOPPING_CONFIGS[t]?.type === 'overlay');
  const positionSets = distributePositions(positioned.length);

  positioned.forEach((topping, tIdx) => {
    const config = TOPPING_CONFIGS[topping];
    if (!config || config.type !== 'positioned') return;
    const positions = positionSets[tIdx] ?? [];

    for (const s of slices) {
      const sliceStart = s * SLICE_WIDTH;
      positions.forEach(posIndex => {
        const pos = SLICE_POSITIONS[posIndex];
        const angle = sliceStart + pos.af * SLICE_WIDTH;
        const radius = MIN_R + pos.rf * (MAX_R - MIN_R);
        config.render(ctx, centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      });
    }
  });

  overlays.forEach(topping => {
    const config = TOPPING_CONFIGS[topping];
    if (!config || config.type !== 'overlay') return;
    for (const s of slices) {
      config.renderSlice(ctx, centerX, centerY, s * SLICE_WIDTH, SLICE_WIDTH, MIN_R, MAX_R);
    }
  });
}

function drawBackFace(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
) {
  // Outer crust ring
  ctx.beginPath();
  ctx.arc(centerX, centerY, PIZZA_RADIUS + 10, 0, Math.PI * 2);
  ctx.fillStyle = '#C8944A';
  ctx.fill();
  ctx.strokeStyle = '#8B5E34';
  ctx.lineWidth = 14;
  ctx.stroke();

  // Baked-dough bottom
  ctx.beginPath();
  ctx.arc(centerX, centerY, PIZZA_RADIUS - 5, 0, Math.PI * 2);
  ctx.fillStyle = '#D9B06A';
  ctx.fill();

  // Flour spots
  ctx.fillStyle = 'rgba(255, 255, 240, 0.35)';
  for (let i = 0; i < 28; i++) {
    const a = (i * 2.399) % (Math.PI * 2);
    const r = 25 + ((i * 97 + 13) % 130);
    const sz = 3 + ((i * 43) % 5);
    ctx.beginPath();
    ctx.arc(centerX + Math.cos(a) * r, centerY + Math.sin(a) * r, sz, 0, Math.PI * 2);
    ctx.fill();
  }

  // Char marks
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

  // Slice lines
  ctx.strokeStyle = '#B8844A';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < NUM_SLICES; i++) {
    const angle = i * SLICE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(angle) * PIZZA_RADIUS, centerY + Math.sin(angle) * PIZZA_RADIUS);
    ctx.stroke();
  }
}

// ── Helpers: neon zone-map drawing ───────────────────────────────────────────

function drawZoneContent(
  z: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  selectedToppings: ReadonlySet<string>,
  mode: PizzaMode = 'whole',
  halfInfo?: HalfPizzaInfo,
) {
  // Crust
  z.beginPath();
  z.arc(centerX, centerY, PIZZA_RADIUS + 10, 0, Math.PI * 2);
  z.fillStyle = 'rgb(255,140,20)';
  z.fill();
  z.strokeStyle = 'rgb(255,120,15)';
  z.lineWidth = 14;
  z.stroke();

  // Sauce
  z.beginPath();
  z.arc(centerX, centerY, PIZZA_RADIUS - 5, 0, Math.PI * 2);
  z.fillStyle = 'rgb(255,20,30)';
  z.fill();

  // Cheese
  z.beginPath();
  z.arc(centerX, centerY, PIZZA_RADIUS - 15, 0, Math.PI * 2);
  z.fillStyle = 'rgb(255,255,40)';
  z.fill();
  z.strokeStyle = 'rgb(255,255,80)';
  z.lineWidth = 3;
  z.beginPath();
  z.arc(centerX, centerY, PIZZA_RADIUS - 15, 0, Math.PI * 2);
  z.stroke();

  // Toppings
  if (mode === 'whole') {
    drawZoneToppingsOnSlices(z, centerX, centerY, selectedToppings, [0, 1, 2, 3, 4, 5, 6, 7]);
  } else if (halfInfo) {
    drawZoneToppingsOnSlices(z, centerX, centerY, halfInfo.leftToppings, [2, 3, 4, 5]);
    drawZoneToppingsOnSlices(z, centerX, centerY, halfInfo.rightToppings, [0, 1, 6, 7]);
  }

  // Slice lines
  z.strokeStyle = 'rgb(255,255,40)';
  z.lineWidth = 4;
  for (let i = 0; i < NUM_SLICES; i++) {
    const angle = i * SLICE_WIDTH;
    z.beginPath();
    z.moveTo(centerX, centerY);
    z.lineTo(centerX + Math.cos(angle) * PIZZA_RADIUS, centerY + Math.sin(angle) * PIZZA_RADIUS);
    z.stroke();
  }
}

/** Render zone-map toppings (simplified circles/lines) for given slices. */
function drawZoneToppingsOnSlices(
  z: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  toppings: ReadonlySet<string>,
  slices: number[],
) {
  const toppingArr = Array.from(toppings);
  const positioned = toppingArr.filter(t => TOPPING_CONFIGS[t]?.type === 'positioned');
  const overlays = toppingArr.filter(t => TOPPING_CONFIGS[t]?.type === 'overlay');
  const posSets = distributePositions(positioned.length);

  positioned.forEach((topping, tIdx) => {
    const nc = NEON_TOPPING_COLORS[topping] ?? [255, 255, 40];
    z.fillStyle = `rgb(${nc[0]},${nc[1]},${nc[2]})`;
    const positions = posSets[tIdx] ?? [];
    for (const si of slices) {
      const sliceStart = si * SLICE_WIDTH;
      positions.forEach(posIndex => {
        const pos = SLICE_POSITIONS[posIndex];
        const angle = sliceStart + pos.af * SLICE_WIDTH;
        const radius = MIN_R + pos.rf * (MAX_R - MIN_R);
        z.beginPath();
        z.arc(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius, 14, 0, Math.PI * 2);
        z.fill();
      });
    }
  });

  // Overlay toppings (ranch drizzle etc.)
  overlays.forEach(topping => {
    const nc = NEON_TOPPING_COLORS[topping] ?? [255, 255, 40];
    z.strokeStyle = `rgb(${nc[0]},${nc[1]},${nc[2]})`;
    z.lineWidth = 6;
    z.lineCap = 'round';
    z.lineJoin = 'round';
    for (const si of slices) {
      const sliceStart = si * SLICE_WIDTH;
      z.beginPath();
      for (let step = 0; step <= 40; step++) {
        const t = step / 40;
        const r = MIN_R * 0.5 + t * (MAX_R * 0.93 - MIN_R * 0.5);
        const wave = Math.sin(t * Math.PI * 6) * 0.28;
        const a = sliceStart + (0.5 + wave) * SLICE_WIDTH;
        const px = centerX + Math.cos(a) * r;
        const py = centerY + Math.sin(a) * r;
        if (step === 0) z.moveTo(px, py); else z.lineTo(px, py);
      }
      z.stroke();
    }
    z.lineCap = 'butt';
    z.lineJoin = 'miter';
  });
}

function drawZoneBackFace(
  z: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
) {
  z.beginPath();
  z.arc(centerX, centerY, PIZZA_RADIUS + 10, 0, Math.PI * 2);
  z.fillStyle = 'rgb(255,140,20)';
  z.fill();
  z.strokeStyle = 'rgb(255,120,15)';
  z.lineWidth = 14;
  z.stroke();

  z.strokeStyle = 'rgb(255,160,40)';
  z.lineWidth = 4;
  for (let i = 0; i < NUM_SLICES; i++) {
    const angle = i * SLICE_WIDTH;
    z.beginPath();
    z.moveTo(centerX, centerY);
    z.lineTo(centerX + Math.cos(angle) * PIZZA_RADIUS, centerY + Math.sin(angle) * PIZZA_RADIUS);
    z.stroke();
  }
}

// ── Helpers: transform a context for one slice (wave flip) ───────────────────

interface SliceTransform {
  bisector: number;
  scalePerp: number;
  startAngle: number;
  clipRadius: number;
}

function applySliceTransform(
  target: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  st: SliceTransform,
) {
  target.save();
  target.translate(cx, cy);
  target.rotate(st.bisector);
  target.scale(1, st.scalePerp);
  target.rotate(-st.bisector);
  target.translate(-cx, -cy);
  target.beginPath();
  target.moveTo(cx, cy);
  target.arc(cx, cy, st.clipRadius, st.startAngle, st.startAngle + SLICE_WIDTH);
  target.closePath();
  target.clip();
}

// ── Filters ──────────────────────────────────────────────────────────────────

function applyNegativeFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];
    d[i + 1] = 255 - d[i + 1];
    d[i + 2] = 255 - d[i + 2];
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyMonoFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = lum;
    d[i + 1] = lum;
    d[i + 2] = lum;
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyNeonFilter(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  zoneCtx: CanvasRenderingContext2D,
) {
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  // 1. Sobel edge detection
  const grey = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    grey[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
  }

  const edge = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
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

  let maxEdge = 0;
  for (let i = 0; i < edge.length; i++) {
    if (edge[i] > maxEdge) maxEdge = edge[i];
  }
  const invMax = maxEdge > 0 ? 1 / maxEdge : 0;

  // 2. Read neon colours from zone map
  const zd = zoneCtx.getImageData(0, 0, w, h).data;
  const neonR = new Uint8ClampedArray(w * h);
  const neonG = new Uint8ClampedArray(w * h);
  const neonB = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) {
    const zp = i * 4;
    if (zd[zp + 3] === 0) {
      neonR[i] = 8; neonG[i] = 5; neonB[i] = 20;
    } else {
      neonR[i] = zd[zp];
      neonG[i] = zd[zp + 1];
      neonB[i] = zd[zp + 2];
    }
  }

  // 3. Build output: dark bg + neon edges
  const out = new Uint8ClampedArray(d.length);
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    const e = Math.min(1, edge[i] * invMax * 2.5);
    const brightness = e * e;
    out[p]     = 8  + brightness * neonR[i];
    out[p + 1] = 5  + brightness * neonG[i];
    out[p + 2] = 20 + brightness * neonB[i];
    out[p + 3] = d[p + 3];
  }

  // 4. Glow pass: box blur around edge pixels
  const glowRadius = 3;
  const glowStrength = 0.18;
  for (let y = glowRadius; y < h - glowRadius; y++) {
    for (let x = glowRadius; x < w - glowRadius; x++) {
      const ci = y * w + x;
      if (edge[ci] * invMax < 0.15) continue;
      let sumR = 0, sumG = 0, sumB = 0;
      for (let dy = -glowRadius; dy <= glowRadius; dy++) {
        for (let dx = -glowRadius; dx <= glowRadius; dx++) {
          const np = ((y + dy) * w + (x + dx)) * 4;
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

  // 5. Second glow via canvas blur for wider bloom
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = w;
  tempCanvas.height = h;
  tempCanvas.getContext('2d')!.drawImage(canvas, 0, 0);

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

// ── Main entry point ─────────────────────────────────────────────────────────

export function drawPizza(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  selectedToppings: ReadonlySet<string>,
  rotation = 0,
  sliceOffsets?: number[],
  activeFilter?: FilterType,
  mode: PizzaMode = 'whole',
  halfInfo?: HalfPizzaInfo,
  flipAngle?: number,
) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Create zone-map canvas for neon filter
  let zoneCtx: CanvasRenderingContext2D | null = null;
  if (activeFilter === 'neon') {
    const zC = document.createElement('canvas');
    zC.width = canvas.width;
    zC.height = canvas.height;
    zoneCtx = zC.getContext('2d');
  }

  if (sliceOffsets) {
    const clipRadius = PIZZA_RADIUS + 25;

    for (let s = 0; s < NUM_SLICES; s++) {
      const cosFlip = Math.cos(sliceOffsets[s]);
      const showBack = cosFlip < 0;
      const st: SliceTransform = {
        bisector: s * SLICE_WIDTH + SLICE_WIDTH / 2,
        scalePerp: Math.abs(cosFlip) || 0.001,
        startAngle: s * SLICE_WIDTH,
        clipRadius,
      };

      applySliceTransform(ctx, centerX, centerY, st);
      if (showBack) drawBackFace(ctx, centerX, centerY);
      else drawContent(ctx, centerX, centerY, selectedToppings, mode, halfInfo);
      ctx.restore();

      if (zoneCtx) {
        applySliceTransform(zoneCtx, centerX, centerY, st);
        if (showBack) drawZoneBackFace(zoneCtx, centerX, centerY);
        else drawZoneContent(zoneCtx, centerX, centerY, selectedToppings, mode, halfInfo);
        zoneCtx.restore();
      }
    }
  } else if (flipAngle !== undefined) {
    // Whole-pizza coin-flip: scale vertically by |cos(flipAngle)|,
    // show back face when cos < 0.
    const cosFlip = Math.cos(flipAngle);
    const showBack = cosFlip < 0;
    const scaleY = Math.abs(cosFlip) || 0.001;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(1, scaleY);
    ctx.translate(-centerX, -centerY);
    if (showBack) drawBackFace(ctx, centerX, centerY);
    else drawContent(ctx, centerX, centerY, selectedToppings, mode, halfInfo);
    ctx.restore();

    if (zoneCtx) {
      zoneCtx.save();
      zoneCtx.translate(centerX, centerY);
      zoneCtx.scale(1, scaleY);
      zoneCtx.translate(-centerX, -centerY);
      if (showBack) drawZoneBackFace(zoneCtx, centerX, centerY);
      else drawZoneContent(zoneCtx, centerX, centerY, selectedToppings, mode, halfInfo);
      zoneCtx.restore();
    }
  } else {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.translate(-centerX, -centerY);
    drawContent(ctx, centerX, centerY, selectedToppings, mode, halfInfo);
    ctx.restore();

    if (zoneCtx) {
      zoneCtx.save();
      zoneCtx.translate(centerX, centerY);
      zoneCtx.rotate(rotation);
      zoneCtx.translate(-centerX, -centerY);
      drawZoneContent(zoneCtx, centerX, centerY, selectedToppings, mode, halfInfo);
      zoneCtx.restore();
    }
  }

  // Apply visual filter
  if (activeFilter === 'mono') {
    applyMonoFilter(ctx, canvas.width, canvas.height);
  } else if (activeFilter === 'neon' && zoneCtx) {
    applyNeonFilter(ctx, canvas, zoneCtx);
  } else if (activeFilter === 'negative') {
    applyNegativeFilter(ctx, canvas.width, canvas.height);
  }
}
