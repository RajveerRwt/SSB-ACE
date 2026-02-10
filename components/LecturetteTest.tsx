
import React, { useState, useEffect, useRef } from 'react';
import { Mic, BookOpen, Loader2, Play, X, Clock, AlertTriangle, CheckCircle, Volume2, Award, Activity, StopCircle, RefreshCw, Layout, FileAudio } from 'lucide-react';
import { generateLecturette, evaluateLecturette } from '../services/geminiService';

const LECTURETTE_TOPICS = [
    { title: "Indo-US Relations", difficulty: "High", category: "International" },
    { title: "Women in Combat Roles", difficulty: "Medium", category: "Social" },
    { title: "Cyber Warfare", difficulty: "High", category: "Technology" },
    { title: "Atmanirbhar Bharat in Defense", difficulty: "Medium", category: "National" },
    { title: "Climate Change & Security", difficulty: "Low", category: "Global" },
    { title: "Role of Youth in Nation Building", difficulty: "Low", category: "Social" },
    { title: "Artificial Intelligence in Modern Warfare", difficulty: "High", category: "Tech" },
    { title: "India's Nuclear Policy", difficulty: "High", category: "Defense" },
    { title: "NEP 2020", difficulty: "Medium", category: "Education" },
    { title: "G20 Presidency Impact", difficulty: "Medium", category: "International" },
];

