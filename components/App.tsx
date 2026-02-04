
import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import Login from './components/Login';
import PPDTTest from './components/PPDTTest';
import PsychologyTest from './components/PsychologyTest';
import Interview from './components/Interview';
import PIQForm from './components/PIQForm';
import ContactForm from './components/ContactForm';
import SSBStages from './components/SSBStages';
import SSBBot from './components/SSBBot';
import AdminPanel from './components/AdminPanel';
import PaymentModal from './components/PaymentModal';
import LegalPages from './components/LegalPages';
import HowToUse from './components/HowToUse';
import CurrentAffairs from './components/CurrentAffairs';
import DailyPractice from './components/DailyPractice';
import ResourceCenter from './components/ResourceCenter';
import LecturetteTest from './components/LecturetteTest';
import { TestType, PIQData, UserSubscription } from '../types';
import { getUserData, saveUserData, saveTestAttempt, getUserHistory, checkAuthSession, syncUserProfile, subscribeToAuthChanges, isUserAdmin, checkLimit, getUserSubscription, getLatestPaymentRequest, incrementUsage, logoutUser } from '../services/supabaseService';
import { ShieldCheck, CheckCircle, Lock, Quote, Zap, Star, Shield, Flag, ChevronRight, LogIn, Loader2, History, Crown, Clock, AlertCircle, Phone, UserPlus, Percent, Tag, ArrowUpRight, Trophy, Medal, MessageCircle, X, Headset, Signal, Mail, ChevronDown, ChevronUp, Target, Brain, Mic, ImageIcon, FileSignature, ClipboardList, BookOpen, PenTool, Globe, Bot, Library } from 'lucide-react';
import { SSBLogo } from './components/Logo';

// Helper Component for Progress Ring
const ProgressRing: React.FC<{ score: number, color: string, label: string, icon: any, subtext: string }> = ({ score, color, label, icon: Icon, subtext }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.min(Math.max(score, 0), 10);
  const progress = (normalizedScore / 10) * circumference;
  
  return (
    <div className="flex flex-col items-center gap-3 relative group">
      <div className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="50%" cy="50%" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
          <circle cx="50%" cy="50%" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" 
            strokeDasharray={circumference} 
            strokeDashoffset={circumference - progress} 
            className={`${color} transition-all duration-1000 ease-out`} 
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
           <Icon size={20} className={`${color} mb-1 opacity-80`} />
           <span className="text-2xl font-black text-slate-800 leading-none">{normalizedScore.toFixed(1)}</span>
        </div>
      </div>
      <div className="text-center">
        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
        <span className="block text-[9px] font-bold text-slate-400 mt-0.5">{subtext}</span>
      </div>
    </div>
  )
}

