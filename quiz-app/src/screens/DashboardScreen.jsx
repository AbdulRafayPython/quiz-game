import { useState } from 'react';
import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import { playSound } from '../lib/sound';
import { isSupabaseConfigured } from '../lib/supabase';
import { importQuiz } from '../lib/api';
import { importToast } from '../lib/quizImport';
import ImportModal from '../components/ImportModal';
import Toast from '../components/Toast';
import './screens.css';

// Frame "Dashboard" (47:65) — admin home
export default function DashboardScreen({ onExit, onCreateQuiz, onViewQuizzes }) {
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState(null);

  // Bulk import: create every quiz (with its questions) in the bundle.
  const handleImport = async (quizzes, warnings = []) => {
    if (!isSupabaseConfigured) {
      setToast({ type: 'error', title: 'Connect Supabase to import quizzes.' });
      return;
    }
    setImporting(true);
    let ok = 0;
    const fails = [];
    for (const q of quizzes) {
      try { await importQuiz(q); ok++; } catch (e) { fails.push(`${q.name}: ${e.message}`); }
    }
    setImporting(false);
    setShowImport(false);
    if (fails.length > 0) {
      // A real DB failure — show it (plus any auto-fixes) so it can be addressed.
      setToast({ type: 'error', title: `Imported ${ok} of ${quizzes.length} — ${fails.length} failed`, lines: [...fails, ...warnings].slice(0, 10) });
    } else {
      setToast(importToast(`Imported ${ok} quiz${ok === 1 ? '' : 'zes'}`, warnings));
    }
  };

  return (
    <>
    <Stage className="screen-fade">
      <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} />

      {/* Exit (95×88 @ 70,68) → home */}
      <Box as="button" className="hot" img={A('exit-btn-634404.png')} x={70} y={68} w={95} h={88}
        onClick={() => { playSound('click'); onExit?.(); }} aria-label="Exit" />

      {/* Import quizzes (JSON) — top-right pill */}
      <Box as="button" className="hot" x={1116} y={78} w={350} h={66}
        onClick={() => { playSound('click'); setShowImport(true); }}
        size={21} color="#9be7ff" align="center" valign="center"
        style={{
          background: 'rgba(18, 6, 44, 0.82)', border: '2px solid rgba(95, 214, 230, 0.7)',
          borderRadius: 14, boxShadow: '0 0 16px rgba(95, 214, 230, 0.28)', fontWeight: 700,
        }}>
        ⬆ Import Quizzes (JSON)
      </Box>

      {/* Logo (443×443 @ 547,184) */}
      <Box img={A('logo.png')} x={547} y={184} w={443} h={443} fit="contain" />

      {/* View Quizzes (438×223 @ 321,697) */}
      <Box as="button" className="hot" img={A('view-quizzes-btn.png')} x={321} y={697} w={438} h={223}
        onClick={() => { playSound('click'); onViewQuizzes?.(); }} aria-label="View Quizzes" />

      {/* Create Quiz (439×224 @ 774,696) */}
      <Box as="button" className="hot" img={A('create-quiz-btn.png')} x={774} y={696} w={439} h={224}
        onClick={() => { playSound('click'); onCreateQuiz?.(); }} aria-label="Create Quiz" />
    </Stage>

    {showImport && (
      <ImportModal
        title="Import Quizzes (JSON)"
        bulk
        busy={importing}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
      />
    )}

    <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
