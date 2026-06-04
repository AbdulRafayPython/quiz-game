import { useEffect, useState } from 'react';
import './Stage.css';

export const STAGE_W = 1536;
export const STAGE_H = 1024;

/**
 * Stage renders a fixed 1536x1024 design canvas, scaled to fit the viewport
 * while preserving aspect ratio (letterboxed). Children are positioned in
 * absolute design pixels, so 1 CSS px on the stage === 1 Figma px.
 */
export default function Stage({ children, className = '' }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const onResize = () => {
      setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="stage-viewport">
      {/* Blurred, aspect-preserving fill so the letterbox bars show background
          imagery instead of black bars. Sits behind the scaled content canvas. */}
      <div className="stage-bg-fill" aria-hidden="true" />
      <div
        className={`stage ${className}`}
        style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
