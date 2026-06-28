// Toast — a game-styled notification banner (success / error) that slides in at
// the top of the screen, replacing the browser's default alert(). Rendered
// OUTSIDE <Stage> so its position:fixed is relative to the viewport. Success
// toasts auto-dismiss; error toasts stay until the user closes them.

import { useEffect, useRef } from 'react';

export default function Toast({ toast, onClose }) {
  // Keep the latest onClose without making it a timer dependency (so the
  // auto-dismiss timer isn't reset by unrelated parent re-renders). The ref is
  // updated in an effect, never during render.
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!toast || toast.type === 'error') return; // errors wait for a manual close
    const id = setTimeout(() => closeRef.current?.(), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  if (!toast) return null;
  const { type = 'success', title, lines = [] } = toast;

  return (
    <div className="toast-wrap">
      <div className={`toast toast--${type}`} role="status">
        <span className="toast-icon">{type === 'error' ? '⚠' : '✓'}</span>
        <div className="toast-body">
          <div className="toast-title">{title}</div>
          {lines.length > 0 && (
            <ul className="toast-lines">
              {lines.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          )}
        </div>
        <button className="toast-x" onClick={onClose} aria-label="Dismiss">×</button>
      </div>
    </div>
  );
}
