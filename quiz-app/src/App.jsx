import { useState, useEffect } from 'react';
import { isSupabaseConfigured } from './lib/supabase';
import { getSession, getCurrentRole, signOut, onAuthChange, listQuestions } from './lib/api';
import HomeScreen from './screens/HomeScreen';
import ModeSelectScreen from './screens/ModeSelectScreen';
import TeamSetupScreen from './screens/TeamSetupScreen';
import QuizSelectScreen from './screens/QuizSelectScreen';
import GameplayScreen from './screens/GameplayScreen';
import ResultsScreen from './screens/ResultsScreen';
import DashboardScreen from './screens/DashboardScreen';
import CreateQuizScreen from './screens/CreateQuizScreen';
import ViewQuizzesScreen from './screens/ViewQuizzesScreen';
import LoginScreen from './screens/LoginScreen';
import SoundSettings from './components/SoundSettings';
import {
  enterMenuMusic, enterSetupMusic, enterSelectMusic, enterGameplayMusic, enterResultsMusic,
  stopMusic, stopAllSounds, playSound,
} from './lib/sound';
import 'katex/dist/katex.min.css';
import './App.css';

// Dev helper: open ?s=<screen> to jump straight to a screen (with sample data)
// for visual checks. Inert in normal use (defaults to the game login).
const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const initialScreen = params.get('s') || 'login-game';
const SAMPLE_TEAMS = [{ name: 'Team Alpha', score: 0 }, { name: 'Team GenZ', score: 0 }];
const SAMPLE_RESULTS = [
  { name: 'Team Alpha', score: 25000 },
  { name: 'Team Millennials', score: 100 },
  { name: 'Team GenZ', score: 10000 },
  { name: 'Team GenY', score: 10000 },
];

