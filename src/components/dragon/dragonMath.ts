/**
 * Pure constants and per-segment formulas for the dragon.
 * These are the original numbers, untouched. `scale` is applied at the
 * call site (see useDragonAnimation) by multiplying these results.
 */

export const SEGMENT_COUNT = 40;

export type SegmentKind = "head" | "fin" | "spine";

/** Segment 0 is the invisible lead point; 1 is the head; 8 and 14 carry fins. */
export const segmentKind = (i: number): SegmentKind => {
  if (i === 1) return "head";
  if (i === 8 || i === 14) return "fin";
  return "spine";
};

/**
 * How far segment i is pulled toward its trailing position behind segment
 * i - 1, along one axis. `axisUnit` is cos(angle) or sin(angle); `k` is the
 * dragon scale. The operation order matches the original exactly, with the
 * scale multiplied last, so k = 1 is bit-identical to the unscaled maths.
 */
export const trailOffset = (i: number, axisUnit: number, k: number): number =>
  ((axisUnit * (100 - i)) / 5) * k;

/** Sprite scale (at scale 1) for segment i. */
export const baseSpriteScale = (i: number): number => (162 + 4 * (1 - i)) / 50;