import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, PhoneOff, ShieldCheck, FileText, Clock, Disc, SignalHigh, Loader2, Volume2, Info, RefreshCw, Wifi, WifiOff, Zap, AlertCircle, CheckCircle, Brain, Users } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { evaluatePerformance } from '../services/geminiService';
import { PIQData } from '../types';

/** 
 * SSB VIRTUAL INTERVIEW PROTOCOL (v4.3 - Fixes & Resilience)
 * - Fixed: 'session.send is not a function' by using systemInstruction for start/resume prompts.
 * - Fixed: Stale state in callbacks using timeLeftRef.
 * - Fixed: Controls visibility (Sticky bottom bar).
 */

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

interface InterviewProps {
  piqData?: PIQData;
  onSave?: (result: any) => void;
}

const Interview: React.FC<InterviewProps> = ({ piqData, onSave }) => {
  const [sessionMode, setSessionMode] = useState<'DASHBOARD' | 'SESSION' | 'RESULT'>('DASHBOARD');
  // Ref to track session mode synchronously across callbacks to prevent race conditions during termination
  const sessionModeRef = useRef<'DASHBOARD' | 'SESSION' | 'RESULT'>('DASHBOARD');
  
  const [connectionStatus, setConnectionStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING'>('DISCONNECTED');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalAnalysis, setFinalAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 Minutes
  const timeLeftRef = useRef(1800); // Ref to track time for callbacks

  // Sync ref
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);
  
  // Persist transcript across re-renders and re-connects
  const conversationHistoryRef = useRef<string[]>([]); 
  const currentTranscriptBufferRef = useRef<string>("");

  // Refs for stability
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const retryCountRef = useRef(0);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSocketOpenRef = useRef(false);

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (connectionStatus === 'CONNECTED' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && sessionMode === 'SESSION') {
      endSession();
    }
    return () => clearInterval(interval);
  }, [connectionStatus, timeLeft, sessionMode]);

  const cleanupAudio = useCallback(async () => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    isSocketOpenRef.current = false;
    
    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch(e) {}
      scriptProcessorRef.current = null;
    }
    
    if (inputAudioContextRef.current) {
      try { await inputAudioContextRef.current.close(); } catch(e) {}
      inputAudioContextRef.current = null;
    }
    
    if (outputAudioContextRef.current) {
      try { await outputAudioContextRef.current.close(); } catch(e) {}
      outputAudioContextRef.current = null;
    }
    
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const cleanupSession = useCallback(async () => {
     await cleanupAudio();
     if (sessionPromiseRef.current) {
       const p = sessionPromiseRef.current;
       sessionPromiseRef.current = null;
       try { (await p).close(); } catch(e) {}
     }
  }, [cleanupAudio]);

  const startBoardSession = async (isRetry = false) => {
    if (!isRetry) {
      setSessionMode('SESSION');
      sessionModeRef.current = 'SESSION';
      retryCountRef.current = 0;
      conversationHistoryRef.current = []; // Only clear history on fresh start
    }
    
    setConnectionStatus(isRetry ? 'RECONNECTING' : 'CONNECTING');
    setError(null);
    await cleanupAudio(); 
    await cleanupSession(); 

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      streamRef.current = stream;
      
      // Fixed: Initialize GoogleGenAI with the recommended pattern using process.env.API_KEY directly
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const resumeAudio = async () => {
        if (inputAudioContextRef.current?.state === 'suspended') await inputAudioContextRef.current.resume();
        if (outputAudioContextRef.current?.state === 'suspended') await outputAudioContextRef.current.resume();
      };
      await resumeAudio();

      // Dynamic System Instruction Generation
      const baseInstruction = `You are Col. Arjun Singh, President of 1 AFSB.
          CONTEXT: A rigorous, formal 30-minute Personal Interview.
          PIQ DATA: ${JSON.stringify(piqData)}.
          
          *** CRITICAL PROTOCOL: NETWORK RESILIENCE ***
          1. This is a practice session over a potentially unstable network.
          2. If the prompt indicates a RESUME, DO NOT RESTART. Pick up from context.
          
          STRATEGY:
          - Deep Probe: If answers are short, ask "Why?", "How?", "Tell me more".
          - Rapid Fire: Ask multiple questions in one go.
          - Stress: If they fumble, pressure them slightly.

          TONE: Authoritative, Skeptical, Thorough.`;

      let finalInstruction = baseInstruction;
      
      if (isRetry) {
          const recentHistory = conversationHistoryRef.current.slice(-5).join(" | ");
          const elapsedTime = 1800 - timeLeftRef.current;
          const minutesPassed = Math.floor(elapsedTime / 60);
          finalInstruction += `\n\n*** NETWORK RESTORATION MODE ***
          STATUS: We are ${minutesPassed} minutes into the interview.
          LAST KNOWN CONTEXT: "${recentHistory}"
          INSTRUCTION: Briefly acknowledge the drop ("We had a glitch, carry on with..."). Then RESUME probing the last topic immediately. DO NOT RESTART INTRO.`;
      } else {
          finalInstruction += `\n\nINSTRUCTION: START_INTERVIEW. Candidate has just entered. Greet by Chest Number and begin the interview immediately.`;
      }

      const sessionPromise = ai.live.connect({
        // Fixed: Use the specified version 'gemini-2.5-flash-native-audio-preview-12-2025'
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {}, 
          systemInstruction: finalInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
        },
        callbacks: {
          onopen: () => {
            setConnectionStatus('CONNECTED');
            isSocketOpenRef.current = true;
            retryCountRef.current = 0; 

            // Input Pipeline
            const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (e) => {
              if (isSocketOpenRef.current && sessionPromiseRef.current) { 
                const inputData = e.inputBuffer.getChannelData(0);
                if (isMicOn) { 
                  const pcmBlob = createBlob(inputData);
                  sessionPromiseRef.current.then(session => {
                    try { 
                      session.sendRealtimeInput({ media: pcmBlob }); 
                    } catch(err) {}
                  });
                }
              }
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Aggregate transcript
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentTranscriptBufferRef.current += text;
            }
            
            // When turn completes, commit to history
            if (message.serverContent?.turnComplete) {
               if (currentTranscriptBufferRef.current.trim()) {
                 conversationHistoryRef.current.push(`Candidate: ${currentTranscriptBufferRef.current}`);
                 currentTranscriptBufferRef.current = "";
               }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAiSpeaking(false);
            }

            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              setIsAiSpeaking(true);
              const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContextRef.current.destination);
              
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsAiSpeaking(false);
              };

              const startTime = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
              source.start(startTime);
              nextStartTimeRef.current = startTime + audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onerror: (e) => {
            console.error("Session Error:", e);
            handleAutoReconnect();
          },
          onclose: (e) => {
             // CRITICAL FIX: Only reconnect if we are still strictly in SESSION mode.
             // We use the Ref to check because state updates can be async and closures might be stale.
             if (sessionModeRef.current === 'SESSION') {
                handleAutoReconnect();
             }
          },
        },
      });

      sessionPromiseRef.current = sessionPromise;
      await sessionPromise;
    } catch (err) {
      console.error("Connection Failed:", err);
      handleAutoReconnect();
    }
  };

  const handleAutoReconnect = () => {
    isSocketOpenRef.current = false;
    // Faster retry for seamless feeling
    if (retryCountRef.current < 10) {
       const delay = 1000 + (retryCountRef.current * 500); 
       retryCountRef.current += 1;
       setConnectionStatus('RECONNECTING');
       setTimeout(() => startBoardSession(true), delay);
    } else {
       setConnectionStatus('DISCONNECTED');
       setError("Network link unstable. Session terminated for security.");
    }
  };

  const endSession = async () => {
    // CRITICAL: Set intention to RESULT mode BEFORE cleanup to prevent auto-reconnect logic
    sessionModeRef.current = 'RESULT';
    setSessionMode('RESULT');
    
    await cleanupSession();
    setIsAnalyzing(true);

    try {
      const fullTranscript = conversationHistoryRef.current.join("\n");
      const results = await evaluatePerformance('Personal Interview Board (30 Min)', { 
        piq: piqData, 
        duration: 1800 - timeLeft, 
        transcript: fullTranscript || "Audio only session.",
        testType: 'Interview' // Ensure service knows this is an Interview
      });
      setFinalAnalysis(results);
      if (onSave) {
        onSave(results);
      }
    } catch (e) {
      console.error(e);
      // Fallback in case of error so user isn't stuck
      setFinalAnalysis({
         score: 0,
         recommendations: "Assessment could not be generated due to network issues. However, your session has been logged.",
         strengths: ["Determination"],
         weaknesses: ["Technical Interruption"],
         factorAnalysis: {
            factor1_planning: "N/A",
            factor2_social: "N/A",
            factor3_effectiveness: "N/A",
            factor4_dynamic: "N/A"
         }
      });
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  if (sessionMode === 'DASHBOARD') {
    return (
      <div className="max-w-4xl mx-auto py-10 animate-in fade-in duration-700">
        <div className="bg-slate-900 rounded-[4.5rem] p-16 border-4 border-slate-800 shadow-2xl text-center relative overflow-hidden">
           <div className="relative z-10 space-y-10">
              <div className="w-24 h-24 bg-blue-600/20 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20">
                 <Mic className="text-blue-400 w-12 h-12" />
              </div>
              <h1 className="text-6xl font-black text-white uppercase tracking-tighter">IO <span className="text-blue-500">Interview</span></h1>
              <div className="flex justify-center gap-4">
                 <span className="px-4 py-1.5 bg-blue-500/20 text-blue-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/30 flex items-center gap-2">
                   <Clock size={12} /> 30 Minutes
                 </span>
                 <span className="px-4 py-1.5 bg-green-500/20 text-green-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/30 flex items-center gap-2">
                   <ShieldCheck size={12} /> Live Assessment
                 </span>
              </div>
              <p className="text-slate-400 text-lg font-medium italic max-w-xl mx-auto leading-relaxed opacity-80">
                "Gentleman, this is a comprehensive 30-minute evaluation. We will discuss your PIQ, Education, and General Awareness. Ensure you are in a quiet room."
              </p>
              <button 
                onClick={() => startBoardSession(false)} 
                className="px-16 py-7 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black uppercase tracking-widest text-xs shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                Enter Interview Room
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4 space-y-6 pb-40">
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between text-red-600 font-black text-xs animate-in slide-in-from-top duration-300 shadow-lg">
           <div className="flex items-center gap-3">
             <AlertCircle size={16} /> {error}
           </div>
           <button onClick={() => startBoardSession(false)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors">
             <RefreshCw size={12} /> Restart Session
           </button>
        </div>
      )}

      {(connectionStatus === 'CONNECTING' || connectionStatus === 'RECONNECTING') && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center space-y-8 animate-in fade-in">
           <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
           <p className="text-white font-black uppercase tracking-[0.4em] text-sm">
             {connectionStatus === 'RECONNECTING' ? 'Link Interrupted. Resuming Protocol...' : 'Establishing Uplink...'}
           </p>
           {connectionStatus === 'RECONNECTING' && <p className="text-slate-400 text-xs">Preserving Context. Standby...</p>}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* TIMER & SIGNAL */}
        <div className="md:col-span-4 bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center justify-between px-8 relative overflow-hidden">
           {/* Timer hidden for candidate realism */}
           <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-slate-900">
                <ShieldCheck size={24} />
              </div>
              <div>
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Session Mode</p>
                 <p className="text-xl font-black text-slate-900 uppercase tracking-tight">Active Assessment</p>
              </div>
           </div>
           <div className="flex flex-col items-end gap-1">
             {connectionStatus === 'CONNECTED' ? (
               <Wifi className="text-green-500" size={20} />
             ) : (
               <WifiOff className="text-red-500 animate-pulse" size={20} />
             )}
             <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
               {connectionStatus === 'CONNECTED' ? 'Signal Stable' : 'Weak Signal'}
             </span>
           </div>
        </div>

        {/* STATUS BAR */}
        <div className="md:col-span-8 bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center justify-between px-10">
           <div className="flex flex-col flex-1">
              <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest mb-2">Board Status</p>
              <div className="flex items-center gap-2 font-black text-[10px]">
                 {isAiSpeaking ? (
                   <span className="text-blue-600 flex items-center gap-2"><Volume2 size={14} className="animate-pulse" /> IO Speaking...</span>
                 ) : (
                   <span className="text-green-600 flex items-center gap-2"><Mic size={14} /> Listening...</span>
                 )}
              </div>
           </div>
           <p className="ml-8 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">Chest No: {piqData?.chestNo}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-[55vh]">
        {/* AVATAR */}
        <div className="xl:col-span-8 bg-slate-950 rounded-[4rem] border-4 border-slate-900 relative overflow-hidden flex flex-col items-center justify-center shadow-2xl">
           <div className={`w-64 h-64 lg:w-[400px] lg:h-[400px] rounded-full border-2 border-white/5 bg-slate-900 flex items-center justify-center relative z-10 transition-all duration-300 ${isAiSpeaking ? 'scale-105 border-blue-500/30 shadow-[0_0_100px_rgba(59,130,246,0.2)]' : ''}`}>
              <Disc size={80} className={`text-blue-500/30 transition-all duration-1000 ${isAiSpeaking ? 'animate-spin opacity-100' : 'opacity-50'}`} style={{ animationDuration: '4s' }} />
              <div className="absolute inset-0 flex items-center justify-center opacity-40">
                 <SignalHigh size={120} className={`text-white/10 ${isAiSpeaking ? 'animate-pulse' : ''}`} />
              </div>
              <div className={`absolute inset-0 rounded-full border-[4px] border-transparent border-t-blue-500/20 transition-all duration-1000 ${isAiSpeaking ? 'animate-spin' : ''}`} style={{ animationDuration: '2s' }} />
           </div>
           <div className="mt-10 text-center relative z-20">
             <h3 className="text-white text-4xl font-black uppercase tracking-tighter">Col. Arjun Singh</h3>
             <p className="text-blue-500 font-black uppercase tracking-[0.4em] text-[10px] mt-2">President, 1 AFSB</p>
           </div>
           
           {/* Waveform Background Effect */}
           {isAiSpeaking && (
             <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-blue-900/20 to-transparent flex items-end justify-center gap-1">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="w-2 bg-blue-500/20 rounded-t-full animate-bounce" style={{ height: `${Math.random() * 100}%`, animationDuration: `${0.5 + Math.random()}s` }} />
                ))}
             </div>
           )}
        </div>

        {/* SIDEBAR INFO */}
        <div className="xl:col-span-4 flex flex-col gap-6">
           <div className="flex-1 bg-white rounded-[3.5rem] p-10 flex flex-col items-center justify-center text-center space-y-8 shadow-xl border-2 border-slate-50">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600"><FileText size={32} /></div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Candidate</p>
                <h4 className="text-slate-900 font-black text-xl uppercase tracking-widest">{piqData?.name}</h4>
                <div className="flex justify-center gap-2">
                   <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-bold text-slate-500 uppercase">{piqData?.selectionBoard}</span>
                </div>
              </div>
           </div>
           <div className="p-8 bg-slate-900 rounded-[3rem] border border-slate-800 text-white relative overflow-hidden">
             <div className="flex items-center gap-3 mb-4 relative z-10">
                <Info size={16} className="text-yellow-400" />
                <p className="text-[9px] font-black uppercase tracking-widest">Protocol</p>
             </div>
             <p className="text-xs text-slate-400 italic font-medium leading-relaxed relative z-10">
               "Answer clusters of questions (Rapid Fire) sequentially. If the IO interrupts, stop immediately and listen."
             </p>
             <Zap className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5 rotate-12" />
           </div>
        </div>
      </div>

      {/* CONTROLS - Fixed Bottom Bar */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40">
        <div className="flex justify-center items-center gap-6 bg-white/80 backdrop-blur-xl p-4 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/50 ring-1 ring-slate-200">
           <button 
             onClick={() => setIsMicOn(!isMicOn)} 
             className={`w-16 h-16 rounded-full flex items-center justify-center transition-all border-2 ${isMicOn ? 'bg-slate-900 border-slate-900 text-white hover:scale-110 shadow-lg' : 'bg-red-50 border-red-500 text-red-500 hover:bg-red-100'}`}
             title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
           >
             {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
           </button>
           <div className="h-10 w-[1px] bg-slate-300"></div>
           <button 
             onClick={endSession} 
             className="px-8 py-4 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 font-black rounded-full flex items-center gap-3 transition-all uppercase tracking-widest text-[10px] border border-red-100 hover:shadow-lg hover:border-red-600"
           >
             <PhoneOff size={18} /> Terminate
           </button>
        </div>
      </div>

      {/* ANALYSIS LOADER */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 flex flex-col items-center justify-center space-y-10 animate-in fade-in">
           <Loader2 className="w-40 h-40 text-blue-600 animate-spin" />
           <p className="text-white font-black uppercase tracking-[1em] text-sm">Generating Board Report...</p>
        </div>
      )}

      {/* RESULT MODAL */}
      {finalAnalysis && !isAnalyzing && (
        <div className="fixed inset-0 z-[200] bg-white overflow-y-auto p-12 animate-in zoom-in">
           <div className="max-w-6xl mx-auto space-y-16 py-20">
              <div className="flex flex-col md:flex-row justify-between items-end border-b pb-16 border-slate-100">
                 <div className="space-y-6">
                    <span className="bg-blue-600 text-white px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">Stage 2 Result</span>
                    <h2 className="text-8xl font-black text-slate-900 uppercase tracking-tighter leading-none">The <span className="text-blue-600">Verdict</span></h2>
                 </div>
                 <div className="bg-slate-50 p-12 rounded-[4rem] border-2 border-slate-100 text-center shadow-inner">
                    <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">Board Grade</p>
                    <div className="text-[10rem] font-black text-slate-900 leading-none">{finalAnalysis.score}</div>
                 </div>
              </div>
              
              <div className="bg-slate-50 p-16 rounded-[4rem] border-2 border-white shadow-xl space-y-10">
                 <p className="text-slate-600 font-medium italic text-2xl leading-relaxed">"{finalAnalysis.recommendations}"</p>
                 
                 {finalAnalysis.factorAnalysis && (
                   <div className="grid md:grid-cols-2 gap-8 mb-8">
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2 text-blue-600">
                          <Brain size={18} />
                          <h5 className="font-black uppercase text-xs tracking-widest">Factor I: Planning</h5>
                        </div>
                        <p className="text-sm font-medium text-slate-600">{finalAnalysis.factorAnalysis.factor1_planning}</p>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2 text-purple-600">
                          <Users size={18} />
                          <h5 className="font-black uppercase text-xs tracking-widest">Factor II: Social</h5>
                        </div>
                        <p className="text-sm font-medium text-slate-600">{finalAnalysis.factorAnalysis.factor2_social}</p>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2 text-green-600">
                          <Zap size={18} />
                          <h5 className="font-black uppercase text-xs tracking-widest">Factor III: Effectiveness</h5>
                        </div>
                        <p className="text-sm font-medium text-slate-600">{finalAnalysis.factorAnalysis.factor3_effectiveness}</p>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2 text-red-600">
                          <ShieldCheck size={18} />
                          <h5 className="font-black uppercase text-xs tracking-widest">Factor IV: Dynamic</h5>
                        </div>
                        <p className="text-sm font-medium text-slate-600">{finalAnalysis.factorAnalysis.factor4_dynamic}</p>
                      </div>
                   </div>
                 )}

                 <div className="grid md:grid-cols-2 gap-10">
                    <div className="p-10 bg-blue-50 rounded-3xl border border-blue-100">
                       <p className="text-blue-600 font-black uppercase text-[10px] tracking-[0.5em] mb-8 border-b pb-4 border-blue-200">Key Strengths</p>
                       <ul className="space-y-4 text-slate-700 text-sm font-bold">
                          {finalAnalysis.strengths?.map((s:any, i:any) => <li key={i} className="flex gap-4"><CheckCircle className="text-green-500 shrink-0" size={18} /> {s}</li>)}
                       </ul>
                    </div>
                    <div className="p-10 bg-red-50 rounded-3xl border border-red-100">
                       <p className="text-red-600 font-black uppercase text-[10px] tracking-[0.5em] mb-8 border-b pb-4 border-red-200">OLQ Gaps</p>
                       <ul className="space-y-4 text-slate-700 text-sm font-bold">
                          {finalAnalysis.weaknesses?.map((w:any, i:any) => <li key={i} className="flex gap-4"><AlertCircle className="text-red-500 shrink-0" size={18} /> {w}</li>)}
                       </ul>
                    </div>
                 </div>
              </div>
              <button onClick={() => window.location.reload()} className="w-full py-8 bg-slate-900 hover:bg-black text-white rounded-full font-black uppercase tracking-widest text-xs shadow-2xl transition-all">Archive Dossier & Exit</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Interview;