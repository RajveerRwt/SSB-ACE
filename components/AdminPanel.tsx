
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Plus, Image as ImageIcon, Loader2, RefreshCw, Lock, Layers, Target, Info, AlertCircle, ExternalLink, Clipboard, Check, Database, Settings, FileText, IndianRupee, CheckCircle, XCircle, Clock, Zap, User, Search, Eye, Crown, Calendar, Tag, TrendingUp, Percent, PenTool, Megaphone, Radio, Star, MessageSquare, Mic, List, Users, Activity, BarChart3, PieChart, Filter, MailWarning, UserCheck, Brain, FileSignature, ToggleLeft, ToggleRight, ScrollText, Gauge, Coins, Wallet } from 'lucide-react';
import { 
  uploadPPDTScenario, getPPDTScenarios, deletePPDTScenario,
  uploadTATScenario, getTATScenarios, deleteTATScenario,
  uploadWATWords, getWATWords, deleteWATWord, deleteWATSet,
  getSRTQuestions, uploadSRTQuestions, deleteSRTQuestion, deleteSRTSet,
  getPendingPayments, approvePaymentRequest, rejectPaymentRequest,
  getAllUsers, deleteUserProfile, getCoupons, createCoupon, deleteCoupon,
  uploadDailyChallenge, sendAnnouncement, getAllFeedback, deleteFeedback,
  getLatestDailyChallenge, getTickerConfig, updateTickerConfig
} from '../services/supabaseService';

