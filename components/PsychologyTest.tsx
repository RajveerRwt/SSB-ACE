
import React, { useState, useEffect, useRef } from 'react';
import { Timer, Send, Loader2, Image as ImageIcon, CheckCircle, ShieldCheck, FileText, Target, Award, AlertCircle, Upload, Trash2, BookOpen, Layers, Brain, Eye, FastForward, Edit, X, Save, RefreshCw, PenTool, FileSignature, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { generateTestContent, evaluatePerformance, transcribeHandwrittenStory, STANDARD_WAT_SET } from '../services/geminiService';
import { getTATScenarios, getWATWords } from '../services/supabaseService';
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
  
  // TAT States
  const [tatUploads, setTatUploads] = useState<string[]>(new Array(12).fill(''));
  const [tatTexts, setTatTexts] = useState<string[]>(new Array(12).fill(''));
  const [transcribingIndices, setTranscribingIndices] = useState<number[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // SRT States (New)
  const [srtResponses, setSrtResponses] = useState<string[]>([]);

  // WAT States
  const [watResponses, setWatResponses] = useState<string[]>([]);

  // SDT States
  const [sdtData, setSdtData] = useState({
    parents: '',
    teachers: '',
    friends: '',
    self: '',
    aim: ''
  });
  
  // SDT Image States - Store base64 and mimeType
  const [sdtImages, setSdtImages] = useState<Record<string, { data: string, mimeType: string } | null>>({
    parents: null,
    teachers: null,
    friends: null,
    self: null,
    aim: null
  });

  const [feedback, setFeedback] = useState<any>(null);
  const [showScoreHelp, setShowScoreHelp] = useState(false);

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
    setFeedback(null);
    
    // SDT Logic Flow
    if (type === TestType.SDT) {
        setPhase(PsychologyPhase.WRITING);
        setTimeLeft(900); // 15 Minutes
        setIsLoading(false);
        return;
    }

    // SRT Logic Flow (Modified: Full 30 mins for all 60 items)
    if (type === TestType.SRT) {
        const data = await generateTestContent(type);
        let srtItems = data.items;
        
        // Ensure we have 60 items by repeating if necessary (Simulation)
        if (srtItems.length < 60 && srtItems.length > 0) {
             const originalLength = srtItems.length;
             while (srtItems.length < 60) {
                 const clone = { ...srtItems[srtItems.length % originalLength] };
                 clone.id = `srt-${srtItems.length}`;
                 srtItems.push(clone);
             }
        }
        
        setItems(srtItems);
        setSrtResponses(new Array(srtItems.length).fill(''));
        setPhase(PsychologyPhase.WRITING);
        setTimeLeft(1800); // 30 Minutes
        setIsLoading(false);
        return;
    }

    setPhase(PsychologyPhase.PREPARING_STIMULI);
    
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

      } else if (type === TestType.WAT) {
        // FETCH WAT FROM DB OR FALLBACK
        const dbWords = await getWATWords();
        let wordList: string[] = [];
        
        if (dbWords && dbWords.length > 0) {
            // Shuffle database words
            wordList = dbWords.map((row: any) => row.word);
            wordList = wordList.sort(() => Math.random() - 0.5);
            setActiveSetName('Custom Database Set');
        } else {
            // Use Standard Fallback
            wordList = [...STANDARD_WAT_SET];
            wordList = wordList.sort(() => Math.random() - 0.5);
            setActiveSetName('Standard Fallback Set');
        }

        // Slice to 60 words for standard test
        finalItems = wordList.slice(0, 60).map((word, index) => ({
            id: `wat-${index}`,
            content: word
        }));
        
        setWatResponses(new Array(finalItems.length).fill(''));
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
      else if (type === TestType.WAT) submitWAT(); // Auto-submit WAT when done
      else setPhase(PsychologyPhase.COMPLETED);
      return;
    }
    if (type === TestType.TAT) { setTimeLeft(30); setPhase(PsychologyPhase.VIEWING); }
    else if (type === TestType.WAT) { setTimeLeft(15); setPhase(PsychologyPhase.WRITING); }
    // SRT setupSlide logic removed as it uses global timer now
  };

  useEffect(() => {
    const isTimedPhase = phase === PsychologyPhase.VIEWING || phase === PsychologyPhase.WRITING;
    if ((type === TestType.SDT || type === TestType.SRT || (currentIndex >= 0 && currentIndex < items.length)) && isTimedPhase && timeLeft >= 0) {
      if (timeLeft > 0) {
        timerRef.current = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
      } else {
        handleTimerEnd();
      }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, currentIndex, phase, type]);

  const handleTimerEnd = () => {
    if (type === TestType.SDT) {
       playBuzzer(300, 1.0);
       submitSDT();
       return;
    }

    if (type === TestType.SRT) {
       playBuzzer(300, 1.0);
       submitSRT();
       return;
    }

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
        else if (type === TestType.WAT) submitWAT();
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

  const handleSDTImageUpload = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              setSdtImages(prev => ({
                  ...prev, 
                  [key]: { data: base64, mimeType: file.type }
              }));
          };
          reader.readAsDataURL(file);
      }
  };

  const submitSDT = async () => {
      setPhase(PsychologyPhase.EVALUATING);
      try {
          const result = await evaluatePerformance(type, { sdtData, sdtImages });
          setFeedback(result);
          if (onSave) onSave({ ...result, sdtData, sdtImages });
          setPhase(PsychologyPhase.COMPLETED);
      } catch (err) {
          console.error("SDT Eval Error", err);
          // Fallback to avoid getting stuck
          setPhase(PsychologyPhase.COMPLETED);
      }
  };

  const submitSRT = async () => {
      setPhase(PsychologyPhase.EVALUATING);
      try {
          const payload = {
              testType: 'SRT',
              srtResponses: items.map((item, i) => ({ 
                  id: i + 1, 
                  situation: item.content, 
                  response: srtResponses[i] || "" 
              }))
          };
          const result = await evaluatePerformance(type, payload);
          setFeedback(result);
          if (onSave) onSave({ ...result, srtResponses });
          setPhase(PsychologyPhase.COMPLETED);
      } catch (err) {
          console.error("SRT Eval Error", err);
          setPhase(PsychologyPhase.COMPLETED);
      }
  };

  const submitWAT = async () => {
      setPhase(PsychologyPhase.EVALUATING);
      try {
          const payload = {
              testType: 'WAT',
              watResponses: items.map((item, i) => ({ 
                  id: i + 1, 
                  word: item.content, 
                  response: watResponses[i] || "" 
              }))
          };
          const result = await evaluatePerformance(type, payload);
          setFeedback(result);
          if (onSave) onSave({ ...result, watResponses });
          setPhase(PsychologyPhase.COMPLETED);
      } catch (err) {
          console.error("WAT Eval Error", err);
          setPhase(PsychologyPhase.COMPLETED);
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

  // --- RENDER LOGIC ---

  if (phase === PsychologyPhase.IDLE) {
    return (
      <div className="bg-white p-12 md:p-24 rounded-[3rem] md:rounded-[4rem] shadow-2xl border-4 border-slate-50 text-center max-w-4xl mx-auto ring-1 ring-slate-100 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 md:w-28 md:h-28 bg-slate-900 text-yellow-400 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl rotate-6 border-4 border-slate-800">
           {type === TestType.TAT ? <ImageIcon size={40}/> : type === TestType.SDT ? <FileSignature size={40} /> : <Target size={40}/>}
        </div>
        <h2 className="text-4xl md:text-5xl font-black mb-6 uppercase tracking-tighter text-slate-900">
           {type === TestType.SDT ? 'Self Description' : type === TestType.SRT ? 'Situation Reaction' : type} Test
        </h2>
        <div className="bg-slate-50 p-8 rounded-[2rem] mb-12 text-left border border-slate-200">
           <h4 className="font-black text-xs uppercase tracking-widest text-blue-600 mb-4 underline">Board Briefing:</h4>
           <div className="text-slate-600 font-medium text-sm md:text-lg leading-relaxed italic space-y-4">
             {type === TestType.TAT ? (
               <p>• 12 Pictures (11 from DB + 1 Blank). 30s viewing, 4m writing per slide. All images are retrieved from authorized board sets.</p>
             ) : type === TestType.SDT ? (
               <p>• Write 5 distinct paragraphs describing opinions of Parents, Teachers, Friends, Self, and Future Aims. Total time: 15 Minutes. Be realistic and honest.</p>
             ) : type === TestType.SRT ? (
               <p>• You have 30 minutes to attempt 60 Situations. You can skip and return to any question. Brief, action-oriented responses are expected.</p>
             ) : (
               <p>• Word Association Test. 60 Words. 15 seconds each to view and write a sentence. Spontaneity is key.</p>
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

  // --- SDT UI ---
  if (type === TestType.SDT && phase === PsychologyPhase.WRITING) {
      return (
        <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
           <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md p-6 rounded-[2rem] shadow-xl border border-slate-100 flex items-center justify-between mb-8">
              <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase">Self Description</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Be realistic. Project your true qualities.</p>
              </div>
              <div className={`px-6 py-3 rounded-2xl border-4 transition-all ${timeLeft < 60 ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-white'}`}>
                 <div className="flex items-center gap-3">
                    <Timer size={20} />
                    <span className="text-xl font-black font-mono">{formatTime(timeLeft)}</span>
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              {[
                { label: "1. What do your Parents think of you?", key: 'parents' as keyof typeof sdtData, placeholder: "My parents think I am..." },
                { label: "2. What do your Teachers / Employers think?", key: 'teachers' as keyof typeof sdtData, placeholder: "My teachers appreciate my..." },
                { label: "3. What do your Friends / Colleagues think?", key: 'friends' as keyof typeof sdtData, placeholder: "My friends find me..." },
                { label: "4. What is your own opinion of yourself?", key: 'self' as keyof typeof sdtData, placeholder: "I consider myself..." },
                { label: "5. What kind of person do you want to become?", key: 'aim' as keyof typeof sdtData, placeholder: "I want to improve..." }
              ].map((section, idx) => (
                  <div key={idx} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-md border border-slate-100 hover:border-blue-200 transition-colors">
                      <div className="flex justify-between items-center mb-4">
                          <label className="block text-sm font-black text-slate-700 uppercase tracking-wide">{section.label}</label>
                          <div className="flex items-center gap-2">
                              <input 
                                type="file" 
                                id={`file-${String(section.key)}`} 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => handleSDTImageUpload(e, String(section.key))} 
                              />
                              
                              {sdtImages[section.key] ? (
                                  <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                                      <ImageIcon size={14} className="text-green-600" />
                                      <span className="text-[10px] font-bold text-green-700 uppercase">Image Attached</span>
                                      <button 
                                        onClick={() => setSdtImages(prev => ({...prev, [section.key]: null}))}
                                        className="ml-1 p-1 hover:bg-red-100 rounded-full text-red-500 transition-colors"
                                      >
                                          <Trash2 size={12} />
                                      </button>
                                  </div>
                              ) : (
                                  <label 
                                    htmlFor={`file-${String(section.key)}`}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl cursor-pointer transition-all text-[10px] font-bold uppercase tracking-wide"
                                  >
                                      <Upload size={12} /> Upload Handwritten
                                  </label>
                              )}
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                          <textarea 
                            value={sdtData[section.key]}
                            onChange={(e) => setSdtData({...sdtData, [section.key]: e.target.value})}
                            placeholder={section.placeholder}
                            className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                          />
                          {sdtImages[section.key] && (
                              <div className="h-40 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden relative group">
                                  <img 
                                    src={`data:${sdtImages[section.key]?.mimeType};base64,${sdtImages[section.key]?.data}`} 
                                    alt="Upload Preview" 
                                    className="w-full h-full object-contain p-2"
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                      <span className="text-white text-xs font-bold uppercase tracking-widest">Image Included</span>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              ))}
           </div>

           <div className="mt-8 flex justify-center">
              <button 
                onClick={() => { playBuzzer(300, 0.5); submitSDT(); }}
                className="px-16 py-6 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all hover:scale-105"
              >
                Submit Description
              </button>
           </div>
        </div>
      );
  }

  // --- SRT WRITING UI (List View) ---
  if (type === TestType.SRT && phase === PsychologyPhase.WRITING) {
      return (
        <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
           {/* Sticky Header */}
           <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md p-4 md:p-6 rounded-[2rem] shadow-xl border border-slate-100 flex items-center justify-between mb-8 transition-all">
              <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Situation Reaction Test</h3>
                  <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                     <span>Total: {items.length}</span>
                     <span>Attempted: {srtResponses.filter(r => r.trim()).length}</span>
                  </div>
              </div>
              <div className="flex items-center gap-4">
                  <div className={`px-5 py-2 md:px-6 md:py-3 rounded-2xl border-4 transition-all ${timeLeft < 300 ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-white'}`}>
                     <div className="flex items-center gap-3">
                        <Timer size={20} />
                        <span className="text-lg md:text-xl font-black font-mono">{formatTime(timeLeft)}</span>
                     </div>
                  </div>
                  <button 
                    onClick={() => { playBuzzer(300, 0.5); submitSRT(); }}
                    className="hidden md:flex bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg items-center gap-2"
                  >
                    <CheckCircle size={16} /> Submit
                  </button>
              </div>
           </div>

           {/* List of SRTs */}
           <div className="space-y-4">
              {items.map((item, idx) => (
                  <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group relative">
                      <div className="flex gap-4">
                          <span className="text-slate-300 font-black text-2xl select-none">{(idx + 1).toString().padStart(2, '0')}</span>
                          <div className="flex-1 space-y-3">
                              <p className="text-lg font-bold text-slate-800 leading-snug">{item.content}</p>
                              <input 
                                type="text"
                                value={srtResponses[idx]}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSrtResponses(prev => {
                                        const next = [...prev];
                                        next[idx] = val;
                                        return next;
                                    });
                                }}
                                placeholder="Type your reaction..."
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-700"
                              />
                          </div>
                      </div>
                      {/* Completion Indicator */}
                      {srtResponses[idx] && srtResponses[idx].trim() && (
                          <div className="absolute top-6 right-6 text-green-500 animate-in fade-in zoom-in">
                              <CheckCircle size={20} />
                          </div>
                      )}
                  </div>
              ))}
           </div>

           {/* Mobile Submit FAB */}
           <div className="fixed bottom-6 right-6 md:hidden z-30">
              <button 
                onClick={() => { playBuzzer(300, 0.5); submitSRT(); }}
                className="bg-green-600 text-white p-4 rounded-full shadow-2xl hover:bg-green-700 transition-all"
              >
                <CheckCircle size={24} />
              </button>
           </div>
           
           {/* Admin Skip */}
           {isAdmin && (
             <button 
                onClick={() => setTimeLeft(0)}
                className="fixed bottom-6 left-6 z-[100] bg-red-600 text-white pl-4 pr-6 py-3 rounded-full font-black text-[10px] uppercase shadow-2xl hover:bg-red-700 transition-all flex items-center gap-2 border-4 border-white animate-pulse hover:animate-none"
             >
                 <FastForward size={14} fill="currentColor" /> Admin Skip
             </button>
           )}
        </div>
      );
  }

  // --- TAT/WAT VIEWING/WRITING ---
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
           <div className="bg-white rounded-[4rem] p-40 text-center shadow-2xl border-2 border-slate-50 min-h-[60vh] flex flex-col items-center justify-center relative">
              <h1 className={`${type === TestType.WAT ? 'text-[8rem] uppercase' : 'text-5xl italic'} font-black text-slate-900 tracking-tight`}>
                {type === TestType.WAT ? currentItem.content : `"${currentItem.content}"`}
              </h1>
              {type === TestType.WAT && (
                  <input 
                    type="text" 
                    value={watResponses[currentIndex]}
                    onChange={(e) => {
                        const val = e.target.value;
                        setWatResponses(prev => {
                            const next = [...prev];
                            next[currentIndex] = val;
                            return next;
                        });
                    }}
                    placeholder="Type spontaneous thought..."
                    className="mt-12 w-full max-w-2xl bg-slate-50 p-6 text-xl md:text-2xl font-bold text-center border-b-4 border-slate-300 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300"
                    autoFocus
                  />
              )}
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
    // SPECIAL UI FOR WAT & SRT: Comparison Table
    if (type === TestType.WAT || type === TestType.SRT) {
       const isWAT = type === TestType.WAT;
       const responseList = feedback?.detailedComparison || [];

       return (
         <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
            <div className="text-center space-y-4 py-8">
               <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-200 shadow-xl">
                  <CheckCircle size={32} />
               </div>
               <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter">Test <span className="text-green-600">Debrief</span></h2>
               <p className="text-slate-500 font-medium">Comparison with Officer Like Responses</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md">
                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Your Score</p>
                    <p className="text-4xl font-black text-slate-900 mt-2">{feedback?.score || "N/A"}</p>
                </div>
                <div className="md:col-span-2 bg-slate-900 p-6 rounded-3xl shadow-xl text-white">
                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Psychologist's Remark</p>
                    <p className="text-sm md:text-base font-medium leading-relaxed italic">"{feedback?.recommendations || "Good effort. Review the suggestions below."}"</p>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
               <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-6 font-black text-xs uppercase tracking-widest text-slate-500 w-16">#</th>
                        <th className="p-6 font-black text-xs uppercase tracking-widest text-slate-500 w-1/4">{isWAT ? "Stimulus Word" : "Situation"}</th>
                        <th className="p-6 font-black text-xs uppercase tracking-widest text-slate-500 w-1/3">Your Response</th>
                        <th className="p-6 font-black text-xs uppercase tracking-widest text-green-600 w-1/3">Recommended (Officer Like)</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {responseList.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                           <td className="p-6 font-bold text-slate-400">{i + 1}</td>
                           <td className="p-6 font-bold text-slate-800">{item.stimulus}</td>
                           <td className="p-6 text-sm font-medium text-slate-600">
                              {item.userResponse ? (
                                  item.userResponse
                              ) : (
                                  <span className="text-red-400 italic text-xs">Skipped / No Response</span>
                              )}
                           </td>
                           <td className="p-6 text-sm font-bold text-green-700 bg-green-50/30 border-l border-green-50">
                              {item.idealResponse}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
               </div>
            </div>

            <button 
              onClick={() => { setPhase(PsychologyPhase.IDLE); setFeedback(null); setSrtResponses([]); setWatResponses([]); }}
              className="w-full py-6 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl"
            >
              Return to Dashboard
            </button>
         </div>
       );
    }

    return (
      <div className="max-w-7xl mx-auto space-y-12 pb-20 animate-in fade-in duration-1000">
        <div className="bg-slate-950 p-16 rounded-[4rem] text-white shadow-2xl flex justify-between items-center">
           <div className="space-y-6">
              <span className="bg-purple-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Psychology Report</span>
              <h2 className="text-7xl font-black uppercase tracking-tighter">Evaluation <span className="text-purple-500">Complete</span></h2>
              <p className="text-slate-400 text-lg italic opacity-80 max-w-2xl">"{feedback?.recommendations || 'Report ready for board conference.'}"</p>
           </div>
           <div className="bg-white/5 p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-3xl text-center hidden md:block">
              <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">Score</p>
              <div className="text-9xl font-black text-purple-500">{feedback?.score || 0}</div>
              
              <button 
                onClick={() => setShowScoreHelp(!showScoreHelp)}
                className="mt-6 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white transition-colors"
              >
                  <HelpCircle size={14} /> Understand Score {showScoreHelp ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
              </button>
           </div>
        </div>

        {/* SCORE EXPLANATION */}
        {showScoreHelp && (
            <div className="bg-blue-50 border border-blue-100 p-6 md:p-8 rounded-[2rem] animate-in slide-in-from-top-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-blue-800 mb-4">Board Grading Standard</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border-l-4 border-green-500 shadow-sm">
                    <span className="block text-xl font-black text-slate-900">9.0 - 10</span>
                    <span className="text-[10px] font-bold uppercase text-green-600 tracking-wider">Outstanding</span>
                    <p className="text-[10px] text-slate-500 mt-1">Exceptional OLQ demonstration. Certain recommendation.</p>
                </div>
                <div className="bg-white p-4 rounded-xl border-l-4 border-blue-500 shadow-sm">
                    <span className="block text-xl font-black text-slate-900">7.0 - 8.9</span>
                    <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">High Potential</span>
                    <p className="text-[10px] text-slate-500 mt-1">Clear pass. Good consistency in thought and expression.</p>
                </div>
                <div className="bg-white p-4 rounded-xl border-l-4 border-yellow-500 shadow-sm">
                    <span className="block text-xl font-black text-slate-900">5.0 - 6.9</span>
                    <span className="text-[10px] font-bold uppercase text-yellow-600 tracking-wider">Borderline</span>
                    <p className="text-[10px] text-slate-500 mt-1">Average. Needs significant polish in planning or confidence.</p>
                </div>
                <div className="bg-white p-4 rounded-xl border-l-4 border-red-500 shadow-sm">
                    <span className="block text-xl font-black text-slate-900">&lt; 5.0</span>
                    <span className="text-[10px] font-bold uppercase text-red-600 tracking-wider">Below Average</span>
                    <p className="text-[10px] text-slate-500 mt-1">Foundation weak. Requires introspection and practice.</p>
                </div>
            </div>
            </div>
        )}

        {/* SDT Consistency Check */}
        {type === TestType.SDT && feedback?.consistencyAnalysis && (
            <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-xl">
               <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4 mb-6">
                  <Brain className="text-purple-600" /> Consistency Analysis
               </h3>
               <p className="text-lg text-slate-600 leading-relaxed font-medium">{feedback.consistencyAnalysis}</p>
            </div>
        )}

        {/* Individual Story Analysis for TAT */}
        {type === TestType.TAT && feedback?.individualStories && (
            <div className="space-y-8">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4 px-4">
                    <Layers className="text-purple-600" /> Story-wise Assessment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {feedback.individualStories.map((story: any, i: number) => (
                        <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg hover:shadow-xl transition-all relative overflow-hidden flex flex-col h-full">
                            <div className="absolute top-0 left-0 w-full h-2 bg-slate-100" />
                            {story.perceivedAccurately ? (
                                <div className="absolute top-0 left-0 w-full h-2 bg-green-500" />
                            ) : (
                                <div className="absolute top-0 left-0 w-full h-2 bg-orange-500" />
                            )}
                            
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Story {story.storyIndex}</span>
                                {story.perceivedAccurately ? (
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-green-600 uppercase tracking-wide"><CheckCircle size={12} /> Aligned</span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-orange-500 uppercase tracking-wide"><AlertCircle size={12} /> Drift</span>
                                )}
                            </div>

                            <div className="mb-4">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Theme</p>
                                <h4 className="text-base font-bold text-slate-900 leading-tight">{story.theme || "No Theme Identified"}</h4>
                            </div>

                            <div className="mb-6 flex-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Psychologist's Remark</p>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    {story.analysis || "No analysis provided."}
                                </p>
                            </div>

                            {story.olqProjected && (
                                <div className="mt-auto">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">OLQs Observed</p>
                                    <div className="flex flex-wrap gap-2">
                                        {story.olqProjected.split(',').map((olq: string, idx: number) => (
                                            <span key={idx} className="px-2 py-1 bg-purple-50 text-purple-600 text-[9px] font-bold uppercase rounded-lg border border-purple-100">
                                                {olq.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Existing generic strengths/weaknesses */}
        {feedback?.strengths && (
             <div className="grid md:grid-cols-2 gap-6 md:gap-10">
               <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border-2 border-slate-50 shadow-2xl">
                  <h4 className="font-black text-xs uppercase tracking-[0.3em] text-green-600 mb-8 md:mb-10 flex items-center gap-4"><CheckCircle className="w-6 h-6" /> Key Strengths</h4>
                  <div className="space-y-4 md:space-y-5">
                    {feedback.strengths.map((s: string, i: number) => (
                      <div key={i} className="flex gap-4 md:gap-5 p-4 md:p-5 bg-green-50 rounded-2xl md:rounded-3xl border border-green-100 text-slate-800 text-sm font-bold">
                        <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-500 shrink-0" /> {s}
                      </div>
                    ))}
                  </div>
               </div>
               <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border-2 border-slate-50 shadow-2xl">
                  <h4 className="font-black text-xs uppercase tracking-[0.3em] text-red-500 mb-8 md:mb-10 flex items-center gap-4"><AlertCircle className="w-6 h-6" /> Areas of Improvement</h4>
                  <div className="space-y-4 md:space-y-5">
                    {feedback.weaknesses.map((w: string, i: number) => (
                      <div key={i} className="flex gap-4 md:gap-5 p-4 md:p-5 bg-red-50 rounded-2xl md:rounded-3xl border border-red-100 text-slate-800 text-sm font-bold">
                        <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-red-500 shrink-0" /> {w}
                      </div>
                    ))}
                  </div>
               </div>
            </div>
        )}

        <button onClick={() => { setPhase(PsychologyPhase.IDLE); setFeedback(null); setSdtData({ parents: '', teachers: '', friends: '', self: '', aim: '' }); setSdtImages({ parents: null, teachers: null, friends: null, self: null, aim: null }); setShowScoreHelp(false); setSrtResponses([]); setWatResponses([]); }} className="w-full py-7 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl">Return to Wing</button>
      </div>
    );
  }

  return null;
};

export default PsychologyTest;
