
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
import { ShieldCheck, CheckCircle, Lock, Quote, Zap, Star, Shield, Flag, ChevronRight, LogIn, Loader2, History, Crown, Clock, AlertCircle, Phone, UserPlus, Percent, Tag, ArrowUpRight, Trophy, Medal } from 'lucide-react';
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
      getUserSubscription(user).then(sub => setSubscription(sub));
      
      const fetchStatus = () => {
         getLatestPaymentRequest(user).then(status => setPaymentStatus(status));
      };
      
      // Initial fetch
      fetchStatus();

      // Poll for updates if pending (auto-refresh pro status)
      const interval = setInterval(() => {
          fetchStatus();
          // Also refresh subscription to catch approval
          getUserSubscription(user).then(sub => setSubscription(sub));
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

      {/* DISCOUNT OFFER BANNER - Only show if not PRO */}
      {(!subscription || subscription.tier === 'FREE') && (
         <div 
            onClick={onOpenPayment}
            className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-[2rem] p-6 text-white shadow-xl cursor-pointer hover:scale-[1.01] transition-transform relative overflow-hidden group border-4 border-white/10"
         >
            <div className="absolute -right-4 -top-4 opacity-10 rotate-12 group-hover:opacity-20 transition-opacity">
                <Percent size={120} />
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner border border-white/20">
                        <Tag size={28} className="text-yellow-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="bg-yellow-400 text-black px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm">Limited Time</span>
                            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">New Cadets</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-none">Flat 50% OFF <span className="text-indigo-200">Pro Plan</span></h3>
                        <p className="text-xs font-medium text-indigo-100 mt-1">Get 5 AI Interviews + Full Access for just <span className="text-white font-black text-sm">₹99</span> <span className="line-through opacity-60">₹199</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-white/10 px-5 py-3 rounded-2xl border border-white/20 backdrop-blur-sm group-hover:bg-white/15 transition-all">
                    <div className="text-center border-r border-white/20 pr-4">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-200">Coupon Code</p>
                        <p className="text-xl font-black text-yellow-400 tracking-widest font-mono">SSB50</p>
                    </div>
                    <button className="text-[10px] font-black uppercase tracking-widest bg-white text-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors">
                        Claim Now
                    </button>
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
                     : 'bg-slate-800 text-slate-500 border border-white/5 hover:border-red-500/50 hover:text-red-400'
                   }`}
                   disabled={isLoading}
                 >
                   {isLoading ? <Loader2 className="animate-spin" size={14}/> : !piqLoaded && <Lock size={14} />}
                   {isLoading ? 'Syncing...' : (
                       <div className="flex flex-col items-center leading-tight">
                           <span>{piqLoaded ? 'Commence Personal Interview' : 'Unlock Interview (Fill PIQ)'}</span>
                           {piqLoaded && <span className="text-[8px] opacity-70 font-bold normal-case tracking-wide">with Col. Arjun Singh (Virtual IO)</span>}
                       </div>
                   )}
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
               <div className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <button 
                        onClick={() => onStartTest(TestType.LOGIN)}
                        className="flex-1 md:flex-none px-8 md:px-10 py-5 bg-white/5 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3 backdrop-blur-sm"
                    >
                        <LogIn size={18} /> Login
                    </button>
                    
                    <button 
                        onClick={() => onStartTest(TestType.REGISTER)}
                        className="flex-1 md:flex-none px-8 md:px-10 py-5 bg-yellow-400 text-black rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-yellow-400/20 hover:bg-yellow-300 hover:scale-105 transition-all flex items-center justify-center gap-3"
                    >
                        <UserPlus size={18} /> New User Registration
                    </button>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Sign up to access AI Interview & Psychology Tests</p>
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
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
                        <div className="space-y-1 border-r border-white/5 pr-2">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Interview</p>
                            <p className="text-sm md:text-base font-black text-white">{subscription.usage.interview_used} <span className="text-slate-600 text-[10px]">/ {subscription.usage.interview_limit + subscription.extra_credits.interview}</span></p>
                        </div>
                        <div className="space-y-1 border-r border-white/5 px-2">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">PPDT</p>
                            <p className="text-sm md:text-base font-black text-white">{subscription.usage.ppdt_used} <span className="text-slate-600 text-[10px]">/ {subscription.usage.ppdt_limit}</span></p>
                        </div>
                        <div className="space-y-1 border-r border-white/5 px-2">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">TAT</p>
                            <p className="text-sm md:text-base font-black text-white">{subscription.usage.tat_used} <span className="text-slate-600 text-[10px]">/ {subscription.usage.tat_limit}</span></p>
                        </div>
                        <div className="space-y-1 border-r border-white/5 px-2">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">WAT</p>
                            <p className="text-sm md:text-base font-black text-white">{subscription.usage.wat_used} <span className="text-slate-600 text-[10px]">/ {subscription.usage.wat_limit}</span></p>
                        </div>
                        <div className="space-y-1 pl-2">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">SRT</p>
                            <p className="text-sm md:text-base font-black text-white">{subscription.usage.srt_used} <span className="text-slate-600 text-[10px]">/ {subscription.usage.srt_limit}</span></p>
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

      {/* PLAN COMPARISON SLOT - Visible to Guest & Free Users */}
      {(!isLoggedIn || (subscription && subscription.tier === 'FREE')) && (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-8">
              <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 text-center">
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Choose Your Armour</h3>
                 <p className="text-slate-500 font-medium text-xs mt-2">Compare features and decide your preparation strategy.</p>
              </div>
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                 {/* Free Plan Column */}
                 <div className="space-y-6">
                    <div className="flex justify-between items-center mb-2">
                       <h4 className="font-black text-slate-700 uppercase tracking-widest text-lg">Cadet (Free)</h4>
                       <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase">Basic</span>
                    </div>
                    <ul className="space-y-4 text-xs font-bold text-slate-500">
                       <li className="flex items-center gap-3"><CheckCircle size={16} className="text-slate-300"/> 1 AI Personal Interview</li>
                       <li className="flex items-center gap-3"><CheckCircle size={16} className="text-slate-300"/> 10 PPDT Scenarios</li>
                       <li className="flex items-center gap-3"><CheckCircle size={16} className="text-slate-300"/> 2 TAT Sets</li>
                       <li className="flex items-center gap-3"><CheckCircle size={16} className="text-slate-300"/> 3 SRT & 3 WAT Sets</li>
                       <li className="flex items-center gap-3"><CheckCircle size={16} className="text-green-500"/> Daily News & Practice</li>
                       <li className="flex items-center gap-3"><CheckCircle size={16} className="text-green-500"/> AI Guide (Major Veer)</li>
                    </ul>
                 </div>

                 {/* Divider for mobile/desktop */}
                 <div className="hidden md:block absolute top-8 bottom-8 left-1/2 w-px bg-slate-100 -translate-x-1/2"></div>

                 {/* Pro Plan Column */}
                 <div className="space-y-6 relative">
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[9px] font-black px-3 py-1 rounded-bl-xl shadow-sm uppercase tracking-widest">Recommended</div>
                    <div className="flex justify-between items-center mb-2">
                       <h4 className="font-black text-blue-600 uppercase tracking-widest text-lg">Officer (Pro)</h4>
                       <span className="text-2xl font-black text-slate-900">₹199</span>
                    </div>
                    <ul className="space-y-4 text-xs font-bold text-slate-700">
                       <li className="flex items-center gap-3"><Zap size={16} className="text-blue-600"/> 5 AI Personal Interviews</li>
                       <li className="flex items-center gap-3"><Zap size={16} className="text-blue-600"/> 30 PPDT Scenarios</li>
                       <li className="flex items-center gap-3"><Zap size={16} className="text-blue-600"/> 7 TAT Sets</li>
                       <li className="flex items-center gap-3"><Zap size={16} className="text-blue-600"/> 10 SRT & 10 WAT Sets</li>
                       <li className="flex items-center gap-3"><Star size={16} className="text-yellow-500"/> Detailed & Personalized Assessment</li>
                    </ul>
                    <button onClick={onOpenPayment} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-lg mt-2 flex items-center justify-center gap-2 group">
                       Upgrade Now <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"/>
                    </button>
                 </div>
              </div>
          </div>
      )}

      {/* DASHBOARD CONTENT GRID */}
      <div className="space-y-6 md:space-y-10">
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
           
           {/* HALL OF FAME */}
           <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600"><Trophy size={20} /></div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Hall of Fame</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recommended Candidates</p>
                 </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                 {[
                    { name: 'Lt. Adarsh Kumar', rank: 'AIR 4 (NDA)', msg: "The AI interview was brutal but exactly like the real SSB. Helped me conquer my fear." },
                    { name: 'Fg Offr. Sneha Gill', rank: 'AIR 12 (AFCAT)', msg: "PPDT practice here is the best. The AI gives instant feedback on story relevance." },
                    { name: 'Capt. R. Shekhawat', rank: 'Recommended (TES)', msg: "Used the Pro plan for 1 month. The pattern familiarity gave me the edge." }
                 ].map((t, i) => (
                    <div key={i} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 relative group hover:border-slate-200 transition-colors">
                       <Quote className="absolute top-4 right-4 text-slate-200 group-hover:text-yellow-400 transition-colors" size={24} />
                       <p className="text-xs font-medium text-slate-600 italic mb-4 leading-relaxed">"{t.msg}"</p>
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-black">{t.name[0]}</div>
                          <div>
                             <p className="text-xs font-black text-slate-900 uppercase">{t.name}</p>
                             <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1"><Medal size={10} /> {t.rank}</p>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
      </div>

      {/* SUPPORT & HELP SECTION */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-bottom-8">
         <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 shrink-0">
               <AlertCircle size={28} />
            </div>
            <div>
               <h4 className="font-black text-slate-900 uppercase text-sm tracking-widest">Encountered an Error?</h4>
               <p className="text-slate-500 text-xs font-medium mt-1 max-w-md leading-relaxed">
                  If you are facing technical issues with the AI Interview, Payment, or Login, please report it immediately to our technical officer.
               </p>
               <div className="flex items-center gap-3 mt-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Helpline:</span>
                  <a href="tel:+919131112322" className="text-xs font-black text-slate-900 hover:text-blue-600 transition-colors bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2">
                    <Phone size={12} className="text-slate-500" /> +91 9131112322
                  </a>
               </div>
            </div>
         </div>
         <button 
            onClick={() => onStartTest(TestType.CONTACT)}
            className="w-full md:w-auto px-8 py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
         >
            Contact Support
         </button>
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

  // Helper to check validity of PIQ
  const isPIQComplete = (data: PIQData | null) => {
      if (!data) return false;
      // Basic check: Name and Chest No must be present to be considered "filled"
      return !!(data.name && data.name.trim().length > 0 && data.chestNo && data.chestNo.trim().length > 0);
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
    getUserData(uid).then((d: PIQData | null) => d && setPiqData(d));
    
    // Redirect Flow Handling
    setActiveTest(TestType.DASHBOARD);
    if (pendingPaymentIntent) {
        setPaymentOpen(true);
        setPendingPaymentIntent(false);
    }
  };

  const handleLogoutAction = async () => {
    await logoutUser();
    setUser(null);
    setUserEmail(null);
    setActiveTest(TestType.DASHBOARD);
  };

  const navigateTo = async (test: TestType) => {
     // 1. Prevent Login page if already logged in
     if ((test === TestType.LOGIN || test === TestType.REGISTER) && user) return; 
     
     // 2. PROTECTED ROUTES CHECK
     const protectedRoutes = [
        TestType.PIQ,
        TestType.PPDT,
        TestType.TAT,
        TestType.WAT,
        TestType.SRT,
        TestType.SDT,
        TestType.INTERVIEW,
        TestType.AI_BOT,
        TestType.DAILY_PRACTICE
     ];

     if (protectedRoutes.includes(test) && !user) {
        alert("Restricted Area. Please Login to access training simulations.");
        setActiveTest(TestType.LOGIN);
        return;
     }

     // 3. PIQ CHECK (Gatekeeper for Interview)
     // Prevent starting interview if PIQ data is missing or incomplete
     if (test === TestType.INTERVIEW) {
        if (!isPIQComplete(piqData)) {
            alert("Clearance Denied: PIQ Form Incomplete.\n\nThe Interviewing Officer requires your Personal Information Questionnaire (Name, Chest No, etc.) to conduct the assessment. Please fill it first.");
            setActiveTest(TestType.PIQ);
            return;
        }
     }

     // 4. SUBSCRIPTION LIMIT CHECK (Only if logged in)
     // PPDT is excluded here because it handles its own limit check to allow free custom mode
     if ((test === TestType.INTERVIEW || test === TestType.TAT) && user) {
        const { allowed, message } = await checkLimit(user, test);
        if (!allowed) {
            alert(message);
            setPaymentOpen(true);
            return;
        }
     }
     
     // 5. ADMIN CHECK
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
      
      // Increment Usage (Limits) - ONLY if it's not a custom free attempt
      if (!result.isCustomAttempt) {
          await incrementUsage(user, typeStr);
      }
  };

  const handleOpenPayment = () => {
    if (user) {
      setPaymentOpen(true);
    } else {
      setPendingPaymentIntent(true);
      setActiveTest(TestType.LOGIN);
    }
  };

  const renderContent = () => {
    switch (activeTest) {
      case TestType.LOGIN:
        return <Login initialIsSignUp={false} onLogin={handleLogin} onCancel={() => {
            setPendingPaymentIntent(false); 
            setActiveTest(TestType.DASHBOARD);
        }} />;
      case TestType.REGISTER:
        return <Login initialIsSignUp={true} onLogin={handleLogin} onCancel={() => {
            setPendingPaymentIntent(false); 
            setActiveTest(TestType.DASHBOARD);
        }} />;
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
            piqLoaded={isPIQComplete(piqData)} 
            isLoggedIn={!!user} 
            isLoading={isLoading} 
            user={user || ''}
            onOpenPayment={handleOpenPayment}
        />;
      case TestType.TERMS:
      case TestType.PRIVACY:
      case TestType.REFUND:
        return <LegalPages type={activeTest} onBack={() => setActiveTest(TestType.DASHBOARD)} />;
      case TestType.GUIDE:
        return <HowToUse onNavigate={setActiveTest} />;
      case TestType.CURRENT_AFFAIRS:
        return <CurrentAffairs />;
      case TestType.DAILY_PRACTICE:
        return <DailyPractice />;
      default:
        return <Dashboard 
            onStartTest={navigateTo} 
            piqLoaded={isPIQComplete(piqData)} 
            isLoggedIn={!!user} 
            isLoading={isLoading} 
            user={user || ''}
            onOpenPayment={handleOpenPayment}
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
