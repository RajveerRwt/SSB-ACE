
import React, { useState, useEffect, useRef } from 'react';
import { Timer, Send, Loader2, Image as ImageIcon, CheckCircle, ShieldCheck, FileText, Target, Award, AlertCircle, Upload, Trash2, BookOpen, Layers, Brain, Eye, FastForward, Edit, X, Save, RefreshCw, PenTool, FileSignature, HelpCircle, ChevronDown, ChevronUp, ScanEye, Activity } from 'lucide-react';
import { generateTestContent, evaluatePerformance, transcribeHandwrittenStory, STANDARD_WAT_SET } from '../services/geminiService';
import { getTATScenarios, getWATWords, getSRTQuestions } from '../services/supabaseService';
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
  
  // SRT States
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
  
  // SDT Image States
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
        const dbWords = await getWATWords();
        let wordList: string[] = [];
        
        if (dbWords && dbWords.length > 0) {
            const sets: Record<string, string[]> = dbWords.reduce((acc: any, row: any) => {
                const tag = row.set_tag || 'General';
                if (!acc[tag]) acc[tag] = [];
                acc[tag].push(row.word);
                return acc;
            }, {});

            const setNames = Object.keys(sets);
            const idealSets = setNames.filter(name => sets[name].length === 60);
            const selectedSetName = idealSets.length > 0
                ? idealSets[Math.floor(Math.random() * idealSets.length)]
                : setNames[Math.floor(Math.random() * setNames.length)];
            
            setActiveSetName(selectedSetName);
            wordList = sets[selectedSetName];
            if (selectedSetName === 'General') {
               wordList = wordList.sort(() => Math.random() - 0.5);
            }
        } else {
            wordList = [...STANDARD_WAT_SET];
            wordList = wordList.sort(() => Math.random() - 0.5);
            setActiveSetName('Standard Fallback Set');
        }

        finalItems = wordList.slice(0, 60).map((word, index) => ({
            id: `wat-${index}`,
            content: word
        }));
        
        setWatResponses(new Array(finalItems.length).fill(''));
      } else if (type === TestType.SRT) {
        const dbQuestions = await getSRTQuestions();
        let srtList: string[] = [];

        if (dbQuestions && dbQuestions.length > 0) {
            const sets: Record<string, string[]> = dbQuestions.reduce((acc: any, row: any) => {
                const tag = row.set_tag || 'General';
                if (!acc[tag]) acc[tag] = [];
                acc[tag].push(row.question);
                return acc;
            }, {});

            const setNames = Object.keys(sets);
            const selectedSetName = setNames[Math.floor(Math.random() * setNames.length)];
            setActiveSetName(selectedSetName);
            srtList = sets[selectedSetName];
            if (selectedSetName === 'General') {
                srtList = srtList.sort(() => Math.random() - 0.5);
            }
        } else {
            const data = await generateTestContent(type);
            srtList = data.items.map((i: any) => i.content);
            setActiveSetName('Standard Fallback Set');
        }

        if (srtList.length < 60) {
             const originalLength = srtList.length;
             let i = 0;
             while (srtList.length < 60) {
                 srtList.push(srtList[i % originalLength]);
                 i++;
             }
        } else {
            srtList = srtList.slice(0, 60);
        }

        finalItems = srtList.map((q, index) => ({
            id: `srt-${index}`,
            content: q
        }));
        
        setSrtResponses(new Array(finalItems.length).fill(''));
        setItems(finalItems);
        setPhase(PsychologyPhase.WRITING);
        setTimeLeft(1800);
        setIsLoading(false);
        return; 
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
      else if (type === TestType.WAT) submitWAT();
      else setPhase(PsychologyPhase.COMPLETED);
      return;
    }
    if (type === TestType.TAT) { setTimeLeft(30); setPhase(PsychologyPhase.VIEWING); }
    else if (type === TestType.WAT) { setTimeLeft(15); setPhase(PsychologyPhase.WRITING); }
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
    if (type === TestType.SDT) { playBuzzer(300, 1.0); submitSDT(); return; }
    if (type === TestType.SRT) { playBuzzer(300, 1.0); submitSRT(); return; }

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
        setTatUploads(prev => { const next = [...prev]; next[index] = base64; return next; });
        activeUploadIndex.current = null;
        setTranscribingIndices(prev => [...prev, index]);
        try {
            const text = await transcribeHandwrittenStory(base64, file.type);
            setTatTexts(prev => { const next = [...prev]; next[index] = text; return next; });
        } catch (err) { console.error("Transcription Failed", err); } finally { setTranscribingIndices(prev => prev.filter(i => i !== index)); }
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
              setSdtImages(prev => ({ ...prev, [key]: { data: base64, mimeType: file.type } }));
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
          setPhase(PsychologyPhase.COMPLETED);
      }
  };

  const submitSRT = async () => {
      setPhase(PsychologyPhase.EVALUATING);
      try {
          const payload = { testType: 'SRT', srtResponses: items.map((item, i) => ({ id: i + 1, situation: item.content, response: srtResponses[i] || "" })) };
          const result = await evaluatePerformance(type, payload);
          setFeedback(result);
          if (onSave) onSave({ ...result, srtResponses });
          setPhase(PsychologyPhase.COMPLETED);
      } catch (err) { console.error("SRT Eval Error", err); setPhase(PsychologyPhase.COMPLETED); }
  };

  const submitWAT = async () => {
      setPhase(PsychologyPhase.EVALUATING);
      try {
          const payload = { testType: 'WAT', watResponses: items.map((item, i) => ({ id: i + 1, word: item.content, response: watResponses[i] || "" })) };
          const result = await evaluatePerformance(type, payload);
          setFeedback(result);
          if (onSave) onSave({ ...result, watResponses });
          setPhase(PsychologyPhase.COMPLETED);
      } catch (err) { console.error("WAT Eval Error", err); setPhase(PsychologyPhase.COMPLETED); }
  };

  const submitDossier = async () => {
    setPhase(PsychologyPhase.EVALUATING);
    try {
      const tatPairs = await Promise.all(items.map(async (item, index) => {
        const userStoryImage = tatUploads[index];
        if (!userStoryImage) return null;
        let stimulusBase64: string | undefined = undefined;
        const url = pregeneratedImages[item.id];
        if (url && item.id !== 'tat-12-blank') {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                stimulusBase64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(blob);
                });
            } catch (e) { console.warn("Could not fetch stimulus image for AI context:", e); }
        }
        return { storyIndex: index + 1, stimulusImage: stimulusBase64, stimulusDesc: item.content, userStoryImage: userStoryImage, userStoryText: tatTexts[index] };
      }));
      const validPairs = tatPairs.filter(p => p !== null);
      const result = await evaluatePerformance(type, { tatPairs: validPairs, testType: type, itemCount: items.length });
      setFeedback(result);
      if (onSave) onSave({ ...result, tatImages: tatUploads });
      setPhase(PsychologyPhase.COMPLETED);
    } catch (err) { console.error("Evaluation error:", err); setPhase(PsychologyPhase.UPLOADING_STORIES); }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
               <p>• Word Association Test. 60 Words. 15 seconds each to view and write a spontaneous sentence.</p>
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
    return <div className="flex flex-col items-center justify-center py-40 space-y-12"><Loader2 className="w-32 h-32 text-slate-900 animate-spin" /><div className="text-center"><p className="text-slate-900 font-black uppercase tracking-[0.5em] text-sm mb-4">Retrieving {activeSetName || 'Authorized'} Set</p><p className="text-slate-400 text-xs font-bold italic">Assembling board materials from secure database...</p></div></div>;
  }

  if (type === TestType.SDT && phase === PsychologyPhase.WRITING) {
      return (
        <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
           <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md p-6 rounded-[2rem] shadow-xl border border-slate-100 flex items-center justify-between mb-8">
              <div><h3 className="text-2xl font-black text-slate-900 uppercase">Self Description</h3><p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Be realistic. Project your true qualities.</p></div>
              <div className={`px-6 py-3 rounded-2xl border-4 transition-all ${timeLeft < 60 ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-white'}`}><div className="flex items-center gap-3"><Timer size={20} /><span className="text-xl font-black font-mono">{formatTime(timeLeft)}</span></div></div>
           </div>
           <div className="space-y-6">
              {[
                { label: "1. What do your Parents think of you?", key: 'parents' },
                { label: "2. What do your Teachers / Employers think?", key: 'teachers' },
                { label: "3. What do your Friends / Colleagues think?", key: 'friends' },
                { label: "4. What is your own opinion of yourself?", key: 'self' },
                { label: "5. What kind of person do you want to become?", key: 'aim' }
              ].map((section, idx) => (
                  <div key={idx} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-md border border-slate-100 hover:border-blue-200 transition-colors">
                      <div className="flex justify-between items-center mb-4">
                          <label className="block text-sm font-black text-slate-700 uppercase tracking-wide">{section.label}</label>
                          <div className="flex items-center gap-2">
                              <input type="file" id={`file-${String(section.key)}`} className="hidden" accept="image/*" onChange={(e) => handleSDTImageUpload(e, String(section.key))} />
                              {sdtImages[section.key as keyof typeof sdtData] ? <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100"><ImageIcon size={14} className="text-green-600" /><span className="text-[10px] font-bold text-green-700 uppercase">Image Attached</span><button onClick={() => setSdtImages(prev => ({...prev, [section.key]: null}))} className="ml-1 p-1 hover:bg-red-100 rounded-full text-red-500 transition-colors"><Trash2 size={12} /></button></div> : <label htmlFor={`file-${String(section.key)}`} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl cursor-pointer transition-all text-[10px] font-bold uppercase tracking-wide"><Upload size={12} /> Upload Handwritten</label>}
                          </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                          <textarea value={sdtData[section.key as keyof typeof sdtData]} onChange={(e) => setSdtData({...sdtData, [section.key]: e.target.value})} className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700" />
                          {sdtImages[section.key as keyof typeof sdtData] && (<div className="h-40 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden relative group"><img src={`data:${sdtImages[section.key as keyof typeof sdtData]?.mimeType};base64,${sdtImages[section.key as keyof typeof sdtData]?.data}`} alt="Upload Preview" className="w-full h-full object-contain p-2" /><div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"><span className="text-white text-xs font-bold uppercase tracking-widest">Image Included</span></div></div>)}
                      </div>
                  </div>
              ))}
           </div>
           <div className="mt-8 flex justify-center"><button onClick={() => { playBuzzer(300, 0.5); submitSDT(); }} className="px-16 py-6 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all hover:scale-105">Submit Description</button></div>
        </div>
      );
  }

  if (type === TestType.SRT && phase === PsychologyPhase.WRITING) {
      return (
        <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
           <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md p-4 md:p-6 rounded-[2rem] shadow-xl border border-slate-100 flex items-center justify-between mb-8 transition-all">
              <div><h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Situation Reaction Test</h3><div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1"><span>Set: {activeSetName}</span><span>Attempted: {srtResponses.filter(r => r.trim()).length}/{items.length}</span></div></div>
              <div className="flex items-center gap-4"><div className={`px-5 py-2 md:px-6 md:py-3 rounded-2xl border-4 transition-all ${timeLeft < 300 ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-white'}`}><div className="flex items-center gap-3"><Timer size={20} /><span className="text-lg md:text-xl font-black font-mono">{formatTime(timeLeft)}</span></div></div><button onClick={() => { playBuzzer(300, 0.5); submitSRT(); }} className="hidden md:flex bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg items-center gap-2"><CheckCircle size={16} /> Submit</button></div>
           </div>
           <div className="space-y-4">{items.map((item, idx) => (<div key={item.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group relative"><div className="flex gap-4"><span className="text-slate-300 font-black text-2xl select-none">{(idx + 1).toString().padStart(2, '0')}</span><div className="flex-1 space-y-3"><p className="text-lg font-bold text-slate-800 leading-snug">{item.content}</p><input type="text" value={srtResponses[idx]} onChange={(e) => { const val = e.target.value; setSrtResponses(prev => { const next = [...prev]; next[idx] = val; return next; }); }} placeholder="Type your reaction..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-700" /></div></div>{srtResponses[idx] && srtResponses[idx].trim() && (<div className="absolute top-6 right-6 text-green-500 animate-in fade-in zoom-in"><CheckCircle size={20} /></div>)}</div>))}</div>
           <div className="fixed bottom-6 right-6 md:hidden z-30"><button onClick={() => { playBuzzer(300, 0.5); submitSRT(); }} className="bg-green-600 text-white p-4 rounded-full shadow-2xl hover:bg-green-700 transition-all"><CheckCircle size={24} /></button></div>
           {isAdmin && (<button onClick={() => setTimeLeft(0)} className="fixed bottom-6 left-6 z-[100] bg-red-600 text-white pl-4 pr-6 py-3 rounded-full font-black text-[10px] uppercase shadow-2xl hover:bg-red-700 transition-all flex items-center gap-2 border-4 border-white animate-pulse hover:animate-none"><FastForward size={14} fill="currentColor" /> Admin Skip</button>)}
        </div>
      );
  }

  if (phase === PsychologyPhase.VIEWING || phase === PsychologyPhase.WRITING) {
    const currentItem = items[currentIndex];
    const isTAT = type === TestType.TAT;
    const imageUrl = isTAT ? (currentItem.id === 'tat-12-blank' ? 'BLANK' : pregeneratedImages[currentItem.id]) : null;

    return (
      <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700 relative">
        {isAdmin && timeLeft > 0 && (<button onClick={() => setTimeLeft(0)} className="fixed bottom-6 right-6 z-[100] bg-red-600 text-white pl-4 pr-6 py-3 rounded-full font-black text-[10px] uppercase shadow-2xl hover:bg-red-700 transition-all flex items-center gap-2 border-4 border-white animate-pulse hover:animate-none"><FastForward size={14} fill="currentColor" /> Admin Skip</button>)}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center gap-6"><div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center"><Target size={24} /></div><div><p className="text-[10px] font-black uppercase text-slate-400">Progress</p><p className="text-xl font-black">{currentIndex + 1} of {items.length}</p></div></div>
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center justify-center"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Set: {activeSetName || 'Standard'}</p><div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="absolute left-0 top-0 h-full bg-blue-600" style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }} /></div></div>
          {(isTAT && phase === PsychologyPhase.VIEWING) ? (<div className="p-6 rounded-[2.5rem] shadow-xl border-4 border-blue-100 bg-blue-50 flex items-center justify-center"><div className="flex items-center gap-3 text-blue-600/50"><Eye size={24} className="animate-pulse" /><p className="text-xs font-black uppercase tracking-[0.2em]">Observing</p></div></div>) : (<div className={`p-6 rounded-[2.5rem] shadow-xl border-4 transition-all ${timeLeft < 10 ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-white'}`}><div className="flex items-center justify-between"><Timer size={32} /><p className="text-2xl font-black font-mono">{formatTime(timeLeft)}</p></div></div>)}
        </div>
        {isTAT && phase === PsychologyPhase.VIEWING && (<div className="fixed inset-0 z-[200] bg-black flex items-center justify-center animate-in fade-in duration-500 cursor-none">{imageUrl === 'BLANK' ? (<div className="text-center p-40"><div className="text-slate-800 font-black text-[10rem] uppercase tracking-[0.5em] opacity-20 transform -rotate-12">BLANK</div><p className="text-slate-500 font-black uppercase tracking-[0.6em] text-xl mt-8">Prepare Final Story</p></div>) : (<img src={imageUrl!} className="w-full h-full object-contain grayscale contrast-[1.4]" alt="Stimulus" />)}<div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900"><div className="h-full bg-slate-700 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 30) * 100}%` }} /></div></div>)}
        {isTAT && phase === PsychologyPhase.WRITING && (<div className="bg-slate-950 p-32 rounded-[4rem] flex flex-col items-center justify-center text-center space-y-12 shadow-2xl relative overflow-hidden min-h-[50vh]"><FileText className="text-blue-500 w-24 h-24 animate-pulse" /><div className="space-y-6"><h3 className="text-6xl font-black text-white uppercase tracking-tighter">Writing Phase</h3><p className="text-slate-400 text-2xl font-medium italic opacity-80">Story #{currentIndex + 1}</p></div></div>)}
        {!isTAT && (<div className="bg-white rounded-[4rem] p-40 text-center shadow-2xl border-2 border-slate-50 min-h-[60vh] flex flex-col items-center justify-center relative"><h1 className={`${type === TestType.WAT ? 'text-[8rem] uppercase' : 'text-5xl italic'} font-black text-slate-900 tracking-tight`}>{type === TestType.WAT ? currentItem.content : `"${currentItem.content}"`}</h1>{type === TestType.WAT && (<input type="text" value={watResponses[currentIndex]} onChange={(e) => { const val = e.target.value; setWatResponses(prev => { const next = [...prev]; next[currentIndex] = val; return next; }); }} placeholder="Type spontaneous thought..." className="mt-12 w-full max-w-2xl bg-slate-50 p-6 text-xl md:text-2xl font-bold text-center border-b-4 border-slate-300 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300" autoFocus />)}</div>)}
      </div>
    );
  }

  if (phase === PsychologyPhase.UPLOADING_STORIES) {
    return (
      <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in slide-in-from-bottom-20">
         <div className="text-center space-y-6"><h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Dossier Submission</h2><p className="text-slate-500 font-medium italic">"Upload your written responses for psychometric evaluation."</p></div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{items.map((item, index) => { const hasImage = !!tatUploads[index]; const hasText = !!tatTexts[index]; const isTranscribing = transcribingIndices.includes(index); return (<div key={index} className={`bg-white rounded-[2.5rem] p-6 border-2 relative overflow-hidden transition-all ${hasImage ? 'border-green-100 shadow-md' : 'border-slate-100 shadow-sm'}`}><div className="flex justify-between items-center mb-4"><span className="font-black text-slate-300 text-xl select-none">{(index + 1).toString().padStart(2, '0')}</span>{hasImage && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold uppercase">Uploaded</span>}</div>{hasImage ? (<div className="space-y-4"><div className="relative rounded-2xl overflow-hidden bg-slate-50 h-32 border border-slate-100 group"><img src={`data:image/jpeg;base64,${tatUploads[index]}`} className="w-full h-full object-cover" alt="Upload" /><button onClick={() => { setTatUploads(prev => { const n = [...prev]; n[index] = ''; return n; }); setTatTexts(prev => { const n = [...prev]; n[index] = ''; return n; }); }} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button></div>{isTranscribing ? (<div className="flex items-center gap-2 text-xs text-blue-600 font-bold animate-pulse"><Loader2 size={12} className="animate-spin" /> Transcribing...</div>) : (<div className="relative"><textarea value={tatTexts[index]} onChange={(e) => setTatTexts(prev => { const n = [...prev]; n[index] = e.target.value; return n; })} className="w-full text-[10px] p-3 bg-slate-50 rounded-xl resize-none outline-none border border-transparent focus:border-slate-200 h-20" placeholder="AI Transcript..." /><div className="absolute bottom-2 right-2 text-slate-400"><Edit size={10} /></div></div>)}</div>) : (<button onClick={() => handleFileSelect(index)} className="w-full h-40 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-all group"><Upload size={24} className="group-hover:scale-110 transition-transform" /><span className="text-[10px] font-black uppercase tracking-widest">Select Image</span></button>)}</div>); })}</div>
         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileChange} />
         <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-lg p-6 border-t border-slate-200 flex justify-center"><button onClick={submitDossier} disabled={tatUploads.filter(u => u).length === 0} className="px-16 py-5 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-2xl disabled:opacity-50">Submit for Assessment</button></div>
      </div>
    );
  }

  if (phase === PsychologyPhase.EVALUATING) {
    return <div className="flex flex-col items-center justify-center py-40 space-y-12 animate-in fade-in"><Loader2 className="w-24 h-24 text-blue-600 animate-spin" /><div className="text-center"><p className="text-slate-900 font-black uppercase tracking-[0.5em] text-sm mb-4">Psychologist Assessment</p><p className="text-slate-400 text-xs font-bold">Analyzing OLQs, projective patterns, and personality consistencies...</p></div></div>;
  }

  if (phase === PsychologyPhase.COMPLETED) {
    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-12">
            <div className="bg-slate-900 text-white p-12 md:p-16 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="space-y-4 text-center md:text-left z-10">
                    <span className="bg-yellow-400 text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Psychology Report</span>
                    <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">{type} Verdict</h2>
                    {feedback?.verdict && <p className="text-xl text-slate-300 font-medium italic">"{feedback.verdict}"</p>}
                </div>
                <div className="bg-white/10 p-8 rounded-[3rem] border border-white/10 backdrop-blur-md text-center min-w-[200px] z-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Score</span>
                    <span className="text-7xl font-black text-yellow-400">{feedback?.score || "N/A"}</span>
                </div>
            </div>

            {/* TAT: Observation & Analysis */}
            {type === TestType.TAT && feedback?.individualStories && (
                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><ScanEye size={24} /></div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Observation Analysis</h3>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Did you see what was actually there?</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {feedback.individualStories.map((story: any, i: number) => (
                            <div key={i} className={`p-6 rounded-[2rem] border-2 transition-all ${story.perceivedAccurately ? 'bg-white border-slate-100' : 'bg-red-50 border-red-200 shadow-md'} hover:shadow-xl`}>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="font-black text-slate-400 uppercase tracking-widest text-xs">Story {story.storyIndex}</span>
                                    {story.perceivedAccurately ? (
                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                            <CheckCircle size={12} /> Accurate Perception
                                        </span>
                                    ) : (
                                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                            <ScanEye size={12} /> Observation Error
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm font-bold text-slate-800 mb-3 bg-slate-100/50 p-3 rounded-xl inline-block">{story.theme || "No Theme"}</p>
                                <p className="text-xs text-slate-600 leading-relaxed p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <span className="font-black text-slate-400 uppercase tracking-widest text-[9px] block mb-2">Psychologist's Remark</span>
                                    {story.analysis}
                                </p>
                                <div className="mt-4 pt-4 border-t border-slate-100/50 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-600">
                                    <Target size={12} /> OLQ Projected: {story.olqProjected}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* WAT/SRT Detailed Comparison */}
            {(type === TestType.WAT || type === TestType.SRT) && feedback?.detailedComparison && (
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><Activity size={24} className="text-purple-600" /> Response Analysis</h3>
                    <div className="space-y-4">
                        {feedback.detailedComparison.map((item: any, i: number) => (
                            <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-md transition-all">
                                <p className="text-sm font-black text-slate-800 mb-2">{item.stimulus}</p>
                                <div className="grid md:grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Response</span>
                                        <p className={`p-3 rounded-xl ${item.userResponse ? 'bg-white border border-slate-200' : 'bg-red-50 text-red-500 border border-red-100'}`}>{item.userResponse || "Skipped / No Response"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Ideal Approach</span>
                                        <p className="p-3 bg-green-50 border border-green-100 rounded-xl text-slate-700">{item.idealResponse}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SDT Specifics */}
            {type === TestType.SDT && feedback?.consistencyAnalysis && (
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-6">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><Brain size={24} className="text-blue-600" /> Consistency Check</h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium p-6 bg-slate-50 rounded-3xl border border-slate-200">{feedback.consistencyAnalysis}</p>
                </div>
            )}

            {/* General Feedback */}
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                    <h4 className="font-black text-green-600 uppercase tracking-widest mb-6 flex items-center gap-3"><CheckCircle size={20}/> Strengths</h4>
                    <ul className="space-y-3">
                        {feedback?.strengths?.map((s: string, i: number) => (
                            <li key={i} className="text-sm font-bold text-slate-700 flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"/> {s}</li>
                        ))}
                    </ul>
                </div>
                <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                    <h4 className="font-black text-red-500 uppercase tracking-widest mb-6 flex items-center gap-3"><AlertCircle size={20}/> Areas for Improvement</h4>
                    <ul className="space-y-3">
                        {feedback?.weaknesses?.map((w: string, i: number) => (
                            <li key={i} className="text-sm font-bold text-slate-700 flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"/> {w}</li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="bg-blue-50 p-8 md:p-12 rounded-[3rem] border border-blue-100 text-center space-y-6">
                <h4 className="font-black text-blue-800 uppercase tracking-widest text-sm">Psychologist's Final Recommendation</h4>
                <p className="text-lg md:text-2xl font-medium text-blue-900 italic max-w-3xl mx-auto leading-relaxed">"{feedback?.recommendations}"</p>
            </div>

            <button onClick={() => window.location.reload()} className="w-full py-6 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest hover:bg-black transition-all shadow-2xl">Return to Barracks</button>
        </div>
    )
  }

  return null; 
};

export default PsychologyTest;
