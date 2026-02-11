import React from 'react';
import { TurnHistory } from '../types';

interface Props {
  history: TurnHistory[];
  isOpen: boolean;
  onClose: () => void;
}

export const ArchivesModal: React.FC<Props> = ({ history, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[#f4f1ea] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border-2 border-stone-800 relative animate-in fade-in zoom-in duration-200" 
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] z-0 mix-blend-multiply"></div>

        {/* Header */}
        <div className="relative z-10 bg-stone-900 text-stone-100 p-4 flex justify-between items-center border-b-4 border-double border-stone-600 shrink-0">
          <div>
            <h2 className="font-newspaper-name text-3xl tracking-wide leading-none">Historical Archives</h2>
            <p className="text-[10px] font-mono text-stone-400 uppercase tracking-widest mt-1">Official Government Records</p>
          </div>
          <button 
            onClick={onClose}
            className="text-stone-400 hover:text-white font-bold uppercase text-xs tracking-widest border border-stone-600 px-4 py-2 hover:bg-stone-800 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 overflow-y-auto p-6 flex-grow custom-scrollbar">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-500 italic py-12 font-serif">
              <div className="text-4xl mb-4 opacity-20">📂</div>
              <p className="text-lg">No historical records found.</p>
              <p className="text-sm">The ink is yet to dry on your first decree.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {[...history].reverse().map((turn) => (
                <div key={turn.turnNumber} className="border-b border-stone-300 pb-6 last:border-0 last:pb-0 group">
                  <div className="flex justify-between items-baseline mb-3">
                    <span className="font-sans font-black text-xs uppercase tracking-widest text-stone-500 bg-stone-200 px-2 py-1 rounded">
                      Issue #{turn.turnNumber}
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-[1fr_2fr] gap-6">
                    <div className="bg-stone-100 p-4 rounded border border-stone-200 shadow-sm relative group-hover:border-stone-300 transition-colors">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-900 rounded-l"></div>
                      <h4 className="font-sans text-[9px] font-bold uppercase text-stone-400 mb-2 tracking-wider">Executive Order</h4>
                      <p className="font-serif italic text-stone-800 leading-snug">"{turn.playerAction}"</p>
                    </div>
                    
                    <div className="py-1">
                      <h4 className="font-sans text-[9px] font-bold uppercase text-stone-400 mb-1 tracking-wider">The Morning Headline</h4>
                      <p className="font-headline text-2xl font-bold text-black leading-none mb-2 group-hover:text-stone-700 transition-colors">{turn.resultSummary}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 bg-[#e8e5de] p-3 text-center border-t border-stone-300 text-[10px] font-mono text-stone-500 uppercase shrink-0">
           Confidential • For Eyes Only
        </div>
      </div>
    </div>
  );
};