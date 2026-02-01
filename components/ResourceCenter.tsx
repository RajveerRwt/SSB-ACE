
import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, ImageIcon, Globe, Zap, PenTool, Layout, CheckCircle, Search, Calendar, Tag, MessageSquare, Loader2, ArrowRight, Mic, Users, Timer, X, Play } from 'lucide-react';
import { fetchDailyNews, generateLecturette } from '../services/geminiService';
import { STANDARD_WAT_SET } from '../services/geminiService';

const ResourceCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'WAT' | 'TAT' | 'LECTURETTE' | 'GD' | 'BLOG'>('WAT');
  const [blogContent, setBlogContent] = useState<any[]>([]);
  const [blogLoading, setBlogLoading] = useState(false);
  
  // Lecturette State
  const [selectedLecturette, setSelectedLecturette] = useState<string | null>(null);
  const [lecturetteContent, setLecturetteContent] = useState<any>(null);
  const [loadingLecturette, setLoadingLecturette] = useState(false);
  const [lecturetteTimer, setLecturetteTimer] = useState(180);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    if (activeTab === 'BLOG' && blogContent.length === 0) {
      fetchBlogData();
    }
  }, [activeTab]);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && lecturetteTimer > 0) {
        interval = setInterval(() => setLecturetteTimer(prev => prev - 1), 1000);
    } else if (lecturetteTimer === 0) {
        setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, lecturetteTimer]);

  const fetchBlogData = async () => {
    setBlogLoading(true);
    try {
      const { text } = await fetchDailyNews();
      const blocks = text?.split('---NEWS_BLOCK---').slice(1) || [];
      const parsedNews = blocks.map(block => {
          const headline = block.match(/HEADLINE:\s*(.*)/i)?.[1]?.trim() || "Defense Update";
          const tag = block.match(/TAG:\s*(.*)/i)?.[1]?.trim() || "National";
          const summary = block.match(/SUMMARY:\s*(.*)/i)?.[1]?.trim() || "No summary available.";
          const relevance = block.match(/SSB_RELEVANCE:\s*(.*)/i)?.[1]?.trim() || "General Awareness";
          return { headline, tag, summary, relevance };
      });
      setBlogContent(parsedNews);
    } catch (e) {
      console.error("Failed to fetch blog data", e);
    } finally {
      setBlogLoading(false);
    }
  };

  const handleLecturetteClick = async (topic: string) => {
      setSelectedLecturette(topic);
      setLecturetteContent(null);
      setLoadingLecturette(true);
      setLecturetteTimer(180);
      setIsTimerRunning(false);
      
      try {
          const content = await generateLecturette(topic);
          setLecturetteContent(content);
      } catch (e) {
          console.error("Failed to gen lecturette", e);
          setLecturetteContent({
              introduction: "Error generating specific content.",
              keyPoints: ["Discuss Social Impact", "Discuss Economic Impact", "Conclusion"],
              conclusion: "Summarize your views."
          });
      } finally {
          setLoadingLecturette(false);
      }
  };

  const STATIC_WAT_DATA = STANDARD_WAT_SET.slice(0, 50).map((word, index) => ({
      word,
      response: `A meaningful sentence demonstrating OLQ for '${word}'. e.g., ${word} helps in overcoming obstacles.`
  }));

  const LECTURETTE_TOPICS = [
      { title: "Indo-US Relations", difficulty: "High", category: "International" },
      { title: "Women in Combat Roles", difficulty: "Medium", category: "Social" },
      { title: "Cyber Warfare", difficulty: "High", category: "Technology" },
      { title: "Atmanirbhar Bharat in Defense", difficulty: "Medium", category: "National" },
      { title: "Climate Change & Security", difficulty: "Low", category: "Global" },
      { title: "Role of Youth in Nation Building", difficulty: "Low", category: "Social" },
      { title: "Artificial Intelligence in Modern Warfare", difficulty: "High", category: "Tech" },
      { title: "India's Nuclear Policy", difficulty: "High", category: "Defense" },
      { title: "NEP 2020", difficulty: "Medium", category: "Education" },
      { title: "G20 Presidency Impact", difficulty: "Medium", category: "International" },
  ];

  const GD_TOPICS = [
      { title: "Impact of Social Media on Youth", category: "Social" },
      { title: "Agnipath Scheme: Pros & Cons", category: "Defense" },
      { title: "India's Role in Global Geopolitics", category: "International" },
      { title: "Electric Vehicles: Future of Transport", category: "Technology" },
      { title: "Women Empowerment in India", category: "Social" },
      { title: "Artificial Intelligence: Boon or Bane", category: "Tech" },
      { title: "One Nation One Election", category: "Political" },
      { title: "Uniform Civil Code", category: "Legal" },
      { title: "Privatization of PSUs", category: "Economy" },
      { title: "India-China Relations", category: "International" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700 relative">
      
      {/* HEADER SEO */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center border-b-8 border-blue-500">
         <div className="relative z-10 space-y-4">
            <span className="px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-2 mx-auto w-fit">
               <BookOpen size={12} /> Knowledge Vault
            </span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Defense Aspirant <span className="text-yellow-400">Resource Library</span></h1>
            <p className="text-slate-400 max-w-2xl font-medium leading-relaxed text-sm md:text-base">
               Free curated study material for SSB Interview preparation. Access WAT words, TAT samples, Lecturette topics, GD topics, and daily defense current affairs.
            </p>
         </div>
         <div className="absolute top-0 right-0 p-8 opacity-5">
             <FileText size={200} />
         </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap justify-center gap-4">
          {[
              { id: 'WAT', label: 'Top 50 WAT Words', icon: Zap },
              { id: 'TAT', label: 'TAT Gallery', icon: ImageIcon },
              { id: 'LECTURETTE', label: 'Lecturette Topics', icon: Mic },
              { id: 'GD', label: 'GD Topics', icon: Users },
              { id: 'BLOG', label: 'Daily Defense Blog', icon: Globe },
          ].map((tab) => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all ${
                      activeTab === tab.id 
                      ? 'bg-slate-900 text-white shadow-xl scale-105' 
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                  }`}
              >
                  <tab.icon size={16} /> {tab.label}
              </button>
          ))}
      </div>

      {/* CONTENT AREA */}
      <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-xl min-h-[500px]">
          
          {/* WAT SECTION */}
          {activeTab === 'WAT' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-end border-b border-slate-100 pb-6">
                      <div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Word Association Test (WAT) Vault</h3>
                          <p className="text-slate-500 text-xs font-bold mt-2">Practice these high-frequency words to build speed and positive responses.</p>
                      </div>
                      <div className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hidden md:block">
                          Updated for 2026
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {STATIC_WAT_DATA.map((item, i) => (
                          <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group">
                              <div className="flex justify-between items-start mb-2">
                                  <span className="text-lg font-black text-slate-900 uppercase">{item.word}</span>
                                  <span className="text-[9px] font-bold text-slate-300">#{i+1}</span>
                              </div>
                              <p className="text-xs text-slate-600 font-medium italic group-hover:text-blue-700 transition-colors">
                                  "{item.word === 'Atom' ? 'Atoms form the basis of matter.' : item.word === 'Love' ? 'Love for the country inspires sacrifice.' : item.response}"
                              </p>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* TAT SECTION */}
          {activeTab === 'TAT' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-center space-y-2 mb-8">
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Thematic Apperception Test (TAT) Samples</h3>
                      <p className="text-slate-500 text-xs font-bold">Analyze these standard scenarios. Observe the background, mood, and potential action.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {[
                          { title: "The Accident Scene", img: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80&sat=-100&contrast=1.2", desc: "A group of people gathered around a fallen scooter.", approach: "Identify the injured. Immediate first aid. Traffic management. Evacuation to hospital." },
                          { title: "Discussion in Office", img: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=800&q=80&sat=-100&contrast=1.2", desc: "Three people discussing over a map/document.", approach: "Planning a project or operation. Clear distribution of tasks. Consensus building." },
                          { title: "Solo Student", img: "https://images.unsplash.com/photo-1485178575877-1a13bf489dfe?auto=format&fit=crop&w=800&q=80&sat=-100&contrast=1.2", desc: "A young person sitting alone with books.", approach: "Preparation for competitive exams. Focus, dedication, and future ambition." }
                      ].map((scenario, i) => (
                          <div key={i} className="rounded-3xl overflow-hidden border border-slate-200 shadow-xl group">
                              <div className="h-64 overflow-hidden relative">
                                  <img src={scenario.img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={scenario.title} />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                                      <h4 className="text-white font-black text-lg uppercase tracking-wide">{scenario.title}</h4>
                                  </div>
                              </div>
                              <div className="p-6 bg-white space-y-4">
                                  <div>
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Observation</span>
                                      <p className="text-sm font-medium text-slate-700">{scenario.desc}</p>
                                  </div>
                                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1 flex items-center gap-2"><CheckCircle size={12} /> Recommended Approach</span>
                                      <p className="text-xs font-bold text-blue-900 leading-relaxed">{scenario.approach}</p>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* LECTURETTE SECTION */}
          {activeTab === 'LECTURETTE' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-6">
                      <div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Lecturette Topics (2025-26)</h3>
                          <p className="text-slate-500 text-xs font-bold mt-2">Click on a topic to generate an AI Speech Outline and practice.</p>
                      </div>
                      <div className="flex gap-2">
                          <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">High Probability</span>
                          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Trending</span>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {LECTURETTE_TOPICS.map((topic, i) => (
                          <div 
                            key={i} 
                            onClick={() => handleLecturetteClick(topic.title)}
                            className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all group shadow-sm hover:shadow-lg"
                          >
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors font-black text-xs">
                                      {i + 1}
                                  </div>
                                  <div>
                                      <h5 className="font-bold text-slate-900 text-sm group-hover:text-blue-900">{topic.title}</h5>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{topic.category}</span>
                                  </div>
                              </div>
                              <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${topic.difficulty === 'High' ? 'bg-red-100 text-red-700' : topic.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                  {topic.difficulty}
                              </span>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* GD TOPICS SECTION */}
          {activeTab === 'GD' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-center space-y-2 mb-8">
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Trending GD Topics</h3>
                      <p className="text-slate-500 text-xs font-bold">Group Discussion topics frequently appearing in SSB.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {GD_TOPICS.map((topic, i) => (
                          <div key={i} className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-2xl hover:border-slate-400 transition-all shadow-sm">
                              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 font-black text-sm shrink-0">
                                  <Users size={20} />
                              </div>
                              <div>
                                  <h5 className="font-bold text-slate-900 text-sm">{topic.title}</h5>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{topic.category}</span>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* BLOG SECTION */}
          {activeTab === 'BLOG' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-center space-y-2 mb-8">
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Daily Defense Brief</h3>
                      <p className="text-slate-500 text-xs font-bold">Auto-generated intelligence report for SSB aspirants.</p>
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{new Date().toDateString()}</p>
                  </div>

                  {blogLoading ? (
                      <div className="flex flex-col items-center justify-center py-20">
                          <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
                          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Compiling Report...</p>
                      </div>
                  ) : blogContent.length === 0 ? (
                      <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-100">
                          <p className="text-slate-400 font-bold">No intelligence data available at this moment.</p>
                          <button onClick={fetchBlogData} className="mt-4 text-blue-600 text-xs font-black uppercase tracking-widest hover:underline">Retry Fetch</button>
                      </div>
                  ) : (
                      <div className="space-y-12">
                          {blogContent.map((news, i) => (
                              <article key={i} className="flex flex-col md:flex-row gap-8 border-b border-slate-100 pb-12 last:border-0">
                                  <div className="md:w-1/4 shrink-0">
                                      <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-3 ${news.tag.includes('Defense') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                          {news.tag}
                                      </span>
                                      <h4 className="text-xl font-black text-slate-900 leading-tight">{news.headline}</h4>
                                  </div>
                                  <div className="md:w-3/4 space-y-4">
                                      <p className="text-slate-600 font-medium leading-relaxed">{news.summary}</p>
                                      <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-blue-500">
                                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">SSB Relevance</p>
                                          <p className="text-xs font-bold text-blue-900 italic">"{news.relevance}"</p>
                                      </div>
                                  </div>
                              </article>
                          ))}
                      </div>
                  )}
              </div>
          )}

      </div>

      {/* LECTURETTE MODAL */}
      {selectedLecturette && (
          <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
                  <button 
                    onClick={() => { setSelectedLecturette(null); setIsTimerRunning(false); }}
                    className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10"
                  >
                      <X size={20} />
                  </button>

                  <div className="p-8 border-b border-slate-100 bg-slate-50">
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight pr-10">{selectedLecturette}</h3>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Lecturette Simulation</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                      {loadingLecturette ? (
                          <div className="flex flex-col items-center justify-center py-12 space-y-4">
                              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Generatng Speech Outline...</p>
                          </div>
                      ) : lecturetteContent ? (
                          <div className="space-y-8">
                              <div className="space-y-2">
                                  <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-3 py-1 rounded uppercase tracking-widest">Introduction (30s)</span>
                                  <p className="text-sm font-medium text-slate-700 leading-relaxed bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                      {lecturetteContent.introduction}
                                  </p>
                              </div>

                              <div className="space-y-4">
                                  <span className="text-[10px] font-black bg-purple-100 text-purple-700 px-3 py-1 rounded uppercase tracking-widest">Key Points (2 mins)</span>
                                  <div className="grid gap-3">
                                      {lecturetteContent.keyPoints?.map((pt: string, idx: number) => (
                                          <div key={idx} className="flex gap-3 text-sm font-bold text-slate-800">
                                              <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs shrink-0">{idx + 1}</div>
                                              {pt}
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <span className="text-[10px] font-black bg-green-100 text-green-700 px-3 py-1 rounded uppercase tracking-widest">Conclusion (30s)</span>
                                  <p className="text-sm font-medium text-slate-700 leading-relaxed bg-green-50/50 p-4 rounded-2xl border border-green-100">
                                      {lecturetteContent.conclusion}
                                  </p>
                              </div>
                          </div>
                      ) : (
                          <p className="text-center text-red-500 font-bold">Failed to load content.</p>
                      )}
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className={`text-4xl font-mono font-black ${lecturetteTimer < 30 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
                              {Math.floor(lecturetteTimer / 60)}:{(lecturetteTimer % 60).toString().padStart(2, '0')}
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Time Remaining</span>
                      </div>
                      <button 
                          onClick={() => setIsTimerRunning(!isTimerRunning)}
                          className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg transition-all ${isTimerRunning ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-900 text-white hover:bg-black'}`}
                      >
                          {isTimerRunning ? <span className="flex items-center gap-2">Stop</span> : <span className="flex items-center gap-2"><Play size={14} fill="currentColor" /> Start Practice</span>}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default ResourceCenter;
