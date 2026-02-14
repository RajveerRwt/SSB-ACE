
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
  const [dailyOirText, setDailyOirText] = useState('');
  const [dailyWat, setDailyWat] = useState('');
  const [dailySrt, setDailySrt] = useState('');
  const [dailyInterview, setDailyInterview] = useState('');

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
        // Fetch ticker config when Broadcast tab is active
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
          
          if ((!file && !dailyOirText.trim()) || !dailyWat.trim() || !dailySrt.trim() || !dailyInterview.trim()) {
              throw new Error("Please provide OIR Question (Image/Text), 1 WAT, 1 SRT, and 1 Interview Question.");
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

  const executeConfirmAction = async () => {
      if (!confirmAction) return;
      const { id, type, userId, planType, email, fullName } = confirmAction;
      setConfirmAction(null); 
      try {
          if (type === 'APPROVE') {
              await approvePaymentRequest(id, userId, planType);
          } else {
              await rejectPaymentRequest(id);
          }
          await fetchData(); 
      } catch(e: any) {
          setErrorMsg(e.message || "Action failed. Check Console/RLS Policies.");
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

  // Calculate User Stats
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
-- 13. OIR SUPPORT IN DAILY CHALLENGES
alter table public.daily_challenges add column if not exists oir_text text;

-- Existing Tables (for reference)
-- create table if not exists public.daily_challenges (
--   id uuid default uuid_generate_v4() primary key,
--   ppdt_image_url text, -- Used for OIR Image now
--   wat_words text[],
--   srt_situations text[],
--   interview_question text,
--   oir_text text, -- NEW
--   created_at timestamptz default now()
-- );
`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
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

      {(errorMsg || showSqlHelp) && (
        <div className={`p-6 rounded-[2.5rem] space-y-6 animate-in slide-in-from-top-4 shadow-xl ${errorMsg ? 'bg-red-50 border-2 border-red-100' : 'bg-blue-50 border-2 border-blue-100'}`}>
          {errorMsg && (
              <div className="flex items-start gap-4 text-red-600">
                <AlertCircle size={28} className="shrink-0 mt-1" />
                <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1">System Alert</p>
                <p className="text-sm font-bold leading-relaxed">{errorMsg}</p>
                </div>
                <button onClick={() => setErrorMsg(null)} className="text-xs font-black uppercase p-2 hover:bg-red-100 rounded-lg">Dismiss</button>
              </div>
          )}
          
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-900">
                    <Settings className="text-blue-600" size={24} />
                    <h5 className="text-sm font-black uppercase tracking-widest">Database Initialization Script (v5.9 - OIR Support)</h5>
                </div>
                {showSqlHelp && !errorMsg && (
                    <button onClick={() => setShowSqlHelp(false)} className="text-slate-400 hover:text-slate-900"><XCircle size={20} /></button>
                )}
            </div>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-xl">
                <p className="text-xs text-yellow-800 font-bold">
                    <strong>Instructions:</strong> Run this script to add 'oir_text' column to 'daily_challenges'.
                </p>
            </div>

            <div className="relative group">
              <pre className="bg-slate-900 text-blue-300 p-6 rounded-2xl text-[10px] font-mono overflow-x-auto border-2 border-slate-800 leading-relaxed shadow-inner max-h-[300px]">
                {storageSQL}
              </pre>
              <button 
                onClick={() => copySQL(storageSQL)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase backdrop-blur-md"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Clipboard size={14} />}
                {copied ? 'Copied' : 'Copy SQL'}
              </button>
            </div>

            <div className="flex gap-4">
              <a 
                href="https://supabase.com/dashboard/project/_/sql" 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
              >
                <Database size={14} /> Open SQL Editor <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* FULL NAVIGATION TABS RESTORED */}
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

      {/* USERS TAB - UPDATED TO SHOW COINS */}
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
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-32">
                      <div className="flex justify-between items-start">
                          <div className="p-2 bg-green-50 text-green-600 rounded-xl"><Activity size={20} /></div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Today</span>
                      </div>
                      <div className="text-3xl font-black text-slate-900">{userStats.activeToday}</div>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-32">
                      <div className="flex justify-between items-start">
                          <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl"><Coins size={20} /></div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Economy Size</span>
                      </div>
                      <div className="text-3xl font-black text-slate-900">{userStats.totalCoins}</div>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-32">
                      <div className="flex justify-between items-start">
                          <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Wallet size={20} /></div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Avg Wallet</span>
                      </div>
                      <div className="text-3xl font-black text-slate-900">{userStats.avgCoins}</div>
                  </div>
              </div>

              {/* SEARCH & FILTERS */}
              <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                  <div className="relative w-full md:w-auto flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                          type="text" 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search Cadet by Name or Email..." 
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border-none outline-none font-bold text-sm text-slate-700 focus:ring-2 focus:ring-slate-200 transition-all"
                      />
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                      <button onClick={() => setUserFilter('ALL')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex-1 md:flex-none ${userFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>All</button>
                      <button onClick={() => setUserFilter('ACTIVE_24H')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex-1 md:flex-none ${userFilter === 'ACTIVE_24H' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Active 24H</button>
                      <button onClick={() => setUserFilter('UNVERIFIED')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex-1 md:flex-none ${userFilter === 'UNVERIFIED' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'}`}>Unverified</button>
                  </div>
              </div>

              {/* USER LIST GRID */}
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
                              <div className="grid grid-cols-3 gap-2 pt-2">
                                  <div className="text-center p-2 bg-slate-50 rounded-xl">
                                      <span className="block text-[10px] font-black text-slate-400 uppercase">IO</span>
                                      <span className="font-black text-slate-800">{u.subscription_data?.usage?.interview_used || 0}</span>
                                  </div>
                                  <div className="text-center p-2 bg-slate-50 rounded-xl">
                                      <span className="block text-[10px] font-black text-slate-400 uppercase">PPDT</span>
                                      <span className="font-black text-slate-800">{u.subscription_data?.usage?.ppdt_used || 0}</span>
                                  </div>
                                  <div className="text-center p-2 bg-slate-50 rounded-xl">
                                      <span className="block text-[10px] font-black text-slate-400 uppercase">TAT</span>
                                      <span className="font-black text-slate-800">{u.subscription_data?.usage?.tat_used || 0}</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
      
      {/* PAYMENTS TAB */}
      {activeTab === 'PAYMENTS' && (
          <div className="space-y-6">
              {payments.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-xl">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-black text-slate-900 uppercase">All Clear</h3>
                      <p className="text-slate-500 text-xs font-bold mt-2">No pending approvals.</p>
                  </div>
              ) : (
                  payments.map(req => (
                      <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-2">
                          <div className="flex items-center gap-6 w-full md:w-auto">
                              <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center shrink-0">
                                  <IndianRupee size={24} />
                              </div>
                              <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{new Date(req.created_at).toLocaleString()}</p>
                                  <h4 className="font-bold text-slate-900 text-lg">UTR: <span className="font-mono bg-slate-100 px-2 rounded">{req.utr}</span></h4>
                                  <p className="text-xs font-medium text-slate-600">
                                      {req.aspirants?.full_name || 'Unknown User'} • {req.plan_type.replace(/_/g, ' ')} • ₹{req.amount}
                                  </p>
                              </div>
                          </div>
                          <div className="flex gap-4 w-full md:w-auto">
                              <button 
                                onClick={() => handlePaymentAction(req.id, 'REJECT', req.user_id, req.plan_type)}
                                className="flex-1 md:flex-none px-6 py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                              >
                                  <XCircle size={16} /> Reject
                              </button>
                              <button 
                                onClick={() => handlePaymentAction(req.id, 'APPROVE', req.user_id, req.plan_type, req.aspirants?.email, req.aspirants?.full_name)}
                                className="flex-1 md:flex-none px-6 py-3 bg-green-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
                              >
                                  <CheckCircle size={16} /> Approve
                              </button>
                          </div>
                      </div>
                  ))
              )}
          </div>
      )}

      {/* DAILY CHALLENGE */}
      {activeTab === 'DAILY' && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in">
              <div className="space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                      <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><Clock size={24} className="text-teal-600"/> Update Daily Challenge</h3>
                      <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">1. OIR Question (Image or Text)</label>
                          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 text-slate-400 font-bold uppercase text-xs hover:text-teal-600 transition-colors mb-2">
                                  <ImageIcon size={16} /> Select OIR Image
                              </button>
                              <input 
                                value={dailyOirText} 
                                onChange={e => setDailyOirText(e.target.value)} 
                                placeholder="OR Type OIR Question Text here..." 
                                className="w-full p-2 bg-white rounded-xl border border-slate-200 outline-none font-medium text-xs" 
                              />
                          </div>
                          
                          <input value={dailyWat} onChange={e => setDailyWat(e.target.value)} placeholder="2. WAT Word" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                          <input value={dailySrt} onChange={e => setDailySrt(e.target.value)} placeholder="3. SRT Situation" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                          <input value={dailyInterview} onChange={e => setDailyInterview(e.target.value)} placeholder="4. Interview Question" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
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
                          <div className="bg-slate-50 p-4 rounded-2xl">
                              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">OIR Question</p>
                              {currentChallenge.ppdt_image_url && <img src={currentChallenge.ppdt_image_url} alt="Daily OIR" className="w-full h-32 object-contain rounded-xl bg-white border border-slate-200 mb-2" />}
                              {currentChallenge.oir_text && <p className="text-sm font-bold text-slate-800">{currentChallenge.oir_text}</p>}
                          </div>
                          <div className="space-y-2">
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

      {/* PPDT Tab (Keeping existing structure for normal PPDT scenario management) */}
      {activeTab === 'PPDT' && (
          <div className="space-y-8 animate-in fade-in">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><Upload size={24} className="text-blue-600"/> Upload New Scenario</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={() => setNewDescription('')} />
                          <button onClick={() => fileInputRef.current?.click()} className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all gap-2">
                              <ImageIcon size={32} /> <span className="text-xs font-black uppercase tracking-widest">Select Image</span>
                          </button>
                      </div>
                      <div className="space-y-4">
                          <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Scenario Description (Optional)..." className="w-full h-40 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm text-slate-700 resize-none focus:ring-2 focus:ring-slate-200" />
                          <button onClick={handleUpload} disabled={isUploading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
                              {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={16} />} Upload to Cloud
                          </button>
                      </div>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {items.map((item) => (
                      <div key={item.id} className="group relative bg-white p-4 rounded-[2rem] shadow-lg border border-slate-100 hover:shadow-xl transition-all">
                          <img src={item.image_url} alt="Scenario" className="w-full h-48 object-cover rounded-2xl mb-4 bg-slate-100" />
                          <p className="text-xs font-bold text-slate-600 line-clamp-2 px-2">{item.description}</p>
                          <button onClick={() => handleDelete(item.id, item.image_url)} className="absolute top-6 right-6 p-2 bg-red-600 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"><Trash2 size={16} /></button>
                      </div>
                  ))}
              </div>
          </div>
      )}
      
      {/* ... other tabs ... */}
      {/* WAT */}
      {activeTab === 'WAT' && (
          <div className="space-y-8 animate-in fade-in">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><Zap size={24} className="text-yellow-500"/> Bulk Upload WAT</h3>
                  <div className="space-y-4">
                      <input type="text" value={watSetTag} onChange={(e) => setWatSetTag(e.target.value)} placeholder="Set Name (e.g. 1 AFSB Set A)" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                      <textarea value={watBulkInput} onChange={(e) => setWatBulkInput(e.target.value)} placeholder="Enter 60 words separated by commas or new lines..." className="w-full h-40 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm resize-none" />
                      <button onClick={handleUpload} disabled={isUploading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
                          {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={16} />} Upload Words
                      </button>
                  </div>
              </div>
              
              {/* WAT Sets */}
              {Object.keys(groupedItems).map(tag => (
                  <div key={tag} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg">
                      <div className="flex justify-between items-center mb-4">
                          <h4 className="font-black text-slate-900 uppercase tracking-widest">{tag} <span className="text-slate-400 text-xs">({groupedItems[tag].length} Words)</span></h4>
                          <button onClick={() => handleDeleteSet(tag)} className="text-red-500 text-xs font-bold uppercase tracking-widest hover:underline flex items-center gap-1"><Trash2 size={12}/> Delete Set</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                          {groupedItems[tag].map((item: any) => (
                              <span key={item.id} className="px-3 py-1 bg-slate-50 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 relative group pr-6">
                                  {item.word}
                                  <button onClick={() => handleDelete(item.id)} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><XCircle size={12} /></button>
                              </span>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* SRT */}
      {activeTab === 'SRT' && (
          <div className="space-y-8 animate-in fade-in">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><Brain size={24} className="text-purple-600"/> Bulk Upload SRT</h3>
                  <div className="space-y-4">
                      <input type="text" value={srtSetTag} onChange={(e) => setSrtSetTag(e.target.value)} placeholder="Set Name (e.g. 2 AFSB Set 1)" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                      <textarea value={srtBulkInput} onChange={(e) => setSrtBulkInput(e.target.value)} placeholder="Enter situations separated by new lines..." className="w-full h-40 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm resize-none" />
                      <button onClick={handleUpload} disabled={isUploading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
                          {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={16} />} Upload Situations
                      </button>
                  </div>
              </div>
              
              {/* SRT Sets */}
              {Object.keys(groupedItems).map(tag => (
                  <div key={tag} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg">
                      <div className="flex justify-between items-center mb-4">
                          <h4 className="font-black text-slate-900 uppercase tracking-widest">{tag} <span className="text-slate-400 text-xs">({groupedItems[tag].length} Qs)</span></h4>
                          <button onClick={() => handleDeleteSet(tag)} className="text-red-500 text-xs font-bold uppercase tracking-widest hover:underline flex items-center gap-1"><Trash2 size={12}/> Delete Set</button>
                      </div>
                      <div className="space-y-2">
                          {groupedItems[tag].map((item: any, idx: number) => (
                              <div key={item.id} className="p-3 bg-slate-50 rounded-xl text-xs font-medium text-slate-700 border border-slate-100 flex justify-between gap-4 group hover:bg-white hover:shadow-sm transition-all">
                                  <span><strong className="text-slate-400 mr-2">{(idx+1).toString().padStart(2, '0')}</strong> {item.question}</span>
                                  <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500"><XCircle size={14} /></button>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* TAT */}
      {activeTab === 'TAT' && (
          <div className="space-y-8 animate-in fade-in">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><Layers size={24} className="text-blue-600"/> Upload TAT Slide</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                          <button onClick={() => fileInputRef.current?.click()} className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all gap-2">
                              <ImageIcon size={32} /> <span className="text-xs font-black uppercase tracking-widest">Select Image</span>
                          </button>
                      </div>
                      <div className="space-y-4">
                          <input type="text" value={setTag} onChange={(e) => setSetTag(e.target.value)} placeholder="Set Tag (e.g. Set 1, 1 AFSB)" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                          <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Description..." className="w-full h-20 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm resize-none" />
                          <button onClick={handleUpload} disabled={isUploading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
                              {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={16} />} Upload
                          </button>
                      </div>
                  </div>
              </div>
              
              {/* Grouped Display */}
              {Object.keys(groupedItems).map(tag => (
                  <div key={tag} className="space-y-4">
                      <h4 className="text-lg font-black uppercase tracking-widest text-slate-500 pl-4">{tag} ({groupedItems[tag].length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          {groupedItems[tag].map((item: any) => (
                              <div key={item.id} className="group relative bg-white p-4 rounded-[2rem] shadow-lg border border-slate-100 hover:shadow-xl transition-all">
                                  <img src={item.image_url} className="w-full h-40 object-cover rounded-2xl mb-3 bg-slate-100" alt="TAT" />
                                  <p className="text-[10px] font-bold text-slate-400 truncate px-2">{item.description}</p>
                                  <button onClick={() => handleDelete(item.id, item.image_url)} className="absolute top-6 right-6 p-2 bg-red-600 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"><Trash2 size={14} /></button>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* COUPONS */}
      {activeTab === 'COUPONS' && (
          <div className="space-y-8 animate-in fade-in">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col md:flex-row gap-6 items-end">
                  <div className="flex-1 space-y-4 w-full">
                      <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-widest flex items-center gap-2"><Tag size={24} className="text-pink-600"/> Create Coupon</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Code (e.g. SSB2025)" className="p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm uppercase" />
                          <input type="number" value={couponDiscount} onChange={e => setCouponDiscount(e.target.value)} placeholder="Discount %" className="p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                          <input value={influencerName} onChange={e => setInfluencerName(e.target.value)} placeholder="Influencer / Note" className="p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                      </div>
                  </div>
                  <button onClick={handleUpload} disabled={isUploading} className="w-full md:w-auto px-8 py-4 bg-pink-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-pink-700 transition-all h-14">
                      Create
                  </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {coupons.map(c => (
                      <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg relative overflow-hidden group">
                          <div className="absolute top-0 right-0 bg-pink-100 text-pink-700 px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest">{c.discount_percent}% OFF</div>
                          <h4 className="text-2xl font-black text-slate-900 mb-1">{c.code}</h4>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{c.influencer_name}</p>
                          <div className="mt-4 flex justify-between items-end">
                              <p className="text-[10px] font-bold text-slate-400">Used: {c.usage_count || 0}</p>
                              <button onClick={() => handleDelete(c.code)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"><Trash2 size={16}/></button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* BROADCAST & TICKER */}
      {activeTab === 'BROADCAST' && (
          <div className="space-y-8 animate-in fade-in">
              <div className="grid md:grid-cols-2 gap-8">
                  {/* Ticker Control */}
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                      <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><ScrollText size={24} className="text-orange-600"/> News Ticker</h3>
                      <div className="space-y-4">
                          <input value={tickerMsg} onChange={e => setTickerMsg(e.target.value)} placeholder="Ticker Message..." className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                          <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-xl">
                                  <input type="checkbox" checked={isTickerActive} onChange={e => setIsTickerActive(e.target.checked)} className="w-4 h-4 accent-slate-900" />
                                  <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Active</span>
                              </label>
                              <div className="flex items-center gap-2 flex-1 bg-slate-50 px-4 py-2 rounded-xl">
                                  <Gauge size={16} className="text-slate-400" />
                                  <input type="range" min="10" max="60" value={tickerSpeed} onChange={e => setTickerSpeed(parseInt(e.target.value))} className="w-full accent-slate-900" />
                                  <span className="text-xs font-mono font-bold">{tickerSpeed}s</span>
                              </div>
                          </div>
                          <button onClick={handleUpdateTicker} disabled={isUploading} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-700 transition-all">
                              Update Ticker
                          </button>
                      </div>
                  </div>

                  {/* Announcement Push */}
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                      <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><Megaphone size={24} className="text-red-600"/> Push Notification</h3>
                      <div className="space-y-4">
                          <div className="flex gap-2">
                              {['INFO', 'WARNING', 'SUCCESS', 'URGENT'].map(t => (
                                  <button key={t} onClick={() => setBroadcastType(t as any)} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${broadcastType === t ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>{t}</button>
                              ))}
                          </div>
                          <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="Notification Message (Appears as toaster to all active users)..." className="w-full h-32 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm resize-none" />
                          <button onClick={handleUpload} disabled={isUploading} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                              {isUploading ? <Loader2 className="animate-spin" /> : <Megaphone size={16} />} Send Alert
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* FEEDBACK */}
      {activeTab === 'FEEDBACK' && (
          <div className="space-y-6 animate-in fade-in">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest px-4">User Feedback Log</h3>
              <div className="grid grid-cols-1 gap-4">
                  {feedbackList.map((f: any) => (
                      <div key={f.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                          <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${f.rating >= 4 ? 'bg-green-100 text-green-700' : f.rating <= 2 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                      {f.rating} Stars
                                  </span>
                                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">{f.test_type}</span>
                              </div>
                              <p className="text-sm font-medium text-slate-700 italic">"{f.comments}"</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {f.aspirants?.full_name || 'Anonymous'} • {new Date(f.created_at).toLocaleString()}
                              </p>
                          </div>
                          <button onClick={() => handleDelete(f.id)} className="self-start md:self-center p-3 bg-slate-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors"><Trash2 size={16}/></button>
                      </div>
                  ))}
                  {feedbackList.length === 0 && <p className="text-center text-slate-400 font-bold py-10">No feedback recorded yet.</p>}
              </div>
          </div>
      )}
      
      {/* ... (Confirmation Modal etc) ... */}
    </div>
  );
};

export default AdminPanel;
