import { useState } from 'react';
import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import { isSupabaseConfigured } from '../lib/supabase';
import { signIn, signInOrSignUp, getCurrentRole, signOut } from '../lib/api';
import './screens.css';

const LIGHT = '#F3E1F5';

// Frame 9 "LOGIN GAME" (199:13) and Frame 7 "ADMIN PANEL" (47:59).
// Each is the stage background + a baked login panel (username/password/LOGIN
// printed in the art) + a top-right toggle tag that switches to the other login.
// Live inputs + a LOGIN hotspot are overlaid; field geometry measured from the art.
const VARIANTS = {
  game: {
    panel: 'game-login-panel.png', px: 398, py: 111, pw: 740, ph: 803,
    tagLabel: 'ADMIN PANEL', tagTextX: 1244, tagTextW: 216,
    fieldX: 545, fieldW: 480, userY: 512, passY: 646, fieldH: 56,
    loginX: 461, loginW: 610, loginY: 780, loginH: 70,
  },
  admin: {
    panel: 'admin-login-panel.png', px: 358, py: 88, pw: 800, ph: 847,
    tagLabel: 'GAME PANEL', tagTextX: 1255, tagTextW: 196,
    fieldX: 528, fieldW: 540, userY: 524, passY: 666, fieldH: 56,
    loginX: 461, loginW: 610, loginY: 780, loginH: 70,
  },
};

export default function LoginScreen({ variant = 'game', onLogin, onToggle }) {
  const v = VARIANTS[variant];
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    setError('');

    // No backend configured yet → pass-through stub so the app still works.
    if (!isSupabaseConfigured) {
      onLogin?.({ username, password });
      return;
    }
    if (!username.trim() || !password) {
      setError('Enter a username and password.');
      return;
    }

    setBusy(true);
    try {
      if (variant === 'admin') {
        // Admins must already exist (promoted via SQL); no self-register here.
        await signIn(username, password);
        const role = await getCurrentRole();
        if (role !== 'admin') {
          await signOut();
          throw new Error('This account is not an admin.');
        }
      } else {
        // Players self-register on first login.
        await signInOrSignUp(username, password, 'player');
      }
      onLogin?.({ username, password });
    } catch (err) {
      setError(err?.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  const field = (x, y, w, h, value, onChange, placeholder, type = 'text') => (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h }}>
      <input className="login-input" type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit(e)} />
    </div>
  );

  return (
    <Stage className="screen-fade">
      <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} />

      {/* Login panel art (username/password/LOGIN baked in) */}
      <Box img={A(v.panel)} x={v.px} y={v.py} w={v.pw} h={v.ph} style={{ pointerEvents: 'none' }} />

      {/* Top-right toggle tag → switch to the other login */}
      <Box img={A('panels-buttons.png')} x={1202} y={34} w={301} h={77} style={{ pointerEvents: 'none' }} />
      <Box x={v.tagTextX} y={48} w={v.tagTextW} h={47} size={32} color={LIGHT} align="center" valign="center"
        style={{ pointerEvents: 'none' }}>{v.tagLabel}</Box>
      <Box as="button" className="hot hotspot" x={1202} y={34} w={301} h={77}
        onClick={onToggle} aria-label={`Switch to ${v.tagLabel}`} style={{ borderRadius: 12 }} />

      {/* Live fields */}
      {field(v.fieldX, v.userY, v.fieldW, v.fieldH, username, setUsername, 'Username')}
      {field(v.fieldX, v.passY, v.fieldW, v.fieldH, password, setPassword, 'Password', 'password')}

      {/* LOGIN button (over the baked button) */}
      <Box as="button" className="hot hotspot" x={v.loginX} y={v.loginY} w={v.loginW} h={v.loginH}
        onClick={submit} disabled={busy} aria-label="Login" style={{ borderRadius: 12 }} />

      {/* Error message */}
      {error && (
        <Box x={v.px} y={v.py + v.ph + 6} w={v.pw} h={40} size={18} color="#ff6b6b" align="center" valign="center"
          style={{ pointerEvents: 'none' }}>
          {error}
        </Box>
      )}
    </Stage>
  );
}
