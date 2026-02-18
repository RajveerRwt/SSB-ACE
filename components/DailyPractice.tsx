
import React, { useState, useEffect } from 'react';
import { Loader2, Send, MessageSquare, Clock, User, ImageIcon, FileText, Zap, PenTool, Flame, Trophy, Lock, Heart, Award, Medal, Star, CheckCircle, Mic, RefreshCw, AlertTriangle, Brain, Maximize2, X } from 'lucide-react';
import { getLatestDailyChallenge, submitDailyEntry, getDailySubmissions, checkAuthSession, toggleLike, getUserStreak } from '../services/supabaseService';

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
  const [watAnswer, setWatAnswer] = useState('');
  const [srtAnswer, setSrtAnswer] = useState('');
  const [interviewAnswer, setInterviewAnswer] = useState('');

  useEffect(() => {
    // Load local likes
    const storedLikes = localStorage.getItem('liked_submissions');
    if (storedLikes) {
        setLikedSubmissions(JSON.parse(storedLikes));
    }
    loadData();
  }, []);

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
            if (mySub) setHasSubmitted(true);
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
    
    if (!oirAnswer.trim() && !watAnswer.trim() && !srtAnswer.trim() && !interviewAnswer.trim()) {
        alert("Please complete at least one section before submitting.");
        return;
    }

    setIsSubmitting(true);
    try {
      await submitDailyEntry(challenge.id, oirAnswer, watAnswer, srtAnswer, interviewAnswer);
      
      // Refresh Data
      const subs = await getDailySubmissions(challenge.id);
      const storedLikes = JSON.parse(localStorage.getItem('liked_submissions') || '[]');
      setSubmissions(subs.map((s: any) => ({ ...s, isLiked: storedLikes.includes(s.id) })));
      
      setHasSubmitted(true);
      setUserStreak(prev => prev + 1);
      
      setOirAnswer('');
      setWatAnswer('');
      setSrtAnswer('');
      setInterviewAnswer('');
      alert("Submission Posted!");
    } catch (e) {
      console.error(e);
      alert("Failed to post. Please try again.");
    } finally {
      setIsSubmitting(false);
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
    <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center border-b-8 border-yellow-500">
         <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3 justify-center">
                <span className="px-4 py-1.5 bg-green-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-2">
                   <Clock size={12} className="animate-pulse" /> Active Challenge
                </span>
                {userStreak > 0 && (
                    <span className="px-4 py-1.5 bg-orange-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-2">
                       <Flame size={12} fill="currentColor" /> {userStreak} Day Streak
                    </span>
                )}
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Daily <span className="text-yellow-400">War Room</span></h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                {new Date(challenge.created_at).toDateString()}
            </p>
         </div>
         <Flame className="absolute -bottom-10 -right-10 w-64 h-64 text-orange-500/10 rotate-12 pointer-events-none" />
      </div>

      {/* LEADERBOARD (Top 3 by Likes) */}
      {topSubmissions.length > 0 && (
          <div className="grid grid-cols-3 gap-2 md:gap-4 max-w-3xl mx-auto">
              {topSubmissions.map((sub, i) => {
                  const displayName = getDisplayName(sub);
                  return (
                    <div key={sub.id} className={`relative p-4 rounded-2xl border text-center flex flex-col items-center gap-2 ${i === 0 ? 'bg-yellow-50 border-yellow-400 order-2 scale-110 shadow-xl' : i === 1 ? 'bg-slate-50 border-slate-200 order-1' : 'bg-orange-50 border-orange-200 order-3'}`}>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            {i === 0 ? <Trophy size={24} className="text-yellow-500 fill-yellow-500" /> : <Medal size={20} className={i === 1 ? "text-slate-400" : "text-orange-700"} />}
                        </div>
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xs md:text-sm mt-2">
                            {displayName?.[0] || 'U'}
                        </div>
                        <p className="text-[10px] md:text-xs font-black uppercase tracking-widest truncate w-full">{displayName?.split(' ')[0]}</p>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                            <Heart size={10} className="text-red-500 fill-red-500" /> {sub.likes_count || 0}
                        </div>
                    </div>
                  );
              })}
          </div>
      )}

      {/* CHALLENGE WORKSPACE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  {challenge.oir_text && (
                      <p className="text-sm font-bold text-slate-800 text-center leading-relaxed mt-2">{challenge.oir_text}</p>
                  )}
                  {!challenge.ppdt_image_url && !challenge.oir_text && (
                      <p className="text-slate-400 text-xs font-bold uppercase">No OIR content loaded</p>
                  )}
              </div>
              <div className="flex-1 space-y-4">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Brain size={18} className="text-blue-600" /> 1. OIR Challenge
                  </h3>
                  <textarea 
                      value={oirAnswer}
                      onChange={(e) => setOirAnswer(e.target.value)}
                      placeholder="Type your answer and explanation here..."
                      className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none focus:border-blue-500 transition-all text-sm font-medium"
                  />
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
              <button onClick={handleSubmit} disabled={isSubmitting || hasSubmitted} className="px-12 py-4 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-black transition-all shadow-xl disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : hasSubmitted ? <CheckCircle size={16} /> : <Send size={16} />} 
                  {hasSubmitted ? 'Already Submitted' : 'Submit Entry'}
              </button>
          )}
      </div>

      {/* DISCUSSION FEED */}
      <div className="space-y-8 relative">
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter text-center flex items-center justify-center gap-3">
              <MessageSquare className="text-blue-600" /> Community Board
          </h3>
          
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
                                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block bg-blue-50 px-2 py-1 rounded w-fit">OIR Answer</span>
                                        <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            "{sub.ppdt_story}"
                                        </p>
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
};

export default DailyPractice;
