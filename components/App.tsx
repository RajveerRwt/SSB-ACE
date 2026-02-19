
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './Layout';
import Login from './Login';
import PPDTTest from './PPDTTest';
import PsychologyTest from './PsychologyTest';
import Interview from './Interview';
import PIQForm from './PIQForm';
import ContactForm from './ContactForm';
import SSBStages from './SSBStages';
import SSBBot from './SSBBot';
import AdminPanel from './AdminPanel';
import PaymentModal from './PaymentModal';
import ReportModal from './ReportModal';
import LegalPages from './LegalPages';
import HowToUse from './HowToUse';
import CurrentAffairs from './CurrentAffairs';
import DailyPractice from './DailyPractice';
import ResourceCenter from './ResourceCenter';
import LecturetteTest from './LecturetteTest';
import OIRTest from './OIRTest';
import Footer from './Footer';
import { TestType, PIQData, UserSubscription } from '../types';
import { getUserData, saveUserData, saveTestAttempt, getUserHistory, checkAuthSession, syncUserProfile, subscribeToAuthChanges, isUserAdmin, getUserSubscription, getLatestPaymentRequest, incrementUsage, logoutUser, checkBalance, deductCoins, TEST_RATES } from '../services/supabaseService';
import { ShieldCheck, CheckCircle, Lock, Quote, Zap, Star, Shield, Flag, ChevronRight, LogIn, Loader2, History, Crown, Clock, AlertCircle, Phone, UserPlus, Percent, Tag, ArrowUpRight, Trophy, Medal, MessageCircle, X, Headset, Signal, Mail, ChevronDown, ChevronUp, Target, Brain, Mic, ImageIcon, FileSignature, ClipboardList, BookOpen, PenTool, Globe, Bot, Library, ArrowDown, IndianRupee, Coins, Sun, Award, Crosshair, Map, Lightbulb, FileText, Eye } from 'lucide-react';
import { SSBLogo } from './Logo';

// --- GAMIFICATION COMPONENTS ---

const RadarChart: React.FC<{ stats: any }> = ({ stats }) => {
  const normalized = {
    planning: Math.min(Math.max(stats.ppdtAvg || 2, 2), 10),
    social: Math.min(Math.max(stats.interviewAvg || 2, 2), 10),
    dynamic: Math.min(Math.max((stats.totalTests / 5) * 2, 2), 10),
    expression: Math.min(Math.max(stats.interviewAvg || 2, 2), 10),
    stability: Math.min(Math.max(stats.psychAvg || 2, 2), 10),
    determination: Math.min(Math.max((stats.totalTests / 10) * 3, 2), 10)
  };

  const getPoint = (value: number, angle: number, radius: number = 80, center: number = 100) => {
    const r = (value / 10) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  };

  const angles = [0, 60, 120, 180, 240, 300].map(d => (d - 90) * (Math.PI / 180));
  
  const polyPoints = [
    getPoint(normalized.planning, angles[0]),
    getPoint(normalized.social, angles[1]),
    getPoint(normalized.dynamic, angles[2]),
    getPoint(normalized.expression, angles[3]),
    getPoint(normalized.stability, angles[4]),
    getPoint(normalized.determination, angles[5]),
  ].join(" ");

  return (
    <div className="relative w-full h-64 flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl">
        {[2, 4, 6, 8, 10].map(level => (
           <polygon 
             key={level}
             points={[0,1,2,3,4,5].map(i => getPoint(level, angles[i])).join(" ")}
             fill="none"
             stroke="#e2e8f0"
             strokeWidth="1"
           />
        ))}
        {angles.map((a, i) => (
           <line key={i} x1="100" y1="100" x2={100 + 80 * Math.cos(a)} y2={100 + 80 * Math.sin(a)} stroke="#e2e8f0" strokeWidth="1" />
        ))}
        <polygon points={polyPoints} fill="rgba(59, 130, 246, 0.2)" stroke="#2563eb" strokeWidth="2" className="drop-shadow-sm transition-all duration-1000 ease-out" />
        <text x="100" y="15" textAnchor="middle" className="text-[8px] font-black uppercase fill-slate-500">Planning</text>
        <text x="180" y="60" textAnchor="middle" className="text-[8px] font-black uppercase fill-slate-500">Social</text>
        <text x="180" y="150" textAnchor="middle" className="text-[8px] font-black uppercase fill-slate-500">Dynamic</text>
        <text x="100" y="195" textAnchor="middle" className="text-[8px] font-black uppercase fill-slate-500">Expression</text>
        <text x="20" y="150" textAnchor="middle" className="text-[8px] font-black uppercase fill-slate-500">Stability</text>
        <text x="20" y="60" textAnchor="middle" className="text-[8px] font-black uppercase fill-slate-500">Grit</text>
      </svg>
    </div>
  );
};

