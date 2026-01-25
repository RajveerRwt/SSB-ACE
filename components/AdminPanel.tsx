
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Plus, Image as ImageIcon, Loader2, RefreshCw, Lock, Layers, Target, Info, AlertCircle, ExternalLink, Clipboard, Check, Database, Settings, FileText, IndianRupee, CheckCircle, XCircle, Clock, Zap, User, Search, Eye, Crown, Calendar, Tag, TrendingUp, Percent, PenTool, Megaphone, Radio } from 'lucide-react';
import { 
  uploadPPDTScenario, getPPDTScenarios, deletePPDTScenario,
  uploadTATScenario, getTATScenarios, deleteTATScenario,
  uploadWATWords, getWATWords, deleteWATWord, deleteWATSet,
  getSRTQuestions, uploadSRTQuestions, deleteSRTQuestion, deleteSRTSet,
  getPendingPayments, approvePaymentRequest, rejectPaymentRequest,
  getAllUsers, deleteUserProfile, getCoupons, createCoupon, deleteCoupon,
  uploadDailyChallenge, sendAnnouncement
} from '../services/supabaseService';

const AdminPanel: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
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

  // Broadcast Inputs
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastType, setBroadcastType] = useState<'INFO' | 'WARNING' | 'SUCCESS' | 'URGENT'>('INFO');

  // User Management
  const [searchQuery, setSearchQuery] = useState('');
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

  const [activeTab, setActiveTab] = useState<'PPDT' | 'TAT' | 'WAT' | 'SRT' | 'PAYMENTS' | 'USERS' | 'COUPONS' | 'DAILY' | 'BROADCAST'>('PAYMENTS');
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
      } else if (activeTab !== 'DAILY' && activeTab !== 'BROADCAST') {
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
          const wat = dailyWat.split(/[\n,]+/).map(w => w.trim()).filter(w => w).slice(0, 5);
          const srt = dailySrt.split(/[\n]+/).map(q => q.trim()).filter(q => q).slice(0, 5);
          
          if (wat.length < 5 || srt.length < 5) {
              throw new Error("Please provide at least 5 WAT words and 5 SRTs.");
          }
          await uploadDailyChallenge(file, wat, srt);
          setDailyWat('');
          setDailySrt('');
          if (fileInputRef.current) fileInputRef.current.value = '';
          alert("Daily Challenge Published!");
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

  // Replaces window.confirm
  const handlePaymentAction = (id: string, action: 'APPROVE' | 'REJECT', userId: string, planType: any, email?: string, fullName?: string) => {
      setConfirmAction({ id, type: action, userId, planType, email, fullName });
  };

  const executeConfirmAction = async () => {
      if (!confirmAction) return;
      const { id, type, userId, planType, email, fullName } = confirmAction;
      setConfirmAction(null); // Close modal
      
      try {
          if (type === 'APPROVE') {
              await approvePaymentRequest(id, userId, planType);
              
              if (email) {
                  const subject = "OFFICIAL: Pro Access Granted | SSBPREP.ONLINE";
                  const body = `Candidate ${fullName || 'Aspirant'},

We are pleased to inform you that the Admin has verified your payment.
Your account status has been upgraded to: PRO CADET.

ACCESS GRANTED:
[x] 30 PPDT Simulation Sets
[x] 7 TAT Psychology Sets
[x] 10 WAT & SRT Sets
[x] 5 AI Video Interview Credits
[x] Access to AI Guide & SDT

INSTRUCTION:
Please refresh your dashboard to synchronize your new clearance level immediately and start your training.

Prepare hard and enjoy the platform.

Jai Hind.

Administrative Officer
SSBPREP.ONLINE
(contact.ssbprep@gmail.com)`;

                  window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
              }
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
      
      if (activeTab === 'COUPONS') fetchData();
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

  // Group Items by Set Tag
  const groupedItems = items.reduce((acc: any, item: any) => {
      const tag = item.set_tag || 'General';
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(item);
      return acc;
  }, {});

  // Cleaned SQL with DELETE permissions for Admin and IDEMPOTENT logic
  const storageSQL = `
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Aspirants Profile
create table if not exists public.aspirants (
  user_id uuid references auth.users not null primary key,
  email text,
  full_name text,
  piq_data jsonb,
  last_active timestamptz default now()
);
alter table public.aspirants enable row level security;
create policy "Users can view own profile" on public.aspirants for select using (auth.uid() = user_id);
create policy "Users can update own profile" on public.aspirants for update using (auth.uid() = user_id);
create policy "Users can insert own profile" on public.aspirants for insert with check (auth.uid() = user_id);

-- 2. User Subscriptions
create table if not exists public.user_subscriptions (
  user_id uuid references auth.users not null primary key,
  tier text default 'FREE', -- FREE, STANDARD, PRO
  usage jsonb default '{"interview_used": 0, "interview_limit": 1, "ppdt_used": 0, "ppdt_limit": 10}'::jsonb,
  extra_credits jsonb default '{"interview": 0}'::jsonb,
  expiry_date timestamptz
);
alter table public.user_subscriptions enable row level security;
create policy "Users can view own sub" on public.user_subscriptions for select using (auth.uid() = user_id);
create policy "Users can update own sub" on public.user_subscriptions for update using (auth.uid() = user_id);
create policy "Users can insert own sub" on public.user_subscriptions for insert with check (auth.uid() = user_id);

-- 3. Payment Requests
create table if not exists public.payment_requests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  utr text,
  amount numeric,
  plan_type text,
  status text default 'PENDING',
  coupon_code text,
  created_at timestamptz default now()
);
alter table public.payment_requests enable row level security;
create policy "Users can view own payments" on public.payment_requests for select using (auth.uid() = user_id);
create policy "Users can insert payments" on public.payment_requests for insert with check (auth.uid() = user_id);
create policy "Users can update own payments" on public.payment_requests for update using (auth.uid() = user_id);

-- 4. Test History
create table if not exists public.test_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  test_type text,
  score numeric,
  result_data jsonb,
  created_at timestamptz default now()
);
alter table public.test_history enable row level security;
create policy "Users can view own history" on public.test_history for select using (auth.uid() = user_id);
create policy "Users can insert history" on public.test_history for insert with check (auth.uid() = user_id);

-- 5. Content Tables
create table if not exists public.ppdt_scenarios (
  id uuid default uuid_generate_v4() primary key,
  image_url text not null,
  description text
);
alter table public.ppdt_scenarios enable row level security;
create policy "Public read ppdt" on public.ppdt_scenarios for select using (true);

create table if not exists public.tat_scenarios (
  id uuid default uuid_generate_v4() primary key,
  image_url text not null,
  description text,
  set_tag text
);
alter table public.tat_scenarios enable row level security;
create policy "Public read tat" on public.tat_scenarios for select using (true);

create table if not exists public.wat_words (
  id uuid default uuid_generate_v4() primary key,
  word text,
  set_tag text
);
alter table public.wat_words enable row level security;
create policy "Public read wat" on public.wat_words for select using (true);

create table if not exists public.srt_questions (
  id uuid default uuid_generate_v4() primary key,
  question text,
  set_tag text
);
alter table public.srt_questions enable row level security;
create policy "Public read srt" on public.srt_questions for select using (true);

create table if not exists public.coupons (
  code text primary key,
  discount_percent integer,
  influencer_name text,
  usage_count integer default 0,
  created_at timestamptz default now()
);
alter table public.coupons enable row level security;
create policy "Public read coupons" on public.coupons for select using (true);

create table if not exists public.daily_challenges (
  id uuid default uuid_generate_v4() primary key,
  ppdt_image_url text,
  wat_words text[],
  srt_situations text[],
  created_at timestamptz default now()
);
alter table public.daily_challenges enable row level security;
create policy "Public read daily" on public.daily_challenges for select using (true);

create table if not exists public.daily_submissions (
  id uuid default uuid_generate_v4() primary key,
  challenge_id uuid references public.daily_challenges,
  user_id uuid references auth.users,
  ppdt_story text,
  wat_answers text[],
  srt_answers text[],
  created_at timestamptz default now()
);
alter table public.daily_submissions enable row level security;
create policy "Public read submissions" on public.daily_submissions for select using (true);
create policy "Insert submissions" on public.daily_submissions for insert with check (auth.uid() = user_id);

create table if not exists public.announcements (
  id uuid default uuid_generate_v4() primary key,
  message text,
  type text,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.announcements enable row level security;
create policy "Public read announcements" on public.announcements for select using (true);
`;

  const filteredUsers = users.filter(u => 
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                <Database size={20} /> <span className="hidden md:inline font-bold text-xs uppercase tracking-widest">Fix Database</span>
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
                    <h5 className="text-sm font-black uppercase tracking-widest">Database Initialization Script</h5>
                </div>
                {showSqlHelp && !errorMsg && (
                    <button onClick={() => setShowSqlHelp(false)} className="text-slate-400 hover:text-slate-900"><XCircle size={20} /></button>
                )}
            </div>
            
            <p className="text-xs text-slate-600 font-medium">
                Copy the code below and run it in the <a href="https://supabase.com/dashboard/project/_/sql" target="_blank" className="text-blue-600 underline font-bold">Supabase SQL Editor</a> to fix "Table Not Found" (404) errors.
            </p>

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

      {/* Rest of the Admin UI (Tabs, etc.) remains same... */}
      <div className="flex flex-wrap justify-center md:justify-start gap-4">
         <button onClick={() => setActiveTab('PAYMENTS')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'PAYMENTS' ? 'bg-yellow-400 text-black shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><IndianRupee size={16} /> Payments {payments.length > 0 && `(${payments.length})`}</button>
         <button onClick={() => setActiveTab('USERS')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'USERS' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><User size={16} /> Cadets {users.length > 0 && `(${users.length})`}</button>
         <button onClick={() => setActiveTab('BROADCAST')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'BROADCAST' ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Radio size={16} /> Broadcast</button>
         <button onClick={() => setActiveTab('DAILY')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'DAILY' ? 'bg-teal-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><PenTool size={16} /> Daily Challenge</button>
         <button onClick={() => setActiveTab('COUPONS')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'COUPONS' ? 'bg-pink-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Tag size={16} /> Coupons</button>
         <button onClick={() => setActiveTab('PPDT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'PPDT' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Target size={16} /> PPDT Pool</button>
         <button onClick={() => setActiveTab('TAT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'TAT' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Layers size={16} /> TAT Sets</button>
         <button onClick={() => setActiveTab('WAT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'WAT' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><FileText size={16} /> WAT Bank</button>
         <button onClick={() => setActiveTab('SRT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'SRT' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Zap size={16} /> SRT Sets</button>
      </div>

      {activeTab === 'BROADCAST' ? (
          // ... (Existing Broadcast Code) ...
          <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                      <Megaphone className="text-red-600" /> System Broadcast
                  </h3>
                  <div className="space-y-6">
                      <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Alert Level</label>
                          <select 
                              value={broadcastType}
                              onChange={(e) => setBroadcastType(e.target.value as any)}
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                          >
                              <option value="INFO">Info (Blue)</option>
                              <option value="SUCCESS">Success (Green)</option>
                              <option value="WARNING">Warning (Yellow)</option>
                              <option value="URGENT">Urgent (Red)</option>
                          </select>
                      </div>
                      <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Message</label>
                          <textarea 
                              value={broadcastMsg}
                              onChange={(e) => setBroadcastMsg(e.target.value)}
                              placeholder="Attention Cadets: Maintenance scheduled for..."
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold h-32 resize-none"
                          />
                      </div>
                      <button 
                          onClick={handleUpload}
                          disabled={isUploading}
                          className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                          {isUploading ? <Loader2 className="animate-spin" /> : <Radio size={16} />} Transmit Alert
                      </button>
                  </div>
              </div>
          </div>
      ) : activeTab === 'PAYMENTS' ? (
          // ... (Existing Payments Code) ...
          <div className="space-y-6">
              {payments.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-xl">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-black text-slate-900 uppercase">All Clear</h3>
                      <p className="text-slate-500 text-xs font-bold mt-2">No pending payment approvals.</p>
                  </div>
              ) : (
                  payments.map(req => (
                      <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-2">
                          <div className="flex items-center gap-6 w-full md:w-auto">
                              <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center shrink-0">
                                  <Clock size={24} />
                              </div>
                              <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{new Date(req.created_at).toLocaleString()}</p>
                                  <h4 className="font-bold text-slate-900 text-lg">UTR: <span className="font-mono bg-slate-100 px-2 rounded">{req.utr}</span></h4>
                                  <p className="text-xs font-medium text-slate-600">
                                      {req.aspirants?.full_name || 'Unknown User'} • {req.plan_type === 'PRO_SUBSCRIPTION' ? 'Pro Plan' : 'Add-on'} • ₹{req.amount}
                                  </p>
                                  {req.coupon_code && (
                                      <p className="text-[10px] bg-pink-50 text-pink-600 px-2 py-1 rounded-lg inline-block font-bold mt-1">
                                          Coupon: {req.coupon_code}
                                      </p>
                                  )}
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
      ) : activeTab === 'DAILY' ? (
          // ... (Existing Daily Code) ...
          <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">Create Daily Dossier</h3>
                  <div className="space-y-6">
                      <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">PPDT Image</label>
                          <input type="file" ref={fileInputRef} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" accept="image/*" />
                      </div>
                      <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">5 WAT Words (Comma/Line separated)</label>
                          <textarea 
                              value={dailyWat}
                              onChange={(e) => setDailyWat(e.target.value)}
                              placeholder="Atom, Peace, War, Love, Hate"
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold h-32 resize-none"
                          />
                      </div>
                      <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">5 SRT Situations (Line separated)</label>
                          <textarea 
                              value={dailySrt}
                              onChange={(e) => setDailySrt(e.target.value)}
                              placeholder="He was going for exam and..."
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold h-32 resize-none"
                          />
                      </div>
                      <button 
                          onClick={handleUpload}
                          disabled={isUploading}
                          className="w-full py-5 bg-teal-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-teal-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                          {isUploading ? <Loader2 className="animate-spin" /> : <PenTool size={16} />} Publish Challenge
                      </button>
                  </div>
              </div>
          </div>
      ) : activeTab === 'USERS' ? (
          // ... (Existing Users Code) ...
          <div className="space-y-6">
              <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-lg flex items-center gap-4 sticky top-24 z-10">
                  <Search className="text-slate-400 ml-2" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search Cadets by Name or Email..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent font-bold text-slate-700 outline-none placeholder:text-slate-300"
                  />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredUsers.map(u => (
                      <div key={u.user_id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col justify-between group hover:border-slate-300 transition-all">
                          <div className="space-y-4 mb-6">
                              <div className="flex justify-between items-start">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${u.subscription_data?.tier === 'PRO' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 text-slate-500'}`}>
                                      {u.subscription_data?.tier === 'PRO' ? <Crown size={24} /> : <User size={24} />}
                                  </div>
                                  <div className="px-3 py-1 bg-slate-50 rounded-full text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                      {u.subscription_data?.tier || 'FREE'}
                                  </div>
                              </div>
                              <div>
                                  <h4 className="text-lg font-black text-slate-900 truncate">{u.full_name || 'Unknown Cadet'}</h4>
                                  <p className="text-xs font-medium text-slate-500 truncate">{u.email}</p>
                              </div>
                              <div className="flex gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  <Calendar size={12} /> Active: {new Date(u.last_active).toLocaleDateString()}
                              </div>
                          </div>
                          <div className="flex gap-3 pt-4 border-t border-slate-50">
                              <button 
                                onClick={() => setSelectedUser(u)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-colors"
                              >
                                  <Eye size={14} /> Details
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(u.user_id)}
                                className="p-3 bg-red-50 hover:bg-red-600 hover:text-white text-red-500 rounded-xl transition-colors"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      </div>
                  ))}
                  {filteredUsers.length === 0 && (
                      <div className="col-span-full py-12 text-center text-slate-400 font-bold italic">No cadets found matching search.</div>
                  )}
              </div>
          </div>
      ) : activeTab === 'COUPONS' ? (
          // ... (Existing Coupons Code) ...
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl sticky top-24">
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                          <Plus className="text-pink-600" /> New Coupon
                      </h3>
                      <div className="space-y-4">
                          <div>
                              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Influencer / Label</label>
                              <input 
                                  type="text" 
                                  value={influencerName}
                                  onChange={(e) => setInfluencerName(e.target.value)}
                                  placeholder="e.g. Major Gaurav Arya"
                                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Unique Code</label>
                              <input 
                                  type="text" 
                                  value={couponCode}
                                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                  placeholder="e.g. GAURAV50"
                                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold uppercase"
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Discount %</label>
                              <input 
                                  type="number" 
                                  value={couponDiscount}
                                  onChange={(e) => setCouponDiscount(e.target.value)}
                                  placeholder="25"
                                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                              />
                          </div>
                          <button 
                              onClick={handleUpload}
                              disabled={isUploading} 
                              className="w-full py-5 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 transition-all active:scale-95 bg-pink-600 hover:bg-pink-700 shadow-lg"
                          >
                              {isUploading ? <Loader2 className="animate-spin" /> : <Tag size={18} />} 
                              {isUploading ? 'Generating...' : 'Generate Coupon'}
                          </button>
                      </div>
                  </div>
              </div>
              <div className="lg:col-span-2 space-y-6">
                  {coupons.length === 0 ? (
                      <div className="p-12 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-xl text-slate-400 font-bold uppercase text-xs tracking-widest">
                          No active coupons. Create one to start tracking leads.
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {coupons.map(coupon => (
                              <div key={coupon.code} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-lg hover:shadow-xl transition-all relative group overflow-hidden">
                                  <div className="absolute top-0 right-0 bg-slate-100 px-4 py-2 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest text-slate-500">
                                      {new Date(coupon.created_at).toLocaleDateString()}
                                  </div>
                                  <div className="space-y-4">
                                      <div>
                                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Code</p>
                                          <h4 className="text-2xl font-black text-slate-900 tracking-wider">{coupon.code}</h4>
                                      </div>
                                      <div className="flex gap-4">
                                          <div>
                                              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Discount</p>
                                              <p className="text-lg font-bold text-pink-600 flex items-center gap-1"><Percent size={14} /> {coupon.discount_percent}%</p>
                                          </div>
                                          <div>
                                              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Leads Generated</p>
                                              <p className="text-lg font-bold text-green-600 flex items-center gap-1"><TrendingUp size={14} /> {coupon.usage_count}</p>
                                          </div>
                                      </div>
                                      <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                                          <p className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{coupon.influencer_name}</p>
                                          <button 
                                              onClick={() => handleDelete(coupon.code)}
                                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      ) : (
        // ... (Existing Content Management Code) ...
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: Input */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl sticky top-24">
             <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
               <Plus className="text-slate-900" /> Add Content
             </h3>
             <div className="space-y-4">
               {activeTab === 'TAT' && (
                 <div>
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Set Identifier</label>
                   <input 
                      type="text" 
                      value={setTag}
                      onChange={(e) => setSetTag(e.target.value)}
                      placeholder="e.g. Set A"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                   />
                 </div>
               )}

               {activeTab === 'WAT' && (
                 <div className="space-y-4">
                   <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Set Name / Tag</label>
                       <input 
                          type="text" 
                          value={watSetTag}
                          onChange={(e) => setWatSetTag(e.target.value)}
                          placeholder="e.g. WAT Set 1"
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                       />
                   </div>
                   <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Bulk Word Entry</label>
                       <textarea 
                          value={watBulkInput}
                          onChange={(e) => setWatBulkInput(e.target.value)}
                          placeholder="Enter words separated by commas or new lines."
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold h-40 resize-none"
                       />
                       <p className="text-[10px] text-slate-400 mt-2">Paste 60 words for a complete set.</p>
                   </div>
                 </div>
               )}

               {activeTab === 'SRT' && (
                 <div className="space-y-4">
                   <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Set Name / Tag</label>
                       <input 
                          type="text" 
                          value={srtSetTag}
                          onChange={(e) => setSrtSetTag(e.target.value)}
                          placeholder="e.g. SRT Set A"
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                       />
                   </div>
                   <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Bulk SRT Entry</label>
                       <textarea 
                          value={srtBulkInput}
                          onChange={(e) => setSrtBulkInput(e.target.value)}
                          placeholder="One situation per line."
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold h-60 resize-none"
                       />
                       <p className="text-[10px] text-slate-400 mt-2">Paste 60 situations for a full test.</p>
                   </div>
                 </div>
               )}

               {(activeTab === 'PPDT' || activeTab === 'TAT') && (
                 <div>
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Scene Context</label>
                   <input 
                      type="text" 
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Describe the action..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                   />
                 </div>
               )}

               {(activeTab === 'PPDT' || activeTab === 'TAT') && (
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                     // File handler is manual in button
                  }} />
               )}

               <button 
                  onClick={() => {
                    if (activeTab === 'WAT' || activeTab === 'SRT') handleUpload();
                    else fileInputRef.current?.click();
                  }} 
                  disabled={isUploading} 
                  className={`w-full py-5 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 transition-all active:scale-95 bg-slate-900 hover:bg-black`}
               >
                 {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={18} />} 
                 {isUploading ? 'Processing...' : (activeTab === 'WAT' || activeTab === 'SRT' ? 'Upload Content' : 'Select & Upload File')}
               </button>
               {/* Hidden file input handler - if file selected, trigger upload. (Simplification) */}
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Display */}
        <div className="lg:col-span-2 space-y-12">
           {(activeTab === 'WAT' || activeTab === 'SRT') ? (
              <div className="space-y-8">
                 {Object.keys(groupedItems).map((tag) => (
                    <div key={tag} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h4 className="font-black uppercase text-slate-900 tracking-widest flex items-center gap-2">
                                {activeTab === 'WAT' ? <FileText size={18} className="text-green-600" /> : <Zap size={18} className="text-orange-600" />} 
                                {tag} ({groupedItems[tag].length})
                            </h4>
                            <button 
                                onClick={() => handleDeleteSet(tag)}
                                className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
                            >
                                <Trash2 size={14} /> Delete Set
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {groupedItems[tag].map((item: any) => (
                                <div key={item.id} className={`px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3 group hover:border-slate-300 transition-all ${activeTab === 'SRT' ? 'w-full justify-between' : ''}`}>
                                    <span className="font-bold text-slate-700 text-sm">{activeTab === 'WAT' ? item.word : item.question}</span>
                                    <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0"><Trash2 size={12} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                 ))}
                 {items.length === 0 && (
                      <div className="w-full text-center py-12 text-slate-400 font-medium italic">
                         No custom {activeTab} content found. The system is using the built-in fallback set. Add content to override.
                      </div>
                 )}
              </div>
           ) : (
             Object.keys(groupedItems).map((tag) => (
               <div key={tag} className="space-y-4">
                 <div className="flex items-center justify-between border-b pb-2">
                   <h4 className="font-black uppercase text-slate-900 tracking-widest flex items-center gap-2">
                      <Layers size={18} className="text-purple-600" /> {tag} 
                      {activeTab === 'TAT' && <span className={`ml-2 px-2 py-0.5 rounded text-[10px] ${groupedItems[tag].length >= 11 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{groupedItems[tag].length}/11 Images</span>}
                   </h4>
                 </div>
                 {groupedItems[tag].length === 0 ? (
                   <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold text-xs uppercase tracking-widest">
                      Empty Pool. Upload images to populate this set.
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     {groupedItems[tag].map((img: any) => (
                       <div key={img.id} className="group relative bg-white rounded-[2rem] border border-slate-100 shadow-lg overflow-hidden hover:shadow-2xl transition-all">
                          <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                             <img src={img.image_url} alt="Scenario" className="w-full h-full object-cover grayscale transition-transform duration-700 group-hover:scale-110" />
                          </div>
                          <div className="p-4 flex justify-between items-center bg-white">
                             <p className="text-[10px] font-bold text-slate-600 truncate max-w-[150px] uppercase tracking-tighter">{img.description}</p>
                             <button onClick={() => handleDelete(img.id, img.image_url)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             ))
           )}
        </div>
      </div>
      )}
      
      {/* USER DETAILS MODAL */}
      {selectedUser && (
          <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl relative">
                  <div className="sticky top-0 bg-white z-10 p-6 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-xl font-black text-slate-900 uppercase">Cadet Dossier</h3>
                      <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full"><XCircle size={20} /></button>
                  </div>
                  <div className="p-8 space-y-8">
                      {/* Identity */}
                      <div className="flex items-center gap-6">
                          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black ${selectedUser.subscription_data?.tier === 'PRO' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-yellow-400'}`}>
                              {selectedUser.full_name?.substring(0, 1) || 'U'}
                          </div>
                          <div>
                              <h2 className="text-2xl font-black text-slate-900">{selectedUser.full_name}</h2>
                              <p className="text-sm font-bold text-slate-500">{selectedUser.email}</p>
                              <div className="flex gap-2 mt-2">
                                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{selectedUser.subscription_data?.tier || 'FREE'}</span>
                                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Active: {new Date(selectedUser.last_active).toLocaleDateString()}</span>
                              </div>
                          </div>
                      </div>

                      {/* PIQ Snapshot */}
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">PIQ Snapshot</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                              <div><span className="block text-[10px] text-slate-400 uppercase">Chest No</span><span className="font-bold">{selectedUser.piq_data?.chestNo || 'N/A'}</span></div>
                              <div><span className="block text-[10px] text-slate-400 uppercase">Batch</span><span className="font-bold">{selectedUser.piq_data?.batchNo || 'N/A'}</span></div>
                              <div><span className="block text-[10px] text-slate-400 uppercase">Board</span><span className="font-bold">{selectedUser.piq_data?.selectionBoard || 'N/A'}</span></div>
                              <div><span className="block text-[10px] text-slate-400 uppercase">Attempts</span><span className="font-bold">{selectedUser.piq_data?.previousAttempts?.length || 0}</span></div>
                          </div>
                      </div>

                      {/* Usage Stats */}
                      <div className="space-y-4">
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Resource Usage</h4>
                          <div className="grid grid-cols-3 gap-4">
                              <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center">
                                  <span className="block text-2xl font-black text-slate-900">{selectedUser.subscription_data?.usage?.interview_used || 0}</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Interviews</span>
                              </div>
                              <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center">
                                  <span className="block text-2xl font-black text-slate-900">{selectedUser.subscription_data?.usage?.ppdt_used || 0}</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">PPDT</span>
                              </div>
                              <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center">
                                  <span className="block text-2xl font-black text-slate-900">{selectedUser.subscription_data?.usage?.tat_used || 0}</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">TAT</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
      
      {/* CONFIRMATION MODAL OVERLAY */}
      {confirmAction && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${confirmAction.type === 'APPROVE' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                 {confirmAction.type === 'APPROVE' ? <CheckCircle size={32} /> : <XCircle size={32} />}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">Confirm {confirmAction.type === 'APPROVE' ? 'Approval' : 'Rejection'}?</h3>
                <p className="text-slate-500 text-sm mt-2 font-medium">Are you sure you want to proceed? This action cannot be undone.</p>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black uppercase text-xs tracking-widest transition-colors">Cancel</button>
                 <button onClick={executeConfirmAction} className={`flex-1 py-3 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-colors shadow-lg ${confirmAction.type === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                    Yes, {confirmAction.type === 'APPROVE' ? 'Approve' : 'Reject'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
