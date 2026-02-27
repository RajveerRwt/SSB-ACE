
import React, { useState, useEffect, useRef } from 'react';
import { Timer, Send, Loader2, Image as ImageIcon, CheckCircle, ShieldCheck, FileText, Target, Award, AlertCircle, Upload, Trash2, BookOpen, Layers, Brain, Eye, FastForward, Edit, X, Save, RefreshCw, PenTool, FileSignature, HelpCircle, ChevronDown, ChevronUp, ScanEye, Activity, Camera, Info, LogIn, ThumbsUp, ThumbsDown, MinusCircle, Lock, Download, Printer, UserPlus } from 'lucide-react';
import { generateTestContent, evaluatePerformance, transcribeHandwrittenStory, extractCustomStimuli, STANDARD_WAT_SET } from '../services/geminiService';
import { getTATScenarios, getWATWords, getSRTQuestions, getUserSubscription, TEST_RATES } from '../services/supabaseService';
import { TestType } from '../types';
import CameraModal from './CameraModal';
import SessionFeedback from './SessionFeedback';

interface PsychologyProps {
  type: TestType;
  onSave?: (result: any, id?: string) => void;
  onPendingSave?: (testType: string, originalData: any) => Promise<string>;
  isAdmin?: boolean;
  userId?: string;
  isGuest?: boolean;
  onLoginRedirect?: () => void;
  onConsumeCoins?: (amount: number) => Promise<boolean>;
}

enum PsychologyPhase {
  IDLE,
  SET_SELECTION,
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
  "Avoid 'I', 'Me', 'My'. Make sentences universal.",
  "Showcase OLQs: Courage, Cooperation, Responsibility.",
  "Avoid giving advice (should/could/must). Observation > Instruction.",
  "Turn negative words into positive outcomes.",
  "Spontaneity is your best friend. Don't overthink.",
  "Keep sentences grammatical but concise."
];

