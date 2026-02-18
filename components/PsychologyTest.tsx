import React, { useState, useEffect, useRef } from 'react';
import { Timer, Send, Loader2, Image as ImageIcon, CheckCircle, ShieldCheck, FileText, Target, Award, AlertCircle, Upload, Trash2, BookOpen, Layers, Brain, Eye, FastForward, Edit, X, Save, RefreshCw, PenTool, FileSignature, HelpCircle, ChevronDown, ChevronUp, ScanEye, Activity, Camera, Info, LogIn, ThumbsUp, ThumbsDown, MinusCircle, Lock, Download, Printer, Coins } from 'lucide-react';
import { generateTestContent, evaluatePerformance, transcribeHandwrittenStory, STANDARD_WAT_SET } from '../services/geminiService';
import { getTATScenarios, getWATWords, getSRTQuestions, getUserSubscription, rewardCoins } from '../services/supabaseService';
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

const WAT_TIPS = [
  "Spontaneity is key. Don't censor your thoughts.",
  "OLQs should reflect in your sentences naturally.",
  "Avoid negative connotations where possible.",
  "Spontaneity is your best friend. Don't overthink.",
  "Keep sentences grammatical but concise."
];

const SRT_TIPS = [
  "Action is key. Do not just plan, execute.",
  "Prioritize: Save Life > Protect Property > Social Duty.",
  "Be the hero of your own situation. Don't rely on others.",
  "Keep responses telegraphic (short & meaningful).",
  "Address the root cause, not just the symptoms."
];

const TAT_TIPS = [
    "Identify the Hero clearly.",
    "Ensure the story has a Past, Present, and Future.",
    "The outcome should be positive and realistic.",
    "Reflect OLQs through the main character's actions."
];

