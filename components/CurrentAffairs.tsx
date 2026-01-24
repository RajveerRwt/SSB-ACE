
import React, { useState, useEffect } from 'react';
import { Newspaper, Globe, Loader2, RefreshCw, Calendar, Tag, AlertTriangle, ExternalLink, Shield } from 'lucide-react';
import { fetchDailyNews } from '../services/geminiService';

interface NewsItem {
  headline: string;
  tag: string;
  summary: string;
  relevance: string;
}

const CurrentAffairs: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const { text, groundingMetadata } = await fetchDailyNews();
      
      // Manual Parsing of the structured text response
      // Expecting format: ---NEWS_BLOCK--- \n HEADLINE: ... \n ... \n ---END_BLOCK---
      const blocks = text?.split('---NEWS_BLOCK---').slice(1) || [];
      
      const parsedNews: NewsItem[] = blocks.map(block => {
          const headline = block.match(/HEADLINE:\s*(.*)/i)?.[1]?.trim() || "Update";
          const tag = block.match(/TAG:\s*(.*)/i)?.[1]?.trim() || "General";
          const summary = block.match(/SUMMARY:\s*(.*)/i)?.[1]?.trim() || "No summary available.";
          const relevance = block.match(/SSB_RELEVANCE:\s*(.*)/i)?.[1]?.trim() || "General Awareness";
          
          return { headline, tag, summary, relevance };
      });

      setNews(parsedNews);
      
      // Extract sources
      const groundingChunks = groundingMetadata?.groundingChunks || [];
      const webSources = groundingChunks
        .filter((c: any) => c.web?.uri)
        .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
        
      setSources(webSources);
      setLastUpdated(new Date().toLocaleTimeString());

    } catch (err: any) {
      console.error(err);
      setError("Unable to retrieve intelligence briefing. Secure link unstable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
         <div className="relative z-10 space-y-4">
            <span className="px-4 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-2 mx-auto w-fit">
                <Globe size={12} className="animate-pulse" /> Live Intelligence
            </span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Daily <span className="text-blue-500">Briefing</span></h1>
            <p className="text-slate-400 max-w-2xl font-medium leading-relaxed text-sm md:text-base">
               "Officers must be aware of the world around them. Here is your daily situational report on Defense, Geopolitics, and National affairs."
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Calendar size={12} /> {new Date().toDateString()}
                </p>
                {lastUpdated && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Clock size={12} /> Updated: {lastUpdated}
                    </p>
                )}
            </div>
         </div>
         <Newspaper className="absolute top-1/2 -right-12 -translate-y-1/2 w-64 h-64 text-white/5 rotate-12 pointer-events-none" />
      </div>

      {/* CONTENT AREA */}
      {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              <p className="text-slate-900 font-black uppercase tracking-[0.3em] text-xs">Establishing Secure Link to News Command...</p>
          </div>
      ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-[2rem] p-12 text-center space-y-6">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
              <h3 className="text-xl font-black text-red-900 uppercase">Connection Failed</h3>
              <p className="text-red-700 font-medium text-sm">{error}</p>
              <button 
                onClick={loadNews}
                className="px-8 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all flex items-center gap-2 mx-auto"
              >
                <RefreshCw size={14} /> Retry Uplink
              </button>
          </div>
      ) : (
          <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {news.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl hover:shadow-2xl transition-all group hover:-translate-y-1 flex flex-col justify-between h-full">
                          <div className="space-y-4">
                              <div className="flex justify-between items-start">
                                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                      item.tag.includes('Defense') ? 'bg-green-100 text-green-700' : 
                                      item.tag.includes('International') ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                      {item.tag}
                                  </span>
                                  <Shield size={16} className="text-slate-200 group-hover:text-yellow-400 transition-colors" />
                              </div>
                              <h3 className="text-lg font-black text-slate-900 leading-tight">
                                  {item.headline}
                              </h3>
                              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                  {item.summary}
                              </p>
                          </div>
                          
                          <div className="mt-6 pt-6 border-t border-slate-50 bg-slate-50/50 -mx-6 -mb-6 p-6 rounded-b-[2rem]">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                                  <Tag size={10} /> SSB Relevance
                              </p>
                              <p className="text-[10px] font-bold text-blue-900 italic">
                                  "{item.relevance}"
                              </p>
                          </div>
                      </div>
                  ))}
              </div>

              {/* SOURCES FOOTER */}
              {sources.length > 0 && (
                  <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                          <Globe size={14} /> Intel Sources
                      </h4>
                      <div className="flex flex-wrap gap-3">
                          {sources.map((src, i) => (
                              <a 
                                key={i} 
                                href={src.uri} 
                                target="_blank" 
                                rel="noreferrer"
                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center gap-2"
                              >
                                  {src.title} <ExternalLink size={10} />
                              </a>
                          ))}
                      </div>
                  </div>
              )}
              
              <div className="flex justify-center">
                 <button 
                    onClick={loadNews}
                    className="px-8 py-3 bg-white border-2 border-slate-100 text-slate-600 hover:border-slate-900 hover:text-slate-900 rounded-full font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2"
                 >
                    <RefreshCw size={14} /> Refresh Intel
                 </button>
              </div>
          </div>
      )}
    </div>
  );
};

function Clock({ size, className }: { size?: number, className?: string }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    )
}

export default CurrentAffairs;
