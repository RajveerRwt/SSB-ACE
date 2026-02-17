
import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle, AlertTriangle, ChevronRight, ChevronLeft, Flag, HelpCircle, Loader2, Play, Lock, RefreshCw, Send, MessageSquare, Lightbulb, X, Coins, Maximize2, Trophy, Flame, Timer, Skull, Crown, Medal, Share2, Linkedin, Twitter, Instagram, Filter, Target } from 'lucide-react';
import { getOIRSets, getOIRQuestions, getOIRDoubts, postOIRDoubt, checkAuthSession, TEST_RATES, getOIRLeaderboard, getAllOIRQuestionsRandom, saveTestAttempt } from '../services/supabaseService';

interface OIRTestProps {
  onConsumeCoins?: (cost: number) => Promise<boolean>;
  isGuest?: boolean;
  onLoginRedirect?: () => void;
  onExit: () => void;
}

const OIRTest: React.FC<OIRTestProps> = ({ onConsumeCoins, isGuest = false, onLoginRedirect, onExit }) => {
  const [sets, setSets] = useState<any[]>([]);
  const [activeSet, setActiveSet] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [mode, setMode] = useState<'LOBBY' | 'TEST' | 'SUDDEN_DEATH' | 'RESULT' | 'LEADERBOARD'>('LOBBY');
  const [isLoading, setIsLoading] = useState(true);
  const [doubts, setDoubts] = useState<any[]>([]);
  const [doubtInput, setDoubtInput] = useState('');
  const [isSubmittingDoubt, setIsSubmittingDoubt] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'SETS' | 'SUDDEN_DEATH' | 'LEADERBOARD'>('SETS');
  const [leaderboardMode, setLeaderboardMode] = useState<'STANDARD' | 'SUDDEN_DEATH'>('STANDARD');
  const [filterSetId, setFilterSetId] = useState<string>('ALL');

  // Sudden Death State
  const [suddenDeathScore, setSuddenDeathScore] = useState(0);
  const [suddenDeathLife, setSuddenDeathLife] = useState(true);

  useEffect(() => {
    loadSets();
    checkAuthSession().then(u => setCurrentUser(u));
  }, []);

  const loadSets = async () => {
    try {
      const data = await getOIRSets();
      setSets(data);
    } catch (e) {
      console.error("Failed to load OIR sets");
    } finally {
      setIsLoading(false);
    }
  };

  const loadLeaderboard = async () => {
      setIsLoading(true);
      const setId = filterSetId !== 'ALL' ? filterSetId : undefined;
      const data = await getOIRLeaderboard(leaderboardMode, setId);
      setLeaderboard(data);
      setIsLoading(false);
  };

  useEffect(() => {
      if (activeTab === 'LEADERBOARD') {
          loadLeaderboard();
      }
  }, [activeTab, leaderboardMode, filterSetId]);

  const handleShare = async (score: number, total: number | string, modeText: string) => {
      const text = `I just scored ${score}/${total} in ${modeText} on SSBPREP.ONLINE! Can you beat my rank? #SSB #OIR #Defense`;
      const url = "https://ssbprep.online";
      
      if (navigator.share) {
          try {
              await navigator.share({
                  title: 'SSB OIR Score',
                  text: text,
                  url: url,
              });
          } catch (error) {
              console.log('Error sharing', error);
          }
      } else {
          // Fallback
          alert("Sharing not supported on this browser. Link copied to clipboard!");
          navigator.clipboard.writeText(`${text} ${url}`);
      }
  };

  const handleWhatsAppShare = (score: number, total: number | string, modeText: string) => {
      const text = `I just scored ${score}/${total} in ${modeText} on SSBPREP.ONLINE! Can you beat my rank?`;
      const url = `https://wa.me/?text=${encodeURIComponent(text + " https://ssbprep.online")}`;
      window.open(url, '_blank');
  };

  const startTest = async (set: any) => {
    if (isGuest) {
       onLoginRedirect?.();
       return;
    }

    if (onConsumeCoins) {
        // Standard OIR Cost: 10 Coins
        const success = await onConsumeCoins(TEST_RATES.OIR);
        if (!success) return;
    }

    setIsLoading(true);
    try {
        const qs = await getOIRQuestions(set.id);
        setQuestions(qs);
        setUserAnswers(new Array(qs.length).fill(-1));
        setActiveSet(set);
        setTimeLeft(set.time_limit_seconds);
        setMode('TEST');
    } catch (e) {
        alert("Failed to load questions.");
    } finally {
        setIsLoading(false);
    }
  };

  const startSuddenDeath = async () => {
      if (isGuest) {
          onLoginRedirect?.();
          return;
      }
      
      if (onConsumeCoins) {
          // Sudden Death Cost: 5 Coins
          const success = await onConsumeCoins(TEST_RATES.OIR_SUDDEN_DEATH);
          if (!success) return;
      }

      setIsLoading(true);
      try {
          const qs = await getAllOIRQuestionsRandom(50); // Get 50 random Qs
          if (qs.length === 0) {
              alert("Not enough questions for Sudden Death mode.");
              setIsLoading(false);
              return;
          }
          setQuestions(qs);
          setUserAnswers([]); // Not needed for SD logic, we track score directly
          setSuddenDeathScore(0);
          setSuddenDeathLife(true);
          setCurrentQIndex(0);
          setActiveSet({ title: "Sudden Death Protocol" });
          setTimeLeft(10); // 10 seconds per question
          setMode('SUDDEN_DEATH');
      } catch (e) {
          alert("Failed to init Sudden Death");
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
    let timer: any;
    
    // STANDARD TEST TIMER
    if (mode === 'TEST' && timeLeft > 0) {
        timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    submitTest();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    } 
    // SUDDEN DEATH TIMER (Per Question)
    else if (mode === 'SUDDEN_DEATH' && timeLeft > 0 && suddenDeathLife) {
        timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    // Time run out in SD = Game Over
                    handleSuddenDeathOver();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }

    return () => clearInterval(timer);
  }, [mode, timeLeft, suddenDeathLife]);

  const submitTest = async () => {
      setMode('RESULT');
      // Save Result if not guest
      if (currentUser) {
          const res = calculateResults();
          const resultData = {
              oir: res.oir,
              percentage: res.percentage,
              totalQuestions: questions.length,
              correct: res.score,
              setId: activeSet?.id // IMPORTANT: Save Set ID for filtering
          };
          await saveTestAttempt(currentUser.id, 'OIR', { score: res.score, ...resultData });
      }
      
      // Load doubts for first question immediately
      if (questions.length > 0) loadDoubts(questions[0].id);
  };

  const handleSuddenDeathAnswer = (optionIndex: number) => {
      const currentQ = questions[currentQIndex];
      if (optionIndex === currentQ.correct_index) {
          // Correct
          setSuddenDeathScore(prev => prev + 1);
          if (currentQIndex + 1 < questions.length) {
              setCurrentQIndex(prev => prev + 1);
              setTimeLeft(10); // Reset timer for next Q
          } else {
              // Finished all available questions
              handleSuddenDeathOver(true);
          }
      } else {
          // Wrong
          handleSuddenDeathOver();
      }
  };

  const handleSuddenDeathOver = async (completed = false) => {
      setSuddenDeathLife(false);
      setMode('RESULT'); // Reuse result screen but customize
      // Save Score
      if (currentUser) {
          await saveTestAttempt(currentUser.id, 'OIR_SUDDEN_DEATH', { score: suddenDeathScore, completed });
      }
  };

  const calculateResults = () => {
      if (mode === 'SUDDEN_DEATH' || !suddenDeathLife) {
          // Determine OIR for SD based on score thresholds (arbitrary for fun)
          let oir = 5;
          if (suddenDeathScore > 20) oir = 1;
          else if (suddenDeathScore > 15) oir = 2;
          else if (suddenDeathScore > 10) oir = 3;
          else if (suddenDeathScore > 5) oir = 4;
          return { score: suddenDeathScore, percentage: 0, oir, isSuddenDeath: true };
      }

      let score = 0;
      questions.forEach((q, i) => {
          if (userAnswers[i] === q.correct_index) score++;
      });
      const percentage = (score / questions.length) * 100;
      let oir = 5;
      if (percentage >= 90) oir = 1;
      else if (percentage >= 80) oir = 2;
      else if (percentage >= 60) oir = 3;
      else if (percentage >= 40) oir = 4;
      
      return { score, percentage, oir, isSuddenDeath: false };
  };

  const loadDoubts = async (qid: string) => {
      const ds = await getOIRDoubts(qid);
      setDoubts(ds);
  };

  const handlePostDoubt = async () => {
      if (!doubtInput.trim() || !questions[currentQIndex]) return;
      setIsSubmittingDoubt(true);
      try {
          const userName = currentUser?.user_metadata?.full_name || 'Cadet';
          await postOIRDoubt(questions[currentQIndex].id, currentUser?.id, userName, doubtInput);
          setDoubtInput('');
          loadDoubts(questions[currentQIndex].id);
      } catch (e) {
          alert("Failed to post doubt.");
      } finally {
          setIsSubmittingDoubt(false);
      }
  };

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) return <div className="flex justify-center py-40"><Loader2 className="animate-spin" size={40} /></div>;

  if (mode === 'LOBBY') {
      return (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
              <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center border-b-8 border-teal-500">
                 <div className="relative z-10 space-y-4">
                    <span className="px-4 py-1.5 bg-teal-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-2 mx-auto w-fit">
                       <Lightbulb size={12} /> Stage 1
                    </span>
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">OIR <span className="text-yellow-400">Testing</span></h1>
                    <p className="text-slate-400 max-w-2xl font-medium leading-relaxed text-sm md:text-base">
                       Officer Intelligence Rating. Speed, logic, and accuracy determine your screening fate.
                    </p>
                 </div>
              </div>

              {/* LOBBY TABS */}
              <div className="flex justify-center gap-4">
                  <button onClick={() => setActiveTab('SETS')} className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${activeTab === 'SETS' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Standard Sets</button>
                  <button onClick={() => setActiveTab('SUDDEN_DEATH')} className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${activeTab === 'SUDDEN_DEATH' ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-red-50 hover:text-red-500'}`}>Sudden Death</button>
                  <button onClick={() => setActiveTab('LEADERBOARD')} className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${activeTab === 'LEADERBOARD' ? 'bg-yellow-400 text-black shadow-lg' : 'bg-white text-slate-500 hover:bg-yellow-50 hover:text-yellow-600'}`}>Leaderboard</button>
              </div>

              {activeTab === 'SETS' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
                      {sets.map(set => (
                          <div key={set.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all">
                              <h3 className="text-xl font-black text-slate-900 uppercase mb-2">{set.title}</h3>
                              <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mb-6">
                                  <span className="flex items-center gap-1"><Clock size={14}/> {Math.floor(set.time_limit_seconds/60)} Mins</span>
                              </div>
                              <button 
                                onClick={() => startTest(set)}
                                className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all flex items-center justify-center gap-2"
                              >
                                  {isGuest ? <Lock size={14}/> : <Play size={14}/>} Start Test 
                                  {!isGuest && <span className="ml-2 bg-yellow-400 text-black px-2 py-0.5 rounded text-[9px] flex items-center gap-1"><Coins size={8}/> {TEST_RATES.OIR}</span>}
                              </button>
                          </div>
                      ))}
                  </div>
              )}

              {activeTab === 'SUDDEN_DEATH' && (
                  <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 text-center animate-in zoom-in duration-300">
                      <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
                          <Skull size={40} />
                      </div>
                      <h3 className="text-3xl font-black text-red-900 uppercase tracking-tighter mb-4">Sudden Death Mode</h3>
                      <p className="text-red-700 font-medium max-w-md mx-auto mb-8">
                          High Stakes. 10 Seconds per Question. One wrong answer and it's Game Over. How long can you survive?
                      </p>
                      <button 
                        onClick={startSuddenDeath}
                        className="px-12 py-5 bg-red-600 text-white rounded-full font-black uppercase tracking-[0.2em] shadow-xl hover:bg-red-700 hover:scale-105 transition-all flex items-center justify-center gap-3 mx-auto"
                      >
                          <Flame size={20} /> Enter The Arena
                          {!isGuest && <span className="ml-2 bg-white text-red-600 px-2 py-0.5 rounded text-[9px] flex items-center gap-1"><Coins size={8}/> {TEST_RATES.OIR_SUDDEN_DEATH}</span>}
                      </button>
                  </div>
              )}

              {activeTab === 'LEADERBOARD' && (
                  <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4">
                      <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-4">
                          <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                              <Trophy className="text-yellow-400" /> Leaderboard
                          </h3>
                          
                          <div className="flex gap-2">
                              {/* MODE SWITCHER */}
                              <div className="flex bg-slate-800 rounded-xl p-1">
                                  <button 
                                    onClick={() => { setLeaderboardMode('STANDARD'); setFilterSetId('ALL'); }}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${leaderboardMode === 'STANDARD' ? 'bg-yellow-400 text-black' : 'text-slate-400 hover:text-white'}`}
                                  >
                                      Standard
                                  </button>
                                  <button 
                                    onClick={() => { setLeaderboardMode('SUDDEN_DEATH'); setFilterSetId('ALL'); }}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${leaderboardMode === 'SUDDEN_DEATH' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                  >
                                      Sudden Death
                                  </button>
                              </div>

                              {/* SET SELECTOR (Only for Standard) */}
                              {leaderboardMode === 'STANDARD' && (
                                  <div className="relative">
                                      <select 
                                        value={filterSetId}
                                        onChange={(e) => setFilterSetId(e.target.value)}
                                        className="appearance-none bg-slate-800 text-white pl-4 pr-10 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none hover:bg-slate-700 transition-all border border-slate-700 cursor-pointer"
                                      >
                                          <option value="ALL">All Sets</option>
                                          {sets.map(s => (
                                              <option key={s.id} value={s.id}>{s.title}</option>
                                          ))}
                                      </select>
                                      <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                  </div>
                              )}
                          </div>
                      </div>
                      
                      <div className="p-0 md:p-6">
                          {leaderboard.length === 0 ? (
                              <div className="text-center py-20 bg-slate-50 rounded-3xl m-6 border border-slate-100">
                                  <Trophy size={48} className="mx-auto text-slate-300 mb-4" />
                                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No rankings available for this filter.</p>
                              </div>
                          ) : (
                              <div className="space-y-3">
                                  {leaderboard.map((entry, i) => (
                                      <div key={i} className={`flex items-center justify-between p-4 md:p-5 rounded-2xl md:rounded-3xl border-2 transition-all hover:scale-[1.01] ${i === 0 ? 'bg-yellow-50 border-yellow-400 shadow-lg' : i === 1 ? 'bg-slate-50 border-slate-300 shadow-md' : i === 2 ? 'bg-orange-50 border-orange-300 shadow-md' : 'bg-white border-slate-100 hover:shadow-md'}`}>
                                          <div className="flex items-center gap-4 md:gap-6">
                                              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-sm md:text-lg shrink-0 ${i === 0 ? 'bg-yellow-400 text-black shadow-lg' : i === 1 ? 'bg-slate-300 text-slate-800' : i === 2 ? 'bg-orange-400 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                  {i + 1}
                                              </div>
                                              <div className="flex items-center gap-3 md:gap-4">
                                                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase ${i === 0 ? 'bg-slate-900' : 'bg-slate-400'}`}>
                                                      {entry.name?.[0] || 'U'}
                                                  </div>
                                                  <div>
                                                      <h4 className={`font-bold text-sm md:text-base leading-tight ${i < 3 ? 'text-slate-900' : 'text-slate-700'}`}>{entry.name}</h4>
                                                      <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{new Date(entry.date).toLocaleDateString()}</p>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <span className={`block text-xl md:text-3xl font-black ${i === 0 ? 'text-yellow-600' : 'text-slate-900'}`}>{entry.score}</span>
                                              {leaderboardMode === 'STANDARD' ? (
                                                  <span className={`text-[8px] md:text-[9px] font-bold uppercase px-2 py-0.5 rounded ${entry.oirRating === 1 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>OIR {entry.oirRating}</span>
                                              ) : (
                                                  <span className="text-[8px] md:text-[9px] font-bold uppercase text-red-500 tracking-widest">Streak</span>
                                              )}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              )}

              <button onClick={onExit} className="mx-auto block text-slate-400 font-bold uppercase text-xs tracking-widest hover:text-slate-600 mt-8">Back to Dashboard</button>
          </div>
      );
  }

  // --- SUDDEN DEATH INTERFACE ---
  if (mode === 'SUDDEN_DEATH') {
      const currentQ = questions[currentQIndex];
      return (
          <div className="max-w-6xl mx-auto py-12 md:py-10 animate-in zoom-in duration-300">
              <div className="bg-red-600 text-white p-4 rounded-t-3xl flex justify-between items-center shadow-lg relative z-10">
                  <div className="flex items-center gap-2">
                      <Skull size={20} className="animate-pulse" />
                      <span className="font-black uppercase tracking-widest text-xs">Sudden Death</span>
                  </div>
                  <div className="font-mono font-black text-2xl">{timeLeft}s</div>
              </div>
              
              <div className="bg-white p-8 rounded-b-[2.5rem] rounded-tr-[2.5rem] shadow-2xl border-4 border-red-600 relative overflow-hidden">
                  <div className="absolute top-4 right-6 flex flex-col items-center z-10">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Streak</span>
                      <span className="text-3xl font-black text-red-600">{suddenDeathScore}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      {/* Left: Question/Image */}
                      <div className="flex flex-col items-center md:items-start text-center md:text-left">
                          {currentQ.image_url && (
                              <div 
                                className="mb-6 flex justify-center relative group cursor-zoom-in w-full"
                                onClick={() => setZoomedImage(currentQ.image_url)}
                              >
                                  <img src={currentQ.image_url} className="max-h-64 md:max-h-80 object-contain rounded-xl border border-slate-200" alt="Question" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-all rounded-xl">
                                      <Maximize2 className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" size={32} />
                                  </div>
                              </div>
                          )}
                          {currentQ.question_text && (
                              <h3 className="text-lg md:text-2xl font-bold text-slate-800 mb-8 leading-relaxed pr-16">{currentQ.question_text}</h3>
                          )}
                      </div>

                      {/* Right: Options */}
                      <div className="grid grid-cols-1 gap-3">
                          {currentQ.options.map((opt: string, idx: number) => (
                              <button
                                key={idx}
                                onClick={() => handleSuddenDeathAnswer(idx)}
                                className="p-4 md:p-6 rounded-xl text-left font-bold text-sm md:text-base transition-all border-2 border-slate-100 hover:border-red-200 hover:bg-red-50 active:scale-95 shadow-sm hover:shadow-md"
                              >
                                  <span className="mr-3 font-black text-slate-400">{String.fromCharCode(65 + idx)}.</span>
                                  {opt}
                              </button>
                          ))}
                      </div>
                  </div>
                  
                  {/* Progress Bar for Timer */}
                  <div className="absolute bottom-0 left-0 h-2 bg-red-100 w-full">
                      <div 
                        className="h-full bg-red-600 transition-all duration-1000 ease-linear" 
                        style={{ width: `${(timeLeft / 10) * 100}%` }}
                      />
                  </div>
              </div>

              {/* Zoom Modal */}
              {zoomedImage && (
                  <div 
                    className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setZoomedImage(null)}
                  >
                      <button 
                        onClick={() => setZoomedImage(null)} 
                        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                      >
                          <X size={24} />
                      </button>
                      
                      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                         <img 
                            src={zoomedImage} 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default" 
                            onClick={(e) => e.stopPropagation()} 
                            alt="Zoomed Question"
                         />
                         <p className="absolute bottom-6 text-white/50 text-xs font-bold uppercase tracking-widest pointer-events-none">
                            Click outside to close
                         </p>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // STANDARD TEST INTERFACE
  if (mode === 'TEST') {
      const currentQ = questions[currentQIndex];
      return (
          <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
              {/* Top Bar */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center sticky top-4 z-20">
                  <div>
                      <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">{activeSet.title}</h4>
                      <p className="text-[10px] font-bold text-slate-400">Question {currentQIndex + 1} / {questions.length}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-xl font-mono font-black text-xl ${timeLeft < 60 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-900 text-white'}`}>
                      {formatTime(timeLeft)}
                  </div>
              </div>

              {/* Question Area */}
              <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-100 min-h-[400px] flex flex-col">
                  {currentQ.image_url && (
                      <div 
                        className="mb-6 flex justify-center relative group cursor-zoom-in"
                        onClick={() => setZoomedImage(currentQ.image_url)}
                      >
                          <img src={currentQ.image_url} className="max-h-64 md:max-h-96 object-contain rounded-xl border border-slate-200" alt="Question" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-all rounded-xl">
                              <Maximize2 className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" size={32} />
                          </div>
                      </div>
                  )}
                  {currentQ.question_text && (
                      <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-8 leading-relaxed">{currentQ.question_text}</h3>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
                      {currentQ.options.map((opt: string, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => {
                                const newAns = [...userAnswers];
                                newAns[currentQIndex] = idx;
                                setUserAnswers(newAns);
                            }}
                            className={`p-4 rounded-xl text-left font-bold text-sm transition-all border-2 ${userAnswers[currentQIndex] === idx ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-100 hover:border-slate-300 bg-slate-50'}`}
                          >
                              <span className="mr-3 font-black text-slate-400">{String.fromCharCode(65 + idx)}.</span>
                              {opt}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Nav Bar */}
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100">
                  <button 
                    disabled={currentQIndex === 0}
                    onClick={() => setCurrentQIndex(prev => prev - 1)}
                    className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-xs tracking-widest disabled:opacity-50 hover:bg-slate-200"
                  >
                      Prev
                  </button>
                  
                  {/* Quick Nav Grid */}
                  <div className="hidden md:flex gap-1">
                      {questions.map((_, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full ${i === currentQIndex ? 'bg-slate-900 scale-125' : userAnswers[i] !== -1 ? 'bg-teal-500' : 'bg-slate-200'}`} />
                      ))}
                  </div>

                  {currentQIndex === questions.length - 1 ? (
                      <button 
                        onClick={submitTest}
                        className="px-8 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-700 shadow-lg"
                      >
                          Submit Test
                      </button>
                  ) : (
                      <button 
                        onClick={() => setCurrentQIndex(prev => prev + 1)}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black"
                      >
                          Next
                      </button>
                  )}
              </div>

              {/* Zoom Modal */}
              {zoomedImage && (
                  <div 
                    className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setZoomedImage(null)}
                  >
                      <button 
                        onClick={() => setZoomedImage(null)} 
                        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                      >
                          <X size={24} />
                      </button>
                      
                      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                         <img 
                            src={zoomedImage} 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default" 
                            onClick={(e) => e.stopPropagation()} 
                            alt="Zoomed Question"
                         />
                         <p className="absolute bottom-6 text-white/50 text-xs font-bold uppercase tracking-widest pointer-events-none">
                            Click outside to close
                         </p>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // RESULT MODE
  const results = calculateResults();
  
  if (results.isSuddenDeath) {
      return (
          <div className="max-w-xl mx-auto py-20 text-center animate-in zoom-in duration-500">
              <div className="bg-slate-900 text-white p-12 rounded-[3rem] shadow-2xl border-4 border-slate-800 relative overflow-hidden">
                  <div className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none"></div>
                  <div className="relative z-10">
                      <Skull size={64} className="mx-auto text-red-500 mb-6" />
                      <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">Game Over</h2>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-8">You survived {results.score} rounds</p>
                      
                      <div className="bg-white/10 p-6 rounded-2xl border border-white/10 mb-8">
                          <span className="block text-6xl font-black text-yellow-400">{results.score}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Score Streak</span>
                      </div>

                      {/* SOCIAL SHARE */}
                      <div className="flex gap-4 justify-center mb-8">
                          <button 
                            onClick={() => handleShare(results.score, 'Infinity', 'Sudden Death')}
                            className="p-3 bg-[#1DA1F2] hover:bg-[#1a91da] text-white rounded-full transition-all hover:scale-110 shadow-lg"
                            title="Share on Twitter"
                          >
                              <Twitter size={20} fill="currentColor" />
                          </button>
                          <button 
                            onClick={() => handleWhatsAppShare(results.score, 'Infinity', 'Sudden Death')}
                            className="p-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full transition-all hover:scale-110 shadow-lg"
                            title="Share on WhatsApp"
                          >
                              <Share2 size={20} />
                          </button>
                          <button 
                            onClick={() => handleShare(results.score, 'Infinity', 'Sudden Death')}
                            className="p-3 bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 text-white rounded-full transition-all hover:scale-110 shadow-lg"
                            title="Share via Instagram / More"
                          >
                              <Instagram size={20} />
                          </button>
                      </div>

                      <button onClick={() => setMode('LOBBY')} className="w-full py-4 bg-white text-slate-900 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">
                          Return to Lobby
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  const currentReviewQ = questions[currentQIndex];

  return (
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
          {/* Score Card */}
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
              <div className="relative z-10 text-center md:text-left">
                  <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">Test Complete</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">OIR Rating Generated</p>
                  <div className="mt-6 flex gap-4 justify-center md:justify-start">
                      <div className="bg-white/10 p-4 rounded-2xl text-center min-w-[100px]">
                          <span className="block text-2xl font-black text-yellow-400">{results.score}/{questions.length}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Score</span>
                      </div>
                      <div className="bg-white/10 p-4 rounded-2xl text-center min-w-[100px]">
                          <span className="block text-2xl font-black text-teal-400">OIR {results.oir}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rating</span>
                      </div>
                  </div>
                  {/* Share Buttons Standard */}
                  <div className="flex gap-3 mt-6 justify-center md:justify-start">
                      <button 
                        onClick={() => handleWhatsAppShare(results.score, questions.length, 'OIR Test')}
                        className="flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all"
                      >
                          <Share2 size={14} /> WhatsApp
                      </button>
                      <button 
                        onClick={() => handleShare(results.score, questions.length, 'OIR Test')}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all"
                      >
                          <Instagram size={14} /> Share
                      </button>
                  </div>
              </div>
              <div className="relative z-10 w-32 h-32 flex items-center justify-center bg-white rounded-full text-slate-900 font-black text-3xl shadow-2xl border-4 border-slate-700">
                  {results.percentage.toFixed(0)}%
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Review Panel */}
              <div className="md:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black uppercase tracking-widest text-slate-900">Review: Question {currentQIndex + 1}</h3>
                      <div className="flex gap-2">
                          <button onClick={() => { setCurrentQIndex(Math.max(0, currentQIndex-1)); loadDoubts(questions[Math.max(0, currentQIndex-1)].id); }} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200"><ChevronLeft size={16}/></button>
                          <button onClick={() => { setCurrentQIndex(Math.min(questions.length-1, currentQIndex+1)); loadDoubts(questions[Math.min(questions.length-1, currentQIndex+1)].id); }} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200"><ChevronRight size={16}/></button>
                      </div>
                  </div>

                  {currentReviewQ.image_url && (
                      <div 
                        className="mb-6 flex justify-center relative group cursor-zoom-in"
                        onClick={() => setZoomedImage(currentReviewQ.image_url)}
                      >
                        <img src={currentReviewQ.image_url} className="max-h-48 object-contain rounded-xl border border-slate-200 mx-auto" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-all rounded-xl">
                              <Maximize2 className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" size={24} />
                        </div>
                      </div>
                  )}
                  <p className="font-bold text-lg text-slate-800 mb-6">{currentReviewQ.question_text}</p>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                      {currentReviewQ.options.map((opt: string, i: number) => {
                          let style = "bg-slate-50 border-slate-100";
                          if (i === currentReviewQ.correct_index) style = "bg-green-100 border-green-300 text-green-800";
                          else if (i === userAnswers[currentQIndex] && i !== currentReviewQ.correct_index) style = "bg-red-100 border-red-300 text-red-800";
                          
                          return (
                              <div key={i} className={`p-3 rounded-xl border-2 font-bold text-sm ${style}`}>
                                  {opt} {i === currentReviewQ.correct_index && <CheckCircle size={14} className="inline ml-2"/>}
                              </div>
                          );
                      })}
                  </div>

                  {/* Doubt Section */}
                  <div className="border-t border-slate-100 pt-6">
                      <h4 className="font-black uppercase tracking-widest text-xs text-slate-400 mb-4 flex items-center gap-2">
                          <HelpCircle size={14} /> Discussions
                      </h4>
                      <div className="flex gap-2 mb-4">
                          <input 
                            value={doubtInput} 
                            onChange={e => setDoubtInput(e.target.value)} 
                            placeholder="Ask a doubt regarding this question..."
                            className="flex-1 p-3 bg-slate-50 rounded-xl text-sm font-medium outline-none border border-slate-200 focus:border-slate-400 transition-all"
                          />
                          <button onClick={handlePostDoubt} disabled={isSubmittingDoubt} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-all">
                              {isSubmittingDoubt ? <Loader2 className="animate-spin" size={16}/> : <Send size={16} />}
                          </button>
                      </div>
                      <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                          {doubts.length === 0 ? <p className="text-slate-400 text-xs italic">No doubts raised yet.</p> : doubts.map((d: any) => (
                              <div key={d.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm">
                                  <span className="font-bold text-slate-900 text-xs block mb-1">{d.user_name}</span>
                                  <span className="text-slate-600">{d.comment}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              {/* Status Grid */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl h-fit">
                  <h3 className="font-black uppercase tracking-widest text-slate-900 mb-6">Question Matrix</h3>
                  <div className="grid grid-cols-5 gap-2">
                      {questions.map((q, i) => (
                          <button 
                            key={i} 
                            onClick={() => { setCurrentQIndex(i); loadDoubts(q.id); }}
                            className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                                i === currentQIndex ? 'ring-2 ring-slate-900' : ''
                            } ${
                                userAnswers[i] === q.correct_index 
                                ? 'bg-green-500 text-white' 
                                : userAnswers[i] === -1 ? 'bg-slate-200 text-slate-500' : 'bg-red-500 text-white'
                            }`}
                          >
                              {i + 1}
                          </button>
                      ))}
                  </div>
                  <div className="mt-8 flex flex-col gap-2 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"/> Correct</span>
                      <span className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"/> Incorrect</span>
                      <span className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-200 rounded-full"/> Skipped</span>
                  </div>
                  <button onClick={onExit} className="w-full mt-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black">
                      Exit Review
                  </button>
              </div>
          </div>

          {/* Zoom Modal - Reused from Test Mode */}
          {zoomedImage && (
              <div 
                className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                onClick={() => setZoomedImage(null)}
              >
                  <button 
                    onClick={() => setZoomedImage(null)} 
                    className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                  >
                      <X size={24} />
                  </button>
                  
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                      <img 
                        src={zoomedImage} 
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default" 
                        onClick={(e) => e.stopPropagation()} 
                        alt="Zoomed Question"
                      />
                      <p className="absolute bottom-6 text-white/50 text-xs font-bold uppercase tracking-widest pointer-events-none">
                        Click outside to close
                      </p>
                  </div>
              </div>
          )}
      </div>
  );
};

export default OIRTest;
