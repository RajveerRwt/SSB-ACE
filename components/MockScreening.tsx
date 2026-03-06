
import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, CheckCircle, AlertTriangle, ChevronRight, ChevronLeft, 
  Loader2, Play, Lock, RefreshCw, Send, Lightbulb, X, 
  Coins, Maximize2, Trophy, Target, ShieldCheck, Brain, 
  ImageIcon, FileText, Activity, Timer, AlertCircle, PenTool, ScanEye,
  Upload, Camera, Volume2, MicOff, Headset
} from 'lucide-react';
import { 
  getOIRSets, getOIRQuestions, getPPDTScenarios, 
  checkAuthSession, TEST_RATES, saveTestAttempt, 
  updateTestAttempt, incrementUsage, deductCoins, 
  getUserSubscription, getScreeningConfig
} from '../services/supabaseService';
import { evaluatePerformance, transcribeHandwrittenStory } from '../services/geminiService';
import CameraModal from './CameraModal';
import { TestType } from '../types';

interface MockScreeningProps {
  onConsumeCoins?: (cost: number) => Promise<boolean>;
  isGuest?: boolean;
  onLoginRedirect?: () => void;
  onExit: () => void;
  userId?: string;
}

enum ScreeningStage {
  LOBBY,
  INSTRUCTIONS,
  OIR1_START,
  OIR1_TEST,
  OIR1_BREAK,
  OIR2_START,
  OIR2_TEST,
  OIR2_BREAK,
  PPDT_START,
  PPDT_IMAGE,
  PPDT_CHARACTER_MARKING,
  PPDT_STORY,
  PPDT_UPLOAD_GRACE_PERIOD,
  PPDT_STORY_SUBMITTED,
  PPDT_NARRATION,
  PPDT_BREAK,
  PROCESSING,
  RESULT
}

