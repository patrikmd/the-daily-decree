import React, { useState, useEffect } from 'react';
import { GameState, RecommendedAction, AdvisorOpinion } from '../types';

interface Props {
  gameState: GameState;
  recommendedActions: RecommendedAction[];
  onActionSubmit: (action: string) => void;
  onRestart: () => void;
  onSave: () => void;
  onExport: () => void;
  onOpenArchives: () => void;
  gameOverReason?: string;
  onConsult: (question: string) => void;
  advisorOpinions: AdvisorOpinion[];
  isConsulting: boolean;
  externalActionOverride?: string;
}

export const ControlPanel: React.FC<Props> = ({ 
  gameState, 
  recommendedActions, 
  onActionSubmit, 
  onRestart, 
  onSave, 
  onExport, 
  onOpenArchives, 
  gameOverReason,
  onConsult,
  advisorOpinions,
  isConsulting,
  externalActionOverride
}) => {
  const [input, setInput] = useState('');
  const [consultInput, setConsultInput] = useState('');
  const [isBriefingCollapsed, setIsBriefingCollapsed] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);

  // Update input if override provided
  useEffect(() => {
    if (externalActionOverride) {
      setInput(externalActionOverride);
    }
  }, [externalActionOverride]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onActionSubmit(input);
      setInput('');
    }
  };

  const handleRecommendSelect = (actionText: string) => {
    onActionSubmit(actionText);
    setInput('');
  };

  const handleConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (consultInput.trim()) {
      onConsult(consultInput);
      setConsultInput('');
    }
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const handleExportClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onExport();
  };
  
  const handleArchivesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenArchives();
  };

  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="fixed bottom-0 left-0 w-full bg-red-900 text-white p-6 md:p-8 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] text-center border-t-4 border-red-950 max-h-[50vh] overflow-y-auto">
        <h2 className="text-2xl md:text-4xl font-headline mb-2 md:mb-4">Regime Collapsed</h2>
        <p className="font-body text-sm md:text-xl mb-4 md:mb-6 max-w-2xl mx-auto">{gameOverReason || "The country has fallen into chaos."}</p>
        <button 
          type="button"
          onClick={onRestart}
          className="bg-white text-red-900 px-6 md:px-8 py-2 md:py-3 font-bold font-sans uppercase tracking-widest hover:bg-stone-200 transition-colors text-sm md:text-base"
        >
          Start New Regime
        </button>
      </div>
    );
  }

  const isLoading = gameState === GameState.LOADING;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-stone-900/95 backdrop-blur-md text-stone-100 p-2 md:p-4 z-40 border-t border-stone-700 shadow-[0_-5px_30px_rgba(0,0,0,0.5)] max-h-[85vh] overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        
        {/* Recommended Actions Briefing */}
        {!isLoading && recommendedActions.length > 0 && (
          <div className="mb-2 md:mb-4">
             <div className="flex items-center gap-2 mb-2">
                <div className="h-[1px] flex-grow bg-stone-700"></div>
                <button 
                  type="button"
                  onClick={() => setIsBriefingCollapsed(!isBriefingCollapsed)}
                  className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.2em] text-stone-500 whitespace-nowrap hover:text-stone-300 transition-colors flex items-center gap-2"
                >
                  Intelligence Briefing {isBriefingCollapsed ? '(Expand)' : '(Collapse)'}
                </button>
                <div className="h-[1px] flex-grow bg-stone-700"></div>
             </div>
             
             {!isBriefingCollapsed && (
               <div className="space-y-4">
                 {/* Standard Recommendations */}
                 <div className="flex md:grid md:grid-cols-3 gap-2 md:gap-3 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-hide no-scrollbar">
                    {recommendedActions.map((action, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleRecommendSelect(action.text)}
                        className="text-left bg-stone-800/50 hover:bg-stone-800 border border-stone-700 hover:border-stone-500 p-2 md:p-3 rounded transition-all group relative overflow-hidden flex-shrink-0 w-[240px] md:w-auto"
                      >
                        <div className="text-[8px] md:text-[9px] font-bold uppercase text-stone-500 mb-1 group-hover:text-stone-300">
                          MEMO: {action.recommender}
                        </div>
                        <p className="text-[10px] md:text-xs font-serif italic text-stone-300 group-hover:text-white leading-tight line-clamp-4">
                          "{action.text}"
                        </p>
                      </button>
                    ))}
                 </div>

                 {/* Ask Advisor Section */}
                 <div className="bg-stone-800/30 border border-stone-700 p-3 rounded">
                    <div className="text-[9px] uppercase font-bold text-stone-500 mb-2 tracking-wider">Cabinet Consultation</div>
                    <form onSubmit={handleConsultSubmit} className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={consultInput}
                        onChange={(e) => setConsultInput(e.target.value)}
                        disabled={isConsulting || isLoading}
                        placeholder="Ask your advisors for an opinion..."
                        className="flex-1 bg-stone-900 border border-stone-600 rounded px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-stone-400"
                      />
                      <button 
                        type="submit" 
                        disabled={isConsulting || isLoading || !consultInput.trim()}
                        className="bg-stone-700 text-stone-200 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wide hover:bg-stone-600 disabled:opacity-50"
                      >
                        {isConsulting ? "..." : "Ask"}
                      </button>
                    </form>

                    {/* Advisor Responses */}
                    {advisorOpinions.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {advisorOpinions.map((op, idx) => (
                          <div key={idx} className="bg-stone-800 p-3 rounded border border-stone-600 relative">
                             <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-700/50 rounded-l"></div>
                             <div className="flex justify-between items-start mb-1 pl-2">
                               <span className="text-[9px] font-bold uppercase text-amber-500/80 tracking-wider">{op.role}</span>
                               <span className="text-[9px] font-bold text-stone-500">{op.advisorName}</span>
                             </div>
                             <p className="pl-2 text-[11px] font-serif italic text-stone-300 leading-snug">
                               "{op.advice}"
                             </p>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
               </div>
             )}
          </div>
        )}

        {/* Input Form */}
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <div className="flex-1 w-full flex gap-2">
            <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder={isLoading ? "Pressing next issue..." : "Type custom order..."}
                className="flex-1 bg-stone-950 border border-stone-700 rounded px-3 py-2 md:px-4 md:py-3 font-mono text-xs md:text-sm focus:outline-none focus:border-stone-400 transition-all shadow-inner"
                autoFocus
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-stone-100 text-stone-900 px-4 md:px-8 py-2 md:py-3 font-bold uppercase font-sans tracking-widest hover:bg-white disabled:opacity-30 transition-all shadow-lg text-xs md:text-sm whitespace-nowrap"
              >
                {isLoading ? "..." : "Issue"}
              </button>
            </form>
            
            {/* System Buttons */}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleArchivesClick}
                disabled={isLoading}
                className="px-3 py-2 font-bold uppercase font-sans tracking-wider border border-stone-600 bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200 rounded transition-all text-[10px] md:text-xs whitespace-nowrap"
                title="View past decisions"
              >
                Archives
              </button>
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={isLoading}
                className={`px-3 py-2 font-bold uppercase font-sans tracking-wider border border-stone-600 rounded transition-all text-[10px] md:text-xs whitespace-nowrap ${saveFeedback ? 'bg-green-800 text-white border-green-700' : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'}`}
              >
                {saveFeedback ? 'Saved' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleExportClick}
                disabled={isLoading}
                className="px-3 py-2 font-bold uppercase font-sans tracking-wider border border-stone-600 bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200 rounded transition-all text-[10px] md:text-xs whitespace-nowrap"
                title="Export Game JSON"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};