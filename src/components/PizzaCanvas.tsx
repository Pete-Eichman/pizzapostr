'use client';

import React, { useRef, useEffect, useState } from 'react';
import { savePizza, getUserPizzas, deletePizza } from '@/app/actions/pizza';

interface SavedPizza {
  id: string;
  name: string;
  toppings: string[];
  createdAt: Date;
}

type ToppingRenderer = (ctx: CanvasRenderingContext2D, x: number, y: number) => void;

// Fixed positions within each slice: af = angle fraction (0-1), rf = radius fraction (0-1)
// Each topping type uses distinct positions so they never overlap
const SLICE_POSITIONS: Array<{ af: number; rf: number }> = [
  { af: 0.50, rf: 0.15 }, // inner center
  { af: 0.30, rf: 0.37 }, // mid-inner left
  { af: 0.70, rf: 0.37 }, // mid-inner right
  { af: 0.22, rf: 0.58 }, // middle left
  { af: 0.50, rf: 0.55 }, // middle center
  { af: 0.78, rf: 0.58 }, // middle right
  { af: 0.22, rf: 0.80 }, // outer left
  { af: 0.50, rf: 0.78 }, // outer center
  { af: 0.78, rf: 0.80 }, // outer right
];

const TOPPING_CONFIGS: Record<
  string,
  { label: string; render: ToppingRenderer; positions: number[] }
> = {
  pepperoni: {
    label: 'Pepperoni',
    positions: [0, 5],
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
    positions: [1, 8],
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
    positions: [2, 4, 6],
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
    positions: [3, 7],
    render: (ctx, x, y) => {
      ctx.fillStyle = '#4A8C3F';
      ctx.fillRect(x - 5, y - 7, 10, 14);
      ctx.fillStyle = '#367030';
      ctx.fillRect(x - 2, y - 7, 4, 14);
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

    // Draw toppings at fixed positions per slice
    const toppingArray = Array.from(selectedToppings);
    const minR = 40;
    const maxR = 155;
    const sliceWidth = (Math.PI * 2) / numSlices;

    toppingArray.forEach((topping) => {
      const config = TOPPING_CONFIGS[topping];
      if (!config) return;

      for (let sliceIndex = 0; sliceIndex < numSlices; sliceIndex++) {
        const sliceStartAngle = (sliceIndex * Math.PI * 2) / numSlices;

        config.positions.forEach((posIndex) => {
          const pos = SLICE_POSITIONS[posIndex];
          const angle = sliceStartAngle + pos.af * sliceWidth;
          const radius = minR + pos.rf * (maxR - minR);

          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          config.render(ctx, x, y);
        });
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
      } else {
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
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-stone-800 mb-6">Build Your Pizza</h1>

          <canvas
            ref={canvasRef}
            width={500}
            height={500}
            className="border border-stone-200 rounded-lg mx-auto block mb-6 max-w-full"
          />

          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">
                Toppings
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TOPPING_CONFIGS).map(([id, config]) => (
                  <button
                    key={id}
                    onClick={() => toggleTopping(id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedToppings.has(id)
                        ? 'bg-stone-800 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowSaveDialog(true)}
              className="w-full bg-amber-700 text-white font-medium py-3 px-6 rounded-lg hover:bg-amber-800 transition-colors"
            >
              Save Pizza
            </button>
          </div>

          {saveStatus && (
            <div className="mt-4 p-3 bg-stone-50 text-stone-600 rounded-lg text-sm border border-stone-200">
              {saveStatus}
            </div>
          )}

          {showSaveDialog && (
            <div className="mt-4 p-5 bg-stone-50 rounded-lg border border-stone-200">
              <h3 className="font-semibold text-stone-800 text-sm mb-3">Name Your Pizza</h3>
              <input
                type="text"
                value={pizzaName}
                onChange={(e) => setPizzaName(e.target.value)}
                placeholder="e.g. Friday Night Special"
                className="w-full px-3 py-2.5 border border-stone-300 rounded-lg mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSavePizza}
                  className="flex-1 bg-stone-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-stone-900 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1 bg-stone-200 text-stone-600 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Saved Pizzas Sidebar */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">Saved Pizzas</h2>

          {savedPizzas.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">No saved pizzas yet</p>
          ) : (
            <div className="space-y-2">
              {savedPizzas.map((pizza) => (
                <div
                  key={pizza.id}
                  className="p-3 rounded-lg border border-stone-100 hover:border-stone-200 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-stone-800 text-sm">{pizza.name}</h3>
                    <button
                      onClick={() => handleDeletePizza(pizza.id)}
                      className="text-stone-300 hover:text-red-400 text-xs transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-stone-400 mb-2">
                    {pizza.toppings.join(', ') || 'Plain cheese'}
                  </p>
                  <button
                    onClick={() => handleLoadPizza(pizza)}
                    className="w-full bg-stone-100 text-stone-600 py-1.5 rounded text-xs font-medium hover:bg-stone-200 transition-colors"
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
