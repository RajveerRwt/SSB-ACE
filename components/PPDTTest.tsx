
import React, { useState, useEffect, useRef } from 'react';
import { Timer, CheckCircle, Upload, Loader2, Volume2, MicOff, ShieldCheck, Target, Image as ImageIcon, FileText, AlertCircle, Eye, BrainCircuit, X, RefreshCw, PenTool, Clock, BookOpen, FastForward, Edit3, HelpCircle, ChevronDown, ChevronUp, ScanEye, Cloud, ImagePlus, Star, Camera, LogIn, Mic, ArrowRight } from 'lucide-react';
import { evaluatePerformance, transcribeHandwrittenStory, generatePPDTStimulus } from '../services/geminiService';
import { getPPDTScenarios, getUserSubscription, checkLimit, saveTestAttempt, updateTestResult, subscribeToTestResult } from '../services/supabaseService';
import { SSBLogo } from './Logo';
import CameraModal from './CameraModal';
import SessionFeedback from './SessionFeedback';

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
  PROCESSING,
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
  
  // Async processing state
  const [testId, setTestId] = useState<string | null>(null);

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

    if (!userId) {
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
    setFeedback(null);
    setNarrationText('');
    setStory('');
    setUploadedImageBase64(null);
    
    if (customStimulus) {
        setCurrentImageUrl(customStimulus);
        setImageDescription("Manual User Upload (Practice Mode)");
        setStep(PPDTStep.IMAGE);
        setTimeLeft(30);
    } else {
        setStep(PPDTStep.LOADING_IMAGE);
        try {
          // Fetch from Database for BOTH Guest and Logged In users
          const dbImages = await getPPDTScenarios();
          
          if (dbImages && dbImages.length > 0) {
            let selectedImage;
            
            if (isGuest) {
                // GUEST MODE: Always pick the first image from DB to ensure a fixed set
                selectedImage = dbImages[0];
            } else if (userId) {
                // LOGGED IN: Rotate based on usage
                const subscription = await getUserSubscription(userId);
                const count = subscription.usage.ppdt_used;
                const index = count % dbImages.length;
                selectedImage = dbImages[index];
            } else {
                // FALLBACK: Random
                selectedImage = dbImages[Math.floor(Math.random() * dbImages.length)];
            }

            setCurrentImageUrl(selectedImage.image_url);
            setImageDescription(selectedImage.description || "Database Scenario");
          } else {
            // FALLBACK IF DB EMPTY (or Network Error)
            // Use specific fixed image for guest if DB fails
            if (isGuest) {
                 setCurrentImageUrl("https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80");
                 setImageDescription("Guest Trial Image: Group Discussion");
            } else {
                 const scenarios = [
                  "A group of people discussing something near a damaged vehicle on a road.",
                  "A person helping another climb a steep ledge in a village.",
                  "People standing near a building with smoke coming out of windows."
                ];
                const selectedScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
                setImageDescription(selectedScenario);
                const aiImage = await generatePPDTStimulus(selectedScenario);
                setCurrentImageUrl(aiImage);
            }
          }

          setStep(PPDTStep.IMAGE);
          setTimeLeft(30); 
        } catch (e) {
          console.error("Image fetch failed", e);
          setStep(PPDTStep.IDLE);
        }
    }
  };

  useEffect(() => {
    const isNarrationTimed = step === PPDTStep.NARRATION && isRecording;
    const isTimedPhase = [PPDTStep.IMAGE, PPDTStep.CHARACTER_MARKING, PPDTStep.STORY_WRITING].includes(step);

    if (timeLeft > 0 && (isTimedPhase || isNarrationTimed)) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && !isTranscribing && step !== PPDTStep.IDLE && step !== PPDTStep.FINISHED && step !== PPDTStep.STORY_SUBMITTED && step !== PPDTStep.LOADING_IMAGE && step !== PPDTStep.INSTRUCTIONS && step !== PPDTStep.UPLOAD_GRACE_PERIOD && step !== PPDTStep.PROCESSING) {
      if (step === PPDTStep.IMAGE) {
        triggerBuzzer();
        setStep(PPDTStep.CHARACTER_MARKING);
        setTimeLeft(60);
      } else if (step === PPDTStep.CHARACTER_MARKING) {
        triggerBuzzer();
        setStep(PPDTStep.STORY_WRITING);
        setTimeLeft(240);
      } else if (step === PPDTStep.STORY_WRITING) {
        triggerBuzzer();
        setStep(PPDTStep.UPLOAD_GRACE_PERIOD);
      } else if (step === PPDTStep.NARRATION) {
        triggerBuzzer();
        stopNarration();
      }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, step, isTranscribing, isRecording]);

  const startNarration = () => {
    initAudio();
    setNarrationText('');
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
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) setNarrationText(prev => prev + (prev ? " " : "") + finalTranscript);
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
    // Auto submit or wait for user? Let's wait for user to click submit in narration phase
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
        if (text && text.includes("Transcription unavailable")) {
            setOcrError("Auto-transcription unavailable (Service Busy). Please type your story manually below.");
        } else if (text) {
            setStory(text);
        }
    } catch (err) {
        setOcrError("Could not transcribe handwriting. Please type manually.");
    }
    setIsTranscribing(false);
  };

  // ASYNC SUBMISSION LOGIC
  const submitForProcessing = async () => {
    setStep(PPDTStep.PROCESSING);
    
    // Prepare Data
    let stimulusBase64 = null;
    if (currentImageUrl) {
        if (currentImageUrl.startsWith('data:')) {
            stimulusBase64 = currentImageUrl.split(',')[1];
        } else {
            try {
                const response = await fetch(currentImageUrl);
                const blob = await response.blob();
                stimulusBase64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(blob);
                });
            } catch (err) { console.warn("Failed to fetch stimulus:", err); }
        }
    }

    const payload = { 
        story, 
        narration: narrationText,
        visualStimulusProvided: imageDescription,
        uploadedStoryImage: uploadedImageBase64,
        stimulusImage: stimulusBase64 
    };

    // 1. Save Initial Attempt (PENDING)
    let savedId = null;
    if (userId && !isGuest) {
        try {
            savedId = await saveTestAttempt(userId, 'PPDT Screening Board (Stage-1)', payload, 'PENDING');
            if (savedId) setTestId(savedId);
        } catch(e) {
            console.error("DB Save Failed", e);
        }
    }

    // 2. Trigger Async Processing (Fire and Forget from UI perspective)
    processAsyncEvaluation(payload, savedId);
  };

  const processAsyncEvaluation = async (payload: any, savedTestId: string | null) => {
      try {
          const result = await evaluatePerformance('PPDT Screening Board (Stage-1)', payload);
          setFeedback(result);
          
          if (savedTestId) {
              await updateTestResult(savedTestId, result, 'COMPLETED');
          }
          
          // Notify Parent Component (App.tsx)
          if (onSave && !isGuest) {
              onSave({ 
                  ...result, 
                  uploadedStoryImage: payload.uploadedStoryImage, 
                  isCustomAttempt: !!customStimulus 
              });
          }
          
          // Update UI
          setStep(PPDTStep.FINISHED);
      } catch (e) {
          console.error("Eval Error:", e);
          // Stay on Processing or show Retry
          setStep(PPDTStep.FINISHED); // Fallback to finished state with empty feedback or handle error
      }
  };

  // Subscribe to DB updates if we have an ID (Backup for when background worker updates it)
  useEffect(() => {
      if (testId && step === PPDTStep.PROCESSING) {
          const unsubscribe = subscribeToTestResult(testId, (newRecord) => {
              if (newRecord.status === 'COMPLETED' && newRecord.result_data) {
                  setFeedback(newRecord.result_data);
                  setStep(PPDTStep.FINISHED);
              }
          });
          return () => unsubscribe();
      }
  }, [testId, step]);

  // Render logic...
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
               <p className="text-slate-500 text-lg md:text-2xl font-medium italic max-w-lg mx-auto leading-relaxed">
                 "Your perception defines your reality. Observe, Analyze, and Lead."
               </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-8">
                <button 
                    onClick={handleStandardStart}
                    disabled={verifyingLimit}
                    className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 hover:border-slate-900 hover:shadow-2xl transition-all group relative overflow-hidden text-left"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Target size={100} />
                    </div>
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        {verifyingLimit ? <Loader2 className="animate-spin" /> : <Target size={24} />}
                    </div>
                    <h4 className="text-xl font-black uppercase text-slate-900 mb-2 tracking-tight">Standard Board Assessment</h4>
                    <p className="text-xs text-slate-500 font-medium">{isGuest ? "Trial Mode: Fixed Image Set. Login to unlock randomized sets." : "Official database images. Full psychological evaluation."}</p>
                </button>

                <button 
                    onClick={() => customStimulusInputRef.current?.click()}
                    className="bg-blue-50 p-8 rounded-[2rem] border-2 border-blue-100 hover:border-blue-500 hover:shadow-2xl transition-all group relative overflow-hidden text-left"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-blue-600">
                        <ImagePlus size={100} />
                    </div>
                    <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Upload size={24} />
                    </div>
                    <div className="absolute top-6 right-6 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">Free Always</div>
                    <h4 className="text-xl font-black uppercase text-blue-900 mb-2 tracking-tight">Upload Custom Image</h4>
                    <p className="text-xs text-blue-700/70 font-medium">Practice with your own pictures. Unlimited attempts. Does NOT consume credits.</p>
                </button>
                <input 
                    type="file" 
                    ref={customStimulusInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleCustomUpload} 
                />
            </div>
          </div>
        );

      case PPDTStep.INSTRUCTIONS:
        return (
          <div className="max-w-4xl mx-auto py-12 md:py-16 space-y-8 md:space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
             <div className="text-center space-y-4">
               <h3 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter">Testing Protocol</h3>
               <div className="flex justify-center gap-3">
                   <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Stage 1 Screening Procedure</span>
                   {customStimulus && <span className="text-blue-600 font-black uppercase tracking-widest text-xs bg-blue-50 px-2 rounded">Custom Mode</span>}
                   {isGuest && <span className="text-orange-600 font-black uppercase tracking-widest text-xs bg-orange-50 px-2 rounded">Guest Trial</span>}
               </div>
             </div>

             <div className="grid md:grid-cols-2 gap-6">
                {[
                  { time: '30s', title: 'Picture Perception', desc: 'Observe the image details carefully.', icon: Eye, color: 'text-blue-600' },
                  { time: '1m', title: 'Character Marking', desc: 'Note Age, Sex, Mood & Position in box.', icon: PenTool, color: 'text-purple-600' },
                  { time: '4m', title: 'Story Writing', desc: 'Write Action, Hero details & Outcome.', icon: BookOpen, color: 'text-slate-900' },
                  { time: '1m', title: 'Narration', desc: 'Narrate your story clearly.', icon: Volume2, color: 'text-green-600' }
                ].map((item, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex items-center gap-6">
                     <div className={`w-16 h-16 rounded-2xl bg-slate-50 flex flex-col items-center justify-center shrink-0 border border-slate-100 ${item.color}`}>
                        <item.icon size={24} />
                        <span className="text-[10px] font-black uppercase mt-1">{item.time}</span>
                     </div>
                     <div>
                       <h4 className="font-black text-slate-900 uppercase text-sm tracking-wide">{item.title}</h4>
                       <p className="text-slate-500 text-xs font-medium leading-relaxed">{item.desc}</p>
                     </div>
                  </div>
                ))}
             </div>

             {customStimulus && (
                 <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-center gap-4 max-w-md mx-auto">
                     <div className="w-12 h-12 bg-white rounded-lg overflow-hidden border border-slate-200">
                         <img src={customStimulus} className="w-full h-full object-cover" alt="Custom Preview" />
                     </div>
                     <p className="text-xs font-bold text-blue-800">Custom Image Loaded. Ready for simulation.</p>
                 </div>
             )}

             <div className="flex justify-center pt-8 gap-4">
               <button 
                  onClick={() => { setStep(PPDTStep.IDLE); setCustomStimulus(null); }}
                  className="px-8 py-6 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-600"
               >
                  Cancel
               </button>
               <button 
                  onClick={startTestSequence}
                  className="px-16 md:px-24 py-6 md:py-8 bg-blue-600 text-white rounded-full font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:bg-blue-700 transition-all hover:scale-105"
               >
                 Start {customStimulus ? 'Practice' : 'Test'}
               </button>
             </div>
          </div>
        );

      case PPDTStep.LOADING_IMAGE:
        return <div className="flex flex-col items-center justify-center py-32"><Loader2 className="animate-spin w-12 h-12 text-slate-900" /><p className="mt-4 font-black uppercase tracking-widest text-xs">Loading Stimulus...</p></div>;
      
      case PPDTStep.IMAGE:
        return (
            <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
                <img src={currentImageUrl} className="w-full h-full object-contain opacity-90 grayscale contrast-[1.2]" />
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900">
                    <div className="h-full bg-slate-700 transition-all duration-1000 linear" style={{width: `${(timeLeft/30)*100}%`}} />
                </div>
            </div>
        );
      
      case PPDTStep.CHARACTER_MARKING:
        return <div className="text-center py-32"><h3 className="text-4xl font-black mb-4">Mark Characters</h3><div className="text-6xl font-mono">{timeLeft}s</div></div>;

      case PPDTStep.STORY_WRITING:
      case PPDTStep.UPLOAD_GRACE_PERIOD:
         const isTimeUp = step === PPDTStep.UPLOAD_GRACE_PERIOD;
         return (
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">
                {/* Header */}
                <div className="flex justify-between items-end border-b pb-4 md:pb-6 border-slate-100">
                    <div>
                        <h3 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter">Story Writing Phase</h3>
                        <p className="text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-widest mt-2 underline decoration-blue-500 underline-offset-4 decoration-2">Write on paper & Include the Character Box</p>
                    </div>
                    <div className={`px-6 py-3 md:px-10 md:py-5 rounded-[1.5rem] md:rounded-[2rem] font-mono font-black text-2xl md:text-4xl border-4 transition-all ${timeLeft < 30 || isTimeUp ? 'bg-red-50 border-red-500 text-red-600 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-slate-900 border-slate-900 text-white shadow-xl'}`}>
                        <div className="flex items-center gap-3 md:gap-4">
                            <Timer className="w-6 h-6 md:w-8 md:h-8" />
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Paper Upload Section */}
                    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col justify-between">
                       <div className="space-y-4">
                           <div className="flex items-center gap-3 text-blue-600">
                               <div className="p-3 bg-blue-50 rounded-xl"><Upload size={24} /></div>
                               <h4 className="font-black text-lg md:text-xl uppercase tracking-tight">Upload Handwritten Story</h4>
                           </div>
                           <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                               Prefer writing on paper? Take a clear photo. AI will attempt to transcribe it.
                           </p>
                           {ocrError && <div className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl flex items-center gap-2"><AlertCircle size={14}/> {ocrError}</div>}
                       </div>
                       
                       <div className="mt-6 md:mt-8">
                           {uploadedImageBase64 ? (
                               <div className="relative rounded-2xl overflow-hidden aspect-video border-2 border-green-500 group">
                                   <img src={`data:image/jpeg;base64,${uploadedImageBase64}`} className="w-full h-full object-cover" alt="Uploaded Story" />
                                   <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                       <button onClick={() => { setUploadedImageBase64(null); setStory(''); }} className="bg-red-600 text-white px-6 py-3 rounded-full font-black uppercase text-xs flex items-center gap-2"><X size={14} /> Remove</button>
                                   </div>
                                   <div className="absolute top-2 right-2 bg-green-500 text-white p-2 rounded-full shadow-lg"><CheckCircle size={16} /></div>
                               </div>
                           ) : (
                               <div className="flex flex-col gap-3">
                                   <button onClick={() => fileInputRef.current?.click()} disabled={isTranscribing} className="w-full h-32 md:h-40 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all group">
                                       {isTranscribing ? <Loader2 className="animate-spin w-8 h-8" /> : <Camera className="w-8 h-8 md:w-10 md:h-10 group-hover:scale-110 transition-transform" />}
                                       <span className="font-black uppercase tracking-widest text-xs md:text-sm">Tap to Upload / Camera</span>
                                   </button>
                                   <button onClick={() => setShowCamera(true)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"><Camera size={16} /> Use Web Camera</button>
                                   <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                               </div>
                           )}
                       </div>
                    </div>

                    {/* Text Area Section */}
                    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col h-full">
                       <div className="flex items-center gap-3 text-slate-900 mb-4">
                           <div className="p-3 bg-slate-100 rounded-xl"><FileText size={24} /></div>
                           <h4 className="font-black text-lg md:text-xl uppercase tracking-tight">Or Type Story</h4>
                       </div>
                       <textarea 
                           value={story}
                           onChange={(e) => setStory(e.target.value)}
                           placeholder="Type your story here if not uploading image..."
                           className="flex-1 w-full p-6 bg-slate-50 border border-slate-200 rounded-3xl resize-none outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all font-medium text-slate-700 text-sm md:text-base leading-relaxed"
                       />
                    </div>
                </div>

                <div className="flex justify-center pt-4 md:pt-8">
                    <button 
                        onClick={() => { setStep(PPDTStep.NARRATION); setTimeLeft(60); }}
                        className="px-12 md:px-16 py-5 md:py-6 bg-green-600 text-white rounded-full font-black uppercase tracking-widest text-xs md:text-sm shadow-xl hover:bg-green-700 hover:scale-105 transition-all flex items-center gap-3"
                    >
                        Submit & Proceed to Narration <ArrowRight size={18} />
                    </button>
                </div>
                <CameraModal isOpen={showCamera} onClose={() => setShowCamera(false)} onCapture={(base64) => processImage(base64)} />
            </div>
         );

      case PPDTStep.STORY_SUBMITTED:
         return null;

      case PPDTStep.NARRATION:
         return (
            <div className="max-w-4xl mx-auto py-12 md:py-20 text-center space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
               <div className="space-y-4">
                   <div className="inline-flex items-center gap-3 px-6 py-2 bg-slate-100 rounded-full text-slate-600 font-black uppercase text-xs tracking-widest">
                       <Mic size={14} /> Narration Phase
                   </div>
                   <h3 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter">Speak Your Story</h3>
                   <p className="text-slate-500 font-medium text-lg md:text-xl max-w-2xl mx-auto">
                       You have 1 minute. Be confident, clear, and concise. Click the mic to start.
                   </p>
               </div>

               <div className="relative w-48 h-48 md:w-64 md:h-64 mx-auto">
                   {/* Ripple Effect */}
                   {isRecording && (
                       <>
                           <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                           <div className="absolute inset-4 bg-red-500/30 rounded-full animate-ping animation-delay-300" />
                       </>
                   )}
                   <button 
                       onClick={isRecording ? stopNarration : startNarration}
                       className={`relative z-10 w-full h-full rounded-full flex flex-col items-center justify-center border-8 transition-all shadow-2xl group ${isRecording ? 'bg-red-600 border-red-200 scale-110' : 'bg-slate-900 border-slate-100 hover:bg-slate-800 hover:scale-105'}`}
                   >
                       {isRecording ? <MicOff size={64} className="text-white mb-2" /> : <Mic size={64} className="text-white mb-2" />}
                       <span className="text-white font-black uppercase tracking-widest text-xs md:text-sm">
                           {isRecording ? 'Stop Recording' : 'Start Recording'}
                       </span>
                   </button>
               </div>

               {isRecording && (
                   <div className="text-4xl md:text-6xl font-mono font-black text-slate-900 tabular-nums">
                       {timeLeft}s
                   </div>
               )}

               <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-xl max-w-2xl mx-auto text-left relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Live Transcript</p>
                   <p className="text-slate-700 font-medium text-lg leading-relaxed min-h-[100px]">
                       {narrationText || <span className="text-slate-300 italic">Listening...</span>}
                   </p>
                   {transcriptionError && <p className="text-red-500 text-xs font-bold mt-2">{transcriptionError}</p>}
               </div>

               {!isRecording && narrationText && (
                   <button onClick={submitForProcessing} className="px-12 py-5 bg-green-600 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-green-700 shadow-xl transition-all">
                       Submit Assessment
                   </button>
               )}
            </div>
         );

      case PPDTStep.PROCESSING:
         return (
             <div className="flex flex-col items-center justify-center py-40 space-y-8 animate-in fade-in duration-700">
                 <div className="relative">
                     <div className="w-24 h-24 border-8 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                     <div className="absolute inset-0 flex items-center justify-center">
                         <BrainCircuit className="text-slate-300" size={32} />
                     </div>
                 </div>
                 <div className="text-center space-y-2">
                     <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Analyzing Performance</h3>
                     <p className="text-slate-500 font-medium text-sm">Evaluating Story, Psych Profile, and Narration...</p>
                 </div>
             </div>
         );

      case PPDTStep.FINISHED:
         return (
             <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in slide-in-from-bottom-12 duration-700">
                 <div className="bg-slate-900 text-white p-10 md:p-16 rounded-[3rem] shadow-2xl relative overflow-hidden text-center">
                     <div className="relative z-10 space-y-6">
                         <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-400 text-black rounded-full text-[10px] font-black uppercase tracking-widest">
                             <CheckCircle size={12} /> Assessment Complete
                         </div>
                         <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">
                             PPDT <span className="text-blue-500">Report</span>
                         </h2>
                         {feedback && (
                             <div className="flex flex-col md:flex-row justify-center gap-8 pt-8">
                                 <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 min-w-[200px]">
                                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Psych Score</p>
                                     <p className="text-6xl font-black text-yellow-400">{feedback.score || "N/A"}</p>
                                 </div>
                                 <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 min-w-[200px]">
                                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Verdict</p>
                                     <p className="text-2xl font-black text-white mt-3 uppercase tracking-wide">{feedback.verdict || "Pending"}</p>
                                 </div>
                             </div>
                         )}
                     </div>
                     <Target className="absolute -right-12 -bottom-12 w-64 h-64 text-white/5 rotate-12" />
                 </div>

                 {feedback && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                         {/* Analysis Card */}
                         <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                             <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-3">
                                 <ScanEye className="text-blue-600" /> Observation Analysis
                             </h4>
                             <p className="text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                 {feedback.observationAnalysis || "Analysis not available."}
                             </p>
                             
                             <div className="mt-8 grid grid-cols-2 gap-4">
                                 <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                                     <p className="text-[10px] font-black uppercase tracking-widest text-green-700 mb-2">Strengths</p>
                                     <ul className="space-y-1">
                                         {feedback.strengths?.map((s: string, i: number) => (
                                             <li key={i} className="text-xs font-bold text-slate-700 flex gap-2"><CheckCircle size={12} className="text-green-500 mt-0.5" /> {s}</li>
                                         ))}
                                     </ul>
                                 </div>
                                 <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                                     <p className="text-[10px] font-black uppercase tracking-widest text-red-700 mb-2">Weaknesses</p>
                                     <ul className="space-y-1">
                                         {feedback.weaknesses?.map((w: string, i: number) => (
                                             <li key={i} className="text-xs font-bold text-slate-700 flex gap-2"><AlertCircle size={12} className="text-red-500 mt-0.5" /> {w}</li>
                                         ))}
                                     </ul>
                                 </div>
                             </div>
                         </div>

                         {/* Ideal Story Card */}
                         <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100 shadow-inner">
                             <h4 className="text-xl font-black text-blue-900 uppercase tracking-tighter mb-6 flex items-center gap-3">
                                 <Star className="text-yellow-500 fill-yellow-500" /> Ideal Approach
                             </h4>
                             <p className="text-sm text-slate-700 font-medium leading-relaxed italic">
                                 "{feedback.idealStory || feedback.recommendations}"
                             </p>
                             <div className="mt-8 pt-8 border-t border-blue-200">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4">Perception Check</p>
                                 <div className="grid grid-cols-3 gap-2 text-center">
                                     <div className="bg-white p-3 rounded-xl shadow-sm">
                                         <span className="block text-[8px] font-bold text-slate-400 uppercase">Age</span>
                                         <span className="font-black text-slate-800">{feedback.perception?.heroAge || "N/A"}</span>
                                     </div>
                                     <div className="bg-white p-3 rounded-xl shadow-sm">
                                         <span className="block text-[8px] font-bold text-slate-400 uppercase">Sex</span>
                                         <span className="font-black text-slate-800">{feedback.perception?.heroSex || "N/A"}</span>
                                     </div>
                                     <div className="bg-white p-3 rounded-xl shadow-sm">
                                         <span className="block text-[8px] font-bold text-slate-400 uppercase">Mood</span>
                                         <span className="font-black text-slate-800">{feedback.perception?.heroMood || "N/A"}</span>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     </div>
                 )}

                 {/* Feedback & Exit */}
                 {userId && (
                     <SessionFeedback testType="PPDT" userId={userId} />
                 )}

                 <div className="flex flex-col md:flex-row gap-4 justify-center pt-8">
                     <button onClick={() => window.location.reload()} className="px-12 py-5 bg-white text-slate-900 border-2 border-slate-200 rounded-full font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all">
                         Retry PPDT
                     </button>
                     {!isGuest ? (
                         <button onClick={() => {}} className="px-12 py-5 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl">
                             Save to Dossier
                         </button>
                     ) : (
                         <button onClick={onLoginRedirect} className="px-12 py-5 bg-yellow-400 text-black rounded-full font-black uppercase tracking-widest text-xs hover:bg-yellow-300 transition-all shadow-xl flex items-center gap-2">
                             <LogIn size={16} /> Save Progress (Login)
                         </button>
                     )}
                 </div>
             </div>
         );

      default: return null;
    }
  };

  return renderContent();
};

export default PPDTTest;
