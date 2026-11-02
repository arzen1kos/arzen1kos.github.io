import { useEffect, type RefObject } from 'react';

export function useAutoScroll(ref: RefObject<HTMLDivElement | null>, resetKey: string, enabled: boolean) {
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    element.scrollTop = 0;
    const speed = 14;
    let frame = 0;
    let last = performance.now();
    let pausedUntil = last + 2500;
    let endAt = 0;
    let accumulated = 0;
    let hovering = false;

    const pause = () => { pausedUntil = performance.now() + 5000; };
    const enter = () => { hovering = true; };
    const leave = () => {
      hovering = false;
      pause();
    };
    element.addEventListener('wheel', pause, { passive: true });
    element.addEventListener('touchstart', pause, { passive: true });
    element.addEventListener('pointerenter', enter);
    element.addEventListener('pointerleave', leave);

    const tick = (now: number) => {
      const elapsed = Math.min(now - last, 64) / 1000;
      last = now;
      const maxScroll = element.scrollHeight - element.clientHeight;
      if (maxScroll > 2 && !hovering && now > pausedUntil) {
        if (element.scrollTop >= maxScroll - 1) {
          if (!endAt) endAt = now;
          if (now - endAt > 2500) {
            element.scrollTop = 0;
            endAt = 0;
            accumulated = 0;
            pausedUntil = now + 2500;
          }
        } else {
          accumulated += speed * elapsed;
          const step = Math.floor(accumulated);
          if (step > 0) {
            element.scrollTop += step;
            accumulated -= step;
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('wheel', pause);
      element.removeEventListener('touchstart', pause);
      element.removeEventListener('pointerenter', enter);
      element.removeEventListener('pointerleave', leave);
    };
  }, [enabled, ref, resetKey]);
}
