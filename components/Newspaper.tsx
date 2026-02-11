import React from 'react';
import { NewspaperData, MarketItem, NewspaperStory } from '../types';
import { NewspaperHeader } from './NewspaperHeader';

interface Props {
  data: NewspaperData;
}

// Sub-component for a single Sheet/Page look
const NewspaperSheet: React.FC<{ children: React.ReactNode; pageNum: number; className?: string }> = ({ children, pageNum, className = "" }) => (
  <article className={`bg-[#f4f1ea] text-stone-900 p-6 md:p-10 max-w-5xl mx-auto shadow-2xl relative min-h-[1000px] border border-stone-300 mb-8 ${className}`}>
    <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] z-10 mix-blend-multiply"></div>
    
    <div className="relative z-0 h-full flex flex-col">
       {/* Small Page Number Header */}
       <div className="flex justify-between border-b border-stone-400 pb-1 mb-6 text-[10px] uppercase font-sans font-bold text-stone-500">
          <span>{new Date().toDateString()}</span>
          <span>Page {pageNum}</span>
       </div>
       {children}
    </div>
  </article>
);

// Helper for formatted paragraphs
const ArticleContent: React.FC<{ content: string; dropCap?: boolean; className?: string }> = ({ content, dropCap, className = "" }) => {
  const paragraphs = content ? content.replace(/\\n/g, '\n').split(/\n\s*\n/).filter(p => p.trim().length > 0) : [];
  
  return (
    <div className={`font-body leading-relaxed text-justify text-stone-900 ${className}`}>
      {paragraphs.map((para, i) => {
        if (i === 0 && dropCap) {
          const firstLetter = para.charAt(0);
          const restOfPara = para.slice(1);
          return (
            <p key={i} className="mb-4">
              <span className="float-left text-7xl font-bold font-newspaper-name leading-[0.65] mr-3 mt-2 mb-1">
                {firstLetter}
              </span>
              {restOfPara}
            </p>
          );
        }
        return <p key={i} className="mb-4">{para}</p>;
      })}
    </div>
  );
};

// Component for a standard article
const StandardStory: React.FC<{ story: NewspaperStory; large?: boolean }> = ({ story, large }) => (
  <div className="mb-8 last:mb-0">
    <div className="border-b border-stone-800 mb-2 pb-1">
        {story.category && <span className="text-[10px] font-sans font-bold uppercase bg-stone-800 text-stone-100 px-1 mr-2">{story.category}</span>}
        <h3 className={`${large ? 'text-4xl' : 'text-2xl'} font-headline font-bold leading-tight`}>{story.headline}</h3>
    </div>
    {story.subhead && <p className="text-lg italic text-stone-600 mb-3 leading-tight">{story.subhead}</p>}
    <div className="flex justify-between items-center mb-2">
       {story.author && <span className="text-[10px] font-sans uppercase font-bold text-stone-500">By {story.author}</span>}
    </div>
    <ArticleContent content={story.content} />
  </div>
);

