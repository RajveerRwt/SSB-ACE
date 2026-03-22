
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
import LegalPages from './LegalPages';
import HowToUse from './HowToUse';
import CurrentAffairs from './CurrentAffairs';
import DailyPractice from './DailyPractice';
import ResourceCenter from './ResourceCenter';
import LecturetteTest from './LecturetteTest';
import OIRTest from './OIRTest';
import MockScreening from './MockScreening';
import { GPETest } from './GPETest';
import Footer from './Footer';
import Assessments from './Assessments';
import ReportModal from './ReportModal';
import MentorRegistration from './MentorRegistration';
import MentorDashboard from './MentorDashboard';
import StudentBatchView from './StudentBatchView';
import BatchPPDTTest from './BatchPPDTTest';
import Challenge14Day from './Challenge14Day';
import { TestType, PIQData, UserSubscription } from '../types';
import { getUserData, saveUserData, saveTestAttempt, updateTestAttempt, getPendingAssessments, getUserHistory, getTestReport, checkAuthSession, syncUserProfile, subscribeToAuthChanges, isUserAdmin, getUserSubscription, getLatestPaymentRequest, incrementUsage, logoutUser, checkBalance, deductCoins, TEST_RATES, saveNewPendingAssessment, saveNewCompletedAssessment, updateNewCompletedAssessment, getMentorProfile, getLatestDailyChallenge, hasUserSubmittedDaily } from '../services/supabaseService';
import { evaluatePerformance } from '../services/geminiService';
import FreeCoinModal from './FreeCoinModal';
import { ShieldCheck, CheckCircle, Lock, Quote, Zap, Star, Shield, Flag, ChevronRight, LogIn, Loader2, History, Crown, Clock, AlertCircle, Phone, UserPlus, Percent, Tag, ArrowUpRight, Trophy, Medal, MessageCircle, X, Headset, Signal, Mail, ChevronDown, ChevronUp, Target, Brain, Mic, ImageIcon, FileSignature, ClipboardList, BookOpen, PenTool, Globe, Bot, Library, ArrowDown, IndianRupee, Coins, Sun, Award, Crosshair, Map, Lightbulb, BarChart2, Gift, RotateCcw, FileText } from 'lucide-react';
import { SSBLogo } from './Logo';

// --- GAMIFICATION COMPONENTS ---