const SDT_TIPS = [
    "Be honest about your strengths and weaknesses.",
    "Ensure consistency with your PIQ form.",
    "Focus on self-improvement in the 'Self Opinion' section."
];

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

  const [sdtData, setSdtData] = useState({
    parents: '',
    teachers: '',
    friends: '',
    self: '',
    aim: ''
  });
  
  const [sdtImages, setSdtImages] = useState<Record<string, { data: string, mimeType: string } | null>>({
    parents: null,
    teachers: null,
    friends: null,
    self: null,
    aim: null
  });

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

  const getAttemptAnalysis = (testType: TestType, count: number) => {
      if (testType === TestType.WAT) {
          if (count >= 45) return { label: "Ideal Pace", color: "bg-green-500" };
          return { label: "Below Avg Speed", color: "bg-red-500" };
      }
      if (testType === TestType.SRT) {
          if (count >= 50) return { label: "Top Scorer Pace", color: "bg-purple-500" };
          if (count >= 45) return { label: "Very Good", color: "bg-green-500" };
          if (count >= 35) return { label: "Acceptable", color: "bg-blue-500" };
          return { label: "Caution: Slow", color: "bg-red-500" };
      }
      return { label: "Completed", color: "bg-slate-500" };
  };

  const startTest = async () => {
    setIsLoading(true);
    setFeedback(null);
    setWatSheetUploads([]);
    setWatSheetTexts([]);
    setSrtSheetUploads([]);
    setSrtSheetTexts([]);
    
    if (type === TestType.SDT) {
        setPhase(PsychologyPhase.WRITING);
        setTimeLeft(900); 
        setIsLoading(false);
        return;
    }

    setPhase(PsychologyPhase.PREPARING_STIMULI);
    
    try {
      let finalItems: any[] = [];
      let usageCount = 0;
      
      if (userId && !isGuest) {
          const sub = await getUserSubscription(userId);
          if (type === TestType.TAT) usageCount = sub.usage.tat_used;
          else if (type === TestType.WAT) usageCount = sub.usage.wat_used;
          else if (type === TestType.SRT) usageCount = sub.usage.srt_used;
      }

      if (type === TestType.TAT) {
        const dbScenarios = await getTATScenarios();
        if (!dbScenarios || dbScenarios.length === 0) {
           const staticTAT = [ "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80" ]; 
           finalItems = staticTAT.map((url, i) => ({ id: `tat-fb-${i}`, content: 'Fallback Set', imageUrl: url }));
        } else {
           let setImages: any[] = [];
           if (isGuest) {
               setActiveSetName('Guest Trial Set');
               setImages = dbScenarios.slice(0, 11);
           } else {
               const sets: Record<string, any[]> = dbScenarios.reduce((acc: any, img: any) => {
                  const tag = img.set_tag || 'Default';
                  if (!acc[tag]) acc[tag] = [];
                  acc[tag].push(img);
                  return acc;
               }, {});
               const setNames = Object.keys(sets).sort(); 
               const completeSets = setNames.filter(name => sets[name].length >= 11);
               let selectedSetName = '';
               if (completeSets.length > 0) {
                    const index = usageCount % completeSets.length;
                    selectedSetName = completeSets[index];
               } else {
                    const index = usageCount % setNames.length;
                    selectedSetName = setNames[index];
               }
               setActiveSetName(selectedSetName);
               setImages = sets[selectedSetName].slice(0, 11); 
           }
           finalItems = setImages.map((s: any, i: number) => ({
              id: `tat-db-${i}`,
              content: s.description || 'Picture Story',
              imageUrl: s.image_url
           }));
        }
        const images: Record<string, string> = {};
        finalItems.forEach((item) => { images[item.id] = item.imageUrl; });
        setPregeneratedImages(images);
        finalItems.push({ id: 'tat-12-blank', content: 'BLANK SLIDE' });
      } else if (type === TestType.WAT) {
        const dbWords = await getWATWords();
        let wordList: string[] = [];
        if (dbWords && dbWords.length > 0) {
            if (isGuest) {
                setActiveSetName('Guest Trial Set');
                wordList = dbWords.slice(0, 60).map((row: any) => row.word);
            } else {
                const sets: Record<string, string[]> = dbWords.reduce((acc: any, row: any) => {
                    const tag = row.set_tag || 'General';
                    if (!acc[tag]) acc[tag] = [];
                    acc[tag].push(row.word);
                    return acc;
                }, {});
                const setNames = Object.keys(sets).sort();
                const idealSets = setNames.filter(name => sets[name].length >= 60); 
                let selectedSetName = '';
                if (idealSets.length > 0) {
                    const index = usageCount % idealSets.length;
                    selectedSetName = idealSets[index];
                } else {
                    const index = usageCount % setNames.length;
                    selectedSetName = setNames[index];
                }
                setActiveSetName(selectedSetName);
                wordList = sets[selectedSetName];
                if (selectedSetName === 'General' && wordList.length > 60) {
                   wordList = wordList.sort(() => Math.random() - 0.5);
                }
            }
        } else {
            wordList = [...STANDARD_WAT_SET];
            if (!isGuest) wordList = wordList.sort(() => Math.random() - 0.5);
            setActiveSetName('Standard Fallback Set');
        }
        finalItems = wordList.slice(0, 60).map((word, index) => ({ id: `wat-${index}`, content: word }));
        setWatResponses(new Array(finalItems.length).fill(''));
      } else if (type === TestType.SRT) {
        const dbQuestions = await getSRTQuestions();
        let srtList: string[] = [];
        if (dbQuestions && dbQuestions.length > 0) {
            if (isGuest) {
                setActiveSetName('Guest Trial Set');
                srtList = dbQuestions.slice(0, 60).map((row: any) => row.question);
            } else {
                const sets: Record<string, string[]> = dbQuestions.reduce((acc: any, row: any) => {
                    const tag = row.set_tag || 'General';
                    if (!acc[tag]) acc[tag] = [];
                    acc[tag].push(row.question);
                    return acc;
                }, {});
                const setNames = Object.keys(sets).sort();
                const index = usageCount % setNames.length;
                const selectedSetName = setNames[index];
                setActiveSetName(selectedSetName);
                srtList = sets[selectedSetName];
                if (selectedSetName === 'General' && srtList.length > 60) {
                    srtList = srtList.sort(() => Math.random() - 0.5);
                }
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
        finalItems = srtList.map((q, index) => ({ id: `srt-${index}`, content: q }));
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
      else if (type === TestType.WAT) setPhase(PsychologyPhase.UPLOADING_WAT);
      else setPhase(PsychologyPhase.COMPLETED);
      return;
    }
    if (type === TestType.TAT) { setTimeLeft(30); setPhase(PsychologyPhase.VIEWING); }
    else if (type === TestType.WAT) { setTimeLeft(15); setPhase(PsychologyPhase.WRITING); }
  };

  useEffect(() => {
    if (phase === PsychologyPhase.EVALUATING) {
      const interval = setInterval(() => {
        setCurrentTipIndex(prev => prev + 1);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [phase]);

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
    if (type === TestType.SRT) { playBuzzer(300, 1.0); setPhase(PsychologyPhase.UPLOADING_SRT); return; }
    if (type === TestType.TAT && phase === PsychologyPhase.VIEWING) {
      playBuzzer(180, 0.4); 
      setTimeLeft(240); 
      setPhase(PsychologyPhase.WRITING);
    } else {
      const nextIdx = currentIndex + 1;
      if (nextIdx < items.length) {
        if (type === TestType.WAT) playBuzzer(500, 0.15); 
        else playBuzzer(300, 0.1);
        setCurrentIndex(nextIdx);
        setupSlide(nextIdx, items);
      } else {
        if (type === TestType.TAT) setPhase(PsychologyPhase.UPLOADING_STORIES);
        else if (type === TestType.WAT) setPhase(PsychologyPhase.UPLOADING_WAT);
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
        processTATImage(index, base64, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const processTATImage = async (index: number, base64: string, mimeType: string = 'image/jpeg') => {
      setTatUploads(prev => { const next = [...prev]; next[index] = base64; return next; });
      activeUploadIndex.current = null;
      setTranscribingIndices(prev => [...prev, index]);
      try {
          const text = await transcribeHandwrittenStory(base64, mimeType);
          setTatTexts(prev => { const next = [...prev]; next[index] = text; return next; });
      } catch (err) { console.error("Transcription Failed", err); } finally { setTranscribingIndices(prev => prev.filter(i => i !== index)); }
  };

  const handleCameraCapture = (base64: string) => {
      if (typeof activeCameraKey === 'number') {
          processTATImage(activeCameraKey, base64);
      } else if (typeof activeCameraKey === 'string') {
          setSdtImages(prev => ({ ...prev, [activeCameraKey]: { data: base64, mimeType: 'image/jpeg' } }));
      }
      setActiveCameraKey(null);
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

  const handleWatSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const filesArr = Array.from(e.target.files);
      const startIdx = watSheetUploads.length;
      const processedFiles = await Promise.all(filesArr.map(file => {
          return new Promise<{base64: string, type: string}>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve({ base64: (reader.result as string).split(',')[1], type: file.type });
              reader.readAsDataURL(file);
          });
      }));
      setWatSheetUploads(prev => [...prev, ...processedFiles.map(f => f.base64)]);
      setWatSheetTexts(prev => [...prev, ...new Array(processedFiles.length).fill('')]);
      processedFiles.forEach(async (fileData, i) => {
          const globalIndex = startIdx + i;
          setWatTranscribingIndices(prev => [...prev, globalIndex]);
          try {
              const text = await transcribeHandwrittenStory(fileData.base64, fileData.type);
              setWatSheetTexts(prev => { const newArr = [...prev]; newArr[globalIndex] = text; return newArr; });
          } catch (e) { console.error("WAT OCR Failed", e); } finally { setWatTranscribingIndices(prev => prev.filter(idx => idx !== globalIndex)); }
      });
  };

  const removeWatSheet = (index: number) => {
      setWatSheetUploads(prev => prev.filter((_, i) => i !== index));
      setWatSheetTexts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSrtSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const filesArr = Array.from(e.target.files);
      const startIdx = srtSheetUploads.length;
      const processedFiles = await Promise.all(filesArr.map(file => {
          return new Promise<{base64: string, type: string}>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve({ base64: (reader.result as string).split(',')[1], type: file.type });
              reader.readAsDataURL(file);
          });
      }));
      setSrtSheetUploads(prev => [...prev, ...processedFiles.map(f => f.base64)]);
      setSrtSheetTexts(prev => [...prev, ...new Array(processedFiles.length).fill('')]);
      processedFiles.forEach(async (fileData, i) => {
          const globalIndex = startIdx + i;
          setSrtTranscribingIndices(prev => [...prev, globalIndex]);
          try {
              const text = await transcribeHandwrittenStory(fileData.base64, fileData.type);
              setSrtSheetTexts(prev => { const newArr = [...prev]; newArr[globalIndex] = text; return newArr; });
          } catch (e) { console.error("SRT OCR Failed", e); } finally { setSrtTranscribingIndices(prev => prev.filter(idx => idx !== globalIndex)); }
      });
  };

  const removeSrtSheet = (index: number) => {
      setSrtSheetUploads(prev => prev.filter((_, i) => i !== index));
      setSrtSheetTexts(prev => prev.filter((_, i) => i !== index));
  };

  const submitSDT = async () => {
      setPhase(PsychologyPhase.EVALUATING);
      try {
          const result = await evaluatePerformance(type, { sdtData, sdtImages });
          setFeedback(result);
          if (onSave && !isGuest) onSave({ ...result, sdtData, sdtImages });
          setPhase(PsychologyPhase.COMPLETED);
      } catch (err) {
          console.error("SDT Eval Error", err);
          const fallback = { score: 0, verdict: "Technical Failure", recommendations: "Assessment Pending. Responses saved.", error: true, sdtData, sdtImages };
          setFeedback(fallback);
          if (onSave && !isGuest) onSave(fallback);
          setPhase(PsychologyPhase.COMPLETED);
      }
  };

  const submitSRT = async () => {
      setPhase(PsychologyPhase.EVALUATING);
      const payload = { 
          testType: 'SRT', 
          srtResponses: items.map((item, i) => ({ id: i + 1, situation: item.content, response: srtResponses[i] || "" })),
          srtSheetImages: srtSheetUploads,
          srtSheetTranscripts: srtSheetTexts 
      };
      try {
          const result = await evaluatePerformance(type, payload);
          setFeedback(result);
          if (onSave && !isGuest) onSave({ ...result, srtResponses, srtSheetImages: srtSheetUploads, srtSheetTranscripts: srtSheetTexts });
          setPhase(PsychologyPhase.COMPLETED);
      } catch (err) { 
          console.error("SRT Eval Error", err); 
          const fallback = { score: 0, verdict: "Technical Failure", error: true, srtResponses: payload.srtResponses };
          setFeedback(fallback);
          if (onSave && !isGuest) onSave(fallback);
          setPhase(PsychologyPhase.COMPLETED);
      }
  };

  const submitWAT = async () => {
      setPhase(PsychologyPhase.EVALUATING);
      const payload = { 
          testType: 'WAT', 
          watResponses: items.map((item, i) => ({ id: i + 1, word: item.content, response: watResponses[i] || "" })),
          watSheetImages: watSheetUploads,
          watSheetTranscripts: watSheetTexts 
      };
      try {
          const result = await evaluatePerformance(type, payload);
          setFeedback(result);
          if (onSave && !isGuest) onSave({ ...result, watResponses, watSheetImages: watSheetUploads, watSheetTranscripts: watSheetTexts });
          setPhase(PsychologyPhase.COMPLETED);
      } catch (err) { 
          console.error("WAT Eval Error", err); 
          const fallback = { score: 0, verdict: "Technical Failure", error: true, watResponses: payload.watResponses };
          setFeedback(fallback);
          if (onSave && !isGuest) onSave(fallback);
          setPhase(PsychologyPhase.COMPLETED);
      }
  };

  const submitDossier = async () => {
    setPhase(PsychologyPhase.EVALUATING);
    let tatPairs: any[] = [];
    try {
      tatPairs = await Promise.all(items.map(async (item, index) => {
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
            } catch (e) { console.warn("Could not fetch stimulus image:", e); }
        }
        return { storyIndex: index + 1, stimulusImage: stimulusBase64, stimulusDesc: item.content, userStoryImage: userStoryImage, userStoryText: tatTexts[index] };
      }));
      const validPairs = tatPairs.filter(p => p !== null);
      const result = await evaluatePerformance(type, { tatPairs: validPairs, testType: type, itemCount: items.length });
      setFeedback(result);
      if (onSave && !isGuest) onSave({ ...result, tatImages: tatUploads, tatPairs: validPairs });
      setPhase(PsychologyPhase.COMPLETED);
    } catch (err) { 
        console.error("Evaluation error:", err); 
        const fallback = { score: 0, verdict: "Technical Failure", error: true, tatPairs: tatPairs.filter(p => p !== null) };
        setFeedback(fallback);
        if (onSave && !isGuest) onSave(fallback);
        setPhase(PsychologyPhase.COMPLETED); 
    }
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
        {isGuest && (
            <div className="mb-6 bg-blue-50 text-blue-700 px-4 py-2 rounded-full inline-block text-xs font-black uppercase tracking-widest">
                Guest Trial Mode: Fixed Set
            </div>
        )}
        <div className="bg-slate-50 p-8 rounded-[2rem] mb-12 text-left border border-slate-200">
           <h4 className="font-black text-xs uppercase tracking-widest text-blue-600 mb-4 underline">Board Briefing:</h4>
           <div className="text-slate-600 font-medium text-sm md:text-lg leading-relaxed italic space-y-4">
             {type === TestType.TAT ? (
               <p>• 12 Pictures (11 from DB + 1 Blank). 30s viewing, 4m writing per slide.</p>
             ) : type === TestType.SDT ? (
               <p>• Write 5 distinct paragraphs describing opinions. Total time: 15 Minutes. Be honest.</p>
             ) : type === TestType.SRT ? (
               <p>• 60 Situations (30 Minutes). Respond to each situation naturally.</p>
             ) : (
               <p>• 60 Words (15s each). Write the first thought that comes to mind.</p>
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
  
  if (phase === PsychologyPhase.VIEWING || phase === PsychologyPhase.WRITING || phase === PsychologyPhase.UPLOADING_WAT || phase === PsychologyPhase.UPLOADING_SRT || phase === PsychologyPhase.UPLOADING_STORIES) {
      const currentItem = items[currentIndex];
      const isTAT = type === TestType.TAT;
      const imageUrl = isTAT ? (currentItem?.id === 'tat-12-blank' ? 'BLANK' : pregeneratedImages[currentItem?.id]) : null;
      
      if (phase === PsychologyPhase.VIEWING || phase === PsychologyPhase.WRITING) {
          if (type === TestType.SDT) return (
            <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
               <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md p-6 rounded-[2rem] shadow-xl border border-slate-100 flex items-center justify-center mb-8">
                  <div className={`px-6 py-3 rounded-2xl border-4 transition-all ${timeLeft < 60 ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-white'}`}><div className="flex items-center gap-3"><Timer size={20} /><span className="text-xl font-black font-mono">{formatTime(timeLeft)}</span></div></div>
               </div>
               <div className="space-y-6">
                  {[ { label: "1. What do your Parents think of you?", key: 'parents' }, { label: "2. What do your Teachers / Employers think?", key: 'teachers' }, { label: "3. What do your Friends / Colleagues think?", key: 'friends' }, { label: "4. What is your own opinion of yourself?", key: 'self' }, { label: "5. What kind of person do you want to become?", key: 'aim' } ].map((section, idx) => (
                      <div key={idx} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-md border border-slate-100 hover:border-blue-200 transition-colors">
                          <div className="flex justify-between items-center mb-4">
                              <label className="block text-sm font-black text-slate-700 uppercase tracking-wide">{section.label}</label>
                              <div className="flex items-center gap-2">
                                  <input type="file" id={`file-${String(section.key)}`} className="hidden" accept="image/*" onChange={(e) => handleSDTImageUpload(e, String(section.key))} />
                                  {sdtImages[section.key as keyof typeof sdtData] ? <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100"><ImageIcon size={14} className="text-green-600" /><span className="text-[10px] font-bold text-green-700 uppercase">Image Attached</span><button onClick={() => setSdtImages(prev => ({...prev, [section.key]: null}))} className="ml-1 p-1 hover:bg-red-100 rounded-full text-red-500 transition-colors"><Trash2 size={12} /></button></div> : ( <div className="flex gap-2"><label htmlFor={`file-${String(section.key)}`} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl cursor-pointer transition-all text-[10px] font-bold uppercase tracking-wide"><Upload size={12} /> Upload File</label><button onClick={() => { setActiveCameraKey(section.key); setShowCamera(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white hover:bg-black rounded-xl cursor-pointer transition-all text-[10px] font-bold uppercase tracking-wide"><Camera size={12} /> Camera</button></div> )}
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
               <CameraModal isOpen={showCamera} onClose={() => setShowCamera(false)} onCapture={handleCameraCapture} />
            </div>
          );
          if (type === TestType.SRT) return (
            <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
               <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md p-4 md:p-6 rounded-[2rem] shadow-xl border border-slate-100 flex items-center justify-between mb-8 transition-all">
                  <div><h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Situation Reaction Test</h3><div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1"><span>Set: {activeSetName}</span><span>Attempted: {srtResponses.filter(r => r.trim()).length}/{items.length}</span></div></div>
                  <div className="flex items-center gap-4"><div className={`px-5 py-2 md:px-6 md:py-3 rounded-2xl border-4 transition-all ${timeLeft < 300 ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-white'}`}><div className="flex items-center gap-3"><Timer size={20} /><span className="text-lg md:text-xl font-black font-mono">{formatTime(timeLeft)}</span></div></div><button onClick={() => { playBuzzer(300, 0.5); setPhase(PsychologyPhase.UPLOADING_SRT); }} className="hidden md:flex bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg items-center gap-2"><CheckCircle size={16} /> Submit</button></div>
               </div>
               <div className="space-y-4">{items.map((item, idx) => (<div key={item.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group relative"><div className="flex gap-4"><span className="text-slate-300 font-black text-2xl select-none">{(idx + 1).toString().padStart(2, '0')}</span><div className="flex-1 space-y-3"><p className="text-lg font-bold text-slate-800 leading-snug">{item.content}</p><input type="text" value={srtResponses[idx]} onChange={(e) => { const val = e.target.value; setSrtResponses(prev => { const next = [...prev]; next[idx] = val; return next; }); }} placeholder="Type your reaction..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-700" /></div></div>{srtResponses[idx] && srtResponses[idx].trim() && (<div className="absolute top-6 right-6 text-green-500 animate-in fade-in zoom-in"><CheckCircle size={20} /></div>)}</div>))}</div>
               <div className="fixed bottom-6 right-6 md:hidden z-30"><button onClick={() => { playBuzzer(300, 0.5); setPhase(PsychologyPhase.UPLOADING_SRT); }} className="bg-green-600 text-white p-4 rounded-full shadow-2xl hover:bg-green-700 transition-all"><CheckCircle size={24} /></button></div>
               {isAdmin && (<button onClick={() => setTimeLeft(0)} className="fixed bottom-6 left-6 z-[100] bg-red-600 text-white pl-4 pr-6 py-3 rounded-full font-black text-[10px] uppercase shadow-2xl hover:bg-red-700 transition-all flex items-center gap-2 border-4 border-white animate-pulse hover:animate-none"><FastForward size={14} fill="currentColor" /> Admin Skip</button>)}
            </div>
          );
          
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
      } else {
          if (phase === PsychologyPhase.UPLOADING_WAT) {
              return (
                  <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in">
                      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3"><Upload className="text-blue-600" size={24}/> Handwritten Response Verification</h3>
                          <div className="space-y-6 mb-8">
                              {watSheetUploads.map((img, idx) => (
                                  <div key={idx} className="flex flex-col md:flex-row gap-6 p-4 rounded-3xl border border-slate-100 bg-slate-50/50">
                                      <div className="w-full md:w-1/3 relative rounded-2xl overflow-hidden aspect-[3/4] border-2 border-slate-200 shadow-sm group shrink-0">
                                          <img src={`data:image/jpeg;base64,${img}`} className="w-full h-full object-cover" alt={`Sheet ${idx + 1}`} />
                                          <button onClick={() => removeWatSheet(idx)} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shadow-lg"><Trash2 size={14} /></button>
                                      </div>
                                      <div className="w-full md:w-2/3 flex flex-col">
                                          <textarea value={watSheetTexts[idx] || ""} onChange={(e) => { const val = e.target.value; setWatSheetTexts(prev => { const next = [...prev]; next[idx] = val; return next; }); }} placeholder={watTranscribingIndices.includes(idx) ? "AI is reading..." : "Transcript..."} className="flex-1 w-full p-4 bg-white border border-slate-200 rounded-2xl focus:border-blue-500 outline-none transition-all font-mono text-xs md:text-sm text-slate-700 resize-none min-h-[200px]" />
                                      </div>
                                  </div>
                              ))}
                              <label className="flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition-all p-8 group">
                                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-slate-200 transition-colors"><Camera size={24} className="text-slate-400 group-hover:text-slate-600"/></div>
                                  <span className="text-xs font-black uppercase text-slate-400 group-hover:text-slate-600 tracking-widest">Add Page Photo</span>
                                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleWatSheetUpload} />
                              </label>
                          </div>
                      </div>
                      <div className="flex justify-center pt-4"><button onClick={submitWAT} className="px-16 py-6 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-2xl hover:scale-105 flex items-center gap-3"><Send size={16} /> Submit Dossier</button></div>
                  </div>
              )
          } else if (phase === PsychologyPhase.UPLOADING_SRT) {
              return (
                  <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in">
                      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3"><Upload className="text-blue-600" size={24}/> Handwritten Response Verification</h3>
                          <div className="space-y-6 mb-8">
                              {srtSheetUploads.map((img, idx) => (
                                  <div key={idx} className="flex flex-col md:flex-row gap-6 p-4 rounded-3xl border border-slate-100 bg-slate-50/50">
                                      <div className="w-full md:w-1/3 relative rounded-2xl overflow-hidden aspect-[3/4] border-2 border-slate-200 shadow-sm group shrink-0">
                                          <img src={`data:image/jpeg;base64,${img}`} className="w-full h-full object-cover" alt={`Sheet ${idx + 1}`} />
                                          <button onClick={() => removeSrtSheet(idx)} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shadow-lg"><Trash2 size={14} /></button>
                                      </div>
                                      <div className="w-full md:w-2/3 flex flex-col">
                                          <textarea value={srtSheetTexts[idx] || ""} onChange={(e) => { const val = e.target.value; setSrtSheetTexts(prev => { const next = [...prev]; next[idx] = val; return next; }); }} placeholder={srtTranscribingIndices.includes(idx) ? "AI is reading..." : "Transcript..."} className="flex-1 w-full p-4 bg-white border border-slate-200 rounded-2xl focus:border-blue-500 outline-none transition-all font-mono text-xs md:text-sm text-slate-700 resize-none min-h-[200px]" />
                                      </div>
                                  </div>
                              ))}
                              <label className="flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition-all p-8 group">
                                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-slate-200 transition-colors"><Camera size={24} className="text-slate-400 group-hover:text-slate-600"/></div>
                                  <span className="text-xs font-black uppercase text-slate-400 group-hover:text-slate-600 tracking-widest">Add Page Photo</span>
                                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleSrtSheetUpload} />
                              </label>
                          </div>
                      </div>
                      <div className="flex justify-center pt-4"><button onClick={submitSRT} className="px-16 py-6 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-2xl hover:scale-105 flex items-center gap-3"><Send size={16} /> Submit Dossier</button></div>
                  </div>
              )
          } else {
              return (
                <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in slide-in-from-bottom-20">
                   <div className="text-center space-y-6"><h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Dossier Submission</h2><p className="text-slate-500 font-medium italic">"Upload your written responses for psychometric evaluation."</p></div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{items.map((item, index) => { const hasImage = !!tatUploads[index]; const isTranscribing = transcribingIndices.includes(index); return (
                      <div key={index} className={`bg-white rounded-[2.5rem] p-6 border-2 relative overflow-hidden transition-all ${hasImage ? 'border-green-100 shadow-md' : 'border-slate-100 shadow-sm'}`}>
                          <div className="flex justify-between items-center mb-4"><span className="font-black text-slate-300 text-xl select-none">{(index + 1).toString().padStart(2, '0')}</span>{hasImage && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold uppercase">Uploaded</span>}</div>
                          {hasImage ? (
                              <div className="space-y-4">
                                  <div className="relative rounded-2xl overflow-hidden bg-slate-50 h-32 border border-slate-100 group"><img src={`data:image/jpeg;base64,${tatUploads[index]}`} className="w-full h-full object-cover" alt="Upload" /><button onClick={() => { setTatUploads(prev => { const n = [...prev]; n[index] = ''; return n; }); setTatTexts(prev => { const n = [...prev]; n[index] = ''; return n; }); }} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button></div>
                                  {isTranscribing ? (<div className="flex items-center gap-2 text-xs text-blue-600 font-bold animate-pulse"><Loader2 size={12} className="animate-spin" /> Transcribing...</div>) : (<div className="relative"><textarea value={tatTexts[index]} onChange={(e) => setTatTexts(prev => { const n = [...prev]; n[index] = e.target.value; return n; })} className="w-full text-[10px] p-3 bg-slate-50 rounded-xl resize-none outline-none border border-transparent focus:border-slate-200 h-20" placeholder="AI Transcript..." /><div className="absolute bottom-2 right-2 text-slate-400"><Edit size={10} /></div></div>)}
                              </div>
                          ) : (
                              <div className="flex flex-col gap-2">
                                  <button onClick={() => handleFileSelect(index)} className="w-full h-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-all group"><Upload size={18} className="group-hover:scale-110 transition-transform" /><span className="text-[10px] font-black uppercase tracking-widest">Select File</span></button>
                                  <button onClick={() => { setActiveCameraKey(index); setShowCamera(true); }} className="w-full h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"><Camera size={14} /> Camera</button>
                              </div>
                          )}
                      </div>); })}
                   </div>
                   <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileChange} />
                   <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-lg p-6 border-t border-slate-200 flex justify-center"><button onClick={submitDossier} disabled={tatUploads.filter(u => u).length === 0} className="px-16 py-5 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-2xl disabled:opacity-50">Submit for Assessment</button></div>
                   <CameraModal isOpen={showCamera} onClose={() => setShowCamera(false)} onCapture={handleCameraCapture} />
                </div>
              );
          }
      }
  }

  if (phase === PsychologyPhase.EVALUATING) {
    const tips = type === TestType.WAT ? WAT_TIPS : type === TestType.SRT ? SRT_TIPS : type === TestType.TAT ? TAT_TIPS : SDT_TIPS;
    const currentTip = tips[currentTipIndex % tips.length];

    return (
        <div className="flex flex-col items-center justify-center py-40 space-y-12 animate-in fade-in">
            <Loader2 className="w-24 h-24 text-blue-600 animate-spin" />
            <div className="text-center space-y-4 max-w-lg px-6">
                <p className="text-slate-900 font-black uppercase tracking-[0.5em] text-sm mb-4">Psychologist Assessment</p>
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm transition-all duration-500 min-h-[100px] flex items-center justify-center">
                    <p className="text-blue-800 font-bold text-sm italic">"Tip: {currentTip}"</p>
                </div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4">Analyzing personality patterns...</p>
            </div>
        </div>
    );
  }

  if (phase === PsychologyPhase.COMPLETED) {
    if (isGuest && type === TestType.SDT) {
        return (
            <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="bg-white w-full max-w-md p-8 md:p-12 rounded-[3rem] shadow-2xl text-center space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-yellow-500"></div>
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-900 shadow-inner mb-2 relative">
                        <FileSignature size={40} className="text-slate-300 absolute" />
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10 rounded-full backdrop-blur-[1px]">
                            <Lock size={32} className="text-slate-900" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">SDT Report Locked</h3>
                        <p className="text-slate-500 font-medium text-sm leading-relaxed px-4">Your Self Description has been analyzed. <br/><span className="text-blue-600 font-bold">Sign Up</span> to unlock your Consistency Score and Psych Evaluation.</p>
                    </div>
                    <div className="space-y-4">
                        <button onClick={onLoginRedirect} className="w-full py-5 bg-yellow-400 text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-yellow-300 transition-all shadow-xl hover:-translate-y-1 flex items-center justify-center gap-3">
                            <LogIn size={16} /> View Full Assessment
                        </button>
                        <button onClick={() => window.location.reload()} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:border-slate-300 hover:text-slate-600 transition-all">
                            Return to Dashboard
                        </button>
                    </div>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Restricted Access</p>
                </div>
            </div>
        );
    }

    if (feedback?.error) {
        return (
            <div className="max-w-2xl mx-auto py-20 text-center animate-in fade-in slide-in-from-bottom-8">
                <div className="bg-red-50 p-8 rounded-[3rem] border border-red-100 shadow-xl">
                    <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Activity size={32} className="animate-pulse" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Assessment Pending</h3>
                    <p className="text-slate-600 font-medium leading-relaxed mb-8">
                        {feedback.recommendations || "Server Busy. Your inputs have been saved safely."}
                    </p>
                    <div className="flex justify-center gap-4">
                        <button onClick={() => window.location.reload()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all">
                            Return to Dashboard
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">
                        Check "Mission Logs" later to view your raw response.
                    </p>
                </div>
            </div>
        );
    }

    const speedAnalysis = (type === TestType.WAT || type === TestType.SRT) ? getAttemptAnalysis(type, feedback?.attemptedCount || 0) : null;

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-12 print:bg-white print:p-0 print:m-0 print:max-w-none">
            <style>
                {`
                  @media print {
                    body * { visibility: hidden; }
                    .print-section, .print-section * { visibility: visible; }
                    .print-section { position: absolute; left: 0; top: 0; width: 100%; height: auto; z-index: 9999; padding: 20px; }
                    .no-print { display: none !important; }
                  }
                `}
            </style>

            <div className="print-section space-y-12">
                <div className="bg-slate-900 text-white p-12 md:p-16 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-10 print:rounded-none">
                    <div className="space-y-4 text-center md:text-left z-10">
                        <span className="bg-yellow-400 text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Psychology Report</span>
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">{type} Verdict</h2>
                        {feedback?.generalFeedback && <p className="text-lg text-slate-300 font-medium italic">"{feedback.generalFeedback}"</p>}
                    </div>
                    <div className="flex flex-col items-center bg-white/5 p-8 md:p-12 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl shadow-2xl z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">Board Grade</span>
                        <div className="text-7xl md:text-9xl font-black text-yellow-400">{feedback?.score || 0}</div>
                        {speedAnalysis && (
                            <div className={`mt-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${speedAnalysis.color}`}>
                                {speedAnalysis.label}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border-2 border-slate-50">
                    <h4 className="font-black text-xs uppercase tracking-[0.3em] text-green-600 mb-8 flex items-center gap-4"><CheckCircle className="w-6 h-6" /> Key Strengths</h4>
                    <div className="space-y-4">
                        {feedback?.strengths?.map((s: string, i: number) => (
                        <div key={i} className="flex gap-4 p-5 bg-green-50 rounded-2xl border border-green-100 text-slate-800 text-sm font-bold">
                            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" /> {s}
                        </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border-2 border-slate-50">
                    <h4 className="font-black text-xs uppercase tracking-[0.3em] text-red-500 mb-8 flex items-center gap-4"><AlertCircle className="w-6 h-6" /> Areas of Concern</h4>
                    <div className="space-y-4">
                        {feedback?.weaknesses?.map((w: string, i: number) => (
                        <div key={i} className="flex gap-4 p-5 bg-red-50 rounded-2xl border border-red-100 text-slate-800 text-sm font-bold">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" /> {w}
                        </div>
                        ))}
                    </div>
                </div>
                </div>

                {feedback?.detailedAnalysis && (
                    <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-slate-100 space-y-8">
                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-4"><Target className="text-blue-600" /> Itemized Assessment</h4>
                        <div className="space-y-6">
                            {feedback.detailedAnalysis.map((item: any, i: number) => (
                                <div key={i} className="flex flex-col md:flex-row gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:shadow-xl transition-all">
                                    <div className="md:w-1/4">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Word / Situation</span>
                                        <p className="font-black text-slate-900 uppercase">{item.word || item.situation}</p>
                                    </div>
                                    <div className="md:w-3/4 grid md:grid-cols-2 gap-6">
                                        <div>
                                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-1">Your Reaction</span>
                                            <p className="text-sm font-medium text-slate-700 italic">"{item.userResponse || 'Not Attempted'}"</p>
                                        </div>
                                        <div className="bg-green-100/50 p-4 rounded-2xl">
                                            <span className="text-[9px] font-black text-green-700 uppercase tracking-widest block mb-1">Board's Ideal Path</span>
                                            <p className="text-xs font-bold text-slate-700">{item.idealResponse}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {userId && <SessionFeedback testType={type} userId={userId} />}

            <div className="flex justify-center gap-6 no-print">
               <button onClick={() => window.print()} className="px-10 py-5 bg-blue-600 text-white rounded-full font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-blue-700 transition-all shadow-xl">
                  <Printer size={16} /> Print Dossier
               </button>
               <button onClick={() => window.location.reload()} className="px-10 py-5 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl">
                  Close & Report
               </button>
            </div>
        </div>
    );
  }

  return null;
};

export default PsychologyTest;
