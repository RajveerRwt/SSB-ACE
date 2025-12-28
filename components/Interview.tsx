
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Shield, ShieldAlert, Radio, Volume2, Info, User, CheckCircle, XCircle, Award, Target, MessageSquare, Activity, ChevronRight, BarChart3, AlertTriangle } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { evaluatePerformance } from '../services/geminiService';

// Audio/Video Utility Functions
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
}

const Interview: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [status, setStatus] = useState('Disconnected');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [transcription, setTranscription] = useState<{ role: string; text: string }[]>([]);
  const [finalAnalysis, setFinalAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcription]);

  // Comprehensive IO System Instruction
  const systemInstruction = `
    You are Col. Arjun Singh, a senior Interviewing Officer (IO) at the SSB (Service Selection Board). 
    You are evaluating a defense aspirant for the Indian Armed Forces. 
    You have a MALE, FIRM, COMMANDING, and AUTHORITATIVE voice.
    
    STRICT LANGUAGE PROTOCOL: 
    1. You speak EXCLUSIVELY in formal English. 
    2. THE CANDIDATE IS ALSO EXPECTED TO SPEAK ENGLISH.
    3. IMPORTANT: Do not repeatedly remind the candidate to speak in English. Only mention it once at the very start of the interview as part of the rules. After that, assume they are trying their best and focus on the CONTENT of their answers. Do not nag or interrupt them about their language choice unless they are completely silent or totally unintelligible for more than 30 seconds.
    
    INTERVIEW STRUCTURE:
    1. INTRODUCTION (Formal welcome, setting the ground rules).
    2. PIQ & RAPID FIRE: Probe education, family, hobbies. Use the "Rapid Fire" technique—ask 6-8 questions in one go and observe the candidate's memory and calmness. Do not repeat questions; this tests memory.
    3. SITUATIONAL & SOCIAL: "What would you do if..." scenarios.
    4. CURRENT AFFAIRS: Awareness of defense and national issues.
    
    VISUAL ASSESSMENT: Observe posture and eye contact. Be critical but professional.
    
    GOAL: Evaluate for 15 OLQs. Focus on reasoning ability and social effectiveness.
  `;

  useEffect(() => {
    if (isActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.error(e));
      const interval = setInterval(() => {
        if (canvasRef.current && videoRef.current && sessionRef.current && isVideoOn) {
          const canvas = canvasRef.current;
          canvas.width = 320; canvas.height = 180;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            sessionRef.current.sendRealtimeInput({ media: { data: canvas.toDataURL('image/jpeg', 0.5).split(',')[1], mimeType: 'image/jpeg' } });
          }
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isActive, isVideoOn]);

  const startInterview = async () => {
    try {
      setStatus('Initializing Boardroom Environment...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 1280, height: 720 } });
      streamRef.current = stream;
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setStatus('Board is now in Session.');
            setIsActive(true);
            setFinalAnalysis(null);
            setTranscription([]);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMicOn) sessionPromise.then(s => s.sendRealtimeInput({ media: createBlob(e.inputBuffer.getChannelData(0)) }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg) => {
            if (msg.serverContent?.outputTranscription) {
              const text = msg.serverContent.outputTranscription.text;
              setTranscription(prev => (prev.length > 0 && prev[prev.length-1].role === 'IO') ? [...prev.slice(0,-1), {role:'IO', text:prev[prev.length-1].text+text}] : [...prev, {role:'IO', text}]);
            }
            if (msg.serverContent?.inputTranscription) {
              const text = msg.serverContent.inputTranscription.text;
              setTranscription(prev => (prev.length > 0 && prev[prev.length-1].role === 'Candidate') ? [...prev.slice(0,-1), {role:'Candidate', text:prev[prev.length-1].text+text}] : [...prev, {role:'Candidate', text}]);
            }
            const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio && outputCtx) {
              setIsAiSpeaking(true);
              const buffer = await decodeAudioData(decode(audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer; source.connect(outputCtx.destination);
              source.onended = () => { sourcesRef.current.delete(source); if(sourcesRef.current.size === 0) setIsAiSpeaking(false); };
              const startAt = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              source.start(startAt);
              nextStartTimeRef.current = startAt + buffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onclose: () => setIsActive(false),
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
      setStatus('Microphone/Camera Permission Required.');
    }
  };

  const stopInterview = async () => {
    setIsActive(false); setIsAnalyzing(true); setStatus('Synthesizing Candidate Dossier...');
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (sessionRef.current) sessionRef.current.close();
    inputAudioContextRef.current?.close(); outputAudioContextRef.current?.close();
    try {
      const history = transcription.map(t => `${t.role}: ${t.text}`).join('\n');
      const analysis = await evaluatePerformance('Comprehensive SSB Interview Session', { dialogue: history });
      setFinalAnalysis(analysis);
    } catch (e) { console.error(e); } finally { setIsAnalyzing(false); setStatus('Analysis Finalized.'); }
  };

  return (
    <div className="max-w-screen-2xl mx-auto p-4 space-y-6">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* MAIN VIEWPORT */}
      <div className="relative h-[80vh] bg-black rounded-[3rem] overflow-hidden shadow-2xl border-4 border-slate-900 ring-1 ring-slate-800">
        
        {/* IDLE STATE */}
        {!isActive && !finalAnalysis && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-12 text-center z-10">
            <div className="w-32 h-32 bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/20 mb-10">
              <Shield className="w-16 h-16 text-yellow-500" />
            </div>
            <h2 className="text-6xl font-black text-white uppercase tracking-tighter mb-6">SSB Board Room 14</h2>
            <p className="text-slate-400 max-w-xl mb-12 text-xl font-medium">Reporting for a formal behavioral assessment. Col. Singh is expecting you. Dress formally and maintain military posture.</p>
            <button onClick={startInterview} className="px-24 py-8 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-full transition-all shadow-2xl uppercase tracking-[0.3em] text-lg active:scale-95">Initiate Interview</button>
          </div>
        )}

        {/* ACTIVE SESSION INTEGRATED VIEW */}
        {isActive && (
          <div className="absolute inset-0 flex flex-col lg:flex-row">
            
            {/* IO VIRTUAL AVATAR (Left Side) */}
            <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center relative p-12 border-r border-white/5">
              <div className="absolute top-10 left-10 text-blue-500/30 flex gap-4"><Activity /><Radio className="animate-pulse"/></div>
              <div className="relative w-72 h-72 lg:w-96 lg:h-96 flex items-center justify-center">
                <div className={`absolute inset-0 border-4 rounded-full border-blue-500/10 transition-transform duration-1000 ${isAiSpeaking ? 'scale-150 rotate-90' : 'scale-100'}`} />
                <div className={`w-52 h-52 lg:w-72 lg:h-72 rounded-full border-8 flex items-center justify-center bg-slate-900 z-10 shadow-2xl transition-all ${isAiSpeaking ? 'border-blue-400 bg-blue-500/5 scale-110 shadow-blue-500/20' : 'border-slate-800'}`}>
                  <User className={`w-24 h-24 lg:w-36 lg:h-36 transition-colors ${isAiSpeaking ? 'text-blue-300' : 'text-slate-700'}`} />
                </div>
              </div>
              <div className="mt-12 text-center">
                <h3 className="text-white font-black text-4xl lg:text-5xl uppercase tracking-tighter">Col. Arjun Singh</h3>
                <p className="text-blue-500 font-black uppercase tracking-[0.6em] text-[10px] mt-4">Interviewing Officer • Assessment Active</p>
              </div>

              {/* CANDIDATE SELF-FEED OVERLAY */}
              <div className="absolute bottom-10 left-10 w-64 aspect-video bg-black rounded-3xl overflow-hidden border-4 border-white/10 shadow-2xl z-30 group transition-all hover:scale-105">
                 <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${isVideoOn ? 'opacity-100' : 'opacity-0'}`} />
                 {!isVideoOn && <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-700"><VideoOff /></div>}
                 <div className="absolute top-3 left-3 px-3 py-1 bg-black/50 backdrop-blur-md rounded-lg text-[9px] text-white font-black uppercase tracking-widest border border-white/10">Candidate Preview</div>
              </div>
            </div>

            {/* LIVE INTEGRATED TRANSCRIPT (Right Side) - ONLY CANDIDATE TRANSCRIPT DURING SESSION */}
            <div className="w-full lg:w-[450px] bg-slate-900/50 backdrop-blur-3xl flex flex-col border-l border-white/10 shadow-[-50px_0_100px_rgba(0,0,0,0.5)]">
               <div className="p-10 border-b border-white/5 flex items-center justify-between">
                  <h4 className="font-black text-white uppercase text-xs tracking-[0.4em] flex items-center gap-4">
                    <MessageSquare size={18} className="text-blue-400" /> English Mic Feed
                  </h4>
                  <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Candidate Speech</span>
                  </div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar scroll-smooth">
                  {transcription.filter(t => t.role === 'Candidate').length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-10 space-y-6">
                      <Shield className="w-20 h-20 text-white" />
                      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Speak now (English only)</p>
                    </div>
                  ) : (
                    transcription.filter(t => t.role === 'Candidate').map((t, i) => (
                      <div key={i} className="flex flex-col items-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-3 mb-3 px-2">
                          <User className="w-3 h-3 text-white/40" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                            Aspirant (English)
                          </span>
                        </div>
                        <div className="p-6 rounded-[2rem] text-sm leading-relaxed max-w-[90%] shadow-lg bg-blue-600 text-white rounded-tr-none border border-blue-500 font-bold">
                          {t.text}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={transcriptEndRef} />
               </div>

               <div className="p-8 bg-black/20 border-t border-white/5 space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>OLQ Verification</span>
                    <span className="text-blue-400">Logic Integrity Check</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-[pulse_2s_infinite]" style={{width: '65%'}} />
                  </div>
                  <p className="text-[9px] text-slate-600 font-bold italic">Note: IO's dialogue is hidden to test your active listening skills.</p>
               </div>
            </div>
          </div>
        )}

        {/* FINAL DOSSIER VIEW - SHOWS FULL DIALOGUE LOG */}
        {finalAnalysis && !isActive && (
          <div className="absolute inset-0 bg-slate-950 overflow-y-auto p-16 custom-scrollbar animate-in fade-in duration-1000 z-50">
             <div className="max-w-5xl mx-auto space-y-12">
                <div className="flex justify-between items-end border-b border-white/5 pb-10">
                  <div className="space-y-4">
                     <span className={`px-8 py-2.5 rounded-full font-black uppercase tracking-[0.3em] text-[10px] border-2 shadow-2xl ${finalAnalysis.score >= 7.5 ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                        Board Decision: {finalAnalysis.verdict}
                     </span>
                     <h2 className="text-8xl font-black text-white uppercase tracking-tighter">Candidate Dossier</h2>
                  </div>
                  <div className="text-right">
                     <span className="text-slate-500 text-xs font-black uppercase tracking-[0.4em] block mb-4">Board Aggregate</span>
                     <div className="text-[12rem] font-black text-yellow-400 leading-none drop-shadow-[0_0_50px_rgba(234,179,8,0.3)]">{finalAnalysis.score}</div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-10">
                   <div className="bg-white/5 p-12 rounded-[4rem] border border-white/10 space-y-10 backdrop-blur-3xl">
                      <h4 className="text-blue-400 font-black uppercase text-xs tracking-[0.4em] flex items-center gap-5"><BarChart3 size={24} /> 15-OLQ Performance Matrix</h4>
                      <div className="space-y-8">
                         {[
                           { label: 'Planning & Organizing', content: finalAnalysis.olqAnalysis.planning, icon: Target },
                           { label: 'Social Adjustment', content: finalAnalysis.olqAnalysis.socialAdjustment, icon: Shield },
                           { label: 'Social Effectiveness', content: finalAnalysis.olqAnalysis.socialEffectiveness, icon: Activity },
                           { label: 'Dynamic Traits', content: finalAnalysis.olqAnalysis.dynamic, icon: Award }
                         ].map((item, i) => (
                           <div key={i} className="group flex gap-8 p-8 bg-white/5 rounded-[2.5rem] border border-transparent hover:border-white/10 hover:bg-white/[0.08] transition-all">
                              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-blue-400 shrink-0 shadow-xl"><item.icon size={24} /></div>
                              <div className="space-y-2">
                                <span className="text-xs font-black uppercase text-white tracking-[0.2em] block">{item.label}</span>
                                <p className="text-slate-400 text-sm leading-relaxed">{item.content}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-10">
                      <div className="bg-white p-12 rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[600px]">
                         <h4 className="text-slate-900 font-black uppercase text-xs tracking-[0.4em] mb-8 flex items-center gap-5 border-b pb-6"><MessageSquare size={24} /> Full Dialogue Record</h4>
                         <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
                            {transcription.map((t, i) => (
                              <div key={i} className={`flex flex-col ${t.role === 'IO' ? 'items-start' : 'items-end'}`}>
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 px-2">
                                  {t.role === 'IO' ? 'Col. Singh' : 'Aspirant'}
                                </span>
                                <div className={`p-4 rounded-2xl text-xs leading-relaxed max-w-[90%] ${t.role === 'IO' ? 'bg-slate-100 text-slate-800 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none'}`}>
                                  {t.text}
                                </div>
                              </div>
                            ))}
                         </div>
                      </div>

                      <div className="bg-white p-12 rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-slate-100">
                         <h4 className="text-red-600 font-black uppercase text-xs tracking-[0.4em] mb-10 flex items-center gap-5"><AlertTriangle size={24} /> Points of Improvement</h4>
                         <div className="space-y-5">
                            {finalAnalysis.improvementPoints.map((point: string, i: number) => (
                              <div key={i} className="flex gap-6 p-6 bg-red-50 rounded-[2rem] text-slate-800 text-sm font-bold border border-red-100 shadow-sm">
                                 <ChevronRight className="w-6 h-6 text-red-500 shrink-0" /> {point}
                              </div>
                            ))}
                         </div>
                      </div>

                      <div className="bg-slate-900 p-16 rounded-[4rem] text-white border border-white/5 shadow-2xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 blur-3xl rounded-full" />
                         <h4 className="text-yellow-400 font-black uppercase text-xs tracking-[0.4em] mb-8">Boarding Officer's Summary</h4>
                         <p className="text-2xl leading-relaxed italic opacity-90 font-medium">"{finalAnalysis.recommendations}"</p>
                      </div>
                   </div>
                </div>

                <div className="flex gap-6">
                  <button onClick={() => setFinalAnalysis(null)} className="flex-1 py-10 bg-white/5 text-white/50 rounded-full font-black uppercase tracking-[0.5em] text-sm hover:bg-white/10 transition-all border border-white/5 active:scale-95">De-brief & Return</button>
                  <button className="px-16 py-10 bg-slate-800 text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-slate-700 transition-all border border-white/5">Download Dossier</button>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS BAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-2xl">
         <div className="flex gap-6">
            <button disabled={!isActive} onClick={() => setIsMicOn(!isMicOn)} className={`p-10 rounded-full transition-all border-4 shadow-xl ${isMicOn ? 'bg-slate-50 border-slate-200 text-slate-800 hover:scale-105 active:scale-95' : 'bg-red-600 border-red-500 text-white animate-pulse'}`}>
              {isMicOn ? <Mic size={32} /> : <MicOff size={32} />}
            </button>
            <button disabled={!isActive} onClick={() => setIsVideoOn(!isVideoOn)} className={`p-10 rounded-full transition-all border-4 shadow-xl ${isVideoOn ? 'bg-slate-50 border-slate-200 text-slate-800 hover:scale-105 active:scale-95' : 'bg-red-600 border-red-500 text-white'}`}>
              {isVideoOn ? <Video size={32} /> : <VideoOff size={32} />}
            </button>
         </div>

         {isActive && (
            <div className="flex items-center gap-10">
               <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Boardroom Status</div>
                  <div className="text-xl font-mono font-black text-slate-800 flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
                    RECORDING ACTIVE
                  </div>
               </div>
               <button onClick={stopInterview} className="px-20 py-8 bg-slate-900 text-white font-black rounded-full flex items-center gap-6 hover:bg-black transition-all shadow-2xl uppercase tracking-[0.2em] text-sm border-b-8 border-slate-950 active:translate-y-2 active:border-b-0">
                 <PhoneOff size={28} /> Terminate Board Session
               </button>
            </div>
         )}

         {!isActive && !finalAnalysis && (
            <div className="flex items-center gap-6 px-10 py-5 bg-slate-50 rounded-2xl border border-slate-100">
               <ShieldAlert className="text-blue-600" />
               <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Boardroom Status</div>
                  <div className="text-xs font-black text-slate-800 uppercase tracking-widest">{status}</div>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default Interview;
