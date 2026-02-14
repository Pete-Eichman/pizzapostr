'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { savePizza, getUserPizzas, deletePizza } from '@/app/actions/pizza';
import { drawPizza } from '@/lib/pizzaRenderer';
import type { HalfPizzaInfo } from '@/lib/pizzaRenderer';
import { getWaveOffsets, getFlipAngle } from '@/lib/animation';
import { TOPPING_CONFIGS, MAX_TOPPINGS } from '@/lib/toppings';
import type { AnimationType, FilterType, PizzaMode, SavedPizza } from '@/types/pizza';

// ── Reusable pill-shaped toggle button ───────────────────────────────────────

function ToggleButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
        active
          ? 'bg-stone-800 text-white dark:bg-amber-600 dark:text-white'
          : disabled
          ? 'bg-stone-50 text-stone-300 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600'
          : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
      }`}
    >
      {children}
    </button>
  );
}

// ── Topping selector section (reused for whole, left-half, right-half) ──────

function ToppingSelector({
  label,
  toppings,
  max,
  onToggle,
}: {
  label: string;
  toppings: Set<string>;
  max: number;
  onToggle: (topping: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-stone-500 dark:text-zinc-400 uppercase tracking-wider">
          {label}
        </p>
        <p className={`text-xs font-medium ${
          toppings.size >= max
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-stone-400 dark:text-zinc-500'
        }`}>
          {toppings.size}/{max} selected
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(TOPPING_CONFIGS).map(([id, config]) => (
          <ToggleButton
            key={id}
            active={toppings.has(id)}
            disabled={!toppings.has(id) && toppings.size >= max}
            onClick={() => onToggle(id)}
          >
            {config.label}
          </ToggleButton>
        ))}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function PizzaCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<PizzaMode>('whole');
  const [selectedToppings, setSelectedToppings] = useState<Set<string>>(new Set());
  const [leftToppings, setLeftToppings] = useState<Set<string>>(new Set());
  const [rightToppings, setRightToppings] = useState<Set<string>>(new Set());
  const [animation, setAnimation] = useState<AnimationType>(null);
  const [filter, setFilter] = useState<FilterType>(null);
  const [savedPizzas, setSavedPizzas] = useState<SavedPizza[]>([]);
  const [pizzaName, setPizzaName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [exporting, setExporting] = useState(false);
  const rotationRef = useRef(0);
  const rafRef = useRef(0);

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadSavedPizzas = useCallback(async () => {
    const result = await getUserPizzas();
    if (result.pizzas) setSavedPizzas(result.pizzas as SavedPizza[]);
  }, []);

  useEffect(() => { loadSavedPizzas(); }, [loadSavedPizzas]);

  // ── Build half-pizza info for the renderer ────────────────────────────────

  const halfInfo: HalfPizzaInfo | undefined = mode === 'half'
    ? { leftToppings, rightToppings }
    : undefined;

  // ── Stable draw callback ───────────────────────────────────────────────────

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, rotation = 0, sliceOffsets?: number[], flipAngle?: number) => {
      drawPizza(ctx, canvas, selectedToppings, rotation, sliceOffsets, filter, mode, halfInfo, flipAngle);
    },
    [selectedToppings, filter, mode, halfInfo],
  );

  // ── Animation loop ─────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!animation) {
      rotationRef.current = 0;
      draw(ctx, canvas, 0);
      return;
    }

    if (animation === 'wave' || animation === 'wave-ccw') {
      const reverse = animation === 'wave-ccw';
      const startTime = performance.now() / 1000;
      const animate = () => {
        const elapsed = performance.now() / 1000 - startTime;
        draw(ctx, canvas, 0, getWaveOffsets(elapsed, reverse));
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafRef.current);
    }

    if (animation === 'flip') {
      const startTime = performance.now() / 1000;
      const animate = () => {
        const elapsed = performance.now() / 1000 - startTime;
        draw(ctx, canvas, 0, undefined, getFlipAngle(elapsed));
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafRef.current);
    }

    const speed = animation === 'cw' ? 0.008 : -0.008;
    const animate = () => {
      rotationRef.current += speed;
      draw(ctx, canvas, rotationRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animation, draw]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleTopping = (topping: string) => {
    setSelectedToppings(prev => {
      const next = new Set(prev);
      if (next.has(topping)) next.delete(topping);
      else if (next.size < MAX_TOPPINGS) next.add(topping);
      return next;
    });
  };

  const toggleLeftTopping = (topping: string) => {
    setLeftToppings(prev => {
      const next = new Set(prev);
      if (next.has(topping)) next.delete(topping);
      else if (next.size < MAX_TOPPINGS) next.add(topping);
      return next;
    });
  };

  const toggleRightTopping = (topping: string) => {
    setRightToppings(prev => {
      const next = new Set(prev);
      if (next.has(topping)) next.delete(topping);
      else if (next.size < MAX_TOPPINGS) next.add(topping);
      return next;
    });
  };

  const toggleAnimation = (type: AnimationType & string) =>
    setAnimation(prev => (prev === type ? null : type));

  const toggleFilter = (type: FilterType & string) =>
    setFilter(prev => (prev === type ? null : type));

  const handleSavePizza = async () => {
    if (!pizzaName.trim()) {
      setSaveStatus('Please enter a name for your pizza');
      return;
    }
    setSaveStatus('Saving...');
    const result = await savePizza({
      name: pizzaName,
      toppings: mode === 'whole' ? Array.from(selectedToppings) : [],
      mode,
      leftToppings: mode === 'half' ? Array.from(leftToppings) : [],
      rightToppings: mode === 'half' ? Array.from(rightToppings) : [],
      animation,
      filter,
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
    const pizzaMode = (pizza.mode ?? 'whole') as PizzaMode;
    setMode(pizzaMode);
    if (pizzaMode === 'half') {
      setLeftToppings(new Set(pizza.leftToppings ?? []));
      setRightToppings(new Set(pizza.rightToppings ?? []));
      setSelectedToppings(new Set());
    } else {
      setSelectedToppings(new Set(pizza.toppings));
      setLeftToppings(new Set());
      setRightToppings(new Set());
    }
    setAnimation((pizza.animation as AnimationType) ?? null);
    setFilter((pizza.filter as FilterType) ?? null);
  };

  const handleDeletePizza = async (pizzaId: string) => {
    const result = await deletePizza(pizzaId);
    if (!result.error) loadSavedPizzas();
  };

  const handleExportGif = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !animation) return;

    setExporting(true);
    try {
      const { encode } = await import('modern-gif');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const frames: Array<{ data: CanvasImageSource; delay: number }> = [];

      if (animation === 'wave' || animation === 'wave-ccw') {
        const reverse = animation === 'wave-ccw';
        const sliceDuration = 0.8;
        const stagger = 0.25 * sliceDuration;
        const cycleDuration = sliceDuration + 7 * stagger;
        const totalFrames = 80;
        for (let i = 0; i < totalFrames; i++) {
          draw(ctx, canvas, 0, getWaveOffsets((i / totalFrames) * cycleDuration, reverse));
          const off = document.createElement('canvas');
          off.width = canvas.width;
          off.height = canvas.height;
          off.getContext('2d')!.drawImage(canvas, 0, 0);
          frames.push({ data: off, delay: 33 });
        }
      } else if (animation === 'flip') {
        const flipDuration = 0.7;
        const pauseDuration = 0.35;
        const cycleDuration = 2 * flipDuration + 2 * pauseDuration;
        const totalFrames = 70;
        for (let i = 0; i < totalFrames; i++) {
          draw(ctx, canvas, 0, undefined, getFlipAngle((i / totalFrames) * cycleDuration));
          const off = document.createElement('canvas');
          off.width = canvas.width;
          off.height = canvas.height;
          off.getContext('2d')!.drawImage(canvas, 0, 0);
          frames.push({ data: off, delay: 33 });
        }
      } else {
        const totalFrames = 60;
        const step = (animation === 'cw' ? 1 : -1) * (Math.PI * 2) / totalFrames;
        for (let i = 0; i < totalFrames; i++) {
          draw(ctx, canvas, step * i);
          const off = document.createElement('canvas');
          off.width = canvas.width;
          off.height = canvas.height;
          off.getContext('2d')!.drawImage(canvas, 0, 0);
          frames.push({ data: off, delay: 33 });
        }
      }

      draw(ctx, canvas, rotationRef.current);

      const gif = await encode({ width: canvas.width, height: canvas.height, frames });
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

  // ── Helper: describe saved pizza toppings ──────────────────────────────────

  const describePizzaToppings = (pizza: SavedPizza): string => {
    const pizzaMode = pizza.mode ?? 'whole';
    if (pizzaMode === 'half') {
      const left = (pizza.leftToppings ?? []).join(', ') || 'plain';
      const right = (pizza.rightToppings ?? []).join(', ') || 'plain';
      return `L: ${left} | R: ${right}`;
    }
    return pizza.toppings.join(', ') || 'Plain cheese';
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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
            {/* Pizza Mode */}
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                Pizza Style
              </p>
              <div className="flex gap-2">
                <ToggleButton active={mode === 'whole'} onClick={() => setMode('whole')}>
                  Whole
                </ToggleButton>
                <ToggleButton active={mode === 'half'} onClick={() => setMode('half')}>
                  Half &amp; Half
                </ToggleButton>
              </div>
            </div>

            {/* Toppings — whole mode */}
            {mode === 'whole' && (
              <ToppingSelector
                label="Toppings"
                toppings={selectedToppings}
                max={MAX_TOPPINGS}
                onToggle={toggleTopping}
              />
            )}

            {/* Toppings — half mode */}
            {mode === 'half' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-stone-200 dark:border-zinc-600 bg-stone-50/50 dark:bg-zinc-700/30">
                  <ToppingSelector
                    label="Left Half"
                    toppings={leftToppings}
                    max={MAX_TOPPINGS}
                    onToggle={toggleLeftTopping}
                  />
                </div>
                <div className="p-4 rounded-lg border border-stone-200 dark:border-zinc-600 bg-stone-50/50 dark:bg-zinc-700/30">
                  <ToppingSelector
                    label="Right Half"
                    toppings={rightToppings}
                    max={MAX_TOPPINGS}
                    onToggle={toggleRightTopping}
                  />
                </div>
              </div>
            )}

            {/* Animation */}
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                Animation
              </p>
              <div className="flex flex-wrap gap-2">
                {([['cw', 'Rotate CW ↻'], ['ccw', 'Rotate CCW ↺'], ['wave', 'Wave CW 🍕'], ['wave-ccw', 'Wave CCW 🍕'], ['flip', 'Flip 🪙']] as const).map(
                  ([type, label]) => (
                    <ToggleButton key={type} active={animation === type} onClick={() => toggleAnimation(type)}>
                      {label}
                    </ToggleButton>
                  ),
                )}
              </div>
            </div>

            {/* Visual Effects */}
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                Visual Effects
              </p>
              <div className="flex flex-wrap gap-2">
                <ToggleButton active={filter === 'mono'} onClick={() => toggleFilter('mono')}>
                  Monochrome 🖤
                </ToggleButton>
                <ToggleButton active={filter === 'neon'} onClick={() => toggleFilter('neon')}>
                  Neon 💜
                </ToggleButton>
                <ToggleButton active={filter === 'negative'} onClick={() => toggleFilter('negative')}>
                  Negative 🔲
                </ToggleButton>
              </div>
            </div>

            {/* Actions */}
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
                onChange={e => setPizzaName(e.target.value)}
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
              {savedPizzas.map(pizza => (
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
                    {describePizzaToppings(pizza)}
                    {pizza.animation && ` · ${pizza.animation === 'cw' ? '↻' : pizza.animation === 'ccw' ? '↺' : pizza.animation === 'flip' ? '🪙' : '🍕'}`}
                    {pizza.filter && ` · ${pizza.filter === 'mono' ? '🖤' : pizza.filter === 'neon' ? '💜' : '🔲'}`}
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
