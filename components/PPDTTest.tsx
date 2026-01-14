
import React, { useState, useEffect, useRef } from 'react';
import { Timer, CheckCircle, Upload, Loader2, Volume2, MicOff, ShieldCheck, Target, Image as ImageIcon, FileText, AlertCircle, Eye, BrainCircuit, X, RefreshCw, PenTool, Clock, BookOpen, FastForward, Edit3, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { evaluatePerformance, transcribeHandwrittenStory, generatePPDTStimulus } from '../services/geminiService';
import { getPPDTScenarios } from '../services/supabaseService';
import { SSBLogo } from './Logo';

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

// Added onSave to props
interface PPDTProps {
  onSave?: (result: any) => void;
  isAdmin?: boolean;
}

const PPDTTest: React.FC<PPDTProps> = ({ onSave, isAdmin }) => {
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
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [customStimulus, setCustomStimulus] = useState<string | null>(null);
  const [showScoreHelp, setShowScoreHelp] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isRecordingRef = useRef(false); // Ref to track recording state synchronously

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

  const startTestSequence = async () => {
    initAudio();
    
    if (customStimulus) {
        setCurrentImageUrl(customStimulus);
        setImageDescription("Manual User Upload");
        setStep(PPDTStep.IMAGE);
        setTimeLeft(30);
    } else {
        setStep(PPDTStep.LOADING_IMAGE);
        try {
          // New Logic: Fetch from Supabase DB first
          const dbImages = await getPPDTScenarios();
          
          if (dbImages && dbImages.length > 0) {
            // Pick a random image from the database
            const randomImage = dbImages[Math.floor(Math.random() * dbImages.length)];
            setCurrentImageUrl(randomImage.image_url);
            setImageDescription(randomImage.description || "Database Scenario");
          } else {
            // Fallback to AI generation if DB is empty
            const scenarios = [
              "A group of people discussing something near a damaged vehicle on a road.",
              "A person helping another climb a steep ledge in a village.",
              "People standing near a building with smoke coming out of windows.",
              "A person in military uniform talking to a group of villagers.",
              "A scene with several people gathered around a well in a rural area."
            ];
            const selectedScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
            setImageDescription(selectedScenario);
            const aiImage = await generatePPDTStimulus(selectedScenario);
            setCurrentImageUrl(aiImage);
          }

          setStep(PPDTStep.IMAGE);
          setTimeLeft(30); 
        } catch (e) {
          console.error("Image generation failed", e);
          setStep(PPDTStep.IDLE);
        }
    }
  };

  useEffect(() => {
    const isNarrationTimed = step === PPDTStep.NARRATION && isRecording;
    const isTimedPhase = [PPDTStep.IMAGE, PPDTStep.CHARACTER_MARKING, PPDTStep.STORY_WRITING].includes(step);

    if (timeLeft > 0 && (isTimedPhase || isNarrationTimed)) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && !isTranscribing && step !== PPDTStep.IDLE && step !== PPDTStep.FINISHED && step !== PPDTStep.STORY_SUBMITTED && step !== PPDTStep.LOADING_IMAGE && step !== PPDTStep.INSTRUCTIONS && step !== PPDTStep.UPLOAD_GRACE_PERIOD) {
      if (step === PPDTStep.IMAGE) {
        // After 30s Image viewing -> Go to Character Marking (1 min)
        triggerBuzzer();
        setStep(PPDTStep.CHARACTER_MARKING);
        setTimeLeft(60);
      } else if (step === PPDTStep.CHARACTER_MARKING) {
        // After 1 min Character Marking -> Go to Story Writing (4 mins)
        triggerBuzzer();
        setStep(PPDTStep.STORY_WRITING);
        setTimeLeft(240);
      } else if (step === PPDTStep.STORY_WRITING) {
        // After 4 mins Story Writing -> Play Buzzer and allow upload
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
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

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
        // Handle "no-speech" gracefully - it just means silence was detected
        if (event.error === 'no-speech') {
          console.warn("Mic: No speech detected (transient)");
          return;
        }
        
        if (event.error === 'aborted') return;

        console.error("Speech Recognition Error:", event.error);
        setTranscriptionError(`Mic Error: ${event.error}`);
        
        // Only stop strictly if permission denied or service not allowed
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsRecording(false);
          isRecordingRef.current = false;
        }
      };

      recognition.onend = () => {
        // Auto-restart if we are still supposed to be recording
        // This handles the case where "no-speech" or network glitches stop the service
        if (isRecordingRef.current) {
          try {
             recognition.start();
             console.log("Mic: Auto-restarted");
          } catch(e) {
             // Ignore if already started
          }
        }
      };

      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition", e);
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  const stopNarration = () => {
    // 1. Clear intention to record
    isRecordingRef.current = false;
    setIsRecording(false);

    // 2. Stop service
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // 3. Proceed
    finishTest();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        setUploadedImageBase64(base64Data);
        // This transcription call now also extracts character box info in the backend
        const text = await transcribeHandwrittenStory(base64Data, file.type);
        if (text) setStory(text);
        setIsTranscribing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsTranscribing(false);
    }
  };

  const finishTest = async () => {
    setStep(PPDTStep.FINISHED);
    setIsLoading(true);
    try {
      // Convert currentImageUrl to Base64 to send to AI for comparison
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
                      reader.onloadend = () => {
                          const result = reader.result as string;
                          resolve(result.split(',')[1]);
                      };
                      reader.readAsDataURL(blob);
                  });
              } catch (err) {
                  console.warn("Failed to fetch/convert stimulus image for AI context:", err);
              }
          }
      }

      // Pass the uploaded image data directly for character detection from the box
      // AND Pass the stimulus image so AI can see what the candidate saw
      const result = await evaluatePerformance('PPDT Screening Board (Stage-1)', { 
        story, 
        narration: narrationText,
        visualStimulusProvided: imageDescription,
        uploadedStoryImage: uploadedImageBase64,
        stimulusImage: stimulusBase64 
      });
      setFeedback(result);
      
      // Automatically save the result AND the original uploaded image for history
      if (onSave) onSave({ ...result, uploadedStoryImage: uploadedImageBase64 });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case PPDTStep.IDLE:
        return (
          <div className="max-w-3xl mx-auto text-center py-24 md:py-32 space-y-8 md:space-y-12 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-900 text-yellow-400 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3 border-8 border-slate-50 ring-4 ring-slate-100">
              <SSBLogo className="w-12 h-12 md:w-16 md:h-16" />
            </div>
            
            <div className="space-y-4">
               <h3 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter">PPDT Simulation</h3>
               <p className="text-slate-500 text-lg md:text-2xl font-medium italic max-w-lg mx-auto leading-relaxed">
                 "Your perception defines your reality. Observe, Analyze, and Lead."
               </p>
            </div>

            <div className="pt-8">
              <button 
                onClick={handleShowInstructions}
                className="group relative px-16 md:px-24 py-6 md:py-8 bg-slate-900 text-white rounded-full font-black uppercase tracking-[0.2em] text-sm md:text-base overflow-hidden shadow-2xl hover:shadow-[0_20px_60px_rgba(15,23,42,0.4)] transition-all hover:-translate-y-1 active:translate-y-0"
              >
                <div className="absolute inset-0 bg-white/10 group-hover:translate-x-full transition-transform duration-500 ease-out skew-x-12" />
                <span className="relative flex items-center gap-4">
                  Start Procedure <Target className="w-5 h-5" />
                </span>
              </button>
            </div>
          </div>
        );

      case PPDTStep.INSTRUCTIONS:
        return (
          <div className="max-w-4xl mx-auto py-12 md:py-16 space-y-8 md:space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
             <div className="text-center space-y-4">
               <h3 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter">Testing Protocol</h3>
               <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Stage 1 Screening Procedure</p>
             </div>

             <div className="grid md:grid-cols-2 gap-6">
                {[
                  { time: '30s', title: 'Picture Perception', desc: 'Observe the hazy image carefully.', icon: Eye, color: 'text-blue-600' },
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

             <div className="flex justify-center pt-8">
               <button 
                  onClick={startTestSequence}
                  className="px-16 md:px-24 py-6 md:py-8 bg-blue-600 text-white rounded-full font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:bg-blue-700 transition-all hover:scale-105"
               >
                 Ready to Start
               </button>
             </div>
          </div>
        );

      case PPDTStep.LOADING_IMAGE:
        return (
          <div className="flex flex-col items-center justify-center py-20 md:py-32 space-y-8">
             <div className="relative">
                <div className="w-20 h-20 md:w-24 md:h-24 border-8 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
                <ImageIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-slate-400" />
             </div>
             <div className="text-center">
               <p className="text-slate-900 font-black uppercase tracking-[0.4em] text-sm mb-2">Retrieving Stimulus</p>
               <p className="text-slate-400 text-xs font-bold italic">Loading standard board image...</p>
             </div>
          </div>
        );

      case PPDTStep.IMAGE:
        return (
          <div className="flex flex-col items-center animate-in fade-in duration-1000 h-full justify-center">
            <div className="flex items-center gap-4 mb-6">
               <Eye className="text-blue-600 animate-pulse" size={24} />
               <p className="text-blue-600 font-black uppercase tracking-[0.2em] text-xs">Observe Carefully</p>
            </div>
            <div className="relative mb-8 md:mb-10 overflow-hidden rounded-[2rem] md:rounded-[4rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] border-[8px] md:border-[12px] border-white ring-1 ring-slate-200">
              <img 
                src={currentImageUrl} 
                alt="PPDT hazy scenario" 
                className="max-h-[60vh] md:max-h-[70vh] w-auto object-cover opacity-90 grayscale contrast-[1.4] brightness-110 blur-[1px]"
              />
              <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/20">
                 <p className="text-white font-mono font-black text-xl">{timeLeft}s</p>
              </div>
            </div>
          </div>
        );
      
      case PPDTStep.CHARACTER_MARKING:
        return (
          <div className="flex flex-col items-center justify-center py-24 md:py-32 space-y-12 animate-in fade-in zoom-in duration-300">
             <div className="w-32 h-32 md:w-40 md:h-40 bg-purple-50 rounded-full flex items-center justify-center border-[8px] border-purple-100 shadow-2xl relative">
                <PenTool className="w-12 h-12 md:w-16 md:h-16 text-purple-600" />
                <div className="absolute -top-4 -right-4 bg-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-black text-xs border-4 border-white shadow-lg">
                   {timeLeft}s
                </div>
             </div>
             <div className="text-center max-w-lg space-y-4">
                <h3 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter">Mark Characters</h3>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 text-left space-y-2">
                   <p className="text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-500" /> Mark Position in Box</p>
                   <p className="text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-500" /> Write Age, Sex, Mood</p>
                   <p className="text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-500" /> Circle the Hero</p>
                   <p className="text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-500" /> Write Action of Story</p>
                </div>
                <p className="text-slate-400 font-medium italic text-sm">"Use your paper. Do not write on screen."</p>
             </div>
          </div>
        );

      case PPDTStep.STORY_WRITING:
      case PPDTStep.UPLOAD_GRACE_PERIOD:
        const isTimeUp = step === PPDTStep.UPLOAD_GRACE_PERIOD;
        return (
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">
             <div className="flex justify-between items-end border-b pb-4 md:pb-6 border-slate-100">
                <div>
                  <h3 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter">Story Writing Phase</h3>
                  <p className="text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-widest mt-2 underline decoration-blue-500 underline-offset-4 decoration-2">Write on paper & Include the Character Box</p>
                </div>
                <div className={`px-6 py-3 md:px-10 md:py-5 rounded-[1.5rem] md:rounded-[2rem] font-mono font-black text-2xl md:text-4xl border-4 transition-all ${timeLeft < 30 || isTimeUp ? 'bg-red-50 border-red-500 text-red-600 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'bg-slate-900 border-slate-800 text-white'}`}>
                   {isTimeUp ? "TIME UP" : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
                </div>
             </div>

             <div className="space-y-6 md:space-y-8">
                {isTimeUp && (
                  <div className="bg-red-600 text-white p-6 rounded-2xl text-center font-black uppercase tracking-[0.2em] shadow-xl animate-pulse flex items-center justify-center gap-3">
                    <AlertCircle size={24} />
                    <span>Pen Down! Scan & Upload Your Answer Sheet Now.</span>
                  </div>
                )}
                
                {/* SPLIT VIEW FOR PPDT EDITING */}
                <div className={`grid ${uploadedImageBase64 ? 'grid-cols-1 lg:grid-cols-2 gap-6' : 'grid-cols-1'}`}>
                   {/* LEFT: Uploaded Image Preview */}
                   {uploadedImageBase64 && (
                      <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-slate-100 bg-slate-50 min-h-[300px] lg:h-auto shadow-inner flex items-center justify-center group">
                         <img src={`data:image/jpeg;base64,${uploadedImageBase64}`} className="w-full h-full object-contain p-4 transition-transform group-hover:scale-105" alt="Uploaded Answer" />
                         <div className="absolute top-4 left-4 bg-slate-900/80 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md flex items-center gap-2">
                            <ImageIcon size={12} /> Original Scan
                         </div>
                      </div>
                   )}

                   {/* RIGHT: Text Area */}
                   <div className="relative flex flex-col h-full">
                      {uploadedImageBase64 && (
                        <div className="flex items-center gap-2 mb-2 text-blue-600 px-2">
                           <Edit3 size={14} />
                           <p className="text-[10px] font-black uppercase tracking-widest">Digital Transcript (Review & Edit)</p>
                        </div>
                      )}
                      <textarea 
                        value={story}
                        onChange={(e) => setStory(e.target.value)}
                        // FIXED: Allow editing if image is uploaded OR if it's not time up yet.
                        disabled={isTranscribing || (isTimeUp && !uploadedImageBase64)}
                        placeholder={uploadedImageBase64 ? "Review and edit the AI transcription here..." : "Your story will appear here automatically once you upload your paper image..."}
                        className={`w-full ${uploadedImageBase64 ? 'h-[400px]' : 'h-[400px] md:h-[500px]'} p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border-2 border-slate-100 focus:border-slate-900 outline-none transition-all text-lg leading-relaxed shadow-xl bg-white font-medium ${isTranscribing || (isTimeUp && !uploadedImageBase64) ? 'opacity-50 blur-[1px]' : ''}`}
                      />
                      {isTranscribing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-xl rounded-[2.5rem] md:rounded-[3.5rem] z-10">
                           <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-slate-900 animate-spin mb-6" />
                           <p className="text-slate-900 font-black uppercase tracking-[0.4em] text-xs">AI OCR: Reading Handwriting...</p>
                        </div>
                      )}
                   </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-between items-center bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-lg">
                  <div className="flex gap-4 w-full md:w-auto">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 md:px-10 py-4 md:py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl">
                      <Upload className="w-4 h-4" /> {uploadedImageBase64 ? 'Re-Upload Image' : 'Upload Paper Image'}
                    </button>
                  </div>
                  <button 
                    onClick={() => { triggerBuzzer(); setStep(PPDTStep.STORY_SUBMITTED); }}
                    disabled={!story.trim() || isTranscribing}
                    className="w-full md:w-auto px-12 md:px-16 py-4 md:py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-2xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-30"
                  >
                    Confirm Submission
                  </button>
                </div>
             </div>
          </div>
        );

      case PPDTStep.STORY_SUBMITTED:
        return (
          <div className="max-w-3xl mx-auto text-center py-16 md:py-24 space-y-8 md:space-y-12">
             <div className="w-20 h-20 md:w-28 md:h-28 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-inner border-2 border-green-100 animate-bounce">
                <CheckCircle className="w-10 h-10 md:w-14 md:h-14" />
             </div>
             <h3 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter">Story Logged</h3>
             <p className="text-slate-500 font-medium text-lg md:text-xl leading-relaxed italic px-4 md:px-12">
               "Gentleman, you have finished your writing. Prepare for individual narration. Keep your voice firm and head high."
             </p>
             <button 
                onClick={() => { setStep(PPDTStep.NARRATION); setTimeLeft(60); }}
                className="px-16 md:px-20 py-5 md:py-6 bg-blue-600 text-white rounded-full font-black uppercase tracking-widest text-xs md:text-sm hover:bg-blue-700 transition-all shadow-[0_20px_40px_rgba(37,99,235,0.3)] hover:-translate-y-1"
             >
                Begin Narration (1 Min)
             </button>
          </div>
        );

      case PPDTStep.NARRATION:
        return (
          <div className="max-w-4xl mx-auto text-center py-8 md:py-12 space-y-8 md:space-y-12">
            <div className={`relative w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center mx-auto transition-all duration-700 border-8 ${isRecording ? 'bg-red-50 border-red-500 scale-110 shadow-[0_0_80px_rgba(239,68,68,0.4)] ring-8 ring-red-500/10' : 'bg-slate-50 border-slate-200 shadow-inner'}`}>
              {isRecording ? <Volume2 className="w-12 h-12 md:w-20 md:h-20 text-red-600 animate-pulse" /> : <MicOff className="w-12 h-12 md:w-20 md:h-20 text-slate-300" />}
            </div>
            
            <div className={`text-7xl md:text-9xl font-mono font-black tabular-nums transition-colors duration-500 ${timeLeft < 10 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
               {timeLeft}s
            </div>

            <div className="bg-slate-50 p-8 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border border-slate-200 min-h-[150px] md:min-h-[200px] flex items-center justify-center italic text-slate-700 text-lg md:text-xl shadow-inner overflow-hidden">
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

            <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-8">
              {!isRecording ? (
                <button 
                  onClick={startNarration}
                  className="px-16 md:px-20 py-6 md:py-7 bg-red-600 text-white rounded-full font-black uppercase tracking-widest text-xs md:text-sm hover:bg-red-700 shadow-2xl transition-all"
                >
                  Confirm & Start Speak
                </button>
              ) : (
                <button 
                  onClick={stopNarration}
                  className="px-16 md:px-20 py-6 md:py-7 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs md:text-sm hover:bg-black shadow-2xl transition-all"
                >
                  Conclude Session
                </button>
              )}
            </div>
          </div>
        );

      case PPDTStep.FINISHED:
        if (isLoading) {
          return (
            <div className="flex flex-col items-center justify-center py-24 md:py-40 space-y-8 md:space-y-12">
              <div className="relative">
                <Loader2 className="w-16 h-16 md:w-24 md:h-24 text-slate-900 animate-spin" />
                <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 text-blue-500" />
              </div>
              <p className="text-slate-900 font-black uppercase tracking-[0.5em] text-xs md:text-sm">Psychologist Assessment in Progress...</p>
            </div>
          );
        }
        return (
          <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="bg-slate-950 p-8 md:p-16 rounded-[3rem] md:rounded-[4rem] text-white relative overflow-hidden shadow-2xl">
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12 md:gap-16">
                  <div className="text-center md:text-left space-y-6">
                     <span className="bg-yellow-400 text-black px-6 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] shadow-lg">Stage 1 Verdict</span>
                     <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">The Board's <br/><span className="text-yellow-400">Verdict</span></h2>
                     <p className="text-slate-400 font-medium max-w-lg leading-relaxed text-sm md:text-lg italic opacity-80">"{feedback?.recommendations}"</p>
                  </div>
                  <div className="flex flex-col items-center bg-white/5 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/10 backdrop-blur-3xl shadow-2xl">
                     <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">Board Score</span>
                     <div className="text-7xl md:text-9xl font-black text-yellow-400">{feedback?.score}</div>
                     
                     <button 
                        onClick={() => setShowScoreHelp(!showScoreHelp)}
                        className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white transition-colors"
                      >
                         <HelpCircle size={14} /> Understand Score {showScoreHelp ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                      </button>
                  </div>
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

            {/* Granular PPDT Feedback Section */}
            {feedback?.perception && (
              <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                 <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border-2 border-slate-50 shadow-xl space-y-6">
                   <h4 className="font-black text-xs uppercase tracking-[0.2em] text-purple-600 flex items-center gap-3"><Eye className="w-5 h-5" /> Perception</h4>
                   <div className="space-y-4 text-sm font-bold text-slate-700">
                      <div className="flex justify-between border-b border-slate-100 pb-2"><span>Hero Age:</span> <span className="text-slate-900">{feedback.perception.heroAge}</span></div>
                      <div className="flex justify-between border-b border-slate-100 pb-2"><span>Hero Sex:</span> <span className="text-slate-900">{feedback.perception.heroSex}</span></div>
                      <div className="flex justify-between border-b border-slate-100 pb-2"><span>Hero Mood:</span> <span className="text-slate-900">{feedback.perception.heroMood}</span></div>
                      <div className="pt-2"><span className="text-slate-400 text-xs block mb-1">Theme</span> <span className="text-slate-900">{feedback.perception.mainTheme}</span></div>
                   </div>
                 </div>
                 
                 <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border-2 border-slate-50 shadow-xl space-y-6 md:col-span-2">
                   <h4 className="font-black text-xs uppercase tracking-[0.2em] text-blue-600 flex items-center gap-3"><BrainCircuit className="w-5 h-5" /> Story Dynamics</h4>
                   <div className="grid md:grid-cols-2 gap-8 text-sm font-medium text-slate-600">
                     <div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Action</span>
                       <p className="leading-relaxed bg-slate-50 p-4 rounded-2xl">{feedback?.storyAnalysis?.action}</p>
                     </div>
                     <div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Outcome</span>
                       <p className="leading-relaxed bg-slate-50 p-4 rounded-2xl">{feedback?.storyAnalysis?.outcome}</p>
                     </div>
                   </div>
                 </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 md:gap-10">
               <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border-2 border-slate-50 shadow-2xl">
                  <h4 className="font-black text-xs uppercase tracking-[0.3em] text-green-600 mb-8 md:mb-10 flex items-center gap-4"><CheckCircle className="w-6 h-6" /> Key Strengths</h4>
                  <div className="space-y-4 md:space-y-5">
                    {feedback?.strengths.map((s: string, i: number) => (
                      <div key={i} className="flex gap-4 md:gap-5 p-4 md:p-5 bg-green-50 rounded-2xl md:rounded-3xl border border-green-100 text-slate-800 text-sm font-bold">
                        <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-500 shrink-0" /> {s}
                      </div>
                    ))}
                  </div>
               </div>
               <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border-2 border-slate-50 shadow-2xl">
                  <h4 className="font-black text-xs uppercase tracking-[0.3em] text-red-500 mb-8 md:mb-10 flex items-center gap-4"><AlertCircle className="w-6 h-6" /> OLQ Gaps</h4>
                  <div className="space-y-4 md:space-y-5">
                    {feedback?.weaknesses.map((w: string, i: number) => (
                      <div key={i} className="flex gap-4 md:gap-5 p-4 md:p-5 bg-red-50 rounded-2xl md:rounded-3xl border border-red-100 text-slate-800 text-sm font-bold">
                        <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-red-500 shrink-0" /> {w}
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            <button 
              onClick={() => { setStep(PPDTStep.IDLE); setStory(''); setFeedback(null); setNarrationText(''); setUploadedImageBase64(null); setCustomStimulus(null); setShowScoreHelp(false); }}
              className="w-full py-6 md:py-7 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-2xl"
            >
              Report for Next Simulation
            </button>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-[85vh] transition-all duration-500 ease-in-out ${showBuzzer ? 'bg-red-600/20' : 'bg-transparent'}`}>
       <div className="bg-white rounded-[2.5rem] md:rounded-[4.5rem] shadow-2xl border border-slate-100 p-6 md:p-16 min-h-[80vh] relative overflow-hidden ring-1 ring-slate-200/50">
         
         {/* Admin Skip Button */}
         {isAdmin && timeLeft > 0 && (
            <button 
                onClick={() => setTimeLeft(0)}
                className="fixed bottom-6 right-6 z-[100] bg-red-600 text-white pl-4 pr-6 py-3 rounded-full font-black text-[10px] uppercase shadow-2xl hover:bg-red-700 transition-all flex items-center gap-2 border-4 border-white animate-pulse hover:animate-none"
            >
                <FastForward size={14} fill="currentColor" /> Admin Skip
            </button>
         )}

         {showBuzzer && (
            <div className="absolute inset-0 z-[100] border-[12px] md:border-[24px] border-red-600/80 pointer-events-none animate-pulse flex items-center justify-center backdrop-blur-sm">
               <div className="bg-red-600 text-white px-12 md:px-24 py-8 md:py-12 rounded-full font-black text-4xl md:text-7xl shadow-[0_0_100px_rgba(220,38,38,1)] uppercase transform -rotate-12 border-4 md:border-8 border-white">BUZZER</div>
            </div>
         )}
         {renderContent()}
       </div>
    </div>
  );
};

export default PPDTTest;