const MedalRibbon: React.FC<{ title: string, desc: string, earned: boolean, colors: string[], icon?: any }> = ({ title, desc, earned, colors, icon: Icon }) => (
  <div className="group relative flex flex-col items-center">
    <div className={`w-16 h-5 md:w-20 md:h-6 rounded-sm shadow-sm flex overflow-hidden border border-black/10 transition-all duration-300 ${earned ? 'opacity-100 scale-100' : 'opacity-30 grayscale scale-95'}`}>
       {colors.map((c, i) => <div key={i} className={`h-full flex-1 ${c}`} />)}
       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] opacity-20"></div>
    </div>
    {earned && <div className="w-6 h-6 -mt-1 z-10 bg-yellow-400 rounded-full border-2 border-yellow-600 shadow-md flex items-center justify-center text-[10px] text-yellow-900">
        {Icon ? <Icon size={12} fill="currentColor" /> : <Star size={12} fill="currentColor" />}
    </div>}
    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] p-2 rounded-lg w-32 text-center pointer-events-none z-20">
       <p className="font-bold text-yellow-400 uppercase">{title}</p>
       <p className="text-slate-300 leading-tight mt-1">{desc}</p>
       <p className={`mt-1 font-bold ${earned ? 'text-green-400' : 'text-red-400'}`}>{earned ? 'EARNED' : 'LOCKED'}</p>
    </div>
  </div>
);

