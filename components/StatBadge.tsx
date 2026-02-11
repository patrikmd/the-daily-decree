import React from 'react';
import { GameStats } from '../types';
import { Coins, Bird, Shield, Users } from 'lucide-react';

interface Props {
  label: string;
  value: number;
  icon: React.ElementType;
  color: 'emerald' | 'amber' | 'rose' | 'indigo';
}

export const StatBadge: React.FC<Props> = ({ label, value, icon: Icon, color }) => {
  // Map base colors to shades
  const colors = {
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-500', bar: 'bg-emerald-500', shadow: 'shadow-emerald-500/10' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500', bar: 'bg-amber-500', shadow: 'shadow-amber-500/10' },
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-500', bar: 'bg-rose-500', shadow: 'shadow-rose-500/10' },
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-500', bar: 'bg-indigo-500', shadow: 'shadow-indigo-500/10' },
  };

  const c = colors[color];

  return (
    <div className={`flex flex-col gap-1 p-2 md:p-3 ${c.bg} rounded-lg border ${c.border} shadow-lg ${c.shadow} flex-1 min-w-[120px] backdrop-blur-sm relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300`}>
      {/* Decorative background flare */}
      <div className={`absolute -right-2 -top-2 w-12 h-12 ${c.bar} opacity-10 blur-xl rounded-full`} />

      <div className="flex items-center justify-between gap-2 z-10">
        <Icon className={`${c.text} shrink-0 w-4 h-4 md:w-5 md:h-5`} />
        <span className="text-[10px] md:text-xs uppercase font-extrabold text-stone-400 tracking-[0.15em] whitespace-nowrap">{label}</span>
      </div>

      <div className="flex items-end justify-between gap-1 z-10">
        <span className={`text-lg md:text-2xl font-bold font-mono ${c.text} tracking-tight`}>
          {value}<span className="text-[0.6em] opacity-80 font-normal">%</span>
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-black/20 h-1 rounded-full mt-1 overflow-hidden">
        <div
          className={`h-full ${c.bar} transition-all duration-700 ease-out shadow-[0_0_8px] shadow-current`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

export const StatsBar: React.FC<{ stats: GameStats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:flex md:flex-row justify-between gap-3 w-full max-w-4xl">
      <StatBadge
        label="Economy"
        value={stats.economy}
        icon={Coins}
        color="emerald"
      />
      <StatBadge
        label="Liberty"
        value={stats.liberty}
        icon={Bird}
        color="indigo"
      />
      <StatBadge
        label="Stability"
        value={stats.stability}
        icon={Shield}
        color="amber"
      />
      <StatBadge
        label="Approval"
        value={stats.approval}
        icon={Users}
        color="rose"
      />
    </div>
  );
};