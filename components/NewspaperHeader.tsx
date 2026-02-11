import React from 'react';

interface Props {
  name: string;
  date: string;
  issueNumber: number;
}

export const NewspaperHeader: React.FC<Props> = ({ name, date, issueNumber }) => {
  return (
    <header className="border-b-4 border-black mb-4 pb-4 text-center select-none">
      <div className="flex justify-between items-end text-xs sm:text-sm font-sans font-bold uppercase tracking-widest border-b-2 border-black mb-2 pb-1">
        <span>Vol. {Math.floor(issueNumber / 12) + 1} No. {issueNumber % 12 || 12}</span>
        <span>{date}</span>
        <span>Price: 50¢</span>
      </div>
      <h1 className="font-newspaper-name text-4xl sm:text-6xl md:text-8xl leading-none mb-2 text-black drop-shadow-sm">
        {name || "The Daily Chronicle"}
      </h1>
      <div className="flex justify-center items-center gap-4 text-xs font-serif italic border-t border-black pt-1">
        <span>"Truth in Darkness"</span>
        <span>•</span>
        <span>Established 1901</span>
        <span>•</span>
        <span>Late Edition</span>
      </div>
    </header>
  );
};