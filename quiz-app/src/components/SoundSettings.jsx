import { useEffect, useRef, useState } from 'react';
import {
  isMusicEnabled,
  getMusicVolume,
  setMusicEnabled,
  setMusicVolume,
  getCueVolume,
  setCueVolume,
  playSound,
} from '../lib/sound';

// ---------------------------------------------------------------------------
// Metadata for each cue — human-readable label and which group it belongs to.
// Groups appear in the order defined in GROUPS below.
// ---------------------------------------------------------------------------
const CUE_META = {
  correct:  { label: 'Correct Answer',   group: 'Game Events' },
  wrong:    { label: 'Wrong / Timeout',  group: 'Game Events' },
  audience: { label: 'Ask the Audience', group: 'Lifelines'   },
  friend:   { label: 'Phone a Friend',   group: 'Lifelines'   },
  click:    { label: 'Button Clicks',    group: 'UI'          },
};

const GROUPS = ['Game Events', 'Lifelines', 'UI'];

// Seed local React state from the sound layer (which already applied localStorage).
function buildInitialCueVolumes() {
  return Object.fromEntries(
    Object.keys(CUE_META).map((id) => [id, getCueVolume(id)])
  );
}

// ---------------------------------------------------------------------------
// Reusable volume row: label + percentage + range slider
// ---------------------------------------------------------------------------
function VolumeRow({ label, pct, onChange, disabled = false, ariaLabel }) {
  return (
    <div className="snd-row snd-col">
      <span>
        {label} <b>{pct}%</b>
      </span>
      <input
        className="snd-slider"
        type="range"
        min="0"
        max="100"
        value={pct}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel ?? label}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function SoundSettings() {
  const [open,    setOpen]    = useState(false);
  const [tab,     setTab]     = useState('master');     // 'master' | 'individual'
  const [enabled, setEnabled] = useState(isMusicEnabled);
  const [volume,  setVolume]  = useState(getMusicVolume);
  const [cueVols, setCueVols] = useState(buildInitialCueVolumes);
  const ref = useRef(null);

  // Close the panel on an outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown',   onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown',   onKey);
    };
  }, [open]);

  // ---- handlers -------------------------------------------------------------
  const toggleEnabled = () => {
    playSound('click');
    const next = !enabled;
    setEnabled(next);
    setMusicEnabled(next);
  };

  const onMasterVolume = (e) => {
    const v = Number(e.target.value) / 100;
    setVolume(v);
    setMusicVolume(v);
  };

  const onCueVolume = (id) => (e) => {
    const v = Number(e.target.value) / 100;
    setCueVols((prev) => ({ ...prev, [id]: v }));
    setCueVolume(id, v);
  };

  const masterPct = Math.round(volume * 100);

  // ---- render ---------------------------------------------------------------
  return (
    <div className="snd-settings" ref={ref}>

      {/* Gear button */}
      <button
        className="snd-btn"
        onClick={() => { playSound('click'); setOpen((o) => !o); }}
        aria-label="Sound settings"
        aria-expanded={open}
      >
        <svg
          viewBox="0 0 24 24" width="18" height="18"
          fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06
            a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09
            A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83
            l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09
            A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83
            l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09
            a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83
            l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4
            h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>

      {/* Settings panel */}
      {open && (
        <div className="snd-panel" role="dialog" aria-label="Sound settings">
          <div className="snd-title">Sound</div>

          {/* Tab bar */}
          <div className="snd-tabs" role="tablist">
            <button
              className={`snd-tab${tab === 'master' ? ' active' : ''}`}
              role="tab"
              aria-selected={tab === 'master'}
              onClick={() => setTab('master')}
            >
              Master
            </button>
            <button
              className={`snd-tab${tab === 'individual' ? ' active' : ''}`}
              role="tab"
              aria-selected={tab === 'individual'}
              onClick={() => setTab('individual')}
            >
              Individual
            </button>
          </div>

          {/* ---- Master tab ---- */}
          {tab === 'master' && (
            <div role="tabpanel">
              {/* Music on/off toggle */}
              <div className="snd-row">
                <span>Background Music</span>
                <button
                  className={`snd-switch${enabled ? ' on' : ''}`}
                  role="switch"
                  aria-checked={enabled}
                  aria-label="Toggle background music"
                  onClick={toggleEnabled}
                >
                  <span className="snd-knob" />
                </button>
              </div>

              {/* Master music volume */}
              <VolumeRow
                label="Music Volume"
                pct={masterPct}
                onChange={onMasterVolume}
                disabled={!enabled}
                ariaLabel="Music volume"
              />
            </div>
          )}

          {/* ---- Individual tab ---- */}
          {tab === 'individual' && (
            <div className="snd-individual" role="tabpanel">
              {GROUPS.map((group) => {
                // All cues that belong to this group.
                const ids = Object.entries(CUE_META)
                  .filter(([, meta]) => meta.group === group)
                  .map(([id]) => id);

                return (
                  <div key={group} className="snd-group">
                    <div className="snd-group-label">{group}</div>
                    {ids.map((id) => (
                      <VolumeRow
                        key={id}
                        label={CUE_META[id].label}
                        pct={Math.round((cueVols[id] ?? 1) * 100)}
                        onChange={onCueVolume(id)}
                        ariaLabel={`${CUE_META[id].label} volume`}
                      />
                    ))}
                  </div>
                );
              })}

              {/* Note: background tracks (menu, setup, select, game, results)
                  are controlled by Master volume above, not individual cue sliders. */}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/*
  CSS to add wherever your .snd-* classes live
  ─────────────────────────────────────────────
  .snd-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 10px;
  }
  .snd-tab {
    flex: 1;
    padding: 4px 0;
    border: 1px solid #444;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 0.8rem;
    transition: background 0.15s, border-color 0.15s;
  }
  .snd-tab.active {
    background: rgba(255,255,255,0.13);
    border-color: rgba(255,255,255,0.4);
  }
  .snd-group {
    margin-bottom: 10px;
  }
  .snd-group-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.55;
    margin-bottom: 4px;
  }
  .snd-individual {
    max-height: 240px;
    overflow-y: auto;
  }
*/