// Market Data Table
const MarketTable: React.FC<{ title: string; items: MarketItem[] }> = ({ title, items }) => (
  <div className="border border-stone-400 bg-stone-200/30 p-4 mb-4">
    <h4 className="font-sans font-black text-xs uppercase mb-2 border-b-2 border-stone-500 pb-1 tracking-wider">{title}</h4>
    <table className="w-full text-xs font-mono">
      <tbody>
        {items.map((item, idx) => (
          <tr key={idx} className="border-b border-stone-300 last:border-0">
            <td className="py-1 font-bold">{item.name}</td>
            <td className="py-1 text-right">{item.value}</td>
            <td className={`py-1 text-right font-bold ${item.trend === 'up' ? 'text-green-800' : item.trend === 'down' ? 'text-red-800' : 'text-stone-600'}`}>
              {item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '▬'} {item.change}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const Newspaper: React.FC<Props> = ({ data }) => {
  const imageUrl = data.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(data.mainStory.visualPrompt || 'news')}/800/450`;

  return (
    <div className="flex flex-col gap-8">
      
      {/* --- PAGE 1: FRONT PAGE --- */}
      <NewspaperSheet pageNum={1}>
        <NewspaperHeader 
          name={data.newspaperName} 
          date={data.issueDate} 
          issueNumber={data.issueNumber} 
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          {/* Main Story (8 cols) */}
          <div className="lg:col-span-8 border-r border-stone-400 pr-0 lg:pr-8">
            <div className="mb-6 text-center">
              <h2 className="font-headline text-5xl md:text-7xl font-black leading-[0.9] mb-3 text-black uppercase tracking-tight">
                {data.mainStory.headline}
              </h2>
              {data.mainStory.subhead && (
                <h3 className="font-body text-xl md:text-2xl italic text-stone-700 font-light px-4 leading-tight">
                  {data.mainStory.subhead}
                </h3>
              )}
            </div>

            <div className="mb-6 relative border-b-2 border-stone-800 pb-1">
               <img 
                 src={imageUrl} 
                 alt={data.mainStory.visualPrompt} 
                 className="w-full h-auto object-cover grayscale contrast-110 brightness-90 sepia-[.2] shadow-sm border border-stone-900"
               />
            </div>

            <div className="flex justify-between items-center border-b border-black mb-4 pb-1">
               <span className="font-sans text-xs font-bold uppercase tracking-widest">
                  By {data.mainStory.author || "Staff Writer"}
               </span>
               <span className="font-sans text-[10px] uppercase text-stone-500">
                  Capital City Bureau
               </span>
            </div>

            <ArticleContent content={data.mainStory.content} dropCap className="md:columns-2 gap-6" />
          </div>

          {/* Sidebar: Editorial (4 cols) */}
          <div className="lg:col-span-4 flex flex-col h-full">
             <div className="bg-stone-200 p-4 border border-stone-400 mb-6">
               <h3 className="font-sans font-black uppercase text-sm tracking-widest text-center border-b border-stone-400 pb-2 mb-2">From The Editor</h3>
               <h4 className="font-headline text-2xl font-bold italic mb-2">{data.editorial.headline}</h4>
               <ArticleContent content={data.editorial.content} className="text-sm" />
               <p className="text-right font-sans font-bold text-xs mt-2">— {data.editorial.author || "Ed."}</p>
             </div>
             
             {/* Filler / Teaser */}
             <div className="mt-auto border-t-2 border-double border-black pt-2">
                <p className="font-sans text-xs font-bold uppercase text-center mb-1">In This Issue</p>
                <ul className="text-sm font-serif list-disc pl-5">
                  <li>World News ................... Pg 2</li>
                  <li>Local Events ................... Pg 2</li>
                  <li>Market Watch ................ Pg 3</li>
                </ul>
             </div>
          </div>
        </div>
      </NewspaperSheet>


      {/* --- PAGE 2: WORLD & LOCAL --- */}
      <NewspaperSheet pageNum={2}>
        <div className="border-b-4 border-black mb-6">
          <h2 className="font-sans font-black text-3xl uppercase tracking-widest text-center">World & Nation</h2>
        </div>

        <div className="flex flex-col gap-8 h-full">
          {/* International Section */}
          <div>
            <div className="flex items-center gap-4 mb-6">
              <h3 className="font-newspaper-name text-3xl whitespace-nowrap">International Report</h3>
              <div className="h-1 flex-grow bg-stone-800"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              {data.worldNews.map((story, i) => (
                <div key={i} className={i % 2 === 0 ? "md:border-r md:border-stone-300 md:pr-12" : ""}>
                   <StandardStory story={{...story, category: 'World'}} />
                </div>
              ))}
            </div>
          </div>

          {/* Local Section */}
          <div className="mt-4 pt-8 border-t-4 border-double border-stone-400">
             <div className="flex items-center gap-4 mb-6">
              <div className="h-1 flex-grow bg-stone-800"></div>
              <h3 className="font-newspaper-name text-3xl whitespace-nowrap">Local & National</h3>
              <div className="h-1 flex-grow bg-stone-800"></div>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
               {data.localNews.map((story, i) => (
                <div key={i} className={i === 0 ? "md:border-r md:border-stone-300 md:pr-12" : ""}>
                   <StandardStory story={{...story, category: 'National'}} />
                </div>
              ))}
             </div>
          </div>
        </div>
      </NewspaperSheet>


      {/* --- PAGE 3: BUSINESS & MARKETS --- */}
      <NewspaperSheet pageNum={3}>
        <div className="border-b-4 border-black mb-6">
          <h2 className="font-sans font-black text-3xl uppercase tracking-widest text-center">Business & Finance</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* Business News (8 cols) */}
           <div className="lg:col-span-8">
              {data.businessNews.map((story, i) => (
                <StandardStory key={i} story={{...story, category: 'Business'}} large={true} />
              ))}
           </div>

           {/* Market Data (4 cols) */}
           <div className="lg:col-span-4 bg-stone-100 p-4 border border-stone-300">
              <h3 className="font-headline text-2xl font-bold mb-4 text-center border-b-2 border-double border-stone-400 pb-2">Market Indicators</h3>
              
              <MarketTable title="Indices" items={data.marketData.indices} />
              <MarketTable title="Commodities" items={data.marketData.commodities} />
              <MarketTable title="Currencies" items={data.marketData.currencies} />

              <div className="mt-4 text-[10px] text-center text-stone-500 font-sans">
                Data provided by TickerTape Services Inc. Delayed by 15 mins.
              </div>
           </div>
        </div>
      </NewspaperSheet>

    </div>
  );
};