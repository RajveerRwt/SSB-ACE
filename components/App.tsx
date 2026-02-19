
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
import { ShieldCheck, CheckCircle, Lock, Quote, Zap, Star, Shield, Flag, ChevronRight, LogIn, Loader2, History, Crown, Clock, AlertCircle, Phone, UserPlus, Percent, Tag, ArrowUpRight, Trophy, Medal, MessageCircle, X, Headset, Signal, Mail, ChevronDown, ChevronUp, Target, Brain, Mic, ImageIcon, FileSignature, ClipboardList, BookOpen, PenTool, Globe, Bot, Library, ArrowDown, IndianRupee, Coins, Sun, Award, Crosshair, Map, Lightbulb, FileText } from 'lucide-react';
import { SSBLogo } from './Logo';

// --- GAMIFICATION COMPONENTS ---

const RadarChart: React.FC<{ stats: any }> = ({ stats }) => {
  const normalized = {
    planning: Math.min(Math.max(stats.ppdtAvg || 2, 2), 10),
    social: Math.min(Math.max(stats.interviewAvg || 2, 2), 10),
    dynamic: Math.min(Math.max((stats.totalTests / 5) * 2, 2), 10),
    expression: Math.min(Math.max(stats.interviewAvg || 2, 2), 10),
    stability: Math.min(Math.max(stats.psychAvg || 2, 2), 10),
    grit: Math.min(Math.max((stats.totalTests / 10) * 3, 2), 10)
  };
  const getPoint = (value: number, angle: number, radius: number = 80, center: number = 100) => {
    const r = (value / 10) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  };
  const angles = [0, 60, 120, 180, 240, 300].map(d => (d - 90) * (Math.PI / 180));
  const polyPoints = [
    getPoint(normalized.planning, angles[0]), getPoint(normalized.social, angles[1]),
    getPoint(normalized.dynamic, angles[2]), getPoint(normalized.expression, angles[3]),
    getPoint(normalized.stability, angles[4]), getPoint(normalized.grit, angles[5]),
  ].join(" ");

  return (
    <div className="relative w-full h-64 flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl">
        {[2, 4, 6, 8, 10].map(level => (
           <polygon key={level} points={[0,1,2,3,4,5].map(i => getPoint(level, angles[i])).join(" ")} fill="none" stroke="#e2e8f0" strokeWidth="1" />
        ))}
        {angles.map((a, i) => ( <line key={i} x1="100" y1="100" x2={100 + 80 * Math.cos(a)} y2={100 + 80 * Math.sin(a)} stroke="#e2e8f0" strokeWidth="1" /> ))}
        <polygon points={polyPoints} fill="rgba(59, 130, 246, 0.2)" stroke="#2563eb" strokeWidth="2" className="transition-all duration-1000 ease-out" />
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
    <div className={`w-16 h-5 md:w-20 md:h-6 rounded-sm shadow-sm flex overflow-hidden border border-black/10 transition-all duration-300 ${earned ? 'opacity-100' : 'opacity-30 grayscale'}`}>
       {colors.map((c, i) => ( <div key={i} className={`h-full flex-1 ${c}`} /> ))}
    </div>
    {earned && <div className="w-6 h-6 -mt-1 z-10 bg-yellow-400 rounded-full border-2 border-yellow-600 shadow-md flex items-center justify-center text-[10px]">{Icon ? <Icon size={12} /> : <Star size={12} />}</div>}
    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] p-2 rounded-lg w-32 text-center pointer-events-none z-20">
       <p className="font-bold text-yellow-400 uppercase">{title}</p>
       <p className="text-slate-300 leading-tight mt-1">{desc}</p>
    </div>
  </div>
);

