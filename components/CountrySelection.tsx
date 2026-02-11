import React, { useState, useEffect } from 'react';
import { Country, SaveMetadata, SaveFile } from '../types';

interface Props {
  onSelect: (country: Country, leaderName?: string) => void;
  onLoadGame: (saveId: string) => void;
  saves: SaveMetadata[];
  onDeleteSave: (saveId: string) => void;
  onImportGame: (file: SaveFile) => void;
}

export const CountrySelection: React.FC<Props> = ({ onSelect, onLoadGame, saves, onDeleteSave, onImportGame }) => {
  const [leaderName, setLeaderName] = useState('');
  const [useCustomName, setUseCustomName] = useState(false);
  const [view, setView] = useState<'new' | 'load'>('new');

  const handleSelect = (country: Country) => {
    onSelect(country, useCustomName && leaderName.trim() ? leaderName.trim() : undefined);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content) as SaveFile;
        // Basic validation
        if (!parsed.metadata || !parsed.data || !parsed.history) {
          throw new Error("Invalid save file structure");
        }
        onImportGame(parsed);
      } catch (error) {
        console.error("Import failed", error);
        alert("Failed to import save file. It may be corrupted or invalid.");
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = ''; 
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString();

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center mb-8">
        <h1 className="font-newspaper-name text-5xl md:text-7xl text-stone-100 mb-4 uppercase tracking-tight">The Daily Decree</h1>
        <p className="font-body text-xl text-stone-400">Select a nation to lead. Your decisions will shape history.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setView('new')}
          className={`px-6 py-2 uppercase font-bold tracking-widest text-sm transition-all border-b-2 ${view === 'new' ? 'text-white border-blue-500' : 'text-stone-500 border-transparent hover:text-stone-300'}`}
        >
          New Game
        </button>
        <button 
          onClick={() => setView('load')}
          className={`px-6 py-2 uppercase font-bold tracking-widest text-sm transition-all border-b-2 ${view === 'load' ? 'text-white border-blue-500' : 'text-stone-500 border-transparent hover:text-stone-300'}`}
        >
          Load Previous ({saves.length})
        </button>
      </div>

      {view === 'new' ? (
        <>
          <div className="w-full max-w-xl mb-12 bg-stone-800 p-6 rounded-lg border border-stone-700 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <label className="text-stone-300 font-sans font-bold uppercase tracking-wider text-sm">
                Leader Designation
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500 font-mono">{useCustomName ? 'MANUAL' : 'AUTO-GENERATE'}</span>
                <button 
                  onClick={() => setUseCustomName(!useCustomName)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${useCustomName ? 'bg-blue-600' : 'bg-stone-600'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useCustomName ? 'left-6' : 'left-1'}`}></div>
                </button>
              </div>
            </div>
            
            {useCustomName ? (
              <input 
                type="text" 
                placeholder="Enter your name or title..." 
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded px-4 py-3 text-stone-100 font-mono text-sm focus:outline-none focus:border-blue-500 transition-all"
              />
            ) : (
              <div className="py-3 px-4 bg-stone-900 border border-dashed border-stone-700 rounded text-stone-500 font-mono text-sm italic">
                Artificial Intelligence will designate a name...
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
            {/* USA */}
            <button 
              onClick={() => handleSelect('USA')}
              className="group relative h-64 bg-stone-800 border-2 border-stone-600 hover:border-blue-500 transition-all duration-300 flex flex-col items-center justify-center p-6 text-center overflow-hidden hover:scale-105"
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-blue-900/10 transition-colors"></div>
              <span className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">🇺🇸</span>
              <h2 className="text-2xl font-headline font-bold text-stone-100 mb-2 z-10">United States</h2>
              <p className="text-xs font-body text-stone-400 z-10">
                Leader: President<br/>
                Global Superpower
              </p>
            </button>

            {/* UK */}
            <button 
              onClick={() => handleSelect('UK')}
              className="group relative h-64 bg-stone-800 border-2 border-stone-600 hover:border-red-500 transition-all duration-300 flex flex-col items-center justify-center p-6 text-center overflow-hidden hover:scale-105"
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-red-900/10 transition-colors"></div>
              <span className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">🇬🇧</span>
              <h2 className="text-2xl font-headline font-bold text-stone-100 mb-2 z-10">United Kingdom</h2>
              <p className="text-xs font-body text-stone-400 z-10">
                Leader: Prime Minister<br/>
                Post-Imperial Transition
              </p>
            </button>

            {/* Germany */}
            <button 
              onClick={() => handleSelect('GERMANY')}
              className="group relative h-64 bg-stone-800 border-2 border-stone-600 hover:border-yellow-500 transition-all duration-300 flex flex-col items-center justify-center p-6 text-center overflow-hidden hover:scale-105"
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-yellow-900/10 transition-colors"></div>
              <span className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">🇩🇪</span>
              <h2 className="text-2xl font-headline font-bold text-stone-100 mb-2 z-10">Germany</h2>
              <p className="text-xs font-body text-stone-400 z-10">
                Leader: Chancellor<br/>
                European Engine
              </p>
            </button>
          </div>
        </>
      ) : (
        <div className="w-full max-w-4xl bg-stone-800 border border-stone-700 rounded-lg p-6 min-h-[400px]">
          <div className="mb-4 flex justify-end">
            <label className="cursor-pointer bg-stone-700 hover:bg-stone-600 text-stone-200 px-4 py-2 rounded font-bold uppercase text-xs tracking-wide transition-colors flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Import Save File
              <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
            </label>
          </div>

          {saves.length === 0 ? (
            <div className="text-center text-stone-500 mt-20">
              <p className="font-mono text-lg mb-2">No Archives Found</p>
              <p className="text-sm">Start a new game or Import a file.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {saves.sort((a,b) => b.timestamp - a.timestamp).map((save) => (
                <div key={save.id} className="bg-stone-900 border border-stone-700 p-4 rounded flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-stone-500 transition-all">
                  <div className="text-left flex-1">
                    <h3 className="text-stone-100 font-headline font-bold text-xl">{save.name}</h3>
                    <div className="text-stone-400 font-mono text-xs mt-1 flex gap-4">
                      <span>{save.country}</span>
                      <span>Turn {save.turnCount}</span>
                      <span>Leader: {save.leaderName || 'Unknown'}</span>
                    </div>
                    <div className="text-stone-600 text-[10px] mt-1">
                      Saved: {formatDate(save.timestamp)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onLoadGame(save.id)}
                      className="bg-blue-900 hover:bg-blue-800 text-blue-100 px-6 py-2 rounded font-bold text-sm uppercase tracking-wide transition-colors"
                    >
                      Load
                    </button>
                    <button 
                      onClick={() => onDeleteSave(save.id)}
                      className="bg-stone-800 hover:bg-red-900/50 text-stone-400 hover:text-red-300 px-3 py-2 rounded transition-colors"
                      title="Delete Save"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};