export default function App() {
  const [screen, setScreen] = useState(initialScreen);
  const [teams, setTeams] = useState(
    initialScreen === 'gameplay' || initialScreen === 'results' ? SAMPLE_TEAMS : []
  );
  const [selectedQuiz, setSelectedQuiz] = useState(
    initialScreen === 'gameplay' ? { id: 'chemistry', name: 'Chemistry Quiz' } : null
  );
  const [results, setResults] = useState(initialScreen === 'results' ? SAMPLE_RESULTS : []);
  // Loaded questions + scoring for an admin-created quiz (null => use built-in demo set).
  const [quizData, setQuizData] = useState(null);
  // Quiz row passed to the Create/Edit screen when editing (null => create new).
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [authed, setAuthed] = useState(false);
  // While true we're still checking for a stored session — render a loader rather
  // than flashing the login screen when a valid token already exists.
  const [booting, setBooting] = useState(isSupabaseConfigured && initialScreen.startsWith('login'));

  // Restore an existing Supabase session on load: skip the login screen and
  // route to the start page. Honours an explicit ?s= dev override.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    (async () => {
      try {
        const session = await getSession();
        if (!active || !session) return;
        const role = await getCurrentRole().catch(() => null);
        if (!active) return;
        if (role === 'admin') {
          setAuthed(true);
          if (initialScreen.startsWith('login')) {
            setScreen('home'); // the screen→music effect resumes the menu theme
          }
        } else {
          // Only the admin account is allowed; drop any other (e.g. legacy) session.
          await signOut();
          if (active) setAuthed(false);
        }
      } finally {
        if (active) setBooting(false);
      }
    })();
    const unsub = onAuthChange((session) => active && setAuthed(Boolean(session)));
    return () => { active = false; unsub(); };
  }, []);

  // The music follows the player from screen to screen. Each screen owns one
  // background track; switching screens stops the previous one (so a screen's
  // music never bleeds into the next). enterX() is idempotent, so staying within
  // the same phase — e.g. home ↔ mode-select — never restarts the track.
  useEffect(() => {
    switch (screen) {
      case 'home':
      case 'mode-select': enterMenuMusic(); break;     // title theme
      case 'team-setup': enterSetupMusic(); break;     // "round-start" through setup
      case 'quiz-select': enterSelectMusic(); break;   // quiz-selection fanfare
      case 'gameplay': enterGameplayMusic(); break;    // question bed
      case 'results': enterResultsMusic(); break;      // winner music (plays once)
      default: stopMusic(); break;                     // login + admin area → silence
    }
  }, [screen]);

  const handleLogout = async () => {
    playSound('click');
    stopAllSounds();
    await signOut();
    setAuthed(false);
    setTeams([]);
    setSelectedQuiz(null);
    setResults([]);
    setScreen('login-game');
  };

  // Enter the start page. The screen→music effect picks up the menu theme.
  const goHome = () => setScreen('home');

  const handleSelectMode = (mode) => {
    if (mode === 'quick') {
      setTeams([{ name: 'Player 1', score: 0 }]);
      setScreen('quiz-select');
    } else {
      setScreen('team-setup');
    }
  };

  const handleTeamSetupPlay = (configuredTeams) => {
    setTeams(configuredTeams);
    setScreen('quiz-select');
  };

  const handleSelectQuiz = async (category) => {
    setSelectedQuiz(category);
    setQuizData(null);
    // For an admin-created quiz, load its questions + scoring/timer settings.
    if (category?.__real && isSupabaseConfigured) {
      try {
        const rows = await listQuestions(category.id);
        if (rows?.length) {
          const questions = rows.map((r) => ({
            q: r.text, options: r.options, answer: r.correct,
            round: r.round ?? 5,
            correctPoints: r.correct_points, penaltyPoints: r.penalty_points,
            image_url: r.image_url, video_url: r.video_url, poster_url: r.poster_url,
          }));
          const scoring = {};
          if (category.correct_points != null) scoring.correctPoints = category.correct_points;
          if (category.penalty_points != null) scoring.penaltyPoints = category.penalty_points;
          if (category.timer != null) scoring.timer = category.timer;
          if (category.timer_round_timer != null) scoring.timerRoundTimer = category.timer_round_timer;
          setQuizData({ questions, scoring });
        }
      } catch (e) {
        console.error('Load quiz failed:', e.message); // fall back to the demo set
      }
    }
    setScreen('gameplay');
  };

  const handleGameplayFinish = (finalTeams) => {
    setResults(finalTeams);
    setScreen('results');
  };

  const handleRestart = () => {
    setTeams([]);
    setSelectedQuiz(null);
    setQuizData(null);
    setResults([]);
    goHome();
  };

  const isQuickPlay = teams.length === 1 && teams[0]?.name === 'Player 1';

  // Still verifying a stored session — show a loader instead of the login screen.
  if (booting) {
    return (
      <div className="app-shell app-boot">
        <div className="app-boot-spinner" role="status" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {!screen.startsWith('login') && (
        <div className="app-topbar">
          <SoundSettings />
          {isSupabaseConfigured && authed && (
            <button className="app-logout" onClick={handleLogout} aria-label="Log out">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
              </svg>
              Log out
            </button>
          )}
        </div>
      )}

      {screen === 'login-game' && (
        <LoginScreen
          variant="game"
          onLogin={goHome}
          onToggle={() => setScreen('login-admin')}
        />
      )}

      {screen === 'login-admin' && (
        <LoginScreen
          variant="admin"
          onLogin={() => setScreen('dashboard')}
          onToggle={() => setScreen('login-game')}
        />
      )}

      {screen === 'home' && (
        <HomeScreen
          onStart={() => setScreen('mode-select')}
          onAdmin={() => { stopAllSounds(); setScreen('login-admin'); }}
        />
      )}

      {screen === 'mode-select' && (
        <ModeSelectScreen onSelectMode={handleSelectMode} onExit={handleRestart} />
      )}

      {screen === 'team-setup' && (
        <TeamSetupScreen onBack={() => setScreen('mode-select')} onPlay={handleTeamSetupPlay} />
      )}

      {screen === 'quiz-select' && (
        <QuizSelectScreen
          onBack={() => setScreen(isQuickPlay ? 'mode-select' : 'team-setup')}
          onSelectQuiz={handleSelectQuiz}
          teamCount={teams.length}
        />
      )}

      {screen === 'gameplay' && (
        <GameplayScreen
          quizCategory={selectedQuiz}
          initialTeams={teams}
          questions={quizData?.questions || null}
          scoring={quizData?.scoring || null}
          onFinish={handleGameplayFinish}
          initialLifelineBg={params.get('bg')}
        />
      )}

      {screen === 'results' && (
        <ResultsScreen teamResults={results} quizName={selectedQuiz?.name} onRestart={handleRestart} />
      )}

      {screen === 'dashboard' && (
        <DashboardScreen
          onExit={goHome}
          onCreateQuiz={() => { setEditingQuiz(null); setScreen('create-quiz'); }}
          onViewQuizzes={() => setScreen('view-quizzes')}
        />
      )}

      {screen === 'create-quiz' && (
        <CreateQuizScreen
          editQuiz={editingQuiz}
          onBack={() => { setEditingQuiz(null); setScreen(editingQuiz ? 'view-quizzes' : 'dashboard'); }}
        />
      )}

      {screen === 'view-quizzes' && (
        <ViewQuizzesScreen
          onBack={() => setScreen('dashboard')}
          onAddNew={() => { setEditingQuiz(null); setScreen('create-quiz'); }}
          onEditQuiz={(quiz) => { setEditingQuiz(quiz); setScreen('create-quiz'); }}
        />
      )}
    </div>
  );
}
