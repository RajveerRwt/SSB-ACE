
import React, { useState, useEffect } from 'react';
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
import { TestType, PIQData, UserSubscription } from '../types';
import { getUserData, saveUserData, saveTestAttempt, getUserHistory, checkAuthSession, syncUserProfile, subscribeToAuthChanges, isUserAdmin, checkLimit, getUserSubscription, getLatestPaymentRequest, incrementUsage, logoutUser } from '../services/supabaseService';
import { ShieldCheck, Brain, FileText, CheckCircle, Lock, Quote, Zap, Star, Shield, Flag, ChevronRight, LogIn, Loader2, Cloud, History, Crown, Clock, AlertCircle } from 'lucide-react';
import { SSBLogo } from './Logo';

// Dashboard Component
const Dashboard: React.FC<{ 
  onStartTest: (t: TestType) => void, 
  piqLoaded: boolean,
  isLoggedIn: boolean,
  isLoading: boolean,
  user: string,
  onOpenPayment: () => void
}> = ({ onStartTest, piqLoaded, isLoggedIn, isLoading, user, onOpenPayment }) => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  
  const quotes = [
    { text: "Either I will come back after hoisting the Tricolour, or I will come back wrapped in it, but I will be back for sure.", author: "Capt. Vikram Batra, PVC" },
    { text: "No Sir, I will not abandon my gun. My gun is still firing.", author: "Major Somnath Sharma, PVC" },
    { text: "If a man says he is not afraid of dying, he is either lying or is a Gurkha.", author: "Field Marshal Sam Manekshaw" },
    { text: "The safety, honour and welfare of your country come first, always and every time.", author: "Chetwode Motto" },
    { text: "I regret I have but one life to give for my country.", author: "Capt. Manoj Kumar Pandey, PVC" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % quotes.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [quotes.length]);

  // Fetch History, Sub Stats, and Payment Status
  useEffect(() => {
    if (isLoggedIn && user && !user.startsWith('demo')) {
      setLoadingHistory(true);
      getUserHistory(user).then(data => {
        setHistory(data);
        setLoadingHistory(false);
      });
      getUserSubscription(user).then((sub: UserSubscription) => setSubscription(sub));
      
      const fetchStatus = () => {
         getLatestPaymentRequest(user).then((status: any) => setPaymentStatus(status));
      };
      
      // Initial fetch
      fetchStatus();

      // Poll for updates if pending (auto-refresh pro status)
      const interval = setInterval(() => {
          fetchStatus();
          // Also refresh subscription to catch approval
          getUserSubscription(user).then((sub: UserSubscription) => setSubscription(sub));
      }, 30000); // Check every 30s
      
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, user]);

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
                   className={`flex-1 md:flex-none px-6 md:px-10 py-4 md:py-5 font-black rounded-2xl transition-all shadow-xl hover:-translate-y-1 uppercase tracking-widest text-[10px] md:text-[11px] flex items-center justify-center gap-3 ${
                     piqLoaded 
                     ? 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-yellow-400/20' 
                     : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed group'
                   }`}
                   disabled={isLoading}
                 >
                   {isLoading ? <Loader2 className="animate-spin" size={14}/> : !piqLoaded && <Lock size={14} className="text-slate-500" />}
                   {isLoading ? 'Syncing...' : 'Commence AI Interview'}
                   {!piqLoaded && !isLoading && <span className="absolute -bottom-10 left-0 text-[8px] text-red-400 font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden md:block">CLEARANCE REQUIRED: PIQ MISSING</span>}
                 </button>
                 
                 {subscription?.tier === 'FREE' && (!paymentStatus || paymentStatus.status !== 'PENDING') && (
                    <button 
                      onClick={onOpenPayment}
                      className="flex-1 md:flex-none px-6 md:px-10 py-4 md:py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-[11px] hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-lg"
                    >
                      <Crown size={16} /> Upgrade to Pro
                    </button>
                 )}
               </div>
             ) : (
               <div className="pt-4">
                  <button 
                    onClick={() => onStartTest(TestType.LOGIN)}
                    className="w-full md:w-auto px-12 py-6 bg-yellow-400 text-black rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-yellow-400/20 hover:bg-yellow-300 hover:scale-105 transition-all flex items-center justify-center gap-3"
                  >
                    <LogIn size={18} /> Join / Login to Start
                  </button>
                  <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Sign up to access AI Interview & Psychology Tests</p>
               </div>
             )}

             {/* UPDATED CREDIT STATS LOCATION - Integrated into Left Column */}
             {isLoggedIn && subscription && (
                 <div className="mt-4 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                            <Zap size={14} className="text-yellow-400" /> Plan Credits (Total)
                        </p>
                        <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase tracking-widest ${subscription.tier === 'PRO' ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30' : 'bg-slate-700 text-slate-400'}`}>
                           {subscription.tier} Plan
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 md:gap-4 divide-x divide-white/5">
                        <div className="space-y-1 pr-2">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Interview</p>
                            <p className="text-sm md:text-base font-black text-white">{subscription.usage.interview_used} <span className="text-slate-600 text-[10px]">/ {subscription.usage.interview_limit + subscription.extra_credits.interview}</span></p>
                        </div>
                        <div className="space-y-1 px-2">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">PPDT</p>
                            <p className="text-sm md:text-base font-black text-white">{subscription.usage.ppdt_used} <span className="text-slate-600 text-[10px]">/ {subscription.usage.ppdt_limit}</span></p>
                        </div>
                        <div className="space-y-1 pl-2">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">TAT</p>
                            <p className="text-sm md:text-base font-black text-white">{subscription.usage.tat_used} <span className="text-slate-600 text-[10px]">/ {subscription.usage.tat_limit}</span></p>
                        </div>
                    </div>
                    <p className="mt-3 text-[9px] text-slate-500 font-medium italic">* Credits are allocated per subscription period, not daily.</p>
                 </div>
             )}
           </div>

           <div className="hidden lg:flex flex-col gap-6 relative justify-center h-full">
              {/* BRANDING HEADER - Added above quotes */}
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-sm">
                      <SSBLogo className="w-8 h-8" />
                  </div>
                  <div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">
                      SSB<span className="text-yellow-400">PREP</span>.ONLINE
                      </h2>
                      <p className="text-blue-200/60 text-[9px] font-black uppercase tracking-[0.3em] mt-1">
                      Prepare. Lead. Succeed
                      </p>
                  </div>
              </div>

              <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 space-y-8 relative z-10 shadow-inner group overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Quote size={120} />
                </div>
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-1000" key={quoteIndex}>
                  <p className="text-2xl font-black text-white italic leading-tight uppercase tracking-tighter">"{quotes[quoteIndex].text}"</p>
                  <p className="text-yellow-400 font-black uppercase tracking-widest text-[10px]">— {quotes[quoteIndex].author}</p>
                </div>
              </div>
           </div>
         </div>
         <ShieldCheck className="absolute top-1/2 -right-12 -translate-y-1/2 w-[20rem] md:w-[30rem] h-[20rem] md:h-[30rem] text-white/5 rotate-12 pointer-events-none" />
      </div>

      {/* OFFICER'S CREED & ROADMAP */}
      <div className="grid lg:grid-cols-12 gap-6 md:gap-10">
         <div className="lg:col-span-8 space-y-6 md:space-y-10">
           {/* HISTORY LOGS */}
           {isLoggedIn && (
             <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-xl">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                   <History className="text-purple-600" size={20} /> Mission Logs
                 </h3>
                 <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Activity</span>
               </div>
               
               {loadingHistory ? (
                 <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-slate-300" /></div>
               ) : history.length === 0 ? (
                 <div className="text-center p-8 bg-slate-50 rounded-3xl text-slate-400 text-xs font-medium italic">
                   "No mission records found. Complete a test to initialize log."
                 </div>
               ) : (
                 <div className="space-y-3">
                   {history.map((h, i) => (
                     <div key={i} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors gap-3">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-black text-[10px]">
                            {h.type.substring(0,2)}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase text-slate-800 tracking-wide">{h.type}</p>
                            <p className="text--[9px] text-slate-400 font-bold">{new Date(h.timestamp).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right flex md:block w-full md:w-auto justify-between items-center">
                          <p className="text-xs font-black text-slate-900">Score: {h.score}</p>
                          <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest">Logged</p>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           )}

           <div className="bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[4rem] border border-slate-100 shadow-xl flex flex-col">
             <div className="flex justify-between items-center mb-6 md:mb-10">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                  <Flag className="text-blue-600" /> Strategic Roadmap
                </h3>
                <button onClick={() => onStartTest(TestType.STAGES)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">View Full Plan</button>
             </div>
             <div className="space-y-4 md:space-y-5">
                {[
                  { id: TestType.PIQ, name: 'Personal Info Questionnaire', type: 'Phase 0: Admin', time: '15 mins', status: isLoggedIn ? (piqLoaded ? 'Completed' : 'Action Required') : 'Login Required' },
                  { id: TestType.PPDT, name: 'PPDT Simulation', type: 'Stage 1: Screening', time: '10 mins', status: isLoggedIn ? 'Available' : 'Login Required' },
                  { id: TestType.SDT, name: 'Self Description Test', type: 'Stage 2: Psychology', time: '15 mins', status: isLoggedIn ? 'Available' : 'Login Required' },
                  { id: TestType.INTERVIEW, name: 'Stage 2: Personal Interview', type: 'IO Evaluation', time: '40 mins', status: isLoggedIn ? (piqLoaded ? 'Available' : 'Restricted') : 'Login Required' },
                  { id: TestType.TAT, name: 'Stage 2: Psychology (TAT)', type: 'Mental Strength', time: '45 mins', status: isLoggedIn ? 'Available' : 'Login Required' },
                ].map((test, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                        if (!isLoggedIn) onStartTest(TestType.LOGIN);
                        else if (test.id !== TestType.INTERVIEW || piqLoaded) onStartTest(test.id);
                        else onStartTest(TestType.PIQ);
                    }}
                    className="flex items-center justify-between p-5 md:p-7 bg-slate-50 rounded-[2rem] md:rounded-[2.5rem] border-2 border-transparent hover:border-slate-900 hover:bg-white transition-all cursor-pointer group shadow-sm hover:shadow-2xl"
                  >
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                        test.status === 'Completed' ? 'bg-green-100 text-green-600' : 
                        (test.status === 'Restricted' || test.status === 'Login Required') ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white group-hover:rotate-6'
                      }`}>
                        {test.status === 'Completed' ? <CheckCircle size={20} /> : (test.status === 'Restricted' || test.status === 'Login Required') ? <Lock size={20} /> : <Zap size={20} />}
                      </div>
                      <div>
                        <h5 className="font-black text-slate-900 uppercase text-xs tracking-widest truncate max-w-[150px] md:max-w-none">{test.name}</h5>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{test.type} • {test.time}</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                  </div>
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

  useEffect(() => {
    const initAuth = async () => {
      const sessionUser = await checkAuthSession();
      if (sessionUser) {
        setUser(sessionUser.id);
        setUserEmail(sessionUser.email || '');
        syncUserProfile(sessionUser);
        const data = await getUserData(sessionUser.id);
        if (data) setPiqData(data);
      }
      setIsLoading(false);
    };
    
    initAuth();

    const unsubscribe = subscribeToAuthChanges((u: any) => {
      if (u) {
        setUser(u.id);
        setUserEmail(u.email || '');
        getUserData(u.id).then((d: PIQData | null) => d && setPiqData(d));
      } else {
        setUser(null);
        setUserEmail(null);
        setPiqData(null);
      }
    });
    
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleLogin = (uid: string, email?: string) => {
    setUser(uid);
    setUserEmail(email || '');
    setActiveTest(TestType.DASHBOARD);
    getUserData(uid).then((d: PIQData | null) => d && setPiqData(d));
  };

  const handleLogoutAction = async () => {
    await logoutUser();
    setUser(null);
    setUserEmail(null);
    setActiveTest(TestType.DASHBOARD);
  };

  const navigateTo = async (test: TestType) => {
     // 1. Prevent Login page if already logged in
     if (test === TestType.LOGIN && user) return; 
     
     // 2. PROTECTED ROUTES CHECK
     // These sections require a valid user session
     const protectedRoutes = [
        TestType.PIQ,
        TestType.PPDT,
        TestType.TAT,
        TestType.WAT,
        TestType.SRT,
        TestType.SDT,
        TestType.INTERVIEW,
        TestType.AI_BOT
     ];

     if (protectedRoutes.includes(test) && !user) {
        alert("Restricted Area. Please Login to access training simulations.");
        setActiveTest(TestType.LOGIN);
        return;
     }

     // 3. SUBSCRIPTION LIMIT CHECK (Only if logged in)
     if ((test === TestType.INTERVIEW || test === TestType.PPDT || test === TestType.TAT) && user) {
        const { allowed, message } = await checkLimit(user, test);
        if (!allowed) {
            alert(message);
            setPaymentOpen(true);
            return;
        }
     }
     
     // 4. ADMIN CHECK
     if (test === TestType.ADMIN && !isUserAdmin(userEmail)) {
        alert("Access Denied.");
        return;
     }

     setActiveTest(test);
  };
  
  const handleTestComplete = async (result: any) => {
      if (!user) return;
      
      // Save Attempt
      let typeStr = activeTest.toString();
      await saveTestAttempt(user, typeStr, result);
      
      // Increment Usage (Limits)
      await incrementUsage(user, typeStr);
  };

  const renderContent = () => {
    switch (activeTest) {
      case TestType.LOGIN:
        return <Login onLogin={handleLogin} onCancel={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.PIQ:
        return <PIQForm onSave={async (data: PIQData) => { 
            if(user) {
                await saveUserData(user, data); 
                setPiqData(data); 
                alert("PIQ Saved"); 
                setActiveTest(TestType.DASHBOARD);
            } else {
                alert("Please login to save PIQ.");
                setActiveTest(TestType.LOGIN);
            }
        }} initialData={piqData || undefined} />;
      case TestType.PPDT:
        return <PPDTTest onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} />;
      case TestType.TAT:
        return <PsychologyTest type={TestType.TAT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} />;
      case TestType.WAT:
        return <PsychologyTest type={TestType.WAT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} />;
      case TestType.SRT:
        return <PsychologyTest type={TestType.SRT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} />;
      case TestType.SDT:
        return <PsychologyTest type={TestType.SDT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} />;
      case TestType.INTERVIEW:
        return <Interview piqData={piqData || undefined} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} />;
      case TestType.CONTACT:
        return <ContactForm piqData={piqData || undefined} />;
      case TestType.STAGES:
        return <SSBStages />;
      case TestType.AI_BOT:
        return <SSBBot />;
      case TestType.ADMIN:
        return isUserAdmin(userEmail) ? <AdminPanel /> : <Dashboard 
            onStartTest={navigateTo} 
            piqLoaded={!!piqData} 
            isLoggedIn={!!user} 
            isLoading={isLoading} 
            user={user || ''}
            onOpenPayment={() => setPaymentOpen(true)}
        />;
      case TestType.TERMS:
      case TestType.PRIVACY:
      case TestType.REFUND:
        return <LegalPages type={activeTest} onBack={() => setActiveTest(TestType.DASHBOARD)} />;
      default:
        return <Dashboard 
            onStartTest={navigateTo} 
            piqLoaded={!!piqData} 
            isLoggedIn={!!user} 
            isLoading={isLoading} 
            user={user || ''}
            onOpenPayment={() => setPaymentOpen(true)}
        />;
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
    >
      {renderContent()}
      {user && (
        <PaymentModal 
            userId={user} 
            isOpen={isPaymentOpen} 
            onClose={() => setPaymentOpen(false)} 
            onSuccess={() => {}}
        />
      )}
    </Layout>
  );
};

export default App;