const Dashboard: React.FC<{ 
  onStartTest: (t: TestType, params?: any) => void, 
  piqLoaded: boolean,
  isLoggedIn: boolean,
  isLoading: boolean,
  user: string,
  onOpenPayment: () => void,
  subscription: UserSubscription | null,
  onShowGuestWarning: () => void,
  onViewReport: (report: any) => void
}> = ({ onStartTest, piqLoaded, isLoggedIn, isLoading, user, onOpenPayment, subscription, onShowGuestWarning, onViewReport }) => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [isEarlyRiser, setIsEarlyRiser] = useState(false);
  
  const [stats, setStats] = useState({ ppdtAvg: 0, psychAvg: 0, interviewAvg: 0, totalTests: 0, rank: 'Cadet' });
  
  const quotes = [
    { text: "Either I will come back after hoisting the Tricolour, or I will come back wrapped in it, but I will be back for sure.", author: "Capt. Vikram Batra, PVC" },
    { text: "No Sir, I will not abandon my gun. My gun is still firing.", author: "Lieutenant Arun Khetarpal" },
    { text: "If a man says he is not afraid of dying, he is either lying or is a Gurkha.", author: "Field Marshal Sam Manekshaw" },
    { text: "The safety, honour and welfare of your country come first, always and every time.", author: "Chetwode Motto" },
    { text: "I regret I have but one life to give for my country.", author: "Capt. Manoj Kumar Pandey, PVC" }
  ];

  const quickActions = [
    { id: TestType.OIR, label: 'OIR Test', sub: 'Intelligence', icon: Lightbulb, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100', cost: TEST_RATES.OIR },
    { id: TestType.PPDT, label: 'PPDT', sub: 'Screening', icon: ImageIcon, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', cost: TEST_RATES.PPDT },
    { id: TestType.TAT, label: 'TAT', sub: 'Psychology', icon: PenTool, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', cost: TEST_RATES.TAT },
    { id: TestType.WAT, label: 'WAT', sub: 'Psychology', icon: Zap, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', cost: TEST_RATES.WAT },
    { id: TestType.SRT, label: 'SRT', sub: 'Psychology', icon: Brain, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', cost: TEST_RATES.SRT },
    { id: TestType.SDT, label: 'SDT', sub: 'Self Desc.', icon: FileSignature, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', cost: TEST_RATES.SDT },
    { id: TestType.LECTURETTE, label: 'Lecturette', sub: 'Topics', icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', cost: TEST_RATES.LECTURETTE },
    { id: TestType.INTERVIEW, label: '1:1 Interview', sub: 'Virtual IO', icon: Mic, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', cost: 0 }
  ];

  useEffect(() => {
    if (isLoggedIn && user && !user.startsWith('demo')) {
      setLoadingHistory(true);
      getUserHistory(user).then((data: any[]) => {
        setHistory(data);
        const ppdtLogs = data.filter((h: any) => h.type.includes('PPDT'));
        const psychLogs = data.filter((h: any) => ['TAT', 'WAT', 'SRT', 'SDT'].some(t => h.type.includes(t)));
        const interviewLogs = data.filter((h: any) => h.type.includes('INTERVIEW'));
        const ppdtAvg = ppdtLogs.length ? ppdtLogs.reduce((a: number, b: any) => a + (Number(b.score) || 0), 0) / ppdtLogs.length : 0;
        const psychAvg = psychLogs.length ? psychLogs.reduce((a: number, b: any) => a + (Number(b.score) || 0), 0) / psychLogs.length : 0;
        const interviewAvg = interviewLogs.length ? interviewLogs.reduce((a: number, b: any) => a + (Number(b.score) || 0), 0) / interviewLogs.length : 0;
        const totalTests = data.length;
        let rank = 'Cadet';
        if (totalTests > 5) rank = 'Lieutenant';
        if (totalTests > 15) rank = 'Captain';
        if (totalTests > 30) rank = 'Major';
        setStats({ ppdtAvg, psychAvg, interviewAvg, totalTests, rank });
        setLoadingHistory(false);
      });
      getLatestPaymentRequest(user).then((status: any) => setPaymentStatus(status));
    }
  }, [isLoggedIn, user]);

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-0">
      {/* HERO SECTION */}
      <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 text-white relative overflow-hidden shadow-2xl border-b-8 border-yellow-500">
         <div className="relative z-10 grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
           <div className="space-y-6">
             <div className="flex items-center gap-3">
               <span className="px-3 py-1 bg-yellow-400 text-black text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">Officer Potential</span>
               <span className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Board Simulation v4.0</span>
             </div>
             <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">Master Your SSB Preparation<br/><span className="text-yellow-400">with India's most Advanced AI</span></h1>
             <p className="text-slate-300 text-sm md:text-lg leading-relaxed font-medium opacity-90 max-w-2xl">
               Practice exactly like real SSB with full detailed and personalised assessment. Use Coins to unlock tests.
             </p>
             <div className="flex flex-wrap gap-4 pt-4">
                 <button onClick={() => piqLoaded ? onStartTest(TestType.INTERVIEW) : onStartTest(TestType.PIQ)} className={`flex-1 md:flex-none px-6 md:px-10 py-4 md:py-5 font-black rounded-2xl transition-all shadow-xl hover:-translate-y-1 uppercase tracking-widest text-[10px] md:text-[11px] flex items-center justify-center gap-3 ${piqLoaded ? 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-yellow-400/20' : 'bg-slate-800 text-slate-500 border border-white/5'}`} disabled={isLoading}>
                   {isLoading ? 'Syncing...' : (piqLoaded ? 'Start AI Interview' : 'Unlock Interview (Fill PIQ)')}
                 </button>
                 <button onClick={() => onStartTest(TestType.DAILY_PRACTICE)} className="flex-1 md:flex-none px-6 md:px-10 py-4 md:py-5 bg-blue-600/20 text-blue-300 border border-blue-500/30 backdrop-blur-sm rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-[11px] hover:bg-blue-600/40 transition-all flex items-center justify-center gap-3">
                    <Clock size={16} /> Daily Challenge (Free)
                 </button>
             </div>
           </div>
           <div className="hidden lg:flex flex-col gap-6 relative justify-center h-full">
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

      <div className="grid lg:grid-cols-12 gap-6 md:gap-10">
        <div className="lg:col-span-8 space-y-6 md:space-y-10">
          {/* DOSSIER ARCHIVE / MISSION LOGS */}
          {isLoggedIn && (
            <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden relative">
              <div className="flex justify-between items-center mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <History size={24} className="text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tighter">Mission Archive</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revisit your historical assessments</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="block text-2xl font-black text-slate-900">{stats.totalTests}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Records Found</span>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-slate-50 rounded-3xl p-4 border border-slate-100 flex flex-col items-center">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                          <Target size={12} /> OLQ Radar
                      </h4>
                      <RadarChart stats={stats} />
                  </div>
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                          <Award size={12} /> Decorations
                      </h4>
                      <div className="grid grid-cols-4 gap-4 place-items-center">
                          <MedalRibbon title="Early Bird" desc="Disciplined Morning Entry" earned={isEarlyRiser} colors={['bg-orange-400', 'bg-blue-800', 'bg-orange-400']} icon={Sun} />
                          <MedalRibbon title="Veteran" desc="Completed 20+ Tests" earned={stats.totalTests >= 20} colors={['bg-red-800', 'bg-white', 'bg-red-800']} icon={Star} />
                          <MedalRibbon title="Marksman" desc="High Scorer Status" earned={stats.psychAvg > 8 || stats.interviewAvg > 8} colors={['bg-green-700', 'bg-yellow-400', 'bg-green-700']} icon={Crosshair} />
                          <MedalRibbon title="Navigator" desc="Explored All Modules" earned={stats.totalTests > 5} colors={['bg-blue-600', 'bg-white', 'bg-blue-600']} icon={Map} />
                      </div>
                  </div>
              </div>

              <div className="space-y-3">
                  {loadingHistory ? (
                    <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-slate-300" /></div>
                  ) : history.length === 0 ? (
                    <div className="text-center p-8 bg-slate-50 rounded-3xl text-slate-400 text-xs font-medium italic">"No mission records found."</div>
                  ) : (
                    <>
                      {history.slice(0, showFullHistory ? undefined : 3).map((h, i) => {
                          const result = h.result || h.result_data;
                          const isError = result?.error || (result?.score === 0 && result?.verdict === "Technical Failure");
                          return (
                            <div key={i} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-300 transition-all gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm ${isError ? 'bg-red-500' : 'bg-slate-900'}`}>
                                        {h.type.includes('PPDT') ? <ImageIcon size={18}/> : h.type.includes('Interview') ? <Mic size={18}/> : <FileText size={18}/>}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase text-slate-800 tracking-wide">{h.type}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(h.timestamp).toLocaleDateString()} @ {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 w-full md:w-auto justify-between">
                                    <div className="text-right">
                                        <span className={`block text-xs font-black ${isError ? 'text-red-500' : 'text-slate-900'}`}>{isError ? 'PENDING' : `Score: ${h.score}/10`}</span>
                                        <span className={`text-[8px] font-bold uppercase tracking-widest ${isError ? 'text-red-400' : 'text-green-600'}`}>{isError ? 'API ERROR' : 'ARCHIVED'}</span>
                                    </div>
                                    <button onClick={() => onViewReport(h)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2">
                                        <Eye size={12}/> View
                                    </button>
                                </div>
                            </div>
                          );
                      })}
                      {history.length > 3 && (
                          <button onClick={() => setShowFullHistory(!showFullHistory)} className="w-full py-2 text-[9px] font-black uppercase text-slate-400 hover:text-slate-600 tracking-[0.2em] transition-colors">{showFullHistory ? 'Hide Extended Logs' : `View ${history.length - 3} More Logs`}</button>
                      )}
                    </>
                  )}
              </div>
            </div>
          )}

          {/* QUICK ACTION GRID */}
          <div className="space-y-4" id="quick-deployment">
             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                 <Zap className="text-yellow-500" /> Tactical Training
             </h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, i) => (
                    <button key={i} onClick={() => { if (!isLoggedIn && (action.id === TestType.PIQ || action.id === TestType.INTERVIEW)) { onStartTest(TestType.LOGIN); return; } onStartTest(action.id, { cost: action.id === TestType.INTERVIEW || action.id === TestType.OIR ? 0 : action.cost }); }} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all hover:-translate-y-1 hover:shadow-lg ${action.bg} ${action.border} relative overflow-hidden`}>
                        <div className={`p-3 bg-white rounded-xl shadow-sm ${action.color}`}><action.icon size={20} /></div>
                        <div className="text-center relative z-10"><span className="block text-xs font-black text-slate-900 uppercase tracking-tight leading-tight">{action.label}</span><span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">{action.sub}</span></div>
                        {isLoggedIn && action.cost > 0 && <div className="absolute top-2 right-2 bg-slate-900 text-yellow-400 px-2 py-0.5 rounded text-[8px] font-black flex items-center gap-1 shadow-sm"><Coins size={8} /> {action.cost}</div>}
                    </button>
                ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 md:space-y-10">
           <div className="bg-slate-950 p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
              <Star className="text-yellow-400 w-12 h-12 md:w-16 md:h-16 mb-6 md:mb-8 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-widest mb-4">Aspirant's Creed</h3>
              <div className="space-y-4 text-xs md:text-sm font-medium italic text-slate-400 leading-relaxed">
                 <p>"I am a leader in the making. I welcome the trial."</p>
                 <p>"Failure is but a lesson in persistence."</p>
              </div>
           </div>
           <div className="bg-blue-600 p-8 md:p-10 rounded-[2rem] md:rounded-[3.5rem] text-white shadow-xl flex flex-col items-center text-center gap-6 group hover:scale-[1.02] transition-all">
              <Shield className="w-12 h-12 text-white" />
              <div><h4 className="text-lg md:text-xl font-black uppercase tracking-widest mb-2">SSB Navigator</h4><p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Stage Guide Active</p></div>
              <button onClick={() => onStartTest(TestType.STAGES)} className="w-full py-4 bg-white text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl">Briefing Room</button>
           </div>
        </div>
      </div>
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
  
  // NEW: History Report States
  const [activeReport, setActiveReport] = useState<any | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const sessionUser = await checkAuthSession();
      if (sessionUser) handleUserAuthenticated(sessionUser);
      setIsLoading(false);
    };
    initAuth();
    const unsubscribe = subscribeToAuthChanges((u: any) => {
      if (u) handleUserAuthenticated(u); else { setUser(null); setUserEmail(null); setPiqData(null); setSubscription(null); }
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  const handleUserAuthenticated = async (u: any) => {
      setUser(u.id); setUserEmail(u.email || '');
      getUserData(u.id).then((d: any) => d && setPiqData(d));
      getUserSubscription(u.id).then((sub: any) => setSubscription(sub));
  };

  /**
   * Handle Login Event
   * Fixes: Cannot find name 'handleLogin'.
   */
  const handleLogin = (uid: string, email?: string) => {
    setUser(uid);
    setUserEmail(email || '');
    setActiveTest(TestType.DASHBOARD);
    getUserData(uid).then(d => d && setPiqData(d));
    getUserSubscription(uid).then(sub => setSubscription(sub));
  };

  /**
   * Handle Logout Event
   * Fixes: Cannot find name 'handleLogoutAction'.
   */
  const handleLogoutAction = async () => {
    await logoutUser();
    setUser(null);
    setUserEmail(null);
    setPiqData(null);
    setSubscription(null);
    setActiveTest(TestType.DASHBOARD);
  };

  /**
   * Handle Coin Consumption for internal component start actions
   * Fixes: Cannot find name 'handleCoinConsumption'.
   */
  const handleCoinConsumption = async (cost: number) => {
      if (!user) return false;
      const { allowed } = await checkBalance(user, cost);
      if (!allowed) {
          if (window.confirm("Insufficient Coins! Add coins now?")) {
              setPaymentOpen(true);
          }
          return false;
      }
      
      const success = await deductCoins(user, cost);
      if (success) {
          const sub = await getUserSubscription(user);
          setSubscription(sub);
          return true;
      }
      return false;
  };

  const navigateTo = async (test: TestType, params?: any) => {
     if (test === TestType.LOGIN && user) return;
     if (test === TestType.ADMIN && !isUserAdmin(userEmail)) { alert("Access Denied."); return; }
     if (user && params?.cost > 0) {
         const { allowed, balance } = await checkBalance(user, params.cost);
         if (!allowed) { if (window.confirm("Insufficient Coins! Add coins now?")) setPaymentOpen(true); return; }
         if (!window.confirm(`Start ${test}? Cost: ${params.cost} Coins`)) return;
         const deducted = await deductCoins(user, params.cost);
         if (deducted) { const sub = await getUserSubscription(user); setSubscription(sub); } else { alert("Transaction Failed."); return; }
     }
     setActiveTest(test);
  };

  /**
   * Handle Test Completion
   * Fixes: Cannot find name 'handleTestComplete'.
   */
  const handleTestComplete = async (result: any) => {
      if (!user) return;
      
      // Save Attempt
      let typeStr = activeTest.toString();
      await saveTestAttempt(user, typeStr, result);
      
      // Increment Usage (Limits) - unless it's a custom attempt already handled
      if (!result.isCustomAttempt) {
          await incrementUsage(user, typeStr);
      }
      
      // Refresh sub stats
      getUserSubscription(user).then(sub => setSubscription(sub));
  };

  const handleViewReportFromArchive = (historyItem: any) => {
      setActiveReport(historyItem);
      setIsReportOpen(true);
  };

  const renderContent = () => {
    switch (activeTest) {
      case TestType.LOGIN: return <Login onLogin={handleLogin} onCancel={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.REGISTER: return <Login onLogin={handleLogin} onCancel={() => setActiveTest(TestType.DASHBOARD)} initialIsSignUp={true} />;
      case TestType.PIQ: return <PIQForm onSave={async (data: PIQData) => { if(user) { await saveUserData(user, data); setPiqData(data); alert("PIQ Saved"); setActiveTest(TestType.DASHBOARD); } else { setActiveTest(TestType.LOGIN); } }} initialData={piqData || undefined} />;
      case TestType.PPDT: return <PPDTTest onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.TAT: return <PsychologyTest type={TestType.TAT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.WAT: return <PsychologyTest type={TestType.WAT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.SRT: return <PsychologyTest type={TestType.SRT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.SDT: return <PsychologyTest type={TestType.SDT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.INTERVIEW: return <Interview piqData={piqData || undefined} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} onConsumeCoins={handleCoinConsumption} />;
      case TestType.CONTACT: return <ContactForm piqData={piqData || undefined} />;
      case TestType.STAGES: return <SSBStages />;
      case TestType.AI_BOT: return <SSBBot />;
      case TestType.ADMIN: return isUserAdmin(userEmail) ? <AdminPanel /> : <Dashboard onStartTest={navigateTo} piqLoaded={!!piqData} isLoggedIn={!!user} isLoading={isLoading} user={user || ''} onOpenPayment={() => setPaymentOpen(true)} subscription={subscription} onShowGuestWarning={() => setActiveTest(TestType.LOGIN)} onViewReport={handleViewReportFromArchive} />;
      case TestType.TERMS: case TestType.PRIVACY: case TestType.REFUND: return <LegalPages type={activeTest} onBack={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.GUIDE: return <HowToUse onNavigate={navigateTo} />;
      case TestType.CURRENT_AFFAIRS: return <CurrentAffairs />;
      case TestType.DAILY_PRACTICE: return <DailyPractice onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.RESOURCES: return <ResourceCenter />;
      case TestType.LECTURETTE: return <LecturetteTest onConsumeCoins={handleCoinConsumption} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.OIR: return <OIRTest onConsumeCoins={handleCoinConsumption} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} onExit={() => setActiveTest(TestType.DASHBOARD)} />;
      default: return <Dashboard onStartTest={navigateTo} piqLoaded={!!piqData} isLoggedIn={!!user} isLoading={isLoading} user={user || ''} onOpenPayment={() => setPaymentOpen(true)} subscription={subscription} onShowGuestWarning={() => setActiveTest(TestType.LOGIN)} onViewReport={handleViewReportFromArchive} />;
    }
  };

  return (
    <Layout activeTest={activeTest} onNavigate={navigateTo} onLogout={handleLogoutAction} onLogin={() => setActiveTest(TestType.LOGIN)} user={userEmail || undefined} isLoggedIn={!!user} isAdmin={isUserAdmin(userEmail)} subscription={subscription} onOpenPayment={() => setPaymentOpen(true)}>
      {renderContent()}
      {user && <PaymentModal userId={user} isOpen={isPaymentOpen} onClose={() => setPaymentOpen(false)} onSuccess={() => { getUserSubscription(user).then((sub: any) => setSubscription(sub)); }} />}
      {/* GLOBAL ARCHIVE MODAL */}
      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} data={activeReport} testType={activeReport?.type || ''} />
    </Layout>
  );
};

export default App;