const LecturetteTest: React.FC = () => {
  const [selectedLecturette, setSelectedLecturette] = useState<string | null>(null);
  const [lecturetteContent, setLecturetteContent] = useState<any>(null);
  const [loadingLecturette, setLoadingLecturette] = useState(false);
  const [lecturetteTimer, setLecturetteTimer] = useState(180); // Preparation Timer
  const [speechTimer, setSpeechTimer] = useState(0); // Speech Duration
  const [isPrepTimerRunning, setIsPrepTimerRunning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // Media Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const playBuzzer = (freq: number = 200, duration: number = 0.5) => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  // Preparation Timer Logic
  useEffect(() => {
    let interval: any;
    if (isPrepTimerRunning && lecturetteTimer > 0) {
        interval = setInterval(() => {
            setLecturetteTimer(prev => {
                const val = prev - 1;
                if (val === 30) playBuzzer(400, 0.5); // Warning
                return val;
            });
        }, 1000);
    } else if (lecturetteTimer === 0 && isPrepTimerRunning) {
        setIsPrepTimerRunning(false);
        playBuzzer(200, 1.0);
    }
    return () => clearInterval(interval);
  }, [isPrepTimerRunning, lecturetteTimer]);

  // Speech Timer Logic
  useEffect(() => {
      let interval: any;
      if (isRecording) {
          interval = setInterval(() => {
              setSpeechTimer(prev => prev + 1);
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [isRecording]);

  const handleLecturetteClick = async (topic: string) => {
      setSelectedLecturette(topic);
      setLecturetteContent(null);
      setLoadingLecturette(true);
      setLecturetteTimer(180);
      setSpeechTimer(0);
      setIsPrepTimerRunning(false);
      setFeedback(null);
      setAudioUrl(null);
      transcriptRef.current = "";
      
      try {
          const content = await generateLecturette(topic);
          setLecturetteContent(content);
      } catch (e) {
          console.error("Failed to gen lecturette", e);
      } finally {
          setLoadingLecturette(false);
      }
  };

  const handleClose = () => {
      setSelectedLecturette(null);
      setIsPrepTimerRunning(false);
      setIsRecording(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) recognitionRef.current.stop();
  };

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          setIsPrepTimerRunning(false);
          setIsRecording(true);
          setSpeechTimer(0);
          setAudioUrl(null);
          transcriptRef.current = "";
          audioChunksRef.current = [];

          // 1. Start Audio Recording for Playback
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          
          mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                  audioChunksRef.current.push(event.data);
              }
          };

          mediaRecorder.start();

          // 2. Start Speech Recognition for Analysis
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          if (SpeechRecognition) {
              const recognition = new SpeechRecognition();
              recognitionRef.current = recognition;
              recognition.continuous = true;
              recognition.interimResults = true;
              recognition.lang = 'en-IN';

              recognition.onresult = (event: any) => {
                  let finalTranscript = '';
                  for (let i = event.resultIndex; i < event.results.length; ++i) {
                      if (event.results[i].isFinal) {
                          finalTranscript += event.results[i][0].transcript + " ";
                      }
                  }
                  if (finalTranscript) {
                      transcriptRef.current += finalTranscript;
                  }
              };
              recognition.start();
          } else {
              console.warn("Speech Recognition API not supported");
          }

      } catch (err) {
          console.error("Microphone Access Denied", err);
          alert("Microphone access is required for the Lecturette test.");
      }
  };

  const stopRecording = async () => {
      setIsRecording(false);
      
      // Stop Recognition
      if (recognitionRef.current) recognitionRef.current.stop();
      
      // Stop Media Recorder
      if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.onstop = async () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const url = URL.createObjectURL(audioBlob);
              setAudioUrl(url);
              
              // Proceed to Evaluation
              handleEvaluation();
          };
      } else {
          handleEvaluation();
      }
  };

  const handleEvaluation = async () => {
      setIsEvaluating(true);
      try {
          const result = await evaluateLecturette(selectedLecturette || "Topic", transcriptRef.current, speechTimer);
          setFeedback(result);
      } catch (e) {
          console.error("Eval failed", e);
      } finally {
          setIsEvaluating(false);
      }
  };

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700 relative">
      
      {/* HEADER */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center border-b-8 border-purple-500">
         <div className="relative z-10 space-y-4">
            <span className="px-4 py-1.5 bg-purple-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-2 mx-auto w-fit">
               <Mic size={12} /> GTO Task 3
            </span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Lecturette <span className="text-yellow-400">Simulator</span></h1>
            <p className="text-slate-400 max-w-2xl font-medium leading-relaxed text-sm md:text-base">
               3 Mins Preparation • 3 Mins Speech. The AI GTO evaluates your Content, Structure, Fluency, and Body Language (via self-correction).
            </p>
         </div>
         <div className="absolute top-0 right-0 p-8 opacity-5">
             <Mic size={200} />
         </div>
      </div>

      {/* TOPIC LIST */}
      {!selectedLecturette && (
          <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-xl">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-6 mb-6">
                  <div>
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Topic Cards</h3>
                      <p className="text-slate-500 text-xs font-bold mt-2">Pick a card to enter the simulation room.</p>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {LECTURETTE_TOPICS.map((topic, i) => (
                      <div 
                        key={i} 
                        onClick={() => handleLecturetteClick(topic.title)}
                        className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all group shadow-sm hover:shadow-lg"
                      >
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-purple-600 group-hover:text-white transition-colors font-black text-xs">
                                  {i + 1}
                              </div>
                              <div>
                                  <h5 className="font-bold text-slate-900 text-sm group-hover:text-purple-900">{topic.title}</h5>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{topic.category}</span>
                              </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${topic.difficulty === 'High' ? 'bg-red-100 text-red-700' : topic.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                              {topic.difficulty}
                          </span>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* SIMULATION MODAL */}
      {selectedLecturette && (
          <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-[2.5rem] w-full max-w-6xl max-h-[90vh] flex flex-col md:flex-row shadow-2xl overflow-hidden relative">
                  <button 
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-red-500 hover:text-white text-slate-400 rounded-full transition-all z-50"
                  >
                      <X size={24} />
                  </button>

                  {/* LEFT: AUDIO VISUALIZER */}
                  <div className="w-full md:w-1/2 bg-slate-900 relative flex flex-col justify-center items-center overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black pointer-events-none"></div>
                      
                      <div className="relative z-10 text-center space-y-8">
                          <div className={`w-40 h-40 rounded-full flex items-center justify-center border-8 transition-all duration-500 ${isRecording ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)] bg-red-900/20' : 'border-slate-800 bg-slate-800'}`}>
                              <Mic size={64} className={`${isRecording ? 'text-red-500 animate-pulse' : 'text-slate-600'}`} />
                          </div>
                          
                          <div>
                              {isRecording ? (
                                  <>
                                    <div className="text-6xl font-mono font-black text-white drop-shadow-lg tracking-tighter mb-2">
                                        {formatTime(speechTimer)}
                                    </div>
                                    <p className="text-red-500 font-black uppercase tracking-[0.5em] text-xs animate-pulse">Recording On Air</p>
                                  </>
                              ) : (
                                  <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs">Microphone Standby</p>
                              )}
                          </div>
                      </div>

                      {/* Waveform Animation */}
                      {isRecording && (
                          <div className="absolute bottom-0 left-0 w-full h-32 flex items-end justify-center gap-1 pb-10 opacity-30">
                              {[...Array(20)].map((_, i) => (
                                  <div 
                                    key={i} 
                                    className="w-2 bg-red-500 rounded-t-full animate-bounce" 
                                    style={{ 
                                        height: `${Math.random() * 80 + 20}%`, 
                                        animationDuration: `${Math.random() * 0.5 + 0.5}s`,
                                        animationDelay: `${i * 0.05}s`
                                    }} 
                                  />
                              ))}
                          </div>
                      )}
                  </div>

                  {/* RIGHT: CONTENT & CONTROLS */}
                  <div className="w-full md:w-1/2 bg-slate-50 flex flex-col relative">
                      {/* EVALUATION VIEW */}
                      {feedback ? (
                          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
                              <div className="flex items-center gap-4 mb-4">
                                  <div className="p-3 bg-slate-900 text-yellow-400 rounded-2xl shadow-lg">
                                      <Award size={32} />
                                  </div>
                                  <div>
                                      <h3 className="text-2xl font-black text-slate-900 uppercase">GTO Assessment</h3>
                                      <p className="text-slate-500 text-xs font-bold">Verdict: <span className={feedback.score >= 6 ? "text-green-600" : "text-red-500"}>{feedback.verdict}</span></p>
                                  </div>
                                  <div className="ml-auto text-4xl font-black text-slate-900">{feedback.score}<span className="text-lg text-slate-400">/10</span></div>
                              </div>

                              {/* AUDIO PLAYER */}
                              {audioUrl && (
                                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                      <div className="flex items-center gap-2 mb-2 text-blue-600">
                                          <FileAudio size={16} />
                                          <span className="text-[10px] font-black uppercase tracking-widest">Your Recording</span>
                                      </div>
                                      <audio controls src={audioUrl} className="w-full h-10" />
                                  </div>
                              )}

                              <div className="grid grid-cols-1 gap-4">
                                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                      <h4 className="font-black text-xs uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-2"><Layout size={14}/> Structure</h4>
                                      <p className="text-sm font-medium text-slate-700">{feedback.structureAnalysis}</p>
                                  </div>
                                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                      <h4 className="font-black text-xs uppercase tracking-widest text-purple-600 mb-2 flex items-center gap-2"><BookOpen size={14}/> Content Depth</h4>
                                      <p className="text-sm font-medium text-slate-700">{feedback.contentAnalysis}</p>
                                  </div>
                                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                      <h4 className="font-black text-xs uppercase tracking-widest text-green-600 mb-2 flex items-center gap-2"><Volume2 size={14}/> Power of Expression</h4>
                                      <p className="text-sm font-medium text-slate-700">{feedback.poeAnalysis}</p>
                                  </div>
                                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                      <h4 className="font-black text-xs uppercase tracking-widest text-orange-600 mb-2 flex items-center gap-2"><Clock size={14}/> Time Management</h4>
                                      <p className="text-sm font-medium text-slate-700">{feedback.timeManagementRemark}</p>
                                  </div>
                              </div>

                              <button onClick={() => { setFeedback(null); setSelectedLecturette(null); }} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all">
                                  End Session
                              </button>
                          </div>
                      ) : isEvaluating ? (
                          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                              <Loader2 className="w-16 h-16 text-slate-900 animate-spin" />
                              <p className="font-black text-slate-500 uppercase tracking-widest text-xs">Analyzing Speech Patterns...</p>
                          </div>
                      ) : (
                          // PREPARATION VIEW
                          <>
                              <div className="p-8 border-b border-slate-200 bg-white">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Topic Card</span>
                                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mt-1">{selectedLecturette}</h3>
                                      </div>
                                      <div className={`text-3xl font-mono font-black ${lecturetteTimer < 30 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
                                          {formatTime(lecturetteTimer)}
                                      </div>
                                  </div>
                              </div>

                              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
                                  {loadingLecturette ? (
                                      <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Generating AI Outline...</p>
                                      </div>
                                  ) : lecturetteContent ? (
                                      <div className={`space-y-6 transition-all duration-500 ${isRecording ? 'blur-md select-none pointer-events-none opacity-50' : ''}`}>
                                          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 block">Intro Idea</span>
                                              <p className="text-sm font-medium text-slate-700">{lecturetteContent.introduction}</p>
                                          </div>
                                          <div className="space-y-2">
                                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Key Points</span>
                                              {lecturetteContent.keyPoints?.map((pt: string, idx: number) => (
                                                  <div key={idx} className="flex gap-3 text-sm font-bold text-slate-800 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                      <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] shrink-0">{idx + 1}</div>
                                                      {pt}
                                                  </div>
                                              ))}
                                          </div>
                                          <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                                              <span className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1 block">Conclusion Idea</span>
                                              <p className="text-sm font-medium text-slate-700">{lecturetteContent.conclusion}</p>
                                          </div>
                                      </div>
                                  ) : (
                                      <p className="text-center text-red-500 font-bold">Failed to load content.</p>
                                  )}
                                  
                                  {isRecording && (
                                      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl text-center border-2 border-red-100">
                                              <p className="text-slate-900 font-black uppercase tracking-widest mb-2">Eyes Up!</p>
                                              <p className="text-slate-500 text-xs font-medium max-w-[200px]">Content hidden. Speak from memory to demonstrate confidence.</p>
                                          </div>
                                      </div>
                                  )}
                              </div>

                              <div className="p-6 border-t border-slate-200 bg-white flex gap-4">
                                  {!isRecording ? (
                                      <>
                                          <button 
                                              onClick={() => setIsPrepTimerRunning(!isPrepTimerRunning)}
                                              className={`flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${isPrepTimerRunning ? 'bg-slate-100 text-slate-600' : 'bg-slate-900 text-white hover:bg-black'}`}
                                          >
                                              {isPrepTimerRunning ? 'Pause Prep' : 'Start Prep Timer'}
                                          </button>
                                          <button 
                                              onClick={startRecording}
                                              className="flex-1 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-700 shadow-lg flex items-center justify-center gap-2"
                                          >
                                              <Mic size={16} /> Start Speech
                                          </button>
                                      </>
                                  ) : (
                                      <button 
                                          onClick={stopRecording}
                                          className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black shadow-lg flex items-center justify-center gap-2"
                                      >
                                          <StopCircle size={16} /> Finish Lecturette
                                      </button>
                                  )}
                              </div>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default LecturetteTest;
