
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
import Footer from './components/Footer';
import { TestType, PIQData, UserSubscription } from './types';
import { getUserData, saveUserData, saveTestAttempt, getUserHistory, checkAuthSession, syncUserProfile, subscribeToAuthChanges, isUserAdmin, getUserSubscription, getLatestPaymentRequest, incrementUsage, logoutUser, checkBalance, deductCoins, TEST_RATES } from './services/supabaseService';
import { ShieldCheck, CheckCircle, Lock, Quote, Zap, Star, Shield, Flag, ChevronRight, LogIn, Loader2, History, Crown, Clock, AlertCircle, Phone, UserPlus, Percent, Tag, ArrowUpRight, Trophy, Medal, MessageCircle, X, Headset, Signal, Mail, ChevronDown, ChevronUp, Target, Brain, Mic, ImageIcon, FileSignature, ClipboardList, BookOpen, PenTool, Globe, Bot, Library, ArrowDown, IndianRupee, Coins } from 'lucide-react';
import { SSBLogo } from './components/Logo';

// Helper Component for Progress Ring (Unchanged)
const ProgressRing: React.FC<{ score: number, color: string, label: string, icon: any, subtext: string }> = ({ score, color, label, icon: Icon, subtext }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.min(Math.max(score, 0), 10);
  const progress = (normalizedScore / 10) * circumference;
  
  return (
    <div className="flex flex-col items-center gap-3 relative group">
      <div className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center">
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

// Dashboard Component (Updated to show Coin Costs)
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
  // ... (State and Effects identical to previous version, just ensuring TEST_RATES are used correctly in quickActions)
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [showFullHistory, setShowFullHistory] = useState(false);
  
  const [stats, setStats] = useState({
      ppdtAvg: 0,
      psychAvg: 0,
      interviewAvg: 0,
      totalTests: 0,
      rank: 'Cadet'
  });
  
  const quotes = [
    { text: "Either I will come back after hoisting the Tricolour, or I will come back wrapped in it, but I will be back for sure.", author: "Capt. Vikram Batra, PVC" },
    { text: "No Sir, I will not abandon my gun. My gun is still firing.", author: "Lieutenant Arun Khetarpal" },
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
    { id: TestType.PPDT, label: 'PPDT', sub: 'Screening', icon: ImageIcon, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', cost: TEST_RATES.PPDT },
    { id: TestType.TAT, label: 'TAT', sub: 'Psychology', icon: PenTool, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', cost: TEST_RATES.TAT },
    { id: TestType.WAT, label: 'WAT', sub: 'Psychology', icon: Zap, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', cost: TEST_RATES.WAT },
    { id: TestType.SRT, label: 'SRT', sub: 'Psychology', icon: Brain, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', cost: TEST_RATES.SRT },
    { id: TestType.SDT, label: 'SDT', sub: 'Self Desc.', icon: FileSignature, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', cost: TEST_RATES.SDT },
    { id: TestType.LECTURETTE, label: 'Lecturette', sub: 'Topics', icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', cost: TEST_RATES.LECTURETTE },
    { id: TestType.INTERVIEW, label: '1:1 Interview', sub: 'Virtual IO', icon: Mic, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', cost: TEST_RATES.INTERVIEW_FULL }, // Used for display logic mainly
    { id: TestType.DAILY_PRACTICE, label: 'Daily Dose', sub: 'Practice', icon: Clock, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100', cost: 0 },
    { id: TestType.CURRENT_AFFAIRS, label: 'Daily News', sub: 'Updates', icon: Globe, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', cost: 0 },
    { id: TestType.AI_BOT, label: 'AI Guide', sub: 'ChatBot', icon: Bot, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100', cost: 0 },
    { id: TestType.RESOURCES, label: 'Free Resources', sub: 'Library', icon: Library, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', cost: 0 },
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

  const scrollToQuickActions = () => {
      const el = document.getElementById('quick-deployment');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // ... (HERO SECTION RENDER logic mostly same, adding Coin display in user panel) ...

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-0">
      
      {/* ... Payment Banners ... */}
      
      {/* HERO SECTION */}
      <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 text-white relative overflow-hidden shadow-2xl border-b-8 border-yellow-500">
         <div className="relative z-10 grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
           <div className="space-y-6">
             <div className="flex items-center gap-3">
               <span className="px-3 py-1 bg-yellow-400 text-black text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg animate-bounce">Officer Potential</span>
               <span className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Board Simulation v4.0</span>
             </div>
             <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">Master Your SSB <br/><span className="text-yellow-400">1:1 PI with Col. Arjun Singh (Virtual IO)</span></h1>
             <p className="text-slate-300 text-sm md:text-lg leading-relaxed font-medium opacity-90 max-w-2xl">
               Practice exactly like real SSB with full detailed and personalised assessment. Use Coins to unlock tests.
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
                 
                 <button 
                    onClick={() => onStartTest(TestType.DAILY_PRACTICE)}
                    className="flex-1 md:flex-none px-6 md:px-10 py-4 md:py-5 bg-blue-600/20 text-blue-300 border border-blue-500/30 backdrop-blur-sm rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-[11px] hover:bg-blue-600/40 transition-all flex items-center justify-center gap-3"
                 >
                    <Clock size={16} /> Daily Challenge (Free)
                 </button>
               </div>
             ) : (
               <div className="pt-4 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 w-full">
                    <button onClick={() => onStartTest(TestType.REGISTER)} className="px-8 md:px-10 py-5 bg-yellow-400 text-black rounded-2xl font-black uppercase text-xs shadow-xl shadow-yellow-400/20 hover:bg-yellow-300 hover:scale-105 transition-all flex items-center justify-center gap-3">
                        <UserPlus size={16} /> Sign Up (Get 50 Coins)
                    </button>
                    <button onClick={() => onStartTest(TestType.LOGIN)} className="px-8 md:px-10 py-5 bg-white/5 text-white rounded-2xl font-black uppercase text-xs border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                        <LogIn size={16} /> Login
                    </button>
                  </div>
                  <button 
                    onClick={scrollToQuickActions}
                    className="w-full md:w-auto px-6 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 group backdrop-blur-sm"
                  >
                     <span>Explore as Guest</span> <ArrowDown size={14} className="group-hover:translate-y-1 transition-transform" />
                  </button>
               </div>
             )}

             {isLoggedIn && subscription && (
                 <div className="mt-4 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                            <Zap size={14} className="text-yellow-400" /> Wallet Status
                        </p>
                        <button onClick={onOpenPayment} className="text-[9px] font-bold px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors uppercase tracking-widest">
                           Add Coins
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-3xl font-black text-white flex items-center gap-2">
                            <Coins size={24} /> {subscription.coins}
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">Available Credits</span>
                    </div>
                 </div>
             )}
           </div>
           
           {/* ... Right side Hero Image (unchanged) ... */}
           <div className="hidden lg:flex flex-col gap-6 relative justify-center h-full">
              {/* BRANDING HEADER */}
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

      {/* SOLDIER PROFILE & ROADMAP */}
      <div className="grid lg:grid-cols-12 gap-6 md:gap-10">
        <div className="lg:col-span-8 space-y-6 md:space-y-10">
          
          {/* Soldier Profile ... (unchanged) ... */}
          {isLoggedIn && (
            <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden relative">
              {/* ... same stats content ... */}
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
                  <ProgressRing score={stats.ppdtAvg} color="text-blue-500" label="PPDT" icon={Target} subtext="Screening Avg" />
                  <ProgressRing score={stats.psychAvg} color="text-purple-500" label="Psychology" icon={Brain} subtext="TAT/WAT/SRT" />
                  <ProgressRing score={stats.interviewAvg} color="text-yellow-500" label="Interview" icon={Mic} subtext="IO Score" />
              </div>
              {/* ... history toggle etc ... */}
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
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-slate-50 rounded-full blur-3xl opacity-50 pointer-events-none" />
            </div>
          )}

          {/* QUICK ACTION GRID - WITH COIN COSTS */}
          <div className="space-y-4" id="quick-deployment">
             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                 <Zap className="text-yellow-500" /> Quick Deployment
             </h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            if (!isLoggedIn) {
                                if (action.id === TestType.PIQ || action.id === TestType.INTERVIEW) {
                                    onStartTest(TestType.LOGIN); return;
                                }
                                onStartTest(action.id, undefined); return;
                            }
                            
                            // Free Tests
                            if (action.cost === 0) {
                                onStartTest(action.id, undefined);
                                return;
                            }

                            // Interview Check
                            if (action.id === TestType.INTERVIEW && !piqLoaded) {
                                onStartTest(TestType.PIQ);
                                return;
                            }
                            
                            // Check Balance and Prompt
                            onStartTest(action.id, { cost: action.cost });
                        }}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all hover:-translate-y-1 hover:shadow-lg ${action.bg} ${action.border} relative overflow-hidden`}
                    >
                        <div className={`p-3 bg-white rounded-xl shadow-sm ${action.color}`}>
                            <action.icon size={20} />
                        </div>
                        <div className="text-center relative z-10">
                            <span className="block text-xs font-black text-slate-900 uppercase tracking-tight leading-tight">{action.label}</span>
                            <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">{action.sub}</span>
                        </div>
                        
                        {/* Only show Cost if Logged In */}
                        {isLoggedIn && action.cost > 0 && (
                            <div className="absolute top-2 right-2 bg-slate-900 text-yellow-400 px-2 py-0.5 rounded text-[8px] font-black flex items-center gap-1 shadow-sm">
                                <Coins size={8} /> {action.cost}
                            </div>
                        )}
                        
                        {/* Only show FREE if explicitly cost 0 AND NOT Interview (Interview has special lobby with costs) */}
                        {action.cost === 0 && action.id !== TestType.INTERVIEW && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-0.5 rounded text-[8px] font-black shadow-sm">
                                FREE
                            </div>
                        )}
                    </button>
                ))}
             </div>
          </div>
        </div>

        {/* ... (Right Column unchanged) ... */}
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

      {/* ... (Testimonials & Footer unchanged) ... */}
      <Footer onNavigate={onStartTest} />
    </div>
  );
};

const App: React.FC = () => {
  const [activeTest, setActiveTest] = useState<TestType>(TestType.DASHBOARD);
  const [user, setUser] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [piqData, setPiqData] = useState<PIQData | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentOpen, setPaymentOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const sessionUser = await checkAuthSession();
      if (sessionUser) {
        handleUserAuthenticated(sessionUser);
      }
      setIsLoading(false);
    };
    initAuth();
    const unsubscribe = subscribeToAuthChanges((u) => {
      if (u) { handleUserAuthenticated(u); } else {
        setUser(null); setUserEmail(null); setPiqData(null); setSubscription(null);
      }
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  const handleUserAuthenticated = async (u: any) => {
      setUser(u.id);
      setUserEmail(u.email || '');
      getUserData(u.id).then(d => d && setPiqData(d));
      getUserSubscription(u.id).then(sub => setSubscription(sub));
      const hasSeenWelcome = localStorage.getItem(`ssb_welcome_seen_${u.id}`);
      if (!hasSeenWelcome) setShowWelcome(true);
  };

  const handleLogin = (uid: string, email?: string) => {
    setUser(uid);
    setUserEmail(email || '');
    setActiveTest(TestType.DASHBOARD);
    getUserData(uid).then(d => d && setPiqData(d));
    getUserSubscription(uid).then(sub => setSubscription(sub));
  };

  const handleLogoutAction = async () => {
    await logoutUser();
    setUser(null);
    setUserEmail(null);
    setActiveTest(TestType.DASHBOARD);
  };

  // UPDATED NAVIGATION WITH COIN CHECK
  const navigateTo = async (test: TestType, params?: any) => {
     if (test === TestType.LOGIN && user) return;
     
     // 1. ADMIN CHECK
     if (test === TestType.ADMIN && !isUserAdmin(userEmail)) {
        alert("Access Denied.");
        return;
     }

     // 2. COIN CHECK (for generic test types)
     if (user && params?.cost > 0) {
         const { allowed, balance, shortfall } = await checkBalance(user, params.cost);
         if (!allowed) {
             const proceed = window.confirm(`Insufficient Coins!\nRequired: ${params.cost}\nAvailable: ${balance}\n\nDo you want to add coins now?`);
             if (proceed) setPaymentOpen(true);
             return;
         }
         
         const confirmStart = window.confirm(`Start ${test}?\nCost: ${params.cost} Coins\nBalance: ${balance}`);
         if (!confirmStart) return;

         // Deduct immediately for tests that have fixed costs
         const deducted = await deductCoins(user, params.cost);
         if (deducted) {
             // Refresh local balance display
             const sub = await getUserSubscription(user);
             setSubscription(sub);
         } else {
             alert("Transaction Failed. Try again.");
             return;
         }
     }

     setActiveTest(test);
  };
  
  // New: Handle consumption from child components (e.g. Interview)
  const handleCoinConsumption = async (cost: number): Promise<boolean> => {
      if (!user) return false;
      const { allowed, balance } = await checkBalance(user, cost);
      if (!allowed) {
          const proceed = window.confirm(`Insufficient Coins!\nRequired: ${cost}\nAvailable: ${balance}\n\nAdd coins now?`);
          if (proceed) setPaymentOpen(true);
          return false;
      }
      
      const success = await deductCoins(user, cost);
      if (success) {
          const sub = await getUserSubscription(user);
          setSubscription(sub);
          return true;
      } else {
          alert("Transaction error.");
          return false;
      }
  };
  
  const handleTestComplete = async (result: any) => {
      if (!user) return;
      let typeStr = activeTest.toString();
      await saveTestAttempt(user, typeStr, result);
      await incrementUsage(user, typeStr);
      // No extra deduction here, as we deducted on entry
  };

  const handleShowGuestWarning = () => {
      if (window.confirm("Restricted Area. Please login or create a free account (Get 50 Coins).")) {
          setActiveTest(TestType.LOGIN);
      }
  };

  // ... (renderContent switch remains similar, just passing onSave etc) ...
  const renderContent = () => {
    switch (activeTest) {
      case TestType.LOGIN: return <Login onLogin={handleLogin} onCancel={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.REGISTER: return <Login onLogin={handleLogin} onCancel={() => setActiveTest(TestType.DASHBOARD)} initialIsSignUp={true} />;
      case TestType.PIQ: return <PIQForm onSave={async (data) => { if(user) { await saveUserData(user, data); setPiqData(data); alert("PIQ Saved"); setActiveTest(TestType.DASHBOARD); } else { alert("Please login."); setActiveTest(TestType.LOGIN); } }} initialData={piqData || undefined} />;
      case TestType.PPDT: return <PPDTTest onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.TAT: return <PsychologyTest type={TestType.TAT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.WAT: return <PsychologyTest type={TestType.WAT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.SRT: return <PsychologyTest type={TestType.SRT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.SDT: return <PsychologyTest type={TestType.SDT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.INTERVIEW: return <Interview piqData={piqData || undefined} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} onConsumeCoins={handleCoinConsumption} />;
      case TestType.CONTACT: return <ContactForm piqData={piqData || undefined} />;
      case TestType.STAGES: return <SSBStages />;
      case TestType.AI_BOT: return <SSBBot />;
      case TestType.ADMIN: return isUserAdmin(userEmail) ? <AdminPanel /> : <Dashboard onStartTest={navigateTo} piqLoaded={!!piqData} isLoggedIn={!!user} isLoading={isLoading} user={user || ''} onOpenPayment={() => setPaymentOpen(true)} subscription={subscription} onShowGuestWarning={handleShowGuestWarning} />;
      case TestType.TERMS: case TestType.PRIVACY: case TestType.REFUND: return <LegalPages type={activeTest} onBack={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.GUIDE: return <HowToUse onNavigate={navigateTo} />;
      case TestType.CURRENT_AFFAIRS: return <CurrentAffairs />;
      case TestType.DAILY_PRACTICE: return <DailyPractice onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.RESOURCES: return <ResourceCenter />;
      case TestType.LECTURETTE: return <LecturetteTest />;
      default: return <Dashboard onStartTest={navigateTo} piqLoaded={!!piqData} isLoggedIn={!!user} isLoading={isLoading} user={user || ''} onOpenPayment={() => setPaymentOpen(true)} subscription={subscription} onShowGuestWarning={handleShowGuestWarning} />;
    }
  };

  return (
    <Layout 
      activeTest={activeTest} 
      onNavigate={navigateTo} 
      onLogout={handleLogoutAction}
      onLogin={() => setActiveTest(TestType.LOGIN)}
      user={userEmail || undefined}
      isLoggedIn={!!user}
      isAdmin={isUserAdmin(userEmail)}
      subscription={subscription}
      onOpenPayment={() => setPaymentOpen(true)}
    >
      {renderContent()}
      {user && (
        <PaymentModal 
            userId={user} 
            isOpen={isPaymentOpen} 
            onClose={() => setPaymentOpen(false)} 
            onSuccess={() => { getUserSubscription(user).then(sub => setSubscription(sub)); }}
        />
      )}
    </Layout>
  );
};

export default App;