const SRT_TIPS = [
  "Action is key. Do not just plan, execute.",
  "Prioritize: Save Life > Protect Property > Social Duty.",
  "Be the hero of your own situation. Don't rely on others.",
  "Keep responses telegraphic (short & meaningful).",
  "Address the root cause, not just the symptoms.",
  "Maintain a calm and composed mindset in crisis."
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

const PsychologyTest: React.FC<PsychologyProps> = ({ type, onSave, onPendingSave, isAdmin, userId, isGuest = false, onLoginRedirect, onConsumeCoins }) => {
  const [items, setItems] = useState<any[]>([]);
  const [pendingId, setPendingId] = useState<string | undefined>(undefined);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [phase, setPhase] = useState<PsychologyPhase>(PsychologyPhase.IDLE);
  const [availableSets, setAvailableSets] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(-1);
  const [activeSetName, setActiveSetName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pregeneratedImages, setPregeneratedImages] = useState<Record<string, string>>({});
  const [customTatImages, setCustomTatImages] = useState<string[]>(new Array(11).fill(''));
  const [useCustomTat, setUseCustomTat] = useState(false);
  
  const [customWatWords, setCustomWatWords] = useState<string>('');
  const [useCustomWat, setUseCustomWat] = useState(false);
  
  const [customSrtSituations, setCustomSrtSituations] = useState<string>('');
  const [useCustomSrt, setUseCustomSrt] = useState(false);
  const [isExtractingCustom, setIsExtractingCustom] = useState(false);

  useEffect(() => {
    if (isGuest || type === TestType.SDT) return;
    
    const fetchSets = async () => {
        setIsLoading(true);
        try {
            let sets: Record<string, any[]> = {};
            if (type === TestType.TAT) {
                const data = await getTATScenarios();
                sets = data.reduce((acc: any, img: any) => {
                    const tag = img.set_tag || 'Default';
                    if (!acc[tag]) acc[tag] = [];
                    acc[tag].push(img);
                    return acc;
                }, {});
            } else if (type === TestType.WAT) {
                const data = await getWATWords();
                sets = data.reduce((acc: any, row: any) => {
                    const tag = row.set_tag || 'General';
                    if (!acc[tag]) acc[tag] = [];
                    acc[tag].push(row.word);
                    return acc;
                }, {});
            } else if (type === TestType.SRT) {
                const data = await getSRTQuestions();
                sets = data.reduce((acc: any, row: any) => {
                    const tag = row.set_tag || 'General';
                    if (!acc[tag]) acc[tag] = [];
                    acc[tag].push(row.question);
                    return acc;
                }, {});
            }
            
            const setList = Object.keys(sets).map(name => ({
                name,
                count: sets[name].length,
                items: sets[name]
            })).filter(s => s.count > 0);
            
            setAvailableSets(setList);
            setPhase(PsychologyPhase.SET_SELECTION);
        } catch (e) {
            console.error("Failed to fetch sets", e);
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchSets();
  }, [type, isGuest]);
  
  const startDirectEvaluation = () => {
    setIsLoading(true);
    setActiveSetName('Direct Assessment (Custom)');
    
    const finalItems = customTatImages.map((url, i) => ({
        id: `tat-custom-${i}`,
        content: url ? `Custom Image ${i + 1}` : `Placeholder Image ${i + 1}`,
        imageUrl: url || undefined
    }));
    
    const images: Record<string, string> = {};
    finalItems.forEach((item) => { if (item.imageUrl) images[item.id] = item.imageUrl; });
    setPregeneratedImages(images);
    
    finalItems.push({ id: 'tat-12-blank', content: 'BLANK SLIDE', imageUrl: undefined });
    
    setItems(finalItems);
    setTatUploads(new Array(finalItems.length).fill(''));
    setTatTexts(new Array(finalItems.length).fill(''));
    setPhase(PsychologyPhase.UPLOADING_STORIES);
    setIsLoading(false);
  };

  const startDirectEvaluationWat = () => {
    setIsLoading(true);
    setActiveSetName('Direct Assessment (Custom WAT)');
    const words = customWatWords.split('\n').map(w => w.trim()).filter(w => w);
    if (words.length === 0) {
        alert("Please enter at least one word.");
        setIsLoading(false);
        return;
    }
    const finalItems = words.map((word, i) => ({
        id: `wat-custom-${i}`,
        content: word
    }));
    setItems(finalItems);
    setWatResponses(new Array(finalItems.length).fill(''));
    setWatSheetUploads([]);
    setWatSheetTexts([]);
    setPhase(PsychologyPhase.UPLOADING_WAT);
    setIsLoading(false);
  };

  const startDirectEvaluationSrt = () => {
    setIsLoading(true);
    setActiveSetName('Direct Assessment (Custom SRT)');
    const situations = customSrtSituations.split('\n').map(s => s.trim()).filter(s => s);
    if (situations.length === 0) {
        alert("Please enter at least one situation.");
        setIsLoading(false);
        return;
    }
    const finalItems = situations.map((sit, i) => ({
        id: `srt-custom-${i}`,
        content: sit
    }));
    setItems(finalItems);
    setSrtResponses(new Array(finalItems.length).fill(''));
    setSrtSheetUploads([]);
    setSrtSheetTexts([]);
    setPhase(PsychologyPhase.UPLOADING_SRT);
    setIsLoading(false);
  };
  
  // TAT States
  const [tatUploads, setTatUploads] = useState<string[]>(new Array(12).fill(''));
  const [tatTexts, setTatTexts] = useState<string[]>(new Array(12).fill(''));
  const [transcribingIndices, setTranscribingIndices] = useState<number[]>([]);
  
  // SRT States
  const [srtResponses, setSrtResponses] = useState<string[]>([]);
  const [srtSheetUploads, setSrtSheetUploads] = useState<string[]>([]);
  const [srtSheetTexts, setSrtSheetTexts] = useState<string[]>([]); // New: Store transcribed text
  const [srtTranscribingIndices, setSrtTranscribingIndices] = useState<number[]>([]); // New: Loading state for SRT OCR

  // WAT States
  const [watResponses, setWatResponses] = useState<string[]>([]);
  const [watSheetUploads, setWatSheetUploads] = useState<string[]>([]);
  const [watSheetTexts, setWatSheetTexts] = useState<string[]>([]); // New: Store transcribed text for WAT
  const [watTranscribingIndices, setWatTranscribingIndices] = useState<number[]>([]); // New: Loading state for WAT OCR

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
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  
  // Camera State
  const [showCamera, setShowCamera] = useState(false);
  const [activeCameraKey, setActiveCameraKey] = useState<string | number | null>(null); // Number for TAT index, String for SDT key

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadIndex = useRef<number | null>(null);
  const customTatInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (base64: string, maxWidth: number = 1024, maxHeight: number = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = `data:image/jpeg;base64,${base64}`;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // 0.7 quality
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = () => resolve(base64); // Fallback to original if error
    });
  };

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

  const getScoreDescription = (score: number) => {
      if (score >= 9) return "Outstanding";
      if (score >= 7.5) return "High Potential";
      if (score >= 6) return "Recommended";
      if (score >= 4) return "Average";
      return "Below Average";
  };

  // Helper to determine Speed Rating based on specific rules
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

  const handleDownloadReport = () => {
      window.print();
  };

  const startTest = async (selectedSet?: any) => {
    setIsLoading(true);
    setFeedback(null);
    setWatSheetUploads([]);
    setWatSheetTexts([]);
    setSrtSheetUploads([]);
    setSrtSheetTexts([]);

    // Coin Deduction Logic
    if (selectedSet && onConsumeCoins && !isGuest) {
        const cost = (TEST_RATES as any)[type] || 5;
        const success = await onConsumeCoins(cost);
        if (!success) {
            setIsLoading(false);
            return;
        }
    }
    
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
      let usageCount = 0;
      
      if (userId && !isGuest) {
          const sub = await getUserSubscription(userId);
          if (type === TestType.TAT) usageCount = sub.usage.tat_used;
          else if (type === TestType.WAT) usageCount = sub.usage.wat_used;
          else if (type === TestType.SRT) usageCount = sub.usage.srt_used;
      }

      if (type === TestType.TAT) {
        // --- TAT Logic ---
        if (useCustomTat && customTatImages.some(img => img)) {
            const validCustomImages = customTatImages.filter(img => img);
            setActiveSetName('Custom User Set');
            finalItems = validCustomImages.map((url, i) => ({
                id: `tat-custom-${i}`,
                content: `Custom Image ${i + 1}`,
                imageUrl: url
            }));
        } else if (selectedSet) {
            setActiveSetName(selectedSet.name);
            finalItems = selectedSet.items.slice(0, 11).map((s: any, i: number) => ({
                id: `tat-db-${i}`,
                content: s.description || 'Picture Story',
                imageUrl: s.image_url
            }));
        } else {
            const dbScenarios = await getTATScenarios();
            
            if (!dbScenarios || dbScenarios.length === 0) {
               // Standard fallback only if DB fails completely
               const staticTAT = [ "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80" ]; 
               finalItems = staticTAT.map((url, i) => ({ id: `tat-fb-${i}`, content: 'Fallback Set', imageUrl: url }));
            } else {
               let setImages: any[] = [];
               
               if (isGuest) {
                   // Guest: Strictly first 11 images
                   setActiveSetName('Guest Trial Set');
                   setImages = dbScenarios.slice(0, 11);
               } else {
                   // Logged In: Rotate sets (Fallback if no set selected)
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
        }
        
        const images: Record<string, string> = {};
        finalItems.forEach((item) => { if (item.imageUrl) images[item.id] = item.imageUrl; });
        setPregeneratedImages(images);
        finalItems.push({ id: 'tat-12-blank', content: 'BLANK SLIDE' });
        setTatUploads(new Array(finalItems.length).fill(''));
        setTatTexts(new Array(finalItems.length).fill(''));

      } else if (type === TestType.WAT) {
        // --- WAT Logic ---
        let wordList: string[] = [];
        
        if (useCustomWat && customWatWords.trim()) {
            wordList = customWatWords.split('\n').map(w => w.trim()).filter(w => w);
            setActiveSetName('Custom User Set');
        } else if (selectedSet) {
            setActiveSetName(selectedSet.name);
            wordList = selectedSet.items;
        } else {
            const dbWords = await getWATWords();
            if (dbWords && dbWords.length > 0) {
                if (isGuest) {
                    // Guest: First 60 words
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
                    const idealSets = setNames.filter(name => sets[name].length >= 60); // Prefer 60 word sets
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
                    
                    // Shuffle large general sets for logged in users
                    if (selectedSetName === 'General' && wordList.length > 60) {
                       wordList = wordList.sort(() => Math.random() - 0.5);
                    }
                }
            } else {
                // Fallback
                wordList = [...STANDARD_WAT_SET];
                if (!isGuest) wordList = wordList.sort(() => Math.random() - 0.5);
                setActiveSetName('Standard Fallback Set');
            }
        }
        
        finalItems = wordList.slice(0, 60).map((word, index) => ({ id: `wat-${index}`, content: word }));
        setWatResponses(new Array(finalItems.length).fill(''));

      } else if (type === TestType.SRT) {
        // --- SRT Logic ---
        let srtList: string[] = [];
        
        if (useCustomSrt && customSrtSituations.trim()) {
            srtList = customSrtSituations.split('\n').map(s => s.trim()).filter(s => s);
            setActiveSetName('Custom User Set');
        } else if (selectedSet) {
            setActiveSetName(selectedSet.name);
            srtList = selectedSet.items;
        } else {
            const dbQuestions = await getSRTQuestions();
            if (dbQuestions && dbQuestions.length > 0) {
                if (isGuest) {
                    // Guest: First 60 items
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
                // Fallback
                const data = await generateTestContent(type);
                srtList = data.items.map((i: any) => i.content);
                setActiveSetName('Standard Fallback Set');
            }
        }

        // Ensure 60 items
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
        if (type === TestType.WAT) {
            playBuzzer(500, 0.15); 
        } else {
            playBuzzer(300, 0.1);
        }
        setCurrentIndex(nextIdx);
        setupSlide(nextIdx, items);
      } else {
        if (type === TestType.TAT) setPhase(PsychologyPhase.UPLOADING_STORIES);
        else if (type === TestType.WAT) setPhase(PsychologyPhase.UPLOADING_WAT);
        else setPhase(PsychologyPhase.COMPLETED);
      }
    }
  };

  const handleCustomStimuliUpload = async (e: React.ChangeEvent<HTMLInputElement>, testType: 'WAT' | 'SRT') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsExtractingCustom(true);
    try {
        const reader = new FileReader();
        const fileContent = await new Promise<{base64: string, type: string}>((resolve) => {
            reader.onloadend = () => resolve({
                base64: (reader.result as string).split(',')[1],
                type: file.type
            });
            reader.readAsDataURL(file);
        });

        const extractedText = await extractCustomStimuli(fileContent.base64, fileContent.type, testType);

        if (testType === 'WAT') {
            setCustomWatWords(prev => prev ? prev + '\n' + extractedText : extractedText);
        } else {
            setCustomSrtSituations(prev => prev ? prev + '\n' + extractedText : extractedText);
        }
    } catch (err) {
        console.error("Extraction failed", err);
        alert("Failed to extract text. Please try a clearer image or manual entry.");
    } finally {
        setIsExtractingCustom(false);
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
        let base64 = (reader.result as string).split(',')[1];
        // Resize image to reduce payload size
        base64 = await resizeImage(base64, 1024, 1024);
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

  const handleCameraCapture = async (base64: string) => {
      // Resize image to reduce payload size
      const resizedBase64 = await resizeImage(base64, 1024, 1024);
      if (typeof activeCameraKey === 'number') {
          processTATImage(activeCameraKey, resizedBase64);
      } else if (typeof activeCameraKey === 'string') {
          setSdtImages(prev => ({ ...prev, [activeCameraKey]: { data: resizedBase64, mimeType: 'image/jpeg' } }));
      }
      setActiveCameraKey(null);
  };

  const handleCustomTatUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setCustomTatImages(prev => {
            const next = [...prev];
            next[index] = `data:${file.type};base64,${base64}`;
            return next;
        });
    };
    reader.readAsDataURL(file);
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
      const files = Array.from(e.target.files);
      const startIdx = watSheetUploads.length;
      const fileProcessingPromises = files.map(file => {
          return new Promise<{base64: string, type: string}>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  resolve({
                      base64: (reader.result as string).split(',')[1],
                      type: file.type
                  });
              };
              reader.readAsDataURL(file);
          });
      });
      const processedFiles = await Promise.all(fileProcessingPromises);
      
      // Resize all images
      const resizedFiles = await Promise.all(processedFiles.map(async (f) => ({
          ...f,
          base64: await resizeImage(f.base64, 1024, 1024)
      })));

      setWatSheetUploads(prev => [...prev, ...resizedFiles.map(f => f.base64)]);
      setWatSheetTexts(prev => [...prev, ...new Array(resizedFiles.length).fill('')]);
      resizedFiles.forEach(async (fileData, i) => {
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
      const files = Array.from(e.target.files);
      const startIdx = srtSheetUploads.length;
      const fileProcessingPromises = files.map(file => {
          return new Promise<{base64: string, type: string}>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  resolve({
                      base64: (reader.result as string).split(',')[1],
                      type: file.type
                  });
              };
              reader.readAsDataURL(file);
          });
      });
      const processedFiles = await Promise.all(fileProcessingPromises);

      // Resize all images
      const resizedFiles = await Promise.all(processedFiles.map(async (f) => ({
          ...f,
          base64: await resizeImage(f.base64, 1024, 1024)
      })));

      setSrtSheetUploads(prev => [...prev, ...resizedFiles.map(f => f.base64)]);
      setSrtSheetTexts(prev => [...prev, ...new Array(resizedFiles.length).fill('')]);
      resizedFiles.forEach(async (fileData, i) => {
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
      const originalData = { sdtData, sdtImages };
      let currentId = pendingId;
      
      if (onPendingSave && !isGuest) {
          currentId = await onPendingSave(type, originalData);
          setPendingId(currentId);
      }

      try {
          const result = await evaluatePerformance(type, originalData);
          if (result.score === 0 && (result.verdict === "Server Busy" || result.verdict === "Insufficient Data")) { throw new Error("AI Busy"); }
          setFeedback(result);
          if (onSave && !isGuest) onSave({ ...result, sdtData, sdtImages }, currentId);
          setPhase(PsychologyPhase.COMPLETED);
      } catch (err) {
          console.error("SDT Eval Error", err);
          const fallback = { score: 0, verdict: "Technical Failure", recommendations: "Assessment Pending. Your responses have been saved.", error: true, sdtData, sdtImages };
          setFeedback(fallback);
          if (onSave && !isGuest) onSave(fallback, currentId);
          setPhase(PsychologyPhase.COMPLETED);
      }
  };

  const submitSRT = async () => {
      setPhase(PsychologyPhase.EVALUATING);
      const originalData = { 
          testType: 'SRT', 
          srtResponses: items.map((item, i) => ({ id: i + 1, situation: item.content, response: srtResponses[i] || "" })),
          srtSheetImages: srtSheetUploads,
          srtSheetTranscripts: srtSheetTexts 
      };
      
      let currentId = pendingId;
      if (onPendingSave && !isGuest) {
          currentId = await onPendingSave(type, originalData);
          setPendingId(currentId);
      }

      try {
          const result = await evaluatePerformance(type, originalData);
          if (result.score === 0 && (result.verdict === "Server Busy" || result.verdict === "Insufficient Data")) { throw new Error("AI Busy"); }
          setFeedback(result);
          if (onSave && !isGuest) onSave({ ...result, srtResponses, srtSheetImages: srtSheetUploads, srtSheetTranscripts: srtSheetTexts }, currentId);
          setPhase(PsychologyPhase.COMPLETED);
      } catch (err) { 
          console.error("SRT Eval Error", err); 
          const fallback = { score: 0, verdict: "Technical Failure", recommendations: "Assessment Pending. Your responses have been saved.", error: true, srtResponses: originalData.srtResponses };
          setFeedback(fallback);
          if (onSave && !isGuest) onSave(fallback, currentId);
          setPhase(PsychologyPhase.COMPLETED);
      }
  };

  const submitWAT = async () => {
      setPhase(PsychologyPhase.EVALUATING);
      const originalData = { 
          testType: 'WAT', 
          watResponses: items.map((item, i) => ({ id: i + 1, word: item.content, response: watResponses[i] || "" })),
          watSheetImages: watSheetUploads,
          watSheetTranscripts: watSheetTexts 
      };

      let currentId = pendingId;
      if (onPendingSave && !isGuest) {
          currentId = await onPendingSave(type, originalData);
          setPendingId(currentId);
      }

      try {
          const result = await evaluatePerformance(type, originalData);
          if (result.score === 0 && (result.verdict === "Server Busy" || result.verdict === "Insufficient Data")) { throw new Error("AI Busy"); }
          setFeedback(result);
          if (onSave && !isGuest) onSave({ ...result, watResponses, watSheetImages: watSheetUploads, watSheetTranscripts: watSheetTexts }, currentId);
          setPhase(PsychologyPhase.COMPLETED);
      } catch (err) { 
          console.error("WAT Eval Error", err); 
          const fallback = { score: 0, verdict: "Technical Failure", recommendations: "Assessment Pending. Your responses have been saved.", error: true, watResponses: originalData.watResponses };
          setFeedback(fallback);
          if (onSave && !isGuest) onSave(fallback, currentId);
          setPhase(PsychologyPhase.COMPLETED);
      }
  };

  const submitDossier = async () => {
    setPhase(PsychologyPhase.EVALUATING);
    let tatPairs: any[] = [];
    let currentId = pendingId;

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
            } catch (e) { console.warn("Could not fetch stimulus image for AI context:", e); }
        }
        return { storyIndex: index + 1, stimulusImage: stimulusBase64, stimulusDesc: item.content, userStoryImage: userStoryImage, userStoryText: tatTexts[index] };
      }));
      const validPairs = tatPairs.filter(p => p !== null);
      const originalData = { tatPairs: validPairs, testType: type, itemCount: items.length };

      if (onPendingSave && !isGuest) {
          currentId = await onPendingSave(type, originalData);
          setPendingId(currentId);
      }
      
      const result = await evaluatePerformance(type, originalData);
      if (result.score === 0 && (result.verdict === "Server Busy" || result.verdict === "Insufficient Data")) { throw new Error("AI Busy"); }
      setFeedback(result);
      if (onSave && !isGuest) onSave({ ...result, tatImages: tatUploads, tatPairs: validPairs }, currentId);
      setPhase(PsychologyPhase.COMPLETED);
    } catch (err) { 
        console.error("Evaluation error:", err); 
        const fallback = { score: 0, verdict: "Technical Failure", recommendations: "Assessment Pending. Your responses have been saved.", error: true, tatPairs: tatPairs.filter(p => p !== null) };
        setFeedback(fallback);
        if (onSave && !isGuest) onSave(fallback, currentId);
        setPhase(PsychologyPhase.COMPLETED); 
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-6">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Loading Board Data...</p>
      </div>
    );
  }

  if (phase === PsychologyPhase.SET_SELECTION) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-8">
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Select Your {type} Set</h2>
          <p className="text-slate-500 font-medium">Choose a board-authorized set to begin your assessment.</p>
          <div className="flex justify-center gap-4 mt-6">
             <div className="bg-yellow-400 text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Award size={14} /> Cost: {(TEST_RATES as any)[type] || 5} Coins
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {availableSets.map((set, idx) => (
            <div 
              key={idx}
              onClick={() => startTest(set)}
              className="group bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-xl hover:shadow-2xl hover:border-blue-400 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Layers size={80} />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-slate-900 text-yellow-400 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                    <BookOpen size={24} />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Set #{idx + 1}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{set.name}</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">{set.count} {type === TestType.TAT ? 'Images' : type === TestType.WAT ? 'Words' : 'Situations'}</p>
                </div>
                <div className="pt-4 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    Start Now <FastForward size={14} className="text-blue-600" />
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <ChevronDown className="text-slate-300 group-hover:text-blue-600 -rotate-90" size={16} />
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Custom Mode Card */}
          <div 
            onClick={() => setPhase(PsychologyPhase.IDLE)}
            className="group bg-slate-50 p-8 rounded-[3rem] border-2 border-dashed border-slate-200 hover:border-slate-400 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-4"
          >
            <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-400 group-hover:text-slate-600 transition-colors">
              <Edit size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Custom Practice</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Upload your own stimuli</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
               <p>• 12 Pictures (11 from DB + 1 Blank). 30s viewing, 4m writing per slide. All images are retrieved from authorized board sets.</p>
             ) : type === TestType.SDT ? (
               <p>• Write 5 distinct paragraphs describing opinions of Parents, Teachers, Friends, Self, and Future Aims. Total time: 15 Minutes. Be realistic and honest.</p>
             ) : type === TestType.SRT ? (
               <p>• 60 Situations (30 Minutes). Respond to each situation naturally. <br/>• <strong>Note:</strong> You can type responses in the boxes below OR write on paper and upload a photo at the end.</p>
             ) : (
               <p>• 60 Words (15s each). Write the first thought that comes to mind. <br/>• <strong>Note:</strong> You can type responses in real-time OR write on paper and upload a photo at the end.</p>
             )}
           </div>
        </div>

        {type === TestType.TAT && (
            <div className="mb-12 p-10 bg-white rounded-[3rem] border-4 border-slate-50 shadow-xl text-left relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-700"></div>
                
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div className="space-y-2">
                            <h4 className="font-black text-xl uppercase tracking-tighter text-slate-900 flex items-center gap-3">
                                <ImageIcon className="text-blue-600" size={24} /> Custom Stimulus Set
                            </h4>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest opacity-60">Upload your own images for practice</p>
                        </div>
                        <button 
                            onClick={() => {
                                if (isGuest) {
                                    if (onLoginRedirect) onLoginRedirect();
                                    return;
                                }
                                setUseCustomTat(!useCustomTat);
                            }}
                            className={`px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-lg flex items-center gap-3 ${useCustomTat ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            {useCustomTat ? <><CheckCircle size={16}/> Using Custom Set</> : <><RefreshCw size={16}/> Use Platform Set</>}
                        </button>
                    </div>
                    
                    {useCustomTat && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {customTatImages.map((img, idx) => (
                                <div key={idx} className="relative aspect-[3/4] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden group/item transition-all hover:border-blue-400 hover:shadow-lg">
                                    {img ? (
                                        <>
                                            <img src={img} className="w-full h-full object-cover" alt={`Custom ${idx + 1}`} />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                                                <button 
                                                    onClick={() => setCustomTatImages(prev => { const next = [...prev]; next[idx] = ''; return next; })}
                                                    className="bg-red-500 text-white p-2 rounded-xl shadow-xl hover:scale-110 transition-transform"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-900">
                                                #{idx + 1}
                                            </div>
                                        </>
                                    ) : (
                                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mb-2 group-hover/item:scale-110 transition-transform">
                                                <Upload size={18} className="text-blue-600" />
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Image {idx + 1}</span>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={(e) => handleCustomTatUpload(idx, e)} 
                                            />
                                        </label>
                                    )}
                                </div>
                            ))}
                            <div className="aspect-[3/4] bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-center p-4 border-2 border-slate-800">
                                <div className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-1">Blank</div>
                                <div className="text-[8px] font-bold text-slate-500 uppercase leading-tight">Auto-Added Slide 12</div>
                            </div>
                        </div>
                    )}
                    
                    <div className="mt-8 flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                            {useCustomTat 
                                ? "You are using a custom set. Ensure you upload all 11 images for a complete board experience. The 12th slide will be a standard blank slide for your final story." 
                                : "The platform uses board-authorized image sets by default. These are curated to test specific Officer Like Qualities (OLQs)."}
                        </p>
                    </div>
                </div>
            </div>
        )}

        {type === TestType.WAT && (
            <div className="mb-12 p-10 bg-white rounded-[3rem] border-4 border-slate-50 shadow-xl text-left relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-700"></div>
                
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div className="space-y-2">
                            <h4 className="font-black text-xl uppercase tracking-tighter text-slate-900 flex items-center gap-3">
                                <Edit className="text-emerald-600" size={24} /> Custom Word Set
                            </h4>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest opacity-60">Enter your own words for practice</p>
                        </div>
                        <button 
                            onClick={() => {
                                if (isGuest) {
                                    if (onLoginRedirect) onLoginRedirect();
                                    return;
                                }
                                setUseCustomWat(!useCustomWat);
                            }}
                            className={`px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-lg flex items-center gap-3 ${useCustomWat ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            {useCustomWat ? <><CheckCircle size={16}/> Using Custom Set</> : <><RefreshCw size={16}/> Use Platform Set</>}
                        </button>
                    </div>
                    
                    {useCustomWat && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                            <div className="flex items-center gap-4">
                                <label className="flex-1 flex items-center justify-center gap-3 p-4 bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-2xl cursor-pointer hover:bg-emerald-100 transition-all group/upload">
                                    {isExtractingCustom ? (
                                        <Loader2 size={20} className="animate-spin text-emerald-600" />
                                    ) : (
                                        <Upload size={20} className="text-emerald-600 group-hover/upload:scale-110 transition-transform" />
                                    )}
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-700">
                                        {isExtractingCustom ? "Extracting..." : "Upload Image/PDF of Words"}
                                    </span>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*,application/pdf" 
                                        onChange={(e) => handleCustomStimuliUpload(e, 'WAT')}
                                        disabled={isExtractingCustom}
                                    />
                                </label>
                            </div>

                            <textarea 
                                value={customWatWords}
                                onChange={(e) => setCustomWatWords(e.target.value)}
                                placeholder="Enter words separated by new lines (e.g. Brave, Success, Failure...)"
                                className="w-full h-48 p-6 bg-slate-50 border-2 border-slate-200 rounded-[2rem] focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-slate-700 resize-none"
                            />
                            <div className="mt-4 flex justify-between items-center px-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Total Words: {customWatWords.split('\n').filter(w => w.trim()).length} / 60 Recommended
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <div className="mt-8 flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <Info size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                            {useCustomWat 
                                ? "Enter one word per line. The test will automatically cycle through these words at 15-second intervals." 
                                : "The platform provides standardized word sets designed to trigger psychological responses related to OLQs."}
                        </p>
                    </div>
                </div>
            </div>
        )}

        {type === TestType.SRT && (
            <div className="mb-12 p-10 bg-white rounded-[3rem] border-4 border-slate-50 shadow-xl text-left relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-700"></div>
                
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div className="space-y-2">
                            <h4 className="font-black text-xl uppercase tracking-tighter text-slate-900 flex items-center gap-3">
                                <Activity className="text-orange-600" size={24} /> Custom Situation Set
                            </h4>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest opacity-60">Enter your own situations for practice</p>
                        </div>
                        <button 
                            onClick={() => {
                                if (isGuest) {
                                    if (onLoginRedirect) onLoginRedirect();
                                    return;
                                }
                                setUseCustomSrt(!useCustomSrt);
                            }}
                            className={`px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-lg flex items-center gap-3 ${useCustomSrt ? 'bg-orange-600 text-white shadow-orange-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            {useCustomSrt ? <><CheckCircle size={16}/> Using Custom Set</> : <><RefreshCw size={16}/> Use Platform Set</>}
                        </button>
                    </div>
                    
                    {useCustomSrt && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                            <div className="flex items-center gap-4">
                                <label className="flex-1 flex items-center justify-center gap-3 p-4 bg-orange-50 border-2 border-dashed border-orange-200 rounded-2xl cursor-pointer hover:bg-orange-100 transition-all group/upload">
                                    {isExtractingCustom ? (
                                        <Loader2 size={20} className="animate-spin text-orange-600" />
                                    ) : (
                                        <Upload size={20} className="text-orange-600 group-hover/upload:scale-110 transition-transform" />
                                    )}
                                    <span className="text-xs font-black uppercase tracking-widest text-orange-700">
                                        {isExtractingCustom ? "Extracting..." : "Upload Image/PDF of Situations"}
                                    </span>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*,application/pdf" 
                                        onChange={(e) => handleCustomStimuliUpload(e, 'SRT')}
                                        disabled={isExtractingCustom}
                                    />
                                </label>
                            </div>

                            <textarea 
                                value={customSrtSituations}
                                onChange={(e) => setCustomSrtSituations(e.target.value)}
                                placeholder="Enter situations separated by new lines (e.g. He was going to exam and saw an accident...)"
                                className="w-full h-48 p-6 bg-slate-50 border-2 border-slate-200 rounded-[2rem] focus:bg-white focus:border-orange-500 outline-none transition-all font-medium text-slate-700 resize-none"
                            />
                            <div className="mt-4 flex justify-between items-center px-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Total Situations: {customSrtSituations.split('\n').filter(s => s.trim()).length} / 60 Recommended
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <div className="mt-8 flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <Info size={16} className="text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                            {useCustomSrt 
                                ? "Enter one situation per line. You will have 30 minutes to respond to all situations you enter." 
                                : "Standardized situations test your reaction speed, decision making, and social responsibility."}
                        </p>
                    </div>
                </div>
            </div>
        )}

        {type === TestType.TAT && useCustomTat ? (
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button onClick={startTest} disabled={isLoading} className="bg-slate-900 text-white px-12 py-6 rounded-full font-black text-lg hover:bg-black transition-all shadow-2xl uppercase tracking-widest flex items-center justify-center gap-4">
              {isLoading ? <Loader2 className="animate-spin" /> : <PenTool size={24} />}
              Start Practice
            </button>
            <button onClick={startDirectEvaluation} disabled={isLoading} className="bg-blue-600 text-white px-12 py-6 rounded-full font-black text-lg hover:bg-blue-700 transition-all shadow-2xl uppercase tracking-widest flex items-center justify-center gap-4">
              {isLoading ? <Loader2 className="animate-spin" /> : <FileText size={24} />}
              Direct Evaluation
            </button>
          </div>
        ) : type === TestType.WAT && useCustomWat ? (
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button onClick={startTest} disabled={isLoading} className="bg-slate-900 text-white px-12 py-6 rounded-full font-black text-lg hover:bg-black transition-all shadow-2xl uppercase tracking-widest flex items-center justify-center gap-4">
                {isLoading ? <Loader2 className="animate-spin" /> : <PenTool size={24} />}
                Start Practice
              </button>
              <button onClick={startDirectEvaluationWat} disabled={isLoading} className="bg-emerald-600 text-white px-12 py-6 rounded-full font-black text-lg hover:bg-emerald-700 transition-all shadow-2xl uppercase tracking-widest flex items-center justify-center gap-4">
                {isLoading ? <Loader2 className="animate-spin" /> : <FileText size={24} />}
                Direct Evaluation
              </button>
            </div>
        ) : type === TestType.SRT && useCustomSrt ? (
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button onClick={startTest} disabled={isLoading} className="bg-slate-900 text-white px-12 py-6 rounded-full font-black text-lg hover:bg-black transition-all shadow-2xl uppercase tracking-widest flex items-center justify-center gap-4">
                {isLoading ? <Loader2 className="animate-spin" /> : <PenTool size={24} />}
                Start Practice
              </button>
              <button onClick={startDirectEvaluationSrt} disabled={isLoading} className="bg-orange-600 text-white px-12 py-6 rounded-full font-black text-lg hover:bg-orange-700 transition-all shadow-2xl uppercase tracking-widest flex items-center justify-center gap-4">
                {isLoading ? <Loader2 className="animate-spin" /> : <FileText size={24} />}
                Direct Evaluation
              </button>
            </div>
        ) : (
          <button onClick={startTest} disabled={isLoading} className="bg-slate-900 text-white px-16 py-6 rounded-full font-black text-lg hover:bg-black transition-all shadow-2xl uppercase tracking-widest flex items-center justify-center gap-6 mx-auto">
            {isLoading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            Begin Test
          </button>
        )}
      </div>
    );
  }

  if (phase === PsychologyPhase.PREPARING_STIMULI) {
    return <div className="flex flex-col items-center justify-center py-40 space-y-12"><Loader2 className="w-32 h-32 text-slate-900 animate-spin" /><div className="text-center"><p className="text-slate-900 font-black uppercase tracking-[0.5em] text-sm mb-4">Retrieving {activeSetName || 'Authorized'} Set</p><p className="text-slate-400 text-xs font-bold italic">Assembling board materials from secure database...</p></div></div>;
  }
  
  if (phase === PsychologyPhase.VIEWING || phase === PsychologyPhase.WRITING || phase === PsychologyPhase.UPLOADING_WAT || phase === PsychologyPhase.UPLOADING_SRT || phase === PsychologyPhase.UPLOADING_STORIES) {
      // Re-use logic from previous implementation
      const currentItem = items[currentIndex];
      const isTAT = type === TestType.TAT;
      const imageUrl = isTAT ? (currentItem?.id === 'tat-12-blank' ? 'BLANK' : pregeneratedImages[currentItem?.id]) : null;
      
      if (phase === PsychologyPhase.VIEWING || phase === PsychologyPhase.WRITING) {
          if (type === TestType.SDT) return (
            <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
               {/* SDT UI Content */}
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
          // Uploading phases
          if (phase === PsychologyPhase.UPLOADING_WAT) {
              return (
                  <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in">
                      {/* ... Header and Uploads ... */}
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
                      {/* ... Header and Uploads ... */}
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
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{items.map((item, index) => { const hasImage = !!tatUploads[index]; const hasText = !!tatTexts[index]; const isTranscribing = transcribingIndices.includes(index); return (
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
    // SPECIAL HANDLING FOR GUEST SDT - RESTRICTED VIEW
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

    // ERROR STATE UI (Saving Fallback)
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
        <>
        <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-12 print:bg-white print:p-0 print:m-0 print:max-w-none">
            {/* Print Styles Injection */}
            <style>
                {`
                  @media print {
                    body * { visibility: hidden; }
                    .print\\:bg-white, .print\\:bg-white * { visibility: visible; }
                    .print\\:bg-white { position: absolute; left: 0; top: 0; width: 100%; height: auto; z-index: 9999; padding: 20px; }
                    .no-print { display: none !important; }
                    .bg-slate-900 { background-color: #1e293b !important; color: white !important; -webkit-print-color-adjust: exact; }
                    .text-white { color: white !important; }
                    .bg-white { background-color: white !important; }
                  }
                `}
            </style>

            {/* Conditional Result Header */}
            <div className="bg-slate-900 text-white p-12 md:p-16 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-10 print:rounded-none print:p-8 print:border-b-2 print:border-black">
                <div className="space-y-4 text-center md:text-left z-10">
                    <span className="bg-yellow-400 text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest print:border print:border-black">Psychology Report</span>
                    <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">{type} Verdict</h2>
                    {feedback?.verdict && type !== TestType.WAT && type !== TestType.SRT && <p className="text-xl text-slate-300 font-medium italic">"{feedback.verdict}"</p>}
                    {(type === TestType.WAT || type === TestType.SRT) && feedback?.generalFeedback && <p className="text-lg text-slate-300 font-medium italic">"{feedback.generalFeedback}"</p>}
                </div>
                
                <div className="flex gap-4 z-20 no-print absolute top-8 right-8">
                    <button 
                        onClick={() => setShowScoreHelp(!showScoreHelp)}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md"
                        title="Score Legend"
                    >
                        <HelpCircle size={20} />
                    </button>
                    <button 
                        onClick={handleDownloadReport}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md"
                        title="Download Report PDF"
                    >
                        <Download size={20} />
                    </button>
                </div>
                
                {(type === TestType.WAT || type === TestType.SRT) ? (
                    // NEW SCOREBOARD FOR WAT/SRT
                    <div className="flex gap-6 z-10">
                        <div className="bg-white/10 p-6 rounded-[2rem] border border-white/10 backdrop-blur-md text-center min-w-[140px] print:border-black print:text-black">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2 print:text-black">Psych Grade</span>
                            <span className="text-5xl font-black text-yellow-400 print:text-black">{feedback?.score || "N/A"}<span className="text-lg text-white/50 print:text-black">/10</span></span>
                            {/* Score Description */}
                            <span className="block mt-2 text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-1 rounded text-white print:text-black print:border print:border-black">
                                {getScoreDescription(feedback?.score || 0)}
                            </span>
                        </div>
                        <div className="bg-white/10 p-6 rounded-[2rem] border border-white/10 backdrop-blur-md text-center min-w-[140px] print:border-black">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2 print:text-black">Speed / Attempts</span>
                            <span className="text-5xl font-black text-white print:text-black">{feedback?.attemptedCount || 0} <span className="text-2xl text-slate-400 print:text-black">/ 60</span></span>
                            {/* Dynamic Attempt Analysis Label */}
                            {speedAnalysis && (
                                <span className={`block mt-2 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded text-white ${speedAnalysis.color} print:text-black print:border`}>
                                    {speedAnalysis.label}
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    // STANDARD SCORE FOR OTHERS
                    <div className="flex gap-6 z-10">
                        <div className="bg-white/10 p-8 rounded-[3rem] border border-white/10 backdrop-blur-md text-center min-w-[160px] print:border-black">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 print:text-black">Score</span>
                            <span className="text-6xl font-black text-yellow-400 print:text-black">{feedback?.score || "N/A"}</span>
                        </div>
                        {type === TestType.TAT && feedback?.attemptedCount !== undefined && (
                            <div className="bg-white/10 p-8 rounded-[3rem] border border-white/10 backdrop-blur-md text-center min-w-[160px] print:border-black">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 print:text-black">Attempts</span>
                                <span className="text-6xl font-black text-white print:text-black">{feedback.attemptedCount} <span className="text-xl text-slate-400">/ 12</span></span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Score Legend Modal/Section */}
            {showScoreHelp && (
                <div className="bg-white p-8 rounded-[3rem] border-4 border-slate-50 shadow-xl animate-in fade-in zoom-in duration-300 no-print">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                            <HelpCircle className="text-blue-600" size={24} /> Score Interpretation
                        </h3>
                        <button onClick={() => setShowScoreHelp(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {[
                            { range: "9.0 - 10", label: "Outstanding", color: "bg-green-600", desc: "Exceptional OLQs, highly recommended." },
                            { range: "7.5 - 8.9", label: "High Potential", color: "bg-green-500", desc: "Strong leadership traits, very good fit." },
                            { range: "6.0 - 7.4", label: "Recommended", color: "bg-blue-500", desc: "Meets board standards, trainable." },
                            { range: "4.0 - 5.9", label: "Average", color: "bg-yellow-500", desc: "Borderline case, needs significant improvement." },
                            { range: "0.0 - 3.9", label: "Below Average", color: "bg-red-500", desc: "Does not meet minimum requirements." }
                        ].map((item, idx) => (
                            <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 space-y-2">
                                <div className={`h-1 w-full rounded-full ${item.color}`} />
                                <p className="text-lg font-black text-slate-900">{item.range}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.label}</p>
                                <p className="text-[10px] text-slate-400 font-medium leading-tight">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* WAT/SRT SPECIFIC SCOREBOARD & ANALYSIS */}
            {(type === TestType.WAT || type === TestType.SRT) && feedback?.qualityStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
                    {/* Quality Card 1: Positive/Effective */}
                    <div className="bg-green-50 p-6 rounded-[2.5rem] border border-green-100 flex flex-col items-center justify-center text-center shadow-sm print:border-black">
                        <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mb-3 print:hidden"><ThumbsUp size={24}/></div>
                        <span className="text-4xl font-black text-slate-900">{feedback.qualityStats.positive || feedback.qualityStats.effective || 0}</span>
                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-1">High OLQ Responses</span>
                    </div>
                    {/* Quality Card 2: Neutral/Partial */}
                    <div className="bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100 flex flex-col items-center justify-center text-center shadow-sm print:border-black">
                        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-3 print:hidden"><MinusCircle size={24}/></div>
                        <span className="text-4xl font-black text-slate-900">{feedback.qualityStats.neutral || feedback.qualityStats.partial || 0}</span>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Average Responses</span>
                    </div>
                    {/* Quality Card 3: Negative/Passive */}
                    <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100 flex flex-col items-center justify-center text-center shadow-sm print:border-black">
                        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-3 print:hidden"><ThumbsDown size={24}/></div>
                        <span className="text-4xl font-black text-slate-900">{feedback.qualityStats.negative || feedback.qualityStats.passive || 0}</span>
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest mt-1">Needs Improvement</span>
                    </div>
                </div>
            )}

            {(type === TestType.WAT || type === TestType.SRT) && (
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-8 print:shadow-none print:border-none print:p-0">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                        <Activity size={24} className="text-purple-600" /> Detailed Assessment Log
                    </h3>
                    <div className="grid grid-cols-1 gap-4 print:block">
                        {/* Map through ITEMS to ensure we show all 60, not just what AI returned */}
                        {items.map((item, i) => {
                            const itemId = i + 1;
                            
                            // 1. Try to find analysis strictly by ID (Best Case)
                            const analysisById = feedback?.detailedAnalysis?.find((a: any) => a.id === itemId);
                            
                            // 2. Try to find analysis by exact text match (Fallback if AI dropped ID)
                            const analysisByContent = !analysisById ? feedback?.detailedAnalysis?.find((a: any) => 
                                (a.situation && a.situation === item.content) || 
                                (a.word && a.word === item.content)
                            ) : null;

                            // 3. Final Analysis Object
                            const analysis = analysisById || analysisByContent;

                            // Determine if unattempted based on USER INPUT or AI MAPPING
                            const userResponseRaw = type === TestType.WAT ? watResponses[i] : srtResponses[i];
                            const aiMappedResponse = analysis?.userResponse;
                            const isUnattempted = (!userResponseRaw || userResponseRaw.trim() === "") && 
                                                (!aiMappedResponse || aiMappedResponse.toLowerCase().includes("not attempted") || aiMappedResponse.trim() === "");
                            
                            return (
                                <div key={i} className={`p-6 rounded-3xl border transition-all flex flex-col md:flex-row gap-6 mb-4 print:break-inside-avoid ${isUnattempted ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md'}`}>
                                    <div className="md:w-1/4 shrink-0 flex items-center gap-4">
                                        <span className="text-2xl font-black text-slate-300">{(i + 1).toString().padStart(2, '0')}</span>
                                        <div className="flex flex-col">
                                            <p className="text-sm md:text-lg font-black text-slate-900 uppercase tracking-wide leading-tight">{item.content}</p>
                                            {analysis?.score !== undefined && (
                                                <div className="mt-1 flex items-center gap-1">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Item Score:</span>
                                                    <span className={`text-[10px] font-black ${analysis.score >= 7 ? 'text-green-600' : analysis.score >= 5 ? 'text-blue-600' : 'text-red-500'}`}>
                                                        {analysis.score}/10
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="md:w-3/4 grid md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Your Response</span>
                                                {isUnattempted ? (
                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-red-500">Missed</span>
                                                ) : (
                                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${
                                                        analysis?.assessment?.toLowerCase().includes('positive') || analysis?.assessment?.toLowerCase().includes('effective') ? 'text-green-600' : 'text-blue-600'
                                                    }`}>{analysis?.assessment || "Assessed"}</span>
                                                )}
                                            </div>
                                            <p className={`p-3 rounded-xl text-sm font-medium ${isUnattempted ? 'bg-white text-red-400 border border-red-100 italic' : 'bg-white border border-slate-200 text-slate-700'}`}>
                                                {isUnattempted ? "Not Attempted" : (aiMappedResponse && !aiMappedResponse.toLowerCase().includes("not attempted") ? aiMappedResponse : userResponseRaw)}
                                            </p>
                                            {analysis?.textAssessment && (
                                                <p className="mt-2 text-[10px] font-bold text-slate-500 italic leading-relaxed">
                                                    Feedback: {analysis.textAssessment}
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest">Ideal Response</span>
                                            <p className="p-3 bg-green-50 border border-green-100 rounded-xl text-sm font-medium text-slate-700">
                                                {analysis?.idealResponse || "See general recommendations for improvement."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAT: Observation & Analysis */}
            {type === TestType.TAT && feedback?.individualStories && (
                <div className="space-y-8 print:break-before-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 print:hidden"><ScanEye size={24} /></div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Observation Analysis</h3>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Did you see what was actually there?</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-12 print:block">
                        {feedback.individualStories.map((story: any, i: number) => {
                            const stimulusUrl = pregeneratedImages[items[i]?.id];
                            const userUpload = tatUploads[i];
                            
                            return (
                                <div key={i} className={`p-10 rounded-[4rem] border-2 transition-all mb-8 print:break-inside-avoid ${story.perceivedAccurately ? 'bg-white border-slate-100' : 'bg-red-50 border-red-200 shadow-md'} hover:shadow-2xl group relative overflow-hidden`}>
                                    {/* Background Accent */}
                                    <div className={`absolute top-0 right-0 w-64 h-64 -mr-20 -mt-20 rounded-full blur-3xl opacity-5 pointer-events-none ${story.perceivedAccurately ? 'bg-blue-500' : 'bg-red-500'}`} />
                                    
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 relative z-10">
                                        <div className="flex items-center gap-6">
                                            <span className="w-14 h-14 bg-slate-900 text-yellow-400 rounded-3xl flex items-center justify-center text-xl font-black shadow-xl rotate-3 border-4 border-slate-800">
                                                {(i + 1).toString().padStart(2, '0')}
                                            </span>
                                            <div>
                                                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Story Assessment</h4>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{story.theme || "General Theme"}</p>
                                                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                    <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${story.perceivedAccurately ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                        {story.perceivedAccurately ? 'Accurate Perception' : 'Misperceived'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Psych Grade</p>
                                                <div className="text-4xl font-black text-slate-900 flex items-baseline gap-1">
                                                    {story.score || 0}<span className="text-slate-300 text-sm">/10</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">
                                        {/* Image Previews */}
                                        <div className="lg:col-span-4 space-y-6">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                        <ImageIcon size={12} /> Stimulus
                                                    </p>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Click to Enlarge</span>
                                                </div>
                                                <div 
                                                    className="aspect-[4/3] rounded-[2rem] overflow-hidden border-2 border-slate-100 bg-slate-50 cursor-zoom-in hover:border-blue-200 transition-all shadow-sm group/img"
                                                    onClick={() => setEnlargedImage(stimulusUrl)}
                                                >
                                                    {stimulusUrl && stimulusUrl !== 'BLANK' ? (
                                                        <img src={stimulusUrl} className="w-full h-full object-cover grayscale contrast-125 group-hover/img:scale-110 transition-transform duration-500" alt="Stimulus" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-black uppercase tracking-widest text-xs">Blank Slide</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                        <FileText size={12} /> Your Story
                                                    </p>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Click to Enlarge</span>
                                                </div>
                                                <div 
                                                    className="aspect-[3/4] rounded-[2rem] overflow-hidden border-2 border-slate-100 bg-slate-50 cursor-zoom-in hover:border-blue-200 transition-all shadow-sm group/img"
                                                    onClick={() => setEnlargedImage(`data:image/jpeg;base64,${userUpload}`)}
                                                >
                                                    {userUpload ? (
                                                        <img src={`data:image/jpeg;base64,${userUpload}`} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" alt="User Upload" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-red-300 font-black uppercase tracking-widest text-[10px] p-4 text-center">No Story Uploaded</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Analysis Content */}
                                        <div className="lg:col-span-8 space-y-8">
                                            {/* Detailed Overview */}
                                            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group/box">
                                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover/box:opacity-10 transition-opacity">
                                                    <BookOpen size={80} />
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <BookOpen size={14} className="text-yellow-400" /> Detailed Overview
                                                </p>
                                                <p className="text-sm md:text-base font-medium leading-relaxed italic text-slate-200">
                                                    "{story.detailedOverview || story.overallAssessment || "A comprehensive analysis of your story structure and logic."}"
                                                </p>
                                            </div>

                                            {/* Observation Accuracy */}
                                            <div className={`p-8 rounded-[2.5rem] border-2 transition-all ${story.perceivedAccurately ? 'bg-blue-50/30 border-blue-100' : 'bg-red-50/30 border-red-100'}`}>
                                                <p className={`text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${story.perceivedAccurately ? 'text-blue-600' : 'text-red-600'}`}>
                                                    <ScanEye size={14} /> Observation Accuracy
                                                </p>
                                                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                                    {story.observationAccuracy || (story.perceivedAccurately 
                                                        ? "Excellent observation. You correctly identified the characters, their mood, and the environmental setting from the stimulus." 
                                                        : "The stimulus was misinterpreted. Key elements like character count, gender, or environmental cues were missed.")}
                                                </p>
                                            </div>

                                            {/* Strengths & Gaps Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                                                        <Award size={14} /> Key Strengths
                                                    </p>
                                                    <ul className="space-y-4">
                                                        {(story.keyStrengths && story.keyStrengths.length > 0) ? (
                                                            story.keyStrengths.map((s: string, idx: number) => (
                                                                <li key={idx} className="text-xs font-bold text-slate-700 flex gap-3">
                                                                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                                                                        <CheckCircle size={10} className="text-green-600" />
                                                                    </div>
                                                                    {s}
                                                                </li>
                                                            ))
                                                        ) : (
                                                            <li className="text-xs font-medium text-slate-400 italic">No specific strengths highlighted for this story.</li>
                                                        )}
                                                    </ul>
                                                </div>

                                                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                                        <AlertCircle size={14} /> OLQ Gaps / Mistakes
                                                    </p>
                                                    <ul className="space-y-4">
                                                        {((story.olqGaps || story.mistakes) && (story.olqGaps || story.mistakes).length > 0) ? (
                                                            (story.olqGaps || story.mistakes).map((m: string, idx: number) => (
                                                                <li key={idx} className="text-xs font-bold text-slate-700 flex gap-3">
                                                                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                                                                        <MinusCircle size={10} className="text-red-600" />
                                                                    </div>
                                                                    {m}
                                                                </li>
                                                            ))
                                                        ) : (
                                                            <li className="text-xs font-medium text-slate-400 italic">No significant gaps or mistakes identified.</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            </div>

                                            {/* Hero, Action, Outcome Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <UserPlus size={10} className="text-blue-500" /> Hero
                                                    </p>
                                                    <p className="text-[11px] text-slate-700 leading-relaxed font-bold">{story.heroAnalysis || "Hero qualities analysis."}</p>
                                                </div>
                                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <Activity size={10} className="text-purple-500" /> Action
                                                    </p>
                                                    <p className="text-[11px] text-slate-700 leading-relaxed font-bold">{story.actionAnalysis || "Logic and action analysis."}</p>
                                                </div>
                                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <Target size={10} className="text-green-500" /> Outcome
                                                    </p>
                                                    <p className="text-[11px] text-slate-700 leading-relaxed font-bold">{story.outcomeAnalysis || "Outcome and resolution analysis."}</p>
                                                </div>
                                            </div>

                                            {/* Improvement Tips */}
                                            {story.improvementTips && story.improvementTips.length > 0 && (
                                                <div className="p-8 bg-yellow-50/50 rounded-[2.5rem] border-2 border-yellow-100/50">
                                                    <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <PenTool size={14} /> Improvement Tips
                                                    </p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {story.improvementTips.map((tip: string, idx: number) => (
                                                            <div key={idx} className="flex gap-3 items-start">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
                                                                <p className="text-xs font-bold text-yellow-800 leading-relaxed">{tip}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Handwriting Assessment */}
            {(type === TestType.TAT || type === TestType.WAT || type === TestType.SRT) && (feedback?.handwritingFeedback || feedback?.handwritingAnalysis) && (
                <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-xl space-y-6 print:border-black print:shadow-none">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                        <PenTool size={24} className="text-blue-600" /> Handwriting & Neatness Assessment
                    </h3>
                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <PenTool size={80} />
                        </div>
                        <p className="text-sm md:text-base text-slate-700 leading-relaxed font-medium relative z-10">
                            {feedback.handwritingFeedback || feedback.handwritingAnalysis}
                        </p>
                    </div>
                </div>
            )}

            {/* SDT Specifics */}
            {type === TestType.SDT && feedback?.consistencyAnalysis && (
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-6 print:border-black print:shadow-none">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><Brain size={24} className="text-blue-600" /> Consistency Check</h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium p-6 bg-slate-50 rounded-3xl border border-slate-200">{feedback.consistencyAnalysis}</p>
                </div>
            )}

            {/* General Feedback - Show for all except WAT/SRT which has specific layout */}
            {type !== TestType.WAT && type !== TestType.SRT && (
                <div className="grid md:grid-cols-2 gap-8 print:block">
                    <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 mb-4 print:border-black print:shadow-none">
                        <h4 className="font-black text-green-600 uppercase tracking-widest mb-6 flex items-center gap-3"><CheckCircle size={20}/> Strengths</h4>
                        <ul className="space-y-3">
                            {feedback?.strengths?.map((s: string, i: number) => (
                                <li key={i} className="text-sm font-bold text-slate-700 flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"/> {s}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 mb-4 print:border-black print:shadow-none">
                        <h4 className="font-black text-red-500 uppercase tracking-widest mb-6 flex items-center gap-3"><AlertCircle size={20}/> Areas for Improvement</h4>
                        <ul className="space-y-3">
                            {feedback?.weaknesses?.map((w: string, i: number) => (
                                <li key={i} className="text-sm font-bold text-slate-700 flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"/> {w}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {type !== TestType.WAT && type !== TestType.SRT && (
                <div className="bg-blue-50 p-8 md:p-12 rounded-[3rem] border border-blue-100 text-center space-y-6 print:border-black print:bg-white">
                    <h4 className="font-black text-blue-800 uppercase tracking-widest text-sm print:text-black">Psychologist's Final Recommendation</h4>
                    <p className="text-lg md:text-2xl font-medium text-blue-900 italic max-w-3xl mx-auto leading-relaxed print:text-black">"{feedback?.recommendations}"</p>
                </div>
            )}

            {/* FEEDBACK INTEGRATION - Hide in print */}
            {userId && (
                <div className="no-print">
                    <SessionFeedback testType={type} userId={userId} />
                </div>
            )}

            {isGuest ? (
                <button 
                  onClick={onLoginRedirect}
                  className="w-full py-6 md:py-7 bg-yellow-400 text-black rounded-full font-black uppercase tracking-widest text-xs hover:bg-yellow-300 transition-all shadow-2xl flex items-center justify-center gap-3 no-print"
                >
                  <LogIn size={16} /> Sign Up to Unlock More
                </button>
            ) : (
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full py-6 md:py-7 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-2xl no-print"
                >
                  Return to Barracks
                </button>
            )}
        </div>

        {/* Image Enlarge Modal */}
        {enlargedImage && (
            <div 
                className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
                onClick={() => setEnlargedImage(null)}
            >
                <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
                    <button 
                        className="absolute top-0 right-0 md:-top-10 md:-right-10 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                        onClick={() => setEnlargedImage(null)}
                    >
                        <X size={32} />
                    </button>
                    <img 
                        src={enlargedImage} 
                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" 
                        alt="Enlarged View" 
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>
        )}
        </>
    )
  }

  return null; 
};

export default PsychologyTest;