// Dashboard Component
const Dashboard: React.FC<{ 
  onStartTest: (t: TestType, params?: any) => void, 
  piqLoaded: boolean,
  isLoggedIn: boolean,
  isLoading: boolean,
  user: string,
  onOpenPayment: () => void,
  subscription: UserSubscription | null,
  onShowGuestWarning: () => void
}> = ({ onStartTest, piqLoaded, isLoggedIn, isLoading, user, onOpenPayment, subscription, onShowGuestWarning }) => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [showFullHistory, setShowFullHistory] = useState(false);
  
  // Calculated Stats
  const [stats, setStats] = useState({
      ppdtAvg: 0,
      psychAvg: 0,
      interviewAvg: 0,
      totalTests: 0,
      rank: 'Cadet'
  });
  
  const quotes = [
    { text: "Either I will come back after hoisting the Tricolour, or I will come back wrapped in it, but I will be back for sure.", author: "Capt. Vikram Batra, PVC" },
    { text: "No Sir, I will not abandon my gun. My gun is still firing.", author: "Major Somnath Sharma, PVC" },
    { text: "If a man says he is not afraid of dying, he is either lying or is a Gurkha.", author: "Field Marshal Sam Manekshaw" },
    { text: "The safety, honour and welfare of your country come first, always and every time.", author: "Chetwode Motto" },
    { text: "I regret I have but one life to give for my country.", author: "Capt. Manoj Kumar Pandey, PVC" }
  ];

  const testimonials = [
    { name: "Deepak Rai", role: "NDA/TES Aspirant", text: "The 1:1 Virtual Interview experience was very realistic. The assessment report was detailed and actionable. A great platform for SSB preparation." },
    { name: "Aditya", role: "CDS/NCC Aspirant", text: "AI-based Virtual IO surprisingly accurate hai. Pressure, questions aur feedback sab kuch real interview jaisa laga." },
    { name: "Vikram Singh Rawat", role: "AFCAT/CDS Aspirant", text: "This platform focuses on genuine improvement, not shortcuts. The detailed assessment really helps in developing officer-like qualities." },
    { name: "Arti Patel", role: "TES/NDA Aspirant", text: "The platform simulates real SSB pressure. Especially the Virtual IO interview — very close to the actual experience." },
    { name: "Shubham", role: "SSC Tech/NCC Entry", text: "Never seen this level of personal interview practice before." },
    { name: "Mohit", role: "NCC/AFCAT Entry", text: "Interview section is really great and feeling like IO is real and body language bhi dekhta h." },
    { name: "Ayush", role: "SSB Recommended", text: "As founder contact me for testing, I can say it is One of the most structured and realistic SSB practice platforms I’ve used online." }
  ];

  const quickActions = [
    { id: TestType.INTERVIEW, label: '1:1 Interview', sub: 'Virtual IO', icon: Mic, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
    { id: TestType.PPDT, label: 'PPDT', sub: 'Screening', icon: ImageIcon, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { id: TestType.TAT, label: 'TAT', sub: 'Psychology', icon: PenTool, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
    { id: TestType.WAT, label: 'WAT', sub: 'Psychology', icon: Zap, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
    { id: TestType.SRT, label: 'SRT', sub: 'Psychology', icon: Brain, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
    { id: TestType.SDT, label: 'SDT', sub: 'Self Desc.', icon: FileSignature, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { id: TestType.DAILY_PRACTICE, label: 'Daily Dose', sub: 'Practice', icon: Clock, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
    { id: TestType.CURRENT_AFFAIRS, label: 'Daily News', sub: 'Updates', icon: Globe, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
    { id: TestType.AI_BOT, label: 'AI Guide', sub: 'ChatBot', icon: Bot, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100' },
    { id: TestType.RESOURCES, label: 'Free Resources', sub: 'Library', icon: Library, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { id: TestType.LECTURETTE, label: 'Lecturette', sub: 'Topics', icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % quotes.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [quotes.length]);

  useEffect(() => {
    const timer = setInterval(() => {
        setTestimonialIndex(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  useEffect(() => {
    if (isLoggedIn && user && !user.startsWith('demo')) {
      setLoadingHistory(true);
      getUserHistory(user).then(data => {
        setHistory(data);
        
        // Calculate Stats
        const ppdtLogs = data.filter(h => h.type.includes('PPDT'));
        const psychLogs = data.filter(h => ['TAT', 'WAT', 'SRT', 'SDT'].some(t => h.type.includes(t)));
        const interviewLogs = data.filter(h => h.type.includes('INTERVIEW'));

        const ppdtAvg = ppdtLogs.length ? ppdtLogs.reduce((a, b) => a + (Number(b.score) || 0), 0) / ppdtLogs.length : 0;
        const psychAvg = psychLogs.length ? psychLogs.reduce((a, b) => a + (Number(b.score) || 0), 0) / psychLogs.length : 0;
        const interviewAvg = interviewLogs.length ? interviewLogs.reduce((a, b) => a + (Number(b.score) || 0), 0) / interviewLogs.length : 0;
        
        const totalTests = data.length;
        let rank = 'Cadet';
        if (totalTests > 5) rank = 'Lieutenant';
        if (totalTests > 15) rank = 'Captain';
        if (totalTests > 30) rank = 'Major';
        if (ppdtAvg > 8 && interviewAvg > 8) rank = 'Commando';

        setStats({ ppdtAvg, psychAvg, interviewAvg, totalTests, rank });
        setLoadingHistory(false);
      });
      
      const fetchStatus = () => {
         getLatestPaymentRequest(user).then((status: any) => setPaymentStatus(status));
      };
      
      fetchStatus();
      const interval = setInterval(() => {
          fetchStatus();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, user]);

  const getRemainingCredits = (type: string) => {
      if (!subscription) return { remaining: 0, total: 0 };
      const usage = subscription.usage;
      const key = type.toLowerCase();
      // @ts-ignore
      const used = usage[`${key}_used`] || 0;
      // @ts-ignore
      const limit = usage[`${key}_limit`] || 0;
      const extra = type === 'Interview' ? (subscription.extra_credits?.interview || 0) : 0;
      const total = limit + extra;
      return { remaining: Math.max(0, total - used), total };
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* PAYMENT STATUS BANNER */}
      {paymentStatus && paymentStatus.status === 'PENDING' && (
         <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 animate-pulse">
                  <Clock size={20} />
               </div>
               <div>
                  <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">Verification In Progress</h4>
                  <p className="text-xs text-slate-600 font-medium">Your payment of ₹{paymentStatus.amount} is being reviewed. Estimated time: 30-60 Mins.</p>
               </div>
            </div>
            <div className="text-[10px] font-mono text-slate-400">UTR: {paymentStatus.utr}</div>
         </div>
      )}

      {paymentStatus && paymentStatus.status === 'REJECTED' && (
         <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  <AlertCircle size={20} />
               </div>
               <div>
                  <h4 className="font-black text-red-900 uppercase text-xs tracking-widest">Payment Rejected</h4>
                  <p className="text-xs text-red-700 font-medium">Admin could not verify UTR: {paymentStatus.utr}. Please check and try again.</p>
               </div>
            </div>
            <button onClick={onOpenPayment} className="px-4 py-2 bg-red-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest">Retry Payment</button>
         </div>
      )}

      {/* HERO SECTION */}
      <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 text-white relative overflow-hidden shadow-2xl border-b-8 border-yellow-500">
         <div className="relative z-10 grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
           <div className="space-y-6">
             <div className="flex items-center gap-3">
               <span className="px-3 py-1 bg-yellow-400 text-black text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg animate-bounce">Officer Potential</span>
               {subscription?.tier === 'PRO' && <span className="px-3 py-1 bg-blue-600 text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-full flex items-center gap-2"><Crown size={12}/> Pro Cadet</span>}
               <span className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Board Simulation v4.0</span>
             </div>
             <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">Do You Have It <br/><span className="text-yellow-400 italic font-serif">In You?</span></h1>
             <p className="text-slate-400 text-sm md:text-lg leading-relaxed font-medium italic opacity-80">
               "Victory favors the prepared. The SSB doesn't test your knowledge; it tests your personality, grit, and 15 Officer Like Qualities."
             </p>
             
             {isLoggedIn ? (
               <div className="flex flex-wrap gap-4 pt-4">
                 <button 
                   onClick={() => piqLoaded ? onStartTest(TestType.INTERVIEW) : onStartTest(TestType.PIQ)}
                   className={`flex-1 md:flex-none px-6 md:px-10 py-4 md:py-5 font-black rounded-2xl transition-all shadow-xl hover:-translate-y-1 uppercase tracking-widest text-[10px] md:text-[11px] flex items-center justify-center gap-3 ${piqLoaded ? 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-yellow-400/20' : 'bg-slate-800 text-slate-500 border border-white/5'}`}
                   disabled={isLoading}
                 >
                   {isLoading ? 'Syncing...' : (piqLoaded ? 'Start AI Interview' : 'Unlock Interview (Fill PIQ)')}
                 </button>
               </div>
             ) : (
               <div className="pt-4 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 w-full">
                    <button onClick={() => onStartTest(TestType.REGISTER)} className="px-8 md:px-10 py-5 bg-yellow-400 text-black rounded-2xl font-black uppercase text-xs shadow-xl shadow-yellow-400/20 hover:bg-yellow-300 hover:scale-105 transition-all flex items-center justify-center gap-3">
                        <UserPlus size={16} /> New User Sign Up
                    </button>
                    <button onClick={() => onStartTest(TestType.LOGIN)} className="px-8 md:px-10 py-5 bg-white/5 text-white rounded-2xl font-black uppercase text-xs border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                        <LogIn size={16} /> Login
                    </button>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                     Experience platform in Guest Mode without login
                  </p>
               </div>
             )}

             {isLoggedIn && subscription && (
                 <div className="mt-4 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 mb-4"><Zap size={14} className="text-yellow-400" /> Plan Credits Remaining</p>
                    <div className="grid grid-cols-5 gap-2 md:gap-4">
                        {['Interview', 'PPDT', 'TAT', 'WAT', 'SRT'].map((key) => {
                            const { remaining, total } = getRemainingCredits(key);
                            return (
                                <div key={key} className="space-y-1 pr-2 border-r border-white/5 last:border-0">
                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{key}</p>
                                    <p className="text-xs md:text-sm font-black text-white">{remaining} <span className="text-slate-600 text-[9px] font-bold">/ {total}</span></p>
                                </div>
                            );
                        })}
                    </div>
                 </div>
             )}
           </div>
           <div className="hidden lg:flex flex-col gap-6 relative justify-center h-full">
              {/* BRANDING HEADER - Added above quotes */}
              <div className="w-full flex justify-end animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
                  <div className="flex items-center gap-4">
                      <div className="text-right">
                          <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">
                          SSB<span className="text-yellow-400">PREP</span>.ONLINE
                          </h2>
                          <p className="text-blue-200/60 text-[9px] font-black uppercase tracking-[0.3em] mt-1">
                          Prepare. Lead. Succeed
                          </p>
                      </div>
                      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-sm">
                          <SSBLogo className="w-8 h-8" />
                      </div>
                  </div>
              </div>

              <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 space-y-8 relative z-10 shadow-inner group overflow-hidden">
                <Quote size={120} className="absolute top-0 right-0 p-4 opacity-5" />
                <div className="space-y-4 animate-in fade-in duration-1000" key={quoteIndex}>
                  <p className="text-2xl font-black text-white italic uppercase tracking-tighter">"{quotes[quoteIndex].text}"</p>
                  <p className="text-yellow-400 font-black uppercase tracking-widest text-[10px]">— {quotes[quoteIndex].author}</p>
                </div>
              </div>
           </div>
         </div>
         <ShieldCheck className="absolute top-1/2 -right-12 -translate-y-1/2 w-[20rem] md:w-[30rem] h-[20rem] md:h-[30rem] text-white/5 rotate-12 pointer-events-none" />
      </div>

      {/* SOLDIER PROFILE CARD & ROADMAP */}
      <div className="grid lg:grid-cols-12 gap-6 md:gap-10">
        <div className="lg:col-span-8 space-y-6 md:space-y-10">
          
          {/* NEW SOLDIER PROFILE VISUALIZER */}
          {isLoggedIn && (
            <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden relative">
              <div className="flex justify-between items-center mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <Trophy size={24} className="text-yellow-400" />
                    </div>
                    <div>
                        <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tighter">Soldier Profile</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            Current Rank: <span className="text-blue-600">{stats.rank}</span>
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="block text-2xl font-black text-slate-900">{stats.totalTests}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Missions Logged</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 md:gap-8 mb-8 relative z-10">
                  <ProgressRing 
                    score={stats.ppdtAvg} 
                    color="text-blue-500" 
                    label="PPDT" 
                    icon={Target}
                    subtext="Screening Avg"
                  />
                  <ProgressRing 
                    score={stats.psychAvg} 
                    color="text-purple-500" 
                    label="Psychology" 
                    icon={Brain}
                    subtext="TAT/WAT/SRT"
                  />
                  <ProgressRing 
                    score={stats.interviewAvg} 
                    color="text-yellow-500" 
                    label="Interview" 
                    icon={Mic}
                    subtext="IO Score"
                  />
              </div>

              {/* History Toggle */}
              <div className="border-t border-slate-100 pt-4">
                  <button 
                    onClick={() => setShowFullHistory(!showFullHistory)}
                    className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                  >
                      {showFullHistory ? 'Hide Mission Logs' : 'View Detailed Mission Logs'}
                      {showFullHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  
                  {showFullHistory && (
                      <div className="mt-4 space-y-3 animate-in slide-in-from-top-4">
                          {loadingHistory ? (
                            <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-slate-300" /></div>
                          ) : history.length === 0 ? (
                            <div className="text-center p-8 bg-slate-50 rounded-3xl text-slate-400 text-xs font-medium italic">
                              "No mission records found. Start a test to populate data."
                            </div>
                          ) : (
                            history.map((h, i) => (
                                <div key={i} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors gap-3">
                                    <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-black text-[10px]">
                                        {h.type.substring(0,2)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase text-slate-800 tracking-wide">{h.type}</p>
                                        <p className="text-[9px] text-slate-400 font-bold">{new Date(h.timestamp).toLocaleDateString()}</p>
                                    </div>
                                    </div>
                                    <div className="text-right flex md:block w-full md:w-auto justify-between items-center">
                                    <p className="text-xs font-black text-slate-900">Score: {h.score}</p>
                                    <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest">Logged</p>
                                    </div>
                                </div>
                            ))
                          )}
                      </div>
                  )}
              </div>
              
              {/* Decorative Background Element */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-slate-50 rounded-full blur-3xl opacity-50 pointer-events-none" />
            </div>
          )}

          {/* QUICK ACTION GRID (Mobile Friendly) */}
          <div className="space-y-4">
             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                 <Zap className="text-yellow-500" /> Quick Deployment
             </h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            // Define guest allowed tests for quick actions
                            const guestAllowed = [
                                TestType.INTERVIEW, TestType.PPDT, TestType.TAT, TestType.SDT, 
                                TestType.WAT, TestType.SRT, TestType.RESOURCES, 
                                TestType.CURRENT_AFFAIRS, TestType.AI_BOT, TestType.LECTURETTE
                            ];
                            
                            if (!isLoggedIn) {
                                if (action.id === TestType.PIQ) { onStartTest(TestType.LOGIN); return; }
                                
                                // Guest Interview Warning
                                if (action.id === TestType.INTERVIEW) {
                                    onShowGuestWarning();
                                    return;
                                }

                                if (guestAllowed.includes(action.id)) {
                                     onStartTest(action.id, undefined); 
                                     return; 
                                }
                                onStartTest(TestType.LOGIN);
                                return;
                            }
                            
                            // Logged in logic
                            if (action.id === TestType.INTERVIEW && !piqLoaded) {
                                onStartTest(TestType.PIQ);
                                return;
                            }
                            
                            onStartTest(action.id, undefined);
                        }}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all hover:-translate-y-1 hover:shadow-lg ${action.bg} ${action.border}`}
                    >
                        <div className={`p-3 bg-white rounded-xl shadow-sm ${action.color}`}>
                            <action.icon size={20} />
                        </div>
                        <div className="text-center">
                            <span className="block text-xs font-black text-slate-900 uppercase tracking-tight leading-tight">{action.label}</span>
                            <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">{action.sub}</span>
                        </div>
                    </button>
                ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 md:space-y-10">
           <div className="bg-slate-950 p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-500" />
              <Star className="text-yellow-400 w-12 h-12 md:w-16 md:h-16 mb-6 md:mb-8 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-widest mb-4 md:mb-6">The Aspirant's Creed</h3>
              <div className="space-y-4 md:space-y-6 text-xs md:text-sm font-medium italic text-slate-400 leading-relaxed">
                 <p>"I am a leader in the making. I do not fear the challenge; I welcome the trial."</p>
                 <p>"I shall be honest with my words, firm with my actions, and loyal to my team."</p>
                 <p>"Failure is but a lesson in persistence. My resolve is my shield, and my discipline is my weapon."</p>
              </div>
           </div>

           <div className="bg-blue-600 p-8 md:p-10 rounded-[2rem] md:rounded-[3.5rem] text-white shadow-xl flex flex-col items-center text-center gap-6 group hover:scale-[1.02] transition-all">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/30 shadow-2xl">
                <Shield className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <div>
                <h4 className="text-lg md:text-xl font-black uppercase tracking-widest mb-2">SSB Navigator</h4>
                <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                  Comprehensive 5-Day Stage Guide Active
                </p>
              </div>
              <button onClick={() => onStartTest(TestType.STAGES)} className="w-full py-4 bg-white text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl">Briefing Room</button>
           </div>
        </div>
      </div>

      {/* REDESIGNED TESTIMONIALS (Dark Military Theme) */}
      <section className="bg-slate-900 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl border-4 border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-30"></div>
          
          <div className="flex flex-col items-center text-center space-y-8 relative z-10">
              <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <MessageCircle className="text-yellow-400" size={28} />Feedbacks
              </h2>
              
              <div key={testimonialIndex} className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl w-full">
                  <div className="bg-white/5 backdrop-blur-md p-8 md:p-10 rounded-3xl border border-white/10 relative">
                      <Quote className="absolute top-6 left-6 text-white/10 rotate-180" size={48} />
                      
                      <div className="space-y-6 relative z-10">
                          <div className="flex justify-center gap-1">
                              {[1,2,3,4,5].map(i => <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />)}
                          </div>
                          
                          <p className="text-base md:text-xl font-medium text-slate-200 italic leading-relaxed">
                              "{testimonials[testimonialIndex].text}"
                          </p>
                          
                          <div className="pt-6 border-t border-white/10 flex items-center justify-center gap-4">
                              <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-blue-600/20">
                                  {testimonials[testimonialIndex].name[0]}
                              </div>
                              <div className="text-left">
                                  <p className="text-sm font-black text-white uppercase tracking-wide">{testimonials[testimonialIndex].name}</p>
                                  <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest">{testimonials[testimonialIndex].role}</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="flex justify-center gap-2 mt-4">
                  {testimonials.map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${i === testimonialIndex ? 'w-8 bg-yellow-400' : 'w-2 bg-slate-700'}`}
                        onClick={() => setTestimonialIndex(i)} 
                      />
                  ))}
              </div>
          </div>
      </section>

      {/* REDESIGNED TECHNICAL SUPPORT (Dark Military Theme) */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] border-4 border-slate-800 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left shadow-2xl">
          {/* Background Decor */}
          <Headset className="absolute -right-6 -bottom-6 w-40 h-40 text-white/5 rotate-12 pointer-events-none" />
          
          <div className="relative z-10 space-y-3">
              <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-[9px] font-black uppercase tracking-widest mb-2">
                  Help Support
              </span>
              <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none">
                  Need <span className="text-yellow-400">Assistance?</span>
              </h4>
              <p className="text-xs md:text-sm font-medium text-slate-400 max-w-md leading-relaxed">
                  Facing technical issues ?  feedback? other issues ?Reach out to our support team directly.
              </p>
          </div>

          <div className="relative z-10 flex flex-wrap justify-center gap-4">
              <a 
                href="tel:+919131112322" 
                className="flex items-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all shadow-lg shadow-blue-900/50 group border border-blue-500"
              >
                  <div className="bg-white/20 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
                    <Phone size={16} fill="currentColor" />
                  </div>
                  <div className="text-left">
                      <span className="block text-[8px] font-bold opacity-80 uppercase tracking-wider">Helpline</span>
                      <span className="block text-xs font-black tracking-wide">+91 9131112322</span>
                  </div>
              </a>
              <a 
                href="mailto:contact.ssbprep@gmail.com" 
                className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl transition-all group backdrop-blur-sm"
              >
                  <div className="bg-slate-800 p-1.5 rounded-lg group-hover:scale-110 transition-transform text-slate-300">
                    <Mail size={16} />
                  </div>
                  <div className="text-left">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Email Us</span>
                      <span className="block text-xs font-black tracking-wide">Support Desk</span>
                  </div>
              </a>
          </div>
      </div>

    </div>
  );
};

const App: React.FC = () => {
  const [activeTest, setActiveTest] = useState<TestType>(TestType.DASHBOARD);
  const [user, setUser] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [piqData, setPiqData] = useState<PIQData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentOpen, setPaymentOpen] = useState(false);
  const [pendingPaymentIntent, setPendingPaymentIntent] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  // Fixed state initialization type to match ResourceCenter props
  const [resourceTab, setResourceTab] = useState<'GK' | 'GD' | 'INTERVIEW' | 'BLOG'>('GK');
  const [showGuestInterviewWarning, setShowGuestInterviewWarning] = useState(false);

  const isPIQComplete = (data: PIQData | null) => {
      return !!(data?.name && data?.chestNo);
  };

  useEffect(() => {
    const initAuth = async () => {
      const sessionUser = await checkAuthSession();
      if (sessionUser) {
        setUser(sessionUser.id);
        setUserEmail(sessionUser.email || '');
        syncUserProfile(sessionUser);
        
        // Fetch Data Parallel
        const [data, sub] = await Promise.all([
            getUserData(sessionUser.id),
            getUserSubscription(sessionUser.id)
        ]);
        
        if (data) setPiqData(data);
        if (sub) setSubscription(sub);
      }
      setIsLoading(false);
    };
    initAuth();
    
    // Refresh subscription periodically or on focus could be added here
    const unsubscribe = subscribeToAuthChanges((u: any) => {
      if (u) {
        setUser(u.id);
        setUserEmail(u.email || '');
        getUserData(u.id).then((d: PIQData | null) => d && setPiqData(d));
        getUserSubscription(u.id).then((s) => setSubscription(s));
      } else {
        setUser(null); setUserEmail(null); setPiqData(null); setSubscription(null);
      }
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  const handleLogin = (uid: string, email?: string) => {
    setUser(uid); setUserEmail(email || '');
    getUserData(uid).then((d: PIQData | null) => d && setPiqData(d));
    getUserSubscription(uid).then((s) => setSubscription(s));
    setActiveTest(TestType.DASHBOARD);
    if (pendingPaymentIntent) { setPaymentOpen(true); setPendingPaymentIntent(false); }
  };

  const navigateTo = async (test: TestType, params?: any) => {
     if ((test === TestType.LOGIN || test === TestType.REGISTER) && user) return; 
     
     // Handle params
     if (params?.tab) setResourceTab(params.tab);

     // Remove strict auth guard for trial tests
     const protectedRoutes = [TestType.PIQ, TestType.DAILY_PRACTICE];
     if (protectedRoutes.includes(test) && !user) { setActiveTest(TestType.LOGIN); return; }
     
     // Guest Warning for Interview
     if (!user && test === TestType.INTERVIEW) {
         setShowGuestInterviewWarning(true);
         return;
     }
     
     // Allow guest access to interview but force PIQ check for logged in users
     if (user && test === TestType.INTERVIEW && !isPIQComplete(piqData)) { setActiveTest(TestType.PIQ); return; }
     
     if ((test === TestType.INTERVIEW || test === TestType.TAT) && user) {
        const { allowed, message } = await checkLimit(user, test);
        if (!allowed) { setPaymentOpen(true); return; }
     }
     if (test === TestType.ADMIN && !isUserAdmin(userEmail)) return;
     setActiveTest(test);
  };
  
  const handleTestComplete = async (result: any) => {
      if (!user) return;
      await saveTestAttempt(user, activeTest.toString(), result);
      if (!result.isCustomAttempt) await incrementUsage(user, activeTest.toString());
      // Refresh sub after usage
      getUserSubscription(user).then((s) => setSubscription(s));
  };

  const renderContent = () => {
    switch (activeTest) {
      case TestType.LOGIN: return <Login initialIsSignUp={false} onLogin={handleLogin} onCancel={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.REGISTER: return <Login initialIsSignUp={true} onLogin={handleLogin} onCancel={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.PIQ: return <PIQForm onSave={async (data: PIQData) => { if(user) { await saveUserData(user, data); setPiqData(data); setActiveTest(TestType.DASHBOARD); }}} initialData={piqData || undefined} />;
      case TestType.PPDT: return <PPDTTest onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.TAT: return <PsychologyTest type={TestType.TAT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.WAT: return <PsychologyTest type={TestType.WAT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.SRT: return <PsychologyTest type={TestType.SRT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.SDT: return <PsychologyTest type={TestType.SDT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.INTERVIEW: return <Interview piqData={piqData || undefined} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.CONTACT: return <ContactForm piqData={piqData || undefined} />;
      case TestType.STAGES: return <SSBStages />;
      case TestType.AI_BOT: return <SSBBot />;
      case TestType.ADMIN: return isUserAdmin(userEmail) ? <AdminPanel /> : null;
      case TestType.TERMS:
      case TestType.PRIVACY:
      case TestType.REFUND: return <LegalPages type={activeTest} onBack={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.GUIDE: return <HowToUse onNavigate={setActiveTest} />;
      case TestType.CURRENT_AFFAIRS: return <CurrentAffairs />;
      case TestType.DAILY_PRACTICE: return <DailyPractice />;
      case TestType.RESOURCES: return <ResourceCenter initialTab={resourceTab} />;
      case TestType.LECTURETTE: return <LecturetteTest />;
      default: return <Dashboard 
            onStartTest={navigateTo} 
            piqLoaded={isPIQComplete(piqData)} 
            isLoggedIn={!!user} 
            isLoading={isLoading} 
            user={user || ''} 
            onOpenPayment={() => setPaymentOpen(true)} 
            subscription={subscription} 
            onShowGuestWarning={() => setShowGuestInterviewWarning(true)}
        />;
    }
  };

  return (
    <Layout activeTest={activeTest} onNavigate={navigateTo} onLogout={async () => { await logoutUser(); setUser(null); setActiveTest(TestType.DASHBOARD); }} onLogin={() => setActiveTest(TestType.LOGIN)} user={userEmail || undefined} isLoggedIn={!!user} isAdmin={isUserAdmin(userEmail)} subscription={subscription}>
      {renderContent()}
      {user && <PaymentModal userId={user} isOpen={isPaymentOpen} onClose={() => setPaymentOpen(false)} onSuccess={() => { getUserSubscription(user).then(s => setSubscription(s)); }} />}
      
      {/* GUEST INTERVIEW WARNING MODAL (GLOBAL) */}
      {showGuestInterviewWarning && (
          <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600">
                      <Mic size={32} />
                  </div>
                  <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase">Trial Interview Mode</h3>
                      <p className="text-slate-500 text-xs font-medium mt-2 leading-relaxed">
                          This is a <strong>5-minute demo</strong> session. The AI officer will not have access to your PIQ form.
                      </p>
                      <p className="text-slate-500 text-xs font-medium mt-2 leading-relaxed">
                          For a complete 30-minute interview based on your specific background, please login.
                      </p>
                  </div>
                  <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => { setShowGuestInterviewWarning(false); navigateTo(TestType.LOGIN); }} 
                        className="w-full py-4 bg-yellow-400 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-yellow-300 transition-colors shadow-lg"
                      >
                          Login for Full Experience
                      </button>
                      <button 
                        onClick={() => { setShowGuestInterviewWarning(false); setActiveTest(TestType.INTERVIEW); }} 
                        className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors"
                      >
                          Continue as Guest
                      </button>
                  </div>
                  <button 
                    onClick={() => setShowGuestInterviewWarning(false)} 
                    className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-50 rounded-full hover:bg-slate-100"
                  >
                      <X size={16} />
                  </button>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default App;
