
import React, { useState, useEffect } from 'react';
import { Loader2, Send, MessageSquare, Clock, User, ImageIcon, FileText, Zap, PenTool, Flame, Trophy, Lock, Heart, Award, Medal, Star, CheckCircle } from 'lucide-react';
import { getLatestDailyChallenge, submitDailyEntry, getDailySubmissions, checkAuthSession, toggleLike, getUserStreak } from '../services/supabaseService';

const DailyPractice: React.FC = () => {
  const [challenge, setChallenge] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userStreak, setUserStreak] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Form State
  const [ppdtStory, setPpdtStory] = useState('');
  const [watAnswers, setWatAnswers] = useState<string[]>(['', '', '', '', '']);
  const [srtAnswers, setSrtAnswers] = useState<string[]>(['', '', '', '', '']);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const u = await checkAuthSession();
      setUser(u);
      
      if (u) {
          const s = await getUserStreak(u.id);
          setUserStreak(s.streak_count || 0);
      }
      
      const ch = await getLatestDailyChallenge();
      setChallenge(ch);
      
      if (ch) {
        const subs = await getDailySubmissions(ch.id);
        setSubmissions(subs);
        
        // Check if user has submitted
        if (u) {
            const mySub = subs.find((s: any) => s.user_id === u.id);
            if (mySub) setHasSubmitted(true);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!challenge) return;
    if (!user) {
        alert("Please login to participate in daily discussion.");
        return;
    }
    setIsSubmitting(true);
    try {
      await submitDailyEntry(challenge.id, ppdtStory, watAnswers, srtAnswers);
      // Refresh submissions
      const subs = await getDailySubmissions(challenge.id);
      setSubmissions(subs);
      setHasSubmitted(true);
      setUserStreak(prev => prev + 1); // Optimistic update
      
      // Clear form
      setPpdtStory('');
      setWatAnswers(['', '', '', '', '']);
      setSrtAnswers(['', '', '', '', '']);
      alert("Submission Posted! Discussion Unlocked.");
    } catch (e) {
      console.error(e);
      alert("Failed to post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (subId: string) => {
      if (!user) return;
      // Optimistic Update
      setSubmissions(prev => prev.map(s => {
          if (s.id === subId) {
              return {
                  ...s,
                  isLiked: !s.isLiked,
                  likes_count: s.isLiked ? s.likes_count - 1 : s.likes_count + 1
              };
          }
          return s;
      }));
      await toggleLike(subId);
  };

  // Logic to determine badges
  const getBadges = (submissionIndex: number, sub: any) => {
      const badges = [];
      // Early Bird: First 10 submissions (reverse index logic since subs are sorted by likes, need to check creation time ideally, but simplifying for UI)
      // Assuming subs might be reordered, we need a stable way. Let's use simple logic: if likes > 5 -> Popular.
      
      if (sub.likes_count >= 5) badges.push({ icon: Star, color: 'text-yellow-400', label: 'Popular' });
      if (sub.ppdt_story.length > 500) badges.push({ icon: PenTool, color: 'text-purple-400', label: 'Orator' });
      if (sub.aspirants?.streak_count > 3) badges.push({ icon: Flame, color: 'text-orange-500', label: 'Consistent' });
      
      // Top 3 Leaderboard Badges
      if (submissionIndex === 0) badges.push({ icon: Trophy, color: 'text-yellow-500', label: 'Top Cadet' });
      if (submissionIndex === 1) badges.push({ icon: Medal, color: 'text-slate-400', label: 'Runner Up' });
      if (submissionIndex === 2) badges.push({ icon: Medal, color: 'text-orange-700', label: 'Bronze' });

      return badges;
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-900" size={32}/></div>;

  if (!challenge) return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <Clock size={48} className="text-slate-300" />
          <h2 className="text-2xl font-black text-slate-900 uppercase">No Active Dossier</h2>
          <p className="text-slate-500 font-medium">The Intelligence Officer hasn't uploaded today's challenge yet. Check back later.</p>
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

      {/* LEADERBOARD (Top 3) */}
      {submissions.length > 0 && (
          <div className="grid grid-cols-3 gap-2 md:gap-4 max-w-3xl mx-auto">
              {submissions.slice(0, 3).map((sub, i) => (
                  <div key={sub.id} className={`relative p-4 rounded-2xl border text-center flex flex-col items-center gap-2 ${i === 0 ? 'bg-yellow-50 border-yellow-400 order-2 scale-110 shadow-xl' : i === 1 ? 'bg-slate-50 border-slate-200 order-1' : 'bg-orange-50 border-orange-200 order-3'}`}>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          {i === 0 ? <Trophy size={24} className="text-yellow-500 fill-yellow-500" /> : <Medal size={20} className={i === 1 ? "text-slate-400" : "text-orange-700"} />}
                      </div>
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xs md:text-sm mt-2">
                          {sub.aspirants?.full_name?.[0] || 'U'}
                      </div>
                      <p className="text-[10px] md:text-xs font-black uppercase tracking-widest truncate w-full">{sub.aspirants?.full_name?.split(' ')[0] || 'Cadet'}</p>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                          <Heart size={10} className="text-red-500 fill-red-500" /> {sub.likes_count}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* CHALLENGE WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PPDT SECTION */}
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg relative overflow-hidden">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <ImageIcon size={18} className="text-blue-600" /> PPDT Stimulus
                  </h3>
                  <div className="aspect-[4/3] bg-slate-100 rounded-2xl overflow-hidden mb-4 border border-slate-200">
                      {challenge.ppdt_image_url ? (
                          <img src={challenge.ppdt_image_url} className="w-full h-full object-cover grayscale contrast-125" alt="PPDT" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs uppercase">No Image Today</div>
                      )}
                  </div>
                  <textarea 
                      value={ppdtStory}
                      onChange={(e) => setPpdtStory(e.target.value)}
                      placeholder="Write your story here (Action, Hero, Outcome)..."
                      className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none focus:border-blue-500 transition-all text-sm font-medium"
                  />
              </div>
          </div>

          {/* WAT & SRT SECTION */}
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FileText size={18} className="text-green-600" /> Word Association
                  </h3>
                  <div className="space-y-3">
                      {challenge.wat_words?.map((word: string, i: number) => (
                          <div key={i} className="flex gap-3 items-center">
                              <span className="w-20 text-xs font-black uppercase text-slate-500 text-right shrink-0">{word}</span>
                              <input 
                                  value={watAnswers[i] || ''}
                                  onChange={(e) => {
                                      const newArr = [...watAnswers];
                                      newArr[i] = e.target.value;
                                      setWatAnswers(newArr);
                                  }}
                                  className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-green-500"
                                  placeholder="Sentence..."
                              />
                          </div>
                      ))}
                  </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Zap size={18} className="text-orange-600" /> Situation Reaction
                  </h3>
                  <div className="space-y-4">
                      {challenge.srt_situations?.map((sit: string, i: number) => (
                          <div key={i} className="space-y-2">
                              <p className="text-xs font-bold text-slate-700 leading-snug">{i+1}. {sit}</p>
                              <input 
                                  value={srtAnswers[i] || ''}
                                  onChange={(e) => {
                                      const newArr = [...srtAnswers];
                                      newArr[i] = e.target.value;
                                      setSrtAnswers(newArr);
                                  }}
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 outline-none focus:border-orange-500"
                                  placeholder="Action taken..."
                              />
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      <div className="flex justify-center">
          <button 
              onClick={handleSubmit}
              disabled={isSubmitting || hasSubmitted}
              className="px-12 py-4 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-black transition-all shadow-xl disabled:opacity-50"
          >
              {isSubmitting ? <Loader2 className="animate-spin" /> : hasSubmitted ? <CheckCircle size={16} /> : <Send size={16} />} 
              {hasSubmitted ? 'Already Submitted' : 'Submit to Unlock Discussions'}
          </button>
      </div>

      {/* DISCUSSION FEED (Blurred until submitted) */}
      <div className="space-y-8 relative">
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter text-center flex items-center justify-center gap-3">
              <MessageSquare className="text-blue-600" /> Community Board
          </h3>
          
          {/* ANTI-COPY BLUR OVERLAY */}
          {!hasSubmitted && user && (
              <div className="absolute inset-0 z-10 backdrop-blur-md bg-white/30 flex flex-col items-center justify-center rounded-[3rem] border border-white/50">
                  <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl text-center max-w-md transform translate-y-20">
                      <Lock className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
                      <h4 className="text-xl font-black uppercase tracking-widest mb-2">Classified Intel</h4>
                      <p className="text-sm font-medium text-slate-300">Submit your own dossier first to view peer responses. This ensures original thought.</p>
                  </div>
              </div>
          )}
          
          {submissions.length === 0 ? (
              <div className="text-center p-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs">
                  No submissions yet. Be the first to lead!
              </div>
          ) : (
              <div className={`grid grid-cols-1 gap-6 ${!hasSubmitted ? 'blur-sm select-none pointer-events-none' : ''}`}>
                  {submissions.map((sub, idx) => (
                      <div key={sub.id} className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-md hover:shadow-xl transition-all relative overflow-hidden">
                          {/* Badges Bar */}
                          <div className="absolute top-0 right-0 p-4 flex gap-2">
                              {getBadges(idx, sub).map((badge, bIdx) => (
                                  <div key={bIdx} title={badge.label} className={`p-1.5 bg-slate-50 rounded-lg ${badge.color}`}>
                                      <badge.icon size={14} fill="currentColor" />
                                  </div>
                              ))}
                          </div>

                          <div className="flex items-center gap-4 mb-6 border-b border-slate-50 pb-4">
                              <div className="w-12 h-12 bg-slate-900 text-yellow-400 rounded-full flex items-center justify-center font-black text-sm border-4 border-slate-100">
                                  {sub.aspirants?.full_name?.[0] || 'U'}
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                      {sub.aspirants?.full_name || 'Cadet'}
                                      {sub.aspirants?.streak_count > 0 && (
                                          <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                              <Flame size={10} fill="currentColor" /> {sub.aspirants.streak_count}
                                          </span>
                                      )}
                                  </h4>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(sub.created_at).toLocaleTimeString()}</p>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-2">
                                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block bg-blue-50 px-2 py-1 rounded w-fit">PPDT Story</span>
                                  <p className="text-sm text-slate-600 leading-relaxed italic bg-slate-50 p-4 rounded-xl border border-slate-100">
                                      "{sub.ppdt_story || 'No story provided.'}"
                                  </p>
                              </div>
                              <div className="space-y-4">
                                  <div>
                                      <span className="text-[9px] font-black text-green-600 uppercase tracking-widest block mb-2 bg-green-50 px-2 py-1 rounded w-fit">WAT Responses</span>
                                      <ul className="text-xs text-slate-700 space-y-1 pl-4 border-l-2 border-green-100">
                                          {sub.wat_answers?.map((ans: string, k: number) => (
                                              <li key={k} className="font-medium"><span className="font-bold text-slate-900">{challenge.wat_words?.[k]}:</span> {ans}</li>
                                          ))}
                                      </ul>
                                  </div>
                                  <div>
                                      <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block mb-2 bg-orange-50 px-2 py-1 rounded w-fit">SRT Reactions</span>
                                      <ul className="text-xs text-slate-700 space-y-1 pl-4 border-l-2 border-orange-100">
                                          {sub.srt_answers?.map((ans: string, k: number) => (
                                              <li key={k}><span className="font-bold text-slate-400">Q{k+1}:</span> {ans}</li>
                                          ))}
                                      </ul>
                                  </div>
                              </div>
                          </div>

                          {/* Action Bar */}
                          <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                              <button 
                                onClick={() => handleLike(sub.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${sub.isLiked ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                              >
                                  <Heart size={16} className={sub.isLiked ? "fill-red-600" : ""} />
                                  <span className="text-xs font-bold">{sub.likes_count || 0} Concur</span>
                              </button>
                              
                              {/* Placeholder for future comments feature */}
                              <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-blue-600 transition-all text-xs font-bold uppercase tracking-widest">
                                  <MessageSquare size={16} /> Reply
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};

export default DailyPractice;
