import React, { useState, useEffect, useRef } from 'react';
import { Timer, Send, Loader2, Image as ImageIcon, CheckCircle, ShieldCheck, FileText, Target, Award, AlertCircle, Upload, Trash2, BookOpen, Layers, Brain, Eye, FastForward, Edit, X, Save, RefreshCw, PenTool, FileSignature, HelpCircle, ChevronDown, ChevronUp, ScanEye, Activity, Camera, Info, LogIn, ThumbsUp, ThumbsDown, MinusCircle, Lock, Download, Printer } from 'lucide-react';
import { generateTestContent, evaluatePerformance, transcribeHandwrittenStory, STANDARD_WAT_SET } from '../services/geminiService';
import { getTATScenarios, getWATWords, getSRTQuestions, getUserSubscription, saveAssessmentReport } from '../services/supabaseService';
import { TestType } from '../types';
import CameraModal from './CameraModal';
import SessionFeedback from './SessionFeedback';

interface PsychologyProps {
  type: TestType;
  onSave?: (result: any) => void;
  isAdmin?: boolean;
  userId?: string;
  isGuest?: boolean;
  onLoginRedirect?: () => void;
}

enum PsychologyPhase {
  IDLE,
  PREPARING_STIMULI,
  VIEWING, 
  WRITING,
  UPLOADING_STORIES, 
  UPLOADING_WAT,
  UPLOADING_SRT,
  EVALUATING,        
  COMPLETED
}

const WAT_TIPS = [ "Avoid 'I', 'Me', 'My'. Make sentences universal.", "Showcase OLQs: Courage, Cooperation, Responsibility.", "Avoid giving advice (should/could/must).", "Turn negative words into positive outcomes.", "Spontaneity is your best friend.", "Keep sentences grammatical but concise." ];
const SRT_TIPS = [ "Action is key. Do not just plan, execute.", "Prioritize: Save Life > Protect Property > Social Duty.", "Be the hero of your own situation.", "Keep responses telegraphic (short & meaningful).", "Address the root cause.", "Maintain a calm mindset in crisis." ];
const TAT_TIPS = [ "Identify the Hero clearly.", "Ensure the story has a Past, Present, and Future.", "The outcome should be positive.", "Reflect OLQs through the main character's actions." ];
const SDT_TIPS = [ "Be honest about your strengths.", "Ensure consistency with your PIQ form.", "Focus on self-improvement." ];

