
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, PhoneOff, ShieldCheck, FileText, Clock, Disc, SignalHigh, Loader2, Volume2, Info, RefreshCw, Wifi, WifiOff, Zap, AlertCircle, CheckCircle, Brain, Users, Video, VideoOff, Eye, FastForward, HelpCircle, ChevronDown, ChevronUp, AlertTriangle, Play } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { evaluatePerformance } from '../services/geminiService';
import { PIQData } from '../types';

/** 
 * SSB VIRTUAL INTERVIEW PROTOCOL (v5.3 - Variable Duration & CIQ)
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
  // SAFE DECODING: Use byteOffset to ensure correct memory alignment
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
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

async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

interface InterviewProps {
  piqData?: PIQData;
  onSave?: (result: any) => void | Promise<void>;
  isAdmin?: boolean;
}

const Interview: React.FC<InterviewProps> = ({ piqData, onSave, isAdmin }) => {
  const [sessionMode, setSessionMode] = useState<'DASHBOARD' | 'SESSION' | 'RESULT'>('DASHBOARD');
  // Ref to track session mode synchronously across callbacks to prevent race conditions during termination
  const sessionModeRef = useRef<'DASHBOARD' | 'SESSION' | 'RESULT'>('DASHBOARD');
  
  const [connectionStatus, setConnectionStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING'>('DISCONNECTED');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalAnalysis, setFinalAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(2400); // Default max, actual set in startSession
  const [totalDuration, setTotalDuration] = useState(2400); // To track total time for progress/logic
  const timeLeftRef = useRef(2400); // Ref to track time for callbacks
  const [showScoreHelp, setShowScoreHelp] = useState(false);
  const [showEarlyExitWarning, setShowEarlyExitWarning] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Sync ref
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);
  
  // Persist transcript across re-renders and re-connects
  const conversationHistoryRef = useRef<string[]>([]); 
  const currentTranscriptBufferRef = useRef<string>("");
  const currentAiTranscriptBufferRef = useRef<string>(""); // New Ref for AI speech

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
  const frameIntervalRef = useRef<number | null>(null); // To manage video loop
  const isSocketOpenRef = useRef(false);
  
  // Video Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (connectionStatus === 'CONNECTED' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && sessionMode === 'SESSION') {
      endSession(true); // Force end if time runs out
    }
    return () => clearInterval(interval);
  }, [connectionStatus, timeLeft, sessionMode]);

  const cleanupAudio = useCallback(async () => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    
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
      
      // VARIABLE DURATION LOGIC: Randomize between 30 mins (1800s) and 40 mins (2400s)
      const duration = Math.floor(Math.random() * (2400 - 1800 + 1)) + 1800;
      setTimeLeft(duration);
      setTotalDuration(duration);
      timeLeftRef.current = duration;
    }
    
    setConnectionStatus(isRetry ? 'RECONNECTING' : 'CONNECTING');
    setError(null);
    await cleanupAudio(); 
    await cleanupSession(); 

    try {
      // 1. SETUP AUDIO CONTEXTS IMMEDIATELY (Before Async calls)
      // Input: Try 16k, fallback to default if browser refuses
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      try {
        inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      } catch (e) {
        inputAudioContextRef.current = new AudioContextClass();
      }
      
      // Output: Use system default (Fix for 'No Voice' on mobile/safari)
      outputAudioContextRef.current = new AudioContextClass();

      // Resume immediately to unlock audio on mobile
      await inputAudioContextRef.current.resume();
      await outputAudioContextRef.current.resume();

      // 2. Request Media
      // Request video with specific low-res constraints to save bandwidth but sufficient for AI analysis
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 
        },
        video: {
            width: 320,
            height: 240,
            frameRate: 15
        }
      });
      streamRef.current = stream;
      
      // Connect stream to video element for self-view and capture
      if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Video play failed", e));
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Dynamic System Instruction Generation
      const baseInstruction = `You are Col. Arjun Singh, President of 1 AFSB.
          CONTEXT: A rigorous, formal Personal Interview for the Indian Armed Forces.
          PIQ DATA: ${JSON.stringify(piqData)}.
          
          *** PROTOCOL: AUDIO & VISUAL ***
          1. MODALITY: You can SEE and HEAR the candidate. 
          2. MANDATORY VISUAL CHECK: 
             - At the very beginning, describe one visual detail about the candidate (e.g., "I see you are sitting in a well-lit room," or "Adjust your camera, I can only see your forehead") to confirm you are observing them.
             - Throughout the interview, if the candidate looks down, fidgets, or looks away, VERBALLY reprimand them immediately (e.g., "Look at me when I speak," "Stop shaking"). This is CRITICAL for the final report.
          
          3. GREETING PROTOCOL: 
             - Wait for the candidate to GREET you first (e.g., "Good Morning Sir", "Jai Hind").
             - If they do not greet within the first 10 seconds of the call, reprimand them immediately for lack of officer-like etiquette.

          *** MANDATORY QUESTIONING TECHNIQUES (CIQ & CURRENT AFFAIRS) ***
          4. COMPREHENSIVE INFORMATION QUESTION (CIQ) / SEQUENCE QUESTIONS:
             - You MUST ask at least 2-3 "Sequence Questions" (Rapid Fire).
             - Example: "Tell me about your academic performance starting from 10th to graduation, your favorite subjects, teachers you didn't like and why, who are your best friends, and what games you play." (Ask 4-5 connected questions in one breath).
             - Expect the candidate to answer them sequentially. If they miss a part, interrupt and ask "You forgot about the teachers part."
          
          5. CURRENT AFFAIRS & GENERAL AWARENESS:
             - Test their awareness of National and International events (e.g., India's foreign relations, Defense deals, Geopolitics).
             - Ask for their *opinion* ("What do you think about...", "Justify your stance on..."), not just facts.

          TONE: Authoritative, Skeptical, Thorough.
          STYLE: Use a measured, commanding tone typical of a senior Indian Army Officer. Use Indian English phrasing (e.g., "Gentleman", "What say you?", "Fair enough").`;

      let finalInstruction = baseInstruction;
      
      if (isRetry) {
          const recentHistory = conversationHistoryRef.current.slice(-5).join(" | ");
          const elapsedTime = totalDuration - timeLeftRef.current;
          const minutesPassed = Math.floor(elapsedTime / 60);
          finalInstruction += `\n\n*** NETWORK RESTORATION MODE ***
          STATUS: We are ${minutesPassed} minutes into the interview.
          LAST KNOWN CONTEXT: "${recentHistory}"
          INSTRUCTION: Briefly acknowledge the drop ("We had a glitch, carry on with..."). Then RESUME probing the last topic immediately. DO NOT RESTART INTRO.`;
      } else {
          finalInstruction += `\n\nINSTRUCTION: START_INTERVIEW. Candidate has just entered. Wait for greeting.`;
      }

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO], // Audio Output
          inputAudioTranscription: {}, 
          outputAudioTranscription: {}, // ENABLED: Capture AI Speech for Transcript
          systemInstruction: finalInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }, // Using Charon for deeper, authoritative tone
          },
        },
        callbacks: {
          onopen: () => {
            setConnectionStatus('CONNECTED');
            isSocketOpenRef.current = true;
            retryCountRef.current = 0; 

            // 1. Audio Input Pipeline
            if (inputAudioContextRef.current && streamRef.current) {
              const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
              const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
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
              scriptProcessor.connect(inputAudioContextRef.current.destination);
            }

            // 2. Video Input Pipeline (1 FPS for bandwidth/cost optimization)
            const FRAME_RATE = 1; 
            if (videoRef.current && canvasRef.current) {
                frameIntervalRef.current = window.setInterval(() => {
                    const videoEl = videoRef.current;
                    const canvasEl = canvasRef.current;
                    if (!videoEl || !canvasEl || !isSocketOpenRef.current) return;
                    
                    const ctx = canvasEl.getContext('2d');
                    if (!ctx) return;

                    // Match capture resolution
                    canvasEl.width = videoEl.videoWidth;
                    canvasEl.height = videoEl.videoHeight;
                    
                    // Draw video frame
                    ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
                    
                    // Convert to Blob and Send
                    canvasEl.toBlob(async (blob) => {
                        if (blob && isSocketOpenRef.current && sessionPromiseRef.current) {
                            try {
                                const base64Data = await blobToBase64(blob);
                                sessionPromiseRef.current.then(session => {
                                    session.sendRealtimeInput({
                                        media: { data: base64Data, mimeType: 'image/jpeg' }
                                    });
                                });
                            } catch (e) {
                                console.warn("Frame capture error", e);
                            }
                        }
                    }, 'image/jpeg', 0.6); // 0.6 Quality JPEG
                }, 1000 / FRAME_RATE);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // A. Handle User Input Transcription
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentTranscriptBufferRef.current += text;
            }

            // B. Handle Model (AI) Output Transcription
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentAiTranscriptBufferRef.current += text;
            }
            
            // C. Turn Completion (Commit transcripts to history)
            if (message.serverContent?.turnComplete) {
               // Commit User Buffer
               if (currentTranscriptBufferRef.current.trim()) {
                 conversationHistoryRef.current.push(`Candidate: ${currentTranscriptBufferRef.current}`);
                 currentTranscriptBufferRef.current = "";
               }
               // Commit AI Buffer
               if (currentAiTranscriptBufferRef.current.trim()) {
                 conversationHistoryRef.current.push(`IO: ${currentAiTranscriptBufferRef.current}`);
                 currentAiTranscriptBufferRef.current = "";
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
              // Only set speaking if we have valid audio context
              setIsAiSpeaking(true);
              
              try {
                // Decode 24k output into system rate (e.g. 48k)
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
              } catch (e) {
                console.error("Audio Decode Error:", e);
                setIsAiSpeaking(false);
              }
            }
          },
          onerror: (e) => {
            console.error("Session Error:", e);
            handleAutoReconnect();
          },
          onclose: (e) => {
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
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    
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

  const handleEndCallRequest = () => {
      const durationSeconds = totalDuration - timeLeft;
      // If interview is less than 10 minutes (600 seconds)
      if (durationSeconds < 600) {
          setShowEarlyExitWarning(true);
      } else {
          endSession();
      }
  };

  const endSession = async (force = false) => {
    // CRITICAL: Set intention to RESULT mode BEFORE cleanup to prevent auto-reconnect logic
    sessionModeRef.current = 'RESULT';
    setSessionMode('RESULT');
    setShowEarlyExitWarning(false);
    
    // Flush any pending transcript that wasn't committed by turnComplete
    if (currentTranscriptBufferRef.current.trim()) {
       conversationHistoryRef.current.push(`Candidate (Last words): ${currentTranscriptBufferRef.current}`);
       currentTranscriptBufferRef.current = "";
    }
    // Flush AI pending transcript
    if (currentAiTranscriptBufferRef.current.trim()) {
       conversationHistoryRef.current.push(`IO (Last words): ${currentAiTranscriptBufferRef.current}`);
       currentAiTranscriptBufferRef.current = "";
    }
    
    await cleanupSession();
    setIsAnalyzing(true);

    try {
      const fullTranscript = conversationHistoryRef.current.join("\n");
      const results = await evaluatePerformance('Personal Interview Board (30 Min)', { 
        piq: piqData, 
        duration: totalDuration - timeLeft, 
        transcript: fullTranscript || "No verbal response captured.",
        testType: 'Interview' // Ensure service knows this is an Interview
      });
      setFinalAnalysis(results);
      if (onSave) {
        // Await onSave to ensure data is written to DB/storage before UI allows exit
        await onSave(results);
      }
    } catch (e) {
      console.error(e);
      // Fallback in case of critical failure
      setFinalAnalysis({
         score: 0,
         verdict: "Technical Failure",
         recommendations: "Assessment could not be generated due to network issues or API failure. Your session has been archived.",
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
      <div className="max-w-4xl mx-auto py-6 md:py-10 animate-in fade-in duration-700">
        <div className="bg-slate-900 rounded-[2.5rem] md:rounded-[4.5rem] p-8 md:p-16 border-4 border-slate-800 shadow-2xl text-center relative overflow-hidden">
           <div className="relative z-10 space-y-6 md:space-y-10">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-blue-600/20 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20">
                 <Mic className="text-blue-400 w-8 h-8 md:w-12 md:h-12" />
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter">IO <span className="text-blue-500">Interview</span></h1>
              <div className="flex justify-center gap-4">
                 <span className="px-3 md:px-4 py-1.5 bg-blue-500/20 text-blue-300 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-blue-500/30 flex items-center gap-2">
                   <Clock size={12} /> 30-40 Minutes
                 </span>
                 <span className="px-3 md:px-4 py-1.5 bg-green-500/20 text-green-300 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-green-500/30 flex items-center gap-2">
                   <Video size={12} /> Video Enabled
                 </span>
              </div>
              
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-left max-w-xl mx-auto space-y-3">
                 <h4 className="text-yellow-400 font-black uppercase text-xs tracking-widest flex items-center gap-2"><Info size={14} /> Entry Instructions</h4>
                 <ul className="text-slate-300 text-xs space-y-2 font-medium">
                    <li className="flex gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> Camera Permission Required (IO can see you).</li>
                    <li className="flex gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> Sit in a well-lit room with upright posture.</li>
                    <li className="flex gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> <b>Greeting Mandatory:</b> Wish the Officer (e.g. "Good Morning Sir") immediately upon entering.</li>
                 </ul>
              </div>

              <button 
                onClick={() => startBoardSession(false)} 
                className="px-12 md:px-16 py-5 md:py-7 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black uppercase tracking-widest text-xs shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                Allow Cam/Mic & Enter
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-6 pb-32 md:pb-40">
      {/* Hidden Canvas for Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Admin Skip Button */}
      {isAdmin && sessionMode === 'SESSION' && timeLeft > 0 && (
         <button 
             onClick={() => setTimeLeft(0)}
             className="fixed bottom-6 right-6 z-[100] bg-red-600 text-white pl-4 pr-6 py-3 rounded-full font-black text-[10px] uppercase shadow-2xl hover:bg-red-700 transition-all flex items-center gap-2 border-4 border-white animate-pulse hover:animate-none"
         >
             <FastForward size={14} fill="currentColor" /> Admin: End Session
         </button>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between text-red-600 font-black text-xs animate-in slide-in-from-top duration-300 shadow-lg">
           <div className="flex items-center gap-3">
             <AlertCircle size={16} /> {error}
           </div>
           <button onClick={() => startBoardSession(false)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors">
             <RefreshCw size={12} /> Restart
           </button>
        </div>
      )}

      {(connectionStatus === 'CONNECTING' || connectionStatus === 'RECONNECTING') && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center space-y-8 animate-in fade-in">
           <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
           <p className="text-white font-black uppercase tracking-[0.4em] text-sm">
             {connectionStatus === 'RECONNECTING' ? 'Link Interrupted. Resuming Protocol...' : 'Establishing Secure Uplink...'}
           </p>
           {connectionStatus === 'RECONNECTING' && <p className="text-slate-400 text-xs">Preserving Context. Standby...</p>}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        {/* TIMER & SIGNAL */}
        <div className="md:col-span-4 bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center justify-between px-6 md:px-8 relative overflow-hidden">
           <div className="flex items-center gap-4 md:gap-5">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-white bg-slate-900">
                <ShieldCheck size={20} className="md:w-6 md:h-6" />
              </div>
              <div>
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Session Mode</p>
                 <p className="text-sm md:text-xl font-black text-slate-900 uppercase tracking-tight">Active Assessment</p>
              </div>
           </div>
           <div className="flex flex-col items-end gap-1">
             {connectionStatus === 'CONNECTED' ? (
               <Wifi className="text-green-500" size={18} />
             ) : (
               <WifiOff className="text-red-500 animate-pulse" size={18} />
             )}
             <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
               {connectionStatus === 'CONNECTED' ? 'Stable' : 'Weak'}
             </span>
           </div>
        </div>

        {/* STATUS BAR */}
        <div className="md:col-span-8 bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center justify-between px-6 md:px-10">
           <div className="flex flex-col flex-1">
              <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest mb-1 md:mb-2">Board Status</p>
              <div className="flex items-center gap-2 font-black text-[10px]">
                 {isAiSpeaking ? (
                   <span className="text-blue-600 flex items-center gap-2"><Volume2 size={14} className="animate-pulse" /> IO Speaking...</span>
                 ) : (
                   <span className="text-green-600 flex items-center gap-2"><Eye size={14} /> IO Observing...</span>
                 )}
              </div>
           </div>
           <p className="ml-4 md:ml-8 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 md:px-4 py-2 rounded-xl border border-slate-100">Chest No: {piqData?.chestNo}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8 h-auto md:h-[55vh]">
        {/* AVATAR & SELF VIEW */}
        <div className="xl:col-span-8 bg-slate-950 rounded-[2.5rem] md:rounded-[4rem] border-4 border-slate-900 relative overflow-hidden flex flex-col items-center justify-center shadow-2xl min-h-[400px]">
           {/* Self View (PIP) */}
           <div className="absolute top-6 right-6 w-32 h-24 md:w-48 md:h-36 bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-xl z-30">
              <video 
                 ref={videoRef} 
                 className="w-full h-full object-cover mirror-mode"
                 muted 
                 playsInline
              />
              <div className="absolute bottom-2 left-2 bg-green-600 w-2 h-2 rounded-full animate-pulse shadow-sm"></div>
           </div>

           {/* IO AVATAR - REALISTIC IMAGE REPLACEMENT */}
           <div className={`relative z-10 transition-all duration-300 ${isAiSpeaking ? 'scale-105' : 'scale-100'}`}>
              <div className="relative w-48 h-48 md:w-72 md:h-72 lg:w-[320px] lg:h-[320px] rounded-[2.5rem] overflow-hidden border-4 border-slate-700 shadow-2xl bg-slate-800 flex items-center justify-center">
                  {!imgError ? (
                    <img 
                        src="https://metropolitan-rose-qgghd3t6qu.edgeone.app/io-sikh%20perf.png"
                        onError={() => setImgError(true)}
                        alt="Col. Arjun Singh" 
                        className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-500 opacity-50 p-8 text-center">
                        <Users size={64} className="mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Video Feed</span>
                    </div>
                  )}
                  
                  {/* Realistic Video Call Overlay (Vignette) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                  
                  {/* Speaking Indicator Badge (Realistic) */}
                  {isAiSpeaking && (
                      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-blue-600/90 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg animate-pulse">
                        <Mic size={12} /> Speaking
                      </div>
                  )}
              </div>
              
              {/* Subtle Active Ring */}
              <div className={`absolute -inset-2 rounded-[2.8rem] border-2 border-blue-500/30 transition-all duration-500 ${isAiSpeaking ? 'opacity-100 scale-[1.02]' : 'opacity-0 scale-100'}`} />
           </div>

           <div className="mt-8 md:mt-10 text-center relative z-20">
             <h3 className="text-white text-2xl md:text-4xl font-black uppercase tracking-tighter">Col. Arjun Singh</h3>
             <p className="text-blue-500 font-black uppercase tracking-[0.4em] text-[8px] md:text-[10px] mt-2">President, 1 AFSB</p>
           </div>
           
           {/* Waveform Background Effect - Subtle */}
           {isAiSpeaking && (
             <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-blue-900/10 to-transparent flex items-end justify-center gap-1 opacity-50">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="w-1 md:w-2 bg-blue-500/20 rounded-t-full animate-bounce" style={{ height: `${Math.random() * 60}%`, animationDuration: `${0.5 + Math.random()}s` }} />
                ))}
             </div>
           )}
        </div>

        {/* SIDEBAR INFO */}
        <div className="xl:col-span-4 flex flex-col gap-4 md:gap-6">
           <div className="flex-1 bg-white rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:p-10 flex flex-col items-center justify-center text-center space-y-6 md:space-y-8 shadow-xl border-2 border-slate-50">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600"><FileText size={24} className="md:w-8 md:h-8" /></div>
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Candidate</p>
                <h4 className="text-slate-900 font-black text-lg md:text-xl uppercase tracking-widest truncate max-w-[200px]">{piqData?.name}</h4>
                <div className="flex justify-center gap-2">
                   <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-bold text-slate-500 uppercase">{piqData?.selectionBoard}</span>
                </div>
              </div>
           </div>
           <div className="p-6 md:p-8 bg-slate-900 rounded-[2rem] md:rounded-[3rem] border border-slate-800 text-white relative overflow-hidden">
             <div className="flex items-center gap-3 mb-4 relative z-10">
                <Info size={16} className="text-yellow-400" />
                <p className="text-[9px] font-black uppercase tracking-widest">Protocol</p>
             </div>
             <p className="text-xs text-slate-400 italic font-medium leading-relaxed relative z-10">
               "Maintain professional tone. The IO is analyzing your voice modulation, posture, and facial expressions in real-time."
             </p>
             <Zap className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5 rotate-12" />
           </div>
        </div>
      </div>

      {/* CONTROLS - Fixed Bottom Bar */}
      <div className="fixed bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 z-40 w-full px-4 md:px-0 md:w-auto flex justify-center">
        <div className="flex justify-center items-center gap-4 md:gap-6 bg-white/90 backdrop-blur-xl p-3 md:p-4 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/50 ring-1 ring-slate-200">
           <button 
             onClick={() => setIsMicOn(!isMicOn)} 
             className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all border-2 ${isMicOn ? 'bg-slate-900 border-slate-900 text-white hover:scale-110 shadow-lg' : 'bg-red-50 border-red-500 text-red-500 hover:bg-red-100'}`}
             title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
           >
             {isMicOn ? <Mic size={20} className="md:w-6 md:h-6" /> : <MicOff size={20} className="md:w-6 md:h-6" />}
           </button>
           <div className="h-8 md:h-10 w-[1px] bg-slate-300"></div>
           <button 
             onClick={handleEndCallRequest} 
             className="px-6 md:px-8 py-3 md:py-4 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 font-black rounded-full flex items-center gap-2 md:gap-3 transition-all uppercase tracking-widest text-[9px] md:text-[10px] border border-red-100 hover:shadow-lg hover:border-red-600 whitespace-nowrap"
           >
             <PhoneOff size={16} className="md:w-[18px]" /> End Call
           </button>
        </div>
      </div>

      {/* EARLY EXIT WARNING MODAL */}
      {showEarlyExitWarning && (
        <div className="fixed inset-0 z-[250] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                 <AlertTriangle size={32} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Premature Conclusion</h3>
                 <p className="text-slate-500 text-xs font-medium leading-relaxed mt-2">
                    A standard IO interview lasts 25-30 minutes. Ending now ({Math.floor((totalDuration - timeLeft)/60)} mins) will result in an <b>'Insufficient Data'</b> assessment.
                 </p>
              </div>
              <div className="flex gap-3">
                 <button 
                   onClick={() => setShowEarlyExitWarning(false)} 
                   className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg"
                 >
                    <Play size={12} fill="currentColor" /> Resume
                 </button>
                 <button 
                   onClick={() => endSession(true)} 
                   className="flex-1 py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"
                 >
                    <PhoneOff size={12} /> Abort
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* ANALYSIS LOADER */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 flex flex-col items-center justify-center space-y-8 md:space-y-10 animate-in fade-in">
           <Loader2 className="w-20 h-20 md:w-40 md:h-40 text-blue-600 animate-spin" />
           <p className="text-white font-black uppercase tracking-[1em] text-xs md:text-sm text-center px-4">Generating Board Report...</p>
        </div>
      )}

      {/* RESULT MODAL */}
      {finalAnalysis && !isAnalyzing && (
        <div className="fixed inset-0 z-[200] bg-white overflow-y-auto p-6 md:p-12 animate-in zoom-in">
           <div className="max-w-6xl mx-auto space-y-12 md:space-y-16 py-12 md:py-20">
              <div className="flex flex-col md:flex-row justify-between items-end border-b pb-12 md:pb-16 border-slate-100 gap-8">
                 <div className="space-y-4 md:space-y-6 text-center md:text-left w-full md:w-auto">
                    <span className="bg-blue-600 text-white px-6 md:px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">Stage 2 Result</span>
                    <h2 className="text-6xl md:text-8xl font-black text-slate-900 uppercase tracking-tighter leading-none">The <span className="text-blue-600">Verdict</span></h2>
                 </div>
                 <div className="bg-slate-50 p-8 md:p-12 rounded-[3rem] md:rounded-[4rem] border-2 border-slate-100 text-center shadow-inner w-full md:w-auto flex flex-col items-center">
                    <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">Board Grade</p>
                    <div className="text-8xl md:text-[10rem] font-black text-slate-900 leading-none">{finalAnalysis.score}</div>
                    
                    {/* SCORE EXPLANATION BUTTON */}
                    <button 
                      onClick={() => setShowScoreHelp(!showScoreHelp)}
                      className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors"
                    >
                       <HelpCircle size={14} /> Understand Score {showScoreHelp ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    </button>
                 </div>
              </div>

              {/* SCORE INTERPRETATION GUIDE */}
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
              
              <div className="bg-slate-50 p-6 md:p-16 rounded-[2.5rem] md:rounded-[4rem] border-2 border-white shadow-xl space-y-8 md:space-y-10">
                 <p className="text-slate-600 font-medium italic text-lg md:text-2xl leading-relaxed">"{finalAnalysis.recommendations}"</p>
                 
                 {finalAnalysis.bodyLanguage && (
                     <div className="bg-white p-8 rounded-[2rem] border-l-4 border-yellow-400 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                           <Eye className="text-yellow-500" size={24} />
                           <h4 className="text-lg font-black uppercase tracking-tighter text-slate-900">Visual Observations</h4>
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Posture</p>
                              <p className="text-sm font-bold text-slate-700">{finalAnalysis.bodyLanguage.posture || "No remarks"}</p>
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Eye Contact</p>
                              <p className="text-sm font-bold text-slate-700">{finalAnalysis.bodyLanguage.eyeContact || "No remarks"}</p>
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Demeanor</p>
                              <p className="text-sm font-bold text-slate-700">{finalAnalysis.bodyLanguage.gestures || "No remarks"}</p>
                           </div>
                        </div>
                     </div>
                 )}

                 {finalAnalysis.factorAnalysis && (
                   <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-8">
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

                 <div className="grid md:grid-cols-2 gap-6 md:gap-10">
                    <div className="p-8 md:p-10 bg-blue-50 rounded-3xl border border-blue-100">
                       <p className="text-blue-600 font-black uppercase text-[10px] tracking-[0.5em] mb-6 md:mb-8 border-b pb-4 border-blue-200">Key Strengths</p>
                       <ul className="space-y-4 text-slate-700 text-sm font-bold">
                          {finalAnalysis.strengths?.map((s:any, i:any) => <li key={i} className="flex gap-4"><CheckCircle className="text-green-500 shrink-0" size={18} /> {s}</li>)}
                       </ul>
                    </div>
                    <div className="p-8 md:p-10 bg-red-50 rounded-3xl border border-red-100">
                       <p className="text-red-600 font-black uppercase text-[10px] tracking-[0.5em] mb-6 md:mb-8 border-b pb-4 border-red-200">OLQ Gaps</p>
                       <ul className="space-y-4 text-slate-700 text-sm font-bold">
                          {finalAnalysis.weaknesses?.map((w:any, i:any) => <li key={i} className="flex gap-4"><AlertCircle className="text-red-500 shrink-0" size={18} /> {w}</li>)}
                       </ul>
                    </div>
                 </div>
              </div>
              <button onClick={() => window.location.reload()} className="w-full py-6 md:py-8 bg-slate-900 hover:bg-black text-white rounded-full font-black uppercase tracking-widest text-xs shadow-2xl transition-all">Archive Dossier & Exit</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Interview;
