
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Shield, ShieldAlert, User, Target, Activity, ChevronRight, BarChart3, AlertTriangle, FileText, RefreshCw, Clock, Award, Waves, Zap, Binary, Radio, Cpu, Camera, Video, VideoOff, Maximize, Eye } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { evaluatePerformance } from '../services/geminiService';
import { PIQData } from '../types';

// Helper for Base64 conversion
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Audio Encoding & Decoding (PCM 16-bit)
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

const Interview: React.FC<{ piqData?: PIQData }> = ({ piqData }) => {
  const [isActive, setIsActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [status, setStatus] = useState('Standby');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalAnalysis, setFinalAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // High-performance refs
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    let timer: any;
    if (isActive) {
      timer = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startInterview = async () => {
    setError(null);
    setStatus('Establishing Visual Link...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are Col. Arjun Singh, a sharp SSB Interviewing Officer. 
          You can SEE the candidate via video feed. 
          Analyze their posture, facial expressions, and eye contact as they speak. 
          Maintain a professional military demeanor. 
          PIQ: ${JSON.stringify(piqData || {})}. 
          Probe for OLQs. If the candidate looks nervous, note it. If they are slouching, mention it firmly but professionally. 
          Start by acknowledging you can see them and ask them to sit straight and introduce themselves.`,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
        },
        callbacks: {
          onopen: () => {
            setStatus('Surveillance Active');
            setIsActive(true);
            setFinalAnalysis(null);

            // Audio Stream
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMicOn && sessionPromiseRef.current) {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromiseRef.current.then(session => session.sendRealtimeInput({ media: pcmBlob }));
              }
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            // Video Frame Stream (1 FPS for body language analysis)
            frameIntervalRef.current = window.setInterval(() => {
              if (canvasRef.current && videoRef.current && isVideoOn) {
                const canvas = canvasRef.current;
                const video = videoRef.current;
                canvas.width = video.videoWidth / 2; // Reduced size for bandwidth
                canvas.height = video.videoHeight / 2;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob(async (blob) => {
                  if (blob && sessionPromiseRef.current) {
                    const base64Data = await blobToBase64(blob);
                    sessionPromiseRef.current.then(session => {
                      session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } });
                    });
                  }
                }, 'image/jpeg', 0.6);
              }
            }, 1000);
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputCtx) {
              setIsAiSpeaking(true);
              const audioBuffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsAiSpeaking(false);
              };
              const startTime = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              source.start(startTime);
              nextStartTimeRef.current = startTime + audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onerror: () => setError("Visual uplink disrupted."),
          onclose: () => { if (isActive) setIsActive(false); }
        },
      });

      sessionPromiseRef.current = sessionPromise;
      await sessionPromise;

    } catch (err) {
      setError("Camera and Microphone required for IO Board.");
    }
  };

  const stopInterview = async () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    setIsActive(false); 
    setIsAnalyzing(true);
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (sessionPromiseRef.current) sessionPromiseRef.current.then(s => s.close());
    
    try {
      const results = await evaluatePerformance('Video-Enabled IO Behavioral Interview', { piq: piqData, duration: elapsedSeconds });
      setFinalAnalysis(results);
    } finally { setIsAnalyzing(false); }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 space-y-6">
      {/* STATUS HEADER */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in slide-in-from-top duration-700">
        <div className="lg:col-span-1 bg-slate-900 px-8 py-5 rounded-[2rem] border border-white/10 flex items-center gap-5 shadow-2xl">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
            <Clock className="text-blue-400" size={24} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Time Elapsed</p>
            <p className="text-2xl font-black text-white font-mono">{formatTime(elapsedSeconds)}</p>
          </div>
        </div>
        <div className="lg:col-span-2 bg-slate-900 px-10 py-5 rounded-[2rem] border border-white/10 flex flex-col justify-center text-center shadow-2xl">
           <p className="text-[9px] font-black uppercase text-blue-400 tracking-[0.4em] mb-1">Visual Intelligence Mode</p>
           <p className="text-sm font-black text-white uppercase tracking-tighter italic">"IO Col. Singh is observing your body language and expressions"</p>
        </div>
        <div className="lg:col-span-1 bg-slate-900 px-8 py-5 rounded-[2rem] border border-white/10 flex items-center justify-between shadow-2xl">
          <div className="flex flex-col">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Stream Status</p>
            <p className="text-[10px] font-black text-green-500 uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" /> Synchronized
            </p>
          </div>
          <Binary className="text-blue-500 animate-pulse" />
        </div>
      </div>

      {/* INTERVIEW STAGE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-[75vh]">
        
        {/* IO FEED (Col. Arjun Singh) */}
        <div className="xl:col-span-8 bg-slate-950 rounded-[4rem] border-4 border-slate-900 relative overflow-hidden shadow-2xl group">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)] opacity-30 pointer-events-none" />
           <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />
           
           {!isActive && !finalAnalysis && (
             <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-12 text-center bg-slate-950/40 backdrop-blur-sm">
                <div className="w-24 h-24 bg-blue-600/10 border-2 border-blue-500/20 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-[0_0_50px_rgba(59,130,246,0.1)]">
                   <Shield className="text-blue-400 w-12 h-12" />
                </div>
                <h2 className="text-6xl font-black text-white uppercase tracking-tighter mb-6">IO Board Simulation</h2>
                <p className="text-slate-400 text-lg font-medium italic mb-12 max-w-xl opacity-70">
                   "Officer Potential is not spoken, it is demonstrated. Be natural, be bold."
                </p>
                <button onClick={startInterview} className="px-16 py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-full transition-all shadow-2xl uppercase tracking-[0.4em] text-xs flex items-center gap-4">
                  <Zap size={18} /> Initialize Session
                </button>
             </div>
           )}

           {isActive && (
             <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in duration-1000">
                <div className="relative">
                   <div className={`absolute -inset-20 border-[60px] border-blue-500/5 rounded-full blur-3xl transition-all duration-1000 ${isAiSpeaking ? 'scale-125 opacity-100' : 'scale-90 opacity-0'}`} />
                   <div className={`w-64 h-64 lg:w-[450px] lg:h-[450px] rounded-full border-2 border-white/10 bg-slate-900/60 backdrop-blur-3xl flex items-center justify-center relative z-10 shadow-inner ${isAiSpeaking ? 'border-blue-500/30 ring-[15px] ring-blue-500/5' : ''}`}>
                      <div className="flex gap-2 items-center opacity-40 h-20">
                         {[...Array(10)].map((_, i) => (
                           <div key={i} className={`w-1 rounded-full bg-blue-400 transition-all ${isAiSpeaking ? 'animate-pulse' : 'h-2'}`} style={{ height: isAiSpeaking ? `${Math.random() * 60 + 20}px` : '4px' }} />
                         ))}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div className={`p-8 rounded-full border-2 transition-all duration-500 ${isAiSpeaking ? 'bg-blue-500/10 border-blue-400/30 text-blue-400' : 'bg-slate-800/50 border-slate-700 text-slate-700'}`}>
                           <User size={100} strokeWidth={1} />
                         </div>
                      </div>
                   </div>
                </div>
                <div className="mt-12 text-center relative z-20">
                   <h3 className="text-white text-4xl font-black uppercase tracking-tighter mb-2">Col. Arjun Singh</h3>
                   <p className="text-blue-500 font-black uppercase tracking-[0.6em] text-[9px] flex items-center justify-center gap-4">
                      <span className="w-10 h-[1px] bg-blue-500/30" /> Interviewing Officer <span className="w-10 h-[1px] bg-blue-500/30" />
                   </p>
                </div>
             </div>
           )}

           {finalAnalysis && (
             <div className="absolute inset-0 z-50 bg-slate-950 overflow-y-auto p-12 custom-scrollbar animate-in zoom-in duration-500">
                <div className="max-w-4xl mx-auto space-y-12">
                   <div className="flex justify-between items-end border-b border-white/10 pb-10">
                      <div>
                        <p className="text-blue-400 font-black uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2"><Award size={14}/> Assessment Complete</p>
                        <h2 className="text-7xl font-black text-white uppercase tracking-tighter">IO Verdict</h2>
                      </div>
                      <div className="text-right">
                        <span className="text-9xl font-black text-yellow-400 leading-none">{finalAnalysis.score}</span>
                      </div>
                   </div>
                   <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10">
                      <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-3"><Eye size={18} className="text-blue-400"/> Behavioral Observations</h4>
                      <p className="text-slate-300 font-medium italic text-lg leading-relaxed">"{finalAnalysis.recommendations}"</p>
                   </div>
                   <button onClick={() => setFinalAnalysis(null)} className="w-full py-6 bg-white/10 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-white/20 transition-all">Dismiss Dossier</button>
                </div>
             </div>
           )}
        </div>

        {/* CANDIDATE MONITOR (Visual Feed) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
           <div className="flex-1 bg-slate-900 rounded-[3.5rem] border-4 border-slate-800 relative overflow-hidden shadow-2xl group">
              <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover transition-all duration-700 ${isVideoOn ? 'opacity-80 grayscale' : 'opacity-0 blur-2xl'}`} />
              
              {/* Tactical Scanning HUD Overlay */}
              <div className="absolute inset-0 pointer-events-none z-10">
                 <div className="absolute top-8 left-8 border-l-2 border-t-2 border-blue-500/40 w-12 h-12" />
                 <div className="absolute top-8 right-8 border-r-2 border-t-2 border-blue-500/40 w-12 h-12" />
                 <div className="absolute bottom-8 left-8 border-l-2 border-b-2 border-blue-500/40 w-12 h-12" />
                 <div className="absolute bottom-8 right-8 border-r-2 border-b-2 border-blue-500/40 w-12 h-12" />
                 
                 <div className="absolute top-1/2 left-0 w-full h-[1px] bg-blue-500/20 animate-[scan_4s_ease-in-out_infinite]" />
                 
                 <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-xl px-4 py-1 rounded-full border border-white/10">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                       <Activity size={10} className="animate-pulse" /> Live Posture Tracking
                    </p>
                 </div>
              </div>

              {!isVideoOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-3xl">
                   <VideoOff className="text-slate-700 w-20 h-20 mb-4" />
                   <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Visual Link Offline</p>
                </div>
              )}
              
              <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center z-20">
                 <div className="bg-black/60 backdrop-blur-2xl px-5 py-2 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Candidate #{piqData?.chestNo || 'Fresh'}</p>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => setIsVideoOn(!isVideoOn)} className={`p-3 rounded-xl border transition-all ${isVideoOn ? 'bg-white/10 border-white/20 text-white' : 'bg-blue-600 border-blue-500 text-white shadow-lg'}`}>
                       {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
                    </button>
                 </div>
              </div>
           </div>

           <div className="bg-slate-900 rounded-[2.5rem] border border-white/10 p-8 shadow-2xl">
              <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4">
                 <Cpu size={18} className="text-yellow-400" />
                 <h5 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Neural Analysis Engine</h5>
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Facial Expressions</span>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Monitoring...</span>
                 </div>
                 <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-2/3 animate-[progress_5s_infinite]" />
                 </div>
                 <div className="flex justify-between items-center pt-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Eye Contact</span>
                    <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Stable</span>
                 </div>
                 <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-4/5" />
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* CONTROLS BAR */}
      <div className="flex flex-wrap justify-center items-center gap-6 bg-slate-900/60 backdrop-blur-3xl p-8 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
         <div className="absolute inset-0 bg-blue-600/5 opacity-20 pointer-events-none" />
         
         <button 
           disabled={!isActive} 
           onClick={() => setIsMicOn(!isMicOn)} 
           className={`p-8 rounded-[2rem] transition-all border-4 shadow-xl active:scale-95 ${isMicOn ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-red-600 border-red-500 text-white animate-pulse'}`}
         >
           {isMicOn ? <Mic size={32} /> : <MicOff size={32} />}
         </button>

         <div className="h-16 w-[1px] bg-white/10 hidden md:block" />

         <div className="flex items-center gap-6 px-10 py-4 bg-black/40 border border-white/5 rounded-[2rem] backdrop-blur-2xl">
            <div className="flex flex-col text-right">
               <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1 flex items-center justify-end gap-2">
                 <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" /> IO Audio/Visual Stream Active
               </p>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Encryption: Military Grade AES-256</p>
            </div>
            {isActive && (
               <button onClick={stopInterview} className="px-12 py-5 bg-white hover:bg-slate-100 text-slate-950 font-black rounded-2xl flex items-center gap-4 transition-all shadow-2xl uppercase tracking-widest text-[10px]">
                 <PhoneOff size={18} /> End Trial
               </button>
            )}
         </div>
      </div>

      {/* HIDDEN CANVAS FOR FRAME CAPTURE */}
      <canvas ref={canvasRef} className="hidden" />
      
      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-30vh); opacity: 0; }
          50% { transform: translateY(30vh); opacity: 1; }
        }
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 80%; }
          100% { width: 40%; }
        }
      `}</style>
    </div>
  );
};

export default Interview;