const PsychologyTest: React.FC<PsychologyProps> = ({ type, onSave, isAdmin, userId, isGuest = false, onLoginRedirect }) => {
  const [items, setItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [phase, setPhase] = useState<PsychologyPhase>(PsychologyPhase.IDLE);
  const [timeLeft, setTimeLeft] = useState(-1);
  const [activeSetName, setActiveSetName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pregeneratedImages, setPregeneratedImages] = useState<Record<string, string>>({});
  
  const [tatUploads, setTatUploads] = useState<string[]>(new Array(12).fill(''));
  const [tatTexts, setTatTexts] = useState<string[]>(new Array(12).fill(''));
  const [transcribingIndices, setTranscribingIndices] = useState<number[]>([]);
  const [srtResponses, setSrtResponses] = useState<string[]>([]);
  const [srtSheetUploads, setSrtSheetUploads] = useState<string[]>([]);
  const [srtSheetTexts, setSrtSheetTexts] = useState<string[]>([]);
  const [srtTranscribingIndices, setSrtTranscribingIndices] = useState<number[]>([]);
  const [watResponses, setWatResponses] = useState<string[]>([]);
  const [watSheetUploads, setWatSheetUploads] = useState<string[]>([]);
  const [watSheetTexts, setWatSheetTexts] = useState<string[]>([]);
  const [watTranscribingIndices, setWatTranscribingIndices] = useState<number[]>([]);
  const [sdtData, setSdtData] = useState({ parents: '', teachers: '', friends: '', self: '', aim: '' });
  const [sdtImages, setSdtImages] = useState<Record<string, { data: string, mimeType: string } | null>>({ parents: null, teachers: null, friends: null, self: null, aim: null });
  const [feedback, setFeedback] = useState<any>(null);
  const [showScoreHelp, setShowScoreHelp] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [activeCameraKey, setActiveCameraKey] = useState<string | number | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadIndex = useRef<number | null>(null);

  const playBuzzer = (freq: number = 200, duration: number = 0.5) => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current; if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.05, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + duration);
  };

  const getScoreDescription = (score: number) => {
      if (score >= 9) return "Outstanding"; if (score >= 7.5) return "High Potential"; if (score >= 6) return "Recommended";
      if (score >= 4) return "Average"; return "Below Average";
  };

  const getAttemptAnalysis = (testType: TestType, count: number) => {
      if (testType === TestType.WAT) { if (count >= 45) return { label: "Ideal Pace", color: "bg-green-500" }; return { label: "Below Avg Speed", color: "bg-red-500" }; }
      if (testType === TestType.SRT) { if (count >= 50) return { label: "Top Scorer Pace", color: "bg-purple-500" }; if (count >= 45) return { label: "Very Good", color: "bg-green-500" }; if (count >= 35) return { label: "Acceptable", color: "bg-blue-500" }; return { label: "Caution: Slow", color: "bg-red-500" }; }
      return { label: "Completed", color: "bg-slate-500" };
  };

  const startTest = async () => {
    setIsLoading(true); setFeedback(null); setWatSheetUploads([]); setWatSheetTexts([]); setSrtSheetUploads([]); setSrtSheetTexts([]);
    if (type === TestType.SDT) { setPhase(PsychologyPhase.WRITING); setTimeLeft(900); setIsLoading(false); return; }
    setPhase(PsychologyPhase.PREPARING_STIMULI);
    try {
      let finalItems: any[] = []; let usageCount = 0;
      if (userId && !isGuest) {
          const sub = await getUserSubscription(userId);
          if (type === TestType.TAT) usageCount = sub.usage.tat_used;
          else if (type === TestType.WAT) usageCount = sub.usage.wat_used;
          else if (type === TestType.SRT) usageCount = sub.usage.srt_used;
      }
      if (type === TestType.TAT) {
        const dbScenarios = await getTATScenarios();
        if (!dbScenarios || dbScenarios.length === 0) {
           const staticTAT = [ "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80" ]; 
           finalItems = staticTAT.map((url, i) => ({ id: `tat-fb-${i}`, content: 'Fallback Set', imageUrl: url }));
        } else {
           let setImages: any[] = [];
           if (isGuest) { setActiveSetName('Guest Set'); setImages = dbScenarios.slice(0, 11); }
           else {
               const sets: Record<string, any[]> = dbScenarios.reduce((acc: any, img: any) => {
                  const tag = img.set_tag || 'Default'; if (!acc[tag]) acc[tag] = []; acc[tag].push(img); return acc;
               }, {});
               const setNames = Object.keys(sets).sort(); const completeSets = setNames.filter(name => sets[name].length >= 11);
               let selectedSetName = completeSets.length > 0 ? completeSets[usageCount % completeSets.length] : setNames[usageCount % setNames.length];
               setActiveSetName(selectedSetName); setImages = sets[selectedSetName].slice(0, 11); 
           }
           finalItems = setImages.map((s: any, i: number) => ({ id: `tat-db-${i}`, content: s.description || 'Picture Story', imageUrl: s.image_url }));
        }
        const images: Record<string, string> = {}; finalItems.forEach((item) => { images[item.id] = item.imageUrl; });
        setPregeneratedImages(images); finalItems.push({ id: 'tat-12-blank', content: 'BLANK SLIDE' });
      } else if (type === TestType.WAT) {
        const dbWords = await getWATWords(); let wordList: string[] = [];
        if (dbWords && dbWords.length > 0) {
            if (isGuest) { setActiveSetName('Guest Set'); wordList = dbWords.slice(0, 60).map((row: any) => row.word); }
            else {
                const sets: Record<string, string[]> = dbWords.reduce((acc: any, row: any) => {
                    const tag = row.set_tag || 'General'; if (!acc[tag]) acc[tag] = []; acc[tag].push(row.word); return acc;
                }, {});
                const setNames = Object.keys(sets).sort(); const idealSets = setNames.filter(name => sets[name].length >= 60);
                let selectedSetName = idealSets.length > 0 ? idealSets[usageCount % idealSets.length] : setNames[usageCount % setNames.length];
                setActiveSetName(selectedSetName); wordList = sets[selectedSetName];
                if (selectedSetName === 'General' && wordList.length > 60) wordList = wordList.sort(() => Math.random() - 0.5);
            }
        } else { wordList = [...STANDARD_WAT_SET]; setActiveSetName('Standard Set'); }
        finalItems = wordList.slice(0, 60).map((word, index) => ({ id: `wat-${index}`, content: word }));
        setWatResponses(new Array(finalItems.length).fill(''));
      } else if (type === TestType.SRT) {
        const dbQuestions = await getSRTQuestions(); let srtList: string[] = [];
        if (dbQuestions && dbQuestions.length > 0) {
            if (isGuest) { setActiveSetName('Guest Set'); srtList = dbQuestions.slice(0, 60).map((row: any) => row.question); }
            else {
                const sets: Record<string, string[]> = dbQuestions.reduce((acc: any, row: any) => {
                    const tag = row.set_tag || 'General'; if (!acc[tag]) acc[tag] = []; acc[tag].push(row.question); return acc;
                }, {});
                const setNames = Object.keys(sets).sort(); const selectedSetName = setNames[usageCount % setNames.length];
                setActiveSetName(selectedSetName); srtList = sets[selectedSetName];
            }
        } else { const data = await generateTestContent(type); srtList = data.items.map((i: any) => i.content); setActiveSetName('Standard Set'); }
        if (srtList.length < 60) { const originalLength = srtList.length; let i = 0; while (srtList.length < 60) { srtList.push(srtList[i % originalLength]); i++; } } else { srtList = srtList.slice(0, 60); }
        finalItems = srtList.map((q, index) => ({ id: `srt-${index}`, content: q }));
        setSrtResponses(new Array(finalItems.length).fill('')); setItems(finalItems); setPhase(PsychologyPhase.WRITING); setTimeLeft(1800); setIsLoading(false); return; 
      }
      setItems(finalItems); setCurrentIndex(0); setupSlide(0, finalItems);
    } catch (e) { setPhase(PsychologyPhase.IDLE); } finally { setIsLoading(false); }
  };

  const setupSlide = (index: number, currentItems: any[]) => {
    if (index >= currentItems.length) {
      if (type === TestType.TAT) setPhase(PsychologyPhase.UPLOADING_STORIES);
      else if (type === TestType.WAT) setPhase(PsychologyPhase.UPLOADING_WAT);
      else setPhase(PsychologyPhase.COMPLETED);
      return;
    }
    if (type === TestType.TAT) { setTimeLeft(30); setPhase(PsychologyPhase.VIEWING); }
    else if (type === TestType.WAT) { setTimeLeft(15); setPhase(PsychologyPhase.WRITING); }
  };

  useEffect(() => {
    const isTimedPhase = phase === PsychologyPhase.VIEWING || phase === PsychologyPhase.WRITING;
    if ((type === TestType.SDT || type === TestType.SRT || (currentIndex >= 0 && currentIndex < items.length)) && isTimedPhase && timeLeft >= 0) {
      if (timeLeft > 0) timerRef.current = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
      else handleTimerEnd();
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, currentIndex, phase, type]);

  const handleTimerEnd = () => {
    if (type === TestType.SDT) { playBuzzer(300, 1.0); submitSDT(); return; }
    if (type === TestType.SRT) { playBuzzer(300, 1.0); setPhase(PsychologyPhase.UPLOADING_SRT); return; }
    if (type === TestType.TAT && phase === PsychologyPhase.VIEWING) { playBuzzer(180, 0.4); setTimeLeft(240); setPhase(PsychologyPhase.WRITING); }
    else {
      const nextIdx = currentIndex + 1;
      if (nextIdx < items.length) { playBuzzer(nextIdx < 60 ? 500 : 300, 0.15); setCurrentIndex(nextIdx); setupSlide(nextIdx, items); }
      else { if (type === TestType.TAT) setPhase(PsychologyPhase.UPLOADING_STORIES); else if (type === TestType.WAT) setPhase(PsychologyPhase.UPLOADING_WAT); else setPhase(PsychologyPhase.COMPLETED); }
    }
  };

  const handleCameraCapture = (base64: string) => {
      if (typeof activeCameraKey === 'number') processTATImage(activeCameraKey, base64);
      else if (typeof activeCameraKey === 'string') setSdtImages(prev => ({ ...prev, [activeCameraKey]: { data: base64, mimeType: 'image/jpeg' } }));
      setActiveCameraKey(null);
  };

  const processTATImage = async (index: number, base64: string, mimeType: string = 'image/jpeg') => {
      setTatUploads(prev => { const next = [...prev]; next[index] = base64; return next; });
      setTranscribingIndices(prev => [...prev, index]);
      try { const text = await transcribeHandwrittenStory(base64, mimeType); setTatTexts(prev => { const next = [...prev]; next[index] = text; return next; }); } 
      catch (err) { } finally { setTranscribingIndices(prev => prev.filter(i => i !== index)); }
  };

  const handleWatSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const files = Array.from(e.target.files); const startIdx = watSheetUploads.length;
      const processedFiles = await Promise.all(files.map(file => new Promise<{base64: string, type: string}>((res) => { const r = new FileReader(); r.onloadend = () => res({ base64: (r.result as string).split(',')[1], type: file.type }); r.readAsDataURL(file); })));
      setWatSheetUploads(prev => [...prev, ...processedFiles.map(f => f.base64)]);
      setWatSheetTexts(prev => [...prev, ...new Array(processedFiles.length).fill('')]);
      processedFiles.forEach(async (fileData, i) => {
          const globalIndex = startIdx + i; setWatTranscribingIndices(prev => [...prev, globalIndex]);
          try { const text = await transcribeHandwrittenStory(fileData.base64, fileData.type); setWatSheetTexts(prev => { const newArr = [...prev]; newArr[globalIndex] = text; return newArr; }); } 
          catch (e) { } finally { setWatTranscribingIndices(prev => prev.filter(idx => idx !== globalIndex)); }
      });
  };

  const handleSrtSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const files = Array.from(e.target.files); const startIdx = srtSheetUploads.length;
      const processedFiles = await Promise.all(files.map(file => new Promise<{base64: string, type: string}>((res) => { const r = new FileReader(); r.onloadend = () => res({ base64: (r.result as string).split(',')[1], type: file.type }); r.readAsDataURL(file); })));
      setSrtSheetUploads(prev => [...prev, ...processedFiles.map(f => f.base64)]);
      setSrtSheetTexts(prev => [...prev, ...new Array(processedFiles.length).fill('')]);
      processedFiles.forEach(async (fileData, i) => {
          const globalIndex = startIdx + i; setSrtTranscribingIndices(prev => [...prev, globalIndex]);
          try { const text = await transcribeHandwrittenStory(fileData.base64, fileData.type); setSrtSheetTexts(prev => { const newArr = [...prev]; newArr[globalIndex] = text; return newArr; }); } 
          catch (e) { } finally { setSrtTranscribingIndices(prev => prev.filter(idx => idx !== globalIndex)); }
      });
  };

  const submitSDT = async () => {
      setPhase(PsychologyPhase.EVALUATING);
      const inputData = { sdtData, sdtImages };
      try {
          const result = await evaluatePerformance(type, inputData);
          setFeedback(result);
          if (userId && !isGuest) await saveAssessmentReport(userId, 'SDT', inputData, result);
          setPhase(PsychologyPhase.COMPLETED);
      } catch (err) {
          const fallback = { score: 0, error: true }; setFeedback(fallback);
          if (userId && !isGuest) await saveAssessmentReport(userId, 'SDT', inputData, fallback);
          setPhase(PsychologyPhase.COMPLETED);
      }
  };

  const submitSRT = async () => {
      setPhase(PsychologyPhase.EVALUATING);
      const inputData = { 
          srtResponses: items.map((item, i) => ({ id: i + 1, situation: item.content, response: srtResponses[i] || "" })),
          srtSheetImages: srtSheetUploads,
          srtSheetTranscripts: srtSheetTexts 
      };
      try {
          const result = await evaluatePerformance(type, inputData);
          setFeedback(result);
          if (userId && !isGuest) await saveAssessmentReport(userId, 'SRT', inputData, result);
          setPhase(PsychologyPhase.COMPLETED);
      } catch (err) { 
          const fallback = { score: 0, error: true }; setFeedback(fallback);
          if (userId && !isGuest) await saveAssessmentReport(userId, 'SRT', inputData, fallback);
          setPhase(PsychologyPhase.COMPLETED);
      }
  };

  const submitWAT = async () => {
      setPhase(PsychologyPhase.EVALUATING);
      const inputData = { 
          watResponses: items.map((item, i) => ({ id: i + 1, word: item.content, response: watResponses[i] || "" })),
          watSheetImages: watSheetUploads,
          watSheetTranscripts: watSheetTexts 
      };
      try {
          const result = await evaluatePerformance(type, inputData);
          setFeedback(result);
          if (userId && !isGuest) await saveAssessmentReport(userId, 'WAT', inputData, result);
          setPhase(PsychologyPhase.COMPLETED);
      } catch (err) { 
          const fallback = { score: 0, error: true }; setFeedback(fallback);
          if (userId && !isGuest) await saveAssessmentReport(userId, 'WAT', inputData, fallback);
          setPhase(PsychologyPhase.COMPLETED);
      }
  };

  const submitDossier = async () => {
    setPhase(PsychologyPhase.EVALUATING);
    let tatPairs: any[] = [];
    try {
      tatPairs = await Promise.all(items.map(async (item, index) => {
        const userStoryImage = tatUploads[index]; if (!userStoryImage) return null;
        let stimulusBase64: string | undefined = undefined;
        const url = pregeneratedImages[item.id];
        if (url && item.id !== 'tat-12-blank') {
            try { const res = await fetch(url); const blob = await res.blob(); stimulusBase64 = await new Promise<string>((resolve) => { const r = new FileReader(); r.onloadend = () => resolve((r.result as string).split(',')[1]); r.readAsDataURL(blob); }); } 
            catch (e) { }
        }
        return { storyIndex: index + 1, stimulusImage: stimulusBase64, stimulusDesc: item.content, userStoryImage: userStoryImage, userStoryText: tatTexts[index] };
      }));
      const inputData = { tatPairs: tatPairs.filter(p => p !== null), testType: type };
      const result = await evaluatePerformance(type, inputData);
      setFeedback(result);
      if (userId && !isGuest) await saveAssessmentReport(userId, 'TAT', inputData, result);
      setPhase(PsychologyPhase.COMPLETED);
    } catch (err) { 
        const fallback = { score: 0, error: true }; setFeedback(fallback);
        if (userId && !isGuest) await saveAssessmentReport(userId, 'TAT', {}, fallback);
        setPhase(PsychologyPhase.COMPLETED); 
    }
  };

  const formatTime = (seconds: number) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };

  if (phase === PsychologyPhase.IDLE) return (
      <div className="bg-white p-12 md:p-24 rounded-[3rem] text-center max-w-4xl mx-auto animate-in fade-in zoom-in duration-500 shadow-2xl">
        <div className="w-20 h-20 bg-slate-900 text-yellow-400 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl rotate-6">
           {type === TestType.TAT ? <ImageIcon size={40}/> : type === TestType.SDT ? <FileSignature size={40} /> : <Target size={40}/>}
        </div>
        <h2 className="text-4xl font-black mb-6 uppercase tracking-tighter">{type} Test</h2>
        <div className="bg-slate-50 p-8 rounded-[2rem] mb-12 text-left border border-slate-200">
           <div className="text-slate-600 font-medium text-sm md:text-lg leading-relaxed italic space-y-4">
             {type === TestType.TAT ? <p>• 12 Pictures. 30s viewing, 4m writing per slide.</p> : type === TestType.SDT ? <p>• 5 distinct paragraphs describing opinions. 15 Minutes.</p> : type === TestType.SRT ? <p>• 60 Situations (30 Minutes).</p> : <p>• 60 Words (15s each).</p>}
           </div>
        </div>
        <button onClick={startTest} disabled={isLoading} className="bg-slate-900 text-white px-16 py-6 rounded-full font-black text-lg hover:bg-black transition-all shadow-2xl uppercase flex items-center justify-center gap-6 mx-auto">{isLoading ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Begin Test</button>
      </div>
  );

  if (phase === PsychologyPhase.PREPARING_STIMULI) return <div className="flex flex-col items-center justify-center py-40 space-y-12"><Loader2 className="w-32 h-32 text-slate-900 animate-spin" /><div className="text-center"><p className="text-slate-900 font-black uppercase tracking-[0.5em] text-sm">Retrieving Board Set...</p></div></div>;
  
  if (phase === PsychologyPhase.VIEWING || phase === PsychologyPhase.WRITING) {
      if (type === TestType.SDT) return (
        <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
           <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md p-6 rounded-[2rem] shadow-xl border border-slate-100 flex items-center justify-center mb-8">
              <div className={`px-6 py-3 rounded-2xl border-4 ${timeLeft < 60 ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-white'}`}><div className="flex items-center gap-3"><Timer size={20} /><span className="text-xl font-black font-mono">{formatTime(timeLeft)}</span></div></div>
           </div>
           <div className="space-y-6">
              {[ { label: "1. Parents' Opinion", key: 'parents' }, { label: "2. Teachers' Opinion", key: 'teachers' }, { label: "3. Friends' Opinion", key: 'friends' }, { label: "4. Self Opinion", key: 'self' }, { label: "5. Future Aims", key: 'aim' } ].map((section, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-md border border-slate-100">
                      <div className="flex justify-between items-center mb-4">
                          <label className="block text-sm font-black text-slate-700 uppercase">{section.label}</label>
                          <button onClick={() => { setActiveCameraKey(section.key); setShowCamera(true); }} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wide flex items-center gap-2"><Camera size={12} /> Camera</button>
                      </div>
                      <textarea value={sdtData[section.key as keyof typeof sdtData]} onChange={(e) => setSdtData({...sdtData, [section.key]: e.target.value})} className="w-full h-32 p-4 bg-slate-50 border rounded-2xl outline-none transition-all font-medium text-slate-700" />
                  </div>
              ))}
           </div>
           <div className="mt-8 flex justify-center"><button onClick={submitSDT} className="px-16 py-6 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all">Submit Dossier</button></div>
           <CameraModal isOpen={showCamera} onClose={() => setShowCamera(false)} onCapture={handleCameraCapture} />
        </div>
      );
      if (type === TestType.SRT) return (
        <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
           <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md p-6 rounded-[2rem] shadow-xl border border-slate-100 flex items-center justify-between mb-8">
              <div><h3 className="text-xl font-black text-slate-900 uppercase">SRT</h3></div>
              <div className={`px-6 py-3 rounded-2xl border-4 ${timeLeft < 300 ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-white'}`}><div className="flex items-center gap-3"><Timer size={20} /><span className="text-xl font-black font-mono">{formatTime(timeLeft)}</span></div></div>
           </div>
           <div className="space-y-4">{items.map((item, idx) => (<div key={item.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm"><div className="flex gap-4"><span className="text-slate-300 font-black text-2xl">{(idx + 1).toString().padStart(2, '0')}</span><div className="flex-1 space-y-3"><p className="text-lg font-bold text-slate-800">{item.content}</p><input type="text" value={srtResponses[idx]} onChange={(e) => { const next = [...srtResponses]; next[idx] = e.target.value; setSrtResponses(next); }} placeholder="Action taken..." className="w-full p-4 bg-slate-50 border rounded-xl outline-none transition-all font-medium text-slate-700" /></div></div></div>))}</div>
           <div className="fixed bottom-6 right-6 z-30"><button onClick={() => setPhase(PsychologyPhase.UPLOADING_SRT)} className="bg-green-600 text-white p-6 rounded-full shadow-2xl"><CheckCircle size={24} /></button></div>
        </div>
      );
      
      const currentItem = items[currentIndex]; const imageUrl = type === TestType.TAT ? (currentItem?.id === 'tat-12-blank' ? 'BLANK' : pregeneratedImages[currentItem?.id]) : null;
      return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100"><p className="text-xl font-black">{currentIndex + 1} of {items.length}</p></div>
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center justify-center"><div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="absolute left-0 top-0 h-full bg-blue-600" style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }} /></div></div>
            <div className={`p-6 rounded-[2.5rem] shadow-xl border-4 ${timeLeft < 10 ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-white'}`}><div className="flex items-center justify-between"><Timer size={32} /><p className="text-2xl font-black font-mono">{formatTime(timeLeft)}</p></div></div>
          </div>
          {imageUrl && phase === PsychologyPhase.VIEWING && (<div className="fixed inset-0 z-[200] bg-black flex items-center justify-center animate-in fade-in">{imageUrl === 'BLANK' ? <div className="text-slate-800 font-black text-9xl">BLANK</div> : <img src={imageUrl} className="w-full h-full object-contain grayscale" />}</div>)}
          {type === TestType.WAT && (<div className="bg-white rounded-[4rem] p-40 text-center shadow-2xl border-2 border-slate-50 min-h-[60vh] flex flex-col items-center justify-center"><h1 className="text-8xl uppercase font-black text-slate-900 tracking-tight">{currentItem.content}</h1><input type="text" value={watResponses[currentIndex]} onChange={(e) => { const next = [...watResponses]; next[currentIndex] = e.target.value; setWatResponses(next); }} placeholder="Type spontaneous thought..." className="mt-12 w-full max-w-2xl bg-slate-50 p-6 text-2xl font-bold text-center border-b-4 focus:border-slate-900 outline-none transition-all" autoFocus /></div>)}
        </div>
      );
  }

  if (phase === PsychologyPhase.EVALUATING) {
    const tips = type === TestType.WAT ? WAT_TIPS : type === TestType.SRT ? SRT_TIPS : type === TestType.TAT ? TAT_TIPS : SDT_TIPS;
    return (
        <div className="flex flex-col items-center justify-center py-40 space-y-12 animate-in fade-in">
            <Loader2 className="w-24 h-24 text-blue-600 animate-spin" />
            <div className="text-center space-y-4 max-w-lg">
                <p className="text-slate-900 font-black uppercase tracking-[0.5em] text-sm">Psychologist Assessment</p>
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100"><p className="text-blue-800 font-bold text-sm italic">"Tip: {tips[currentTipIndex % tips.length]}"</p></div>
            </div>
        </div>
    );
  }

  if (phase === PsychologyPhase.COMPLETED) {
    if (feedback?.error) return <div className="max-w-2xl mx-auto py-20 text-center"><h3 className="text-3xl font-black uppercase">Assessment Archived</h3><p className="text-slate-600 mt-4">Server Busy. Mission data logged safely.</p><button onClick={() => window.location.reload()} className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs">Return to Base</button></div>;
    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-12">
            <div className="bg-slate-900 text-white p-12 md:p-16 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="space-y-4 text-center md:text-left z-10">
                    <span className="bg-yellow-400 text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Psychology Report</span>
                    <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">{type} Verdict</h2>
                </div>
                <div className="bg-white/10 p-8 rounded-[3rem] border border-white/10 backdrop-blur-md text-center min-w-[200px] z-10">
                    <span className="text-7xl font-black text-yellow-400">{feedback?.score || "N/A"}</span>
                </div>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100"><h4 className="font-black text-green-600 uppercase tracking-widest mb-6">Strengths</h4><ul className="space-y-3">{feedback?.strengths?.map((s: string, i: number) => <li key={i} className="text-sm font-bold text-slate-700 flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"/> {s}</li>)}</ul></div>
                <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100"><h4 className="font-black text-red-500 uppercase tracking-widest mb-6">Areas for Improvement</h4><ul className="space-y-3">{feedback?.weaknesses?.map((w: string, i: number) => <li key={i} className="text-sm font-bold text-slate-700 flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"/> {w}</li>)}</ul></div>
            </div>
            {userId && <SessionFeedback testType={type} userId={userId} />}
            <button onClick={() => window.location.reload()} className="w-full py-6 md:py-7 bg-slate-900 text-white rounded-full font-black uppercase text-xs hover:bg-black transition-all shadow-2xl">Return to Barracks</button>
        </div>
    )
  }
  return null; 
};
export default PsychologyTest;
