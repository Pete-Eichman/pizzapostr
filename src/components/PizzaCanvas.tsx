'use client';

import React, { useRef, useEffect, useState } from 'react';
import { savePizza, getUserPizzas, deletePizza } from '@/app/actions/pizza';

interface SavedPizza {
  id: string;
  name: string;
  toppings: string[];
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
      // Single zig-zag drizzle line across and down the slice
      ctx.strokeStyle = '#FAF8F0';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.8;

      ctx.beginPath();
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const r = innerR * 0.5 + t * (outerR * 0.93 - innerR * 0.5);
        // Zig-zag: alternate between left and right sides of the slice
        const zigzag = (i % 2 === 0 ? -0.3 : 0.3);
        const a = startAngle + (0.5 + zigzag) * sliceWidth;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      ctx.lineCap = 'butt';
    },
  },
};

export default function PizzaCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedToppings, setSelectedToppings] = useState<Set<string>>(new Set());
  const [savedPizzas, setSavedPizzas] = useState<SavedPizza[]>([]);
  const [pizzaName, setPizzaName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  useEffect(() => {
    loadSavedPizzas();
  }, []);

  const loadSavedPizzas = async () => {
    const result = await getUserPizzas();
    if (result.pizzas) {
      setSavedPizzas(result.pizzas as SavedPizza[]);
    }
  };

  const drawPizza = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const pizzaRadius = 180;
    const numSlices = 8;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
    const sliceWidth = (Math.PI * 2) / numSlices;

    // Separate positioned vs overlay toppings
    const positionedToppings = toppingArray.filter(
      (t) => TOPPING_CONFIGS[t]?.type === 'positioned'
    );
    const overlayToppings = toppingArray.filter(
      (t) => TOPPING_CONFIGS[t]?.type === 'overlay'
    );

    // Dynamic density: fewer positioned toppings = more items per slice per topping
    const positionSets = distributePositions(positionedToppings.length);

    // Draw positioned toppings
    positionedToppings.forEach((topping, tIdx) => {
      const config = TOPPING_CONFIGS[topping];
      if (!config || config.type !== 'positioned') return;
      const positions = positionSets[tIdx] ?? [];

      for (let sliceIndex = 0; sliceIndex < numSlices; sliceIndex++) {
        const sliceStartAngle = (sliceIndex * Math.PI * 2) / numSlices;

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

    // Draw overlay toppings (e.g. ranch drizzle) on top
    overlayToppings.forEach((topping) => {
      const config = TOPPING_CONFIGS[topping];
      if (!config || config.type !== 'overlay') return;

      for (let sliceIndex = 0; sliceIndex < numSlices; sliceIndex++) {
        const sliceStartAngle = (sliceIndex * Math.PI * 2) / numSlices;
        config.renderSlice(ctx, centerX, centerY, sliceStartAngle, sliceWidth, minR, maxR);
      }
    });

    // Draw slice lines
    ctx.strokeStyle = '#C8874A';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < numSlices; i++) {
      const angle = (i * Math.PI * 2) / numSlices;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * pizzaRadius,
        centerY + Math.sin(angle) * pizzaRadius
      );
      ctx.stroke();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) drawPizza(ctx, canvas);
  }, [selectedToppings]);

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
  };

  const handleDeletePizza = async (pizzaId: string) => {
    const result = await deletePizza(pizzaId);
    if (!result.error) {
      loadSavedPizzas();
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

            <button
              onClick={() => setShowSaveDialog(true)}
              className="w-full bg-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-700 dark:bg-amber-600 dark:hover:bg-amber-700 transition-colors"
            >
              Save Pizza
            </button>
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
