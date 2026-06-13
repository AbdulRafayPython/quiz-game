import { useEffect, useRef, useState } from 'react';
import { isMusicEnabled, getMusicVolume, setMusicEnabled, setMusicVolume, playSound } from '../lib/sound';

// Floating sound-settings control: a gear button that opens a small panel to
// toggle the background music on/off and set its volume. State is read from and
// written to the sound layer (which persists it to localStorage), so it survives
// navigation and reloads.
export default function SoundSettings() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(isMusicEnabled());
  const [volume, setVolume] = useState(getMusicVolume());
  const ref = useRef(null);

  // Close the panel on an outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const toggleEnabled = () => {
    playSound('click');
    const v = !enabled;
    setEnabled(v);
    setMusicEnabled(v);
  };
  const onVolume = (e) => {
    const v = Number(e.target.value) / 100;
    setVolume(v);
    setMusicVolume(v);
  };

  const pct = Math.round(volume * 100);

  return (
    <div className="snd-settings" ref={ref}>
      <button className="snd-btn" onClick={() => { playSound('click'); setOpen((o) => !o); }} aria-label="Sound settings" aria-expanded={open}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>

      {open && (
        <div className="snd-panel" role="dialog" aria-label="Sound settings">
          <div className="snd-title">Sound</div>

          <div className="snd-row">
            <span>Background Music</span>
            <button className={`snd-switch${enabled ? ' on' : ''}`} onClick={toggleEnabled}
              role="switch" aria-checked={enabled} aria-label="Toggle background music">
              <span className="snd-knob" />
            </button>
          </div>

          <div className="snd-row snd-col">
            <span>Volume <b>{pct}%</b></span>
            <input className="snd-slider" type="range" min="0" max="100" value={pct}
              onChange={onVolume} disabled={!enabled} aria-label="Music volume" />
          </div>
        </div>
      )}
    </div>
  );
}