// Dashboard Component
const Dashboard: React.FC<{ 
  onStartTest: (t: TestType, params?: any) => void, 
  piqLoaded: boolean,
  isLoggedIn: boolean,
  isLoading: boolean,
  user: string,
  onOpenPayment: () => void,
  subscription: UserSubscription | null,
  onViewReport: (data: any, type: string) => void
}> = ({ onStartTest, piqLoaded, isLoggedIn, isLoading, user, onOpenPayment, subscription, onViewReport }) => {
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
    { text: "The safety, honour and welfare of your country come first, always and every time.", author: "Chetwode Motto" }
  ];

  const testimonials = [
    { name: "Deepak Rai", role: "NDA Aspirant", text: "The 1:1 Virtual Interview experience was very realistic. Actionable report." },
    { name: "Vikram Rawat", role: "AFCAT Aspirant", text: "AI IO surprisingly accurate. Body language sensing is next level." }
  ];

  const quickActions = [
    { id: TestType.OIR, label: 'OIR Test', sub: 'Intelligence', icon: Lightbulb, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100', cost: TEST_RATES.OIR },
    { id: TestType.PPDT, label: 'PPDT', sub: 'Screening', icon: ImageIcon, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', cost: TEST_RATES.PPDT },
    { id: TestType.TAT, label: 'TAT', sub: 'Psychology', icon: PenTool, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', cost: TEST_RATES.TAT },
    { id: TestType.INTERVIEW, label: '1:1 Interview', sub: 'Virtual IO', icon: Mic, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', cost: 0 },
    { id: TestType.DAILY_PRACTICE, label: 'Daily Dose', sub: 'Practice', icon: Clock, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100', cost: 0 },
    { id: TestType.RESOURCES, label: 'Library', sub: 'Static GK', icon: Library, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', cost: 0 },
  ];

  useEffect(() => {
    const timer = setInterval(() => setQuoteIndex(prev => (prev + 1) % quotes.length), 8000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTestimonialIndex(prev => (prev + 1) % testimonials.length), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isLoggedIn && user && !user.startsWith('demo')) {
      setLoadingHistory(true);
      getUserHistory(user).then((data: any[]) => {
        setHistory(data);
        const ppdtLogs = data.filter((h: any) => h.type.includes('PPDT'));
        const psychLogs = data.filter((h: any) => ['TAT', 'WAT', 'SRT', 'SDT'].some(t => h.type.includes(t)));
        const interviewLogs = data.filter((h: any) => h.type.includes('INTERVIEW'));
        setStats({ 
          ppdtAvg: ppdtLogs.length ? ppdtLogs.reduce((a: number, b: any) => a + (Number(b.score) || 0), 0) / ppdtLogs.length : 0, 
          psychAvg: psychLogs.length ? psychLogs.reduce((a: number, b: any) => a + (Number(b.score) || 0), 0) / psychLogs.length : 0, 
          interviewAvg: interviewLogs.length ? interviewLogs.reduce((a: number, b: any) => a + (Number(b.score) || 0), 0) / interviewLogs.length : 0, 
          totalTests: data.length, 
          rank: data.length > 30 ? 'Major' : data.length > 15 ? 'Captain' : data.length > 5 ? 'Lieutenant' : 'Cadet'
        });
        setLoadingHistory(false);
      });
      getLatestPaymentRequest(user).then((status: any) => setPaymentStatus(status));
    }
  }, [isLoggedIn, user]);

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-0">
      
      {/* HERO */}
      <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 text-white relative overflow-hidden shadow-2xl border-b-8 border-yellow-500">
         <div className="relative z-10 grid lg:grid-cols-2 gap-8 items-center">
           <div className="space-y-6">
             <div className="flex items-center gap-3">
               <span className="px-3 py-1 bg-yellow-400 text-black text-[9px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg animate-bounce">Officer Potential</span>
               <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Board Simulation v4.0</span>
             </div>
             <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">Master Your SSB Preparation<br/><span className="text-yellow-400">with Advanced AI</span></h1>
             <p className="text-slate-300 text-sm md:text-lg opacity-90 max-w-2xl">Simulation, training and detailed psychometric reports for defense aspirants.</p>
             <div className="flex flex-wrap gap-4 pt-4">
                 <button onClick={() => piqLoaded ? onStartTest(TestType.INTERVIEW) : onStartTest(TestType.PIQ)} className={`px-10 py-5 font-black rounded-2xl transition-all shadow-xl uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 ${piqLoaded ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-slate-800 text-slate-500'}`}>{isLoading ? 'Syncing...' : 'Start AI Interview'}</button>
                 <button onClick={() => onStartTest(TestType.PPDT)} className="px-10 py-5 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-blue-600/40 transition-all flex items-center justify-center gap-3"><ImageIcon size={16} /> Stage 1 PPDT</button>
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
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid lg:grid-cols-12 gap-6 md:gap-10">
        <div className="lg:col-span-8 space-y-6 md:space-y-10">
          
          {isLoggedIn && (
            <div className="bg-white p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden relative">
              <div className="flex justify-between items-center mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg"><Trophy size={24} className="text-yellow-400" /></div>
                    <div><h3 className="text-lg md:text-xl font-black text-slate-900 uppercase">Service Dossier</h3><p className="text-[10px] font-bold text-slate-400 uppercase">Current Rank: <span className="text-blue-600">{stats.rank}</span></p></div>
                </div>
                <div className="text-right"><span className="block text-2xl font-black text-slate-900">{stats.totalTests}</span><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Logged</span></div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-slate-50 rounded-3xl p-4 border border-slate-100 flex flex-col items-center"><h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">OLQ Profile</h4><RadarChart stats={stats} /></div>
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100"><h4 className="text-[10px] font-black uppercase text-slate-400 mb-6">Decorations</h4><div className="grid grid-cols-4 gap-4 place-items-center"><MedalRibbon title="Veteran" desc="20+ Tests" earned={stats.totalTests >= 20} colors={['bg-red-800', 'bg-white', 'bg-red-800']} /><MedalRibbon title="Marksman" desc="Avg > 8.0" earned={stats.psychAvg > 8} colors={['bg-green-700', 'bg-yellow-400', 'bg-green-700']} /><MedalRibbon title="Navigator" desc="Guided" earned={stats.totalTests > 5} colors={['bg-blue-600', 'bg-white', 'bg-blue-600']} /></div></div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                  <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-black text-slate-900 uppercase flex items-center gap-3"><History className="text-purple-600" size={20} /> Mission Logs</h3><span className="text-[10px] font-bold text-slate-400 uppercase">Latest Entries</span></div>
                  <div className="space-y-3">
                      {loadingHistory ? <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-300" /></div> : history.length === 0 ? <p className="text-center p-8 text-slate-400 text-xs italic">No records found.</p> : 
                        history.slice(0, showFullHistory ? undefined : 5).map((h, i) => {
                            const isPending = (h.score === 0 || !h.score) && (h.result?.verdict?.includes("Pending") || h.result?.error);
                            return (
                                <div key={i} onClick={() => onViewReport(h, h.type)} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-blue-500 hover:shadow-lg cursor-pointer transition-all gap-3">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${isPending ? 'bg-yellow-400 text-black animate-pulse' : 'bg-slate-900 text-white'}`}><FileText size={18} /></div>
                                        <div><p className="text-xs font-black uppercase text-slate-800">{h.type}</p><p className="text-[9px] text-slate-400 font-bold">{new Date(h.timestamp).toLocaleDateString()}</p></div>
                                    </div>
                                    <div className="text-right">
                                        {isPending ? (
                                            <span className="text-[10px] font-black uppercase bg-yellow-400 text-black px-3 py-1 rounded-full shadow-sm flex items-center gap-2"><Clock size={10} /> Report Pending</span>
                                        ) : (
                                            <span className="text-sm font-black text-slate-900">Score: {h.score}/10</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                      }
                      <button onClick={() => setShowFullHistory(!showFullHistory)} className="w-full text-center text-[10px] font-black uppercase text-slate-400 mt-4 hover:text-slate-600 transition-colors">{showFullHistory ? 'View Less' : 'View Full Mission History'}</button>
                  </div>
              </div>
            </div>
          )}

          <div className="space-y-4" id="quick-deployment">
             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2"><Zap className="text-yellow-500" /> Quick Deployment</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, i) => (
                    <button key={i} onClick={() => onStartTest(action.id)} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all hover:-translate-y-1 hover:shadow-lg ${action.bg} ${action.border} relative overflow-hidden`}>
                        <div className={`p-3 bg-white rounded-xl shadow-sm ${action.color}`}><action.icon size={20} /></div>
                        <div className="text-center relative z-10"><span className="block text-xs font-black text-slate-900 uppercase tracking-tight leading-tight">{action.label}</span><span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">{action.sub}</span></div>
                    </button>
                ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 md:space-y-10">
           <div className="bg-slate-950 p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-500" />
              <Star className="text-yellow-400 w-12 h-12 md:w-16 md:h-16 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
              <h3 className="text-xl font-black uppercase tracking-widest mb-4">The Aspirant's Creed</h3>
              <div className="space-y-4 text-xs font-medium italic text-slate-400 leading-relaxed">
                 <p>"I am a leader in the making. I do not fear the challenge; I welcome the trial."</p>
                 <p>"I shall be honest with my words, firm with my actions, and loyal to my team."</p>
              </div>
           </div>
           <div className="bg-blue-600 p-10 rounded-[2rem] md:rounded-[3.5rem] text-white shadow-xl flex flex-col items-center text-center gap-6 hover:scale-[1.02] transition-all">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/30 shadow-2xl"><Shield className="w-8 h-8" /></div>
              <div><h4 className="text-lg md:text-xl font-black uppercase tracking-widest mb-2">SSB Navigator</h4><p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Comprehensive 5-Day Stage Guide Active</p></div>
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
  const [reportModal, setReportModal] = useState<{ open: boolean, data: any, type: string }>({ open: false, data: null, type: '' });

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

  const handleLogoutAction = async () => { await logoutUser(); setUser(null); setUserEmail(null); setActiveTest(TestType.DASHBOARD); };

  const navigateTo = async (test: TestType, params?: any) => {
     if (test === TestType.LOGIN && user) return;
     if (test === TestType.ADMIN && !isUserAdmin(userEmail)) { alert("Access Denied."); return; }
     if (user && params?.cost > 0) {
         const { allowed, balance } = await checkBalance(user, params.cost);
         if (!allowed) { if (window.confirm("Insufficient Coins! Add coins now?")) setPaymentOpen(true); return; }
         const confirmStart = window.confirm(`Start ${test}? Cost: ${params.cost} Coins`);
         if (!confirmStart) return;
         if (await deductCoins(user, params.cost)) {
             getUserSubscription(user).then((sub: any) => setSubscription(sub));
         } else { alert("Transaction Failed."); return; }
     }
     setActiveTest(test);
  };
  
  const handleTestComplete = async (result: any) => {
      if (!user) return;
      await saveTestAttempt(user, activeTest.toString(), result);
      await incrementUsage(user, activeTest.toString());
  };

  const renderContent = () => {
    switch (activeTest) {
      case TestType.LOGIN: return <Login onLogin={handleLogin} onCancel={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.REGISTER: return <Login onLogin={handleLogin} onCancel={() => setActiveTest(TestType.DASHBOARD)} initialIsSignUp={true} />;
      case TestType.PIQ: return <PIQForm onSave={async (data: PIQData) => { if(user) { await saveUserData(user, data); setPiqData(data); alert("PIQ Saved"); setActiveTest(TestType.DASHBOARD); } else { alert("Please login."); setActiveTest(TestType.LOGIN); } }} initialData={piqData || undefined} />;
      case TestType.PPDT: return <PPDTTest onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.TAT: return <PsychologyTest type={TestType.TAT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.WAT: return <PsychologyTest type={TestType.WAT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.SRT: return <PsychologyTest type={TestType.SRT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.SDT: return <PsychologyTest type={TestType.SDT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.INTERVIEW: return <Interview piqData={piqData || undefined} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} onConsumeCoins={(cost) => deductCoins(user!, cost)} />;
      case TestType.CONTACT: return <ContactForm piqData={piqData || undefined} />;
      case TestType.STAGES: return <SSBStages />;
      case TestType.AI_BOT: return <SSBBot />;
      case TestType.ADMIN: return isUserAdmin(userEmail) ? <AdminPanel /> : <Dashboard onStartTest={navigateTo} piqLoaded={!!piqData} isLoggedIn={!!user} isLoading={isLoading} user={user || ''} onOpenPayment={() => setPaymentOpen(true)} subscription={subscription} onViewReport={(data, type) => setReportModal({ open: true, data, type })} />;
      case TestType.TERMS: case TestType.PRIVACY: case TestType.REFUND: return <LegalPages type={activeTest} onBack={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.GUIDE: return <HowToUse onNavigate={navigateTo} />;
      case TestType.CURRENT_AFFAIRS: return <CurrentAffairs />;
      case TestType.DAILY_PRACTICE: return <DailyPractice onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.RESOURCES: return <ResourceCenter />;
      case TestType.LECTURETTE: return <LecturetteTest onConsumeCoins={(cost) => deductCoins(user!, cost)} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.OIR: return <OIRTest onConsumeCoins={(cost) => deductCoins(user!, cost)} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} onExit={() => setActiveTest(TestType.DASHBOARD)} />;
      default: return <Dashboard onStartTest={navigateTo} piqLoaded={!!piqData} isLoggedIn={!!user} isLoading={isLoading} user={user || ''} onOpenPayment={() => setPaymentOpen(true)} subscription={subscription} onViewReport={(data, type) => setReportModal({ open: true, data, type })} />;
    }
  };

  const handleLogin = (uid: string, email?: string) => { setUser(uid); setUserEmail(email || ''); setActiveTest(TestType.DASHBOARD); getUserData(uid).then((d: any) => d && setPiqData(d)); getUserSubscription(uid).then((sub: any) => setSubscription(sub)); };

  return (
    <Layout activeTest={activeTest} onNavigate={navigateTo} onLogout={handleLogoutAction} onLogin={() => setActiveTest(TestType.LOGIN)} user={userEmail || undefined} isLoggedIn={!!user} isAdmin={isUserAdmin(userEmail)} subscription={subscription} onOpenPayment={() => setPaymentOpen(true)}>
      {renderContent()}
      {user && <PaymentModal userId={user} isOpen={isPaymentOpen} onClose={() => setPaymentOpen(false)} onSuccess={() => { getUserSubscription(user).then((sub: any) => setSubscription(sub)); }} />}
      <ReportModal isOpen={reportModal.open} onClose={() => setReportModal({ open: false, data: null, type: '' })} data={reportModal.data} testType={reportModal.type} />
    </Layout>
  );
};

export default App;