const MedalRibbon: React.FC<{ 
  title: string, 
  desc: string, 
  earned: boolean, 
  colors: string[], 
  icon?: any 
}> = ({ title, desc, earned, colors, icon: Icon }) => (
  <div className="group relative flex flex-col items-center">
    {/* Ribbon Bar */}
    <div className={`w-16 h-5 md:w-20 md:h-6 rounded-sm shadow-sm flex overflow-hidden border border-black/10 transition-all duration-300 ${earned ? 'opacity-100 scale-100' : 'opacity-30 grayscale scale-95'}`}>
       {colors.map((c, i) => (
         <div key={i} className={`h-full flex-1 ${c}`} />
       ))}
       {/* Texture Overlay */}
       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] opacity-20"></div>
    </div>
    
    {/* Medal Suspension (Visual Connector) */}
    {earned && <div className="w-6 h-6 -mt-1 z-10 bg-yellow-400 rounded-full border-2 border-yellow-600 shadow-md flex items-center justify-center text-[10px] text-yellow-900">
        {Icon ? <Icon size={12} fill="currentColor" /> : <Star size={12} fill="currentColor" />}
    </div>}

    {/* Tooltip */}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] p-2 rounded-lg w-32 text-center pointer-events-none z-20">
       <p className="font-bold text-yellow-400 uppercase">{title}</p>
       <p className="text-slate-300 leading-tight mt-1">{desc}</p>
       <p className={`mt-1 font-bold ${earned ? 'text-green-400' : 'text-red-400'}`}>{earned ? 'EARNED' : 'LOCKED'}</p>
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
  onShowGuestWarning: () => void,
  hasSubmittedDaily: boolean
}> = ({ onStartTest, piqLoaded, isLoggedIn, isLoading, user, onOpenPayment, subscription, onShowGuestWarning, hasSubmittedDaily }) => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [isEarlyRiser, setIsEarlyRiser] = useState(false);
  const [showFreeCoinPopup, setShowFreeCoinPopup] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  const [stats, setStats] = useState({
      ppdtAvg: 0,
      psychAvg: 0,
      interviewAvg: 0,
      totalTests: 0,
      rank: 'Cadet',
      breakdown: {} as Record<string, { count: number, avg: number }>
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
    { name: "utkarsh kumar", role: "AFCAT/CDS Aspirant", text: "best app i have seen so far." },
    { name: "Arti Patel", role: "TES/NDA Aspirant", text: "The platform simulates real SSB pressure. Especially the Virtual IO interview — very close to the actual experience." },
    { name: "Yogesh kumar", role: "Ex cadet OTA", text: "This is really amazing plateform For SSB." },
    { name: "Mohit", role: "NCC/AFCAT Entry", text: "Interview section is really great and feeling like IO is real and body language bhi dekhta h." },
    { name: "Ayush", role: "SSB Recommended", text: "As founder contact me for testing, I can say it is One of the most structured and realistic SSB practice platforms I’ve used online." }
  ];

  const quickActions = [
    { id: TestType.OIR, label: 'OIR Test', sub: 'Intelligence', icon: Lightbulb, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100', cost: TEST_RATES.OIR },
    { id: TestType.MOCK_SCREENING, label: 'Mock Screening', sub: 'Stage-1', icon: ShieldCheck, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', cost: TEST_RATES.MOCK_SCREENING },
    { id: TestType.PPDT, label: 'PPDT', sub: 'Screening', icon: ImageIcon, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', cost: TEST_RATES.PPDT },
    { id: TestType.TAT, label: 'TAT', sub: 'Psychology', icon: PenTool, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', cost: TEST_RATES.TAT },
    { id: TestType.WAT, label: 'WAT', sub: 'Psychology', icon: Zap, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', cost: TEST_RATES.WAT },
    { id: TestType.SRT, label: 'SRT', sub: 'Psychology', icon: Brain, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', cost: TEST_RATES.SRT },
    { id: TestType.SDT, label: 'SDT', sub: 'Self Desc.', icon: FileSignature, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', cost: TEST_RATES.SDT },
    { id: TestType.GPE, label: 'GPE', sub: 'Group Plan', icon: Map, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', cost: TEST_RATES.GPE || 0 },
    { id: TestType.LECTURETTE, label: 'Lecturette', sub: 'Topics', icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', cost: TEST_RATES.LECTURETTE },
    { id: TestType.INTERVIEW, label: '1:1 Interview', sub: 'Virtual IO', icon: Mic, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', cost: 0 },
    { id: TestType.CHALLENGE_14_DAY, label: '12-Day Full Psyc Challenge', sub: 'Practice', icon: Target, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', cost: 0 },
    { id: TestType.DAILY_PRACTICE, label: 'Daily Dose', sub: 'Practice', icon: Clock, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100', cost: 0 },
    { id: TestType.CURRENT_AFFAIRS, label: 'Daily News', sub: 'Updates', icon: Globe, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', cost: 0 },
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

  // Check for Early Riser (0500 - 0800)
  useEffect(() => {
      const hours = new Date().getHours();
      if (hours >= 5 && hours < 8) {
          setIsEarlyRiser(true);
      }
  }, []);

  useEffect(() => {
    if (isLoggedIn && user && !user.startsWith('demo')) {
      setLoadingHistory(true);
      getUserHistory(user).then((data: any[]) => {
        console.log("History data received in App:", data.length);
        setHistory(data);
        
        // Calculate Stats
        const validData = (data || []).filter((h: any) => h && h.status !== 'failed');
        const breakdown: Record<string, { count: number, avg: number }> = {};
        
        validData.forEach((h: any) => {
            const type = h.type || 'Unknown';
            if (!breakdown[type]) {
                breakdown[type] = { count: 0, avg: 0 };
            }
            // Only count completed tests for average score
            if (h.status === 'completed') {
                breakdown[type].count += 1;
                breakdown[type].avg += (Number(h.score) || 0);
            }
        });

        Object.keys(breakdown).forEach(key => {
            if (breakdown[key].count > 0) {
                breakdown[key].avg = breakdown[key].avg / breakdown[key].count;
            }
        });

        const ppdtLogs = validData.filter((h: any) => h.type && h.type.includes('PPDT') && h.status === 'completed');
        const psychLogs = validData.filter((h: any) => h.type && ['TAT', 'WAT', 'SRT', 'SDT'].some(t => h.type.includes(t)) && h.status === 'completed');
        const interviewLogs = validData.filter((h: any) => h.type && h.type.includes('INTERVIEW') && h.status === 'completed');

        const ppdtAvg = ppdtLogs.length ? ppdtLogs.reduce((a: number, b: any) => a + (Number(b.score) || 0), 0) / ppdtLogs.length : 0;
        const psychAvg = psychLogs.length ? psychLogs.reduce((a: number, b: any) => a + (Number(b.score) || 0), 0) / psychLogs.length : 0;
        const interviewAvg = interviewLogs.length ? interviewLogs.reduce((a: number, b: any) => a + (Number(b.score) || 0), 0) / interviewLogs.length : 0;
        
        const totalTests = validData.length;
        let rank = 'Cadet';
        if (totalTests > 5) rank = 'Lieutenant';
        if (totalTests > 15) rank = 'Captain';
        if (totalTests > 30) rank = 'Major';
        if (ppdtAvg > 8 && interviewAvg > 8) rank = 'Commando';

        setStats({ ppdtAvg, psychAvg, interviewAvg, totalTests, rank, breakdown });
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

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-0">
      
      {/* EARLY RISER BONUS TOAST */}
      {isLoggedIn && isEarlyRiser && (
          <div className="fixed top-24 right-4 z-50 bg-orange-500 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-1000 border-2 border-orange-400">
              <Sun className="animate-spin-slow" size={24} />
              <div>
                  <p className="text-xs font-black uppercase tracking-widest">Morning Drill Bonus</p>
                  <p className="text-[10px] font-bold opacity-90">Discipline Detected. Carry On!</p>
              </div>
          </div>
      )}

      {/* HERO SECTION */}
      <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 text-white relative overflow-hidden shadow-2xl border-b-8 border-yellow-500">
         <div className="relative z-10 grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
           <div className="space-y-6">
             <div className="flex items-center gap-3">
               <span className="px-3 py-1 bg-yellow-400 text-black text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg animate-bounce">Officer Potential</span>
               <span className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Board Simulation v4.0</span>
             </div>
             <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">Master Your SSB Preparation<br/><span className="text-yellow-400">with India's most Advanced AI</span></h1>
             <p className="text-slate-300 text-sm md:text-lg leading-relaxed font-medium opacity-90 max-w-2xl">
               Practice exactly like real SSB with full detailed and personalised assessment.</p>
             
             {isLoggedIn ? (
               <div className="flex flex-col md:flex-row flex-wrap gap-4 pt-4">
                 <button 
                   onClick={() => piqLoaded ? onStartTest(TestType.INTERVIEW) : onStartTest(TestType.PIQ)}
                   className={`w-full md:w-auto px-6 md:px-10 py-4 md:py-5 font-black rounded-2xl transition-all shadow-xl hover:-translate-y-1 uppercase tracking-widest text-[10px] md:text-[11px] flex items-center justify-center gap-3 ${piqLoaded ? 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-yellow-400/20' : 'bg-slate-800 text-slate-500 border border-white/5'}`}
                   disabled={isLoading}
                 >
                   {isLoading ? 'Syncing...' : (piqLoaded ? 'Start AI Interview' : 'Unlock Interview (Fill PIQ)')}
                 </button>
                 
                 <div className="relative w-full md:w-auto">
                   {isLoggedIn && !hasSubmittedDaily && (
                     <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)] z-10">
                       1
                     </span>
                   )}
                   <button 
                      onClick={() => onStartTest(TestType.DAILY_PRACTICE)}
                      className="w-full px-6 md:px-10 py-4 md:py-5 bg-blue-600/20 text-blue-300 border border-blue-500/30 backdrop-blur-sm rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-[11px] hover:bg-blue-600/40 transition-all flex items-center justify-center gap-3"
                   >
                      <Clock size={16} /> Daily Practice (Free)
                   </button>
                 </div>
                 
                 <button 
                    onClick={() => onStartTest(TestType.CHALLENGE_14_DAY)}
                    className="w-full md:w-auto px-6 md:px-10 py-4 md:py-5 bg-yellow-600/20 text-yellow-300 border border-yellow-500/30 backdrop-blur-sm rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-[11px] hover:bg-yellow-600/40 transition-all flex items-center justify-center gap-3"
                 >
                    <Target size={16} /> 12-Day Full Psyc Challenge
                 </button>
               </div>
             ) : (
               <div className="pt-4 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 w-full">
                    <button onClick={() => onStartTest(TestType.REGISTER)} className="px-10 md:px-14 py-5 bg-yellow-500 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-yellow-500/20 hover:bg-yellow-600 hover:scale-105 transition-all flex items-center justify-center gap-3">
                        <Zap size={18} className="fill-current" /> Start Free Practice Now
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                            <Zap size={14} className="text-yellow-400" /> Wallet Status
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => setShowFreeCoinPopup(true)}
                                className="text-[9px] font-bold px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-500 transition-colors uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-green-600/20"
                            >
                                <Gift size={10} /> Get Free 50 Coins
                            </button>
                            <button onClick={onOpenPayment} className="text-[9px] font-bold px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors uppercase tracking-widest">
                               Add Coins
                            </button>
                        </div>
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
           
           <div className="hidden lg:flex flex-col gap-6 relative justify-center h-full">
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
          
          {isLoggedIn && (
            <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden relative">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                        <Trophy size={24} className="text-yellow-400" />
                    </div>
                    <div>
                        <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tighter">Service Dossier</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            Current Rank: <span className="text-blue-600">{stats.rank}</span>
                        </p>
                    </div>
                </div>
                <div className="text-left sm:text-right">
                    <span className="block text-2xl font-black text-slate-900">{stats.totalTests}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Missions Logged</span>
                </div>
              </div>
              
              {/* GAMIFICATION SECTION: MISSION PERFORMANCE & MEDALS */}
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                  {/* Left: Mission Performance Breakdown */}
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                          <Target size={12} /> Mission Performance
                      </h4>
                      <div className="space-y-3 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
                          {Object.keys(stats.breakdown).length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                  <BarChart2 size={32} className="opacity-20 mb-2" />
                                  <p className="text-[10px] font-bold uppercase tracking-widest">No Data Available</p>
                              </div>
                          ) : (
                              Object.entries(stats.breakdown).map(([type, data]) => (
                                  <div key={type} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                                          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                                              {type.substring(0, 2)}
                                          </div>
                                          <div className="min-w-0">
                                              <p className="text-[10px] font-black uppercase text-slate-800 tracking-tight truncate">{type}</p>
                                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{data.count} Sorties</p>
                                          </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                          <p className="text-xs font-black text-slate-900">{data.avg.toFixed(1)}</p>
                                          <div className="w-12 md:w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                              <div 
                                                  className={`h-full rounded-full ${data.avg > 7 ? 'bg-green-500' : data.avg > 5 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                  style={{ width: `${(data.avg / 10) * 100}%` }}
                                              />
                                          </div>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>

                  {/* Right: Medal Case */}
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                          <Award size={12} /> Decorations
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 place-items-center">
                          <MedalRibbon 
                             title="Early Bird" 
                             desc="Logged in before 0800 Hours" 
                             earned={isEarlyRiser} 
                             colors={['bg-orange-400', 'bg-blue-800', 'bg-orange-400']} 
                             icon={Sun}
                          />
                          <MedalRibbon 
                             title="Veteran" 
                             desc="Completed 20+ Tests" 
                             earned={stats.totalTests >= 20} 
                             colors={['bg-red-800', 'bg-white', 'bg-red-800']} 
                             icon={Star}
                          />
                          <MedalRibbon 
                             title="Marksman" 
                             desc="Avg Score > 8.0" 
                             earned={stats.psychAvg > 8 || stats.interviewAvg > 8} 
                             colors={['bg-green-700', 'bg-yellow-400', 'bg-green-700']} 
                             icon={Crosshair}
                          />
                          <MedalRibbon 
                             title="Navigator" 
                             desc="Visited All Sections" 
                             earned={stats.totalTests > 5} 
                             colors={['bg-blue-600', 'bg-white', 'bg-blue-600']} 
                             icon={Map}
                          />
                      </div>
                  </div>
              </div>

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
                                <div key={i} className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center font-black text-xs shadow-sm">
                                            {h.type.substring(0,2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase text-slate-800 tracking-wide">{h.type}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                                {new Date(h.timestamp).toLocaleDateString()} • {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                                        <div className="text-left md:text-right">
                                            <p className="text-xs font-black text-slate-900">
                                                {h.status === 'pending' ? (
                                                    <span className="flex items-center gap-1 text-blue-600 animate-pulse">
                                                        <Loader2 size={10} className="animate-spin" /> Processing...
                                                    </span>
                                                ) : h.status === 'failed' ? (
                                                    <span className="text-red-500">Failed</span>
                                                ) : h.type === 'CHALLENGE_14_DAY' ? (
                                                    <span className="text-green-600">Completed</span>
                                                ) : `Score: ${h.score}/10`}
                                            </p>
                                            <p className={`text-[9px] font-bold uppercase tracking-widest ${h.status === 'pending' ? 'text-blue-500' : h.status === 'failed' ? 'text-red-500' : 'text-green-600'}`}>
                                                {h.status === 'pending' ? 'In Queue' : h.status === 'failed' ? 'Error' : 'Logged'}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 w-full md:w-auto">
                                            {h.status !== 'pending' && h.status !== 'failed' && (
                                                <button 
                                                    onClick={async (e) => {
                                                        const btn = e.currentTarget;
                                                        const originalText = btn.innerHTML;
                                                        btn.disabled = true;
                                                        btn.innerHTML = '<span class="animate-spin">⏳</span> Loading...';
                                                        
                                                        try {
                                                            let reportData = h.result || h.result_data;
                                                            if (!reportData) {
                                                                reportData = await getTestReport(h.id);
                                                            }
                                                            setSelectedReport({ ...h, result_data: reportData, test_type: h.type });
                                                            setIsReportOpen(true);
                                                        } finally {
                                                            btn.disabled = false;
                                                            btn.innerHTML = originalText;
                                                        }
                                                    }}
                                                    className="flex-1 md:flex-none px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                >
                                                    <FileText size={12} /> Report
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => onStartTest(h.type as TestType, h.result?._original_data)}
                                                className="flex-1 md:flex-none px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <RotateCcw size={12} /> Retry
                                            </button>
                                        </div>
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

          {selectedReport && (
            <ReportModal 
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                data={selectedReport}
                testType={selectedReport.test_type}
            />
          )}

          {/* QUICK ACTION GRID - WITH COIN COSTS */}
          <div className="space-y-4" id="quick-deployment">
             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                 <Zap className="text-yellow-500" /> Quick Deployment
             </h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
                            
                            // 1:1 INTERVIEW SPECIAL LOGIC: Check PIQ then Go to Lobby (Cost = 0 here, deducted later)
                            if (action.id === TestType.INTERVIEW) {
                                if (!piqLoaded) {
                                    onStartTest(TestType.PIQ);
                                } else {
                                    onStartTest(action.id, { cost: 0 }); // Skip immediate deduction
                                }
                                return;
                            }

                            // OIR, LECTURETTE & MOCK SCREENING: Cost handled internally
                            if (action.id === TestType.LECTURETTE || action.id === TestType.OIR || action.id === TestType.MOCK_SCREENING) {
                                onStartTest(action.id, { cost: 0 });
                                return;
                            }

                            // Free Tests
                            if (action.cost === 0) {
                                onStartTest(action.id, undefined);
                                return;
                            }
                            
                            // Check Balance and Prompt
                            onStartTest(action.id, { cost: action.cost });
                        }}
                        className={`p-3 md:p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 md:gap-3 transition-all hover:-translate-y-1 hover:shadow-lg ${action.bg} ${action.border} relative overflow-hidden`}
                    >
                        <div className={`p-2 md:p-3 bg-white rounded-xl shadow-sm ${action.color}`}>
                            <action.icon size={20} className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div className="text-center relative z-10 w-full px-1">
                            <span className="block text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-tight leading-tight break-words">{action.label}</span>
                            <span className="block text-[7px] md:text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 md:mt-1">{action.sub}</span>
                        </div>
                        
                        {/* Only show Cost if Logged In */}
                        {isLoggedIn && action.cost > 0 && (
                            <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 bg-slate-900 text-yellow-400 px-1.5 py-0.5 rounded text-[7px] md:text-[8px] font-black flex items-center gap-1 shadow-sm">
                                <Coins size={8} className="w-2 h-2 md:w-auto md:h-auto" /> {action.cost}
                            </div>
                        )}
                        
                        {/* Only show FREE if explicitly cost 0 AND NOT Interview (Interview has special lobby with costs) AND user is logged in */}
                        {isLoggedIn && action.cost === 0 && action.id !== TestType.INTERVIEW && (
                            <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 bg-green-500 text-white px-1.5 py-0.5 rounded text-[7px] md:text-[8px] font-black shadow-sm">
                                FREE
                            </div>
                        )}
                    </button>
                ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 md:space-y-10">
           <div className="bg-slate-950 p-6 md:p-12 rounded-[2rem] md:rounded-[4rem] text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-500" />
              <Star className="text-yellow-400 w-12 h-12 md:w-16 md:h-16 mb-6 md:mb-8 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-widest mb-4 md:mb-6">The Aspirant's Creed</h3>
              <div className="space-y-4 md:space-y-6 text-xs md:text-sm font-medium italic text-slate-400 leading-relaxed">
                 <p>"I am a leader in the making. I do not fear the challenge; I welcome the trial."</p>
                 <p>"I shall be honest with my words, firm with my actions, and loyal to my team."</p>
                 <p>"Failure is but a lesson in persistence. My resolve is my shield, and my discipline is my weapon."</p>
              </div>
           </div>

           <div className="bg-blue-600 p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] text-white shadow-xl flex flex-col items-center text-center gap-6 group hover:scale-[1.02] transition-all">
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

      {/* TESTIMONIALS */}
      <div className="max-w-4xl mx-auto mt-8 md:mt-12 bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-100 shadow-xl relative overflow-hidden text-center group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-yellow-500 opacity-20"></div>
          <Quote className="w-16 h-16 text-slate-100 absolute top-8 left-8 transform -scale-x-100" />
          
          <div className="relative z-10 space-y-6 animate-in fade-in duration-700" key={testimonialIndex}>
              <p className="text-lg md:text-2xl font-medium text-slate-700 italic leading-relaxed">
                  "{testimonials[testimonialIndex].text}"
              </p>
              <div>
                  <h4 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-widest">
                      {testimonials[testimonialIndex].name}
                  </h4>
                  <p className="text-[10px] md:text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">
                      {testimonials[testimonialIndex].role}
                  </p>
              </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setTestimonialIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === testimonialIndex ? 'w-8 bg-slate-900' : 'w-2 bg-slate-200 hover:bg-slate-300'}`} 
                  />
              ))}
          </div>
      </div>

      <Footer onNavigate={onStartTest} />
      
      {/* FREE COIN POPUP */}
      <FreeCoinModal 
        isOpen={showFreeCoinPopup} 
        onClose={() => setShowFreeCoinPopup(false)} 
      />
    </div>
  );
};

// --- BACKGROUND ASSESSMENT MANAGER ---
const BackgroundAssessmentManager: React.FC<{ userId: string }> = ({ userId }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedCount, setProcessedCount] = useState(0);

    useEffect(() => {
        const processPending = async () => {
            if (isProcessing) return;
            
            const pending = await getPendingAssessments(userId);
            if (pending.length === 0) return;

            setIsProcessing(true);
            console.log(`[Background] Found ${pending.length} pending assessments. Processing...`);

            for (const attempt of pending) {
                try {
                    console.log(`[Background] Evaluating ${attempt.test_type} (ID: ${attempt.id})`);
                    const result = await evaluatePerformance(attempt.test_type as TestType, attempt.original_data);
                    
                    if (result && result.score !== undefined) {
                        await updateTestAttempt(attempt.id, result, 'completed');
                        console.log(`[Background] Successfully processed ${attempt.test_type}`);
                        setProcessedCount(prev => prev + 1);
                    }
                } catch (err) {
                    console.error(`[Background] Failed to process ${attempt.id}:`, err);
                }
            }
            setIsProcessing(false);
        };

        // Run every 2 minutes or on mount
        processPending();
        const interval = setInterval(processPending, 120000);
        return () => clearInterval(interval);
    }, [userId, processedCount]);

    if (isProcessing) {
        return (
            <div className="fixed bottom-24 left-4 z-50 bg-slate-900/90 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 animate-pulse">
                <Loader2 className="animate-spin text-yellow-400" size={18} />
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Background Processing</span>
                    <span className="text-[11px] font-bold">Analyzing your previous test...</span>
                </div>
            </div>
        );
    }

    return null;
};

const App: React.FC = () => {
  const [activeTest, setActiveTest] = useState<TestType>(TestType.DASHBOARD);
  const [activeTestParams, setActiveTestParams] = useState<any>(null);
  const [user, setUser] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Cadet');
  const [piqData, setPiqData] = useState<PIQData | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentOpen, setPaymentOpen] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [mentorStatus, setMentorStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasSubmittedDaily, setHasSubmittedDaily] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const sessionUser = await checkAuthSession();
      if (sessionUser) {
        handleUserAuthenticated(sessionUser);
      }
      setIsLoading(false);
    };
    initAuth();
    const unsubscribe = subscribeToAuthChanges((u: any) => {
      if (u) { handleUserAuthenticated(u); } else {
        setUser(null); setUserEmail(null); setPiqData(null); setSubscription(null);
      }
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  useEffect(() => {
    if (user && !user.startsWith('demo')) {
      const fetchDailyStatus = async () => {
          try {
              const ch = await getLatestDailyChallenge();
              if (ch) {
                  const submitted = await hasUserSubmittedDaily(user, ch.id);
                  setHasSubmittedDaily(submitted);
              }
          } catch (e) {
              console.error("Failed to check daily status", e);
          }
      };
      fetchDailyStatus();
    }
  }, [user]);

  const handleUserAuthenticated = async (u: any) => {
      setUser(u.id);
      setUserEmail(u.email || '');
      setUserName(u.user_metadata?.full_name || u.user_metadata?.name || 'Cadet');
      getUserData(u.id).then((d: any) => d && setPiqData(d));
      getUserSubscription(u.id).then((sub: any) => setSubscription(sub));
      
      // Check mentor status
      getMentorProfile(u.id).then(profile => {
        if (profile) {
          setIsMentor(profile.status === 'APPROVED');
          setMentorStatus(profile.status);
        } else {
          setIsMentor(false);
          setMentorStatus(null);
        }
      });

      const hasSeenWelcome = localStorage.getItem(`ssb_welcome_seen_${u.id}`);
      if (!hasSeenWelcome) setShowWelcome(true);
  };

  const handleLogin = (uid: string, email?: string, metadata?: any) => {
    setUser(uid);
    setUserEmail(email || '');
    if (metadata) {
      setUserName(metadata.full_name || metadata.name || 'Cadet');
    }
    if (activeTest === TestType.LOGIN) {
      setActiveTest(TestType.DASHBOARD);
    }
    getUserData(uid).then((d: any) => d && setPiqData(d));
    getUserSubscription(uid).then((sub: any) => setSubscription(sub));
    
    // Check mentor status
    getMentorProfile(uid).then(profile => {
      if (profile) {
        setIsMentor(profile.status === 'APPROVED');
        setMentorStatus(profile.status);
      } else {
        setIsMentor(false);
        setMentorStatus(null);
      }
    });
  };

  const handleLogoutAction = async () => {
    await logoutUser();
    setUser(null);
    setUserEmail(null);
    setActiveTest(TestType.DASHBOARD);
  };

  const navigateTo = async (test: TestType, params?: any) => {
     if (test === TestType.LOGIN && user) return;
     
     if (test === TestType.ADMIN && !isUserAdmin(userEmail)) {
        alert("Access Denied.");
        return;
     }

     // 2. COIN CHECK (for generic test types)
     // Skip immediate deduction for Psychology tests and PPDT as they handle it internally (Set Selection)
     const isInternallyDeductedTest = [TestType.TAT, TestType.WAT, TestType.SRT, TestType.SDT, TestType.PPDT].includes(test);

     if (user && params?.cost > 0 && !isInternallyDeductedTest) {
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
     setActiveTestParams(params);
  };
  
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
  
  const handleTestComplete = async (result: any, id?: string) => {
      if (!user) return;
      let typeStr = activeTest.toString();
      if (id) {
          await updateTestAttempt(id, result, 'completed');
      } else {
          await saveTestAttempt(user, typeStr, result);
      }
      await incrementUsage(user, typeStr);
  };

  const handlePendingSave = async (testType: string, originalData: any) => {
      if (!user) return "";
      const attempt = await saveTestAttempt(user, testType, { score: 0, verdict: 'Processing...' }, 'pending', originalData);
      return attempt?.id || "";
  };

  const handleShowGuestWarning = () => {
      if (window.confirm("Restricted Area. Please login or create a free account to continue.")) {
          setActiveTest(TestType.LOGIN);
      }
  };

  const renderContent = () => {
    switch (activeTest) {
      case TestType.LOGIN: return <Login onLogin={handleLogin} onCancel={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.REGISTER: return <Login onLogin={handleLogin} onCancel={() => setActiveTest(TestType.DASHBOARD)} initialIsSignUp={true} />;
      case TestType.PIQ: return <PIQForm onSave={async (data: PIQData) => { if(user) { await saveUserData(user, data); setPiqData(data); alert("PIQ Saved"); setActiveTest(TestType.DASHBOARD); } else { alert("Please login."); setActiveTest(TestType.LOGIN); } }} initialData={piqData || undefined} />;
      case TestType.PPDT: 
        if (activeTestParams?.batchTestId) {
          return (
            <BatchPPDTTest 
              userId={user!} 
              batchTestId={activeTestParams.batchTestId} 
              config={activeTestParams} 
              onComplete={() => setActiveTest(TestType.STUDENT_BATCHES)} 
            />
          );
        }
        return <PPDTTest onSave={handleTestComplete} onPendingSave={handlePendingSave} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} onConsumeCoins={handleCoinConsumption} />;
      case TestType.TAT: return <PsychologyTest type={TestType.TAT} onSave={handleTestComplete} onPendingSave={handlePendingSave} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} onConsumeCoins={handleCoinConsumption} />;
      case TestType.WAT: return <PsychologyTest type={TestType.WAT} onSave={handleTestComplete} onPendingSave={handlePendingSave} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} onConsumeCoins={handleCoinConsumption} />;
      case TestType.SRT: return <PsychologyTest type={TestType.SRT} onSave={handleTestComplete} onPendingSave={handlePendingSave} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} onConsumeCoins={handleCoinConsumption} />;
      case TestType.SDT: return <PsychologyTest type={TestType.SDT} onSave={handleTestComplete} onPendingSave={handlePendingSave} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} onConsumeCoins={handleCoinConsumption} />;
      case TestType.GPE: return <GPETest onComplete={handleTestComplete} onPendingSave={handlePendingSave} onConsumeCoins={async (amount) => await handleCoinConsumption(amount)} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.INTERVIEW: return <Interview piqData={piqData || undefined} onSave={handleTestComplete} onPendingSave={handlePendingSave} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} onConsumeCoins={handleCoinConsumption} />;
      case TestType.CONTACT: return <ContactForm piqData={piqData || undefined} />;
      case TestType.STAGES: return <SSBStages />;
      case TestType.ASSESSMENTS: 
        return user ? (
          <Assessments 
            userId={user} 
            onRetry={(type, data) => {
              setActiveTest(type as TestType);
            }} 
          />
        ) : <Login onLogin={handleLogin} onCancel={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.ADMIN: return isUserAdmin(userEmail) ? <AdminPanel /> : <Dashboard onStartTest={navigateTo} piqLoaded={!!piqData} isLoggedIn={!!user} isLoading={isLoading} user={user || ''} onOpenPayment={() => setPaymentOpen(true)} subscription={subscription} onShowGuestWarning={handleShowGuestWarning} hasSubmittedDaily={hasSubmittedDaily} />;
      case TestType.TERMS: case TestType.PRIVACY: case TestType.REFUND: return <LegalPages type={activeTest} onBack={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.GUIDE: return <HowToUse onNavigate={navigateTo} />;
      case TestType.CURRENT_AFFAIRS: return <CurrentAffairs />;
      case TestType.DAILY_PRACTICE: return <DailyPractice onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.CHALLENGE_14_DAY: return <Challenge14Day onBack={() => setActiveTest(TestType.DASHBOARD)} userId={user || undefined} piqData={piqData || undefined} />;
      case TestType.RESOURCES: return <ResourceCenter />;
      case TestType.LECTURETTE: return <LecturetteTest onSave={handleTestComplete} onConsumeCoins={handleCoinConsumption} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} />;
      case TestType.OIR: return (
        <OIRTest 
          onConsumeCoins={handleCoinConsumption} 
          isGuest={!user} 
          onLoginRedirect={() => setActiveTest(TestType.LOGIN)} 
          onExit={() => setActiveTest(activeTestParams?.batchTestId ? TestType.STUDENT_BATCHES : TestType.DASHBOARD)} 
          batchTestId={activeTestParams?.batchTestId}
          config={activeTestParams}
        />
      );
      case TestType.MOCK_SCREENING: return <MockScreening onConsumeCoins={handleCoinConsumption} isGuest={!user} onLoginRedirect={() => setActiveTest(TestType.LOGIN)} onExit={() => setActiveTest(TestType.DASHBOARD)} userId={user || undefined} />;
      case TestType.MENTOR_REGISTRATION: return user ? <MentorRegistration userId={user} userEmail={userEmail || ''} userName={userName} onSuccess={() => setActiveTest(TestType.DASHBOARD)} /> : <Login onLogin={handleLogin} onCancel={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.MENTOR_DASHBOARD: return isMentor ? <MentorDashboard userId={user!} userEmail={userEmail || ''} userName={userName} /> : <Dashboard onStartTest={navigateTo} piqLoaded={!!piqData} isLoggedIn={!!user} isLoading={isLoading} user={user || ''} onOpenPayment={() => setPaymentOpen(true)} subscription={subscription} onShowGuestWarning={handleShowGuestWarning} hasSubmittedDaily={hasSubmittedDaily} />;
      case TestType.STUDENT_BATCHES: return user ? <StudentBatchView userId={user} onStartTest={(type, config, batchTestId) => {
          // Handle starting a test from a batch
          navigateTo(type as TestType, { ...config, batchTestId });
      }} /> : <Login onLogin={handleLogin} onCancel={() => setActiveTest(TestType.DASHBOARD)} />;
      default: return <Dashboard onStartTest={navigateTo} piqLoaded={!!piqData} isLoggedIn={!!user} isLoading={isLoading} user={user || ''} onOpenPayment={() => setPaymentOpen(true)} subscription={subscription} onShowGuestWarning={handleShowGuestWarning} hasSubmittedDaily={hasSubmittedDaily} />;
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
      isMentor={isMentor}
      mentorStatus={mentorStatus}
      subscription={subscription}
      onOpenPayment={() => setPaymentOpen(true)}
      hasSubmittedDaily={hasSubmittedDaily}
    >
      {user && !user.startsWith('demo') && <BackgroundAssessmentManager userId={user} />}
      {renderContent()}
      <SSBBot />
      {user && (
        <PaymentModal 
            userId={user} 
            isOpen={isPaymentOpen} 
            onClose={() => setPaymentOpen(false)} 
            onSuccess={() => { getUserSubscription(user).then((sub: any) => setSubscription(sub)); }}
        />
      )}
    </Layout>
  );
};

export default App;
