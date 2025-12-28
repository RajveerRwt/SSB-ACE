
import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, CheckCircle, Mic, AlertCircle, Upload, FileText, Loader2, UserPlus, Info, Volume2, MicOff, ShieldCheck, Target, Activity, Image as ImageIcon } from 'lucide-react';
import { evaluatePerformance, transcribeHandwrittenStory, generatePPDTStimulus } from '../services/geminiService';

enum PPDTStep {
  IDLE,
  LOADING_IMAGE,
  IMAGE,
  STORY_WRITING,
  STORY_SUBMITTED,
  NARRATION,
  FINISHED
}

const PPDTTest: React.FC = () => {
  const [step, setStep] = useState<PPDTStep>(PPDTStep.IDLE);
  const [timeLeft, setTimeLeft] = useState(0);
  const [story, setStory] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [narrationText, setNarrationText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showBuzzer, setShowBuzzer] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  const [charDetails, setCharDetails] = useState({ age: '', gender: 'Male', mood: 'Positive' });
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

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

  const startTest = async () => {
    initAudio();
    setStep(PPDTStep.LOADING_IMAGE);
    try {
      const aiImage = await generatePPDTStimulus();
      setCurrentImageUrl(aiImage);
      setStep(PPDTStep.IMAGE);
      setTimeLeft(30); 
    } catch (e) {
      console.error("Image generation failed", e);
      setStep(PPDTStep.IDLE);
    }
  };

  useEffect(() => {
    if (timeLeft > 0 && [PPDTStep.IMAGE, PPDTStep.STORY_WRITING, PPDTStep.NARRATION].includes(step)) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && !isTranscribing && step !== PPDTStep.IDLE && step !== PPDTStep.FINISHED && step !== PPDTStep.STORY_SUBMITTED && step !== PPDTStep.LOADING_IMAGE) {
      if (step === PPDTStep.IMAGE) {
        setStep(PPDTStep.STORY_WRITING);
        setTimeLeft(240);
      } else if (step === PPDTStep.STORY_WRITING) {
        triggerBuzzer();
        setStep(PPDTStep.STORY_SUBMITTED);
      } else if (step === PPDTStep.NARRATION) {
        triggerBuzzer();
        stopNarration();
      }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, step, isTranscribing]);

  const startNarration = () => {
    initAudio();
    setNarrationText('');
    setTranscriptionError(null);
    setIsRecording(true);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscriptionError("Speech recognition not supported in this browser. Please use Chrome.");
      setIsRecording(false);
      return;
    }
    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-IN';
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) setNarrationText(prev => prev + (prev ? " " : "") + finalTranscript);
      };
      recognitionRef.current.onerror = (event: any) => {
        setTranscriptionError(`Mic Error: ${event.error}`);
        setIsRecording(false);
      };
      recognitionRef.current.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  const stopNarration = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
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
      const result = await evaluatePerformance('PPDT Screening Board (Stage-1)', { 
        story, 
        narration: narrationText,
        character: charDetails,
        visualStimulus: "AI Generated Hazy PPDT Stimulus"
      });
      setFeedback(result);
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
          <div className="max-w-3xl mx-auto text-center py-12 space-y-8">
            <div className="w-24 h-24 bg-slate-900 text-yellow-400 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 shadow-2xl rotate-6 border-4 border-slate-800">
              <ShieldCheck className="w-12 h-12" />
            </div>
            <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">PPDT Practice Session</h3>
            <div className="bg-slate-50 p-8 rounded-[2rem] text-left border border-slate-200">
               <h4 className="font-black text-xs uppercase tracking-widest text-blue-600 mb-4 flex items-center gap-2 underline underline-offset-4">Board Instructions:</h4>
               <ul className="space-y-3 text-sm text-slate-600 font-medium">
                 <li className="flex gap-2"><span className="text-blue-600 font-black">01.</span> A hazy AI-generated picture will be shown for 30 seconds.</li>
                 <li className="flex gap-2"><span className="text-blue-600 font-black">02.</span> Write a story in 4 minutes (Buzzer will alert at 0:00).</li>
                 <li className="flex gap-2"><span className="text-blue-600 font-black">03.</span> Narrate your story in 60 seconds (Transcribed live for analysis).</li>
               </ul>
            </div>
            <button 
              onClick={startTest}
              className="px-16 py-5 bg-slate-900 text-white rounded-full font-black hover:bg-black transition-all shadow-2xl uppercase tracking-widest text-sm active:scale-95"
            >
              Initialize Board Simulation
            </button>
          </div>
        );

      case PPDTStep.LOADING_IMAGE:
        return (
          <div className="flex flex-col items-center justify-center py-32 space-y-8">
             <div className="relative">
                <div className="w-24 h-24 border-8 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
                <ImageIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-slate-400" />
             </div>
             <div className="text-center">
               <p className="text-slate-900 font-black uppercase tracking-[0.4em] text-sm mb-2">Generating Hazy Stimulus</p>
               <p className="text-slate-400 text-xs font-bold italic">Simulating official SSB hazy perception test scenario...</p>
             </div>
          </div>
        );

      case PPDTStep.IMAGE:
        return (
          <div className="flex flex-col items-center animate-in fade-in duration-1000">
            <div className="relative mb-10 overflow-hidden rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] border-[12px] border-white ring-1 ring-slate-200">
              <img 
                src={currentImageUrl} 
                alt="PPDT hazy scenario" 
                className="max-h-[70vh] w-auto object-cover opacity-90 grayscale"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-12">
                 <div className="bg-white/10 backdrop-blur-3xl px-12 py-5 rounded-full text-white font-black text-4xl flex items-center gap-6 border border-white/20 shadow-2xl">
                   <Timer className="w-10 h-10 text-yellow-400 animate-pulse" /> {timeLeft}s
                 </div>
              </div>
            </div>
            <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-xs">Perceive carefully • Identify characters, mood, and age</p>
          </div>
        );

      case PPDTStep.STORY_WRITING:
        return (
          <div className="max-w-6xl mx-auto space-y-10">
             <div className="flex justify-between items-end border-b pb-6 border-slate-100">
                <div>
                  <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Phase 2: Writing</h3>
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">Buzzer active at 0:00</p>
                </div>
                <div className={`px-10 py-5 rounded-[2rem] font-mono font-black text-4xl border-4 transition-all ${timeLeft < 30 ? 'bg-red-50 border-red-500 text-red-600 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'bg-slate-900 border-slate-800 text-white'}`}>
                   {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
             </div>

             <div className="grid lg:grid-cols-4 gap-10">
                <div className="lg:col-span-1">
                   <div className="bg-white p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-xl space-y-8 sticky top-24">
                      <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b pb-4"><UserPlus className="w-4 h-4"/> Hero Profile</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Age</label>
                          <input type="number" value={charDetails.age} onChange={e=>setCharDetails({...charDetails, age: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm outline-none font-bold"/>
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Gender</label>
                          <select value={charDetails.gender} onChange={e=>setCharDetails({...charDetails, gender: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold">
                            <option>Male</option><option>Female</option><option>Neutral</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Mood</label>
                          <select value={charDetails.mood} onChange={e=>setCharDetails({...charDetails, mood: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold">
                            <option>Positive</option><option>Neutral</option><option>Negative</option>
                          </select>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="lg:col-span-3 space-y-8">
                   <div className="relative">
                     <textarea 
                       value={story}
                       onChange={(e) => setStory(e.target.value)}
                       disabled={isTranscribing}
                       placeholder="Background -> Action -> Likely Outcome..."
                       className={`w-full h-[500px] p-12 rounded-[3.5rem] border-2 border-slate-100 focus:border-slate-900 outline-none transition-all text-xl leading-relaxed shadow-2xl bg-slate-50/30 font-medium ${isTranscribing ? 'opacity-20 blur-sm' : ''}`}
                     />
                     {isTranscribing && (
                       <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-xl rounded-[3.5rem]">
                          <Loader2 className="w-16 h-16 text-slate-900 animate-spin mb-6" />
                          <p className="text-slate-900 font-black uppercase tracking-[0.4em] text-xs">AI OCR: Transcribing handwritten story...</p>
                       </div>
                     )}
                   </div>

                   <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-lg">
                     <div className="flex gap-4">
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                       <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-10 py-5 bg-slate-100 text-slate-900 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm">
                         <Upload className="w-4 h-4" /> Upload Paper Story
                       </button>
                     </div>
                     <button 
                       onClick={() => { triggerBuzzer(); setStep(PPDTStep.STORY_SUBMITTED); }}
                       disabled={!story.trim() || isTranscribing}
                       className="px-16 py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-2xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-30"
                     >
                       Submit Story
                     </button>
                   </div>
                </div>
             </div>
          </div>
        );

      case PPDTStep.STORY_SUBMITTED:
        return (
          <div className="max-w-3xl mx-auto text-center py-24 space-y-12">
             <div className="w-28 h-28 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border-2 border-green-100 animate-bounce">
                <CheckCircle className="w-14 h-14" />
             </div>
             <h3 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Story Logged</h3>
             <p className="text-slate-500 font-medium text-xl leading-relaxed italic px-12">
               "Gentleman, you have finished your writing. Prepare for individual narration. Keep your voice firm and head high."
             </p>
             <button 
                onClick={() => { setStep(PPDTStep.NARRATION); setTimeLeft(60); }}
                className="px-20 py-6 bg-blue-600 text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-[0_20px_40px_rgba(37,99,235,0.3)] hover:-translate-y-1"
             >
                Begin Narration
             </button>
          </div>
        );

      case PPDTStep.NARRATION:
        return (
          <div className="max-w-4xl mx-auto text-center py-12 space-y-12">
            <div className={`relative w-48 h-48 rounded-full flex items-center justify-center mx-auto transition-all duration-700 border-8 ${isRecording ? 'bg-red-50 border-red-500 scale-110 shadow-[0_0_80px_rgba(239,68,68,0.4)] ring-8 ring-red-500/10' : 'bg-slate-50 border-slate-200 shadow-inner'}`}>
              {isRecording ? <Volume2 className="w-20 h-20 text-red-600 animate-pulse" /> : <MicOff className="w-20 h-20 text-slate-300" />}
            </div>
            
            <div className={`text-9xl font-mono font-black tabular-nums transition-colors duration-500 ${timeLeft < 10 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
               {timeLeft}s
            </div>

            <div className="bg-slate-50 p-12 rounded-[3.5rem] border border-slate-200 min-h-[200px] flex items-center justify-center italic text-slate-700 text-xl shadow-inner">
               {transcriptionError ? (
                 <span className="text-red-500 font-bold">{transcriptionError}</span>
               ) : (
                 narrationText || <span className="text-slate-300">"Narrate now..."</span>
               )}
            </div>

            <div className="flex justify-center gap-8">
              {!isRecording ? (
                <button 
                  onClick={startNarration}
                  className="px-20 py-7 bg-red-600 text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-red-700 shadow-2xl transition-all"
                >
                  Confirm & Start Speak
                </button>
              ) : (
                <button 
                  onClick={stopNarration}
                  className="px-20 py-7 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-black shadow-2xl transition-all"
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
            <div className="flex flex-col items-center justify-center py-40 space-y-12">
              <div className="relative">
                <Loader2 className="w-24 h-24 text-slate-900 animate-spin" />
                <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-blue-500" />
              </div>
              <p className="text-slate-900 font-black uppercase tracking-[0.5em] text-sm">Psychologist Assessment in Progress...</p>
            </div>
          );
        }
        return (
          <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="bg-slate-950 p-16 rounded-[4rem] text-white relative overflow-hidden shadow-2xl">
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-16">
                  <div className="text-center md:text-left space-y-6">
                     <span className="bg-yellow-400 text-black px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-lg">Stage 1 Verdict</span>
                     <h2 className="text-7xl font-black uppercase tracking-tighter leading-none">The Board's <br/><span className="text-yellow-400">Verdict</span></h2>
                     <p className="text-slate-400 font-medium max-w-lg leading-relaxed text-lg italic opacity-80">"{feedback?.recommendations}"</p>
                  </div>
                  <div className="flex flex-col items-center bg-white/5 p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-3xl shadow-2xl">
                     <span className="text-[11px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">Board Score</span>
                     <div className="text-9xl font-black text-yellow-400">{feedback?.score}</div>
                  </div>
               </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
               <div className="bg-white p-12 rounded-[3.5rem] border-2 border-slate-50 shadow-2xl">
                  <h4 className="font-black text-xs uppercase tracking-[0.3em] text-blue-600 mb-10 flex items-center gap-4"><Target className="w-6 h-6" /> Key Strengths</h4>
                  <div className="space-y-5">
                    {feedback?.strengths.map((s: string, i: number) => (
                      <div key={i} className="flex gap-5 p-5 bg-blue-50 rounded-3xl border border-blue-100 text-slate-800 text-sm font-bold">
                        <CheckCircle className="w-6 h-6 text-blue-500 shrink-0" /> {s}
                      </div>
                    ))}
                  </div>
               </div>
               <div className="bg-white p-12 rounded-[3.5rem] border-2 border-slate-50 shadow-2xl">
                  <h4 className="font-black text-xs uppercase tracking-[0.3em] text-red-500 mb-10 flex items-center gap-4"><AlertCircle className="w-6 h-6" /> OLQ Gaps</h4>
                  <div className="space-y-5">
                    {feedback?.weaknesses.map((w: string, i: number) => (
                      <div key={i} className="flex gap-5 p-5 bg-red-50 rounded-3xl border border-red-100 text-slate-800 text-sm font-bold">
                        <AlertCircle className="w-6 h-6 text-red-500 shrink-0" /> {w}
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            <button 
              onClick={() => { setStep(PPDTStep.IDLE); setStory(''); setFeedback(null); setNarrationText(''); }}
              className="w-full py-7 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-2xl"
            >
              Report for Next Simulation
            </button>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-[85vh] transition-all duration-500 ease-in-out ${showBuzzer ? 'bg-red-600/20' : 'bg-transparent'}`}>
       <div className="bg-white rounded-[4.5rem] shadow-2xl border border-slate-100 p-16 min-h-[80vh] relative overflow-hidden ring-1 ring-slate-200/50">
         {showBuzzer && (
            <div className="absolute inset-0 z-[100] border-[24px] border-red-600/80 pointer-events-none animate-pulse flex items-center justify-center backdrop-blur-sm">
               <div className="bg-red-600 text-white px-24 py-12 rounded-full font-black text-7xl shadow-[0_0_100px_rgba(220,38,38,1)] uppercase transform -rotate-12 border-8 border-white">BUZZER</div>
            </div>
         )}
         {renderContent()}
       </div>
    </div>
  );
};

export default PPDTTest;
