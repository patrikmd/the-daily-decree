import React, { useState, useEffect } from 'react';
import { CountrySelection } from './components/CountrySelection';
import { GameSession } from './components/GameSession';
import { initializeGame } from './services/geminiService';
import { GameState, NewspaperData, TurnHistory, Country, SaveMetadata, SaveFile } from './types';

const INDEX_KEY = 'dd_saves_index_v2';
const SAVE_PREFIX = 'dd_save_file_';

type AppView = 'MENU' | 'LOADING' | 'GAME';

interface ActiveSession {
  id: string;
  country: Country;
  data: NewspaperData;
  history: TurnHistory[];
  turnCount: number;
}

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('MENU');
  const [saves, setSaves] = useState<SaveMetadata[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  // Loading State
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("Initializing...");

  // Load saves index on mount
  useEffect(() => {
    loadSavesIndex();
  }, []);

  const loadSavesIndex = () => {
    try {
      const raw = localStorage.getItem(INDEX_KEY);
      if (raw) {
        setSaves(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Error loading saves index", e);
    }
  };

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  // --- Handlers ---

  const startNewGame = async (country: Country, leaderName?: string) => {
    setView('LOADING');
    setLoadingProgress(0);
    setLoadingStatus("Powering the Presses...");

    try {
      const initData = await initializeGame(country, leaderName, (status, progress) => {
        setLoadingStatus(status);
        setLoadingProgress(progress);
      });
      const newId = generateId();

      // Auto-save the initial state
      saveGameToStorage(newId, country, initData, [], 0, GameState.PLAYING);

      setActiveSession({
        id: newId,
        country,
        data: initData,
        history: [],
        turnCount: 0
      });
      setView('GAME');
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : String(error);
      alert(`Failed to initialize game: ${msg}`);
      setView('MENU');
    }
  };

  const loadGame = (saveId: string) => {
    try {
      const raw = localStorage.getItem(SAVE_PREFIX + saveId);
      if (!raw) {
        throw new Error("Save file not found");
      }
      const file: SaveFile = JSON.parse(raw);

      // Sanitization for legacy saves
      if (!file.data.diplomacy) {
        file.data.diplomacy = {};
      }

      setActiveSession({
        id: file.metadata.id,
        country: file.selectedCountry,
        data: file.data,
        history: file.history,
        turnCount: file.turnCount
      });
      setView('GAME');
    } catch (e) {
      console.error("Load failed", e);
      alert("Failed to load save file.");
      setView('MENU');
    }
  };

  const saveGameToStorage = (
    id: string,
    country: Country,
    data: NewspaperData,
    history: TurnHistory[],
    turnCount: number,
    gameState: GameState
  ): SaveFile | null => {
    try {
      const leaderChar = data.characters.find(c =>
        c.role.toLowerCase().includes('president') ||
        c.role.toLowerCase().includes('prime minister') ||
        c.role.toLowerCase().includes('chancellor')
      );
      const leaderName = leaderChar ? leaderChar.name : "Unknown Leader";

      const metadata: SaveMetadata = {
        id,
        name: `${country} Campaign`,
        leaderName,
        country,
        turnCount,
        timestamp: Date.now()
      };

      const file: SaveFile = {
        metadata,
        gameState,
        data,
        history,
        turnCount,
        selectedCountry: country
      };

      // Persist to storage
      localStorage.setItem(SAVE_PREFIX + id, JSON.stringify(file));

      // Update Index
      const existingSaves = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
      const filtered = existingSaves.filter((s: SaveMetadata) => s.id !== id);
      const newIndex = [...filtered, metadata];
      localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));

      setSaves(newIndex);
      return file;
    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to save game. Storage might be full.");
      return null;
    }
  };

  const handleGameSessionSave = (data: NewspaperData, history: TurnHistory[], turnCount: number, gameState: GameState) => {
    if (activeSession) {
      saveGameToStorage(activeSession.id, activeSession.country, data, history, turnCount, gameState);
    }
  };

  const handleGameSessionExport = (data: NewspaperData, history: TurnHistory[], turnCount: number, gameState: GameState) => {
    if (!activeSession) return;
    const file = saveGameToStorage(activeSession.id, activeSession.country, data, history, turnCount, gameState);
    if (!file) return;

    const fileData = JSON.stringify(file, null, 2);
    const blob = new Blob([fileData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily_decree_${activeSession.country.toLowerCase()}_${activeSession.id.substring(0, 6)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExitGame = () => {
    setActiveSession(null);
    setView('MENU');
  };

  const deleteSave = (saveId: string) => {
    if (!window.confirm("Are you sure you want to delete this archive?")) return;
    try {
      localStorage.removeItem(SAVE_PREFIX + saveId);
      const newIndex = saves.filter(s => s.id !== saveId);
      localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));
      setSaves(newIndex);
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const handleImportGame = (file: SaveFile) => {
    try {
      const saveId = file.metadata.id;
      if (!file.data.diplomacy) file.data.diplomacy = {};

      localStorage.setItem(SAVE_PREFIX + saveId, JSON.stringify(file));

      const existingSaves = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
      const filtered = existingSaves.filter((s: SaveMetadata) => s.id !== saveId);
      const newIndex = [...filtered, file.metadata];
      localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));

      setSaves(newIndex);
      alert("Save file imported successfully!");
    } catch (e) {
      console.error("Import save failed", e);
      alert("Failed to store imported save file.");
    }
  };

  // --- Rendering ---

  if (view === 'LOADING') {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center text-stone-100 font-newspaper-name">
        <div className="animate-pulse text-4xl mb-6">The Daily Decree</div>

        <div className="w-96 bg-stone-800 h-4 rounded-full overflow-hidden border border-stone-600 mb-4">
          <div
            className="h-full bg-orange-700 transition-all duration-500 ease-out"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>

        <div className="font-mono text-stone-400 text-lg">{loadingStatus} (v1.1)</div>
        <div className="font-mono text-xs mt-2 text-stone-600">{loadingProgress}%</div>
      </div>
    );
  }

  if (view === 'GAME' && activeSession) {
    return (
      <GameSession
        sessionId={activeSession.id}
        initialData={activeSession.data}
        initialHistory={activeSession.history}
        initialTurnCount={activeSession.turnCount}
        country={activeSession.country}
        onExit={handleExitGame}
        onSave={handleGameSessionSave}
        onExport={handleGameSessionExport}
      />
    );
  }

  // Default: MENU
  return (
    <CountrySelection
      onSelect={startNewGame}
      onLoadGame={loadGame}
      saves={saves}
      onDeleteSave={deleteSave}
      onImportGame={handleImportGame}
    />
  );
};

export default App;