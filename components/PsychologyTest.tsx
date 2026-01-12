import React, { useState, useEffect, useRef } from 'react';
import { Timer, Send, Loader2, Image as ImageIcon, CheckCircle, ShieldCheck, FileText, Target, Award, AlertCircle, Upload, Trash2, BookOpen, Layers, Brain, Eye, FastForward, Edit, X, Save, RefreshCw } from 'lucide-react';
import { generateTestContent, evaluatePerformance, transcribeHandwrittenStory } from '../services/geminiService';
import { getTATScenarios } from '../services/supabaseService';
import { TestType } from '../types';

interface PsychologyProps {
  type: TestType;
  onSave?: (result: any) => void;
  isAdmin?: boolean;
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

const PsychologyTest: React.FC<PsychologyProps> = ({ type, onSave, isAdmin }) => {
  const [items, setItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [phase, setPhase] = useState<PsychologyPhase>(PsychologyPhase.IDLE);
  const [timeLeft, setTimeLeft] = useState(-1);
  const [activeSetName, setActiveSetName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pregeneratedImages, setPregeneratedImages] = useState<Record<string, string>>({});
  const [loadProgress, setLoadProgress] = useState(0);
  
  const [tatUploads, setTatUploads] = useState<string[]>(new Array(12).fill(''));
  const [tatTexts, setTatTexts] = useState<string[]>(new Array(12).fill(''));
  const [transcribingIndices, setTranscribingIndices] = useState<number[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [feedback, setFeedback] = useState<any>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadIndex = useRef<number | null>(null);

  const playBuzzer = (freq: number = 200, duration: number = 0.5) => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
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
      let finalItems: any[] = [];

      if (type === TestType.TAT) {
        // FETCH ONLY FROM DATABASE
        const dbScenarios = await getTATScenarios();
        
        if (!dbScenarios || dbScenarios.length === 0) {
           alert("No TAT images found in database. Please upload images in Admin Panel first.");
           setPhase(PsychologyPhase.IDLE);
           setIsLoading(false);
           return;
        }

        // Group by Set Tag
        const sets: Record<string, any[]> = dbScenarios.reduce((acc: any, img: any) => {
          const tag = img.set_tag || 'Default';
          if (!acc[tag]) acc[tag] = [];
          acc[tag].push(img);
          return acc;
        }, {});

        // Prefer sets with 11 images, or pick any set if none have 11
        const setNames = Object.keys(sets);
        const completeSets = setNames.filter(name => sets[name].length >= 11);
        const selectedSetName = completeSets.length > 0 
          ? completeSets[Math.floor(Math.random() * completeSets.length)]
          : setNames[Math.floor(Math.random() * setNames.length)];

        setActiveSetName(selectedSetName);
        const setImages = sets[selectedSetName].slice(0, 11);
        const images: Record<string, string> = {};

        finalItems = setImages.map((s: any, i: number) => ({
          id: `tat-db-${i}`,
          content: s.description || 'Picture Story',
          imageUrl: s.image_url
        }));

        finalItems.forEach((item) => {
           images[item.id] = item.imageUrl;
        });

        setPregeneratedImages(images);
        finalItems.push({ id: 'tat-12-blank', content: 'BLANK SLIDE' });
        setLoadProgress(100);

      } else {
        // WAT / SRT still use AI content generation (text-only)
        const data = await generateTestContent(type);
        finalItems = data.items;
        if (finalItems.length > 60) finalItems = finalItems.slice(0, 60);
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
      if (type === TestType.TAT) setPhase(PsychologyPhase.UPLOADING_STORIES);
      else setPhase(PsychologyPhase.COMPLETED);
      return;
    }
    if (type === TestType.TAT) { setTimeLeft(30); setPhase(PsychologyPhase.VIEWING); }
    else if (type === TestType.WAT) { setTimeLeft(15); setPhase(PsychologyPhase.WRITING); }
    else if (type === TestType.SRT) { setTimeLeft(30); setPhase(PsychologyPhase.WRITING); }
  };

  useEffect(() => {
    const isTimedPhase = phase === PsychologyPhase.VIEWING || phase === PsychologyPhase.WRITING;
    if (currentIndex >= 0 && currentIndex < items.length && isTimedPhase && timeLeft >= 0) {
      if (timeLeft > 0) {
        timerRef.current = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
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
        playBuzzer(300, 0.1);
        setCurrentIndex(nextIdx);
        setupSlide(nextIdx, items);
      } else {
        if (type === TestType.TAT) setPhase(PsychologyPhase.UPLOADING_STORIES);
        else setPhase(PsychologyPhase.COMPLETED);
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
      const index = activeUploadIndex.current;
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        // Update Image State
        setTatUploads(prev => {
            const next = [...prev];
            next[index] = base64;
            return next;
        });
        activeUploadIndex.current = null;

        // Auto Start Transcription
        setTranscribingIndices(prev => [...prev, index]);
        try {
            const text = await transcribeHandwrittenStory(base64, file.type);
            setTatTexts(prev => {
                const next = [...prev];
                next[index] = text;
                return next;
            });
        } catch (err) {
            console.error("Transcription Failed", err);
        } finally {
            setTranscribingIndices(prev => prev.filter(i => i !== index));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const submitDossier = async () => {
    setPhase(PsychologyPhase.EVALUATING);
    try {
      // 1. Construct pairs of (Stimulus Image, User Story Image)
      // This ensures the AI evaluates the story against the ACTUAL image shown.
      const tatPairs = await Promise.all(items.map(async (item, index) => {
        const userStoryImage = tatUploads[index];
        if (!userStoryImage) return null;

        let stimulusBase64: string | undefined = undefined;
        const url = pregeneratedImages[item.id];

        // If not a blank slide, fetch the stimulus image to send to AI
        if (url && item.id !== 'tat-12-blank') {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                stimulusBase64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.warn("Could not fetch stimulus image for AI context:", e);
            }
        }

        return {
            storyIndex: index + 1,
            stimulusImage: stimulusBase64,
            stimulusDesc: item.content,
            userStoryImage: userStoryImage,
            userStoryText: tatTexts[index] // Include the verified text
        };
      }));

      // Filter out any failed uploads
      const validPairs = tatPairs.filter(p => p !== null);

      const result = await evaluatePerformance(type, {
        tatPairs: validPairs,
        testType: type,
        itemCount: items.length
      });

      setFeedback(result);
      if (onSave) onSave({ ...result, tatImages: tatUploads });
      setPhase(PsychologyPhase.COMPLETED);
    } catch (err) {
      console.error("Evaluation error:", err);
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
      <div className="bg-white p-12 md:p-24 rounded-[3rem] md:rounded-[4rem] shadow-2xl border-4 border-slate-50 text-center max-w-4xl mx-auto ring-1 ring-slate-100 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 md:w-28 md:h-28 bg-slate-900 text-yellow-400 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl rotate-6 border-4 border-slate-800">
           {type === TestType.TAT ? <ImageIcon size={40}/> : <Target size={40}/>}
        </div>
        <h2 className="text-4xl md:text-5xl font-black mb-6 uppercase tracking-tighter text-slate-900">{type} Test</h2>
        <div className="bg-slate-50 p-8 rounded-[2rem] mb-12 text-left border border-slate-200">
           <h4 className="font-black text-xs uppercase tracking-widest text-blue-600 mb-4 underline">Board Briefing:</h4>
           <div className="text-slate-600 font-medium text-sm md:text-lg leading-relaxed italic space-y-4">
             {type === TestType.TAT ? (
               <p>• 12 Pictures (11 from DB + 1 Blank). 30s viewing, 4m writing per slide. All images are retrieved from authorized board sets.</p>
             ) : (
               <p>• Spontaneous responses required. Quality and speed are being assessed by the psychologists.</p>
             )}
           </div>
        </div>
        <button onClick={startTest} disabled={isLoading} className="bg-slate-900 text-white px-16 py-6 rounded-full font-black text-lg hover:bg-black transition-all shadow-2xl uppercase tracking-widest flex items-center justify-center gap-6 mx-auto">
          {isLoading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
          Begin Test
        </button>
      </div>
    );
  }

  if (phase === PsychologyPhase.PREPARING_STIMULI) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-12">
        <Loader2 className="w-32 h-32 text-slate-900 animate-spin" />
        <div className="text-center">
           <p className="text-slate-900 font-black uppercase tracking-[0.5em] text-sm mb-4">Retrieving {activeSetName || 'Authorized'} Set</p>
           <p className="text-slate-400 text-xs font-bold italic">Assembling board materials from secure database...</p>
        </div>
      </div>
    );
  }

  if (phase === PsychologyPhase.VIEWING || phase === PsychologyPhase.WRITING) {
    const currentItem = items[currentIndex];
    const isTAT = type === TestType.TAT;
    const imageUrl = isTAT ? (currentItem.id === 'tat-12-blank' ? 'BLANK' : pregeneratedImages[currentItem.id]) : null;

    return (
      <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700 relative">
        {/* Admin Skip Button */}
        {isAdmin && timeLeft > 0 && (
            <button 
                onClick={() => setTimeLeft(0)}
                className="fixed bottom-6 right-6 z-[100] bg-red-600 text-white pl-4 pr-6 py-3 rounded-full font-black text-[10px] uppercase shadow-2xl hover:bg-red-700 transition-all flex items-center gap-2 border-4 border-white animate-pulse hover:animate-none"
            >
                <FastForward size={14} fill="currentColor" /> Admin Skip
            </button>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center gap-6">
             <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center"><Target size={24} /></div>
             <div><p className="text-[10px] font-black uppercase text-slate-400">Progress</p><p className="text-xl font-black">{currentIndex + 1} of {items.length}</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center justify-center">
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Set: {activeSetName || 'Standard'}</p>
             <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full bg-blue-600" style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }} />
             </div>
          </div>
          
          {(isTAT && phase === PsychologyPhase.VIEWING) ? (
             <div className="p-6 rounded-[2.5rem] shadow-xl border-4 border-blue-100 bg-blue-50 flex items-center justify-center">
                <div className="flex items-center gap-3 text-blue-600/50">
                   <Eye size={24} className="animate-pulse" />
                   <p className="text-xs font-black uppercase tracking-[0.2em]">Observing</p>
                </div>
             </div>
          ) : (
            <div className={`p-6 rounded-[2.5rem] shadow-xl border-4 transition-all ${timeLeft < 10 ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-white'}`}>
               <div className="flex items-center justify-between">
                  <Timer size={32} />
                  <p className="text-2xl font-black font-mono">{formatTime(timeLeft)}</p>
               </div>
            </div>
          )}
        </div>

        {isTAT && phase === PsychologyPhase.VIEWING && (
          <div className="animate-in zoom-in duration-500">
             <div className="relative rounded-[4rem] overflow-hidden shadow-2xl border-[15px] border-white ring-1 ring-slate-200 bg-white min-h-[60vh] flex items-center justify-center">
                {imageUrl === 'BLANK' ? (
                  <div className="text-center p-40">
                     <div className="text-slate-100 font-black text-[10rem] uppercase tracking-[0.5em] opacity-20 transform -rotate-12">BLANK</div>
                     <p className="text-slate-400 font-black uppercase tracking-[0.6em] text-xl mt-8">Prepare Final Story</p>
                  </div>
                ) : (
                  <img src={imageUrl!} className="mx-auto w-full max-h-[75vh] object-contain grayscale contrast-[1.4]" alt="Stimulus" />
                )}
                <div className="absolute top-10 left-10 bg-black/70 backdrop-blur-3xl px-10 py-4 rounded-full text-white font-black text-[10px] uppercase tracking-[0.4em]">VIEWING PHASE: 30S</div>
             </div>
          </div>
        )}

        {isTAT && phase === PsychologyPhase.WRITING && (
          <div className="bg-slate-950 p-32 rounded-[4rem] flex flex-col items-center justify-center text-center space-y-12 shadow-2xl relative overflow-hidden min-h-[50vh]">
             <FileText className="text-blue-500 w-24 h-24 animate-pulse" />
             <div className="space-y-6">
                <h3 className="text-6xl font-black text-white uppercase tracking-tighter">Writing Phase</h3>
                <p className="text-slate-400 text-2xl font-medium italic opacity-80">Story #{currentIndex + 1}</p>
             </div>
          </div>
        )}

        {!isTAT && (
           <div className="bg-white rounded-[4rem] p-40 text-center shadow-2xl border-2 border-slate-50 min-h-[60vh] flex flex-col items-center justify-center">
              <h1 className={`${type === TestType.WAT ? 'text-[8rem] uppercase' : 'text-5xl italic'} font-black text-slate-900 tracking-tight`}>
                {type === TestType.WAT ? currentItem.content : `"${currentItem.content}"`}
              </h1>
           </div>
        )}
      </div>
    );
  }

  if (phase === PsychologyPhase.UPLOADING_STORIES) {
    return (
      <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in slide-in-from-bottom-20">
         <div className="text-center space-y-6">
            <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Dossier Submission</h2>
            <p className="text-slate-500 text-xl font-medium italic">"Upload images of your handwritten stories. Review text before submitting."</p>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept="image/*" />
            {tatUploads.map((file, i) => (
              <div key={i} className={`aspect-[4/5] rounded-[2rem] border-2 transition-all relative overflow-hidden group ${file ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white hover:border-slate-900'}`}>
                 {file ? (
                   <>
                     <img src={`data:image/jpeg;base64,${file}`} className="w-full h-full object-cover opacity-80" alt={`Story ${i+1}`} />
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <button 
                          onClick={() => setEditingIndex(i)}
                          className="px-4 py-2 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                        >
                          <Edit size={12} /> Review
                        </button>
                        <button 
                          onClick={() => handleFileSelect(i)}
                          className="px-4 py-2 bg-slate-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-600 transition-all flex items-center gap-2"
                        >
                          <RefreshCw size={12} /> Replace
                        </button>
                     </div>
                     {transcribingIndices.includes(i) && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                           <Loader2 className="animate-spin text-slate-900 mb-2" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Scanning...</span>
                        </div>
                     )}
                   </>
                 ) : (
                   <div onClick={() => handleFileSelect(i)} className="flex flex-col items-center justify-center h-full space-y-4 cursor-pointer">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><Upload size={16} /></div>
                      <span className="text-xs font-black uppercase text-slate-400">Story {i+1}</span>
                   </div>
                 )}
              </div>
            ))}
         </div>
         <div className="flex justify-center">
            <button onClick={submitDossier} disabled={tatUploads.some(u => !u)} className="px-20 py-7 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest hover:bg-black transition-all shadow-2xl disabled:opacity-50">
              Submit Dossier
            </button>
         </div>

         {/* EDIT MODAL */}
         {editingIndex !== null && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in">
               <div className="bg-white w-full max-w-6xl h-[80vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row">
                  {/* Left: Image */}
                  <div className="w-full md:w-1/2 bg-slate-100 p-8 flex flex-col relative">
                     <div className="absolute top-6 left-6 bg-white/80 backdrop-blur px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-sm">
                       Story {editingIndex + 1} Original
                     </div>
                     <img 
                       src={`data:image/jpeg;base64,${tatUploads[editingIndex]}`} 
                       className="w-full h-full object-contain rounded-2xl"
                       alt="Handwritten"
                     />
                  </div>
                  {/* Right: Editor */}
                  <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col bg-white">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-3">
                           <Edit className="text-blue-600" /> Digital Transcript
                        </h3>
                        <button onClick={() => setEditingIndex(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                           <X size={24} />
                        </button>
                     </div>
                     <p className="text-xs text-slate-500 font-medium mb-4">
                       Verify the AI transcription below. Correct any mistakes before submission.
                     </p>
                     <textarea 
                        value={tatTexts[editingIndex]}
                        onChange={(e) => {
                           const newVal = e.target.value;
                           setTatTexts(prev => {
                              const next = [...prev];
                              next[editingIndex] = newVal;
                              return next;
                           });
                        }}
                        className="flex-1 w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] resize-none focus:bg-white focus:border-blue-600 outline-none transition-all font-medium text-lg leading-relaxed shadow-inner"
                        placeholder="Waiting for transcription..."
                     />
                     <button 
                       onClick={() => setEditingIndex(null)}
                       className="mt-6 w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3"
                     >
                       <Save size={16} /> Save Correction
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
    );
  }

  if (phase === PsychologyPhase.EVALUATING) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-12">
        <Loader2 className="w-24 h-24 text-slate-900 animate-spin" />
        <p className="text-slate-900 font-black uppercase tracking-[0.5em] text-sm">Psychometric Evaluation...</p>
      </div>
    );
  }

  if (phase === PsychologyPhase.COMPLETED) {
    return (
      <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in duration-1000">
        <div className="bg-slate-950 p-16 rounded-[4rem] text-white shadow-2xl flex justify-between items-center">
           <div className="space-y-6">
              <span className="bg-purple-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Psychology Report</span>
              <h2 className="text-7xl font-black uppercase tracking-tighter">Evaluation <span className="text-purple-500">Complete</span></h2>
              <p className="text-slate-400 text-lg italic opacity-80">"{feedback?.recommendations || 'Report ready for board conference.'}"</p>
           </div>
           <div className="bg-white/5 p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-3xl text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">Score</p>
              <div className="text-9xl font-black text-purple-500">{feedback?.score || 0}</div>
           </div>
        </div>
        <button onClick={() => { setPhase(PsychologyPhase.IDLE); setFeedback(null); }} className="w-full py-7 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs">Return to Wing</button>
      </div>
    );
  }

  return null;
};

export default PsychologyTest;