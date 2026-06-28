import { useState } from 'react';
import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import { playSound } from '../lib/sound';
import './screens.css';

// Frame 3 (31:4) — Team Setup.
// The panel art used to bake all 9 rows into the image, so it couldn't grow.
// Now the ornate frame is applied as a CSS border-image (teamsetup-panel.webp):
//   - top border  = frame top + "TEAM SETUP" title + No./TEAM NAME/ACTION header
//   - bottom border= ADD TEAM button + bottom frame
//   - side borders = the neon rails (stretch vertically with the row count)
// The centre is left empty and the rows are rendered live, so the panel height
// tracks the number of teams and ADD TEAM creates a real new slot.
//
// border-image-slice values are in SOURCE px (image is 1024×1536); the matching
// border-width values are slice × 0.7168 (the panel renders 734 wide = 1024×0.7168)
// so the frame is drawn at its native scale with no distortion.
const SCALE = 1024 / 734;            // source px per display px (~1.395)
const D = (srcPx) => srcPx / SCALE;  // source px -> display px

const PANEL_W = 734;
const PANEL_X = 401;                 // centred: (1536-734)/2 ≈ 401
const BORDER = { top: D(330), right: D(119), bottom: D(386), left: D(115) };
const ROW_H = 66;                    // per-team row height (design px pitch)
const CONTENT_W = PANEL_W - BORDER.left - BORDER.right;

// Column layout within the content box (left edge = 0).
const NUM_W = 70;                    // "No." column
const TRASH_W = 86;                  // "ACTION" column
const FIELD_FILL = 'rgb(44, 0, 72)';

const MIN_TEAMS = 1;
const MAX_TEAMS = 10;
// Beyond this many rows the list scrolls inside the panel so the ornate frame
// and the ADD TEAM button never run off the bottom of the stage.
const MAX_VISIBLE_ROWS = 7;

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
  </svg>
);

export default function TeamSetupScreen({ onBack, onPlay }) {
  const [teams, setTeams] = useState([{ name: 'Team Alpha' }, { name: 'Team GenZ' }]);

  const addTeam = () => { playSound('click'); setTeams((t) => (t.length >= MAX_TEAMS ? t : [...t, { name: '' }])); };
  const removeTeam = (i) => {
    playSound('click');
    setTeams((t) => (t.length <= MIN_TEAMS ? t : t.filter((_, idx) => idx !== i)));
  };
  const rename = (i, v) => setTeams((t) => t.map((tm, idx) => (idx === i ? { name: v } : tm)));
  const play = () => { playSound('click'); onPlay(teams.map((t) => ({ name: t.name.trim() || 'Unnamed Team', score: 0 }))); };

  const fullRowsH = teams.length * ROW_H;
  const contentH = Math.min(fullRowsH, MAX_VISIBLE_ROWS * ROW_H);
  const scrolls = fullRowsH > contentH;
  const totalH = BORDER.top + contentH + BORDER.bottom;
  const panelY = Math.max(-30, Math.round((1024 - totalH) / 2));

  return (
    <Stage className="screen-fade">
      <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} style={{ filter: 'blur(20px)' }} />

      {/* Back / Next */}
      <Box as="button" className="hot" img={A('back-btn.png')} x={0} y={-30} w={308} h={205}
        onClick={() => { playSound('click'); onBack?.(); }} aria-label="Back" />
      <Box as="button" className="hot" img={A('next-btn.png')} x={1213} y={-30} w={308} h={205}
        onClick={play} aria-label="Play" />

      {/* Dynamic panel: ornate frame via border-image, live rows in the centre */}
      <div
        className="ts-panel"
        style={{
          position: 'absolute',
          left: PANEL_X,
          top: panelY,
          width: PANEL_W,
          height: totalH,
          borderStyle: 'solid',
          borderColor: 'transparent',
          borderWidth: `${BORDER.top}px ${BORDER.right}px ${BORDER.bottom}px ${BORDER.left}px`,
          borderImageSource: `url(${A('teamsetup-panel.png')})`,
          borderImageSlice: '330 119 386 115',
          borderImageRepeat: 'stretch',
          background: 'rgb(26, 2, 48)',
          backgroundClip: 'padding-box', // keep the dark fill inside the frame, not under its transparent margins
          boxSizing: 'border-box',
        }}
      >
        {/* Content box (between the borders) holds the live rows. When there are
            more teams than fit, the rows scroll while the frame stays put. */}
        <div
          className="ts-scroll"
          style={{
            position: 'relative', width: CONTENT_W, height: contentH,
            overflowY: scrolls ? 'auto' : 'visible', overflowX: 'hidden',
          }}
        >
          <div style={{ position: 'relative', width: CONTENT_W, height: fullRowsH }}>
            {teams.map((team, i) => (
              <div key={i} className="ts-row" style={{ position: 'absolute', top: i * ROW_H, left: 0, width: CONTENT_W, height: ROW_H }}>
                {/* number */}
                <div className="ts-num" style={{ width: NUM_W }}>{i + 1}.</div>

                {/* name field */}
                <div className="ts-field" style={{ left: NUM_W, width: CONTENT_W - NUM_W - TRASH_W }}>
                  <input
                    className="team-input"
                    type="text"
                    value={team.name}
                    maxLength={16}
                    placeholder="Enter team name..."
                    onChange={(e) => rename(i, e.target.value)}
                    style={{ background: FIELD_FILL }}
                  />
                </div>

                {/* delete */}
                {teams.length > MIN_TEAMS && (
                  <button className="ts-trash"
                    onClick={() => removeTeam(i)} aria-label={`Delete team ${i + 1}`}>
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ADD TEAM hotspot — over the baked button in the bottom border */}
        {teams.length < MAX_TEAMS && (
          <button
            className="hot hotspot ts-add"
            onClick={addTeam}
            aria-label="Add team"
            style={{
              position: 'absolute',
              left: (PANEL_W - D(372)) / 2 - BORDER.left,
              top: contentH + D(19),
              width: D(372),
              height: D(84),
              borderRadius: 12,
            }}
          />
        )}
      </div>
    </Stage>
  );
}
