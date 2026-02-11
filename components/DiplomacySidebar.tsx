import React, { useState } from 'react';
import { ForeignCountry } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  knownCountries: Record<string, ForeignCountry>;
  onSelectCountry: (countryName: string) => void;
  selectedCountryData?: ForeignCountry;
  isLoading: boolean;
  onActionSelect: (actionText: string) => void;
}

import { COUNTRY_LIST } from '../constants';

export const DiplomacySidebar: React.FC<Props> = ({
  isOpen,
  onClose,
  knownCountries,
  onSelectCountry,
  selectedCountryData,
  isLoading,
  onActionSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCountries = COUNTRY_LIST.filter(c =>
    c.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStanceColor = (stance?: string) => {
    if (!stance) return 'text-stone-400';
    switch (stance.toLowerCase()) {
      case 'ally': return 'text-blue-400';
      case 'friendly': return 'text-green-400';
      case 'hostile': return 'text-orange-500';
      case 'war': return 'text-red-600 font-bold animate-pulse';
      case 'strained': return 'text-yellow-500';
      default: return 'text-stone-400';
    }
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full bg-stone-900 border-l border-stone-700 shadow-2xl z-50 transition-transform duration-300 transform w-80 md:w-96 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-950">
        <div>
          <h2 className="font-headline text-xl text-stone-100 uppercase tracking-widest">Diplomacy <span className="text-[9px] text-yellow-600 bg-stone-800 px-1 rounded ml-1 align-top">EXP</span></h2>
          <p className="text-[10px] text-stone-500 font-mono">United Nations Directorate</p>
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!selectedCountryData ? (
          /* List View */
          <div className="flex-1 flex flex-col p-4">
            <input
              type="text"
              placeholder="Search Nations..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 mb-4 focus:outline-none focus:border-blue-500"
            />
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredCountries.map(country => {
                const countryData = knownCountries ? knownCountries[country] : undefined;
                return (
                  <button
                    key={country}
                    onClick={() => onSelectCountry(country)}
                    disabled={isLoading}
                    className="w-full text-left px-4 py-3 bg-stone-800/50 hover:bg-stone-800 border-b border-stone-700/50 flex justify-between items-center group transition-colors"
                  >
                    <span className="text-stone-300 group-hover:text-white font-serif">{country}</span>
                    {countryData && (
                      <span className={`text-[10px] uppercase font-bold ${getStanceColor(countryData.stance)}`}>
                        {countryData.stance || 'Unknown'}
                      </span>
                    )}
                    {!countryData && (
                      <span className="text-[10px] text-stone-600 italic">Unknown</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Detail View */
          <div className="flex-1 flex flex-col p-6 overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-200">
            <button
              onClick={() => onSelectCountry('')} // Clear selection
              className="mb-4 text-xs uppercase font-bold text-stone-500 hover:text-stone-300 flex items-center gap-1"
            >
              ← Back to List
            </button>

            <div className="mb-6 pb-4 border-b border-stone-700">
              <h3 className="text-3xl font-headline text-white mb-1">{selectedCountryData.name}</h3>
              <div className={`text-sm font-bold uppercase tracking-widest ${getStanceColor(selectedCountryData.stance)}`}>
                Status: {selectedCountryData.stance || 'Unknown'}
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-stone-800 p-4 rounded border border-stone-600">
                <h4 className="text-[10px] uppercase font-bold text-stone-500 mb-1">Head of State</h4>
                <p className="text-lg font-serif text-stone-200">{selectedCountryData.leaderName || 'Unknown Leader'}</p>
                <p className="text-xs text-stone-400 italic">{selectedCountryData.governmentType || 'Unknown Govt'}</p>
              </div>

              <div className="bg-stone-800 p-4 rounded border border-stone-600">
                <h4 className="text-[10px] uppercase font-bold text-stone-500 mb-2">Intelligence Summary</h4>
                <p className="text-sm font-body text-stone-300 leading-relaxed">
                  {selectedCountryData.description || 'No intelligence available.'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs uppercase font-bold text-stone-400 mb-2 border-b border-stone-700 pb-1">Diplomatic Channels</h4>

              <button onClick={() => onActionSelect(`Send diplomatic delegation to ${selectedCountryData.name} to improve relations`)} className="w-full text-left px-4 py-3 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded text-stone-300 text-sm font-bold flex items-center gap-3 transition-colors">
                <span>🤝</span> Improve Relations
              </button>

              <button onClick={() => onActionSelect(`Propose a trade agreement with ${selectedCountryData.name}`)} className="w-full text-left px-4 py-3 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded text-stone-300 text-sm font-bold flex items-center gap-3 transition-colors">
                <span>📦</span> Propose Trade Deal
              </button>

              <button onClick={() => onActionSelect(`Form a military alliance with ${selectedCountryData.name}`)} className="w-full text-left px-4 py-3 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded text-stone-300 text-sm font-bold flex items-center gap-3 transition-colors">
                <span>🛡️</span> Request Alliance
              </button>

              <div className="h-4"></div>

              <button onClick={() => onActionSelect(`Issue a formal condemnation of ${selectedCountryData.name}`)} className="w-full text-left px-4 py-3 bg-stone-800 hover:bg-orange-900/30 border border-stone-600 hover:border-orange-700 rounded text-orange-200 text-sm font-bold flex items-center gap-3 transition-colors">
                <span>⚠️</span> Condemn Actions
              </button>

              <button onClick={() => onActionSelect(`DECLARE WAR on ${selectedCountryData.name}`)} className="w-full text-left px-4 py-3 bg-stone-800 hover:bg-red-900/40 border border-stone-600 hover:border-red-600 rounded text-red-400 text-sm font-bold flex items-center gap-3 transition-colors">
                <span>⚔️</span> Declare War
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};