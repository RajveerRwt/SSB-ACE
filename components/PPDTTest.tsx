
import React, { useState, useEffect, useRef } from 'react';
import { Timer, CheckCircle, Upload, Loader2, Volume2, MicOff, ShieldCheck, Target, Image as ImageIcon, FileText, AlertCircle, Eye, BrainCircuit, X, RefreshCw, PenTool, Clock, BookOpen, FastForward, Edit3, HelpCircle, ChevronDown, ChevronUp, ScanEye, Cloud, ImagePlus, Star, Camera, LogIn, Lock, Coins, Activity, Headset, Maximize2 } from 'lucide-react';
import { evaluatePerformance, transcribeHandwrittenStory, generatePPDTStimulus } from '../services/geminiService';
import { getPPDTScenarios, getUserSubscription, checkLimit, TEST_RATES } from '../services/supabaseService';
import { SSBLogo } from './Logo';
import CameraModal from './CameraModal';
import SessionFeedback from './SessionFeedback';

const PPDT_TIPS = [
  "Identify the main character (Hero) clearly in the first sentence.",
  "The story should have a Past (What led to this?), Present (What is happening?), and Future (Outcome).",
  "Ensure the mood of the story aligns with the picture shown.",
  "The Hero should take initiative. Avoid supernatural solutions.",
  "Narrate confidently. Fluency matters as much as content.",
  "Don't describe the picture. Narrate the story BEHIND the picture.",
  "Keep the outcome positive and realistic.",
  "If the picture is hazy, use your imagination constructively, but stay logical."
];

enum PPDTStep {
  IDLE,
  INSTRUCTIONS,
  LOADING_IMAGE,
  IMAGE,
  CHARACTER_MARKING,
  STORY_WRITING,
  UPLOAD_GRACE_PERIOD,
  STORY_SUBMITTED,
  NARRATION,
  FINISHED
}

interface PPDTProps {
  onSave?: (result: any) => void;
  isAdmin?: boolean;
  userId?: string;
  isGuest?: boolean;
  onLoginRedirect?: () => void;
}

