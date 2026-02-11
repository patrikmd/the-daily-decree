import React, { useState, useRef, useEffect } from 'react';
import { Newspaper } from './Newspaper';
import { ControlPanel } from './ControlPanel';
import { StatsBar } from './StatBadge';
import { ArchivesModal } from './ArchivesModal';
import { processTurn, getAdvisorOpinion } from '../services/geminiService';
import { GameState, NewspaperData, TurnHistory, Country, AdvisorOpinion } from '../types';

interface Props {
  sessionId: string;
  initialData: NewspaperData;
  initialHistory: TurnHistory[];
  initialTurnCount: number;
  country: Country;
  onExit: () => void;
  onSave: (data: NewspaperData, history: TurnHistory[], turnCount: number, gameState: GameState) => void;
  onExport: (data: NewspaperData, history: TurnHistory[], turnCount: number, gameState: GameState) => void;
}

export const GameSession: React.FC<Props> = ({
  sessionId,
  initialData,
  initialHistory,
  initialTurnCount,
  country,
  onExit,
  onSave,
  onExport
}) => {
  // --- Game State ---
  // Initialized once from props on mount.
  const [data, setData] = useState<NewspaperData>(initialData);
  const [history, setHistory] = useState<TurnHistory[]>(initialHistory);
  const [turnCount, setTurnCount] = useState(initialTurnCount);
  const [gameState, setGameState] = useState<GameState>(GameState.PLAYING);

  // --- UI State ---
  // These reset automatically whenever GameSession mounts (new game or load game)
  const [isArchivesOpen, setIsArchivesOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new turn if needed, or top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [turnCount]);

  // --- Handlers ---

  const handleAction = async (action: string) => {
    setGameState(GameState.LOADING);
    setAdvisorOpinions([]);
    setPrefilledAction('');

    try {
      // Optimistic/current state capture for processing
      const currentStats = data.stats;
      const currentCharacters = data.characters || [];

      const result = await processTurn(action, history, currentStats, turnCount, country, currentCharacters);


      const newHistoryItem: TurnHistory = {
        turnNumber: turnCount + 1,
        playerAction: action,
        resultSummary: result.mainStory.headline
      };

      const newHistory = [...history, newHistoryItem];
      const newTurnCount = turnCount + 1;
      const newGameState = result.gameOver ? GameState.GAME_OVER : GameState.PLAYING;

      setHistory(newHistory);
      setData(result);
      setTurnCount(newTurnCount);
      setGameState(newGameState);

    } catch (error) {
      console.error(error);
      alert(`The presses jammed! (AI Error): ${error instanceof Error ? error.message : String(error)}`);
      setGameState(GameState.PLAYING);
    }
  };

  const handleConsult = async (question: string) => {
    if (!question.trim()) return;
    setIsConsulting(true);
    try {
      const opinions = await getAdvisorOpinion(question, data, history);
      setAdvisorOpinions(opinions);
    } catch (error) {
      console.error("Consultation failed", error);
    } finally {
      setIsConsulting(false);
    }
  };

  const [isConsulting, setIsConsulting] = useState(false);
  const [advisorOpinions, setAdvisorOpinions] = useState<AdvisorOpinion[]>([]);
  const [prefilledAction, setPrefilledAction] = useState<string>('');

  // Wrapper handlers to pass state up to App
  const handleManualSave = () => {
    onSave(data, history, turnCount, gameState);
  };

  const handleExportClick = () => {
    onExport(data, history, turnCount, gameState);
  };

  const handleExitClick = () => {
    if (window.confirm("Return to main menu? Unsaved progress will be lost.")) {
      onExit();
    }
  };

  return (
    <div className="min-h-screen bg-stone-800 flex flex-col items-center pb-[280px] md:pb-48 transition-all duration-500 relative overflow-x-hidden">
      {/* Top Bar */}
      <div className="w-full bg-stone-900 text-stone-200 p-2 shadow-md z-30 sticky top-0 border-b border-stone-700">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 pr-12 md:pr-0 px-2 md:px-0">

          <div className="flex items-center gap-4 w-full md:w-auto">
            <button
              onClick={handleExitClick}
              className="bg-stone-800 hover:bg-red-900/40 text-stone-400 hover:text-red-300 border border-stone-600 hover:border-red-800 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-1"
            >
              <span>←</span> Main Menu
            </button>
            <div className="flex-grow md:flex-grow-0 w-full">
              <StatsBar stats={data.stats} />
            </div>
          </div>

          <div className="hidden md:block ml-4 text-[10px] font-mono text-stone-500 uppercase shrink-0">
            {country} Simulation | Turn {turnCount}
          </div>
        </div>

      </div>

      {/* Main Content */}
      <main className="w-full max-w-6xl px-4 py-8 flex-grow transition-all duration-300">
        <Newspaper data={data} />
      </main>

      <div ref={bottomRef} />

      {/* Control Panel */}
      <ControlPanel
        gameState={gameState}
        recommendedActions={data.recommendedActions || []}
        onActionSubmit={handleAction}
        onRestart={handleExitClick}
        onSave={handleManualSave}
        onExport={handleExportClick}
        onOpenArchives={() => setIsArchivesOpen(true)}
        gameOverReason={data.gameOverReason}
        onConsult={handleConsult}
        advisorOpinions={advisorOpinions}
        isConsulting={isConsulting}
        externalActionOverride={prefilledAction}
      />

      {/* Modals & Sidebars */}
      <ArchivesModal
        isOpen={isArchivesOpen}
        onClose={() => setIsArchivesOpen(false)}
        history={history}
      />

    </div>
  );
};