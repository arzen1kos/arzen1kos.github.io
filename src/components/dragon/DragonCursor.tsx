import { useId, useRef } from "react";
import DragonSprites from "./DragonSprites";
import { SEGMENT_COUNT, segmentKind } from "./dragonMath";
import { useDragonAnimation } from "./useDragonAnimation";
import "./dragon-cursor.css";

export interface DragonCursorProps {
  /**
   * Size multiplier for the whole dragon. 1 = original size, 0.5 = half,
   * 2 = double. Body spacing and sprite size scale together, so the
   * proportions and the motion stay the same.
   */
  scale?: number;
  /** Extra class names for the <svg> element. */
  className?: string;
}

export default function DragonCursor({
  scale = 1,
  className = "",
}: DragonCursorProps) {
  // Unique per instance so gradient/sprite ids never clash; colons are
  // stripped because they are awkward inside url(#...) references.
  const uid = "dragon-" + useId().replace(/:/g, "");
  const segmentRefs = useRef<(SVGUseElement | null)[]>([]);

  useDragonAnimation(segmentRefs, scale);

  // Original code prepended each <use>, so the head (i = 1) ends up on top
  // and the tail at the bottom. Render in reverse index order to match.
  const order: number[] = [];
  for (let i = SEGMENT_COUNT - 1; i >= 1; i--) order.push(i);

  return (
    <svg className={`dragon-cursor ${className}`.trim()} aria-hidden="true">
      <DragonSprites idPrefix={uid} />
      <g>
        {order.map((i) => (
          <use
            key={i}
            href={`#${uid}-${segmentKind(i)}`}
            ref={(el) => {
              segmentRefs.current[i] = el;
            }}
          />
        ))}
      </g>
    </svg>
  );
}