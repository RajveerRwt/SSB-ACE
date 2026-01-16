import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, Volume2, 
  User, Bot, RefreshCw, Shield, AlertCircle, Play, Square, CheckCircle, HelpCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { createSSBChat, evaluatePerformance } from '../services/geminiService';
import { PIQData } from '../types';
import { Chat } from '@google/genai';

interface InterviewProps {
  piqData?: PIQData;
  onSave?: (result: any) => void;
  isAdmin?: boolean;
}

const Interview: React.FC<InterviewProps> = ({ piqData, onSave, isAdmin }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [showScoreHelp, setShowScoreHelp] = useState(false);

  const chatRef = useRef<Chat | null>(null);
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStarted && !isFinished) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setCameraActive(true);
          }
        })
        .catch((err) => {
          console.warn("Camera access denied or unavailable", err);
          setCameraActive(false);
        });
    }
    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, [isStarted, isFinished]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startInterview = async () => {
    setIsStarted(true);
    setMessages([]);
    chatRef.current = createSSBChat();
    
    // Seed with PIQ
    let initialPrompt = "Sir, I am ready for the interview.";
    if (piqData) {
        initialPrompt += ` Here are my details from PIQ: 
        Name: ${piqData.name}, 
        Father: ${piqData.fatherName}, 
        Education: ${piqData.education.map(e => e.qualification).join(', ')}, 
        Hobbies: ${piqData.activities.hobbies}.
        Please start the interview by asking about my background.`;
    }

    try {
        setIsProcessing(true);
        const result = await chatRef.current.sendMessage({ message: initialPrompt });
        const text = result.text || "Welcome, candidate. Let's begin. Introduce yourself.";
        setMessages([{ role: 'model', text: text }]);
        speak(text);
    } catch (e) {
        console.error(e);
        setMessages([{ role: 'model', text: "Connection established. Please introduce yourself." }]);
    } finally {
        setIsProcessing(false);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleMic = () => {
    if (isRecording) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (event: any) => {
       console.error("Speech Rec Error", event.error);
       setIsRecording(false);
    };
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
         await handleUserResponse(transcript);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleUserResponse = async (text: string) => {
      setMessages(prev => [...prev, { role: 'user', text }]);
      setIsProcessing(true);
      
      try {
          if (!chatRef.current) return;
          const result = await chatRef.current.sendMessage({ message: text });
          const responseText = result.text || "I see. Please continue.";
          setMessages(prev => [...prev, { role: 'model', text: responseText }]);
          speak(responseText);
      } catch (e) {
          console.error(e);
      } finally {
          setIsProcessing(false);
      }
  };

  const endInterview = async () => {
     setIsFinished(true);
     if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
     }
     window.speechSynthesis.cancel();

     setIsProcessing(true);
     const fullTranscript = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
     try {
         const result = await evaluatePerformance('Interview', { transcript: fullTranscript });
         setFeedback(result);
         if (onSave) onSave(result);
     } catch (e) {
         console.error(e);
     } finally {
         setIsProcessing(false);
     }
  };

  // --- RENDER ---

  if (isFinished) {
      if (isProcessing && !feedback) {
          return (
             <div className="flex flex-col items-center justify-center h-[60vh] space-y-8 animate-in fade-in">
                 <Loader2 className="w-16 h-16 text-slate-900 animate-spin" />
                 <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">Analyzing Psychometrics...</p>
             </div>
          );
      }

      return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="bg-slate-950 p-8 md:p-16 rounded-[3rem] md:rounded-[4rem] text-white relative overflow-hidden shadow-2xl">
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12 md:gap-16">
                  <div className="text-center md:text-left space-y-6">
                     <span className="bg-blue-600 text-white px-6 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] shadow-lg">IO Assessment</span>
                     <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">Interview <br/><span className="text-blue-500">Debrief</span></h2>
                     <p className="text-slate-400 font-medium max-w-lg leading-relaxed text-sm md:text-lg italic opacity-80">"{feedback?.recommendations}"</p>
                  </div>
                  <div className="flex flex-col items-center bg-white/5 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/10 backdrop-blur-3xl shadow-2xl">
                     <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">Interview Score</span>
                     <div className="text-7xl md:text-9xl font-black text-blue-500">{feedback?.score}</div>
                     <button 
                        onClick={() => setShowScoreHelp(!showScoreHelp)}
                        className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white transition-colors"
                      >
                         <HelpCircle size={14} /> Understand Score {showScoreHelp ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                      </button>
                  </div>
               </div>
            </div>

             {showScoreHelp && (
                 <div className="bg-blue-50 border border-blue-100 p-6 md:p-8 rounded-[2rem] animate-in slide-in-from-top-4">
                    <h4 className="text-sm font-black uppercase tracking-widest text-blue-800 mb-4">Grading Standard</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                       <div className="bg-white p-4 rounded-xl border-l-4 border-green-500 shadow-sm">
                          <span className="block text-xl font-black text-slate-900">9.0 - 10</span>
                          <span className="text-[10px] font-bold uppercase text-green-600 tracking-wider">Outstanding</span>
                       </div>
                       <div className="bg-white p-4 rounded-xl border-l-4 border-blue-500 shadow-sm">
                          <span className="block text-xl font-black text-slate-900">7.0 - 8.9</span>
                          <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">High Potential</span>
                       </div>
                       <div className="bg-white p-4 rounded-xl border-l-4 border-yellow-500 shadow-sm">
                          <span className="block text-xl font-black text-slate-900">5.0 - 6.9</span>
                          <span className="text-[10px] font-bold uppercase text-yellow-600 tracking-wider">Borderline</span>
                       </div>
                       <div className="bg-white p-4 rounded-xl border-l-4 border-red-500 shadow-sm">
                          <span className="block text-xl font-black text-slate-900">&lt; 5.0</span>
                          <span className="text-[10px] font-bold uppercase text-red-600 tracking-wider">Below Average</span>
                       </div>
                    </div>
                 </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 md:gap-10">
               <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border-2 border-slate-50 shadow-2xl">
                  <h4 className="font-black text-xs uppercase tracking-[0.3em] text-green-600 mb-8 md:mb-10 flex items-center gap-4"><CheckCircle className="w-6 h-6" /> Observed Strengths</h4>
                  <div className="space-y-4">
                    {feedback?.strengths?.map((s: string, i: number) => (
                      <div key={i} className="flex gap-4 p-4 bg-green-50 rounded-2xl border border-green-100 text-slate-800 text-sm font-bold">
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" /> {s}
                      </div>
                    ))}
                  </div>
               </div>
               <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border-2 border-slate-50 shadow-2xl">
                  <h4 className="font-black text-xs uppercase tracking-[0.3em] text-red-500 mb-8 md:mb-10 flex items-center gap-4"><AlertCircle className="w-6 h-6" /> Areas of Improvement</h4>
                  <div className="space-y-4">
                    {feedback?.weaknesses?.map((w: string, i: number) => (
                      <div key={i} className="flex gap-4 p-4 bg-red-50 rounded-2xl border border-red-100 text-slate-800 text-sm font-bold">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" /> {w}
                      </div>
                    ))}
                  </div>
               </div>
            </div>
        </div>
      );
  }

  if (!isStarted) {
      return (
         <div className="max-w-4xl mx-auto py-12 md:py-20 text-center space-y-8 animate-in fade-in zoom-in">
             <h1 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter">IO <span className="text-blue-500">Interview</span></h1>
              <div className="flex justify-center gap-4">
                 <span className="px-3 md:px-4 py-1.5 bg-green-500/10 text-green-600 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-green-500/20 flex items-center gap-2">
                   <Video size={12} /> Video Enabled
                 </span>
                 <span className="px-3 md:px-4 py-1.5 bg-blue-500/10 text-blue-600 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-blue-500/20 flex items-center gap-2">
                   <Mic size={12} /> AI Voice Processing
                 </span>
              </div>
              
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl max-w-2xl mx-auto space-y-6">
                 <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-white shadow-lg">
                    <User size={40} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black uppercase text-slate-900">Personal Interview</h3>
                    <p className="text-slate-500 text-sm font-medium mt-2">
                       Simulated interaction with the Interviewing Officer (IO). Ensure you are in a quiet room with good lighting.
                    </p>
                 </div>
                 
                 {!piqData && (
                    <div className="bg-yellow-50 p-4 rounded-xl flex items-center gap-3 text-left">
                       <AlertCircle className="text-yellow-600 shrink-0" />
                       <p className="text-xs text-yellow-800 font-bold">PIQ Data Missing. The interviewer will not know your background. Please fill PIQ first for better results.</p>
                    </div>
                 )}

                 <button 
                   onClick={startInterview}
                   className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all hover:scale-105"
                 >
                   Enter Interview Room
                 </button>
              </div>
         </div>
      );
  }

  // Interview Active State
  return (
    <div className="flex flex-col md:flex-row gap-6 h-[85vh] md:h-[80vh] animate-in fade-in">
       {/* Left: Video Feed & Controls */}
       <div className="w-full md:w-1/3 flex flex-col gap-4">
          <div className="flex-1 bg-black rounded-[2rem] overflow-hidden relative shadow-2xl border-4 border-slate-900">
             {cameraActive ? (
                 <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
             ) : (
                 <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-700">
                    <VideoOff size={48} />
                 </div>
             )}
             
             <div className="absolute top-4 left-4 bg-red-600/90 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full" /> REC
             </div>

             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
                 <button 
                   onClick={toggleMic}
                   className={`p-4 rounded-full shadow-lg transition-all ${isRecording ? 'bg-red-500 text-white scale-110 ring-4 ring-red-500/30' : 'bg-white/20 backdrop-blur text-white hover:bg-white/30'}`}
                 >
                    {isRecording ? <Mic size={24} /> : <MicOff size={24} />}
                 </button>
                 <button 
                   onClick={endInterview}
                   className="p-4 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-all"
                   title="End Interview"
                 >
                    <PhoneOff size={24} />
                 </button>
             </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl text-center">
             <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                {isProcessing ? <Loader2 className="animate-spin" /> : <Volume2 className={isRecording ? "animate-pulse text-green-400" : ""} />}
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</p>
             <p className="font-bold text-lg mt-1">{isProcessing ? 'IO Thinking...' : (isRecording ? 'Listening...' : 'IO Speaking')}</p>
          </div>
       </div>

       {/* Right: Transcript / Chat */}
       <div className="w-full md:w-2/3 bg-white rounded-[2rem] shadow-xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
             <h4 className="font-black uppercase text-xs tracking-widest text-slate-500 flex items-center gap-2">
                <Bot size={14} /> Major Veer (IO)
             </h4>
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Secure Line</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
             {messages.map((m, i) => (
                <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}>
                      {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                   </div>
                   <div className={`p-4 rounded-2xl max-w-[80%] text-sm font-medium leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'}`}>
                      {m.text}
                   </div>
                </div>
             ))}
             {isProcessing && (
                <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0"><Bot size={14} /></div>
                   <div className="p-4 rounded-2xl rounded-tl-none bg-white border border-slate-200 shadow-sm flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-slate-400" /> <span className="text-xs font-bold text-slate-400">Typing...</span>
                   </div>
                </div>
             )}
             <div ref={messagesEndRef} />
          </div>
       </div>
    </div>
  );
};

export default Interview;