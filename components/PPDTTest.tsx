import React, { useState, useEffect, useRef } from 'react';
import { Timer, CheckCircle, Upload, Loader2, Volume2, MicOff, ShieldCheck, Target, Image as ImageIcon, FileText, AlertCircle, Eye, BrainCircuit, X, RefreshCw, PenTool, Clock, BookOpen, FastForward, Edit3, HelpCircle, ChevronDown, ChevronUp, ScanEye, Cloud, ImagePlus, Star, Camera, LogIn, Lock, Coins, Activity, Headset } from 'lucide-react';
import { evaluatePerformance, transcribeHandwrittenStory, generatePPDTStimulus } from '../services/geminiService';
import { getPPDTScenarios, getUserSubscription, checkLimit, TEST_RATES, saveAssessmentReport } from '../services/supabaseService';
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

  const handleShowInstructions = () => { initAudio(); setStep(PPDTStep.INSTRUCTIONS); };

  const handleStandardStart = async () => {
    if (isGuest || !userId) { setCustomStimulus(null); handleShowInstructions(); return; }
    setVerifyingLimit(true);
    const { allowed, message } = await checkLimit(userId, 'PPDT');
    setVerifyingLimit(false);
    if (allowed) { setCustomStimulus(null); handleShowInstructions(); } else { alert(message); }
  };

  const handleCustomUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => { setCustomStimulus(reader.result as string); handleShowInstructions(); };
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
            } else {
                selectedImage = dbImages[Math.floor(Math.random() * dbImages.length)];
            }
            setCurrentImageUrl(selectedImage.image_url);
            setImageDescription(selectedImage.description || "Database Scenario");
          } else {
            setCurrentImageUrl("https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80");
            setImageDescription("Fallback Scenario");
          }
          setStep(PPDTStep.IMAGE);
          setTimeLeft(30); 
        } catch (e) {
          setStep(PPDTStep.IDLE);
        }
    }
  };

  useEffect(() => {
    const isTimedPhase = [PPDTStep.IMAGE, PPDTStep.CHARACTER_MARKING, PPDTStep.STORY_WRITING].includes(step);
    if (timeLeft > 0 && (isTimedPhase || (step === PPDTStep.NARRATION && isRecording))) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && !isTranscribing && ![PPDTStep.IDLE, PPDTStep.FINISHED, PPDTStep.STORY_SUBMITTED, PPDTStep.LOADING_IMAGE, PPDTStep.INSTRUCTIONS, PPDTStep.UPLOAD_GRACE_PERIOD].includes(step)) {
      if (step === PPDTStep.IMAGE) { triggerBuzzer(); setStep(PPDTStep.CHARACTER_MARKING); setTimeLeft(60); }
      else if (step === PPDTStep.CHARACTER_MARKING) { triggerBuzzer(); setStep(PPDTStep.STORY_WRITING); setTimeLeft(240); }
      else if (step === PPDTStep.STORY_WRITING) { triggerBuzzer(); setStep(PPDTStep.UPLOAD_GRACE_PERIOD); }
      else if (step === PPDTStep.NARRATION) { triggerBuzzer(); stopNarration(); }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, step, isTranscribing, isRecording]);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => { setCurrentTipIndex(prev => (prev + 1) % PPDT_TIPS.length); }, 3000);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const startNarration = () => {
    initAudio(); setNarrationText(''); setTranscriptionError(null); setIsRecording(true); isRecordingRef.current = true;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setTranscriptionError("Speech recognition not supported."); setIsRecording(false); return; }
    try {
      if (recognitionRef.current) recognitionRef.current.abort();
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-IN';
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        if (finalTranscript) setNarrationText(prev => prev + (prev ? " " : "") + finalTranscript);
      };
      recognition.onerror = (event: any) => { if (event.error !== 'no-speech' && event.error !== 'aborted') setIsRecording(false); };
      recognition.onend = () => { if (isRecordingRef.current) try { recognition.start(); } catch(e) {} };
      recognition.start();
    } catch (e) { setIsRecording(false); }
  };

  const stopNarration = () => { isRecordingRef.current = false; setIsRecording(false); if (recognitionRef.current) recognitionRef.current.stop(); finishTest(); };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => processImage((reader.result as string).split(',')[1], file.type); reader.readAsDataURL(file); } };
  const processImage = async (base64Data: string, mimeType: string = 'image/jpeg') => { setIsTranscribing(true); setOcrError(null); setUploadedImageBase64(base64Data); try { const text = await transcribeHandwrittenStory(base64Data, mimeType); if (text) setStory(text); } catch (err) { setOcrError("Transcription failed."); } setIsTranscribing(false); };

  const finishTest = async () => {
    if (isGuest && customStimulus) { setStep(PPDTStep.FINISHED); return; }
    setStep(PPDTStep.FINISHED);
    setIsLoading(true);
    try {
      let stimulusBase64 = null;
      if (currentImageUrl.startsWith('data:')) {
          stimulusBase64 = currentImageUrl.split(',')[1];
      } else {
          try {
              const res = await fetch(currentImageUrl);
              const blob = await res.blob();
              stimulusBase64 = await new Promise<string>((resolve) => { const r = new FileReader(); r.onloadend = () => resolve((r.result as string).split(',')[1]); r.readAsDataURL(blob); });
          } catch (e) { console.warn("Stimulus fetch error"); }
      }

      const inputData = { 
        story, 
        narration: narrationText, 
        stimulusImage: stimulusBase64, 
        stimulusUrl: currentImageUrl,
        uploadedStoryImage: uploadedImageBase64,
        imageDescription 
      };

      const result = await evaluatePerformance('PPDT', inputData);
      setFeedback(result);
      
      if (userId && !isGuest) {
          await saveAssessmentReport(userId, 'PPDT', inputData, result);
          if (onSave) onSave(result); // Still call onSave for usage increment
      }
    } catch (e) {
      console.error(e);
      setFeedback({ score: 0, error: true });
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case PPDTStep.IDLE:
        return (
          <div className="max-w-4xl mx-auto text-center py-20 space-y-12 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-slate-900 text-yellow-400 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl border-8 border-slate-50">
              <SSBLogo className="w-12 h-12" />
            </div>
            <div className="space-y-4">
               <h3 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter">PPDT Simulation</h3>
               <p className="text-slate-500 text-lg font-medium italic">"Observe, Analyze, and Lead."</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <button onClick={handleStandardStart} className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 hover:border-slate-900 transition-all text-left group">
                    <Target size={32} className="mb-4 text-slate-900" />
                    <h4 className="text-xl font-black uppercase text-slate-900 mb-2">Board Assessment</h4>
                    <p className="text-xs text-slate-500">Official database scenarios. Full psych evaluation.</p>
                </button>
                <button onClick={() => customStimulusInputRef.current?.click()} className="bg-blue-50 p-8 rounded-[2rem] border-2 border-blue-100 hover:border-blue-500 transition-all text-left group">
                    <Upload size={32} className="mb-4 text-blue-600" />
                    <h4 className="text-xl font-black uppercase text-blue-900 mb-2">Custom Image</h4>
                    <p className="text-xs text-blue-700/70">Practice with your own picture pictures.</p>
                </button>
                <input type="file" ref={customStimulusInputRef} className="hidden" accept="image/*" onChange={handleCustomUpload} />
            </div>
          </div>
        );
      case PPDTStep.INSTRUCTIONS:
        return (
          <div className="max-w-4xl mx-auto py-12 space-y-8 animate-in fade-in duration-500">
             <div className="text-center space-y-4"><h3 className="text-3xl font-black text-slate-900 uppercase">Testing Protocol</h3></div>
             <div className="grid md:grid-cols-2 gap-6">
                {[
                  { time: '30s', title: 'Picture Perception', icon: Eye },
                  { time: '1m', title: 'Character Marking', icon: PenTool },
                  { time: '4m', title: 'Story Writing', icon: BookOpen },
                  { time: '1m', title: 'Narration', icon: Volume2 }
                ].map((item, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex items-center gap-6">
                     <div className="w-16 h-16 rounded-2xl bg-slate-50 flex flex-col items-center justify-center shrink-0 border border-slate-100 text-slate-900">
                        <item.icon size={24} />
                        <span className="text-[10px] font-black uppercase">{item.time}</span>
                     </div>
                     <div><h4 className="font-black text-slate-900 uppercase text-sm">{item.title}</h4></div>
                  </div>
                ))}
             </div>
             <div className="flex justify-center pt-8 gap-4">
               <button onClick={startTestSequence} className="px-16 py-6 bg-blue-600 text-white rounded-full font-black uppercase text-sm shadow-2xl hover:scale-105 transition-all">Start Simulation</button>
             </div>
          </div>
        );
      case PPDTStep.LOADING_IMAGE: return <div className="flex flex-col items-center py-32"><Loader2 className="animate-spin w-12 h-12" /><p className="mt-4 font-black uppercase text-xs">Loading Stimulus...</p></div>;
      case PPDTStep.IMAGE: return <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center"><img src={currentImageUrl} className="w-full h-full object-contain opacity-90 grayscale" /><div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900"><div className="h-full bg-slate-700" style={{width: `${(timeLeft/30)*100}%`}} /></div></div>;
      case PPDTStep.CHARACTER_MARKING: return <div className="text-center py-32"><h3 className="text-4xl font-black mb-4">Mark Characters</h3><div className="text-6xl font-mono">{timeLeft}s</div></div>;
      case PPDTStep.STORY_WRITING:
      case PPDTStep.UPLOAD_GRACE_PERIOD:
         const isTimeUp = step === PPDTStep.UPLOAD_GRACE_PERIOD;
         return (
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-end border-b pb-6 border-slate-100">
                    <div><h3 className="text-2xl font-black text-slate-900 uppercase">Story Writing Phase</h3><p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2 underline decoration-blue-500">Write on paper & Include the Character Box</p></div>
                    <div className={`px-10 py-5 rounded-[2rem] font-mono font-black text-2xl border-4 ${timeLeft < 30 || isTimeUp ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-white'}`}>{isTimeUp ? "TIME UP" : formatTime(timeLeft)}</div>
                </div>
                <div className={`grid ${uploadedImageBase64 ? 'grid-cols-2 gap-6' : 'grid-cols-1'}`}>
                    {uploadedImageBase64 && <div className="rounded-[2.5rem] overflow-hidden border-4 border-slate-100 bg-slate-50 p-4"><img src={`data:image/jpeg;base64,${uploadedImageBase64}`} className="w-full h-full object-contain" /></div>}
                    <div className="relative"><textarea value={story} onChange={(e) => setStory(e.target.value)} disabled={isTranscribing} className="w-full h-[400px] p-10 rounded-[3.5rem] border-2 border-slate-100 focus:border-slate-900 outline-none transition-all text-lg shadow-xl" />{isTranscribing && <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-xl rounded-[3.5rem]"><Loader2 className="animate-spin" /></div>}</div>
                </div>
                <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-lg">
                    <div className="flex gap-4"><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} /><button onClick={() => fileInputRef.current?.click()} className="px-10 py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase shadow-xl">Upload Scan</button><button onClick={() => setShowCamera(true)} className="px-10 py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase shadow-xl">Use Camera</button></div>
                    <button onClick={() => { triggerBuzzer(); setStep(PPDTStep.STORY_SUBMITTED); }} disabled={!story.trim()} className="px-16 py-5 bg-green-600 text-white rounded-3xl font-black text-xs uppercase shadow-2xl">Confirm Submission</button>
                </div>
                <CameraModal isOpen={showCamera} onClose={() => setShowCamera(false)} onCapture={(base64) => processImage(base64)} />
            </div>
         );
      case PPDTStep.STORY_SUBMITTED: return <div className="max-w-3xl mx-auto text-center py-24 space-y-8"><div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><CheckCircle size={40} /></div><h3 className="text-3xl font-black text-slate-900 uppercase">Story Logged</h3><button onClick={() => { setStep(PPDTStep.NARRATION); setTimeLeft(60); }} className="px-16 py-5 bg-blue-600 text-white rounded-full font-black uppercase text-xs shadow-xl">Begin Narration (1 Min)</button></div>;
      case PPDTStep.NARRATION: return <div className="max-w-4xl mx-auto text-center py-12 space-y-12"><div className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto border-8 transition-all ${isRecording ? 'bg-red-50 border-red-500 scale-110 shadow-2xl' : 'bg-slate-50 border-slate-200'}`}>{isRecording ? <Volume2 className="text-red-600 animate-pulse" /> : <MicOff className="text-slate-300" />}</div><div className="text-7xl font-mono font-black">{timeLeft}s</div><div className="bg-slate-50 p-12 rounded-[3.5rem] border border-slate-200 min-h-[200px] flex items-center justify-center italic text-slate-700 text-xl shadow-inner">{isRecording ? "Transmitting audio..." : "Prepare for 60s countdown"}</div><div className="flex justify-center gap-8">{!isRecording ? <button onClick={startNarration} className="px-16 py-6 bg-red-600 text-white rounded-full font-black uppercase text-xs shadow-2xl">Start Speaking</button> : <button onClick={stopNarration} className="px-16 py-6 bg-slate-900 text-white rounded-full font-black uppercase text-xs shadow-2xl">Finish Session</button>}</div></div>;
      case PPDTStep.FINISHED:
        if (isLoading) return <div className="flex flex-col items-center py-40 space-y-12"><Loader2 className="w-20 h-20 animate-spin" /><p className="text-slate-900 font-black uppercase tracking-[0.5em] text-sm">Evaluating Dossier...</p><div className="bg-blue-50 p-4 rounded-xl border border-blue-100"><p className="text-blue-800 font-bold text-sm italic">"Tip: {PPDT_TIPS[currentTipIndex]}"</p></div></div>;
        return (
          <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in duration-1000">
            <div className="bg-slate-950 p-16 rounded-[4rem] text-white relative overflow-hidden shadow-2xl">
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-16">
                  <div className="text-center md:text-left space-y-6">
                     <span className="bg-yellow-400 text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em]">Stage 1 Verdict</span>
                     <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">The Board's <br/><span className="text-yellow-400">Verdict</span></h2>
                     <p className="text-slate-400 font-medium max-w-lg leading-relaxed text-sm md:text-lg italic opacity-80">"{feedback?.recommendations || 'Evaluation completed.'}"</p>
                  </div>
                  <div className="bg-white/5 p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-3xl text-center">
                     <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-4 block">Board Score</span>
                     <div className="text-9xl font-black text-yellow-400">{feedback?.score || 0}</div>
                  </div>
               </div>
            </div>
            <div className="grid md:grid-cols-2 gap-10">
               <div className="bg-white p-12 rounded-[3.5rem] border-2 border-slate-50 shadow-2xl"><h4 className="font-black text-xs uppercase tracking-[0.3em] text-green-600 mb-10 flex items-center gap-4"><CheckCircle size={24} /> Key Strengths</h4><div className="space-y-5">{feedback?.strengths?.map((s: string, i: number) => <div key={i} className="flex gap-5 p-5 bg-green-50 rounded-3xl border border-green-100 text-slate-800 text-sm font-bold"><CheckCircle size={18} className="text-green-500 shrink-0" /> {s}</div>)}</div></div>
               <div className="bg-white p-12 rounded-[3.5rem] border-2 border-slate-50 shadow-2xl"><h4 className="font-black text-xs uppercase tracking-[0.3em] text-red-500 mb-10 flex items-center gap-4"><AlertCircle size={24} /> OLQ Gaps</h4><div className="space-y-5">{feedback?.weaknesses?.map((w: string, i: number) => <div key={i} className="flex gap-5 p-5 bg-red-50 rounded-3xl border border-red-100 text-slate-800 text-sm font-bold"><AlertCircle size={18} className="text-red-500 shrink-0" /> {w}</div>)}</div></div>
            </div>
            {userId && <SessionFeedback testType="PPDT" userId={userId} />}
            <button onClick={() => window.location.reload()} className="w-full py-7 bg-slate-900 text-white rounded-full font-black uppercase text-xs hover:bg-black transition-all shadow-2xl">Return to Barracks</button>
          </div>
        );
    }
  };

  const formatTime = (seconds: number) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, '0')}`; };

  return (
    <div className={`min-h-[85vh] transition-all duration-500 ${showBuzzer ? 'bg-red-600/20' : 'bg-transparent'}`}>
       <div className="bg-white rounded-[2.5rem] md:rounded-[4.5rem] shadow-2xl border border-slate-100 p-6 md:p-16 min-h-[80vh] relative overflow-hidden">
         {isAdmin && timeLeft > 0 && <button onClick={() => setTimeLeft(0)} className="fixed bottom-6 right-6 z-[100] bg-red-600 text-white px-6 py-3 rounded-full font-black text-[10px] uppercase shadow-2xl border-4 border-white animate-pulse"><FastForward size={14} fill="currentColor" /> Admin Skip</button>}
         {showBuzzer && <div className="absolute inset-0 z-[100] border-[12px] border-red-600/80 animate-pulse flex items-center justify-center backdrop-blur-sm"><div className="bg-red-600 text-white px-12 py-8 rounded-full font-black text-4xl transform -rotate-12 border-4 border-white">BUZZER</div></div>}
         {renderContent()}
       </div>
    </div>
  );
};

export default PPDTTest;
