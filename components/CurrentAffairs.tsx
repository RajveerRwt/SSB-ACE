
import React, { useState, useEffect } from 'react';
import { Newspaper, Globe, Loader2, RefreshCw, Calendar, Tag, AlertTriangle, ExternalLink, Shield, Clock } from 'lucide-react';
import { fetchDailyNews } from '../services/geminiService';
import { getCachedContent, setCachedContent } from '../services/supabaseService';

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
    
    // Generate a simple date key (YYYY-MM-DD)
    // Using simple ISO date slice is sufficient for daily rotation
    const dateKey = new Date().toISOString().split('T')[0];

    try {
      // 1. Try to fetch from Supabase Cache first
      const cachedData = await getCachedContent('NEWS', dateKey);
      
      if (cachedData && cachedData.news && cachedData.news.length > 0) {
          setNews(cachedData.news);
          setSources(cachedData.sources || []);
          setLastUpdated("Cached Data");
          setLoading(false);
          return;
      }

      // 2. If no cache, fetch from Gemini API
      const { text, groundingMetadata } = await fetchDailyNews();
      
      if (!text || text.length < 50) {
          throw new Error("Intelligence report too brief or empty.");
      }

      const blocks = text?.split('---NEWS_BLOCK---').slice(1) || [];
      const parsedNews: NewsItem[] = blocks.map((block: string) => {
          const headlineMatch = block.match(/HEADLINE:\s*(.*)/i);
          const summaryMatch = block.match(/SUMMARY:\s*(.*)/i);
          
          if (!headlineMatch || !summaryMatch) return null;

          const headline = headlineMatch[1].trim();
          const summary = summaryMatch[1].trim();

          // Reject if summary is too short or just a placeholder
          if (summary.length < 20 || summary.toLowerCase().includes("no summary available")) {
              return null;
          }

          return { 
              headline, 
              tag: block.match(/TAG:\s*(.*)/i)?.[1]?.trim() || "National", 
              summary, 
              relevance: block.match(/SSB_RELEVANCE:\s*(.*)/i)?.[1]?.trim() || "General Awareness" 
          };
      }).filter((item): item is NewsItem => item !== null);
      
      if (parsedNews.length === 0) {
          throw new Error("Failed to decode intelligence blocks. Please retry.");
      }
      
      const webSources = (groundingMetadata?.groundingChunks || [])
        .filter((c: any) => c.web?.uri)
        .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

      setNews(parsedNews);
      setSources(webSources);
      setLastUpdated(new Date().toLocaleTimeString());

      // 3. Save result to Cache only if we have a solid report (at least 3 items)
      if (parsedNews.length >= 3) {
          await setCachedContent('NEWS', dateKey, { news: parsedNews, sources: webSources });
      } else {
          console.warn("Insufficient quality news items found (found " + parsedNews.length + "), skipping cache to allow retry.");
      }

    } catch (err: any) {
      console.error("News Load Error:", err);
      setError("Secure link unstable. Unable to retrieve intelligence.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNews(); }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <header className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
         <div className="relative z-10 space-y-4">
            <span className="px-4 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-2 mx-auto w-fit">
                <Globe size={12} className="animate-pulse" /> Intelligence Update
            </span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Defense & <span className="text-blue-500">Current Affairs</span></h1>
            <p className="text-slate-400 max-w-2xl font-medium leading-relaxed text-sm md:text-base">Daily situational report on Geopolitics and National affairs for SSB Aspirants.</p>
            <div className="flex items-center justify-center gap-4 pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Calendar size={12} /> {new Date().toDateString()}</p>
                {lastUpdated && <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Clock size={12} /> Status: {lastUpdated}</p>}
            </div>
         </div>
         <Newspaper className="absolute top-1/2 -right-12 -translate-y-1/2 w-64 h-64 text-white/5 rotate-12 pointer-events-none" />
      </header>

      {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              <p className="text-slate-900 font-black uppercase tracking-[0.3em] text-xs">Uplinking to Command Intelligence...</p>
          </div>
      ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-[2rem] p-12 text-center space-y-6">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
              <h3 className="text-xl font-black text-red-900 uppercase">Link Failed</h3>
              <p className="text-red-700 font-medium text-sm">{error}</p>
              <button onClick={loadNews} className="px-8 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-xs tracking-widest">Retry Connection</button>
          </div>
      ) : (
          <section className="space-y-8" aria-label="Daily News Feed">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {news.map((item, idx) => (
                      <article key={idx} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl hover:shadow-2xl transition-all group flex flex-col justify-between h-full">
                          <div className="space-y-4">
                              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${item.tag.includes('Defense') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{item.tag}</span>
                              <h3 className="text-lg font-black text-slate-900 leading-tight">{item.headline}</h3>
                              <p className="text-xs text-slate-600 font-medium leading-relaxed">{item.summary}</p>
                          </div>
                          <footer className="mt-6 pt-6 border-t border-slate-50 bg-slate-50/50 -mx-6 -mb-6 p-6 rounded-b-[2rem]">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Lecturette & GD Relevance</p>
                              <p className="text-[10px] font-bold text-blue-900 italic">"{item.relevance}"</p>
                          </footer>
                      </article>
                  ))}
              </div>
              
              {/* Sources Section */}
              {sources.length > 0 && (
                  <div className="mt-8 p-6 bg-slate-50 rounded-[2rem] border border-slate-200">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><ExternalLink size={14}/> Sources</h4>
                      <div className="flex flex-wrap gap-2">
                          {sources.map((s: any, i: number) => (
                              <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm truncate max-w-[200px]">
                                  {s.title}
                              </a>
                          ))}
                      </div>
                  </div>
              )}
          </section>
      )}
    </div>
  );
};

export default CurrentAffairs;
