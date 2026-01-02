
import React, { useState, useEffect, useRef } from 'react';
import { Timer, Send, Loader2, Image as ImageIcon, CheckCircle, ShieldCheck, FileText, Target, Award, AlertCircle, Upload, Trash2, BookOpen, Layers, Brain } from 'lucide-react';
import { generateTestContent, generateTATStimulus, evaluatePerformance } from '../services/geminiService';
import { TestType } from '../types';

interface PsychologyProps {
  type: TestType;
  onSave?: (result: any) => void;
}

enum PsychologyPhase {
  IDLE,
  PREPARING_STIMULI,
  VIEWING, 
  WRITING,
  UPLOADING_STORIES, 
  EVALUATING,        
  COMPLETED
}

const PsychologyTest: React.FC<PsychologyProps> = ({ type, onSave }) => {
  const [items, setItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [phase, setPhase] = useState<PsychologyPhase>(PsychologyPhase.IDLE);
  const [timeLeft, setTimeLeft] = useState(-1);
  const [totalTimeLeft, setTotalTimeLeft] = useState(1800); 
  const [isLoading, setIsLoading] = useState(false);
  const [pregeneratedImages, setPregeneratedImages] = useState<Record<string, string>>({});
  const [loadProgress, setLoadProgress] = useState(0);
  
  const [tatUploads, setTatUploads] = useState<string[]>(new Array(12).fill(''));
  const [feedback, setFeedback] = useState<any>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadIndex = useRef<number | null>(null);

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
        
        let currentLoaded = 0;
        for (const item of finalItems) {
          try {
            const imgUrl = await generateTATStimulus(item.content);
            images[item.id] = imgUrl;
          } catch (err) {
            images[item.id] = "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800&auto=format&fit=crop&grayscale=true";
          }
          currentLoaded++;
          setLoadProgress((currentLoaded / totalToLoad) * 100);
        }

        setPregeneratedImages(images);
        finalItems.push({ id: 'tat-12-blank', content: 'BLANK SLIDE' });
      } else if (type === TestType.WAT || type === TestType.SRT) {
        if (finalItems.length > 60) finalItems = finalItems.slice(0, 60);
        if (type === TestType.SRT) setTotalTimeLeft(1800); 
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
      if (type === TestType.TAT) {
        setPhase(PsychologyPhase.UPLOADING_STORIES);
      } else {
        setPhase(PsychologyPhase.COMPLETED);
      }
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
        if (type === TestType.TAT) {
          setPhase(PsychologyPhase.UPLOADING_STORIES);
        } else {
          setPhase(PsychologyPhase.COMPLETED);
        }
      }
    }
  };

  const handleFileSelect = (index: number) => {
    activeUploadIndex.current = index;
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeUploadIndex.current !== null) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        const newUploads = [...tatUploads];
        newUploads[activeUploadIndex.current!] = base64;
        setTatUploads(newUploads);
        activeUploadIndex.current = null;
      };
      reader.readAsDataURL(file);
    }
  };

  const submitDossier = async () => {
    setPhase(PsychologyPhase.EVALUATING);
    try {
      const result = await evaluatePerformance('TAT', {
        tatImages: tatUploads,
        testType: 'TAT',
        itemCount: 12
      });
      setFeedback(result);
      
      // Save result along with images for history
      if (onSave) onSave({ ...result, tatImages: tatUploads });
      
      setPhase(PsychologyPhase.COMPLETED);
    } catch (err) {
      console.error(err);
      setPhase(PsychologyPhase.UPLOADING_STORIES);
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
             {type === TestType.TAT && (
               <>
                 <p>• 12 Slides (11 images + 1 blank). 30s observation, 4m writing.</p>
                 <p>• Write all stories on paper sequentially.</p>
                 <p className="font-bold text-slate-900 underline decoration-yellow-400">• After session, upload images of all 12 stories for AI Psychological assessment.</p>
               </>
             )}
             {type === TestType.WAT && <p>• 60 Words. 15s per word. Sentences must be spontaneous.</p>}
             {type === TestType.SRT && <p>• 60 Situations. 30 Minutes. Quality of response is vital.</p>}
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
           <p className="text-slate-400 text-xs font-bold italic max-w-sm mx-auto">"Gentleman, the psychologist is finalizing the materials. Ensure your chest number is written clearly."</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center gap-6">
             <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center"><Target size={20} /></div>
             <div><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Progress</p><p className="text-xl font-black text-slate-900">{currentIndex + 1} of {items.length}</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center justify-center">
             <div className="relative w-full max-w-[200px] h-2 bg-slate-100 rounded-full overflow-hidden flex items-center">
                <div className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-500 rounded-full" style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }} />
             </div>
             <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-3">Board Response Map</p>
          </div>
          <div className={`p-6 rounded-[2.5rem] shadow-xl flex items-center justify-between border-4 transition-all duration-300 ${timeLeft < 7 && !isTAT ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-white'}`}>
             <div className="flex items-center gap-4"><Timer className="w-8 h-8" /><div><p className="text-[9px] font-black uppercase tracking-widest opacity-60">Slide Timer</p><p className="text-2xl font-black font-mono">{formatTime(timeLeft)}</p></div></div>
          </div>
        </div>

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
                <div className="absolute top-10 left-10 bg-black/70 backdrop-blur-3xl px-10 py-4 rounded-full text-white font-black text-[10px] uppercase tracking-[0.4em] border border-white/20 shadow-2xl">OBSERVATION PHASE: 30S</div>
             </div>
          </div>
        )}

        {isTAT && phase === PsychologyPhase.WRITING && (
          <div className="bg-slate-950 p-32 rounded-[4rem] flex flex-col items-center justify-center text-center space-y-12 shadow-2xl animate-in slide-in-from-bottom-12 duration-700 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-transparent opacity-20" />
             <div className="w-40 h-40 bg-white/5 rounded-full flex items-center justify-center border border-white/10 relative z-10 shadow-inner">
                <FileText className="text-blue-500 w-20 h-20 animate-pulse" />
             </div>
             <div className="relative z-10 space-y-6">
                <h3 className="text-7xl font-black text-white uppercase tracking-tighter">Writing Phase</h3>
                <p className="text-slate-400 text-3xl font-medium italic max-w-2xl leading-relaxed opacity-80">Construct story #{currentIndex + 1} on your answer sheet.</p>
             </div>
             <div className="relative z-10 px-12 py-6 bg-white/5 rounded-full border border-white/10 text-white font-black uppercase tracking-[0.5em] text-[10px] shadow-2xl">Automatic transition in {timeLeft}s</div>
          </div>
        )}

        {/* SRT Specific Display: Italic, larger descriptive text */}
        {isSRT && (
          <div className="bg-white rounded-[4rem] p-24 md:p-40 text-center shadow-2xl border-2 border-slate-50 min-h-[60vh] flex flex-col items-center justify-center relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-full h-2 bg-slate-50">
                <div className="h-full bg-blue-600 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 30) * 100}%` }} />
             </div>
             <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight italic leading-snug max-w-5xl">"{currentItem.content}"</h1>
          </div>
        )}

        {/* WAT Specific Display: Massive, bold, plain uppercase word as shown in screenshot */}
        {isWAT && (
          <div className="bg-white rounded-[4rem] p-24 md:p-40 text-center shadow-2xl border-2 border-slate-50 min-h-[60vh] flex flex-col items-center justify-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-slate-50">
                <div className="h-full bg-slate-900 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 15) * 100}%` }} />
             </div>
             <h1 className="text-[8rem] md:text-[10rem] font-black text-slate-900 uppercase tracking-tighter scale-110">{currentItem.content}</h1>
             <p className="text-slate-400 font-bold uppercase tracking-[0.5em] mt-12">Spontaneous Response Required</p>
          </div>
        )}
      </div>
    );
  }

  if (phase === PsychologyPhase.UPLOADING_STORIES) {
    return (
      <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in slide-in-from-bottom-20 duration-700">
         <div className="text-center space-y-6">
            <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Dossier Submission</h2>
            <p className="text-slate-500 text-xl font-medium italic">"Upload images of your handwritten stories for Psychological Analysis."</p>
         </div>
         
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept="image/*" />
            {tatUploads.map((file, i) => (
              <div key={i} className={`aspect-[4/5] rounded-[2rem] border-2 transition-all cursor-pointer relative overflow-hidden group ${file ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white hover:border-slate-900'}`} onClick={() => handleFileSelect(i)}>
                 {file ? (
                   <>
                     <img src={`data:image/jpeg;base64,${file}`} className="w-full h-full object-cover opacity-80" alt={`Story ${i+1}`} />
                     <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                        <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center shadow-xl"><CheckCircle size={20} /></div>
                     </div>
                   </>
                 ) : (
                   <div className="flex flex-col items-center justify-center h-full space-y-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors"><Upload size={20} /></div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">Story {i+1}</span>
                   </div>
                 )}
              </div>
            ))}
         </div>

         <div className="flex justify-center pt-10">
            <button 
              onClick={submitDossier}
              disabled={tatUploads.some(u => !u)}
              className="px-20 py-7 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-black transition-all shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-4"
            >
              {tatUploads.some(u => !u) ? 'Complete All Uploads' : 'Submit to Psychologist'}
            </button>
         </div>
      </div>
    );
  }

  if (phase === PsychologyPhase.EVALUATING) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-12">
        <div className="relative">
          <Loader2 className="w-24 h-24 text-slate-900 animate-spin" />
          <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-purple-500" />
        </div>
        <div className="text-center">
          <p className="text-slate-900 font-black uppercase tracking-[0.5em] text-sm mb-2">Psychometric Profiling</p>
          <p className="text-slate-400 text-xs font-bold italic">Evaluating OLQs: Effective Intelligence, Social Adaptability, Determination...</p>
        </div>
      </div>
    );
  }

  if (phase === PsychologyPhase.COMPLETED) {
    return (
      <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-12 duration-1000">
        <div className="bg-slate-950 p-16 rounded-[4rem] text-white relative overflow-hidden shadow-2xl">
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-16">
              <div className="text-center md:text-left space-y-6">
                 <span className="bg-purple-600 text-white px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-lg">Psychology Report</span>
                 <h2 className="text-7xl font-black uppercase tracking-tighter leading-none">Dossier <br/><span className="text-purple-500">Analysis</span></h2>
                 <p className="text-slate-400 font-medium max-w-lg leading-relaxed text-lg italic opacity-80">"{feedback?.recommendations || 'Evaluation Complete.'}"</p>
              </div>
              <div className="flex flex-col items-center bg-white/5 p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-3xl shadow-2xl">
                 <span className="text-[11px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">Psych Score</span>
                 <div className="text-9xl font-black text-purple-500">{feedback?.score || 0}</div>
              </div>
           </div>
        </div>

        {feedback?.individualStories && (
          <div className="space-y-8">
             <h4 className="font-black text-xs uppercase tracking-[0.3em] text-slate-400 ml-4">Detailed Story Breakdown</h4>
             <div className="grid md:grid-cols-2 gap-6">
               {feedback.individualStories.map((story: any, i: number) => (
                 <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 hover:border-slate-900 transition-colors group shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                       <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Story {story.storyIndex}</span>
                       <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">{story.theme}</span>
                    </div>
                    <p className="text-slate-600 text-sm font-medium leading-relaxed mb-4">{story.analysis}</p>
                    <div className="flex items-center gap-2">
                       <Award size={14} className="text-yellow-500" />
                       <span className="text-[10px] font-black uppercase text-slate-800 tracking-widest">Projected: {story.olqProjected}</span>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-10">
           <div className="bg-white p-12 rounded-[3.5rem] border-2 border-slate-50 shadow-2xl">
              <h4 className="font-black text-xs uppercase tracking-[0.3em] text-green-600 mb-10 flex items-center gap-4"><CheckCircle className="w-6 h-6" /> Observed Strengths</h4>
              <div className="space-y-5">
                {feedback?.strengths?.map((s: string, i: number) => (
                  <div key={i} className="flex gap-5 p-5 bg-green-50 rounded-3xl border border-green-100 text-slate-800 text-sm font-bold">
                    <CheckCircle className="w-6 h-6 text-green-500 shrink-0" /> {s}
                  </div>
                ))}
              </div>
           </div>
           <div className="bg-white p-12 rounded-[3.5rem] border-2 border-slate-50 shadow-2xl">
              <h4 className="font-black text-xs uppercase tracking-[0.3em] text-red-500 mb-10 flex items-center gap-4"><AlertCircle className="w-6 h-6" /> Areas of Improvement</h4>
              <div className="space-y-5">
                {feedback?.weaknesses?.map((w: string, i: number) => (
                  <div key={i} className="flex gap-5 p-5 bg-red-50 rounded-3xl border border-red-100 text-slate-800 text-sm font-bold">
                    <AlertCircle className="w-6 h-6 text-red-500 shrink-0" /> {w}
                  </div>
                ))}
              </div>
           </div>
        </div>

        <button 
          onClick={() => { setPhase(PsychologyPhase.IDLE); setFeedback(null); setTatUploads(new Array(12).fill('')); }}
          className="w-full py-7 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-2xl"
        >
          Return to Psychology Wing
        </button>
      </div>
    );
  }

  return null;
};

export default PsychologyTest;
