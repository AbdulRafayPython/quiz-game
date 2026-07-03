import { useLayoutEffect, useRef, useState } from 'react';

// FitBox — fits its content inside a fixed w×h box by shrinking the font size
// (never above `max`) until the text fits, allowing word-wrap. Used for gameplay
// option text so long answers ("Natural Language Processing") never spill past
// the option diamond. `padX`/`padY` inset keeps text off the diamond's chevrons.
//
// Measuring uses scrollHeight/scrollWidth, which are layout metrics unaffected by
// the parent Stage's CSS transform — so it works while the stage is scaled.
export default function FitBox({
  x, y, w, h,
  padX = 46, padY = 8,
  max = 24, min = 11,
  color,
  fitKey,
  children,
}) {
  const ref = useRef(null);
  const [size, setSize] = useState(max);
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let s = max;
    el.style.fontSize = `${s}px`;
    while (s > min && (el.scrollHeight > innerH || el.scrollWidth > innerW + 1)) {
      s -= 1;
      el.style.fontSize = `${s}px`;
    }
    setSize(s);
  }, [fitKey, innerW, innerH, max, min]);

  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', pointerEvents: 'none', color,
    }}>
      <div ref={ref} style={{
        width: innerW, fontSize: size, lineHeight: 1.16, textAlign: 'center',
        whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'break-word',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', columnGap: 6,
      }}>
        {children}
      </div>
    </div>
  );
}
