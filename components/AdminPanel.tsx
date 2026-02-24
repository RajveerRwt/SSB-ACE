
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Plus, Image as ImageIcon, Loader2, RefreshCw, Lock, Layers, Target, Info, AlertCircle, ExternalLink, Clipboard, Check, Database, Settings, FileText, IndianRupee, CheckCircle, XCircle, Clock, Zap, User, Search, Eye, Crown, Calendar, Tag, TrendingUp, Percent, PenTool, Megaphone, Radio, Star, MessageSquare, Mic, List, Users, Activity, BarChart3, PieChart, Filter, MailWarning, UserCheck, Brain, FileSignature, ToggleLeft, ToggleRight, ScrollText, Gauge, Coins, Wallet, History, X, Lightbulb, ChevronDown, ChevronRight, LogOut, MoreHorizontal, ShieldAlert, BadgeCheck, Minus, Copy, Map } from 'lucide-react';
import { 
  uploadPPDTScenario, getPPDTScenarios, deletePPDTScenario,
  uploadTATScenario, getTATScenarios, deleteTATScenario,
  uploadWATWords, getWATWords, deleteWATWord, deleteWATSet,
  getSRTQuestions, uploadSRTQuestions, deleteSRTQuestion, deleteSRTSet,
  getPendingPayments, approvePaymentRequest, rejectPaymentRequest,
  getAllUsers, deleteUserProfile, getCoupons, createCoupon, deleteCoupon,
  uploadDailyChallenge, sendAnnouncement, getAllFeedback, deleteFeedback,
  getLatestDailyChallenge, getTickerConfig, updateTickerConfig,
  getOIRSets, createOIRSet, deleteOIRSet, getOIRQuestions, addOIRQuestion, deleteOIRQuestion, activatePlanForUser, supabase,
  getGPEScenarios, addGPEScenario, deleteGPEScenario
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  // OIR States
  const [oirSets, setOirSets] = useState<any[]>([]);
  const [activeOirSetId, setActiveOirSetId] = useState<string | null>(null);
  const [oirQuestions, setOirQuestions] = useState<any[]>([]);
  const [newOirSetTitle, setNewOirSetTitle] = useState('');
  const [newOirSetTime, setNewOirSetTime] = useState(1200); // 20 mins default
  
  // OIR Question Input
  const [oirQText, setOirQText] = useState('');
  const [oirOptions, setOirOptions] = useState<string[]>(['', '', '', '']);
  const [oirCorrectIdx, setOirCorrectIdx] = useState(0);

  // Inputs
  const [newDescription, setNewDescription] = useState('');
  const [setTag, setSetTag] = useState('Set 1');
  
  // GPE Inputs
  const [gpeTitle, setGpeTitle] = useState('');
  const [gpeNarrative, setGpeNarrative] = useState('');
  const [gpeDifficulty, setGpeDifficulty] = useState('Medium');

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

  // Coin Adjustment
  const [adjustCoins, setAdjustCoins] = useState<number>(0);

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

  const [activeTab, setActiveTab] = useState<'PPDT' | 'TAT' | 'WAT' | 'SRT' | 'GPE' | 'PAYMENTS' | 'USERS' | 'COUPONS' | 'DAILY' | 'BROADCAST' | 'FEEDBACK' | 'OIR'>('PAYMENTS');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
      } else if (activeTab === 'OIR') {
        const sets = await getOIRSets();
        setOirSets(sets);
        if (activeOirSetId) {
            const qs = await getOIRQuestions(activeOirSetId);
            setOirQuestions(qs);
        }
      } else {
        let data;
        if (activeTab === 'PPDT') data = await getPPDTScenarios();
        else if (activeTab === 'TAT') data = await getTATScenarios();
        else if (activeTab === 'WAT') data = await getWATWords();
        else if (activeTab === 'SRT') data = await getSRTQuestions();
        else if (activeTab === 'GPE') data = await getGPEScenarios();
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
  }, [activeTab, activeOirSetId]); 

  const handleUpload = async () => {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      if (activeTab === 'BROADCAST') {
          if (!broadcastMsg) throw new Error("Message cannot be empty.");
          await sendAnnouncement(broadcastMsg, broadcastType);
          setBroadcastMsg('');
          alert("Notification Sent to All Active Users.");
      } else if (activeTab === 'OIR') {
          if (activeOirSetId) {
              // Add Question
              const file = fileInputRef.current?.files?.[0];
              let imageUrl = null;
              if (file) {
                  const fileName = `oir-${Date.now()}-${file.name}`;
                  await supabase.storage.from('scenarios').upload(fileName, file);
                  const { data } = supabase.storage.from('scenarios').getPublicUrl(fileName);
                  imageUrl = data.publicUrl;
              }
              if (!oirQText && !imageUrl) throw new Error("Question must have text or image.");
              if (oirOptions.some(o => !o.trim())) throw new Error("All options must be filled.");
              if (oirCorrectIdx >= oirOptions.length) throw new Error("Invalid Correct Answer selected");
              
              await addOIRQuestion(activeOirSetId, oirQText, imageUrl, oirOptions, oirCorrectIdx);
              setOirQText('');
              setOirOptions(['', '', '', '']); 
              setOirCorrectIdx(0);
              if (fileInputRef.current) fileInputRef.current.value = '';
              fetchData();
          } else {
              // Create Set
              if (!newOirSetTitle) throw new Error("Title required.");
              await createOIRSet(newOirSetTitle, newOirSetTime);
              setNewOirSetTitle('');
              fetchData();
          }
      } else if (activeTab === 'DAILY') {
          const file = fileInputRef.current?.files?.[0] || null;
          if ((!file && !dailyOirText.trim()) || !dailyWat.trim() || !dailySrt.trim() || !dailyInterview.trim()) {
              throw new Error("Please provide OIR Question (Image/Text), 1 WAT, 1 SRT, and 1 Interview Question.");
          }
          await uploadDailyChallenge(file, dailyOirText.trim(), dailyWat.trim(), dailySrt.trim(), dailyInterview.trim());
          setDailyOirText(''); setDailyWat(''); setDailySrt(''); setDailyInterview('');
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
      } else if (activeTab === 'GPE') {
        const file = fileInputRef.current?.files?.[0];
        let imageUrl = '';
        if (file) {
            const fileName = `gpe-${Date.now()}-${file.name}`;
            await supabase.storage.from('scenarios').upload(fileName, file);
            const { data } = supabase.storage.from('scenarios').getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        }
        if (!gpeTitle || !gpeNarrative) throw new Error("Title and Narrative are required.");
        await addGPEScenario(gpeTitle, gpeNarrative, imageUrl, gpeDifficulty);
        setGpeTitle(''); setGpeNarrative(''); setGpeDifficulty('Medium');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else if (activeTab === 'COUPONS') {
        if (!couponCode || !couponDiscount || !influencerName) throw new Error("All fields required.");
        await createCoupon(couponCode, parseInt(couponDiscount), influencerName);
        setCouponCode(''); setInfluencerName('');
        alert("Coupon Created!");
      } else {
        const file = fileInputRef.current?.files?.[0];
        if (!file) throw new Error("No file selected.");
        if (activeTab === 'PPDT') {
          await uploadPPDTScenario(file, newDescription || 'Standard PPDT Scenario');
        } else if (activeTab === 'TAT') {
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

  const handleDelete = async (id: string, url?: string) => {
    if (!window.confirm("Delete this item permanently?")) return;
    setErrorMsg(null);
    try {
      if (activeTab === 'WAT') await deleteWATWord(id);
      else if (activeTab === 'SRT') await deleteSRTQuestion(id);
      else if (activeTab === 'PPDT' && url) await deletePPDTScenario(id, url);
      else if (activeTab === 'TAT' && url) await deleteTATScenario(id, url);
      else if (activeTab === 'GPE') await deleteGPEScenario(id);
      else if (activeTab === 'COUPONS') await deleteCoupon(id);
      else if (activeTab === 'FEEDBACK') await deleteFeedback(id);
      else if (activeTab === 'OIR') {
          if (activeOirSetId) await deleteOIRQuestion(id);
          else await deleteOIRSet(id);
      }
      
      if (activeTab === 'COUPONS' || activeTab === 'FEEDBACK' || activeTab === 'OIR') fetchData();
      else setItems(items.filter(i => i.id !== id));
    } catch (error: any) {
      console.error("Delete failed", error);
      setErrorMsg(error.message || "Failed to delete item.");
    }
  };

  const handlePaymentAction = (id: string, action: 'APPROVE' | 'REJECT', userId: string, planType: any, email?: string, fullName?: string) => {
      setConfirmAction({ id, type: action, userId, planType, email, fullName });
  };

  const executeConfirmAction = async () => {
      if (!confirmAction) return;
      const { id, type, userId, planType } = confirmAction;
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

  const handleDeleteSet = async (tag: string) => {
    if (!window.confirm(`WARNING: Are you sure you want to delete the entire set "${tag}"?`)) return;
    setErrorMsg(null);
    try {
      if (activeTab === 'WAT') await deleteWATSet(tag);
      if (activeTab === 'SRT') await deleteSRTSet(tag);
      await fetchData();
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to delete set.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
      if (!window.confirm("CRITICAL: Delete User, History and Subscriptions? This cannot be undone.")) return;
      try {
          await deleteUserProfile(userId);
          setUsers(users.filter(u => u.user_id !== userId));
          setSelectedUser(null);
      } catch (e: any) {
          setErrorMsg(e.message || "Failed to delete user.");
      }
  };

  const handleAdjustCoins = async (userId: string) => {
      if (adjustCoins === 0) return;
      if (!window.confirm(`${adjustCoins > 0 ? 'Credit' : 'Debit'} ${Math.abs(adjustCoins)} Coins for this user?`)) return;
      
      try {
          await activatePlanForUser(userId, 'ADMIN_ADJUST', 0, adjustCoins);
          alert("Wallet Updated!");
          setAdjustCoins(0);
          fetchData(); 
          setSelectedUser(null);
      } catch(e: any) {
          setErrorMsg(e.message || "Failed to adjust coins");
      }
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

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      alert("SQL Copied to Clipboard!");
  };

  const groupedItems = items.reduce((acc: any, item: any) => {
      const tag = item.set_tag || 'General';
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(item);
      return acc;
  }, {});

  // Options Handlers
  const addOption = () => {
      setOirOptions([...oirOptions, '']);
  };

  const removeOption = (index: number) => {
      if (oirOptions.length <= 2) return; // Min 2 options
      const newOpts = oirOptions.filter((_, i) => i !== index);
      setOirOptions(newOpts);
      if (oirCorrectIdx >= newOpts.length) setOirCorrectIdx(0);
  };

  const updateOption = (index: number, value: string) => {
      const newOpts = [...oirOptions];
      newOpts[index] = value;
      setOirOptions(newOpts);
  };

  const tabs = [
      { id: 'PAYMENTS', label: 'Payments', icon: IndianRupee, color: 'bg-yellow-400 text-black', count: payments.length },
      { id: 'USERS', label: 'Cadets', icon: User, color: 'bg-indigo-600 text-white' },
      { id: 'OIR', label: 'OIR Test', icon: Lightbulb, color: 'bg-teal-600 text-white' },
      { id: 'PPDT', label: 'PPDT', icon: ImageIcon, color: 'bg-slate-900 text-white' },
      { id: 'TAT', label: 'TAT', icon: Layers, color: 'bg-slate-900 text-white' },
      { id: 'WAT', label: 'WAT', icon: Zap, color: 'bg-slate-900 text-white' },
      { id: 'SRT', label: 'SRT', icon: Brain, color: 'bg-slate-900 text-white' },
      { id: 'GPE', label: 'GPE', icon: Map, color: 'bg-slate-900 text-white' },
      { id: 'DAILY', label: 'Daily', icon: Clock, color: 'bg-rose-600 text-white' },
      { id: 'COUPONS', label: 'Coupons', icon: Tag, color: 'bg-pink-600 text-white' },
      { id: 'BROADCAST', label: 'Broadcast', icon: Megaphone, color: 'bg-red-600 text-white' },
      { id: 'FEEDBACK', label: 'Feedback', icon: MessageSquare, color: 'bg-orange-600 text-white' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
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

      {/* ERROR / SQL HELP BLOCK */}
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
          {showSqlHelp && (
              <div className="text-blue-900 space-y-4">
                  <h4 className="font-black uppercase text-xs tracking-widest flex items-center gap-2">
                      <Database size={16} /> Supabase SQL Setup (Run in SQL Editor)
                  </h4>
                  
                  {/* Leaderboard Fix Block */}
                  <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                          <p className="font-bold text-xs text-blue-800">1. Fix Leaderboard Visibility (Allow users to see others)</p>
                          <button onClick={() => copyToClipboard(`-- Allow Public Read Access for Aspirant Profiles (Name/ID)
create policy "Public read aspirants" on public.aspirants for select using (true);

-- Allow Public Read Access for Test Scores
create policy "Public read test_history" on public.test_history for select using (true);`)} className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-500 hover:text-blue-700"><Copy size={12}/> Copy SQL</button>
                      </div>
                      <pre className="bg-slate-900 text-slate-300 p-3 rounded-lg text-[10px] font-mono overflow-x-auto">
{`-- Allow Public Read Access for Aspirant Profiles (Name/ID)
create policy "Public read aspirants" on public.aspirants for select using (true);

-- Allow Public Read Access for Test Scores
create policy "Public read test_history" on public.test_history for select using (true);`}
                      </pre>
                  </div>

                  {/* General Fix Block */}
                  <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                          <p className="font-bold text-xs text-blue-800">2. General Tables (If "relation not found" error)</p>
                          <button onClick={() => copyToClipboard(`create table if not exists public.ticker_config (
  id uuid default gen_random_uuid() primary key,
  message text,
  is_active boolean default false,
  speed integer default 25,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.ticker_config enable row level security;
create policy "Public read ticker" on public.ticker_config for select using (true);
create policy "Admin insert ticker" on public.ticker_config for insert with check (true);

create table if not exists public.gpe_scenarios (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  narrative text not null,
  image_url text,
  difficulty text default 'Medium',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.gpe_scenarios enable row level security;
create policy "Public read gpe" on public.gpe_scenarios for select using (true);
create policy "Admin insert gpe" on public.gpe_scenarios for insert with check (true);
create policy "Admin delete gpe" on public.gpe_scenarios for delete using (true);`)} className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-500 hover:text-blue-700"><Copy size={12}/> Copy SQL</button>
                      </div>
                      <pre className="bg-slate-900 text-slate-300 p-3 rounded-lg text-[10px] font-mono overflow-x-auto">
{`create table if not exists public.ticker_config (
  id uuid default gen_random_uuid() primary key,
  message text,
  is_active boolean default false,
  speed integer default 25,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.ticker_config enable row level security;
create policy "Public read ticker" on public.ticker_config for select using (true);
create policy "Admin insert ticker" on public.ticker_config for insert with check (true);

create table if not exists public.gpe_scenarios (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  narrative text not null,
  image_url text,
  difficulty text default 'Medium',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.gpe_scenarios enable row level security;
create policy "Public read gpe" on public.gpe_scenarios for select using (true);
create policy "Admin insert gpe" on public.gpe_scenarios for insert with check (true);
create policy "Admin delete gpe" on public.gpe_scenarios for delete using (true);`}
                      </pre>
                  </div>
              </div>
          )}
        </div>
      )}

      {/* TABS */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-4 -mx-4 px-4 border-b border-slate-200/50">
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all shrink-0 ${
                        activeTab === tab.id 
                        ? `${tab.color} shadow-lg scale-105` 
                        : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'
                    }`}
                >
                    <tab.icon size={14} />
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                        <span className="ml-1 bg-white text-black text-[9px] px-1.5 py-0.5 rounded-md shadow-sm">{tab.count}</span>
                    )}
                </button>
            ))}
        </div>
      </div>

      {/* OIR TAB */}
      {activeTab === 'OIR' && (
          <div className="space-y-8 animate-in fade-in">
              {activeOirSetId ? (
                  <div className="space-y-6">
                      <div className="flex items-center gap-4">
                          <button onClick={() => setActiveOirSetId(null)} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200"><ChevronDown className="rotate-90" /></button>
                          <h3 className="text-xl font-black text-slate-900 uppercase">Editing Set: {oirSets.find(s => s.id === activeOirSetId)?.title}</h3>
                          <span className="bg-slate-100 px-3 py-1 rounded text-xs font-bold text-slate-500">{oirQuestions.length} Questions</span>
                      </div>
                      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                          <h4 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><Plus size={20} className="text-teal-600"/> Add Question</h4>
                          <div className="space-y-4">
                              <textarea value={oirQText} onChange={e => setOirQText(e.target.value)} placeholder="Question Text..." className="w-full h-24 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 text-slate-400 font-bold uppercase text-xs hover:text-teal-600 transition-colors">
                                      <ImageIcon size={16} /> Upload Image (Optional)
                                  </button>
                              </div>
                              
                              {/* Dynamic Options Input */}
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Options</label>
                                  {oirOptions.map((opt, i) => (
                                      <div key={i} className="flex gap-2 items-center">
                                          <input 
                                            type="radio" 
                                            checked={oirCorrectIdx === i} 
                                            onChange={() => setOirCorrectIdx(i)} 
                                            className="w-4 h-4 accent-teal-600 shrink-0" 
                                            title="Mark as correct answer"
                                          />
                                          <input 
                                            value={opt} 
                                            onChange={e => updateOption(i, e.target.value)} 
                                            placeholder={`Option ${i+1}`} 
                                            className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-teal-100 transition-all" 
                                          />
                                          <button 
                                            onClick={() => removeOption(i)} 
                                            disabled={oirOptions.length <= 2}
                                            className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 disabled:opacity-30 disabled:hover:bg-red-50 transition-colors"
                                            title="Remove Option"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  ))}
                                  <button 
                                    onClick={addOption} 
                                    className="text-xs font-bold text-teal-600 flex items-center gap-1 hover:text-teal-800 mt-2"
                                  >
                                      <Plus size={14} /> Add Another Option
                                  </button>
                              </div>

                              <button onClick={handleUpload} disabled={isUploading} className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-teal-700 transition-all flex items-center justify-center gap-2 mt-4">
                                  {isUploading ? <Loader2 className="animate-spin" /> : <Plus size={16} />} Add Question
                              </button>
                          </div>
                      </div>
                      <div className="space-y-4">
                          {oirQuestions.map((q, i) => (
                              <div key={q.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-start">
                                  <div className="flex gap-4">
                                      <span className="font-black text-slate-300 text-lg">{i+1}</span>
                                      <div>
                                          <p className="font-bold text-slate-800 text-sm">{q.question_text || "Image Question"}</p>
                                          {q.image_url && <img src={q.image_url} className="h-20 w-auto rounded-lg mt-2 border border-slate-200" />}
                                          <div className="flex flex-wrap gap-2 mt-2">
                                              {q.options.map((o: any, idx: number) => (
                                                  <span key={idx} className={`text-[10px] px-2 py-1 rounded ${idx === q.correct_index ? 'bg-green-100 text-green-700 font-bold' : 'bg-slate-50 text-slate-500'}`}>{o}</span>
                                              ))}
                                          </div>
                                      </div>
                                  </div>
                                  <button onClick={() => handleDelete(q.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                              </div>
                          ))}
                      </div>
                  </div>
              ) : (
                  <>
                      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                          <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><Layers size={24} className="text-teal-600"/> Create OIR Set</h3>
                          <div className="flex gap-4">
                              <input value={newOirSetTitle} onChange={e => setNewOirSetTitle(e.target.value)} placeholder="Set Title (e.g. OIR Set 1)" className="flex-1 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                              <div className="w-32 relative">
                                  <input type="number" value={newOirSetTime} onChange={e => setNewOirSetTime(parseInt(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Sec</span>
                              </div>
                              <button onClick={handleUpload} disabled={isUploading} className="px-8 bg-teal-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-teal-700 transition-all">Create</button>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {oirSets.map(set => (
                              <div key={set.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg relative hover:shadow-xl transition-all">
                                  <div className="flex justify-between items-start mb-4">
                                      <h4 className="font-black text-slate-900 uppercase text-lg">{set.title}</h4>
                                      <button onClick={() => handleDelete(set.id)} className="text-slate-300 hover:text-red-500"><XCircle size={18} /></button>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mb-6">
                                      <span className="flex items-center gap-1"><Clock size={12} /> {Math.floor(set.time_limit_seconds / 60)} Mins</span>
                                      <span className="flex items-center gap-1"><List size={12} /> Questions</span>
                                  </div>
                                  <button onClick={() => setActiveOirSetId(set.id)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 hover:text-white transition-all">Manage Questions</button>
                              </div>
                          ))}
                      </div>
                  </>
              )}
          </div>
      )}

      {/* PPDT/TAT */}
      {(activeTab === 'PPDT' || activeTab === 'TAT') && (
          <div className="space-y-8 animate-in fade-in">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><Upload size={24}/> Upload Scenario</h3>
                  <div className="flex gap-4">
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
                      <button onClick={() => fileInputRef.current?.click()} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200">Select Image</button>
                      <input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Description..." className="flex-1 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                      {activeTab === 'TAT' && <input value={setTag} onChange={e => setSetTag(e.target.value)} placeholder="Set Tag" className="w-32 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />}
                      <button onClick={handleUpload} disabled={isUploading} className="px-8 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black">{isUploading ? <Loader2 className="animate-spin" /> : 'Upload'}</button>
                  </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {Object.keys(groupedItems).map(tag => (
                      <div key={tag} className="contents">
                          {groupedItems[tag].map((item: any) => (
                              <div key={item.id} className="relative group rounded-2xl overflow-hidden border-2 border-slate-100 aspect-square">
                                  <img src={item.image_url} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <button onClick={() => handleDelete(item.id, item.image_url)} className="p-3 bg-red-600 text-white rounded-full"><Trash2 size={16} /></button>
                                  </div>
                                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded">{item.set_tag || 'General'}</div>
                              </div>
                          ))}
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* WAT/SRT */}
      {(activeTab === 'WAT' || activeTab === 'SRT') && (
          <div className="space-y-8 animate-in fade-in">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <div className="flex justify-between mb-4">
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest">{activeTab} Bulk Upload</h3>
                      <button onClick={() => handleDeleteSet(activeTab === 'WAT' ? watSetTag : srtSetTag)} className="text-red-500 font-bold text-xs hover:underline">Delete Entire Set</button>
                  </div>
                  <textarea value={activeTab === 'WAT' ? watBulkInput : srtBulkInput} onChange={e => activeTab === 'WAT' ? setWatBulkInput(e.target.value) : setSrtBulkInput(e.target.value)} placeholder={`Paste ${activeTab} items here...`} className="w-full h-32 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm mb-4" />
                  <div className="flex gap-4">
                      <input value={activeTab === 'WAT' ? watSetTag : srtSetTag} onChange={e => activeTab === 'WAT' ? setWatSetTag(e.target.value) : setSrtSetTag(e.target.value)} placeholder="Set Tag" className="flex-1 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" />
                      <button onClick={handleUpload} disabled={isUploading} className="px-8 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black">Upload</button>
                  </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
                  <h4 className="font-black text-slate-900 uppercase text-sm tracking-widest mb-4">Existing Items</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                      {items.map(item => (
                          <div key={item.id} className="flex justify-between p-3 bg-slate-50 rounded-xl">
                              <span className="font-bold text-sm text-slate-700">{item.word || item.question} <span className="text-slate-400 text-[10px] ml-2">({item.set_tag})</span></span>
                              <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* GPE */}
      {activeTab === 'GPE' && (
          <div className="space-y-8 animate-in fade-in">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><Map size={24}/> Add GPE Scenario</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Model Image (Optional)</label>
                          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                              <div className="flex flex-col items-center gap-2 text-slate-400">
                                  <ImageIcon size={24} />
                                  <span className="text-xs font-bold uppercase">Upload Model Image</span>
                              </div>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Title</label>
                          <input value={gpeTitle} onChange={e => setGpeTitle(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" placeholder="Scenario Title..." />
                          
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 block">Difficulty</label>
                          <select value={gpeDifficulty} onChange={e => setGpeDifficulty(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm">
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                          </select>
                      </div>
                      <div className="space-y-4 md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Narrative Story</label>
                          <textarea value={gpeNarrative} onChange={e => setGpeNarrative(e.target.value)} className="w-full h-48 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" placeholder="Enter the full GPE narrative story here..." />
                      </div>
                  </div>
                  <button onClick={handleUpload} disabled={isUploading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all">
                      {isUploading ? <Loader2 className="animate-spin mx-auto" /> : 'Add GPE Scenario'}
                  </button>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
                  <h4 className="font-black text-slate-900 uppercase text-sm tracking-widest mb-4">Existing GPE Scenarios</h4>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                      {items.map(item => (
                          <div key={item.id} className="flex justify-between items-start p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="flex gap-4">
                                  {item.image_url && <img src={item.image_url} className="w-20 h-20 object-cover rounded-xl" />}
                                  <div>
                                      <h5 className="font-bold text-slate-900 text-sm">{item.title}</h5>
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mt-1 inline-block ${item.difficulty === 'High' ? 'bg-red-100 text-red-700' : item.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{item.difficulty}</span>
                                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">{item.narrative}</p>
                                  </div>
                              </div>
                              <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* DAILY CHALLENGE */}
      {activeTab === 'DAILY' && (
          <div className="space-y-8 animate-in fade-in">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Clock size={24} className="text-rose-600"/> Daily Challenge</h3>
                      {currentChallenge && <p className="text-xs font-bold text-green-600">Active Challenge: {new Date(currentChallenge.created_at).toDateString()}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OIR Image</label>
                          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                              <div className="flex flex-col items-center gap-2 text-slate-400">
                                  <ImageIcon size={24} />
                                  <span className="text-xs font-bold uppercase">Upload OIR</span>
                              </div>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OIR Text (Optional)</label>
                          <input value={dailyOirText} onChange={e => setDailyOirText(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" placeholder="Text question if no image..." />
                      </div>
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WAT Word</label>
                          <input value={dailyWat} onChange={e => setDailyWat(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" placeholder="Single Word" />
                      </div>
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SRT Situation</label>
                          <input value={dailySrt} onChange={e => setDailySrt(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" placeholder="Situation..." />
                      </div>
                      <div className="space-y-4 md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interview Question</label>
                          <input value={dailyInterview} onChange={e => setDailyInterview(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" placeholder="Question..." />
                      </div>
                  </div>
                  <button onClick={handleUpload} disabled={isUploading} className="w-full mt-6 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-700 transition-all">
                      {isUploading ? <Loader2 className="animate-spin" /> : 'Publish Daily Challenge'}
                  </button>
              </div>
          </div>
      )}

      {/* BROADCAST & TICKER */}
      {activeTab === 'BROADCAST' && (
          <div className="space-y-8 animate-in fade-in">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><Megaphone size={24} className="text-red-600"/> Live Announcement</h3>
                  <div className="flex gap-4 mb-4">
                      {['INFO', 'WARNING', 'SUCCESS', 'URGENT'].map(t => (
                          <button key={t} onClick={() => setBroadcastType(t as any)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 ${broadcastType === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>{t}</button>
                      ))}
                  </div>
                  <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} className="w-full h-32 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm mb-4" placeholder="Announcement Message..." />
                  <button onClick={handleUpload} disabled={isUploading} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all">Send Broadcast</button>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><ScrollText size={24} className="text-blue-600"/> Scrolling Ticker</h3>
                  <div className="space-y-4">
                      <input value={tickerMsg} onChange={e => setTickerMsg(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" placeholder="Ticker Text..." />
                      <div className="flex gap-4 items-center">
                          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
                              <div className={`w-10 h-5 rounded-full relative transition-colors ${isTickerActive ? 'bg-green-500' : 'bg-slate-300'}`} onClick={() => setIsTickerActive(!isTickerActive)}>
                                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isTickerActive ? 'left-6' : 'left-1'}`} />
                              </div>
                              <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Active</span>
                          </label>
                          <div className="flex-1 flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
                              <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Speed ({tickerSpeed}s)</span>
                              <input type="range" min="10" max="60" value={tickerSpeed} onChange={e => setTickerSpeed(parseInt(e.target.value))} className="flex-1 accent-slate-900" />
                          </div>
                      </div>
                      <button onClick={handleUpdateTicker} disabled={isUploading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all">Update Ticker</button>
                  </div>
              </div>
          </div>
      )}

      {/* FEEDBACK */}
      {activeTab === 'FEEDBACK' && (
          <div className="space-y-6">
              {feedbackList.map((f: any) => (
                  <div key={f.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                          <div>
                              <h4 className="font-bold text-slate-900 text-sm">{f.aspirants?.full_name || 'Anonymous'}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{f.test_type} • {new Date(f.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex gap-1 text-yellow-400">
                              {[...Array(f.rating)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                          </div>
                      </div>
                      <p className="text-sm font-medium text-slate-600 bg-slate-50 p-4 rounded-xl">{f.comments}</p>
                      <button onClick={() => handleDelete(f.id)} className="mt-4 text-red-400 text-xs font-bold uppercase tracking-widest hover:text-red-600">Delete Feedback</button>
                  </div>
              ))}
          </div>
      )}

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
                      <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-6 w-full md:w-auto">
                              <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center shrink-0"><IndianRupee size={24} /></div>
                              <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{new Date(req.created_at).toLocaleString()}</p>
                                  <h4 className="font-bold text-slate-900 text-lg">UTR: <span className="font-mono bg-slate-100 px-2 rounded">{req.utr}</span></h4>
                                  <p className="text-xs font-medium text-slate-600">{req.aspirants?.full_name || 'Unknown'} • {req.plan_type} • ₹{req.amount}</p>
                              </div>
                          </div>
                          <div className="flex gap-4 w-full md:w-auto">
                              <button onClick={() => handlePaymentAction(req.id, 'REJECT', req.user_id, req.plan_type)} className="flex-1 md:flex-none px-6 py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-100"><XCircle size={16} /> Reject</button>
                              <button onClick={() => handlePaymentAction(req.id, 'APPROVE', req.user_id, req.plan_type, req.aspirants?.email, req.aspirants?.full_name)} className="flex-1 md:flex-none px-6 py-3 bg-green-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-green-700"><CheckCircle size={16} /> Approve</button>
                          </div>
                      </div>
                  ))
              )}
          </div>
      )}

      {/* --- REVAMPED CADET USER TAB --- */}
      {activeTab === 'USERS' && (
          <div className="space-y-8">
              {/* TOP STATS BAR */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl border border-slate-800 flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-yellow-400"><Users size={24} /></div>
                      <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Cadets</p>
                          <h4 className="text-3xl font-black">{users.length}</h4>
                      </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-[2rem] shadow-xl border border-slate-100 flex items-center gap-2">
                      <input 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        placeholder="Search Name / Email..." 
                        className="w-full h-full px-4 bg-slate-50 rounded-xl outline-none font-bold text-sm text-slate-700"
                      />
                      <div className="p-3 bg-slate-900 text-white rounded-xl"><Search size={16} /></div>
                  </div>
              </div>

              {/* USER GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users.filter(u => u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map(u => {
                      const testsTaken = u.test_history?.length || 0;
                      return (
                      <div key={u.user_id} className="bg-white rounded-[2.5rem] border border-slate-100 hover:border-blue-200 shadow-lg hover:shadow-xl transition-all overflow-hidden group">
                          {/* Header */}
                          <div className="p-6 pb-4 flex justify-between items-start">
                              <div className="flex gap-3">
                                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-sm">
                                      {u.full_name?.[0] || 'U'}
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-900 leading-tight">{u.full_name || 'Cadet'}</h4>
                                      <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{u.email}</p>
                                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${u.subscription_data?.tier === 'PRO' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                          {u.subscription_data?.tier || 'FREE'}
                                      </span>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <span className="block text-2xl font-black text-yellow-500">{u.subscription_data?.coins || 0}</span>
                                  <span className="text-[9px] font-black text-slate-300 uppercase">Coins</span>
                              </div>
                          </div>

                          {/* Stats Body */}
                          <div className="px-6 py-4 bg-slate-50/50 border-t border-b border-slate-100 grid grid-cols-2 gap-4">
                              <div>
                                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">History</p>
                                  <p className="text-sm font-bold text-slate-700 flex items-center gap-1"><History size={12}/> {testsTaken} Tests</p>
                              </div>
                              <div>
                                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Last Active</p>
                                  <p className="text-sm font-bold text-slate-700 truncate">{new Date(u.last_active).toLocaleDateString()}</p>
                              </div>
                          </div>

                          {/* Actions */}
                          <div className="p-4 flex gap-2">
                              <button 
                                onClick={() => setSelectedUser(u)}
                                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                              >
                                  <Eye size={12} /> Inspect Dossier
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(u.user_id)}
                                className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      </div>
                  )})}
              </div>
          </div>
      )}

      {activeTab === 'COUPONS' && (
          <div className="space-y-8">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2"><Tag size={24} className="text-pink-600"/> Create Coupon</h3>
                  <div className="flex gap-4">
                      <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="CODE" className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold text-sm" />
                      <input type="number" value={couponDiscount} onChange={e => setCouponDiscount(e.target.value)} placeholder="%" className="w-24 p-4 bg-slate-50 rounded-2xl font-bold text-sm" />
                      <input value={influencerName} onChange={e => setInfluencerName(e.target.value)} placeholder="Influencer Name" className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold text-sm" />
                      <button onClick={handleUpload} className="px-8 bg-pink-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-pink-700">Create</button>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {coupons.map(c => (
                      <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                          <div>
                              <h4 className="font-black text-slate-900 text-lg">{c.code}</h4>
                              <p className="text-xs text-slate-500 font-bold">{c.discount_percent}% OFF • {c.influencer_name}</p>
                              <p className="text-[10px] text-slate-400 mt-1">Used: {c.usage_count || 0} times</p>
                          </div>
                          <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmAction && (
          <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center space-y-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${confirmAction.type === 'APPROVE' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {confirmAction.type === 'APPROVE' ? <CheckCircle size={32} /> : <XCircle size={32} />}
                  </div>
                  <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Confirm {confirmAction.type === 'APPROVE' ? 'Approval' : 'Rejection'}</h3>
                      <p className="text-slate-500 text-xs font-bold mt-2">{confirmAction.planType} for {confirmAction.fullName || 'User'}</p>
                  </div>
                  <div className="flex gap-4">
                      <button onClick={() => setConfirmAction(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200">Cancel</button>
                      <button onClick={executeConfirmAction} className={`flex-1 py-4 rounded-2xl text-white font-black uppercase text-xs tracking-widest ${confirmAction.type === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Confirm</button>
                  </div>
              </div>
          </div>
      )}

      {/* USER DETAIL MODAL */}
      {selectedUser && (
          <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-4xl h-[90vh] rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative">
                  <button onClick={() => setSelectedUser(null)} className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full z-10"><X size={20} /></button>
                  
                  <div className="p-8 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row gap-6 items-center md:items-start">
                      <div className="w-20 h-20 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-xl">{selectedUser.full_name?.[0]}</div>
                      <div className="text-center md:text-left flex-1">
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedUser.full_name}</h2>
                          <p className="text-slate-500 font-bold text-sm">{selectedUser.email}</p>
                          <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                  {selectedUser.subscription_data?.tier}
                              </span>
                              <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                  <Coins size={10} /> {selectedUser.subscription_data?.coins} Coins
                              </span>
                          </div>
                      </div>
                      
                      {/* ADMIN ACTIONS */}
                      <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                              <button onClick={() => setAdjustCoins(prev => prev - 10)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg"><Minus size={14} /></button>
                              <span className="text-sm font-black w-8 text-center">{adjustCoins > 0 ? `+${adjustCoins}` : adjustCoins}</span>
                              <button onClick={() => setAdjustCoins(prev => prev + 10)} className="p-2 hover:bg-green-50 text-green-500 rounded-lg"><Plus size={14} /></button>
                          </div>
                          <button onClick={() => handleAdjustCoins(selectedUser.user_id)} disabled={adjustCoins === 0} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black disabled:opacity-50">Update Wallet</button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                      {/* TEST HISTORY */}
                      <div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><History size={16}/> Mission History</h4>
                          <div className="space-y-3">
                              {selectedUser.test_history?.length === 0 ? <p className="text-slate-400 text-xs italic">No tests taken yet.</p> : 
                               selectedUser.test_history.map((h: any, i: number) => (
                                  <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                      <div>
                                          <p className="font-bold text-slate-900 text-xs uppercase">{h.test_type}</p>
                                          <p className="text-[10px] text-slate-400 font-bold">{new Date(h.created_at).toLocaleString()}</p>
                                      </div>
                                      <span className="text-sm font-black text-slate-900">Score: {h.score}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