const PPDTTest: React.FC<PPDTProps> = ({ onSave, isAdmin, userId, isGuest = false, onLoginRedirect }) => {
  const [step, setStep] = useState<PPDTStep>(PPDTStep.IDLE);
  const [timeLeft, setTimeLeft] = useState(0);
  const [story, setStory] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [narrationText, setNarrationText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showBuzzer, setShowBuzzer] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [customStimulus, setCustomStimulus] = useState<string | null>(null);
  const [showScoreHelp, setShowScoreHelp] = useState(false);
  const [verifyingLimit, setVerifyingLimit] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customStimulusInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isRecordingRef = useRef(false);

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

  const handleStandardStart = async () => {
    if (isGuest || !userId) {
        setCustomStimulus(null);
        handleShowInstructions();
        return;
    }
    setVerifyingLimit(true);
    const { allowed, message } = await checkLimit(userId, 'PPDT');
    setVerifyingLimit(false);
    if (allowed) {
        setCustomStimulus(null);
        handleShowInstructions();
    } else alert(message);
  };

  const handleShowInstructions = () => { setStep(PPDTStep.INSTRUCTIONS); };
  const handleCustomUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setCustomStimulus(reader.result as string);
            handleShowInstructions();
        };
        reader.readAsDataURL(file);
    }
  };

  const startTestSequence = async () => {
    initAudio();
    if (customStimulus) {
        setCurrentImageUrl(customStimulus);
        setImageDescription("Custom Stimulus");
        setStep(PPDTStep.IMAGE);
        setTimeLeft(30);
    } else {
        setStep(PPDTStep.LOADING_IMAGE);
        try {
          const dbImages = await getPPDTScenarios();
          if (dbImages && dbImages.length > 0) {
            let selectedImage = dbImages[Math.floor(Math.random() * dbImages.length)];
            setCurrentImageUrl(selectedImage.image_url);
            setImageDescription(selectedImage.description || "Database Scenario");
          }
          setStep(PPDTStep.IMAGE);
          setTimeLeft(30); 
        } catch (e) {
          setStep(PPDTStep.IDLE);
        }
    }
  };

  useEffect(() => {
    const isNarrationTimed = step === PPDTStep.NARRATION && isRecording;
    const isTimedPhase = [PPDTStep.IMAGE, PPDTStep.CHARACTER_MARKING, PPDTStep.STORY_WRITING].includes(step);
    if (timeLeft > 0 && (isTimedPhase || isNarrationTimed)) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && step !== PPDTStep.IDLE && step !== PPDTStep.FINISHED && step !== PPDTStep.LOADING_IMAGE && step !== PPDTStep.INSTRUCTIONS) {
      if (step === PPDTStep.IMAGE) { triggerBuzzer(); setStep(PPDTStep.CHARACTER_MARKING); setTimeLeft(60); }
      else if (step === PPDTStep.CHARACTER_MARKING) { triggerBuzzer(); setStep(PPDTStep.STORY_WRITING); setTimeLeft(240); }
      else if (step === PPDTStep.STORY_WRITING) { triggerBuzzer(); setStep(PPDTStep.UPLOAD_GRACE_PERIOD); }
      else if (step === PPDTStep.NARRATION) { triggerBuzzer(); stopNarration(); }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, step, isRecording]);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => setCurrentTipIndex(prev => (prev + 1) % PPDT_TIPS.length), 3000);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const startNarration = () => {
    initAudio(); setNarrationText(''); setIsRecording(true); isRecordingRef.current = true;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setIsRecording(false); return; }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition; recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-IN';
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      if (finalTranscript) setNarrationText(prev => prev + (prev ? " " : "") + finalTranscript);
    };
    recognition.start();
  };

  const stopNarration = () => {
    isRecordingRef.current = false; setIsRecording(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    finishTest();
  };

  const processImage = async (base64Data: string, mimeType: string = 'image/jpeg') => {
    setIsTranscribing(true); setUploadedImageBase64(base64Data);
    try {
        const text = await transcribeHandwrittenStory(base64Data, mimeType);
        if (text) setStory(text);
    } catch (err) { setOcrError("Transcription failed."); }
    setIsTranscribing(false);
  };

  const finishTest = async () => {
    if (isGuest && customStimulus) { setStep(PPDTStep.FINISHED); return; }
    setStep(PPDTStep.FINISHED);
    setIsLoading(true);

    // SAFETY TIMER: If evaluation takes > 60s, don't make them wait.
    const safetyTimer = setTimeout(() => {
        if (isLoading) {
            setIsLoading(false);
            setFeedback({
                score: 0,
                verdict: "Server Busy",
                recommendations: "If the assessment is taking longer than expected (over 1 minute) or the server/API is temporarily unavailable, you don’t need to wait on the loading screen. Your full detailed assessment will be securely generated and saved in your Logs. Once the server is available, you can view it anytime without losing progress. This ensures uninterrupted practice while your results remain safely accessible later.",
                isPending: true,
                error: true
            });
        }
    }, 60000);

    try {
      const result = await evaluatePerformance('PPDT Screening Board', { story, narration: narrationText, visualStimulusProvided: imageDescription });
      clearTimeout(safetyTimer);
      setFeedback(result);
      if (onSave && !isGuest) onSave({ ...result, uploadedStoryImage: uploadedImageBase64 });
    } catch (e) {
      clearTimeout(safetyTimer);
      setFeedback({ score: 0, recommendations: "Internal Error. Attempt saved in logs.", error: true });
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case PPDTStep.IDLE:
        return (
          <div className="max-w-4xl mx-auto text-center py-20 md:py-28 space-y-12 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-900 text-yellow-400 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3 border-8 border-slate-50 ring-4 ring-slate-100">
              <SSBLogo className="w-12 h-12 md:w-16 md:h-16" />
            </div>
            <div className="space-y-4">
               <h3 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter">PPDT Simulation</h3>
               <p className="text-slate-500 text-lg md:text-2xl font-medium italic max-w-lg mx-auto">"Your perception defines your reality."</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-8">
                <button onClick={handleStandardStart} className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 hover:border-slate-900 hover:shadow-2xl transition-all group text-left">
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6"><Target size={24} /></div>
                    <h4 className="text-xl font-black uppercase text-slate-900 mb-2">Standard Board</h4>
                    <p className="text-xs text-slate-500">Official database images. Full psychological evaluation.</p>
                </button>
                <button onClick={() => customStimulusInputRef.current?.click()} className="bg-blue-50 p-8 rounded-[2rem] border-2 border-blue-100 hover:border-blue-500 hover:shadow-2xl transition-all group text-left">
                    <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6"><Upload size={24} /></div>
                    <h4 className="text-xl font-black uppercase text-blue-900 mb-2">Upload Custom Image</h4>
                    <p className="text-xs text-blue-700/70">Practice with your own pictures.</p>
                </button>
                <input type="file" ref={customStimulusInputRef} className="hidden" accept="image/*" onChange={handleCustomUpload} />
            </div>
          </div>
        );

      case PPDTStep.FINISHED:
        if (isLoading) {
          return (
            <div className="flex flex-col items-center justify-center py-24 md:py-40 space-y-8">
              <div className="relative">
                <Loader2 className="w-16 h-16 md:w-24 md:h-24 text-slate-900 animate-spin" />
                <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 text-blue-500" />
              </div>
              <div className="text-center space-y-4 max-w-lg px-6">
                  <p className="text-slate-900 font-black uppercase tracking-[0.5em] text-xs">Assessing Performance...</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                    If taking too long, your assessment will be available in <b>Mission Logs</b> shortly.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 transition-all duration-500">
                      <p className="text-blue-800 font-bold text-sm italic">"Tip: {PPDT_TIPS[currentTipIndex]}"</p>
                  </div>
              </div>
            </div>
          );
        }
        return (
          <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className={`p-8 md:p-16 rounded-[3rem] text-white relative overflow-hidden shadow-2xl ${feedback?.isPending ? 'bg-indigo-900' : feedback?.error ? 'bg-red-900' : 'bg-slate-950'}`}>
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
                  <div className="text-center md:text-left space-y-6">
                     <span className="bg-yellow-400 text-black px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.3em]">Board Report</span>
                     <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">{feedback?.isPending ? 'Status: Pending' : 'The Verdict'}</h2>
                     <p className="text-slate-300 font-medium max-w-lg text-sm md:text-lg italic opacity-80 leading-relaxed">"{feedback?.recommendations}"</p>
                  </div>
                  {!feedback?.isPending && !feedback?.error && (
                      <div className="flex flex-col items-center bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl">
                         <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">Board Score</span>
                         <div className="text-7xl md:text-9xl font-black text-yellow-400">{feedback?.score || 0}</div>
                      </div>
                  )}
               </div>
            </div>
            <button onClick={() => window.location.reload()} className="w-full py-6 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-2xl">
              Return to Dashboard
            </button>
          </div>
        );
      
      // ... default steps render same as standard ssb simulation UI ...
      case PPDTStep.IMAGE: return ( <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center"> <img src={currentImageUrl} className="w-full h-full object-contain opacity-90 grayscale contrast-[1.2]" /> <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900"> <div className="h-full bg-slate-700 transition-all duration-1000 linear" style={{width: `${(timeLeft/30)*100}%`}} /> </div> </div> );
      case PPDTStep.CHARACTER_MARKING: return <div className="text-center py-32"><h3 className="text-4xl font-black mb-4">Mark Characters</h3><div className="text-6xl font-mono">{timeLeft}s</div></div>;
      case PPDTStep.STORY_WRITING:
      case PPDTStep.UPLOAD_GRACE_PERIOD:
         const isTimeUp = step === PPDTStep.UPLOAD_GRACE_PERIOD;
         return (
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-end border-b pb-6 border-slate-100">
                    <h3 className="text-2xl md:text-4xl font-black text-slate-900 uppercase">Writing Phase</h3>
                    <div className="px-10 py-5 rounded-[2rem] bg-slate-900 text-white font-mono font-black text-4xl">{formatTime(timeLeft)}</div>
                </div>
                <div className="relative">
                    <textarea value={story} onChange={(e) => setStory(e.target.value)} placeholder="Type story transcript here if written on paper..." className="w-full h-[400px] p-10 rounded-[3rem] border-2 border-slate-100 focus:border-slate-900 outline-none text-lg leading-relaxed bg-white font-medium" />
                </div>
                <div className="flex gap-4 justify-end">
                    <button onClick={() => setStep(PPDTStep.STORY_SUBMITTED)} className="px-12 py-4 bg-green-600 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl">Submit Story</button>
                </div>
            </div>
         );
      case PPDTStep.STORY_SUBMITTED:
        return (
            <div className="max-w-3xl mx-auto text-center py-16 space-y-8">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border-2 border-green-100"><CheckCircle className="w-10 h-10" /></div>
                <h3 className="text-3xl font-black text-slate-900 uppercase">Story Logged</h3>
                <p className="text-slate-500 font-medium italic">"Gentleman, prepare for individual narration."</p>
                <button onClick={() => { setStep(PPDTStep.NARRATION); setTimeLeft(60); }} className="px-20 py-6 bg-blue-600 text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-blue-700 shadow-xl">Begin Narration (1 Min)</button>
            </div>
        );
      case PPDTStep.NARRATION:
        return (
            <div className="max-w-4xl mx-auto text-center py-12 space-y-12 animate-in fade-in">
                <div className={`relative w-32 h-32 rounded-full flex items-center justify-center mx-auto transition-all duration-700 border-8 ${isRecording ? 'bg-red-50 border-red-500 scale-110 shadow-lg' : 'bg-slate-50 border-slate-200'}`}>
                    {isRecording ? <Volume2 className="w-12 h-12 text-red-600 animate-pulse" /> : <MicOff className="w-12 h-12 text-slate-300" />}
                </div>
                <div className="text-9xl font-mono font-black text-slate-900">{timeLeft}s</div>
                <div className="flex justify-center gap-8">
                    {!isRecording ? <button onClick={startNarration} className="px-16 py-6 bg-red-600 text-white rounded-full font-black uppercase tracking-widest">Start Speak</button> : <button onClick={stopNarration} className="px-16 py-6 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest">End Session</button>}
                </div>
            </div>
        );
      default: return null;
    }
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  return (
    <div className={`min-h-[85vh] transition-all duration-500 ${showBuzzer ? 'bg-red-600/20' : ''}`}>
       <div className="bg-white rounded-[2.5rem] md:rounded-[4.5rem] shadow-2xl border border-slate-100 p-6 md:p-16 min-h-[80vh] relative overflow-hidden">
         {renderContent()}
       </div>
    </div>
  );
};

export default PPDTTest;
