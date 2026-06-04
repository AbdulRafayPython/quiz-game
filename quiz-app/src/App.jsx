import { useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import ModeSelectScreen from './screens/ModeSelectScreen';
import TeamSetupScreen from './screens/TeamSetupScreen';
import QuizSelectScreen from './screens/QuizSelectScreen';
import GameplayScreen from './screens/GameplayScreen';
import ResultsScreen from './screens/ResultsScreen';
import DashboardScreen from './screens/DashboardScreen';
import CreateQuizScreen from './screens/CreateQuizScreen';
import ViewQuizzesScreen from './screens/ViewQuizzesScreen';
import './App.css';

// Dev helper: open ?s=<screen> to jump straight to a screen (with sample data)
// for visual checks. Inert in normal use (defaults to 'home').
const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const initialScreen = params.get('s') || 'home';
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
      {screen === 'home' && (
        <HomeScreen
          onStart={() => setScreen('mode-select')}
          onAdmin={() => setScreen('dashboard')}
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
        />
      )}

      {screen === 'results' && (
        <ResultsScreen teamResults={results} onRestart={handleRestart} />
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