const MockScreening: React.FC<MockScreeningProps> = ({ onConsumeCoins, isGuest = false, onLoginRedirect, onExit, userId }) => {
  const [stage, setStage] = useState<ScreeningStage>(ScreeningStage.LOBBY);
  const [isLoading, setIsLoading] = useState(true);
  const [oirSets, setOirSets] = useState<any[]>([]);
  const [ppdtScenarios, setPpdtScenarios] = useState<any[]>([]);
  
  // Test Data
  const [selectedOir1, setSelectedOir1] = useState<any>(null);
  const [selectedOir2, setSelectedOir2] = useState<any>(null);
  const [selectedPpdt, setSelectedPpdt] = useState<any>(null);
  
  const [oir1Questions, setOir1Questions] = useState<any[]>([]);
  const [oir2Questions, setOir2Questions] = useState<any[]>([]);
  
  // Progress State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [ppdtStory, setPpdtStory] = useState('');
  
  // Results
  const [oir1Result, setOir1Result] = useState<{ score: number, total: number } | null>(null);
  const [oir2Result, setOir2Result] = useState<{ score: number, total: number } | null>(null);
  const [ppdtResult, setPpdtResult] = useState<any>(null);
  const [finalAssessment, setFinalAssessment] = useState<any>(null);
  
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showBuzzer, setShowBuzzer] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // PPDT Specific States (Consistency with PPDTTest)
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [narrationText, setNarrationText] = useState('');
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const narrationTextRef = useRef('');
  const interimTextRef = useRef('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const triggerBuzzer = () => {
    initAudio();
    setShowBuzzer(true);
    setTimeout(() => setShowBuzzer(false), 3000);

    const ctx = audioCtxRef.current;
    if (ctx) {
      const playTone = (freq: number, start: number, duration: number = 0.5) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration + 0.1);
      };
      playTone(200, 0, 1.0);
      playTone(180, 0.2, 0.8);
    }
  };

  const resizeImage = (base64: string, maxWidth: number = 1024, maxHeight: number = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = `data:image/jpeg;base64,${base64}`;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
      };
      img.onerror = () => resolve(base64);
    });
  };

  const processImage = async (base64Data: string, mimeType: string = 'image/jpeg') => {
    setIsTranscribing(true);
    setOcrError(null);
    setUploadedImageBase64(base64Data);
    try {
      const text = await transcribeHandwrittenStory(base64Data, mimeType);
      if (text && text.includes("Transcription unavailable")) {
        setOcrError("Auto-transcription unavailable. Please type your story manually.");
      } else if (text) {
        setPpdtStory(text);
      }
    } catch (err) {
      setOcrError("Could not transcribe handwriting. Please type manually.");
    }
    setIsTranscribing(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      let base64Data = (reader.result as string).split(',')[1];
      base64Data = await resizeImage(base64Data);
      processImage(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  const fetchWithTimeout = async (url: string, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  const startNarration = () => {
    initAudio();
    setNarrationText('');
    narrationTextRef.current = '';
    interimTextRef.current = '';
    setTranscriptionError(null);
    setIsRecording(true);
    isRecordingRef.current = true;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscriptionError("Speech recognition not supported. Please use Chrome.");
      setIsRecording(false);
      isRecordingRef.current = false;
      return;
    }

    try {
      if (recognitionRef.current) recognitionRef.current.abort();
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          else interimTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) narrationTextRef.current += (narrationTextRef.current ? " " : "") + finalTranscript;
        interimTextRef.current = interimTranscript;
        
        const fullText = narrationTextRef.current + (narrationTextRef.current && interimTranscript ? " " : "") + interimTranscript;
        setNarrationText(fullText);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') return;
        if (event.error === 'aborted') return;
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsRecording(false);
          isRecordingRef.current = false;
        }
      };

      recognition.onend = () => {
        if (isRecordingRef.current) {
          try { recognition.start(); } catch(e) {}
        } else {
          finishPPDT();
        }
      };
      recognition.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  const stopNarration = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    else finishPPDT();
  };

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const [oirData, ppdtData] = await Promise.all([
        getOIRSets(),
        getPPDTScenarios()
      ]);
      setOirSets(oirData);
      setPpdtScenarios(ppdtData);
    } catch (e) {
      console.error("Failed to load screening content", e);
    } finally {
      setIsLoading(false);
    }
  };

  const startMockScreening = async () => {
    if (isGuest) {
      onLoginRedirect?.();
      return;
    }

    if (oirSets.length < 2 || ppdtScenarios.length < 1) {
      alert("Insufficient content for Mock Screening. Please contact Admin.");
      return;
    }

    const cost = TEST_RATES.MOCK_SCREENING;
    if (cost > 0) {
      const success = await onConsumeCoins?.(cost);
      if (!success) return;
    }

    setIsLoading(true);
    try {
      const config = await getScreeningConfig();
      let oir1, oir2, ppdt;

      if (config && config.oir1_id && config.oir2_id && config.ppdt_id) {
        oir1 = oirSets.find(s => s.id === config.oir1_id);
        oir2 = oirSets.find(s => s.id === config.oir2_id);
        ppdt = ppdtScenarios.find(s => s.id === config.ppdt_id);
      }

      // Fallback Logic
      if (!oir1) {
        // Try to find "Set 2" or use index 1
        oir1 = oirSets.find(s => s.title.toLowerCase().includes('set 2')) || oirSets[1] || oirSets[0];
      }
      if (!oir2) {
        // Try to find "Set 3" or use index 2
        oir2 = oirSets.find(s => s.title.toLowerCase().includes('set 3')) || oirSets[2] || oirSets[0];
      }
      if (!ppdt) {
        // Use last set (index 0 because they are ordered by created_at DESC in service)
        ppdt = ppdtScenarios[0];
      }

      setSelectedOir1(oir1);
      setSelectedOir2(oir2);
      setSelectedPpdt(ppdt);

      const [q1, q2] = await Promise.all([
        getOIRQuestions(oir1.id),
        getOIRQuestions(oir2.id)
      ]);
      setOir1Questions(q1);
      setOir2Questions(q2);
      setStage(ScreeningStage.INSTRUCTIONS);
    } catch (e) {
      console.error("Error starting mock screening:", e);
      alert("Failed to initialize test. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Timer Logic
  useEffect(() => {
    const isNarrationTimed = stage === ScreeningStage.PPDT_NARRATION && isRecording;
    const isTimedPhase = [
      ScreeningStage.OIR1_TEST, 
      ScreeningStage.OIR2_TEST, 
      ScreeningStage.PPDT_IMAGE, 
      ScreeningStage.PPDT_CHARACTER_MARKING,
      ScreeningStage.PPDT_STORY,
      ScreeningStage.PPDT_UPLOAD_GRACE_PERIOD
    ].includes(stage);

    if ((isTimedPhase || isNarrationTimed) && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && stage !== ScreeningStage.LOBBY && stage !== ScreeningStage.INSTRUCTIONS && stage !== ScreeningStage.PROCESSING && stage !== ScreeningStage.RESULT) {
      if (stage === ScreeningStage.OIR1_TEST) finishOIR1();
      else if (stage === ScreeningStage.OIR2_TEST) finishOIR2();
      else if (stage === ScreeningStage.PPDT_IMAGE) { triggerBuzzer(); startPPDTCharacterMarking(); }
      else if (stage === ScreeningStage.PPDT_CHARACTER_MARKING) { triggerBuzzer(); startPPDTStory(); }
      else if (stage === ScreeningStage.PPDT_STORY) { triggerBuzzer(); setStage(ScreeningStage.PPDT_UPLOAD_GRACE_PERIOD); setTimeLeft(30); }
      else if (stage === ScreeningStage.PPDT_UPLOAD_GRACE_PERIOD) setStage(ScreeningStage.PPDT_STORY_SUBMITTED);
      else if (stage === ScreeningStage.PPDT_NARRATION) stopNarration();
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, stage, isRecording]);

  const startOIR1 = () => {
    setStage(ScreeningStage.OIR1_TEST);
    setTimeLeft(selectedOir1.time_limit_seconds || 900);
    setCurrentQIndex(0);
    setUserAnswers(new Array(oir1Questions.length).fill(-1));
  };

  const finishOIR1 = () => {
    let score = 0;
    userAnswers.forEach((ans, idx) => {
      if (ans === oir1Questions[idx].correct_index) score++;
    });
    setOir1Result({ score, total: oir1Questions.length });
    setStage(ScreeningStage.OIR1_BREAK);
  };

  const startOIR2 = () => {
    setStage(ScreeningStage.OIR2_TEST);
    setTimeLeft(selectedOir2.time_limit_seconds || 900);
    setCurrentQIndex(0);
    setUserAnswers(new Array(oir2Questions.length).fill(-1));
  };

  const finishOIR2 = () => {
    let score = 0;
    userAnswers.forEach((ans, idx) => {
      if (ans === oir2Questions[idx].correct_index) score++;
    });
    setOir2Result({ score, total: oir2Questions.length });
    setStage(ScreeningStage.OIR2_BREAK);
  };

  const startPPDT = () => {
    setStage(ScreeningStage.PPDT_IMAGE);
    setTimeLeft(30); // 30 seconds for image
  };

  const startPPDTCharacterMarking = () => {
    setStage(ScreeningStage.PPDT_CHARACTER_MARKING);
    setTimeLeft(60); // 1 minute for marking
  };

  const startPPDTStory = () => {
    setStage(ScreeningStage.PPDT_STORY);
    setTimeLeft(240); // 4 minutes for story
  };

  const finishPPDT = async () => {
    setStage(ScreeningStage.PROCESSING);
    
    const finalNarration = narrationTextRef.current + (narrationTextRef.current && interimTextRef.current ? " " : "") + interimTextRef.current;

    // Evaluate PPDT via Gemini
    try {
      let stimulusBase64 = null;
      if (selectedPpdt.image_url) {
        try {
          const response = await fetchWithTimeout(selectedPpdt.image_url, 5000);
          const blob = await response.blob();
          const rawBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
          });
          stimulusBase64 = await resizeImage(rawBase64, 1024, 1024);
        } catch (err) {
          console.warn("Failed to fetch stimulus within timeout:", err);
        }
      }

      const result = await evaluatePerformance('PPDT Screening Board (Stage-1)', {
        story: ppdtStory,
        narration: finalNarration || narrationText,
        visualStimulusProvided: selectedPpdt.description,
        uploadedStoryImage: uploadedImageBase64,
        stimulusImage: stimulusBase64
      });
      setPpdtResult(result);
      calculateFinalResult(result);
    } catch (e) {
      console.error("PPDT Evaluation failed", e);
      // Fallback or background processing
      if (userId) {
        await saveTestAttempt(userId, TestType.MOCK_SCREENING, {
          oir1: oir1Result,
          oir2: oir2Result,
          ppdtStory,
          ppdtImage: selectedPpdt.image_url,
          status: 'pending'
        }, 'pending', {
          oir1: oir1Result,
          oir2: oir2Result,
          ppdtStory,
          ppdtImage: selectedPpdt.image_url
        });
      }
      setStage(ScreeningStage.RESULT);
    }
  };

  const calculateFinalResult = async (ppdtEval: any) => {
    if (!oir1Result || !oir2Result) return;

    const oir1Perc = (oir1Result.score / oir1Result.total) * 100;
    const oir2Perc = (oir2Result.score / oir2Result.total) * 100;
    const oirAvgPerc = (oir1Perc + oir2Perc) / 2;
    const oirScore = oirAvgPerc / 10;
    
    const ppdtScore = ppdtEval.score || 0;
    const finalScore = (oirScore * 0.4) + (ppdtScore * 0.6);

    let status = 'SCREENED OUT';
    let color = 'text-red-600';
    let icon = <X className="text-red-600" size={48} />;

    // Elimination Rules
    const failPPDT = ppdtScore < 5;
    const failOIRAvg = oirAvgPerc < 40;
    const failBothOIR = oir1Perc < 50 && oir2Perc < 50;

    let rejectionReason = "";
    if (failPPDT) {
      rejectionReason = "Your PPDT performance was below the required threshold. The story quality, character marking, or narration did not meet the board's expectations.";
    } else if (failOIRAvg) {
      rejectionReason = "Your average OIR score is too low. Officers are expected to have a minimum level of cognitive ability (OIR Rating 1 or 2 is preferred).";
    } else if (failBothOIR) {
      rejectionReason = "You failed to achieve a satisfactory score in both OIR sets. Consistency in intelligence tests is crucial for screening.";
    } else if (finalScore < 6.0) {
      rejectionReason = "Your combined performance in OIR and PPDT was not strong enough to qualify for the next stage. Focus on improving both your reasoning and creative expression.";
    }

    if (failPPDT || failOIRAvg || failBothOIR) {
      status = 'SCREENED OUT';
    } else if (finalScore >= 7.5) {
      status = 'SCREENED IN';
      color = 'text-green-600';
      icon = <CheckCircle className="text-green-600" size={48} />;
    } else if (finalScore >= 6.0) {
      status = 'BORDERLINE';
      color = 'text-yellow-600';
      icon = <AlertTriangle className="text-yellow-600" size={48} />;
    }

    const assessment = {
      status,
      oir1Perc,
      oir2Perc,
      oir1Score: oir1Result.score,
      oir1Total: oir1Result.total,
      oir2Score: oir2Result.score,
      oir2Total: oir2Result.total,
      oirAvgPerc,
      oirScore,
      ppdtScore,
      ppdtDetails: ppdtEval.scoreDetails || { perception: 0, content: 0, expression: 0 },
      finalScore,
      rejectionReason,
      observation: ppdtEval.recommendations || ppdtEval.feedback?.recommendations || "Good effort. Focus on consistency across all stages.",
      color,
      icon
    };

    setFinalAssessment(assessment);
    setStage(ScreeningStage.RESULT);

    // Save to history
    if (userId) {
      await saveTestAttempt(userId, TestType.MOCK_SCREENING, assessment);
      await incrementUsage(userId, TestType.MOCK_SCREENING);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Render Helpers
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Preparing Screening Board...</p>
      </div>
    );
  }

  if (stage === ScreeningStage.LOBBY) {
    return (
      <div className="max-w-4xl mx-auto py-10 animate-in fade-in">
        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-20 -mt-20 blur-3xl opacity-50" />
          
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                <ShieldCheck size={32} className="text-yellow-400" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Mock Screening Test</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stage-1 Simulation (OIR + PPDT)</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm mb-4">
                  <Brain size={20} />
                </div>
                <h4 className="font-black text-slate-800 uppercase text-xs mb-2">2 OIR Tests</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Verbal & Non-Verbal intelligence assessment. 40% minimum average required.</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-purple-600 shadow-sm mb-4">
                  <ImageIcon size={20} />
                </div>
                <h4 className="font-black text-slate-800 uppercase text-xs mb-2">1 PPDT Test</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Picture Perception & Description. Score below 5 leads to direct elimination.</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm mb-4">
                  <Trophy size={20} />
                </div>
                <h4 className="font-black text-slate-800 uppercase text-xs mb-2">Final Verdict</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Combined score out of 10. Screened In, Borderline, or Screened Out.</p>
              </div>
            </div>

            <div className="bg-yellow-50 p-6 rounded-3xl border border-yellow-200">
              <h5 className="text-[10px] font-black text-yellow-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                <AlertTriangle size={14} /> Elimination Rules
              </h5>
              <ul className="space-y-2">
                <li className="text-[10px] font-bold text-yellow-700 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" /> PPDT Score must be 5 or above.
                </li>
                <li className="text-[10px] font-bold text-yellow-700 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" /> OIR Average must be 40% or above.
                </li>
                <li className="text-[10px] font-bold text-yellow-700 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" /> Both OIR tests cannot be below 50%.
                </li>
              </ul>
            </div>

            <div className="flex flex-col md:flex-row gap-4 pt-4">
              <button 
                onClick={startMockScreening}
                className="flex-1 px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-3"
              >
                <Play size={18} fill="currentColor" /> Start Mock Screening
              </button>
              <button 
                onClick={onExit}
                className="px-10 py-5 bg-white text-slate-400 border border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Coins size={12} className={TEST_RATES.MOCK_SCREENING > 0 ? "text-yellow-500" : "text-emerald-500"} /> 
              Cost: {TEST_RATES.MOCK_SCREENING > 0 ? `${TEST_RATES.MOCK_SCREENING} Coins` : <span className="text-emerald-500 font-black">FREE</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === ScreeningStage.INSTRUCTIONS) {
    return (
      <div className="max-w-3xl mx-auto py-10 animate-in slide-in-from-bottom-8">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">General Instructions</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Read carefully before proceeding</p>
          </div>

          <div className="space-y-4">
            {[
              "The screening consists of 3 back-to-back tests.",
              "Stage 1: OIR Test 1 (Verbal/Non-Verbal).",
              "Stage 2: OIR Test 2 (Verbal/Non-Verbal).",
              "Stage 3: PPDT (Picture Perception & Story Writing).",
              "There will be a 1-minute break between each stage.",
              "Do not refresh the page during the test.",
              "Ensure a stable internet connection for AI evaluation."
            ].map((text, i) => (
              <div key={i} className="flex gap-4 items-start p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</div>
                <p className="text-xs font-medium text-slate-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          <button 
            onClick={startOIR1}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
          >
            I am Ready <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (stage === ScreeningStage.OIR1_TEST || stage === ScreeningStage.OIR2_TEST) {
    const questions = stage === ScreeningStage.OIR1_TEST ? oir1Questions : oir2Questions;
    const currentQ = questions[currentQIndex];
    const testTitle = stage === ScreeningStage.OIR1_TEST ? "OIR Test 1" : "OIR Test 2";

    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-20">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center sticky top-4 z-20">
          <div>
            <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">{testTitle}</h4>
            <p className="text-[10px] font-bold text-slate-400">Question {currentQIndex + 1} / {questions.length}</p>
          </div>
          <div className={`px-4 py-2 rounded-xl font-mono font-black text-xl ${timeLeft < 60 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-900 text-white'}`}>
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg">
          <div className="flex flex-wrap gap-2">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQIndex(i)}
                className={`w-8 h-8 rounded-lg font-black text-[10px] flex items-center justify-center transition-all border-2 ${
                  i === currentQIndex ? 'bg-slate-900 text-white border-slate-900' : 
                  userAnswers[i] !== -1 ? 'bg-teal-50 text-teal-600 border-teal-100' : 
                  'bg-white text-slate-400 border-slate-100'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-slate-100 min-h-[400px] flex flex-col relative overflow-hidden">
          {currentQ.image_url && (
            <div className="mb-6 flex justify-center cursor-zoom-in" onClick={() => setZoomedImage(currentQ.image_url)}>
              <img src={currentQ.image_url} className="max-h-64 md:max-h-80 object-contain rounded-xl border border-slate-200" alt="Question" />
            </div>
          )}
          {currentQ.question_text && (
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-8 leading-relaxed">{currentQ.question_text}</h3>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
            {currentQ.options.map((opt: string, idx: number) => (
              <button
                key={idx}
                onClick={() => {
                  const newAnswers = [...userAnswers];
                  newAnswers[currentQIndex] = idx;
                  setUserAnswers(newAnswers);
                  if (currentQIndex < questions.length - 1) setCurrentQIndex(prev => prev + 1);
                }}
                className={`p-4 md:p-5 rounded-xl text-left font-bold text-sm transition-all border-2 ${
                  userAnswers[currentQIndex] === idx ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-md' : 'bg-white border-slate-100 hover:border-blue-200'
                }`}
              >
                <span className="mr-3 font-black text-slate-300">{String.fromCharCode(65 + idx)}.</span>
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button 
            disabled={currentQIndex === 0}
            onClick={() => setCurrentQIndex(prev => prev - 1)}
            className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 disabled:opacity-30"
          >
            Previous
          </button>
          {currentQIndex === questions.length - 1 ? (
            <button 
              onClick={stage === ScreeningStage.OIR1_TEST ? finishOIR1 : finishOIR2}
              className="px-8 py-4 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
            >
              Submit Test
            </button>
          ) : (
            <button 
              onClick={() => setCurrentQIndex(prev => prev + 1)}
              className="px-8 py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-lg"
            >
              Next Question
            </button>
          )}
        </div>
      </div>
    );
  }

  if (stage === ScreeningStage.OIR1_BREAK || stage === ScreeningStage.OIR2_BREAK || stage === ScreeningStage.PPDT_BREAK) {
    const nextStage = stage === ScreeningStage.OIR1_BREAK ? "OIR Test 2" : stage === ScreeningStage.OIR2_BREAK ? "PPDT Test" : "Final Result";
    const nextAction = stage === ScreeningStage.OIR1_BREAK ? startOIR2 : stage === ScreeningStage.OIR2_BREAK ? startPPDT : finishPPDT;

    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-8 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Timer size={40} className="animate-pulse" />
        </div>
        <div className="space-y-2">
          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Stage Completed</h3>
          <p className="text-slate-500 font-medium">Take a short breath. Next stage starts in a moment.</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Up Next</p>
          <h4 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-8">{nextStage}</h4>
          <button 
            onClick={nextAction}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
          >
            Start {nextStage} Now <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (stage === ScreeningStage.PPDT_IMAGE) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
        <img src={selectedPpdt.image_url} className="w-full h-full object-contain opacity-90 grayscale contrast-[1.2]" alt="PPDT Stimulus" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900">
          <div className="h-full bg-slate-700 transition-all duration-1000 linear" style={{width: `${(timeLeft/30)*100}%`}} />
        </div>
      </div>
    );
  }

  if (stage === ScreeningStage.PPDT_CHARACTER_MARKING) {
    return (
      <div className="max-w-2xl mx-auto py-32 text-center space-y-8 animate-in zoom-in">
        <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <ScanEye size={40} className="animate-pulse" />
        </div>
        <div className="space-y-4">
          <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Mark Characters</h3>
          <p className="text-slate-500 font-medium">Identify characters, their age, sex, and mood. Mark them on your paper.</p>
        </div>
        <div className="text-8xl font-mono font-black text-slate-900 tabular-nums">
          {timeLeft}s
        </div>
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl text-blue-800 text-xs font-bold uppercase tracking-widest">
          Draw a box and mark characters inside it.
        </div>
      </div>
    );
  }

  if (stage === ScreeningStage.PPDT_STORY || stage === ScreeningStage.PPDT_UPLOAD_GRACE_PERIOD) {
    const isTimeUp = stage === ScreeningStage.PPDT_UPLOAD_GRACE_PERIOD;
    return (
      <div className="max-w-7xl mx-auto py-10 space-y-8 animate-in fade-in">
        <div className="flex justify-between items-end border-b pb-6 border-slate-100">
          <div>
            <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Story Writing Phase</h3>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2 underline decoration-blue-500 underline-offset-4 decoration-2">Write on paper & Include the Character Box</p>
          </div>
          <div className={`px-10 py-5 rounded-[2rem] font-mono font-black text-4xl border-4 transition-all ${timeLeft < 30 || isTimeUp ? 'bg-red-50 border-red-500 text-red-600 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'bg-slate-900 border-slate-800 text-white'}`}>
            {isTimeUp ? "TIME UP" : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
          </div>
        </div>

        <div className="space-y-8">
          {isTimeUp && (
            <div className="bg-red-600 text-white p-6 rounded-2xl text-center font-black uppercase tracking-[0.2em] shadow-xl animate-pulse flex items-center justify-center gap-3">
              <AlertCircle size={24} />
              <span>Pen Down! Scan & Upload Your Answer Sheet Now.</span>
            </div>
          )}
          
          {ocrError && (
            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-200 text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{ocrError}</span>
            </div>
          )}

          <div className={`grid ${uploadedImageBase64 ? 'grid-cols-1 lg:grid-cols-2 gap-6' : 'grid-cols-1'}`}>
            {uploadedImageBase64 && (
              <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-slate-100 bg-slate-50 min-h-[300px] lg:h-auto shadow-inner flex items-center justify-center group">
                <img src={`data:image/jpeg;base64,${uploadedImageBase64}`} className="w-full h-full object-contain p-4 transition-transform group-hover:scale-105" alt="Uploaded Answer" />
                <div className="absolute top-4 left-4 bg-slate-900/80 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md flex items-center gap-2">
                  <ImageIcon size={12} /> Original Scan
                </div>
              </div>
            )}

            <div className="relative flex flex-col h-full">
              {uploadedImageBase64 && (
                <div className="flex items-center gap-2 mb-2 text-blue-600 px-2">
                  <FileText size={14} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Digital Transcript (Review & Edit)</p>
                </div>
              )}
              <textarea 
                value={ppdtStory}
                onChange={(e) => setPpdtStory(e.target.value)}
                disabled={isTranscribing || (isTimeUp && !uploadedImageBase64)}
                placeholder={uploadedImageBase64 ? "Review and edit the AI transcription here..." : "Your story will appear here automatically once you upload your paper image..."}
                className={`w-full ${uploadedImageBase64 ? 'h-[400px]' : 'h-[500px]'} p-10 rounded-[3.5rem] border-2 border-slate-100 focus:border-slate-900 outline-none transition-all text-lg leading-relaxed shadow-xl bg-white font-medium ${isTranscribing || (isTimeUp && !uploadedImageBase64) ? 'opacity-50 blur-[1px]' : ''}`}
              />
              {isTranscribing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-xl rounded-[3.5rem] z-10">
                  <Loader2 className="w-16 h-16 text-slate-900 animate-spin mb-6" />
                  <p className="text-slate-900 font-black uppercase tracking-[0.4em] text-xs">AI OCR: Reading Handwriting...</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-lg">
            <div className="flex gap-4 w-full md:w-auto">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-10 py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl">
                <Upload className="w-4 h-4" /> {uploadedImageBase64 ? 'Re-Upload File' : 'Upload File'}
              </button>
              <button onClick={() => setShowCamera(true)} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl">
                <Camera className="w-4 h-4" /> Use Camera
              </button>
            </div>
            <button 
              onClick={() => { triggerBuzzer(); setStage(ScreeningStage.PPDT_STORY_SUBMITTED); }}
              disabled={!ppdtStory.trim() || isTranscribing}
              className="w-full md:w-auto px-16 py-5 bg-green-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all shadow-2xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-30"
            >
              Confirm Submission
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === ScreeningStage.PPDT_STORY_SUBMITTED) {
    return (
      <div className="max-w-3xl mx-auto text-center py-24 space-y-12 animate-in zoom-in">
        <div className="w-28 h-28 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border-2 border-green-100 animate-bounce">
          <CheckCircle className="w-14 h-14" />
        </div>
        <h3 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Story Logged</h3>
        <p className="text-slate-500 font-medium text-xl leading-relaxed italic px-12">
          Gentleman, you have finished your writing. Prepare for individual narration. Keep your voice firm and head high.
        </p>
        <button 
          onClick={() => { 
            setStage(ScreeningStage.PPDT_NARRATION); 
            setTimeLeft(60); 
          }}
          className="px-20 py-6 bg-blue-600 text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-[0_20px_40px_rgba(37,99,235,0.3)] hover:-translate-y-1"
        >
          Begin Narration (1 Min)
        </button>
      </div>
    );
  }

  if (stage === ScreeningStage.PPDT_NARRATION) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12 space-y-12 animate-in fade-in">
        <div className={`relative w-48 h-48 rounded-full flex items-center justify-center mx-auto transition-all duration-700 border-8 ${isRecording ? 'bg-red-50 border-red-500 scale-110 shadow-[0_0_80px_rgba(239,68,68,0.4)] ring-8 ring-red-500/10' : 'bg-slate-50 border-slate-200 shadow-inner'}`}>
          {isRecording ? <Volume2 className="w-20 h-20 text-red-600 animate-pulse" /> : <MicOff className="w-20 h-20 text-slate-300" />}
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-2xl max-w-2xl mx-auto text-left space-y-3 shadow-sm">
          <h4 className="text-yellow-800 font-black uppercase text-xs tracking-widest flex items-center gap-2">
            <Headset size={16} /> Audio Environment Protocol
          </h4>
          <ul className="text-yellow-900/80 text-xs font-bold space-y-2 list-disc pl-4">
            <li>Ensure you are in a <b>Quiet Environment</b> with zero background noise.</li>
            <li>Speak <b>LOUD & CLEAR</b>. The AI analyzes confidence and fluency.</li>
            <li>If you stay silent, your Expression Score will be penalized.</li>
          </ul>
        </div>

        <div className={`text-9xl font-mono font-black tabular-nums transition-colors duration-500 ${timeLeft < 10 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
          {timeLeft}s
        </div>

        <div className="bg-slate-50 p-12 rounded-[3.5rem] border border-slate-200 min-h-[200px] flex items-center justify-center italic text-slate-700 text-xl shadow-inner overflow-hidden">
          {transcriptionError ? (
            <span className="text-red-500 font-bold">{transcriptionError}</span>
          ) : isRecording ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-blue-600 font-black uppercase tracking-[0.4em] text-xs">Recording Transmission...</span>
              <p className="text-slate-400 text-sm not-italic mt-2">Live transcript hidden to prevent distraction.</p>
            </div>
          ) : (
            <span className="text-slate-300">"Confirm to start the 60s countdown..."</span>
          )}
        </div>

        <div className="flex justify-center gap-6">
          {!isRecording ? (
            <button 
              onClick={startNarration}
              className="px-20 py-6 bg-blue-600 text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl"
            >
              Start Recording
            </button>
          ) : (
            <button 
              onClick={stopNarration}
              className="px-20 py-6 bg-red-600 text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-red-700 transition-all shadow-xl"
            >
              Stop & Finish
            </button>
          )}
        </div>
      </div>
    );
  }

  if (stage === ScreeningStage.PROCESSING) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-8">
        <div className="relative">
          <div className="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
            <Activity size={48} className="text-blue-600 animate-pulse" />
          </div>
          <div className="absolute inset-0 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        </div>
        <div className="space-y-2">
          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Analyzing Performance</h3>
          <p className="text-slate-500 font-medium">The AI Screening Board is evaluating your OIR and PPDT results...</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl max-w-md mx-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OIR 1</span>
              <CheckCircle size={16} className="text-green-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OIR 2</span>
              <CheckCircle size={16} className="text-green-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PPDT Story</span>
              <Loader2 size={16} className="text-blue-500 animate-spin" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === ScreeningStage.RESULT) {
    if (!finalAssessment) {
      return (
        <div className="max-w-2xl mx-auto py-20 text-center space-y-8 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Clock size={40} className="animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Evaluation Pending</h3>
            <p className="text-slate-500 font-medium">The AI is currently busy. Your screening result is being processed in the background.</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
            <p className="text-xs text-slate-600 mb-8">You can check your final result later in the <span className="font-bold text-blue-600">Assessment Center</span>.</p>
            <button 
              onClick={onExit}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
            >
              Back to Dashboard <ChevronRight size={18} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto py-10 animate-in zoom-in duration-500">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
          <div className={`p-10 text-center space-y-6 ${finalAssessment.status === 'SCREENED IN' ? 'bg-green-50' : finalAssessment.status === 'BORDERLINE' ? 'bg-yellow-50' : 'bg-red-50'}`}>
            <div className="flex justify-center">{finalAssessment.icon}</div>
            <div className="space-y-1">
              <h2 className={`text-4xl font-black uppercase tracking-tighter ${finalAssessment.color}`}>{finalAssessment.status}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Official Screening Verdict</p>
            </div>
          </div>

          <div className="p-8 md:p-12 space-y-10">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">OIR Average</p>
                <div className="text-3xl font-black text-slate-900">{finalAssessment.oirAvgPerc.toFixed(1)}%</div>
                <p className="text-[9px] font-bold text-slate-500 mt-1">Score: {finalAssessment.oirScore.toFixed(1)}/10</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">PPDT Score</p>
                <div className="text-3xl font-black text-slate-900">{finalAssessment.ppdtScore.toFixed(1)}/10</div>
                <p className="text-[9px] font-bold text-slate-500 mt-1">Weightage: 60%</p>
              </div>
              <div className="bg-slate-900 p-6 rounded-3xl text-center text-white shadow-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Final Score</p>
                <div className="text-4xl font-black text-yellow-400">{finalAssessment.finalScore.toFixed(1)}/10</div>
                <p className="text-[9px] font-bold text-slate-500 mt-1">Weighted Average</p>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Activity size={18} className="text-blue-600" /> Stage-wise Breakdown
              </h4>
              <div className="grid md:grid-cols-2 gap-6">
                {/* OIR Breakdown */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OIR Performance</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">OIR Set 1</span>
                      <span className="text-xs font-black text-slate-900">{finalAssessment.oir1Score}/{finalAssessment.oir1Total} ({finalAssessment.oir1Perc.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full" style={{ width: `${finalAssessment.oir1Perc}%` }} />
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs font-bold text-slate-600">OIR Set 2</span>
                      <span className="text-xs font-black text-slate-900">{finalAssessment.oir2Score}/{finalAssessment.oir2Total} ({finalAssessment.oir2Perc.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full" style={{ width: `${finalAssessment.oir2Perc}%` }} />
                    </div>
                  </div>
                </div>

                {/* PPDT Breakdown */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PPDT Components</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">Perception (Observation)</span>
                      <span className="text-xs font-black text-slate-900">{finalAssessment.ppdtDetails?.perception || 0}/3</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${((finalAssessment.ppdtDetails?.perception || 0) / 3) * 100}%` }} />
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs font-bold text-slate-600">Content (Story & OLQs)</span>
                      <span className="text-xs font-black text-slate-900">{finalAssessment.ppdtDetails?.content || 0}/5</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${((finalAssessment.ppdtDetails?.content || 0) / 5) * 100}%` }} />
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs font-bold text-slate-600">Expression (Narration)</span>
                      <span className="text-xs font-black text-slate-900">{finalAssessment.ppdtDetails?.expression || 0}/2</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${((finalAssessment.ppdtDetails?.expression || 0) / 2) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {finalAssessment.status === 'SCREENED OUT' && finalAssessment.rejectionReason && (
              <div className="space-y-4">
                <h4 className="text-sm font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={18} /> Rejection Analysis
                </h4>
                <div className="bg-red-50 p-8 rounded-[2rem] border border-red-100">
                  <p className="text-red-900 font-bold leading-relaxed">{finalAssessment.rejectionReason}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <ScanEye size={18} className="text-blue-600" /> Board Observations
              </h4>
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <p className="text-slate-600 font-medium leading-relaxed italic">"{finalAssessment.observation}"</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <button 
                onClick={onExit}
                className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl"
              >
                Return to Dashboard
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-10 py-5 bg-white text-slate-400 border border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all"
              >
                Retake Screening
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Zoom Modal
  return (
    <>
      {showBuzzer && (
        <div className="fixed inset-0 z-[500] bg-red-600/90 flex items-center justify-center animate-in fade-in duration-300">
          <div className="text-center space-y-8 animate-bounce">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl">
              <AlertCircle size={64} className="text-red-600" />
            </div>
            <h2 className="text-6xl font-black text-white uppercase tracking-widest">BUZZER!</h2>
            <p className="text-white/80 font-bold uppercase tracking-[0.4em]">Next Phase Initiated</p>
          </div>
        </div>
      )}

      {zoomedImage && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setZoomedImage(null)}>
          <button onClick={() => setZoomedImage(null)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"><X size={24} /></button>
          <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} alt="Zoomed" />
        </div>
      )}

      <CameraModal 
        isOpen={showCamera} 
        onClose={() => setShowCamera(false)} 
        onCapture={(base64) => processImage(base64)}
      />
    </>
  );
};

export default MockScreening;
