
import React, { useState, useEffect, useRef } from 'react';
import { Timer, Send, Loader2, Image as ImageIcon, CheckCircle, ShieldCheck, ChevronRight, FileText, Target, Activity, ShieldAlert, Award, Coffee, Volume2, AlertCircle, Clock } from 'lucide-react';
import { generateTestContent, generateTATStimulus } from '../services/geminiService';
import { TestType } from '../types';

interface PsychologyProps {
  type: TestType;
}

enum PsychologyPhase {
  IDLE,
  PREPARING_STIMULI,
  VIEWING, 
  WRITING,
  COMPLETED
}

const PsychologyTest: React.FC<PsychologyProps> = ({ type }) => {
  const [items, setItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [phase, setPhase] = useState<PsychologyPhase>(PsychologyPhase.IDLE);
  const [timeLeft, setTimeLeft] = useState(-1);
  const [totalTimeLeft, setTotalTimeLeft] = useState(1800); // 30 Minutes for SRT
  const [isLoading, setIsLoading] = useState(false);
  const [pregeneratedImages, setPregeneratedImages] = useState<Record<string, string>>({});
  const [loadProgress, setLoadProgress] = useState(0);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const startTest = async () => {
    setIsLoading(true);
    setPhase(PsychologyPhase.PREPARING_STIMULI);
    setLoadProgress(0);
    
    try {
      const data = await generateTestContent(type);
      let finalItems = data.items;
      
      if (type === TestType.TAT) {
        if (finalItems.length > 11) finalItems = finalItems.slice(0, 11);
        const images: Record<string, string> = {};
        const totalToLoad = finalItems.length;
        
        await Promise.all(finalItems.map(async (item: any) => {
          try {
            const imgUrl = await generateTATStimulus(item.content);
            images[item.id] = imgUrl;
            setLoadProgress(prev => prev + (100 / totalToLoad));
          } catch (err) {
            images[item.id] = "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800&auto=format&fit=crop&grayscale=true";
          }
        }));
        setPregeneratedImages(images);
        finalItems.push({ id: 'tat-12-blank', content: 'BLANK SLIDE' });
      } else if (type === TestType.WAT || type === TestType.SRT) {
        if (finalItems.length > 60) finalItems = finalItems.slice(0, 60);
        if (type === TestType.SRT) setTotalTimeLeft(1800); // 30m reset
      }
      
      setItems(finalItems);
      setCurrentIndex(0);
      setupSlide(0, finalItems);
    } catch (e) {
      console.error("Test initialization failed", e);
      setPhase(PsychologyPhase.IDLE);
    } finally {
      setIsLoading(false);
    }
  };

  const setupSlide = (index: number, currentItems: any[]) => {
    if (index >= currentItems.length) {
      setPhase(PsychologyPhase.COMPLETED);
      return;
    }

    if (type === TestType.TAT) {
      setTimeLeft(30); 
      setPhase(PsychologyPhase.VIEWING);
    } else if (type === TestType.WAT) {
      setTimeLeft(15);
      setPhase(PsychologyPhase.WRITING);
    } else if (type === TestType.SRT) {
      setTimeLeft(30);
      setPhase(PsychologyPhase.WRITING);
    }
  };

  // Global Session Timer for SRT
  useEffect(() => {
    if (type === TestType.SRT && currentIndex >= 0 && phase !== PsychologyPhase.COMPLETED) {
      if (totalTimeLeft > 0) {
        totalTimerRef.current = setTimeout(() => setTotalTimeLeft(prev => prev - 1), 1000);
      } else {
        setPhase(PsychologyPhase.COMPLETED);
      }
    }
    return () => { if (totalTimerRef.current) clearTimeout(totalTimerRef.current); };
  }, [totalTimeLeft, currentIndex, phase]);

  // Per-item Timer
  useEffect(() => {
    const isTimedPhase = phase === PsychologyPhase.VIEWING || phase === PsychologyPhase.WRITING;
    
    if (currentIndex >= 0 && currentIndex < items.length && isTimedPhase && timeLeft >= 0) {
      if (timeLeft > 0) {
        timerRef.current = setTimeout(() => {
          setTimeLeft((prev) => prev - 1);
        }, 1000);
      } else {
        handleTimerEnd();
      }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, currentIndex, phase]);

  const handleTimerEnd = () => {
    if (type === TestType.TAT && phase === PsychologyPhase.VIEWING) {
      playBuzzer(180, 0.4); 
      setTimeLeft(240); 
      setPhase(PsychologyPhase.WRITING);
    } else {
      const nextIdx = currentIndex + 1;
      if (nextIdx < items.length) {
        if (type === TestType.WAT || type === TestType.SRT) playBuzzer(300, 0.1);
        setCurrentIndex(nextIdx);
        setupSlide(nextIdx, items);
      } else {
        setPhase(PsychologyPhase.COMPLETED);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (currentIndex === -1 && phase !== PsychologyPhase.PREPARING_STIMULI) {
    return (
      <div className="bg-white p-16 rounded-[4rem] shadow-2xl border-4 border-slate-50 text-center max-w-4xl mx-auto ring-1 ring-slate-100 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-slate-900 text-yellow-400 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl rotate-6 border-4 border-slate-800">
           {type === TestType.TAT ? <ImageIcon size={48}/> : type === TestType.SRT ? <AlertCircle size={48}/> : <Target size={48}/>}
        </div>
        <h2 className="text-5xl font-black mb-6 uppercase tracking-tighter text-slate-900">{type} Test Session</h2>
        <div className="bg-slate-50 p-10 rounded-[2.5rem] mb-12 text-left border border-slate-200">
           <h4 className="font-black text-xs uppercase tracking-widest text-blue-600 mb-6 flex items-center gap-2 underline underline-offset-4">Board Directives:</h4>
           <div className="text-slate-600 font-medium text-lg leading-relaxed italic space-y-4">
             {type === TestType.TAT && <p>• 12 Slides (11 images + 1 blank). 30s observation, 4m writing per slide.</p>}
             {type === TestType.WAT && <p>• 60 Words. 15s per word. Association + Writing must be simultaneous.</p>}
             {type === TestType.SRT && (
               <>
                 <p>• 60 Situations (SRTs). Total time: 30 Minutes.</p>
                 <p>• Approximately 30s per situation to read and record response.</p>
                 <p>• Elicit spontaneous reactions. Quality of response is as vital as quantity.</p>
               </>
             )}
             <p className="text-sm font-black text-slate-400 mt-6 uppercase tracking-widest bg-white/50 p-4 rounded-xl">"Be concise, logical, and assume responsibility in every situation."</p>
           </div>
        </div>
        <button onClick={startTest} disabled={isLoading} className="bg-slate-900 text-white px-20 py-6 rounded-full font-black text-lg hover:bg-black transition-all shadow-2xl uppercase tracking-widest active:scale-95 flex items-center gap-6 mx-auto">
          {isLoading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
          Commence Session
        </button>
      </div>
    );
  }

  if (phase === PsychologyPhase.PREPARING_STIMULI) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-12 animate-in fade-in duration-500">
        <div className="relative">
          <Loader2 className="w-32 h-32 text-slate-900 animate-spin" strokeWidth={1} />
          <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-slate-900">
            {Math.round(loadProgress)}%
          </div>
        </div>
        <div className="text-center space-y-4">
           <p className="text-slate-900 font-black uppercase tracking-[0.5em] text-sm">Assembling Restricted Materials</p>
           <p className="text-slate-400 text-xs font-bold italic max-w-sm mx-auto">"Gentleman, the psychologist is finalizing the 60 situations. Ensure your chest number is written on the booklet."</p>
        </div>
      </div>
    );
  }

  if (phase === PsychologyPhase.VIEWING || phase === PsychologyPhase.WRITING) {
    const currentItem = items[currentIndex];
    const isSRT = type === TestType.SRT;
    const isWAT = type === TestType.WAT;
    const isTAT = type === TestType.TAT;
    const imageUrl = isTAT ? (currentItem.id === 'tat-12-blank' ? 'BLANK' : pregeneratedImages[currentItem.id]) : null;

    return (
      <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
        
        {/* HEADER HUD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center gap-6">
             <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                <Target size={20} />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Progress</p>
                <p className="text-xl font-black text-slate-900">{currentIndex + 1} of 60</p>
             </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center justify-center">
             <div className="flex gap-1.5 overflow-hidden w-full max-w-[200px]">
                {items.map((_, i) => (
                  <div key={i} className={`h-1.5 transition-all duration-500 rounded-full shrink-0 ${i === currentIndex ? 'w-8 bg-blue-600' : i < currentIndex ? 'w-1 bg-green-500' : 'w-1 bg-slate-100'}`} />
                ))}
             </div>
             <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-3">Board Response Map</p>
          </div>

          <div className={`p-6 rounded-[2.5rem] shadow-xl flex items-center justify-between border-4 transition-all duration-300 ${timeLeft < 7 && !isTAT ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-white'}`}>
             <div className="flex items-center gap-4">
                <Timer className="w-8 h-8" />
                <div>
                   <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Slide Timer</p>
                   <p className="text-2xl font-black font-mono">{formatTime(timeLeft)}</p>
                </div>
             </div>
             {isSRT && (
               <div className="text-right border-l border-white/20 pl-6">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Session</p>
                  <p className="text-2xl font-black font-mono text-yellow-400">{formatTime(totalTimeLeft)}</p>
               </div>
             )}
          </div>
        </div>

        {/* MAIN SRT DISPLAY */}
        {isSRT && (
          <div className="bg-white rounded-[4rem] p-24 md:p-40 text-center shadow-2xl border-2 border-slate-50 min-h-[60vh] flex flex-col items-center justify-center relative overflow-hidden group">
             {/* Progress Bar Background */}
             <div className="absolute top-0 left-0 w-full h-2 bg-slate-50">
                <div className="h-full bg-blue-600 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 30) * 100}%` }} />
             </div>

             <div className="space-y-16 max-w-5xl mx-auto">
                <div className="flex flex-col items-center gap-6">
                  <div className="px-10 py-3 bg-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-[0.4em] shadow-lg">Situation No. {currentIndex + 1}</div>
                  <h4 className="text-slate-400 font-black uppercase tracking-[0.4em] text-xs">Analyze & React Spontaneously</h4>
                </div>
                
                <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.3] tracking-tight px-10 italic">
                  "{currentItem.content}"
                </h1>

                <div className="flex items-center justify-center gap-12 pt-12">
                   <div className={`px-10 py-4 rounded-3xl border-2 transition-all duration-500 ${timeLeft < 7 ? 'bg-red-500 text-white border-red-400' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest">Reaction Window</p>
                   </div>
                </div>
             </div>
             
             <div className="absolute bottom-16 text-slate-300 font-black uppercase tracking-[0.8em] text-[10px] flex items-center gap-6">
                <ShieldCheck size={14} /> Be Practical • Be Brief • Be Decisive
             </div>
          </div>
        )}

        {/* WAT Display */}
        {isWAT && (
          <div className="bg-white rounded-[4rem] p-40 text-center shadow-2xl border-2 border-slate-50 min-h-[50vh] flex flex-col items-center justify-center relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-50">
                <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${(timeLeft / 15) * 100}%` }} />
             </div>
             <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300">Reaction requested for:</span>
                <h1 className="text-[10rem] font-black uppercase tracking-tight text-slate-900 transition-all group-hover:scale-110 duration-700">
                  {currentItem.content}
                </h1>
             </div>
          </div>
        )}

        {/* TAT Viewing Display */}
        {isTAT && phase === PsychologyPhase.VIEWING && (
          <div className="animate-in zoom-in duration-1000">
             <div className="relative rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] border-[15px] border-white ring-1 ring-slate-200 bg-white min-h-[65vh] flex items-center justify-center">
                {imageUrl === 'BLANK' ? (
                  <div className="text-center h-full w-full flex flex-col items-center justify-center bg-white p-40">
                     <div className="text-slate-100 font-black text-[10rem] uppercase tracking-[0.5em] select-none opacity-20 transform -rotate-12">BLANK</div>
                     <p className="text-slate-400 font-black uppercase tracking-[0.6em] text-xl mt-8">Prepare Final Imaginary Story</p>
                  </div>
                ) : (
                  <img src={imageUrl!} className="mx-auto w-full max-h-[75vh] object-contain grayscale contrast-125" alt="Psychological Stimulus" />
                )}
                <div className="absolute top-10 left-10 bg-black/70 backdrop-blur-3xl px-10 py-4 rounded-full text-white font-black text-[10px] uppercase tracking-[0.4em] border border-white/20 shadow-2xl">
                  OBSERVATION PHASE: 30S
                </div>
             </div>
          </div>
        )}

        {/* TAT Writing Phase Display */}
        {isTAT && phase === PsychologyPhase.WRITING && (
          <div className="bg-slate-950 p-32 rounded-[4rem] flex flex-col items-center justify-center text-center space-y-12 shadow-2xl animate-in slide-in-from-bottom-12 duration-700 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-transparent opacity-20" />
             <div className="w-40 h-40 bg-white/5 rounded-full flex items-center justify-center border border-white/10 relative z-10 shadow-inner">
                <FileText className="text-blue-500 w-20 h-20 animate-pulse" />
             </div>
             <div className="relative z-10 space-y-6">
                <h3 className="text-7xl font-black text-white uppercase tracking-tighter">Writing Phase</h3>
                <p className="text-slate-400 text-3xl font-medium italic max-w-2xl leading-relaxed opacity-80">
                  Construct story #{currentIndex + 1} on your answer sheet.
                </p>
             </div>
             <div className="relative z-10 px-12 py-6 bg-white/5 rounded-full border border-white/10 text-white font-black uppercase tracking-[0.5em] text-[10px] shadow-2xl">
                Automatic transition in {timeLeft}s
             </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === PsychologyPhase.COMPLETED) {
    return (
      <div className="max-w-4xl mx-auto text-center py-24 space-y-12 animate-in fade-in zoom-in duration-1000">
         <div className="w-32 h-32 bg-slate-900 text-green-400 rounded-full flex items-center justify-center mx-auto shadow-2xl border-4 border-slate-800">
            <Award size={64} />
         </div>
         <div className="space-y-4">
            <h2 className="text-6xl font-black text-slate-900 uppercase tracking-tighter">Trial Concluded</h2>
            <p className="text-slate-500 text-xl font-medium italic opacity-70 px-12 leading-relaxed">
              "Gentleman, you have finished the {type} session. Ensure your chest number is written on all answer sheets and await further instructions."
            </p>
         </div>
         <button 
           onClick={() => { setCurrentIndex(-1); setPhase(PsychologyPhase.IDLE); setPregeneratedImages({}); }} 
           className="px-20 py-8 bg-slate-900 text-white font-black rounded-full uppercase tracking-[1em] text-sm hover:bg-black transition-all shadow-2xl active:scale-95"
         >
            Report to Dashboard
         </button>
      </div>
    );
  }

  return null;
};

export default PsychologyTest;
