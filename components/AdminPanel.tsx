
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Plus, Image as ImageIcon, Loader2, RefreshCw, Lock, Layers, Target, Info, AlertCircle, ExternalLink, Clipboard, Check, Database, Settings, FileText, IndianRupee, CheckCircle, XCircle, Clock, Zap, User, Search, Eye, Crown, Calendar, Tag, TrendingUp, Percent, PenTool, Megaphone, Radio, Star, MessageSquare, Mic, List, Users, Activity, BarChart3, PieChart, Filter, MailWarning, UserCheck, Brain, FileSignature, ToggleLeft, ToggleRight, ScrollText, Gauge, Coins, Wallet, History, X, Lightbulb, ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { 
  uploadPPDTScenario, getPPDTScenarios, deletePPDTScenario,
  uploadTATScenario, getTATScenarios, deleteTATScenario,
  uploadWATWords, getWATWords, deleteWATWord, deleteWATSet,
  getSRTQuestions, uploadSRTQuestions, deleteSRTQuestion, deleteSRTSet,
  getPendingPayments, approvePaymentRequest, rejectPaymentRequest,
  getAllUsers, deleteUserProfile, getCoupons, createCoupon, deleteCoupon,
  uploadDailyChallenge, sendAnnouncement, getAllFeedback, deleteFeedback,
  getLatestDailyChallenge, getTickerConfig, updateTickerConfig,
  getOIRSets, createOIRSet, deleteOIRSet, getOIRQuestions, addOIRQuestion, deleteOIRQuestion, supabase
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

  const [activeTab, setActiveTab] = useState<'PPDT' | 'TAT' | 'WAT' | 'SRT' | 'PAYMENTS' | 'USERS' | 'COUPONS' | 'DAILY' | 'BROADCAST' | 'FEEDBACK' | 'OIR'>('PAYMENTS');
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
      if (!window.confirm("CRITICAL: Delete User and History?")) return;
      try {
          await deleteUserProfile(userId);
          setUsers(users.filter(u => u.user_id !== userId));
      } catch (e: any) {
          setErrorMsg(e.message || "Failed to delete user.");
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

  const groupedItems = items.reduce((acc: any, item: any) => {
      const tag = item.set_tag || 'General';
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(item);
      return acc;
  }, {});

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
              <div className="text-blue-900">
                  <h4 className="font-black uppercase text-xs tracking-widest mb-2">Supabase SQL Setup Required</h4>
                  <p className="text-sm mb-2">Run the provided SQL in your Supabase SQL Editor to enable all features.</p>
              </div>
          )}
        </div>
      )}

      {/* TABS */}
      <div className="flex flex-wrap justify-center md:justify-start gap-4">
         <button onClick={() => setActiveTab('PAYMENTS')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'PAYMENTS' ? 'bg-yellow-400 text-black shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><IndianRupee size={16} /> Payments {payments.length > 0 && `(${payments.length})`}</button>
         <button onClick={() => setActiveTab('USERS')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'USERS' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><User size={16} /> Cadets</button>
         <button onClick={() => setActiveTab('OIR')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'OIR' ? 'bg-teal-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Lightbulb size={16} /> OIR Test</button>
         <button onClick={() => setActiveTab('PPDT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'PPDT' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><ImageIcon size={16} /> PPDT</button>
         <button onClick={() => setActiveTab('TAT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'TAT' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Layers size={16} /> TAT</button>
         <button onClick={() => setActiveTab('WAT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'WAT' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Zap size={16} /> WAT</button>
         <button onClick={() => setActiveTab('SRT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'SRT' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Brain size={16} /> SRT</button>
         <button onClick={() => setActiveTab('DAILY')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'DAILY' ? 'bg-teal-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Clock size={16} /> Daily Challenge</button>
         <button onClick={() => setActiveTab('COUPONS')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'COUPONS' ? 'bg-pink-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Tag size={16} /> Coupons</button>
         <button onClick={() => setActiveTab('BROADCAST')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'BROADCAST' ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Megaphone size={16} /> Broadcast</button>
         <button onClick={() => setActiveTab('FEEDBACK')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'FEEDBACK' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><MessageSquare size={16} /> Feedback</button>
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
                              <div className="grid grid-cols-2 gap-4">
                                  {oirOptions.map((opt, i) => (
                                      <div key={i} className="flex gap-2 items-center">
                                          <input type="radio" checked={oirCorrectIdx === i} onChange={() => setOirCorrectIdx(i)} className="w-4 h-4 accent-teal-600" />
                                          <input value={opt} onChange={e => { const newOpts = [...oirOptions]; newOpts[i] = e.target.value; setOirOptions(newOpts); }} placeholder={`Option ${i+1}`} className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none font-bold text-sm" />
                                      </div>
                                  ))}
                              </div>
                              <button onClick={handleUpload} disabled={isUploading} className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-teal-700 transition-all flex items-center justify-center gap-2">
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
                                          <div className="flex gap-2 mt-2">
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

      {/* OTHER TABS */}
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

      {/* USERS, PAYMENTS, COUPONS, DAILY, BROADCAST, FEEDBACK - Restored */}
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

      {activeTab === 'USERS' && (
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-900 uppercase">Cadet Roster ({users.length})</h3>
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="p-3 bg-slate-50 rounded-xl text-xs font-bold" />
              </div>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {users.filter(u => u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                      <div key={u.user_id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                          <div>
                              <h4 className="font-bold text-slate-900 text-sm">{u.full_name || 'Cadet'}</h4>
                              <p className="text-[10px] text-slate-500">{u.email}</p>
                              <div className="flex gap-2 mt-1">
                                  <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">{u.subscription_data?.tier}</span>
                                  <span className="text-[9px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold">{u.subscription_data?.coins} Coins</span>
                              </div>
                          </div>
                          <button onClick={() => handleDeleteUser(u.user_id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                      </div>
                  ))}
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

      {activeTab === 'DAILY' && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest">Publish Daily Challenge</h3>
              <div className="space-y-4">
                  <div>
                      <label className="text-[10px] font-black uppercase text-slate-400">OIR Question</label>
                      <input type="file" ref={fileInputRef} className="mb-2 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                      <input value={dailyOirText} onChange={e => setDailyOirText(e.target.value)} placeholder="Text (Optional)" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" />
                  </div>
                  <div>
                      <label className="text-[10px] font-black uppercase text-slate-400">WAT Word</label>
                      <input value={dailyWat} onChange={e => setDailyWat(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" />
                  </div>
                  <div>
                      <label className="text-[10px] font-black uppercase text-slate-400">SRT Situation</label>
                      <input value={dailySrt} onChange={e => setDailySrt(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" />
                  </div>
                  <div>
                      <label className="text-[10px] font-black uppercase text-slate-400">Interview Question</label>
                      <input value={dailyInterview} onChange={e => setDailyInterview(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" />
                  </div>
                  <button onClick={handleUpload} disabled={isUploading} className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-teal-700">Publish Challenge</button>
              </div>
          </div>
      )}

      {activeTab === 'BROADCAST' && (
          <div className="space-y-8">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2"><Megaphone size={24} className="text-red-600"/> Push Notification</h3>
                  <div className="flex gap-4 mb-4">
                      {['INFO', 'WARNING', 'SUCCESS', 'URGENT'].map(t => (
                          <button key={t} onClick={() => setBroadcastType(t as any)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${broadcastType === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>{t}</button>
                      ))}
                  </div>
                  <div className="flex gap-4">
                      <input value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="Message..." className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold text-sm" />
                      <button onClick={handleUpload} className="px-8 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700">Send</button>
                  </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2"><ScrollText size={24} className="text-blue-600"/> Update Ticker</h3>
                  <div className="space-y-4">
                      <input value={tickerMsg} onChange={e => setTickerMsg(e.target.value)} placeholder="Scrolling Message..." className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" />
                      <div className="flex gap-4 items-center">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={isTickerActive} onChange={e => setIsTickerActive(e.target.checked)} /> Active</label>
                          <input type="range" min="10" max="60" value={tickerSpeed} onChange={e => setTickerSpeed(parseInt(e.target.value))} className="w-32" />
                          <span className="text-xs font-bold text-slate-400">{tickerSpeed}s</span>
                      </div>
                      <button onClick={handleUpdateTicker} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700">Update Ticker</button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'FEEDBACK' && (
          <div className="space-y-4">
              {feedbackList.map((f: any) => (
                  <div key={f.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start">
                      <div>
                          <div className="flex items-center gap-2 mb-2">
                              <Star className="fill-yellow-400 text-yellow-400" size={16} />
                              <span className="font-black text-slate-900">{f.rating}/5</span>
                              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase">{f.test_type}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-700 italic">"{f.comments}"</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">{f.aspirants?.full_name || 'User'} • {new Date(f.created_at).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => handleDelete(f.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                  </div>
              ))}
          </div>
      )}

      {confirmAction && (
          <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl text-center space-y-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${confirmAction.type === 'APPROVE' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {confirmAction.type === 'APPROVE' ? <CheckCircle size={32} /> : <XCircle size={32} />}
                  </div>
                  <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Confirm {confirmAction.type}</h3>
                      <p className="text-slate-500 font-bold text-xs mt-2">
                          Are you sure you want to {confirmAction.type.toLowerCase()} this transaction?
                      </p>
                  </div>
                  <div className="flex gap-4">
                      <button onClick={() => setConfirmAction(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200">Cancel</button>
                      <button onClick={executeConfirmAction} className={`flex-1 py-4 rounded-xl font-black uppercase text-xs tracking-widest text-white ${confirmAction.type === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Confirm</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
