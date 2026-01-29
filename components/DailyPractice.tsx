
import React, { useState, useEffect } from 'react';
import { Loader2, Send, MessageSquare, Clock, User, ImageIcon, FileText, Zap, PenTool, Flame, Trophy, Lock, Heart, Award, Medal, Star, CheckCircle, Mic, RefreshCw, AlertTriangle, Pin } from 'lucide-react';
import { getLatestDailyChallenge, submitDailyEntry, getDailySubmissions, checkAuthSession, toggleLike, getUserStreak } from '../services/supabaseService';

const DailyPractice: React.FC = () => {
  const [challenge, setChallenge] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userStreak, setUserStreak] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State - Single Items
  const [ppdtStory, setPpdtStory] = useState('');
  const [watAnswer, setWatAnswer] = useState('');
  const [srtAnswer, setSrtAnswer] = useState('');
  const [interviewAnswer, setInterviewAnswer] = useState('');

  useEffect(() => {
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
        setSubmissions(subs);
        
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
        alert("Please login to participate in daily discussion.");
        return;
    }
    if (!ppdtStory.trim() || !watAnswer.trim() || !srtAnswer.trim() || !interviewAnswer.trim()) {
        alert("Please complete all 4 sections before submitting.");
        return;
    }

    setIsSubmitting(true);
    try {
      // Return the newly created row from Supabase
      const newEntry = await submitDailyEntry(challenge.id, ppdtStory, watAnswer, srtAnswer, interviewAnswer);
      
      // OPTIMISTIC UPDATE: Add the new entry to local state immediately
      setSubmissions(prev => [newEntry, ...prev]);
      setHasSubmitted(true);
      setUserStreak(prev => prev + 1);
      
      setPpdtStory('');
      setWatAnswer('');
      setSrtAnswer('');
      setInterviewAnswer('');
      alert("Mission Accomplished! Your entry is now visible on the board.");
    } catch (e: any) {
      console.error(e);
      alert(`Submission Failed: ${e.message || 'Unknown Error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (subId: string) => {
      if (!user) {
          alert("Login to concur with this response.");
          return;
      }
      
      const sub = submissions.find(s => s.id === subId);
      if (!sub) return;
      
      const willBeLiked = !sub.isLiked;

      setSubmissions(prev => prev.map(s => {
          if (s.id === subId) {
              return {
                  ...s,
                  isLiked: willBeLiked,
                  likes_count: willBeLiked ? s.likes_count + 1 : Math.max(0, s.likes_count - 1)
              };
          }
          return s;
      }));

      await toggleLike(subId, willBeLiked);
  };

  const getBadges = (submissionIndex: number, sub: any) => {
      const badges = [];
      if (sub.likes_count >= 5) badges.push({ icon: Star, color: 'text-yellow-400', label: 'Popular' });
      if (sub.ppdt_story && sub.ppdt_story.length > 500) badges.push({ icon: PenTool, color: 'text-purple-400', label: 'Orator' });
      if (sub.aspirants?.streak_count > 3) badges.push({ icon: Flame, color: 'text-orange-500', label: 'Consistent' });
      if (submissionIndex === 0 && sub.likes_count > 0) badges.push({ icon: Trophy, color: 'text-yellow-500', label: 'Top Cadet' });
      return badges;
  };

  // IDENTIFY USER'S SUBMISSION
  const mySubmission = user ? submissions.find(s => s.user_id === user.id) : null;
  const otherSubmissions = user ? submissions.filter(s => s.user_id !== user.id) : submissions;

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

      {/* CHALLENGE WORKSPACE */}
      {!hasSubmitted && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg md:col-span-2 flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3 aspect-[4/3] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
                    {challenge.ppdt_image_url ? (
                        <img src={challenge.ppdt_image_url} className="w-full h-full object-cover grayscale contrast-125" alt="PPDT" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs uppercase">No Image</div>
                    )}
                </div>
                <div className="flex-1 space-y-4">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <ImageIcon size={18} className="text-blue-600" /> 1. PPDT Story
                    </h3>
                    <textarea 
                        value={ppdtStory}
                        onChange={(e) => setPpdtStory(e.target.value)}
                        placeholder="Write your story here (Action, Hero, Outcome)..."
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
                        <p className="text-sm font-black text-purple-900 italic">"{challenge.interview_question || "Why do you want to join?"}"</p>
                    </div>
                    <textarea 
                        value={interviewAnswer}
                        onChange={(e) => setInterviewAnswer(e.target.value)}
                        placeholder="Type your answer (be honest and direct)..."
                        className="flex-1 h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none focus:border-purple-500 transition-all text-sm font-medium"
                    />
                </div>
            </div>
            
            <div className="md:col-span-2 flex justify-center">
                <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-12 py-4 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-black transition-all shadow-xl disabled:opacity-50"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={16} />} 
                    Submit Responses
                </button>
            </div>
        </div>
      )}

      {/* DISCUSSION FEED */}
      <div className="space-y-8 relative">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                <MessageSquare className="text-blue-600" /> Community Board
            </h3>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{submissions.length} Total Tactical Briefs</span>
          </div>
          
          {submissions.length === 0 ? (
              <div className="text-center p-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs">
                  No submissions yet. Be the first to lead!
              </div>
          ) : (
              <div className="grid grid-cols-1 gap-6">
                  
                  {/* PINNED: MY SUBMISSION */}
                  {mySubmission && (
                      <div className="bg-blue-50/30 p-6 md:p-8 rounded-[2.5rem] border-4 border-blue-100 shadow-xl relative overflow-hidden ring-4 ring-white animate-in zoom-in-95">
                          <div className="absolute top-0 right-0 p-4 bg-blue-600 text-white flex items-center gap-2 rounded-bl-3xl shadow-lg z-10">
                              <Pin size={16} fill="currentColor" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Your Tactical Entry</span>
                          </div>
                          <SubmissionCard sub={mySubmission} challenge={challenge} idx={-1} isMyEntry={true} onLike={handleLike} getBadges={getBadges} />
                      </div>
                  )}

                  {/* REST OF THE FEED */}
                  {otherSubmissions.map((sub, idx) => (
                      <div key={sub.id} className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-md hover:shadow-xl transition-all relative overflow-hidden">
                          <SubmissionCard sub={sub} challenge={challenge} idx={idx} onLike={handleLike} getBadges={getBadges} />
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};

// HELPER COMPONENT FOR THE CARDS
const SubmissionCard = ({ sub, challenge, idx, onLike, getBadges, isMyEntry = false }: any) => {
    return (
        <>
            {/* Badges Bar */}
            <div className="absolute top-0 right-12 p-4 flex gap-2">
                {getBadges(idx, sub).map((badge: any, bIdx: number) => (
                    <div key={bIdx} title={badge.label} className={`p-1.5 bg-slate-50 rounded-lg ${badge.color}`}>
                        <badge.icon size={14} fill="currentColor" />
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-4 mb-6 border-b border-slate-50 pb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm border-4 border-slate-100 ${isMyEntry ? 'bg-blue-600 text-white' : 'bg-slate-900 text-yellow-400'}`}>
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
                        {isMyEntry && <span className="text-[8px] bg-blue-100 text-blue-600 px-2 rounded font-black uppercase">You</span>}
                    </h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {sub.created_at ? new Date(sub.created_at).toLocaleTimeString() : 'Just Now'}
                    </p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block bg-blue-50 px-2 py-1 rounded w-fit">PPDT Story</span>
                        <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 p-4 rounded-xl border border-slate-100">
                            "{sub.ppdt_story || 'No story provided.'}"
                        </p>
                    </div>
                    <div className="space-y-2">
                        <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest block bg-purple-50 px-2 py-1 rounded w-fit">Interview Answer</span>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                            "{sub.interview_answer || 'No answer provided.'}"
                        </p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <span className="text-[9px] font-black text-green-600 uppercase tracking-widest block mb-2 bg-green-50 px-2 py-1 rounded w-fit">WAT: {challenge.wat_words?.[0]}</span>
                        <p className="text-xs text-slate-700 font-bold pl-4 border-l-2 border-green-100">
                            {sub.wat_answers?.[0]}
                        </p>
                    </div>
                    <div>
                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block mb-2 bg-orange-50 px-2 py-1 rounded w-fit">SRT Reaction</span>
                        <p className="text-xs text-slate-700 font-bold pl-4 border-l-2 border-orange-100">
                            {sub.srt_answers?.[0]}
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                <button 
                onClick={() => onLike(sub.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${sub.isLiked ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                    <Heart size={16} className={sub.isLiked ? "fill-red-600" : ""} />
                    <span className="text-xs font-bold">{sub.likes_count || 0} Concur</span>
                </button>
            </div>
        </>
    )
}

export default DailyPractice;
