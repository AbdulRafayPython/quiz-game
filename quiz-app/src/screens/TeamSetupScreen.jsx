import { useState } from 'react';
import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import './screens.css';

// Frame 3 (31:4) — Team Setup.
// Panel art (734×1101) placed at (401,-18). The 9 printed input rows were measured
// from the panel image; live inputs are overlaid exactly on top of them.
const PANEL_X = 401;
const ROW_CENTERS = [251, 317, 383, 449, 515, 580, 646, 712, 778];
// The printed field box spans design x 549→973 (border). The live input is inset
// just inside that border and filled with the field's exact interior color
// (rgb(42,0,67)) so it covers the baked-in "Enter team name…" placeholder and
// blends seamlessly into the panel art.
const FIELD_FILL = 'rgb(44, 0, 72)';
const INPUT_X = 553;
const INPUT_W = 406;
const INPUT_H = 38;
const DEL_X = 994; // trash icon spans 997→1044 (center ~1020)
const MAX_TEAMS = 9;

export default function TeamSetupScreen({ onBack, onPlay }) {
  const [teams, setTeams] = useState([{ name: 'Team Alpha' }, { name: 'Team GenZ' }]);

  const addTeam = () => {
    if (teams.length >= MAX_TEAMS) return;
    setTeams([...teams, { name: '' }]);
  };
  const removeTeam = (i) => {
    if (teams.length <= 1) return;
    setTeams(teams.filter((_, idx) => idx !== i));
  };
  const rename = (i, v) => {
    const next = [...teams];
    next[i].name = v;
    setTeams(next);
  };
  const play = () => {
    onPlay(teams.map((t) => ({ name: t.name.trim() || 'Unnamed Team', score: 0 })));
  };

  return (
    <Stage className="screen-fade">
      <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} style={{ filter: 'blur(20px)' }} />

      {/* Back / Next */}
      <Box as="button" className="hot" img={A('back-btn.png')} x={0} y={-30} w={308} h={205}
        onClick={onBack} aria-label="Back" />
      <Box as="button" className="hot" img={A('next-btn.png')} x={1213} y={-30} w={308} h={205}
        onClick={play} aria-label="Play" />

      {/* Team Setup panel art (734×1101 @ 401,-18) */}
      <Box img={A('teamsetup-panel.png')} x={PANEL_X} y={-18} w={734} h={1101} />

      {/* Live input rows overlaid on the printed fields */}
      {ROW_CENTERS.map((cy, i) => {
        const team = teams[i];
        if (!team) return null;
        return (
          <div key={i}>
            <Box x={INPUT_X} y={cy - INPUT_H / 2} w={INPUT_W} h={INPUT_H}
              style={{ borderRadius: 9, overflow: 'hidden', background: FIELD_FILL }}>
              <input
                className="team-input"
                type="text"
                value={team.name}
                maxLength={16}
                placeholder="Enter team name..."
                onChange={(e) => rename(i, e.target.value)}
              />
            </Box>
            {teams.length > 1 && (
              <Box as="button" className="hot hotspot" x={DEL_X} y={cy - 26} w={52} h={52}
                onClick={() => removeTeam(i)} aria-label={`Delete team ${i + 1}`}
                style={{ borderRadius: 6 }} />
            )}
          </div>
        );
      })}

      {/* ADD TEAM (over the printed button) */}
      {teams.length < MAX_TEAMS && (
        <Box as="button" className="hot hotspot" x={633} y={822} w={270} h={62}
          onClick={addTeam} aria-label="Add team" style={{ borderRadius: 10 }} />
      )}
    </Stage>
  );
}
