import { useEffect, useRef, type MutableRefObject } from "react";
import {
  SEGMENT_COUNT,
  baseSpriteScale,
  trailOffset,
} from "./dragonMath";

interface Point {
  x: number;
  y: number;
}

/**
 * Runs the dragon simulation. Segment transforms are written straight to the
 * <use> elements each frame, so React never re-renders while it animates.
 *
 * `scale` is read through a ref: changing it takes effect on the next frame
 * without restarting the loop or resetting the dragon's position.
 */
export function useDragonAnimation(
  segmentRefs: MutableRefObject<(SVGUseElement | null)[]>,
  scale: number
): void {
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  useEffect(() => {
    let width = window.innerWidth;
    let height = window.innerHeight;

    const N = SEGMENT_COUNT;
    const elems: Point[] = Array.from({ length: N }, () => ({
      x: width / 2,
      y: 0,
    }));
    const pointer: Point = { x: width / 2, y: height / 2 };
    const radm = Math.min(pointer.x, pointer.y) - 20;
    let frm = Math.random();
    let rad = 0;

    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      rad = 0;
    };
    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
    };

    window.addEventListener("pointermove", onPointerMove, false);
    window.addEventListener("resize", onResize, false);

    let raf = 0;
    const run = () => {
      raf = requestAnimationFrame(run);
      const k = scaleRef.current;

      // Lead point chases the pointer, wandering on a Lissajous curve.
      const lead = elems[0];
      const ax = (Math.cos(3 * frm) * rad * width) / height;
      const ay = (Math.sin(4 * frm) * rad * height) / width;
      lead.x += (ax + pointer.x - lead.x) / 10;
      lead.y += (ay + pointer.y - lead.y) / 10;

      // Every other segment trails the one in front of it.
      for (let i = 1; i < N; i++) {
        const e = elems[i];
        const ep = elems[i - 1];
        const a = Math.atan2(e.y - ep.y, e.x - ep.x);
        e.x += (ep.x - e.x + trailOffset(i, Math.cos(a), k)) / 4;
        e.y += (ep.y - e.y + trailOffset(i, Math.sin(a), k)) / 4;
        const s = baseSpriteScale(i) * k;
        segmentRefs.current[i]?.setAttribute(
          "transform",
          `translate(${(ep.x + e.x) / 2},${(ep.y + e.y) / 2}) rotate(${
            (180 / Math.PI) * a
          }) scale(${s},${s})`
        );
      }

      if (rad < radm) rad++;
      frm += 0.003;
      if (rad > 60) {
        pointer.x += (width / 2 - pointer.x) * 0.05;
        pointer.y += (height / 2 - pointer.y) * 0.05;
      }
    };
    run();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove, false);
      window.removeEventListener("resize", onResize, false);
    };
  }, [segmentRefs]);
}