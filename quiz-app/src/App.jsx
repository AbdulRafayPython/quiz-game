import { useState, useEffect } from 'react';
import { isSupabaseConfigured } from './lib/supabase';
import { getSession, getCurrentRole, signOut, onAuthChange } from './lib/api';
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
  const [authed, setAuthed] = useState(false);

  // Restore an existing Supabase session on load: skip the login screen and
  // route to the right area by role. Honours an explicit ?s= dev override.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    getSession().then(async (session) => {
      if (!active || !session) return;
      setAuthed(true);
      const role = await getCurrentRole().catch(() => 'player');
      setScreen((s) => (s.startsWith('login') ? (role === 'admin' ? 'dashboard' : 'home') : s));
    });
    const unsub = onAuthChange((session) => active && setAuthed(Boolean(session)));
    return () => { active = false; unsub(); };
  }, []);

  const handleLogout = async () => {
    await signOut();
    setAuthed(false);
    setTeams([]);
    setSelectedQuiz(null);
    setResults([]);
    setScreen('login-game');
  };

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

  const handleSelectQuiz = (category) => {
    setSelectedQuiz(category);
    setScreen('gameplay');
  };

  const handleGameplayFinish = (finalTeams) => {
    setResults(finalTeams);
    setScreen('results');
  };

  const handleRestart = () => {
    setTeams([]);
    setSelectedQuiz(null);
    setResults([]);
    setScreen('home');
  };

  const isQuickPlay = teams.length === 1 && teams[0]?.name === 'Player 1';

  return (
    <div className="app-shell">
      {isSupabaseConfigured && authed && !screen.startsWith('login') && (
        <button className="app-logout" onClick={handleLogout} aria-label="Log out">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
          </svg>
          Log out
        </button>
      )}

      {screen === 'login-game' && (
        <LoginScreen
          variant="game"
          onLogin={() => setScreen('home')}
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
          onAdmin={() => setScreen('login-admin')}
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
        />
      )}

      {screen === 'gameplay' && (
        <GameplayScreen
          quizCategory={selectedQuiz}
          initialTeams={teams}
          onFinish={handleGameplayFinish}
          initialLifelineBg={params.get('bg')}
        />
      )}

      {screen === 'results' && (
        <ResultsScreen teamResults={results} quizName={selectedQuiz?.name} onRestart={handleRestart} />
      )}

      {screen === 'dashboard' && (
        <DashboardScreen
          onExit={() => setScreen('home')}
          onCreateQuiz={() => setScreen('create-quiz')}
          onViewQuizzes={() => setScreen('view-quizzes')}
        />
      )}

      {screen === 'create-quiz' && (
        <CreateQuizScreen onBack={() => setScreen('dashboard')} />
      )}

      {screen === 'view-quizzes' && (
        <ViewQuizzesScreen
          onBack={() => setScreen('dashboard')}
          onAddNew={() => setScreen('create-quiz')}
          onEditQuiz={() => setScreen('create-quiz')}
        />
      )}
    </div>
  );
}
