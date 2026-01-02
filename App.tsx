
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import PPDTTest from './components/PPDTTest';
import PsychologyTest from './components/PsychologyTest';
import Interview from './components/Interview';
import PIQForm from './components/PIQForm';
import ContactForm from './components/ContactForm';
import SSBStages from './components/SSBStages';
import SSBBot from './components/SSBBot';
import { TestType, PIQData } from './types';
import { getUserData, saveUserData, saveTestAttempt, getUserHistory, checkAuthSession, syncUserProfile, subscribeToAuthChanges } from './services/supabaseService';
import { ShieldCheck, Brain, FileText, CheckCircle, Lock, Quote, Zap, Star, Shield, Flag, ChevronRight, LogIn, Loader2, Cloud, History } from 'lucide-react';

// Dashboard Component
const Dashboard: React.FC<{ 
  onStartTest: (t: TestType) => void, 
  piqLoaded: boolean,
  isLoggedIn: boolean,
  isLoading: boolean,
  user: string
}> = ({ onStartTest, piqLoaded, isLoggedIn, isLoading, user }) => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
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

  // Fetch History on mount if logged in
  useEffect(() => {
    if (isLoggedIn && user && !user.startsWith('demo')) {
      setLoadingHistory(true);
      getUserHistory(user).then(data => {
        setHistory(data);
        setLoadingHistory(false);
      });
    }
  }, [isLoggedIn, user]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* HERO SECTION */}
      <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl border-b-8 border-yellow-500">
         <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
           <div className="space-y-6">
             <div className="flex items-center gap-3">
               <span className="px-4 py-1.5 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg animate-bounce">Officer Potential</span>
               <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Board Simulation v4.0</span>
             </div>
             <h1 className="text-6xl font-black tracking-tighter leading-none">Do You Have It <br/><span className="text-yellow-400 italic font-serif">In You?</span></h1>
             <p className="text-slate-400 text-lg leading-relaxed font-medium italic opacity-80">
               "Victory favors the prepared. The SSB doesn't test your knowledge; it tests your personality, grit, and 15 Officer Like Qualities."
             </p>
             
             {isLoggedIn ? (
               <div className="flex flex-wrap gap-4 pt-4">
                 <button 
                   onClick={() => piqLoaded ? onStartTest(TestType.INTERVIEW) : onStartTest(TestType.PIQ)}
                   className={`px-10 py-5 font-black rounded-2xl transition-all shadow-xl hover:-translate-y-1 uppercase tracking-widest text-[11px] flex items-center gap-3 ${
                     piqLoaded 
                     ? 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-yellow-400/20' 
                     : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed group'
                   }`}
                   disabled={isLoading}
                 >
                   {isLoading ? <Loader2 className="animate-spin" size={14}/> : !piqLoaded && <Lock size={14} className="text-slate-500" />}
                   {isLoading ? 'Syncing...' : 'Commence AI Interview'}
                   {!piqLoaded && !isLoading && <span className="absolute -bottom-10 left-0 text-[8px] text-red-400 font-black opacity-0 group-hover:opacity-100 transition-opacity">CLEARANCE REQUIRED: PIQ MISSING</span>}
                 </button>
                 
                 <button 
                    onClick={() => onStartTest(TestType.PIQ)}
                    className={`px-10 py-5 font-black rounded-2xl transition-all uppercase tracking-widest text-[11px] border flex items-center gap-3 ${
                      piqLoaded 
                      ? 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10' 
                      : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500'
                    }`}
                  >
                    {piqLoaded ? <CheckCircle size={16} className="text-green-500" /> : <FileText size={16} />}
                    {piqLoaded ? 'Dossier Loaded' : 'Complete PIQ Dossier'}
                  </button>
               </div>
             ) : (
               <div className="pt-4">
                  <button 
                    onClick={() => onStartTest(TestType.LOGIN)}
                    className="px-12 py-6 bg-yellow-400 text-black rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-yellow-400/20 hover:bg-yellow-300 hover:scale-105 transition-all flex items-center gap-3"
                  >
                    <LogIn size={18} /> Join / Login to Start
                  </button>
                  <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Sign up to access AI Interview & Psychology Tests</p>
               </div>
             )}
           </div>

           <div className="hidden lg:block relative">
              <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 space-y-8 relative z-10 shadow-inner group overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Quote size={120} />
                </div>
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-1000" key={quoteIndex}>
                  <p className="text-2xl font-black text-white italic leading-tight uppercase tracking-tighter">"{quotes[quoteIndex].text}"</p>
                  <p className="text-yellow-400 font-black uppercase tracking-widest text-[10px]">— {quotes[quoteIndex].author}</p>
                </div>
                <div className="flex gap-2">
                  {quotes.map((_, i) => (
                    <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === quoteIndex ? 'w-10 bg-yellow-400' : 'w-2 bg-white/20'}`} />
                  ))}
                </div>
              </div>
           </div>
         </div>
         <ShieldCheck className="absolute top-1/2 -right-12 -translate-y-1/2 w-[30rem] h-[30rem] text-white/5 rotate-12 pointer-events-none" />
      </div>

      {/* OFFICER'S CREED & ROADMAP */}
      <div className="grid lg:grid-cols-12 gap-10">
         <div className="lg:col-span-8 space-y-10">
           {/* HISTORY LOGS */}
           {isLoggedIn && (
             <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                   <History className="text-purple-600" size={20} /> Mission Logs
                 </h3>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Activity</span>
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
                     <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-black text-[10px]">
                            {h.type.substring(0,2)}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase text-slate-800 tracking-wide">{h.type}</p>
                            <p className="text-[9px] text-slate-400 font-bold">{new Date(h.timestamp).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-900">Score: {h.score}</p>
                          <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest">Logged</p>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           )}

           <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-xl flex flex-col">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                  <Flag className="text-blue-600" /> Strategic Roadmap
                </h3>
                <button onClick={() => onStartTest(TestType.STAGES)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">View Full 5-Day Plan</button>
             </div>
             <div className="space-y-5">
                {[
                  { id: TestType.PIQ, name: 'Personal Info Questionnaire', type: 'Phase 0: Admin', time: '15 mins', status: isLoggedIn ? (piqLoaded ? 'Completed' : 'Action Required') : 'Login Required' },
                  { id: TestType.PPDT, name: 'Stage 1: PPDT Simulation', type: 'Screening Round', time: '10 mins', status: isLoggedIn ? 'Available' : 'Login Required' },
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
                    className="flex items-center justify-between p-7 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-slate-900 hover:bg-white transition-all cursor-pointer group shadow-sm hover:shadow-2xl"
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                        test.status === 'Completed' ? 'bg-green-100 text-green-600' : 
                        (test.status === 'Restricted' || test.status === 'Login Required') ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white group-hover:rotate-6'
                      }`}>
                        {test.status === 'Completed' ? <CheckCircle size={20} /> : (test.status === 'Restricted' || test.status === 'Login Required') ? <Lock size={20} /> : <Zap size={20} />}
                      </div>
                      <div>
                        <h5 className="font-black text-slate-900 uppercase text-xs tracking-widest">{test.name}</h5>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{test.type} • {test.time}</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                  </div>
                ))}
             </div>
           </div>
         </div>

         <div className="lg:col-span-4 space-y-10">
            <div className="bg-slate-950 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
               <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-500" />
               <Star className="text-yellow-400 w-16 h-16 mb-8 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
               <h3 className="text-2xl font-black uppercase tracking-widest mb-6">The Aspirant's Creed</h3>
               <div className="space-y-6 text-sm font-medium italic text-slate-400 leading-relaxed">
                  <p>"I am a leader in the making. I do not fear the challenge; I welcome the trial."</p>
                  <p>"I shall be honest with my words, firm with my actions, and loyal to my team."</p>
                  <p>"Failure is but a lesson in persistence. My resolve is my shield, and my discipline is my weapon."</p>
               </div>
               <div className="mt-12 w-full pt-10 border-t border-white/10 space-y-4">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Officer Like Qualities (OLQ)</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['Courage', 'Stamina', 'Integrity', 'Social Adaptability', 'Logic'].map((olq, i) => (
                      <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] font-black uppercase text-slate-400">{olq}</span>
                    ))}
                  </div>
               </div>
            </div>

            <div className="bg-blue-600 p-10 rounded-[3.5rem] text-white shadow-xl flex flex-col items-center text-center gap-6 group hover:scale-[1.02] transition-all">
               <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/30 shadow-2xl">
                 <Shield className="w-10 h-10 text-white" />
               </div>
               <div>
                 <h4 className="text-xl font-black uppercase tracking-widest mb-2">SSB Navigator</h4>
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [piqData, setPiqData] = useState<PIQData | undefined>(undefined);

  // Initial Load and Real-time Auth Subscription
  useEffect(() => {
    // 1. Check local storage first for speed
    const localUser = localStorage.getItem('ssb_user');
    if (localUser) {
      setUser(localUser);
      setIsLoggedIn(true);
      getUserData(localUser).then(data => { if(data) setPiqData(data); });
    }

    // 2. Subscribe to Supabase Auth State (Handles redirects from email links)
    const unsubscribe = subscribeToAuthChanges(async (sbUser) => {
      if (sbUser) {
        setIsLoading(true);
        const identifier = sbUser.id;
        setUser(identifier);
        setIsLoggedIn(true);
        localStorage.setItem('ssb_user', identifier);
        
        await syncUserProfile(sbUser);
        const data = await getUserData(identifier);
        if (data) setPiqData(data);
        setIsLoading(false);
      } else {
        // Only log out if we are not using demo mode (demo mode doesn't use supabase auth)
        if (localStorage.getItem('ssb_user')?.startsWith('demo')) return;
        
        setIsLoggedIn(false);
        setUser('');
        setPiqData(undefined);
        localStorage.removeItem('ssb_user');
      }
    });

    return () => { unsubscribe(); };
  }, []);

  const handleLogin = async (identifier: string) => {
    setIsLoading(true);
    setUser(identifier);
    setIsLoggedIn(true);
    localStorage.setItem('ssb_user', identifier);
    
    // Attempt to fetch existing data from cloud
    const data = await getUserData(identifier);
    if (data) setPiqData(data);
    
    setIsLoading(false);
    setActiveTest(TestType.DASHBOARD);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser('');
    setPiqData(undefined);
    localStorage.removeItem('ssb_user');
    setActiveTest(TestType.DASHBOARD);
    // Also sign out of Supabase
    subscribeToAuthChanges(() => {})(); // no-op to just access the module if needed, but we call logoutUser() in Layout usually
  };

  const handlePiqSave = async (data: PIQData) => {
    setPiqData(data);
    if (user) {
        setIsLoading(true);
        await saveUserData(user, data);
        setIsLoading(false);
    }
    setActiveTest(TestType.DASHBOARD);
  };
  
  const handleTestCompletion = async (testType: string, resultData: any) => {
    if (user) {
      await saveTestAttempt(user, testType, resultData);
    }
  };

  const handleNavigation = (test: TestType) => {
    const publicTests = [TestType.DASHBOARD, TestType.STAGES, TestType.CONTACT, TestType.LOGIN];
    
    if (!isLoggedIn && !publicTests.includes(test)) {
        setActiveTest(TestType.LOGIN);
    } else {
        setActiveTest(test);
    }
  };

  const renderContent = () => {
    if (activeTest === TestType.LOGIN) {
       return <Login onLogin={handleLogin} />;
    }

    switch (activeTest) {
      case TestType.DASHBOARD:
        return <Dashboard onStartTest={handleNavigation} piqLoaded={!!piqData} isLoggedIn={isLoggedIn} isLoading={isLoading} user={user} />;
      case TestType.PIQ:
        return <PIQForm key="piq-form" onSave={handlePiqSave} initialData={piqData} />;
      case TestType.PPDT:
        return <PPDTTest key="ppdt-test" onSave={(res: any) => handleTestCompletion('PPDT', res)} />;
      case TestType.WAT:
      case TestType.TAT:
      case TestType.SRT:
        return <PsychologyTest key={activeTest} type={activeTest} onSave={(res: any) => handleTestCompletion(activeTest, res)} />;
      case TestType.INTERVIEW:
        return <Interview key="interview-test" piqData={piqData} onSave={(res: any) => handleTestCompletion('INTERVIEW', res)} />;
      case TestType.AI_BOT:
        return <SSBBot key="ssb-bot" />;
      case TestType.CONTACT:
        return <ContactForm key="contact-form" piqData={piqData} />;
      case TestType.STAGES:
        return <SSBStages key="ssb-stages" />;
      default:
        return <Dashboard onStartTest={handleNavigation} piqLoaded={!!piqData} isLoggedIn={isLoggedIn} isLoading={isLoading} user={user} />;
    }
  };

  return (
    <>
        {activeTest === TestType.LOGIN ? (
            <Login onLogin={handleLogin} />
        ) : (
            <Layout 
                activeTest={activeTest} 
                onNavigate={(t) => {
                    if (t === TestType.INTERVIEW && !piqData && isLoggedIn) {
                        setActiveTest(TestType.PIQ);
                    } else {
                        handleNavigation(t);
                    }
                }} 
                onLogout={handleLogout} 
                onLogin={() => setActiveTest(TestType.LOGIN)}
                user={user}
                isLoggedIn={isLoggedIn}
            >
                {isLoading && (
                  <div className="fixed top-4 right-4 z-50 bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-xl text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest shadow-xl">
                    <Cloud className="animate-bounce text-blue-400" size={14} /> Cloud Sync
                  </div>
                )}
                {renderContent()}
            </Layout>
        )}
    </>
  );
};

export default App;
