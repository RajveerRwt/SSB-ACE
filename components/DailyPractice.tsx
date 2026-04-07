
import React, { useState, useEffect } from 'react';
import { Loader2, Send, MessageSquare, Clock, User, ImageIcon, FileText, Zap, PenTool, Flame, Trophy, Lock, Heart, Award, Medal, Star, CheckCircle, Mic, RefreshCw, AlertTriangle, Brain, Maximize2, X, Instagram, Youtube } from 'lucide-react';
import { getLatestDailyChallenge, submitDailyEntry, getDailySubmissions, checkAuthSession, toggleLike, getUserStreak, getUserData, updateDailySubmissionAI, supabase, getDailyLeaderboard } from '../services/supabaseService';
import { evaluateDailyChallengeResponse } from '../services/geminiService';
import MentorshipCard from './MentorshipCard';

interface DailyPracticeProps {
    onLoginRedirect?: () => void;
}

const DailyPractice: React.FC<DailyPracticeProps> = ({ onLoginRedirect }) => {
  const [challenge, setChallenge] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userStreak, setUserStreak] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  // Local Like State
  const [likedSubmissions, setLikedSubmissions] = useState<string[]>([]);

  // Form State
  const [oirAnswer, setOirAnswer] = useState(''); 
  const [ppdtStoryFile, setPpdtStoryFile] = useState<File | null>(null);
  const [ppdtSubmissionType, setPpdtSubmissionType] = useState<'text' | 'image'>('text');
  const [ppdtTextStory, setPpdtTextStory] = useState('');
  const [watAnswer, setWatAnswer] = useState('');
  const [srtAnswer, setSrtAnswer] = useState('');
  const [interviewAnswer, setInterviewAnswer] = useState('');
  const [mySubmission, setMySubmission] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [autoRetryAttempted, setAutoRetryAttempted] = useState(false);
  const [showScoreMeaning, setShowScoreMeaning] = useState(false);
  const [showPpdtPopup, setShowPpdtPopup] = useState(false);
  
  // Leaderboard State
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardTimeframe, setLeaderboardTimeframe] = useState<'weekly' | 'monthly' | 'overall'>('weekly');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [weeklyTop3, setWeeklyTop3] = useState<any[]>([]);
  const [weekRange, setWeekRange] = useState('');

  const rawOirText = challenge?.oir_text || '';
  const [mainOirText, adminRemark] = rawOirText.split('|||REMARK|||');
  const isPPDT = mainOirText.startsWith('[PPDT]');
  const displayOirText = isPPDT ? mainOirText.replace('[PPDT]', '').trim() : mainOirText;

  useEffect(() => {
    // Load local likes
    const storedLikes = localStorage.getItem('liked_submissions');
    if (storedLikes) {
        setLikedSubmissions(JSON.parse(storedLikes));
    }
    loadData();
  }, []);

  useEffect(() => {
    // Background Retry Logic: If submission exists but has failed evaluations, retry once automatically
    if (hasSubmitted && mySubmission && !isRetrying && !autoRetryAttempted) {
        const hasErrors = 
            (mySubmission.wat_answers?.[0] && (!mySubmission.ai_evaluation?.wat || mySubmission.ai_evaluation?.wat?.error)) ||
            (mySubmission.srt_answers?.[0] && (!mySubmission.ai_evaluation?.srt || mySubmission.ai_evaluation?.srt?.error));
        
        if (hasErrors) {
            console.log("Background AI evaluation retry triggered...");
            setAutoRetryAttempted(true);
            handleRetryEvaluation(true); // Call silently
        }
    }
  }, [hasSubmitted, mySubmission, isRetrying, autoRetryAttempted]);

  useEffect(() => {
    if (showLeaderboard) {
        loadLeaderboard();
    }
  }, [showLeaderboard, leaderboardTimeframe]);

  const loadLeaderboard = async () => {
      setIsLoadingLeaderboard(true);
      try {
          const data = await getDailyLeaderboard(leaderboardTimeframe);
          setLeaderboardData(data);
      } catch (e) {
          console.error("Failed to load leaderboard", e);
      } finally {
          setIsLoadingLeaderboard(false);
      }
  };

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const u = await checkAuthSession();
      setUser(u);
      
      if (u) {
          const s = await getUserStreak(u.id);
          setUserStreak(s.streak_count || 0);
      }
      
      const ch = await getLatestDailyChallenge();
      
      // Calculate week range for display
      const now = new Date();
      const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const day = istNow.getUTCDay();
      const diff = istNow.getUTCDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(istNow);
      start.setUTCDate(diff);
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 6);
      setWeekRange(`${start.getUTCDate()} ${start.toLocaleString('default', { month: 'short' })} - ${end.getUTCDate()} ${end.toLocaleString('default', { month: 'short' })}`);

      // Fetch weekly top 3 for display
      const weeklyData = await getDailyLeaderboard('weekly');
      setWeeklyTop3(weeklyData.slice(0, 3));
      
      if (ch) {
        setChallenge(ch);
        const subs = await getDailySubmissions(ch.id);
        
        // Merge with local like state
        const storedLikes = JSON.parse(localStorage.getItem('liked_submissions') || '[]');
        const mergedSubs = subs.map((s: any) => ({
            ...s,
            isLiked: storedLikes.includes(s.id)
        }));
        
        setSubmissions(mergedSubs);
        
        if (u) {
            const mySub = subs.find((s: any) => s.user_id === u.id);
            if (mySub) {
                setHasSubmitted(true);
                setMySubmission(mySub);
            }
        }
      } else {
        setChallenge(null);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Failed to load daily dossier. Check internet or try refreshing.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!challenge) return;
    
    if (!user) {
        if (onLoginRedirect) onLoginRedirect();
        else alert("Please login to submit your entry.");
        return;
    }
    
    if (!oirAnswer.trim() && !watAnswer.trim() && !srtAnswer.trim() && !interviewAnswer.trim() && !ppdtStoryFile && !ppdtTextStory.trim()) {
        alert("Please complete at least one section before submitting.");
        return;
    }

    setIsSubmitting(true);
    setIsEvaluating(true);
    try {
      let finalOirAnswer = oirAnswer;
      if (isPPDT) {
          if (ppdtSubmissionType === 'image' && ppdtStoryFile) {
              const fileName = `daily-ppdt-story-${Date.now()}-${ppdtStoryFile.name}`;
              await supabase.storage.from('scenarios').upload(fileName, ppdtStoryFile);
              const { data } = supabase.storage.from('scenarios').getPublicUrl(fileName);
              finalOirAnswer = data.publicUrl;
          } else if (ppdtSubmissionType === 'text' && ppdtTextStory.trim()) {
              finalOirAnswer = ppdtTextStory;
          }
      }

      // 1. Perform AI Evaluation
      let aiEvaluation: any = {
          wat: null,
          srt: null,
          overall_score: 0
      };

      const piqData = await getUserData(user.id);

      // Evaluate WAT
      if (watAnswer.trim()) {
          try {
              const watEval = await evaluateDailyChallengeResponse('WAT', {
                  word: challenge.wat_words[0],
                  response: watAnswer
              });
              aiEvaluation.wat = watEval;
          } catch (e) {
              console.error("WAT Eval failed", e);
          }
      }

      // Evaluate SRT
      if (srtAnswer.trim()) {
          try {
              const srtEval = await evaluateDailyChallengeResponse('SRT', {
                  situation: challenge.srt_situations[0],
                  response: srtAnswer
              });
              aiEvaluation.srt = srtEval;
          } catch (e) {
              console.error("SRT Eval failed", e);
          }
      }

      // Do not calculate overall score for daily practice
      aiEvaluation.overall_score = 0;

      const result = await submitDailyEntry(challenge.id, finalOirAnswer, watAnswer, srtAnswer, interviewAnswer, aiEvaluation);
      
      // Refresh Data
      const subs = await getDailySubmissions(challenge.id);
      const storedLikes = JSON.parse(localStorage.getItem('liked_submissions') || '[]');
      const updatedSubs = subs.map((s: any) => ({ ...s, isLiked: storedLikes.includes(s.id) }));
      setSubmissions(updatedSubs);
      
      const myNewSub = updatedSubs.find((s: any) => s.user_id === user.id);
      if (myNewSub) setMySubmission(myNewSub);

      setHasSubmitted(true);
      setUserStreak(prev => prev + 1);
      
      setOirAnswer('');
      setPpdtStoryFile(null);
      setWatAnswer('');
      setSrtAnswer('');
      setInterviewAnswer('');
      
      if (isPPDT) {
          setShowPpdtPopup(true);
      } else if (result && result.rewarded) {
          alert("Submission Posted! You earned 2 Coins for today's practice.");
      } else {
          alert("Submission Posted!");
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to post. Please try again.");
    } finally {
      setIsSubmitting(false);
      setIsEvaluating(false);
    }
  };

  const handleRetryEvaluation = async (silent = false) => {
    if (!mySubmission || !user || !challenge) return;
    
    setIsRetrying(true);
    try {
        let aiEvaluation: any = {
            wat: mySubmission.ai_evaluation?.wat || null,
            srt: mySubmission.ai_evaluation?.srt || null,
            overall_score: 0
        };

        const piqData = await getUserData(user.id);

        // Re-evaluate WAT if it failed or was skipped
        if (mySubmission.wat_answers?.[0] && (!aiEvaluation.wat || aiEvaluation.wat.error)) {
            try {
                const watEval = await evaluateDailyChallengeResponse('WAT', {
                    word: challenge.wat_words[0],
                    response: mySubmission.wat_answers[0]
                });
                aiEvaluation.wat = watEval;
            } catch (e) {
                console.error("WAT Retry failed", e);
            }
        }

        // Re-evaluate SRT if it failed or was skipped
        if (mySubmission.srt_answers?.[0] && (!aiEvaluation.srt || aiEvaluation.srt.error)) {
            try {
                const srtEval = await evaluateDailyChallengeResponse('SRT', {
                    situation: challenge.srt_situations[0],
                    response: mySubmission.srt_answers[0]
                });
                aiEvaluation.srt = srtEval;
            } catch (e) {
                console.error("SRT Retry failed", e);
            }
        }

        // Do not calculate overall score
        aiEvaluation.overall_score = 0;

        // Update Backend
        await updateDailySubmissionAI(mySubmission.id, aiEvaluation);
        
        // Update Local State
        const updatedSub = { ...mySubmission, ai_evaluation: aiEvaluation };
        setMySubmission(updatedSub);
        setSubmissions(prev => prev.map(s => s.id === mySubmission.id ? updatedSub : s));
        
    } catch (e) {
        console.error("Retry Eval failed", e);
        if (!silent) alert("Failed to re-evaluate. AI might still be busy.");
    } finally {
        setIsRetrying(false);
    }
  };

  const handleLike = async (subId: string) => {
      // Allow guests to like too, stored locally
      const isCurrentlyLiked = likedSubmissions.includes(subId);
      const newIsLiked = !isCurrentlyLiked;
      
      // Update Local Storage
      let newLikedList;
      if (newIsLiked) {
          newLikedList = [...likedSubmissions, subId];
      } else {
          newLikedList = likedSubmissions.filter(id => id !== subId);
      }
      setLikedSubmissions(newLikedList);
      localStorage.setItem('liked_submissions', JSON.stringify(newLikedList));

      // Update UI Optimistically
      setSubmissions(prev => prev.map(s => {
          if (s.id === subId) {
              return {
                  ...s,
                  isLiked: newIsLiked,
                  likes_count: (s.likes_count || 0) + (newIsLiked ? 1 : -1)
              };
          }
          return s;
      }));
      
      // Sync to Backend
      await toggleLike(subId, newIsLiked);
  };

  /**
   * Final Name Resolver
   */
  const getDisplayName = (sub: any) => {
      const profile = sub.aspirants;
      // 1. Direct profile match
      if (profile && profile.full_name && profile.full_name !== 'Cadet') {
          return profile.full_name;
      }
      
      // 2. User match
      if (user && sub.user_id === user.id) {
          const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
          if (metaName) return metaName;
      }
      
      // 3. Array Fallback
      if (Array.isArray(profile) && profile.length > 0) {
          const arrName = profile[0].full_name || profile[0].name;
          if (arrName && arrName !== 'Cadet') return arrName;
      }
      
      return 'Cadet';
  };

  const getBadges = (submissionIndex: number, sub: any) => {
      const badges = [];
      if (sub.likes_count >= 5) badges.push({ icon: Star, color: 'text-yellow-400', label: 'Popular' });
      if (sub.ppdt_story && sub.ppdt_story.length > 100) badges.push({ icon: PenTool, color: 'text-purple-400', label: 'Detailed' });
      
      const profile = sub.aspirants;
      const streak = Array.isArray(profile) ? profile[0]?.streak_count : profile?.streak_count;
      
      if (streak > 3) badges.push({ icon: Flame, color: 'text-orange-500', label: 'Consistent' });
      
      // Rank badges based on likes, not date order
      if (submissionIndex === 0 && sub.likes_count > 0) badges.push({ icon: Trophy, color: 'text-yellow-500', label: 'Top Cadet' });
      if (submissionIndex === 1 && sub.likes_count > 0) badges.push({ icon: Medal, color: 'text-slate-400', label: 'Runner Up' });
      if (submissionIndex === 2 && sub.likes_count > 0) badges.push({ icon: Medal, color: 'text-orange-700', label: 'Bronze' });
      return badges;
  };

  // Sort submissions by likes for leaderboard
  const topSubmissions = [...submissions].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)).slice(0, 3);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-900" size={32}/></div>;

  if (!challenge) return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 max-w-xl mx-auto">
          <Clock size={48} className="text-slate-300" />
          <h2 className="text-2xl font-black text-slate-900 uppercase">No Active Dossier</h2>
          <p className="text-slate-500 font-medium">The Intelligence Officer hasn't uploaded today's challenge yet. Check back later.</p>
          <button onClick={loadData} className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold uppercase text-xs tracking-widest transition-all">
              <RefreshCw size={14} /> Refresh Check
          </button>
      </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="bg-slate-900 rounded-3xl p-4 md:p-6 text-white shadow-xl relative overflow-hidden flex flex-col items-center text-center border-b-2 border-yellow-500">
         <div className="relative z-10 space-y-3">
            <div className="flex flex-wrap items-center gap-2 justify-center">
                <span className="px-2 py-0.5 bg-green-600 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-1.5">
                   <Clock size={8} className="animate-pulse" /> Active Challenge
                </span>
                {userStreak > 0 && (
                    <span className="px-2 py-0.5 bg-orange-600 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-1.5">
                       <Flame size={8} fill="currentColor" /> {userStreak} Day Streak
                    </span>
                )}
            </div>
            
            <div className="space-y-0.5">
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter">Daily <span className="text-yellow-400">War Room</span></h1>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                    {new Date(challenge.created_at).toDateString()}
                </p>
            </div>

            <button 
                onClick={() => setShowLeaderboard(true)}
                className="group relative px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 rounded-lg font-black uppercase tracking-widest text-[9px] shadow-[0_2px_0_rgb(202,138,4)] hover:shadow-[0_1px_0_rgb(202,138,4)] active:shadow-none active:translate-y-0.5 transition-all flex items-center gap-2 mx-auto"
            >
                <Trophy size={12} className="group-hover:rotate-12 transition-transform" /> 
                View Global Leaderboard
            </button>
         </div>
         <Flame className="absolute -bottom-6 -right-6 w-32 h-32 text-orange-500/10 rotate-12 pointer-events-none" />
      </div>

      {/* LEADERBOARD (Top 3 Weekly) */}
      {weeklyTop3.length > 0 && (
          <div className="space-y-6">
              <div className="text-center space-y-1">
                  <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 flex items-center justify-center gap-2">
                      <Trophy size={20} className="text-yellow-500" /> Weekly Top Cadets
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Current Week: {weekRange} (IST)
                  </p>
              </div>

              <div className="grid grid-cols-3 gap-2 md:gap-4 max-w-3xl mx-auto">
                  {weeklyTop3.map((cadet, i) => {
                      return (
                        <div key={cadet.user_id} className={`relative p-4 rounded-2xl border text-center flex flex-col items-center gap-2 ${i === 0 ? 'bg-yellow-50 border-yellow-400 order-2 scale-110 shadow-xl' : i === 1 ? 'bg-slate-50 border-slate-200 order-1' : 'bg-orange-50 border-orange-200 order-3'}`}>
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                {i === 0 ? <Trophy size={24} className="text-yellow-500 fill-yellow-500" /> : <Medal size={20} className={i === 1 ? "text-slate-400" : "text-orange-700"} />}
                            </div>
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xs md:text-sm mt-2">
                                {cadet.full_name?.[0] || 'U'}
                            </div>
                            <p className="text-[10px] md:text-xs font-black uppercase tracking-widest truncate w-full">{cadet.full_name?.split(' ')[0]}</p>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
                                <Trophy size={10} className="text-blue-500 fill-blue-500" /> {cadet.points} Pts
                            </div>
                        </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* MENTORSHIP CARD */}
      <MentorshipCard variant="compact" className="my-0" />

      {/* CHALLENGE WORKSPACE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hasSubmitted && mySubmission && (
              <div className="md:col-span-2 bg-blue-900 text-white p-8 rounded-[2.5rem] shadow-2xl border-b-8 border-blue-700 animate-in slide-in-from-top duration-500">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="space-y-2">
                          <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                              <Award className="text-yellow-400" /> AI Performance Report
                          </h2>
                          <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">Based on SSB Assessment Standards</p>
                          
                          {(mySubmission.ai_evaluation?.wat?.error || 
                            mySubmission.ai_evaluation?.srt?.error) && (
                              <div className="space-y-3">
                                {isRetrying && autoRetryAttempted && (
                                    <div className="flex items-center gap-2 text-yellow-400 text-[10px] font-black uppercase animate-pulse">
                                        <Brain size={12} /> Background AI Analysis in progress...
                                    </div>
                                )}
                                <button 
                                    onClick={() => handleRetryEvaluation(false)}
                                    disabled={isRetrying}
                                    className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-yellow-300 transition-all disabled:opacity-50"
                                >
                                    {isRetrying ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                                    {isRetrying ? 'Retrying...' : 'Retry Failed Evaluations'}
                                </button>
                              </div>
                          )}
                      </div>
                  </div>

                  <div id="score-breakdown" className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                      {/* WAT EVAL */}
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-green-400">WAT Analysis</span>
                              <span className="text-lg font-black">{mySubmission.ai_evaluation?.wat?.score || 0}/10</span>
                          </div>
                          <p className="text-xs text-blue-100 leading-relaxed italic">
                              {mySubmission.ai_evaluation?.wat?.generalFeedback || 'No feedback available.'}
                          </p>
                      </div>
                      {/* SRT EVAL */}
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">SRT Analysis</span>
                              <span className="text-lg font-black">{mySubmission.ai_evaluation?.srt?.score || 0}/10</span>
                          </div>
                          <p className="text-xs text-blue-100 leading-relaxed italic">
                              {mySubmission.ai_evaluation?.srt?.generalFeedback || 'No feedback available.'}
                          </p>
                      </div>
                  </div>

                  {challenge.oir_correct_answer && (
                      <div className="mt-8 p-6 bg-white/10 rounded-2xl border border-white/20">
                          <h4 className="text-sm font-black uppercase tracking-widest text-yellow-400 mb-3 flex items-center gap-2">
                              <CheckCircle size={16} /> OIR Solution Key
                          </h4>
                          <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                  <span className="px-3 py-1 bg-green-500 text-white text-[10px] font-black rounded-lg uppercase">Correct Answer</span>
                                  <span className="text-lg font-bold">{challenge.oir_correct_answer}</span>
                              </div>
                              {challenge.oir_explanation && (
                                  <div className="text-sm text-blue-100 leading-relaxed bg-black/20 p-4 rounded-xl">
                                      <span className="font-black text-white uppercase text-[10px] block mb-1">Explanation:</span>
                                      {challenge.oir_explanation}
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>
          )}

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg md:col-span-2 flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3 min-h-[200px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shrink-0 flex flex-col items-center justify-center p-4 relative group">
                  {challenge.ppdt_image_url && (
                      <div 
                        className="relative w-full h-full cursor-zoom-in" 
                        onClick={() => setZoomedImage(challenge.ppdt_image_url)}
                      >
                          <img src={challenge.ppdt_image_url} className="w-full h-auto object-contain rounded-lg mb-2" alt="OIR Question" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-all rounded-lg">
                              <Maximize2 className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" size={32} />
                          </div>
                      </div>
                  )}
                  {displayOirText && (
                      <p className="text-sm font-bold text-slate-800 text-center leading-relaxed mt-2">{displayOirText}</p>
                  )}
                  {adminRemark && (
                      <div className="mt-4 w-full bg-blue-50 border border-blue-100 p-3 rounded-xl">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Admin Remark</p>
                          <p className="text-xs font-medium text-blue-900">{adminRemark}</p>
                      </div>
                  )}
                  {!challenge.ppdt_image_url && !displayOirText && (
                      <p className="text-slate-400 text-xs font-bold uppercase">No OIR content loaded</p>
                  )}
              </div>
              <div className="flex-1 space-y-4">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Brain size={18} className="text-blue-600" /> 1. {isPPDT ? 'PPDT Challenge' : 'OIR Challenge'}
                  </h3>
                  {isPPDT ? (
                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Submit Story</p>
                              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                                  <button 
                                      onClick={() => setPpdtSubmissionType('text')}
                                      className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${ppdtSubmissionType === 'text' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                  >
                                      Text
                                  </button>
                                  <button 
                                      onClick={() => setPpdtSubmissionType('image')}
                                      className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${ppdtSubmissionType === 'image' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                  >
                                      Image
                                  </button>
                              </div>
                          </div>
                          
                          {ppdtSubmissionType === 'image' ? (
                              <div className="relative">
                                  <input 
                                      type="file" 
                                      accept="image/*"
                                      onChange={(e) => setPpdtStoryFile(e.target.files?.[0] || null)}
                                      className="hidden"
                                      id="ppdt-story-upload"
                                  />
                                  <label 
                                      htmlFor="ppdt-story-upload"
                                      className="flex flex-col items-center justify-center w-full h-40 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 transition-all"
                                  >
                                      {ppdtStoryFile ? (
                                          <div className="text-center">
                                              <ImageIcon size={32} className="mx-auto text-blue-500 mb-2" />
                                              <p className="text-sm font-bold text-slate-700">{ppdtStoryFile.name}</p>
                                              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Click to change</p>
                                          </div>
                                      ) : (
                                          <div className="text-center text-slate-400">
                                              <ImageIcon size={32} className="mx-auto mb-2" />
                                              <p className="text-sm font-bold">Click to upload handwritten story</p>
                                          </div>
                                      )}
                                  </label>
                              </div>
                          ) : (
                              <textarea 
                                  value={ppdtTextStory}
                                  onChange={(e) => setPpdtTextStory(e.target.value)}
                                  placeholder="Type your PPDT story here..."
                                  className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none focus:border-blue-500 transition-all text-sm font-medium"
                              />
                          )}
                      </div>
                  ) : (
                      <textarea 
                          value={oirAnswer}
                          onChange={(e) => setOirAnswer(e.target.value)}
                          placeholder="Type your answer and explanation here..."
                          className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none focus:border-blue-500 transition-all text-sm font-medium"
                      />
                  )}
              </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-green-600" /> 2. Word Association
              </h3>
              <div className="space-y-3">
                  <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
                      <span className="text-2xl font-black uppercase text-green-800 tracking-wider">{challenge.wat_words?.[0] || "WORD"}</span>
                  </div>
                  <input 
                      value={watAnswer}
                      onChange={(e) => setWatAnswer(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-green-500 transition-all"
                      placeholder="Type your sentence..."
                  />
              </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Zap size={18} className="text-orange-600" /> 3. Situation Reaction
              </h3>
              <div className="space-y-3">
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 min-h-[64px] flex items-center">
                      <p className="text-sm font-bold text-orange-900 leading-snug">{challenge.srt_situations?.[0] || "Situation..."}</p>
                  </div>
                  <input 
                      value={srtAnswer}
                      onChange={(e) => setSrtAnswer(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-orange-500 transition-all"
                      placeholder="Your action..."
                  />
              </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg md:col-span-2">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Mic size={18} className="text-purple-600" /> 4. Interview Question
              </h3>
              <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3 p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-center text-center">
                      <p className="text-sm font-black text-purple-900 italic">"{challenge.interview_question || "Question..."}"</p>
                  </div>
                  <textarea 
                      value={interviewAnswer}
                      onChange={(e) => setInterviewAnswer(e.target.value)}
                      placeholder="Type your answer (be honest and direct)..."
                      className="flex-1 h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none focus:border-purple-500 transition-all text-sm font-medium"
                  />
              </div>
          </div>
      </div>

      <div className="flex justify-center">
          {!user ? (
              <button onClick={onLoginRedirect} className="px-12 py-4 bg-yellow-400 text-black rounded-full font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-yellow-300 transition-all shadow-xl hover:-translate-y-1">
                  <User size={16} /> Login to Submit
              </button>
          ) : (
              <button onClick={handleSubmit} disabled={isSubmitting || hasSubmitted || isEvaluating} className="px-12 py-4 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-black transition-all shadow-xl disabled:opacity-50">
                  {(isSubmitting || isEvaluating) ? <Loader2 className="animate-spin" /> : hasSubmitted ? <CheckCircle size={16} /> : <Send size={16} />} 
                  {isEvaluating ? 'Evaluating Performance...' : isSubmitting ? 'Posting Submission...' : hasSubmitted ? 'Already Submitted' : 'Submit Entry'}
              </button>
          )}
      </div>

      {/* DISCUSSION FEED */}
      <div className="space-y-8 relative">
          <div className="flex flex-col items-center justify-center gap-4">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                  <MessageSquare className="text-blue-600" /> Community Board
              </h3>
              
              <div className="w-full max-w-2xl">
                  <button 
                      onClick={() => setShowScoreMeaning(!showScoreMeaning)} 
                      className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                      <Award size={16} className="text-yellow-400" /> What does my score mean?
                  </button>
                  {showScoreMeaning && (
                      <div className="mt-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-xl text-sm text-slate-700 space-y-4 animate-in fade-in slide-in-from-top-2">
                          <h4 className="font-black text-slate-900 uppercase tracking-widest text-[10px] border-b border-slate-100 pb-2">Score Breakdown Guide</h4>
                          <div className="grid grid-cols-1 gap-4 text-xs leading-relaxed">
                              <div className="flex gap-4 items-start p-3 bg-green-50 rounded-xl border border-green-100">
                                  <span className="font-black text-green-600 min-w-[40px] text-right text-sm">9-10</span> 
                                  <span><strong>Outstanding:</strong> Strong Officer Like Qualities (OLQs). Highly practical, positive, and action-oriented.</span>
                              </div>
                              <div className="flex gap-4 items-start p-3 bg-blue-50 rounded-xl border border-blue-100">
                                  <span className="font-black text-blue-600 min-w-[40px] text-right text-sm">7-8</span> 
                                  <span><strong>Good:</strong> Clear potential and logical thinking. Minor improvements needed in speed or depth of action.</span>
                              </div>
                              <div className="flex gap-4 items-start p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                                  <span className="font-black text-yellow-600 min-w-[40px] text-right text-sm">5-6</span> 
                                  <span><strong>Average:</strong> Acceptable response, but lacks strong leadership traits, completeness, or quick decision-making.</span>
                              </div>
                              <div className="flex gap-4 items-start p-3 bg-red-50 rounded-xl border border-red-100">
                                  <span className="font-black text-red-600 min-w-[40px] text-right text-sm">0-4</span> 
                                  <span><strong>Needs Improvement:</strong> Lacks clarity, practicality, or shows negative traits. Needs significant practice.</span>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
          
          {submissions.length === 0 ? (
              <div className="text-center p-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs">
                  No submissions yet. Be the first to lead!
              </div>
          ) : (
              <div className="grid grid-cols-1 gap-6">
                  {submissions.map((sub, idx) => {
                      const displayName = getDisplayName(sub);
                      const profile = sub.aspirants;
                      const streak = Array.isArray(profile) ? profile[0]?.streak_count : profile?.streak_count;
                      
                      // Calculate rank index based on sorted likes
                      const rankIndex = topSubmissions.findIndex(s => s.id === sub.id);

                      return (
                      <div key={sub.id} className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-md hover:shadow-xl transition-all relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 flex gap-2">
                              {getBadges(rankIndex, sub).map((badge, bIdx) => (
                                  <div key={bIdx} title={badge.label} className={`p-1.5 bg-slate-50 rounded-lg ${badge.color}`}>
                                      <badge.icon size={14} fill="currentColor" />
                                  </div>
                              ))}
                          </div>

                          <div className="flex items-center gap-4 mb-6 border-b border-slate-50 pb-4">
                              <div className="w-12 h-12 bg-slate-900 text-yellow-400 rounded-full flex items-center justify-center font-black text-sm border-4 border-slate-100">
                                  {displayName?.[0] || 'U'}
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                      {displayName}
                                      {streak > 0 && (
                                          <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                              <Flame size={10} fill="currentColor" /> {streak}
                                          </span>
                                      )}
                                  </h4>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(sub.created_at).toLocaleTimeString()}</p>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                  {sub.ppdt_story && (
                                    <div className="space-y-2">
                                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block bg-blue-50 px-2 py-1 rounded w-fit">
                                            {isPPDT ? 'PPDT Story' : 'OIR Answer'}
                                        </span>
                                        {sub.ppdt_story.startsWith('http') ? (
                                            <div 
                                                className="relative w-full h-40 cursor-zoom-in rounded-xl overflow-hidden border border-slate-200"
                                                onClick={() => setZoomedImage(sub.ppdt_story)}
                                            >
                                                <img src={sub.ppdt_story} className="w-full h-full object-cover" alt="PPDT Story" />
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                "{sub.ppdt_story}"
                                            </p>
                                        )}
                                    </div>
                                  )}
                                  {sub.ai_evaluation && (
                                      <div className="mt-4 p-4 bg-slate-900 text-white rounded-2xl space-y-3">
                                          <div className="flex justify-between items-center">
                                              <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest">AI Assessment</span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-1">
                                              <div className="text-center p-1 bg-white/5 rounded border border-white/10">
                                                  <p className="text-[7px] font-black uppercase text-white/50">WAT</p>
                                                  <p className="text-[10px] font-bold text-green-400">{sub.ai_evaluation.wat?.score || 0}</p>
                                              </div>
                                              <div className="text-center p-1 bg-white/5 rounded border border-white/10">
                                                  <p className="text-[7px] font-black uppercase text-white/50">SRT</p>
                                                  <p className="text-[10px] font-bold text-orange-400">{sub.ai_evaluation.srt?.score || 0}</p>
                                              </div>
                                          </div>
                                      </div>
                                  )}
                                  {sub.interview_answer && (
                                    <div className="space-y-2">
                                        <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest block bg-purple-50 px-2 py-1 rounded w-fit">Interview Answer</span>
                                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            "{sub.interview_answer}"
                                        </p>
                                    </div>
                                  )}
                              </div>
                              <div className="space-y-4">
                                  {sub.wat_answers?.[0] && (
                                    <div>
                                        <span className="text-[9px] font-black text-green-600 uppercase tracking-widest block mb-2 bg-green-50 px-2 py-1 rounded w-fit">WAT Response</span>
                                        <p className="text-xs text-slate-700 font-bold pl-4 border-l-2 border-green-100">
                                            {sub.wat_answers[0]}
                                        </p>
                                    </div>
                                  )}
                                  {sub.srt_answers?.[0] && (
                                    <div>
                                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block mb-2 bg-orange-50 px-2 py-1 rounded w-fit">SRT Reaction</span>
                                        <p className="text-xs text-slate-700 font-bold pl-4 border-l-2 border-orange-100">
                                            {sub.srt_answers[0]}
                                        </p>
                                    </div>
                                  )}
                              </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                              <button 
                                onClick={() => handleLike(sub.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${sub.isLiked ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                              >
                                  <Heart size={16} className={sub.isLiked ? "fill-red-600" : ""} />
                                  <span className="text-xs font-bold">{sub.likes_count || 0} Concur</span>
                              </button>
                          </div>
                      </div>
                  )})}
              </div>
          )}
      </div>

      {/* SOCIAL FOOTER */}
      <div className="mt-12 bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-slate-400 relative overflow-hidden border-t-8 border-slate-800 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-20"></div>
        <div className="relative z-10 flex flex-col items-center text-center space-y-8">
          <h3 className="text-xl font-black text-white uppercase tracking-widest">Join the Community</h3>
          <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full justify-center">
             <a 
               href="https://www.instagram.com/ssbprep.online?utm_source=qr&igsh=ZjdvdGdwZGo5OXBl" 
               target="_blank" 
               rel="noreferrer"
               className="flex items-center gap-3 px-6 py-4 bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 text-white rounded-2xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:-translate-y-1 group border border-white/10 w-full sm:w-auto"
               title="Follow on Instagram"
             >
               <div className="bg-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
                 <Instagram size={24} />
               </div>
               <div className="flex flex-col items-start text-left">
                 <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">For all updates</span>
                 <span className="font-black text-sm tracking-wide">Follow on Instagram</span>
               </div>
             </a>
             <a 
               href="https://youtube.com/@ssbprep.online?si=616euo_H_rJ4wwFo" 
               target="_blank" 
               rel="noreferrer" 
               className="flex items-center gap-3 px-6 py-4 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white rounded-2xl transition-all shadow-lg hover:-translate-y-1 group border border-slate-700 hover:border-red-500 w-full sm:w-auto"
               title="Subscribe on YouTube"
             >
               <div className="bg-white/10 p-2 rounded-xl group-hover:scale-110 transition-transform">
                 <Youtube size={24} />
               </div>
               <div className="flex flex-col items-start text-left">
                 <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider group-hover:text-white/80">Watch videos</span>
                 <span className="font-black text-sm tracking-wide">Subscribe on YouTube</span>
               </div>
             </a>
             <a 
               href="https://t.me/ssbpreponline" 
               target="_blank" 
               rel="noreferrer" 
               className="flex items-center gap-3 px-6 py-4 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-2xl transition-all shadow-lg hover:-translate-y-1 group border border-[#0088cc] w-full sm:w-auto"
               title="Join on Telegram"
             >
               <div className="bg-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
                 <Send size={24} />
               </div>
               <div className="flex flex-col items-start text-left">
                 <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Join community</span>
                 <span className="font-black text-sm tracking-wide">Join on Telegram</span>
               </div>
             </a>
          </div>
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

      {/* PPDT Submission Popup */}
      {showPpdtPopup && (
          <div className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-6">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Story Submitted!</h3>
                  <p className="text-slate-600 font-medium leading-relaxed">
                      To get detailed assessment use direct evaluation mode in PPDT test section.
                  </p>
                  <button 
                      onClick={() => setShowPpdtPopup(false)}
                      className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all"
                  >
                      Got it
                  </button>
              </div>
          </div>
      )}

      {/* GLOBAL LEADERBOARD MODAL */}
      {showLeaderboard && (
          <div className="fixed inset-0 z-[500] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
                  <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                      <div>
                          <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                              <Trophy className="text-yellow-400" /> Global Leaderboard
                          </h2>
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">1 Point per Daily Practice</p>
                      </div>
                      <button onClick={() => setShowLeaderboard(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="p-6 border-b border-slate-100 flex gap-2 shrink-0 overflow-x-auto">
                      {(['weekly', 'monthly', 'overall'] as const).map(tf => (
                          <button
                              key={tf}
                              onClick={() => setLeaderboardTimeframe(tf)}
                              className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${leaderboardTimeframe === tf ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          >
                              {tf}
                          </button>
                      ))}
                  </div>

                  <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                      {isLoadingLeaderboard ? (
                          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={32}/></div>
                      ) : leaderboardData.length === 0 ? (
                          <div className="text-center py-12 text-slate-500 font-medium">No cadets found for this timeframe.</div>
                      ) : (
                          <div className="space-y-3">
                              {leaderboardData.map((cadet, idx) => (
                                  <div key={cadet.user_id} className={`flex items-center gap-4 p-4 rounded-2xl border bg-white ${idx === 0 ? 'border-yellow-400 shadow-md' : idx === 1 ? 'border-slate-300' : idx === 2 ? 'border-orange-300' : 'border-slate-100'}`}>
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-100 text-slate-700' : idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-50 text-slate-400'}`}>
                                          #{idx + 1}
                                      </div>
                                      <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0">
                                          {cadet.full_name?.[0] || 'U'}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <h4 className="font-bold text-slate-900 truncate flex items-center gap-2">
                                              {cadet.full_name}
                                              {cadet.streak_count > 3 && (
                                                  <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                                      <Flame size={10} fill="currentColor" /> {cadet.streak_count}
                                                  </span>
                                              )}
                                          </h4>
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cadet</p>
                                      </div>
                                      <div className="text-right shrink-0">
                                          <div className="text-lg font-black text-blue-600">{cadet.points}</div>
                                          <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Pts</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default DailyPractice;
