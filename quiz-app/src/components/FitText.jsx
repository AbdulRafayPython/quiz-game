import { useLayoutEffect, useRef, useState } from 'react';

/**
 * FitText — shrinks its content (never grows it) so a long value can't overflow
 * a fixed-width box. Used for scores, which can grow large or go negative and
 * otherwise spill past the scoreboard / result plates.
 *
 * Measure with scrollWidth: CSS transforms don't affect layout, so the natural
 * (unscaled) content width stays measurable even while a scale is applied — one
 * pass, no flicker (useLayoutEffect runs before paint).
 *
 *   value      the text/number to render
 *   maxWidth   available width in design px (usually the parent Box's `w`)
 *   align      'left' | 'center' | 'right' — anchors the scale + text
 */
export default function FitText({ value, maxWidth, align = 'center', style, className }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !maxWidth) return;
    const natural = el.scrollWidth;
    setScale(natural > maxWidth ? maxWidth / natural : 1);
  }, [value, maxWidth]);

  const origin = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';
  return (
    <span
      ref={ref}
      className={className}
      style={{
        display: 'inline-block',
        whiteSpace: 'nowrap',
        transform: `scale(${scale})`,
        transformOrigin: `${origin} center`,
        ...style,
      }}
    >
      {value}
    </span>
  );
}
