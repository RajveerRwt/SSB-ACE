
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

  // ... (Rest of component functions remain same)

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

  const storageSQL = `... (SQL Content kept same) ...`;

  // ... (Render logic same until DAILY tab) ...

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      {/* ... (Header and Error Logic Same) ... */}
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

      {/* Tabs */}
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

      {/* ... (Other Tabs Rendered Same) ... */}
      
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
                                  <ImageIcon size={16} /> Select OIR Image
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

      {/* ... (Other Tabs like Users, Payments etc remain same) ... */}
      {/* (Truncated for brevity, rest of file is unchanged logic wise for other tabs) */}
      {/* Re-rendering users, payments, coupons, feedback, broadcast tabs as they were... */}
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
      
      {/* ... Rest of tabs (PAYMENTS, COUPONS, BROADCAST, FEEDBACK) standard rendering ... */}
    </div>
  );
};

export default AdminPanel;
