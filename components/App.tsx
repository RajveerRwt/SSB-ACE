
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
import HowToUse from './HowToUse';
import CurrentAffairs from './CurrentAffairs';
import DailyPractice from './DailyPractice';
import { TestType, PIQData, UserSubscription } from '../types';
import { getUserData, saveUserData, saveTestAttempt, getUserHistory, checkAuthSession, syncUserProfile, subscribeToAuthChanges, isUserAdmin, checkLimit, getUserSubscription, getLatestPaymentRequest, incrementUsage, logoutUser } from '../services/supabaseService';
import { ShieldCheck, CheckCircle, Lock, Quote, Zap, Star, Shield, Flag, ChevronRight, LogIn, Loader2, History, Crown, Clock, AlertCircle, Phone, UserPlus, Percent, Tag, ArrowUpRight, Trophy, Medal, MessageCircle, X } from 'lucide-react';
import { SSBLogo } from './Logo';

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
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [showPromo, setShowPromo] = useState(true);
  
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
        setLoadingHistory(false);
      });
      getUserSubscription(user).then(sub => setSubscription(sub));
      
      const fetchStatus = () => {
         getLatestPaymentRequest(user).then(status => setPaymentStatus(status));
      };
      
      fetchStatus();
      const interval = setInterval(() => {
          fetchStatus();
          getUserSubscription(user).then(sub => setSubscription(sub));
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, user]);

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* PROMO BANNER */}
      {showPromo && (!subscription || subscription.tier === 'FREE') && (
         <div className="relative animate-in slide-in-from-top duration-500">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-white to-green-500 rounded-2xl blur opacity-25"></div>
            <div className="relative bg-white rounded-2xl p-4 md:p-6 border border-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 pointer-events-none">
                  <Crown size={120} />
               </div>
               <div className="flex items-center gap-5 z-10">
                  <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-lg border border-slate-700">
                     <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-0.5">Sale</span>
                     <span className="text-2xl font-black leading-none">26%</span>
                     <span className="text-[9px] font-black text-green-400 uppercase tracking-widest mt-0.5">OFF</span>
                  </div>
                  <div>
                     <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">Republic Day Offer</h4>
                     <p className="text-xs font-bold text-slate-500 mt-1 max-w-md">Use Code: <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">REPUBLIC26</span> for a massive discount on the Officer Plan.</p>
                  </div>
               </div>
               <div className="flex items-center gap-3 w-full md:w-auto z-10">
                  <button onClick={onOpenPayment} className="flex-1 md:flex-none px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg">Claim Offer</button>
                  <button onClick={() => setShowPromo(false)} className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"><X size={18} /></button>
               </div>
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
             <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">Do You Have It <br/><span className="text-yellow-400 italic font-serif">In You?</span></h1>
             <p className="text-slate-400 text-sm md:text-lg leading-relaxed font-medium italic opacity-80">
               "Victory favors the prepared. The SSB doesn't test your knowledge; it tests your personality, grit, and 15 Officer Like Qualities."
             </p>
             
             <div className="flex flex-wrap gap-4 pt-4">
               {isLoggedIn ? (
                 <button 
                   onClick={() => piqLoaded ? onStartTest(TestType.INTERVIEW) : onStartTest(TestType.PIQ)}
                   className={`flex-1 md:flex-none px-6 md:px-10 py-4 md:py-5 font-black rounded-2xl transition-all shadow-xl hover:-translate-y-1 uppercase tracking-widest text-[10px] md:text-[11px] flex items-center justify-center gap-3 ${piqLoaded ? 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-yellow-400/20' : 'bg-slate-800 text-slate-500 border border-white/5'}`}
                   disabled={isLoading}
                 >
                   {isLoading ? 'Syncing...' : (piqLoaded ? 'Start AI Interview' : 'Unlock Interview (Fill PIQ)')}
                 </button>
               ) : (
                 <div className="flex gap-4">
                    <button onClick={() => onStartTest(TestType.LOGIN)} className="px-8 md:px-10 py-5 bg-white/5 text-white rounded-2xl font-black uppercase text-xs border border-white/10 hover:bg-white/10 transition-all">Login</button>
                    <button onClick={() => onStartTest(TestType.REGISTER)} className="px-8 md:px-10 py-5 bg-yellow-400 text-black rounded-2xl font-black uppercase text-xs shadow-xl">Join for Free</button>
                 </div>
               )}
             </div>

             {isLoggedIn && subscription && (
                 <div className="mt-4 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 mb-4"><Zap size={14} className="text-yellow-400" /> Plan Credits</p>
                    <div className="grid grid-cols-5 gap-2 md:gap-4">
                        {['Interview', 'PPDT', 'TAT', 'WAT', 'SRT'].map((key) => (
                            <div key={key} className="space-y-1 pr-2 border-r border-white/5 last:border-0">
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{key}</p>
                                <p className="text-xs md:text-sm font-black text-white">{subscription.usage[`${key.toLowerCase()}_used` as keyof typeof subscription.usage]}</p>
                            </div>
                        ))}
                    </div>
                 </div>
             )}
           </div>
           <div className="hidden lg:flex flex-col gap-6 relative justify-center h-full">
              <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 space-y-8 relative z-10 overflow-hidden">
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

      {/* PLAN COMPARISON */}
      {(!isLoggedIn || (subscription && subscription.tier === 'FREE')) && (
          <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
              <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 text-center">
                 <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Choose Your SSB Prep Plan</h2>
              </div>
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                 <div className="space-y-6">
                    <h3 className="font-black text-slate-700 uppercase tracking-widest text-lg">Free Cadet</h3>
                    <ul className="space-y-4 text-xs font-bold text-slate-500">
                       <li className="flex items-center gap-3"><CheckCircle size={16} className="text-green-500"/> 1 Personal Interview</li>
                       <li className="flex items-center gap-3"><CheckCircle size={16} className="text-green-500"/> Daily News & Intelligence</li>
                       <li className="flex items-center gap-3"><CheckCircle size={16} className="text-green-500"/> AI Guide Assistance</li>
                    </ul>
                 </div>
                 <div className="space-y-6 relative">
                    <h3 className="font-black text-blue-600 uppercase tracking-widest text-lg">Pro Officer (₹299)</h3>
                    <ul className="space-y-4 text-xs font-bold text-slate-700">
                       <li className="flex items-center gap-3"><Zap size={16} className="text-blue-600"/> 5 Full Virtual Interviews</li>
                       <li className="flex items-center gap-3"><Zap size={16} className="text-blue-600"/> 30 PPDT & 7 TAT Sets</li>
                       <li className="flex items-center gap-3"><Zap size={16} className="text-blue-600"/> 10 SRT & WAT Psychology Tests</li>
                    </ul>
                    <button onClick={onOpenPayment} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] shadow-lg">Upgrade to Pro</button>
                 </div>
              </div>
          </section>
      )}

      {/* TESTIMONIALS */}
      <section className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-xl">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-3"><MessageCircle size={20} /> Success Stories</h2>
          <div key={testimonialIndex} className="animate-in fade-in slide-in-from-right-4 duration-500">
              <p className="text-sm md:text-lg font-medium text-slate-700 italic leading-relaxed mb-6 border-l-4 border-yellow-400 pl-4">"{testimonials[testimonialIndex].text}"</p>
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xs">{testimonials[testimonialIndex].name[0]}</div>
                  <div>
                      <p className="text-xs font-black text-slate-900 uppercase">{testimonials[testimonialIndex].name}</p>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{testimonials[testimonialIndex].role}</p>
                  </div>
              </div>
          </div>
      </section>

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
        setUser(null); setUserEmail(null); setPiqData(null);
      }
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  const handleLogin = (uid: string, email?: string) => {
    setUser(uid); setUserEmail(email || '');
    getUserData(uid).then((d: PIQData | null) => d && setPiqData(d));
    setActiveTest(TestType.DASHBOARD);
    if (pendingPaymentIntent) { setPaymentOpen(true); setPendingPaymentIntent(false); }
  };

  const navigateTo = async (test: TestType) => {
     if ((test === TestType.LOGIN || test === TestType.REGISTER) && user) return; 
     const protectedRoutes = [TestType.PIQ, TestType.PPDT, TestType.TAT, TestType.WAT, TestType.SRT, TestType.SDT, TestType.INTERVIEW, TestType.AI_BOT, TestType.DAILY_PRACTICE];
     if (protectedRoutes.includes(test) && !user) { setActiveTest(TestType.LOGIN); return; }
     if (test === TestType.INTERVIEW && !isPIQComplete(piqData)) { setActiveTest(TestType.PIQ); return; }
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
  };

  const renderContent = () => {
    switch (activeTest) {
      case TestType.LOGIN: return <Login initialIsSignUp={false} onLogin={handleLogin} onCancel={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.REGISTER: return <Login initialIsSignUp={true} onLogin={handleLogin} onCancel={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.PIQ: return <PIQForm onSave={async (data: PIQData) => { if(user) { await saveUserData(user, data); setPiqData(data); setActiveTest(TestType.DASHBOARD); }}} initialData={piqData || undefined} />;
      case TestType.PPDT: return <PPDTTest onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} />;
      case TestType.TAT: return <PsychologyTest type={TestType.TAT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} />;
      case TestType.WAT: return <PsychologyTest type={TestType.WAT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} />;
      case TestType.SRT: return <PsychologyTest type={TestType.SRT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} />;
      case TestType.SDT: return <PsychologyTest type={TestType.SDT} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} userId={user || undefined} />;
      case TestType.INTERVIEW: return <Interview piqData={piqData || undefined} onSave={handleTestComplete} isAdmin={isUserAdmin(userEmail)} />;
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
      default: return <Dashboard onStartTest={navigateTo} piqLoaded={isPIQComplete(piqData)} isLoggedIn={!!user} isLoading={isLoading} user={user || ''} onOpenPayment={() => setPaymentOpen(true)} />;
    }
  };

  return (
    <Layout activeTest={activeTest} onNavigate={navigateTo} onLogout={async () => { await logoutUser(); setUser(null); setActiveTest(TestType.DASHBOARD); }} onLogin={() => setActiveTest(TestType.LOGIN)} user={userEmail || undefined} isLoggedIn={!!user} isAdmin={isUserAdmin(userEmail)}>
      {renderContent()}
      {user && <PaymentModal userId={user} isOpen={isPaymentOpen} onClose={() => setPaymentOpen(false)} onSuccess={() => {}} />}
    </Layout>
  );
};

export default App;
