/** Cubic ease-in-out for smooth slice rotation. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Calculate the flip angle for the whole-pizza coin-flip animation.
 *
 * One full cycle: face-up → flip to face-down (pause) → flip back to
 * face-up (pause). Each individual flip uses cubic easing for a natural
 * toss-and-land feel.
 */
export function getFlipAngle(time: number): number {
  const flipDuration = 0.7;
  const pauseDuration = 0.35;
  const cycleDuration = 2 * flipDuration + 2 * pauseDuration;
  const t = ((time % cycleDuration) + cycleDuration) % cycleDuration;

  if (t < flipDuration) {
    // First flip: face-up → face-down
    return easeInOutCubic(t / flipDuration) * Math.PI;
  } else if (t < flipDuration + pauseDuration) {
    // Pause at face-down
    return Math.PI;
  } else if (t < 2 * flipDuration + pauseDuration) {
    // Second flip: face-down → face-up
    return Math.PI + easeInOutCubic((t - flipDuration - pauseDuration) / flipDuration) * Math.PI;
  } else {
    // Pause at face-up
    return 0;
  }
}

/**
 * Calculate per-slice rotation offsets for the wave animation.
 *
 * Each slice does a full 360-degree flip, staggered so the next slice
 * begins when the previous is ~25 % through its flip.
 * `reverse=true` starts the cascade from the last slice (CCW feel).
 */
export function getWaveOffsets(time: number, reverse = false): number[] {
  const sliceDuration = 0.8;
  const stagger = 0.25 * sliceDuration;
  const cycleDuration = sliceDuration + 7 * stagger;
  const t = ((time % cycleDuration) + cycleDuration) % cycleDuration;

  const offsets: number[] = [];
  for (let s = 0; s < 8; s++) {
    const idx = reverse ? 7 - s : s;
    const sliceStart = idx * stagger;
    const progress = Math.max(0, Math.min(1, (t - sliceStart) / sliceDuration));
    offsets.push(easeInOutCubic(progress) * Math.PI * 2);
  }
  return offsets;
}
