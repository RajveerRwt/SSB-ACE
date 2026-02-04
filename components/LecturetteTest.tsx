
import React, { useState, useEffect, useRef } from 'react';
import { Mic, BookOpen, Loader2, Play, X, Clock, AlertTriangle, CheckCircle, Volume2 } from 'lucide-react';
import { generateLecturette } from '../services/geminiService';

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

const LecturetteTest: React.FC = () => {
  const [selectedLecturette, setSelectedLecturette] = useState<string | null>(null);
  const [lecturetteContent, setLecturetteContent] = useState<any>(null);
  const [loadingLecturette, setLoadingLecturette] = useState(false);
  const [lecturetteTimer, setLecturetteTimer] = useState(180);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBuzzer = (freq: number = 200, duration: number = 0.5) => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && lecturetteTimer > 0) {
        interval = setInterval(() => {
            setLecturetteTimer(prev => {
                const newValue = prev - 1;
                // Buzzer at 2:30 elapsed (which means 30s remaining from 180s)
                if (newValue === 30) {
                    playBuzzer(400, 0.8); // Higher pitch warning buzzer
                }
                return newValue;
            });
        }, 1000);
    } else if (lecturetteTimer === 0) {
        setIsTimerRunning(false);
        playBuzzer(200, 1.0); // End buzzer
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, lecturetteTimer]);

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

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700 relative">
      
      {/* HEADER */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center border-b-8 border-purple-500">
         <div className="relative z-10 space-y-4">
            <span className="px-4 py-1.5 bg-purple-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-2 mx-auto w-fit">
               <Mic size={12} /> GTO Task 3
            </span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Lecturette <span className="text-yellow-400">Simulator</span></h1>
            <p className="text-slate-400 max-w-2xl font-medium leading-relaxed text-sm md:text-base">
               Choose a topic card. You get 3 minutes to prepare and 3 minutes to speak. The buzzer will warn you at 2:30 minutes.
            </p>
         </div>
         <div className="absolute top-0 right-0 p-8 opacity-5">
             <Mic size={200} />
         </div>
      </div>

      {/* TOPIC LIST */}
      {!selectedLecturette && (
          <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-xl">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-6 mb-6">
                  <div>
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Available Topics (2025-26)</h3>
                      <p className="text-slate-500 text-xs font-bold mt-2">Pick a card to start the timer and generate an AI outline.</p>
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
                        className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all group shadow-sm hover:shadow-lg"
                      >
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-purple-600 group-hover:text-white transition-colors font-black text-xs">
                                  {i + 1}
                              </div>
                              <div>
                                  <h5 className="font-bold text-slate-900 text-sm group-hover:text-purple-900">{topic.title}</h5>
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

      {/* SIMULATION MODAL */}
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
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                          <Mic size={14} /> Lecturette Simulation Mode
                      </p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                      {loadingLecturette ? (
                          <div className="flex flex-col items-center justify-center py-12 space-y-4">
                              <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
                              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Generating Speech Outline...</p>
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
                          <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Time Remaining</span>
                              {lecturetteTimer === 30 && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest animate-pulse flex items-center gap-1"><AlertTriangle size={10} /> 30s Warning!</span>}
                          </div>
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

export default LecturetteTest;
