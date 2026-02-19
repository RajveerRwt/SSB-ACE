
import React, { useState, useEffect, useRef } from 'react';
import { Timer, CheckCircle, Upload, Loader2, Volume2, MicOff, ShieldCheck, Target, Image as ImageIcon, FileText, AlertCircle, Eye, BrainCircuit, X, RefreshCw, PenTool, Clock, BookOpen, FastForward, Edit3, HelpCircle, ChevronDown, ChevronUp, ScanEye, Cloud, ImagePlus, Star, Camera, LogIn, Lock, Coins, Activity, Headset, History, Save } from 'lucide-react';
import { evaluatePerformance, transcribeHandwrittenStory, generatePPDTStimulus } from '../services/geminiService';
import { getPPDTScenarios, getUserSubscription, checkLimit, TEST_RATES, saveTestAttempt, incrementUsage } from '../services/supabaseService';
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
  const [loadingTime, setLoadingTime] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  const handleShowInstructions = () => {
    initAudio();
    setStep(PPDTStep.INSTRUCTIONS);
  };

  const handleStandardStart = async () => {
    if (isGuest) {
        setCustomStimulus(null);
        handleShowInstructions();
        return;
    }
    if (!userId) return;
    setVerifyingLimit(true);
    const { allowed, message } = await checkLimit(userId, 'PPDT');
    setVerifyingLimit(false);
    if (allowed) {
        setCustomStimulus(null);
        handleShowInstructions();
    } else {
        alert(message);
    }
  };

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
        setImageDescription("Manual User Upload (Practice Mode)");
        setStep(PPDTStep.IMAGE);
        setTimeLeft(30);
    } else {
        setStep(PPDTStep.LOADING_IMAGE);
        try {
          const dbImages = await getPPDTScenarios();
          if (dbImages && dbImages.length > 0) {
            let selectedImage;
            if (isGuest) selectedImage = dbImages[0];
            else if (userId) {
                const subscription = await getUserSubscription(userId);
                selectedImage = dbImages[subscription.usage.ppdt_used % dbImages.length];
            } else selectedImage = dbImages[Math.floor(Math.random() * dbImages.length)];

            setCurrentImageUrl(selectedImage.image_url);
            setImageDescription(selectedImage.description || "Database Scenario");
          } else {
            if (isGuest) {
                 setCurrentImageUrl("https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80");
                 setImageDescription("Guest Trial Image");
            } else {
                const aiImage = await generatePPDTStimulus("A group of people discussing something near a damaged vehicle.");
                setCurrentImageUrl(aiImage);
            }
          }
          setStep(PPDTStep.IMAGE);
          setTimeLeft(30); 
        } catch (e) {
          setStep(PPDTStep.IDLE);
        }
    }
  };

  useEffect(() => {
    const isTimedPhase = [PPDTStep.IMAGE, PPDTStep.CHARACTER_MARKING, PPDTStep.STORY_WRITING].includes(step) || (step === PPDTStep.NARRATION && isRecording);
    if (timeLeft > 0 && isTimedPhase) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && isTimedPhase && !isTranscribing) {
      if (step === PPDTStep.IMAGE) { triggerBuzzer(); setStep(PPDTStep.CHARACTER_MARKING); setTimeLeft(60); }
      else if (step === PPDTStep.CHARACTER_MARKING) { triggerBuzzer(); setStep(PPDTStep.STORY_WRITING); setTimeLeft(240); }
      else if (step === PPDTStep.STORY_WRITING) { triggerBuzzer(); setStep(PPDTStep.UPLOAD_GRACE_PERIOD); }
      else if (step === PPDTStep.NARRATION) { triggerBuzzer(); stopNarration(); }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, step, isTranscribing, isRecording]);

  useEffect(() => {
    if (isLoading && step === PPDTStep.FINISHED && !feedback) {
      loadingTimerRef.current = setInterval(() => {
        setLoadingTime(prev => prev + 1);
        setCurrentTipIndex(prev => (prev + 1) % PPDT_TIPS.length);
      }, 1000);
    } else {
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
      setLoadingTime(0);
    }
    return () => { if (loadingTimerRef.current) clearInterval(loadingTimerRef.current); };
  }, [isLoading, step, feedback]);

  const startNarration = () => {
    initAudio();
    setNarrationText('');
    setTranscriptionError(null);
    setIsRecording(true);
    isRecordingRef.current = true;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscriptionError("Speech recognition not supported.");
      setIsRecording(false);
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
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) setNarrationText(prev => prev + (prev ? " " : "") + finalTranscript);
      };
      recognition.onend = () => { if (isRecordingRef.current) recognition.start(); };
      recognition.start();
    } catch (e) { setIsRecording(false); }
  };

  const stopNarration = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    finishTest();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      processImage(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64Data: string, mimeType: string = 'image/jpeg') => {
    setIsTranscribing(true);
    setOcrError(null);
    setUploadedImageBase64(base64Data);
    try {
        const text = await transcribeHandwrittenStory(base64Data, mimeType);
        if (text) setStory(text);
    } catch (err) { setOcrError("Could not transcribe handwriting. Please type manually."); }
    setIsTranscribing(false);
  };

  const savePendingAndExit = async () => {
    if (!userId || isGuest) { window.location.reload(); return; }
    setIsLoading(true);
    try {
      let stimulusBase64 = null;
      if (currentImageUrl.startsWith('data:')) stimulusBase64 = currentImageUrl.split(',')[1];
      
      const pendingData = {
          story, narration: narrationText, stimulusImage: stimulusBase64,
          uploadedStoryImage: uploadedImageBase64, score: 0, verdict: "Pending Analysis",
          recommendations: "Assessment currently in queue. You can retry from Mission Logs shortly.",
          isCustomAttempt: !!customStimulus, error: true
      };
      await saveTestAttempt(userId, 'PPDT', pendingData);
      await incrementUsage(userId, 'PPDT');
      alert("Dossier Saved! You can find it in 'Mission Logs' on your Dashboard later.");
      window.location.reload();
    } catch (e) { alert("Failed to save. Please try again."); }
    setIsLoading(false);
  };

  const finishTest = async () => {
    if (isGuest && customStimulus) { setStep(PPDTStep.FINISHED); return; }
    setStep(PPDTStep.FINISHED);
    setIsLoading(true);
    try {
      let stimulusBase64 = null;
      if (currentImageUrl) {
          if (currentImageUrl.startsWith('data:')) stimulusBase64 = currentImageUrl.split(',')[1];
          else {
              try {
                  const response = await fetch(currentImageUrl);
                  const blob = await response.blob();
                  stimulusBase64 = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                      reader.readAsDataURL(blob);
                  });
              } catch (err) {}
          }
      }
      const result = await evaluatePerformance('PPDT Screening Board', { story, narration: narrationText, stimulusImage: stimulusBase64, uploadedStoryImage: uploadedImageBase64 });
      setFeedback(result);
      if (onSave && !isGuest) onSave({ ...result, uploadedStoryImage: uploadedImageBase64, isCustomAttempt: !!customStimulus });
    } catch (e) {
      setFeedback({ score: 0, verdict: "Technical Failure", recommendations: "Network error. Dossier saved locally.", strengths: [], weaknesses: [], error: true });
    } finally { setIsLoading(false); }
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
               <p className="text-slate-500 text-lg md:text-2xl font-medium italic max-w-lg mx-auto leading-relaxed">"Your perception defines your reality."</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-8">
                <button onClick={handleStandardStart} disabled={verifyingLimit} className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 hover:border-slate-900 hover:shadow-2xl transition-all group relative overflow-hidden text-left">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-slate-900"><Target size={100} /></div>
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">{verifyingLimit ? <Loader2 className="animate-spin" /> : <Target size={24} />}</div>
                    <h4 className="text-xl font-black uppercase text-slate-900 mb-2 tracking-tight">Standard Assessment</h4>
                    <p className="text-xs text-slate-500 font-medium">Official board scenarios. Full psych evaluation.</p>
                </button>
                <button onClick={() => customStimulusInputRef.current?.click()} className="bg-blue-50 p-8 rounded-[2rem] border-2 border-blue-100 hover:border-blue-500 hover:shadow-2xl transition-all group relative overflow-hidden text-left">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-blue-600"><ImagePlus size={100} /></div>
                    <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Upload size={24} /></div>
                    <div className="absolute top-6 right-6 bg-slate-900 text-yellow-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md flex items-center gap-1"><Coins size={8} /> {TEST_RATES.PPDT}</div>
                    <h4 className="text-xl font-black uppercase text-blue-900 mb-2 tracking-tight">Custom Practice</h4>
                    <p className="text-xs text-blue-700/70 font-medium">Practice with your own images.</p>
                </button>
                <input type="file" ref={customStimulusInputRef} className="hidden" accept="image/*" onChange={handleCustomUpload} />
            </div>
          </div>
        );

      case PPDTStep.INSTRUCTIONS:
        return (
          <div className="max-w-4xl mx-auto py-12 md:py-16 space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 text-center">
             <h3 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter">Testing Protocol</h3>
             <div className="grid md:grid-cols-2 gap-6 text-left">
                {[ { time: '30s', title: 'Perception', desc: 'Observe image.', icon: Eye }, { time: '1m', title: 'Marking', desc: 'Note details.', icon: PenTool }, { time: '4m', title: 'Writing', desc: 'Write story.', icon: BookOpen }, { time: '1m', title: 'Narration', desc: 'Narrate.', icon: Volume2 } ].map((item, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex items-center gap-6">
                     <div className="w-16 h-16 rounded-2xl bg-slate-50 flex flex-col items-center justify-center shrink-0 border border-slate-100"><item.icon size={24} /><span className="text-[10px] font-black uppercase mt-1">{item.time}</span></div>
                     <div><h4 className="font-black text-slate-900 uppercase text-sm">{item.title}</h4><p className="text-slate-500 text-xs font-medium">{item.desc}</p></div>
                  </div>
                ))}
             </div>
             <div className="flex justify-center pt-8 gap-4">
               <button onClick={() => { setStep(PPDTStep.IDLE); setCustomStimulus(null); }} className="px-8 py-6 text-slate-400 font-black uppercase text-xs">Cancel</button>
               <button onClick={startTestSequence} className="px-16 md:px-24 py-6 md:py-8 bg-blue-600 text-white rounded-full font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:scale-105 transition-all">Start Simulation</button>
             </div>
          </div>
        );

      case PPDTStep.IMAGE:
        return <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center"><img src={currentImageUrl} className="w-full h-full object-contain opacity-90 grayscale contrast-[1.2]" /><div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900"><div className="h-full bg-slate-700 transition-all duration-1000 linear" style={{width: `${(timeLeft/30)*100}%`}} /></div></div>;
      
      case PPDTStep.STORY_WRITING:
      case PPDTStep.UPLOAD_GRACE_PERIOD:
         const isTimeUp = step === PPDTStep.UPLOAD_GRACE_PERIOD;
         return (
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">
                <div className="flex justify-between items-end border-b pb-4 md:pb-6 border-slate-100">
                  <div><h3 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter">Writing Phase</h3><p className="text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-widest mt-2">Write on paper & include the character box</p></div>
                  <div className={`px-6 py-3 rounded-[1.5rem] font-mono font-black text-2xl border-4 ${timeLeft < 30 || isTimeUp ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-900 text-white'}`}>{isTimeUp ? "TIME UP" : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}</div>
                </div>
                <div className="space-y-6">
                {isTimeUp && <div className="bg-red-600 text-white p-6 rounded-2xl text-center font-black uppercase tracking-[0.2em] shadow-xl animate-pulse">Pen Down! Upload Your Sheet Now.</div>}
                <div className={`grid ${uploadedImageBase64 ? 'grid-cols-1 lg:grid-cols-2 gap-6' : 'grid-cols-1'}`}>
                    {uploadedImageBase64 && <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-slate-100 bg-slate-50 min-h-[300px] flex items-center justify-center"><img src={`data:image/jpeg;base64,${uploadedImageBase64}`} className="w-full h-full object-contain p-4" /></div>}
                    <div className="relative flex flex-col h-full">
                        <textarea value={story} onChange={(e) => setStory(e.target.value)} placeholder="Type story transcript here..." className={`w-full h-[400px] p-6 rounded-[2.5rem] border-2 border-slate-100 focus:border-slate-900 outline-none transition-all text-lg leading-relaxed shadow-xl bg-white ${isTranscribing ? 'opacity-50 blur-[1px]' : ''}`} />
                        {isTranscribing && <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-xl rounded-[2.5rem]"><Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-6" /><p className="text-slate-900 font-black uppercase text-xs">AI OCR: Transcribing...</p></div>}
                    </div>
                </div>
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-lg">
                    <div className="flex gap-4 w-full md:w-auto"><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} /><button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-blue-700">Upload File</button><button onClick={() => setShowCamera(true)} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-black">Camera</button></div>
                    <button onClick={() => { triggerBuzzer(); setStep(PPDTStep.STORY_SUBMITTED); }} disabled={!story.trim() || isTranscribing} className="w-full md:w-auto px-12 py-4 bg-green-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all disabled:opacity-30">Confirm Submission</button>
                </div>
                </div>
                <CameraModal isOpen={showCamera} onClose={() => setShowCamera(false)} onCapture={(base64) => processImage(base64)} />
            </div>
         );

      case PPDTStep.STORY_SUBMITTED:
        return <div className="max-w-3xl mx-auto text-center py-16 space-y-8"><div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner border-2 border-green-100 animate-bounce"><CheckCircle className="w-10 h-10" /></div><h3 className="text-3xl font-black text-slate-900 uppercase">Story Logged</h3><p className="text-slate-500 font-medium text-lg italic">"Gentleman, prepare for individual narration. Keep your voice firm."</p><button onClick={() => { setStep(PPDTStep.NARRATION); setTimeLeft(60); }} className="px-16 py-5 bg-blue-600 text-white rounded-full font-black uppercase text-xs hover:bg-blue-700 transition-all shadow-xl">Begin Narration (1 Min)</button></div>;

      case PPDTStep.NARRATION:
        return (
            <div className="max-w-4xl mx-auto text-center py-8 space-y-10 animate-in fade-in">
                <div className={`relative w-32 h-32 md:w-48 h-48 rounded-full flex items-center justify-center mx-auto border-8 transition-all duration-700 ${isRecording ? 'bg-red-50 border-red-500 scale-110 shadow-[0_0_80px_rgba(239,68,68,0.4)]' : 'bg-slate-50 border-slate-200'}`}>{isRecording ? <Volume2 className="w-12 h-12 md:w-20 text-red-600 animate-pulse" /> : <MicOff className="w-12 h-12 md:w-20 text-slate-300" />}</div>
                <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-2xl max-w-2xl mx-auto text-left space-y-3"><h4 className="text-yellow-800 font-black uppercase text-xs tracking-widest flex items-center gap-2"><Headset size={16} /> Audio Environment Protocol</h4><ul className="text-yellow-900/80 text-xs font-bold space-y-2 list-disc pl-4"><li>Ensure you are in a <b>Quiet Environment</b>.</li><li>Speak <b>LOUD & CLEAR</b>. The AI analyzes confidence.</li></ul></div>
                <div className={`text-7xl md:text-9xl font-mono font-black ${timeLeft < 10 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>{timeLeft}s</div>
                <div className="bg-slate-50 p-8 rounded-[2rem] min-h-[150px] flex items-center justify-center italic text-slate-700 text-lg shadow-inner overflow-hidden">{isRecording ? <div className="flex flex-col items-center gap-4"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /><span className="text-blue-600 font-black uppercase tracking-[0.4em] text-xs">Recording transmission...</span></div> : <span className="text-slate-300">"Confirm to start countdown..."</span>}</div>
                {/* Fixing incorrect function names: changing startRecording to startNarration and stopRecording to stopNarration */}
                <div className="flex justify-center gap-4 md:gap-8">{!isRecording ? <button onClick={startNarration} className="px-16 py-6 bg-red-600 text-white rounded-full font-black uppercase text-xs hover:bg-red-700 shadow-2xl transition-all">Confirm & Start</button> : <button onClick={stopNarration} className="px-16 py-6 bg-slate-900 text-white rounded-full font-black uppercase text-xs hover:bg-black shadow-2xl transition-all">Conclude Session</button>}</div>
            </div>
        );

      case PPDTStep.FINISHED:
        if (isLoading) {
          return (
            <div className="flex flex-col items-center justify-center py-24 md:py-40 space-y-8 animate-in fade-in">
              <div className="relative"><Loader2 className="w-16 h-16 md:w-24 text-slate-900 animate-spin" /><ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-500" /></div>
              <div className="text-center space-y-6 max-w-lg px-6">
                  <p className="text-slate-900 font-black uppercase tracking-[0.5em] text-xs md:text-sm">Assessing Performance...</p>
                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 transition-all duration-500"><p className="text-blue-800 font-bold text-sm italic">"Tip: {PPDT_TIPS[currentTipIndex]}"</p></div>
                  
                  {loadingTime >= 10 && !isGuest && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-left flex gap-4">
                             <AlertCircle className="text-yellow-600 shrink-0" size={20} />
                             <p className="text-xs font-bold text-yellow-800">The Board is currently very busy. You can save this dossier now and view your full assessment later in <b>Mission Logs</b>.</p>
                          </div>
                          <button onClick={savePendingAndExit} className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl">
                              <Save size={16} /> Save Dossier & View Later
                          </button>
                      </div>
                  )}
              </div>
            </div>
          );
        }
        return (
          <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="bg-slate-950 p-8 md:p-16 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
                  <div className="text-center md:text-left space-y-6">
                     <span className="bg-yellow-400 text-black px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.3em] shadow-lg">Stage 1 Verdict</span>
                     <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">The Board's <br/><span className="text-yellow-400">Verdict</span></h2>
                     <p className="text-slate-400 font-medium max-w-lg leading-relaxed text-sm md:text-lg italic opacity-80">"{feedback?.recommendations || 'Recommendation unavailable.'}"</p>
                  </div>
                  <div className="flex flex-col items-center bg-white/5 p-8 md:p-12 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl shadow-2xl">
                     <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">Board Score</span>
                     <div className="text-7xl md:text-9xl font-black text-yellow-400">{feedback?.score || 0}</div>
                     <button onClick={() => setShowScoreHelp(!showScoreHelp)} className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white transition-colors"><HelpCircle size={14} /> Understand Score {showScoreHelp ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</button>
                  </div>
               </div>
            </div>
            {currentImageUrl && <div className="flex justify-center -mt-6 mb-8 relative z-20"><div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-100 transform hover:scale-105 transition-transform"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">Stimulus Reference</p><img src={currentImageUrl} alt="PPDT Stimulus" className="h-40 md:h-56 w-auto object-contain rounded-xl bg-slate-50" /></div></div>}
            {userId && <SessionFeedback testType="PPDT" userId={userId} />}
            <button onClick={() => window.location.reload()} className="w-full py-6 md:py-7 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-2xl">Return to Barracks</button>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-[85vh] transition-all duration-500 ${showBuzzer ? 'bg-red-600/20' : 'bg-transparent'}`}>
       <div className="bg-white rounded-[2.5rem] md:rounded-[4.5rem] shadow-2xl border border-slate-100 p-6 md:p-16 min-h-[80vh] relative overflow-hidden ring-1 ring-slate-200/50">
         {isAdmin && timeLeft > 0 && <button onClick={() => setTimeLeft(0)} className="fixed bottom-6 right-6 z-[100] bg-red-600 text-white pl-4 pr-6 py-3 rounded-full font-black text-[10px] uppercase shadow-2xl border-4 border-white animate-pulse"><FastForward size={14} fill="currentColor" /> Admin Skip</button>}
         {showBuzzer && <div className="absolute inset-0 z-[100] border-[12px] border-red-600/80 pointer-events-none animate-pulse flex items-center justify-center backdrop-blur-sm"><div className="bg-red-600 text-white px-12 py-8 rounded-full font-black text-4xl transform -rotate-12 border-4 border-white uppercase">BUZZER</div></div>}
         {renderContent()}
       </div>
    </div>
  );
};

export default PPDTTest;
