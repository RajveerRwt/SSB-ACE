
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { PIQData } from '../types';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, Volume2, Camera, AlertCircle } from 'lucide-react';

// --- Audio Helpers (from Guidelines) ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
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

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): any {
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

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

interface InterviewProps {
  piqData?: PIQData;
  onSave?: (result: any) => void;
  isAdmin?: boolean;
}

const Interview: React.FC<InterviewProps> = ({ piqData, onSave, isAdmin }) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [status, setStatus] = useState("Ready to Connect");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Audio Contexts
  const audioCtxRef = useRef<AudioContext | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  
  // Session Refs
  const isSocketOpenRef = useRef(false);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  
  // Stream & Processing Refs
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Audio Playback Refs
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopSession();
    };
  }, []);

  const startSession = async () => {
    setError(null);
    setStatus("Initializing Secure Link...");
    
    try {
        // 1. Initialize Audio Contexts
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        if (!inputAudioCtxRef.current) {
            inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        }

        // Resume contexts if suspended
        if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
        if (inputAudioCtxRef.current.state === 'suspended') await inputAudioCtxRef.current.resume();

        // 2. Get Media Stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        streamRef.current = stream;
        
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }

        // 3. Connect to Gemini Live
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            callbacks: {
                onopen: () => {
                    isSocketOpenRef.current = true;
                    setStatus("IO Connected. Interview in Progress.");
                    setIsSessionActive(true);
                    
                    // Start Audio Input Pipeline
                    startAudioInput(stream);
                    
                    // Start Video Input Pipeline (0.2 FPS = 1 frame every 5s)
                    const FRAME_RATE = 0.2;
                    frameIntervalRef.current = window.setInterval(() => {
                        captureAndSendFrame();
                    }, 1000 / FRAME_RATE);
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Handle Audio Output
                    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (base64Audio && audioCtxRef.current) {
                        try {
                            const ctx = audioCtxRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                            
                            const audioBuffer = await decodeAudioData(
                                decode(base64Audio),
                                ctx,
                                24000,
                                1
                            );
                            
                            const source = ctx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(ctx.destination);
                            
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                            });
                            
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        } catch (e) {
                            console.error("Audio Decode Error", e);
                        }
                    }

                    // Handle Interruption
                    if (message.serverContent?.interrupted) {
                        sourcesRef.current.forEach(s => s.stop());
                        sourcesRef.current.clear();
                        nextStartTimeRef.current = 0;
                    }
                    
                    // Handle Text/Transcript if available (optional)
                    // The model primarily sends audio, but turnComplete might have transcriptions if configured.
                },
                onclose: () => {
                    isSocketOpenRef.current = false;
                    setStatus("Interview Concluded.");
                    setIsSessionActive(false);
                    stopSession();
                },
                onerror: (e) => {
                    console.error("Session Error", e);
                    setError("Connection Lost. Please reconnect.");
                    stopSession();
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } // Deep male voice
                },
                systemInstruction: `You are Col. Arjun Singh, a senior Interviewing Officer (IO) at the Services Selection Board (SSB). 
                Conduct a formal 1:1 personal interview with the candidate.
                
                Candidate PIQ Data: ${JSON.stringify(piqData || {})}
                
                Guidelines:
                1. Be professional, firm, yet polite.
                2. Ask questions based on PIQ (Family, Education, Hobbies) if provided, else ask general intro.
                3. Ask Rapid Fire questions (series of 3-4 questions at once).
                4. Assess Officer Like Qualities (OLQs).
                5. Keep responses concise and conversational (spoken style).`,
            }
        });
        
        sessionPromiseRef.current = sessionPromise;

    } catch (e) {
        console.error("Start Session Error", e);
        setError("Microphone/Camera access denied or API Error.");
        stopSession();
    }
  };

  const startAudioInput = (stream: MediaStream) => {
      if (!inputAudioCtxRef.current) return;
      const ctx = inputAudioCtxRef.current;
      
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
          if (!isSocketOpenRef.current || !sessionPromiseRef.current) return;
          
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBlob = createBlob(inputData);
          
          sessionPromiseRef.current.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
          });
      };
      
      source.connect(processor);
      processor.connect(ctx.destination);
      
      sourceRef.current = source;
      processorRef.current = processor;
  };

  const captureAndSendFrame = () => {
      const videoEl = videoRef.current;
      const canvasEl = canvasRef.current;
      
      if (!videoEl || !canvasEl || !isSocketOpenRef.current || !sessionPromiseRef.current) return;
      
      // Only capture if camera is "On"
      if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) return;

      const ctx = canvasEl.getContext('2d');
      if (!ctx) return;

      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      
      ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
      
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
      }, 'image/jpeg', 0.5); // Low quality for latency
  };

  const stopSession = () => {
      setIsSessionActive(false);
      isSocketOpenRef.current = false;
      
      // Stop Media Stream
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
      }
      
      // Stop Audio Processing
      if (processorRef.current && sourceRef.current) {
          processorRef.current.disconnect();
          sourceRef.current.disconnect();
          processorRef.current = null;
          sourceRef.current = null;
      }
      
      // Stop Playback
      sourcesRef.current.forEach(s => s.stop());
      sourcesRef.current.clear();
      
      // Clear Interval
      if (frameIntervalRef.current) {
          window.clearInterval(frameIntervalRef.current);
          frameIntervalRef.current = null;
      }
      
      if (videoRef.current) videoRef.current.srcObject = null;
      setStatus("Session Ended");
      
      if (onSave) onSave({ status: 'Completed', notes: feedback });
  };

  const toggleMic = () => {
      if (streamRef.current) {
          streamRef.current.getAudioTracks().forEach(track => track.enabled = !isMicOn);
          setIsMicOn(!isMicOn);
      }
  };

  const toggleCamera = () => {
      if (streamRef.current) {
          streamRef.current.getVideoTracks().forEach(track => track.enabled = !isCameraOn);
          setIsCameraOn(!isCameraOn);
      }
  };

  return (
    <div className="max-w-6xl mx-auto h-[85vh] flex flex-col md:flex-row gap-6 p-4 animate-in fade-in duration-500">
        {/* Main Video Area */}
        <div className="flex-1 bg-slate-950 rounded-[2.5rem] relative overflow-hidden shadow-2xl border-4 border-slate-800 flex flex-col">
            
            {/* Status Bar */}
            <div className="absolute top-6 left-6 z-20 flex items-center gap-4">
                <div className={`px-4 py-2 rounded-full backdrop-blur-md text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isSessionActive ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-slate-700/50 text-slate-300 border border-slate-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${isSessionActive ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
                    {isSessionActive ? "LIVE LINK" : "OFFLINE"}
                </div>
                <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-slate-300 text-[10px] font-bold uppercase tracking-widest border border-white/10">
                    Col. Arjun Singh (AI)
                </div>
            </div>

            {/* Video Feed */}
            <div className="flex-1 relative flex items-center justify-center bg-black">
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500 ${isCameraOn && isSessionActive ? 'opacity-100' : 'opacity-0'}`} 
                />
                
                {(!isSessionActive || !isCameraOn) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 space-y-4">
                        <div className="w-24 h-24 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center">
                            {isSessionActive ? <Camera size={40} /> : <VideoOff size={40} />}
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.2em]">{status}</p>
                    </div>
                )}

                {/* AI Audio Visualizer Overlay */}
                {isSessionActive && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-end gap-1 h-12">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="w-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ height: '100%', animationDelay: `${i * 0.1}s` }} />
                        ))}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-6 bg-slate-900/80 backdrop-blur-md border-t border-white/5 flex justify-center gap-6 relative z-20">
                {!isSessionActive ? (
                    <button 
                        onClick={startSession}
                        className="px-12 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all shadow-lg shadow-green-900/20"
                    >
                        {status.includes("Initializing") ? <Loader2 className="animate-spin" /> : <Video size={18} />}
                        Start Interview
                    </button>
                ) : (
                    <>
                        <button onClick={toggleMic} className={`p-4 rounded-2xl transition-all ${isMicOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-500/20 text-red-500 border border-red-500/50'}`}>
                            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                        </button>
                        <button onClick={stopSession} className="px-12 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all shadow-lg">
                            <PhoneOff size={18} /> End Call
                        </button>
                        <button onClick={toggleCamera} className={`p-4 rounded-2xl transition-all ${isCameraOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-500/20 text-red-500 border border-red-500/50'}`}>
                            {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                        </button>
                    </>
                )}
            </div>
        </div>

        {/* Info Panel / Feedback */}
        <div className="w-full md:w-80 bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100 flex flex-col">
            <div className="mb-6 pb-6 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-1">Interview Protocol</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Virtual IO Room</p>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                {error && (
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-red-600 text-xs font-bold flex gap-2">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}
                
                <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600"><Volume2 size={16} /></div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Instruction</p>
                            <p className="text-xs font-bold text-slate-700 leading-relaxed">Ensure you are in a quiet room. Speak clearly and maintain eye contact with the camera.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-purple-600"><Video size={16} /></div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">AI Monitoring</p>
                            <p className="text-xs font-bold text-slate-700 leading-relaxed">Body language and confidence are being analyzed in real-time.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-auto pt-6 text-center">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">SSBPREP.ONLINE AI v4.0</p>
            </div>
        </div>

        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Interview;