const AdminPanel: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [currentChallenge, setCurrentChallenge] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Inputs
  const [newDescription, setNewDescription] = useState('');
  const [setTag, setSetTag] = useState('Set 1');
  
  // WAT Inputs
  const [watBulkInput, setWatBulkInput] = useState('');
  const [watSetTag, setWatSetTag] = useState('WAT Set 1');

  // SRT Inputs
  const [srtBulkInput, setSrtBulkInput] = useState('');
  const [srtSetTag, setSrtSetTag] = useState('SRT Set 1');
  
  // Coupon Inputs
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('10');
  const [influencerName, setInfluencerName] = useState('');

  // Daily Challenge Inputs
  const [dailyWat, setDailyWat] = useState('');
  const [dailySrt, setDailySrt] = useState('');
  const [dailyInterview, setDailyInterview] = useState('');
  const [dailyOirText, setDailyOirText] = useState(''); // New OIR Text State

  // Broadcast & Ticker Inputs
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastType, setBroadcastType] = useState<'INFO' | 'WARNING' | 'SUCCESS' | 'URGENT'>('INFO');
  const [tickerMsg, setTickerMsg] = useState('');
  const [isTickerActive, setIsTickerActive] = useState(false);
  const [tickerSpeed, setTickerSpeed] = useState(25); 

  // User Management
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'ALL' | 'ACTIVE_24H' | 'UNVERIFIED'>('ALL');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Confirmation Modal State
  const [confirmAction, setConfirmAction] = useState<{
      id: string, 
      type: 'APPROVE' | 'REJECT', 
      userId: string, 
      planType: any,
      email?: string,
      fullName?: string
  } | null>(null);
  
  // SQL Help Toggle
  const [showSqlHelp, setShowSqlHelp] = useState(false);

  const [activeTab, setActiveTab] = useState<'PPDT' | 'TAT' | 'WAT' | 'SRT' | 'PAYMENTS' | 'USERS' | 'COUPONS' | 'DAILY' | 'BROADCAST' | 'FEEDBACK'>('PAYMENTS');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (activeTab === 'PAYMENTS') {
        const p = await getPendingPayments();
        setPayments(p);
      } else if (activeTab === 'USERS') {
        const u = await getAllUsers();
        setUsers(u);
      } else if (activeTab === 'COUPONS') {
        const c = await getCoupons();
        setCoupons(c);
      } else if (activeTab === 'FEEDBACK') {
        const f = await getAllFeedback();
        setFeedbackList(f);
      } else if (activeTab === 'DAILY') {
        const ch = await getLatestDailyChallenge();
        setCurrentChallenge(ch);
      } else if (activeTab === 'BROADCAST') {
        const config = await getTickerConfig();
        if (config) {
            setTickerMsg(config.message || '');
            setIsTickerActive(config.is_active || false);
            setTickerSpeed(config.speed || 25);
        }
      } else {
        let data;
        if (activeTab === 'PPDT') data = await getPPDTScenarios();
        else if (activeTab === 'TAT') data = await getTATScenarios();
        else if (activeTab === 'WAT') data = await getWATWords();
        else if (activeTab === 'SRT') data = await getSRTQuestions();
        setItems(data || []);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Failed to fetch data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const timeAgo = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleUpdateTicker = async () => {
      setIsUploading(true);
      try {
          await updateTickerConfig(tickerMsg, isTickerActive, tickerSpeed);
          alert("Ticker Updated Successfully");
      } catch (e: any) {
          setErrorMsg(e.message);
      } finally {
          setIsUploading(false);
      }
  };

  const handleUpload = async () => {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      if (activeTab === 'BROADCAST') {
          if (!broadcastMsg) throw new Error("Message cannot be empty.");
          await sendAnnouncement(broadcastMsg, broadcastType);
          setBroadcastMsg('');
          alert("Notification Sent to All Active Users.");
      } else if (activeTab === 'DAILY') {
          const file = fileInputRef.current?.files?.[0] || null;
          
          // OIR Text OR Image required (plus other fields)
          if ((!dailyOirText.trim() && !file) || !dailyWat.trim() || !dailySrt.trim() || !dailyInterview.trim()) {
              throw new Error("Please provide OIR (Text or Image), 1 WAT Word, 1 SRT Situation, and 1 Interview Question.");
          }
          
          await uploadDailyChallenge(file, dailyOirText.trim(), dailyWat.trim(), dailySrt.trim(), dailyInterview.trim());
          
          setDailyOirText('');
          setDailyWat('');
          setDailySrt('');
          setDailyInterview('');
          if (fileInputRef.current) fileInputRef.current.value = '';
          alert("Daily Challenge Published Successfully!");
          fetchData(); 
      } else if (activeTab === 'WAT') {
        const words = watBulkInput.split(/[\n,]+/).map(w => w.trim()).filter(w => w);
        if (words.length === 0) throw new Error("No words entered.");
        await uploadWATWords(words, watSetTag || 'General');
        setWatBulkInput('');
      } else if (activeTab === 'SRT') {
        const questions = srtBulkInput.split(/[\n]+/).map(q => q.trim()).filter(q => q);
        if (questions.length === 0) throw new Error("No situations entered.");
        await uploadSRTQuestions(questions, srtSetTag || 'General');
        setSrtBulkInput('');
      } else if (activeTab === 'COUPONS') {
        if (!couponCode || !couponDiscount || !influencerName) throw new Error("All fields required.");
        await createCoupon(couponCode, parseInt(couponDiscount), influencerName);
        setCouponCode('');
        setInfluencerName('');
        alert("Coupon Created!");
      } else {
        const file = fileInputRef.current?.files?.[0];
        if (!file) throw new Error("No file selected.");
        
        if (activeTab === 'PPDT') {
          await uploadPPDTScenario(file, newDescription || 'Standard PPDT Scenario');
        } else {
          await uploadTATScenario(file, newDescription || 'Standard TAT Scenario', setTag || 'Set 1');
        }
        setNewDescription('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      await fetchData();
    } catch (error: any) {
      console.error("Upload failed", error);
      setErrorMsg(error.message || "An unknown error occurred.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaymentAction = (id: string, action: 'APPROVE' | 'REJECT', userId: string, planType: any, email?: string, fullName?: string) => {
      setConfirmAction({ id, type: action, userId, planType, email, fullName });
  };

  const handleConfirmAction = async () => {
      if (!confirmAction) return;
      setIsUploading(true);
      try {
          if (confirmAction.type === 'APPROVE') {
              await approvePaymentRequest(confirmAction.id, confirmAction.userId, confirmAction.planType);
              alert("Payment Approved & Plan Activated.");
          } else {
              await rejectPaymentRequest(confirmAction.id);
              alert("Payment Rejected.");
          }
          setConfirmAction(null);
          fetchData();
      } catch (e: any) {
          setErrorMsg(e.message);
      } finally {
          setIsUploading(false);
      }
  };

  const handleDelete = async (id: string, url?: string) => {
    if (!window.confirm("Delete this item permanently?")) return;
    setErrorMsg(null);
    try {
      if (activeTab === 'WAT') await deleteWATWord(id);
      else if (activeTab === 'SRT') await deleteSRTQuestion(id);
      else if (activeTab === 'PPDT' && url) await deletePPDTScenario(id, url);
      else if (activeTab === 'TAT' && url) await deleteTATScenario(id, url);
      else if (activeTab === 'COUPONS') await deleteCoupon(id);
      else if (activeTab === 'FEEDBACK') await deleteFeedback(id);
      
      if (activeTab === 'COUPONS' || activeTab === 'FEEDBACK') fetchData();
      else setItems(items.filter(i => i.id !== id));
    } catch (error: any) {
      console.error("Delete failed", error);
      setErrorMsg(error.message || "Failed to delete item.");
      setShowSqlHelp(true);
    }
  };

  const handleDeleteSet = async (tag: string) => {
    if (!window.confirm(`WARNING: Are you sure you want to delete the entire set "${tag}"?`)) return;
    setErrorMsg(null);
    try {
      if (activeTab === 'WAT') await deleteWATSet(tag);
      if (activeTab === 'SRT') await deleteSRTSet(tag);
      await fetchData();
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to delete set.");
      setShowSqlHelp(true);
    }
  };

  const handleDeleteUser = async (userId: string) => {
      if (!window.confirm("CRITICAL: Delete User and History?")) return;
      try {
          await deleteUserProfile(userId);
          setUsers(users.filter(u => u.user_id !== userId));
      } catch (e: any) {
          setErrorMsg(e.message || "Failed to delete user.");
      }
  };

  const copySQL = (sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const groupedItems = items.reduce((acc: any, item: any) => {
      const tag = item.set_tag || 'General';
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(item);
      return acc;
  }, {});

  const userStats = {
      total: users.length,
      activeToday: users.filter(u => {
          if (!u.last_active) return false;
          const diff = Date.now() - new Date(u.last_active).getTime();
          return diff < 86400000; // 24 hours
      }).length,
      totalCoins: users.reduce((acc, u) => acc + (u.subscription_data?.coins || 0), 0),
      avgCoins: 0 
  };
  
  userStats.avgCoins = userStats.total > 0 ? Math.round(userStats.totalCoins / userStats.total) : 0;

  const filteredUsers = users.filter(u => {
      const matchesSearch = u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            u.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (userFilter === 'ACTIVE_24H') {
          if (!u.last_active) return false;
          const diff = Date.now() - new Date(u.last_active).getTime();
          return diff < 86400000;
      }
      if (userFilter === 'UNVERIFIED') {
          return !u.email_confirmed_at;
      }
      return true;
  });

  const storageSQL = `
-- Enable Storage
insert into storage.buckets (id, name, public) values ('scenarios', 'scenarios', true);
create policy "Public Access" on storage.objects for select using ( bucket_id = 'scenarios' );
create policy "Auth Upload" on storage.objects for insert with check ( bucket_id = 'scenarios' AND auth.role() = 'authenticated' );
create policy "Auth Delete" on storage.objects for delete using ( bucket_id = 'scenarios' AND auth.role() = 'authenticated' );
`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="bg-slate-900 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter flex items-center gap-4">
             <Lock className="text-red-500" /> Admin Command
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-xs mt-2">Resource Management & Deployment</p>
        </div>
        <div className="flex gap-4">
            <button onClick={() => setShowSqlHelp(!showSqlHelp)} className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all text-white flex items-center gap-2" title="Database Setup Help">
                <Database size={20} /> <span className="hidden md:inline font-bold text-xs uppercase tracking-widest">Fix Permissions</span>
            </button>
            <button onClick={fetchData} className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all text-white">
                <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
            </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-600 font-bold text-sm animate-in slide-in-from-top">
           <AlertCircle size={20} /> {errorMsg}
        </div>
      )}

      {showSqlHelp && (
          <div className="bg-slate-800 text-slate-300 p-6 rounded-2xl font-mono text-xs overflow-x-auto relative">
              <button onClick={() => copySQL(storageSQL)} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-white flex items-center gap-2">
                  <Clipboard size={12} /> {copied ? "Copied!" : "Copy SQL"}
              </button>
              <pre>{storageSQL}</pre>
          </div>
      )}

      {/* TABS */}
      <div className="flex flex-wrap justify-center md:justify-start gap-4">
         <button onClick={() => setActiveTab('PAYMENTS')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'PAYMENTS' ? 'bg-yellow-400 text-black shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><IndianRupee size={16} /> Payments {payments.length > 0 && `(${payments.length})`}</button>
         <button onClick={() => setActiveTab('USERS')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'USERS' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><User size={16} /> Cadets</button>
         <button onClick={() => setActiveTab('PPDT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'PPDT' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><ImageIcon size={16} /> PPDT</button>
         <button onClick={() => setActiveTab('TAT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'TAT' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Layers size={16} /> TAT</button>
         <button onClick={() => setActiveTab('WAT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'WAT' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Zap size={16} /> WAT</button>
         <button onClick={() => setActiveTab('SRT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'SRT' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Brain size={16} /> SRT</button>
         <button onClick={() => setActiveTab('DAILY')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'DAILY' ? 'bg-teal-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Clock size={16} /> Daily Challenge</button>
         <button onClick={() => setActiveTab('COUPONS')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'COUPONS' ? 'bg-pink-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Tag size={16} /> Coupons</button>
         <button onClick={() => setActiveTab('BROADCAST')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'BROADCAST' ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Megaphone size={16} /> Broadcast</button>
         <button onClick={() => setActiveTab('FEEDBACK')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'FEEDBACK' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><MessageSquare size={16} /> Feedback</button>
      </div>

      {/* CONTENT AREA */}
      {(activeTab === 'PPDT' || activeTab === 'TAT') && (
        <div className="grid md:grid-cols-2 gap-8 animate-in fade-in">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 h-fit">
              <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><Upload size={24} className="text-blue-600"/> Upload Scenario</h3>
              <div className="space-y-4">
                 <div className="p-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => fileInputRef.current?.click()}>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform"><ImageIcon className="text-slate-400" /></div>
                    <p className="text-slate-500 font-bold text-sm">Click to Select Image</p>
                 </div>
                 <input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Scenario Description / Context" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                 {activeTab === 'TAT' && (
                     <input value={setTag} onChange={e => setSetTag(e.target.value)} placeholder="Set Tag (e.g. Set 1, Hard, 11SSB)" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                 )}
                 <button onClick={handleUpload} disabled={isUploading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
                    {isUploading ? <Loader2 className="animate-spin" /> : <Plus size={16} />} Upload to Database
                 </button>
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-4">Active Database ({items.length})</h3>
              <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                 {items.map((item: any) => (
                    <div key={item.id} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                       <img src={item.image_url} alt="Scenario" className="w-24 h-24 object-cover rounded-xl bg-slate-50" />
                       <div className="flex-1 flex flex-col justify-between">
                          <div>
                             <p className="text-xs font-bold text-slate-800 line-clamp-2">{item.description}</p>
                             {item.set_tag && <span className="inline-block mt-2 px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase">{item.set_tag}</span>}
                          </div>
                          <button onClick={() => handleDelete(item.id, item.image_url)} className="self-end text-red-400 hover:text-red-600 p-2"><Trash2 size={16} /></button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* DAILY CHALLENGE */}
      {activeTab === 'DAILY' && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in">
              <div className="space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                      <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><Clock size={24} className="text-teal-600"/> Update Daily Challenge</h3>
                      <div className="space-y-4">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">1. OIR Question (Upload Image OR Text OR Both)</p>
                          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 text-slate-400 font-bold uppercase text-xs hover:text-teal-600 transition-colors">
                                  <ImageIcon size={16} /> {fileInputRef.current?.files?.[0] ? 'Image Selected' : 'Select OIR Image'}
                              </button>
                          </div>
                          <input value={dailyOirText} onChange={e => setDailyOirText(e.target.value)} placeholder="OIR Question Text (e.g. Find the odd one out...)" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                          
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-2">2. Psychology & Interview</p>
                          <input value={dailyWat} onChange={e => setDailyWat(e.target.value)} placeholder="WAT Word of the Day" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                          <input value={dailySrt} onChange={e => setDailySrt(e.target.value)} placeholder="SRT Situation of the Day" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                          <input value={dailyInterview} onChange={e => setDailyInterview(e.target.value)} placeholder="Interview Question" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                          
                          <button onClick={handleUpload} disabled={isUploading} className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-teal-700 transition-all flex items-center justify-center gap-2">
                              {isUploading ? <Loader2 className="animate-spin" /> : <RefreshCw size={16} />} Publish Challenge
                          </button>
                      </div>
                  </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 h-fit">
                  <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-widest">Current Live Challenge</h3>
                  {currentChallenge ? (
                      <div className="space-y-4">
                          <p className="text-xs font-bold text-slate-500"><strong className="text-slate-900">OIR Question:</strong></p>
                          {currentChallenge.ppdt_image_url && <img src={currentChallenge.ppdt_image_url} alt="Daily OIR" className="w-full h-40 object-contain bg-slate-50 rounded-2xl" />}
                          {currentChallenge.oir_text && <p className="text-sm font-medium text-slate-800 bg-slate-50 p-2 rounded-lg">{currentChallenge.oir_text}</p>}
                          
                          <div className="space-y-2 pt-2">
                              <p className="text-xs font-bold text-slate-500"><strong className="text-slate-900">WAT:</strong> {currentChallenge.wat_words?.[0]}</p>
                              <p className="text-xs font-bold text-slate-500"><strong className="text-slate-900">SRT:</strong> {currentChallenge.srt_situations?.[0]}</p>
                              <p className="text-xs font-bold text-slate-500"><strong className="text-slate-900">IO:</strong> {currentChallenge.interview_question}</p>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">Posted: {new Date(currentChallenge.created_at).toLocaleString()}</p>
                      </div>
                  ) : (
                      <p className="text-slate-400 font-bold text-sm italic">No active challenge found.</p>
                  )}
              </div>
          </div>
      )}

      {/* WAT / SRT Manager */}
      {(activeTab === 'WAT' || activeTab === 'SRT') && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in">
              <div className="space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                      <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><Database size={24} className="text-blue-600"/> Bulk Upload {activeTab}</h3>
                      <div className="space-y-4">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Input Data (One per line)</p>
                          <textarea 
                              value={activeTab === 'WAT' ? watBulkInput : srtBulkInput} 
                              onChange={e => activeTab === 'WAT' ? setWatBulkInput(e.target.value) : setSrtBulkInput(e.target.value)} 
                              placeholder={activeTab === 'WAT' ? "Blood\nArmy\nWar..." : "He was alone at night when...\nHis captain was injured during..."}
                              className="w-full h-40 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm resize-none" 
                          />
                          <input 
                              value={activeTab === 'WAT' ? watSetTag : srtSetTag} 
                              onChange={e => activeTab === 'WAT' ? setWatSetTag(e.target.value) : setSrtSetTag(e.target.value)} 
                              placeholder="Set Name (e.g. WAT Set 1, 19SSB)" 
                              className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" 
                          />
                          <button onClick={handleUpload} disabled={isUploading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
                              {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={16} />} Batch Upload
                          </button>
                      </div>
                  </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 h-fit max-h-[600px] overflow-y-auto custom-scrollbar">
                  <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-widest">Existing Sets</h3>
                  {Object.keys(groupedItems).length === 0 ? <p className="text-slate-400 text-sm">No items found.</p> : Object.keys(groupedItems).map(tag => (
                      <div key={tag} className="mb-6">
                          <div className="flex justify-between items-center mb-2">
                              <h4 className="font-bold text-blue-600 uppercase text-xs tracking-widest">{tag} ({groupedItems[tag].length})</h4>
                              <button onClick={() => handleDeleteSet(tag)} className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest">Delete Set</button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                              {groupedItems[tag].map((item: any) => (
                                  <div key={item.id} className="bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-2 group">
                                      {item.word || item.question}
                                      <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><XCircle size={12} /></button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* PAYMENTS TAB */}
      {activeTab === 'PAYMENTS' && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 animate-in fade-in">
              <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><IndianRupee size={24} className="text-yellow-500"/> Verification Queue</h3>
              {payments.length === 0 ? <p className="text-slate-400 text-sm italic">No pending payments.</p> : (
                  <div className="space-y-4">
                      {payments.map(p => (
                          <div key={p.id} className="flex flex-col md:flex-row justify-between items-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                              <div>
                                  <p className="font-black text-slate-900 text-lg">₹{p.amount} <span className="text-xs text-slate-500 font-bold uppercase tracking-widest ml-2">{p.plan_type}</span></p>
                                  <p className="text-xs text-slate-500 font-mono mt-1">UTR: {p.utr}</p>
                                  <p className="text-xs text-slate-400 mt-1">{p.aspirants?.email} • {new Date(p.created_at).toLocaleString()}</p>
                              </div>
                              <div className="flex gap-4 mt-4 md:mt-0">
                                  <button onClick={() => handlePaymentAction(p.id, 'APPROVE', p.user_id, p.plan_type, p.aspirants?.email, p.aspirants?.full_name)} className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-600 transition-colors shadow-lg">Approve</button>
                                  <button onClick={() => handlePaymentAction(p.id, 'REJECT', p.user_id, p.plan_type)} className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg">Reject</button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {activeTab === 'USERS' && (
          <div className="space-y-8">
              {/* COIN ECONOMY STATS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-32">
                      <div className="flex justify-between items-start">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><User size={20} /></div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Cadets</span>
                      </div>
                      <div className="text-3xl font-black text-slate-900">{userStats.total}</div>
                  </div>
                  {/* ... other stats ... */}
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-32">
                      <div className="flex justify-between items-start">
                          <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Wallet size={20} /></div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Avg Wallet</span>
                      </div>
                      <div className="text-3xl font-black text-slate-900">{userStats.avgCoins}</div>
                  </div>
              </div>
              
              {/* User List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredUsers.map(u => (
                      <div key={u.user_id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col justify-between group hover:border-slate-300 transition-all relative overflow-hidden">
                          <button onClick={() => handleDeleteUser(u.user_id)} className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"><Trash2 size={16} /></button>
                          <div className="space-y-4 mb-6 pt-4">
                              <div className="flex justify-between items-start">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${u.subscription_data?.tier === 'PRO' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 text-slate-500'}`}>
                                      {u.subscription_data?.tier === 'PRO' ? <Crown size={24} /> : <User size={24} />}
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                      <div className="px-3 py-1 bg-yellow-400 text-black rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                          <IndianRupee size={10} /> {u.subscription_data?.coins || 0} Coins
                                      </div>
                                      <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                          <Clock size={10} /> Active: {timeAgo(u.last_active)}
                                      </p>
                                  </div>
                              </div>
                              <div>
                                  <h4 className="text-lg font-black text-slate-900 truncate">{u.full_name || u.email?.split('@')[0] || 'Unknown Cadet'}</h4>
                                  <p className="text-xs font-medium text-slate-500 truncate">{u.email}</p>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* FEEDBACK TAB */}
      {activeTab === 'FEEDBACK' && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 animate-in fade-in">
              <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={24} className="text-blue-600"/> User Feedback</h3>
              {feedbackList.length === 0 ? <p className="text-slate-400 text-sm italic">No feedback received yet.</p> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {feedbackList.map(f => (
                          <div key={f.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative group hover:bg-white hover:shadow-md transition-all">
                              <button onClick={() => handleDelete(f.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><XCircle size={16} /></button>
                              <div className="flex items-center gap-3 mb-3">
                                  <div className="bg-yellow-400 text-black px-2 py-1 rounded text-[10px] font-black flex items-center gap-1"><Star size={10} fill="black" /> {f.rating}</div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{f.test_type}</span>
                              </div>
                              <p className="text-sm font-medium text-slate-800 italic mb-4">"{f.comments}"</p>
                              <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                                  <span className="text-xs font-bold text-slate-600">{f.aspirants?.full_name || 'Anonymous'}</span>
                                  <span className="text-[10px] text-slate-400">{new Date(f.created_at).toLocaleDateString()}</span>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmAction && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
                  <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Confirm Action</h3>
                  <p className="text-sm text-slate-600 mb-6">
                      Are you sure you want to <strong>{confirmAction.type}</strong> this payment for {confirmAction.email}?
                  </p>
                  <div className="flex gap-4">
                      <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200">Cancel</button>
                      <button onClick={handleConfirmAction} className={`flex-1 py-3 text-white rounded-xl font-bold text-xs uppercase tracking-widest ${confirmAction.type === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                          {isUploading ? <Loader2 className="animate-spin mx-auto" /> : 'Confirm'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
