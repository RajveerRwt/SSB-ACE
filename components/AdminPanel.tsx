
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Plus, Image as ImageIcon, Loader2, RefreshCw, Lock, Layers, Target, Info, AlertCircle, ExternalLink, Clipboard, Check, Database, Settings, FileText, IndianRupee, CheckCircle, XCircle, Clock } from 'lucide-react';
import { 
  uploadPPDTScenario, getPPDTScenarios, deletePPDTScenario,
  uploadTATScenario, getTATScenarios, deleteTATScenario,
  uploadWATWords, getWATWords, deleteWATWord,
  getPendingPayments, approvePaymentRequest, rejectPaymentRequest
} from '../services/supabaseService';

const AdminPanel: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Inputs
  const [newDescription, setNewDescription] = useState('');
  const [setTag, setSetTag] = useState('Set 1');
  const [watBulkInput, setWatBulkInput] = useState('');
  
  // Confirmation Modal State
  const [confirmAction, setConfirmAction] = useState<{id: string, type: 'APPROVE' | 'REJECT', userId: string, planType: any} | null>(null);
  
  const [activeTab, setActiveTab] = useState<'PPDT' | 'TAT' | 'WAT' | 'PAYMENTS'>('PAYMENTS');
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
      } else {
        let data;
        if (activeTab === 'PPDT') data = await getPPDTScenarios();
        else if (activeTab === 'TAT') data = await getTATScenarios();
        else if (activeTab === 'WAT') data = await getWATWords();
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
      if (activeTab === 'WAT') {
        const words = watBulkInput.split(/[\n,]+/).map(w => w.trim()).filter(w => w);
        if (words.length === 0) throw new Error("No words entered.");
        await uploadWATWords(words);
        setWatBulkInput('');
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
      setErrorMsg(error.message || "An unknown error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  // Replaces window.confirm
  const handlePaymentAction = (id: string, action: 'APPROVE' | 'REJECT', userId: string, planType: any) => {
      setConfirmAction({ id, type: action, userId, planType });
  };

  const executeConfirmAction = async () => {
      if (!confirmAction) return;
      const { id, type, userId, planType } = confirmAction;
      setConfirmAction(null); // Close modal
      
      try {
          if (type === 'APPROVE') {
              await approvePaymentRequest(id, userId, planType);
          } else {
              await rejectPaymentRequest(id);
          }
          await fetchData(); // Refresh list
      } catch(e: any) {
          setErrorMsg(e.message || "Action failed. Check Console/RLS Policies.");
      }
  };

  const handleDelete = async (id: string, url?: string) => {
    if (!window.confirm("Delete this item permanently?")) return;
    setErrorMsg(null);
    try {
      if (activeTab === 'WAT') {
        await deleteWATWord(id);
      } else if (activeTab === 'PPDT' && url) {
        await deletePPDTScenario(id, url);
      } else if (activeTab === 'TAT' && url) {
        await deleteTATScenario(id, url);
      }
      setItems(items.filter(i => i.id !== id));
    } catch (error: any) {
      console.error("Delete failed", error);
      setErrorMsg(error.message || "Failed to delete item.");
    }
  };

  const copySQL = (sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Group TAT images by Set Tag
  const groupedImages = activeTab === 'TAT' 
    ? items.reduce((acc: any, img: any) => {
        const tag = img.set_tag || 'Unset';
        if (!acc[tag]) acc[tag] = [];
        acc[tag].push(img);
        return acc;
      }, {})
    : (activeTab === 'PPDT' ? { "All PPDT": items } : {});

  // Cleaned SQL without quotes in comments to prevent parser errors
  const storageSQL = `
-- 1. Storage Buckets & Policies (Idempotent)
insert into storage.buckets (id, name, public) 
values ('ppdt-images', 'ppdt-images', true), ('tat-images', 'tat-images', true)
on conflict (id) do nothing;

create policy "Public Select PPDT" on storage.objects for select using (bucket_id = 'ppdt-images');
create policy "Public Upload PPDT" on storage.objects for insert with check (bucket_id = 'ppdt-images');
create policy "Public Select TAT" on storage.objects for select using (bucket_id = 'tat-images');
create policy "Public Upload TAT" on storage.objects for insert with check (bucket_id = 'tat-images');

-- 2. Aspirants Table Setup
create table if not exists aspirants (
  user_id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  piq_data jsonb default '{}'::jsonb,
  last_active timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure Critical Columns Exist
alter table aspirants add column if not exists subscription_data jsonb default '{"tier": "FREE", "usage": {"ppdt_used": 0, "ppdt_limit": 5, "tat_used": 0, "tat_limit": 2, "interview_used": 0, "interview_limit": 1}, "extra_credits": {"interview": 0}}'::jsonb;

-- 3. RLS Policies for Aspirants
alter table aspirants enable row level security;

-- Drop old policies to prevent conflicts
drop policy if exists "Public Aspirants View" on aspirants;
drop policy if exists "Self Update Aspirants" on aspirants;
drop policy if exists "Self Insert Aspirants" on aspirants;
drop policy if exists "Admin Update Aspirants" on aspirants;
drop policy if exists "Admin All Aspirants" on aspirants;

-- Standard Policies
create policy "Public Aspirants View" on aspirants for select using (true);
create policy "Self Update Aspirants" on aspirants for update using (auth.uid() = user_id);
create policy "Self Insert Aspirants" on aspirants for insert with check (auth.uid() = user_id);

-- *** SUPER ADMIN POLICY (FIXES PERMISSION ERRORS) ***
-- Allows Admin to Select, Insert, Update, Delete ANY row
create policy "Admin All Aspirants" on aspirants for all
using ((select auth.jwt() ->> 'email') = 'rajveerrawat947@gmail.com')
with check ((select auth.jwt() ->> 'email') = 'rajveerrawat947@gmail.com');

-- 4. Payment Requests Table
create table if not exists payment_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references aspirants(user_id) not null,
  utr text not null unique,
  amount numeric not null,
  plan_type text not null,
  status text check (status in ('PENDING', 'APPROVED', 'REJECTED')) default 'PENDING',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table payment_requests enable row level security;
create policy "User Insert Payments" on payment_requests for insert with check (auth.uid() = user_id);
create policy "Admin View Payments" on payment_requests for select using (true);
create policy "Admin Update Payments" on payment_requests for update using (true);

-- 5. Content Tables (PPDT/TAT/WAT/History)
create table if not exists ppdt_scenarios (
  id uuid default gen_random_uuid() primary key,
  image_url text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table ppdt_scenarios enable row level security;
create policy "Public View PPDT" on ppdt_scenarios for select using (true);
create policy "Public Insert PPDT" on ppdt_scenarios for insert with check (true);

create table if not exists tat_scenarios (
  id uuid default gen_random_uuid() primary key,
  image_url text,
  description text,
  set_tag text default 'Set 1',
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table tat_scenarios enable row level security;
create policy "Public View TAT" on tat_scenarios for select using (true);
create policy "Public Insert TAT" on tat_scenarios for insert with check (true);

create table if not exists wat_words (
  id uuid default gen_random_uuid() primary key,
  word text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table wat_words enable row level security;
create policy "Public View WAT" on wat_words for select using (true);
create policy "Public Insert WAT" on wat_words for insert with check (true);

create table if not exists test_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  test_type text not null,
  score numeric,
  result_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table test_history enable row level security;
create policy "Self View History" on test_history for select using (auth.uid() = user_id);
create policy "Self Insert History" on test_history for insert with check (auth.uid() = user_id);
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
        <button onClick={fetchData} className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all text-white">
          <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {errorMsg && (
        <div className="p-6 bg-red-50 border-2 border-red-100 rounded-[2.5rem] space-y-6 animate-in slide-in-from-top-4 shadow-xl">
          <div className="flex items-start gap-4 text-red-600">
            <AlertCircle size={28} className="shrink-0 mt-1" />
            <div className="flex-1">
               <p className="text-[10px] font-black uppercase tracking-widest mb-1">Critical Security Violation</p>
               <p className="text-sm font-bold leading-relaxed">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-xs font-black uppercase p-2 hover:bg-red-100 rounded-lg">Dismiss</button>
          </div>
          
          <div className="bg-white p-8 rounded-[2rem] border border-red-200 space-y-6">
            <div className="flex items-center gap-3 text-slate-900">
              <Settings className="text-blue-600" size={24} />
              <h5 className="text-sm font-black uppercase tracking-widest">Database Setup Required:</h5>
            </div>
            
            <div className="relative group">
              <pre className="bg-slate-900 text-blue-300 p-6 rounded-2xl text-[10px] font-mono overflow-x-auto border-2 border-slate-800 leading-relaxed shadow-inner max-h-[250px]">
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

      <div className="flex flex-wrap justify-center md:justify-start gap-4">
         <button onClick={() => setActiveTab('PAYMENTS')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'PAYMENTS' ? 'bg-yellow-400 text-black shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><IndianRupee size={16} /> Payments {payments.length > 0 && `(${payments.length})`}</button>
         <button onClick={() => setActiveTab('PPDT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'PPDT' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Target size={16} /> PPDT Pool</button>
         <button onClick={() => setActiveTab('TAT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'TAT' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Layers size={16} /> TAT Sets</button>
         <button onClick={() => setActiveTab('WAT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'WAT' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><FileText size={16} /> WAT Bank</button>
      </div>

      {activeTab === 'PAYMENTS' ? (
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
                                onClick={() => handlePaymentAction(req.id, 'APPROVE', req.user_id, req.plan_type)}
                                className="flex-1 md:flex-none px-6 py-3 bg-green-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
                              >
                                  <CheckCircle size={16} /> Approve
                              </button>
                          </div>
                      </div>
                  ))
              )}
          </div>
      ) : (
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

               {activeTab === 'WAT' ? (
                 <div>
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Bulk Word Entry</label>
                   <textarea 
                      value={watBulkInput}
                      onChange={(e) => setWatBulkInput(e.target.value)}
                      placeholder="Enter words separated by commas or new lines. E.g. Army, Flag, Nation"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold h-40 resize-none"
                   />
                   <p className="text-[10px] text-slate-400 mt-2">Allows multiple entries at once.</p>
                 </div>
               ) : (
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

               {activeTab !== 'WAT' && (
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                     // Auto-trigger upload is not ideal here since we might want to add desc first, but keeping consistent with existing pattern
                     // Ideally we just select file here and upload on button click
                  }} />
               )}

               <button 
                  onClick={() => {
                    if (activeTab === 'WAT') handleUpload();
                    else fileInputRef.current?.click();
                  }} 
                  disabled={isUploading} 
                  className={`w-full py-5 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 transition-all active:scale-95 bg-slate-900 hover:bg-black`}
               >
                 {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={18} />} 
                 {isUploading ? 'Processing...' : (activeTab === 'WAT' ? 'Upload Words' : 'Select & Upload File')}
               </button>
               {/* Hidden file input handler - if file selected, trigger upload. (Simplification) */}
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Display */}
        <div className="lg:col-span-2 space-y-12">
           {activeTab === 'WAT' ? (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                 <div className="flex justify-between items-center mb-6">
                    <h4 className="font-black uppercase text-slate-900 tracking-widest flex items-center gap-2">
                       <FileText size={18} className="text-green-600" /> Database Words ({items.length})
                    </h4>
                    {items.length === 0 && <span className="text-xs text-slate-400">Using default set</span>}
                 </div>
                 <div className="flex flex-wrap gap-3">
                    {items.map((item: any) => (
                       <div key={item.id} className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3 group hover:border-slate-300 transition-all">
                          <span className="font-bold text-slate-700">{item.word}</span>
                          <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                       </div>
                    ))}
                    {items.length === 0 && (
                      <div className="w-full text-center py-12 text-slate-400 font-medium italic">
                         No custom words found. The system is using the built-in fallback set. Add words to override.
                      </div>
                    )}
                 </div>
              </div>
           ) : (
             Object.keys(groupedImages).map((tag) => (
               <div key={tag} className="space-y-4">
                 <div className="flex items-center justify-between border-b pb-2">
                   <h4 className="font-black uppercase text-slate-900 tracking-widest flex items-center gap-2">
                      <Layers size={18} className="text-purple-600" /> {tag} 
                      {activeTab === 'TAT' && <span className={`ml-2 px-2 py-0.5 rounded text-[10px] ${groupedImages[tag].length >= 11 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{groupedImages[tag].length}/11 Images</span>}
                   </h4>
                 </div>
                 {groupedImages[tag].length === 0 ? (
                   <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold text-xs uppercase tracking-widest">
                      Empty Pool. Upload images to populate this set.
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     {groupedImages[tag].map((img: any) => (
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
