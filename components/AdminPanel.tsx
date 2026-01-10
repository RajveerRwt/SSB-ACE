
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Plus, Image as ImageIcon, Loader2, RefreshCw, Lock, Layers, Target, Info, AlertCircle, ExternalLink, Clipboard, Check, Database, Settings } from 'lucide-react';
import { 
  uploadPPDTScenario, getPPDTScenarios, deletePPDTScenario,
  uploadTATScenario, getTATScenarios, deleteTATScenario 
} from '../services/supabaseService';

const AdminPanel: React.FC = () => {
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [setTag, setSetTag] = useState('Set 1');
  const [activeTab, setActiveTab] = useState<'PPDT' | 'TAT'>('PPDT');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = activeTab === 'PPDT' 
        ? await getPPDTScenarios() 
        : await getTATScenarios();
      setImages(data || []);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Failed to fetch data.");
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [activeTab]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg(null);
    try {
      if (activeTab === 'PPDT') {
        await uploadPPDTScenario(file, newDescription || 'Standard PPDT Scenario');
      } else {
        await uploadTATScenario(file, newDescription || 'Standard TAT Scenario', setTag || 'Set 1');
      }
      setNewDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchImages();
    } catch (error: any) {
      console.error("Upload failed", error);
      setErrorMsg(error.message || "An unknown error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!window.confirm("Delete this scenario permanently?")) return;
    setErrorMsg(null);
    try {
      if (activeTab === 'PPDT') {
        await deletePPDTScenario(id, url);
      } else {
        await deleteTATScenario(id, url);
      }
      setImages(images.filter(img => img.id !== id));
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
    ? images.reduce((acc: any, img: any) => {
        const tag = img.set_tag || 'Unset';
        if (!acc[tag]) acc[tag] = [];
        acc[tag].push(img);
        return acc;
      }, {})
    : { "All PPDT": images };

  const storageSQL = `-- STEP 1: CREATE BUCKETS
-- Go to Storage > New Bucket and create these TWO buckets:
-- 1. 'ppdt-images'
-- 2. 'tat-images'
-- Make sure to toggle 'Public' to ON for both.

-- STEP 2: RUN THIS SQL FOR STORAGE POLICIES
-- Copy/Paste this into the SQL Editor:

-- Policies for PPDT
CREATE POLICY "Public Upload PPDT" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ppdt-images');
CREATE POLICY "Public Select PPDT" ON storage.objects FOR SELECT USING (bucket_id = 'ppdt-images');
CREATE POLICY "Public Delete PPDT" ON storage.objects FOR DELETE USING (bucket_id = 'ppdt-images');

-- Policies for TAT
CREATE POLICY "Public Upload TAT" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tat-images');
CREATE POLICY "Public Select TAT" ON storage.objects FOR SELECT USING (bucket_id = 'tat-images');
CREATE POLICY "Public Delete TAT" ON storage.objects FOR DELETE USING (bucket_id = 'tat-images');

-- STEP 3: ENABLE TABLE ACCESS
ALTER TABLE ppdt_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access PPDT Table" ON ppdt_scenarios FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tat_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access TAT Table" ON tat_scenarios FOR ALL USING (true) WITH CHECK (true);
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
        <button onClick={fetchImages} className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all text-white">
          <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {errorMsg && (
        <div className="p-6 bg-red-50 border-2 border-red-100 rounded-[2.5rem] space-y-6 animate-in slide-in-from-top-4 shadow-xl">
          <div className="flex items-start gap-4 text-red-600">
            <AlertCircle size={28} className="shrink-0 mt-1" />
            <div className="flex-1">
               <p className="text-[10px] font-black uppercase tracking-widest mb-1">Critical Security Violation (403 Forbidden)</p>
               <p className="text-sm font-bold leading-relaxed">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-xs font-black uppercase p-2 hover:bg-red-100 rounded-lg">Dismiss</button>
          </div>
          
          <div className="bg-white p-8 rounded-[2rem] border border-red-200 space-y-6">
            <div className="flex items-center gap-3 text-slate-900">
              <Settings className="text-blue-600" size={24} />
              <h5 className="text-sm font-black uppercase tracking-widest">How to fix this in 3 steps:</h5>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-black">1</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Create Buckets</p>
                </div>
                <p className="text-xs font-medium text-slate-600">Go to <b>Storage</b> in Supabase. Create two buckets exactly named: <code className="bg-slate-100 px-1 rounded">tat-images</code> and <code className="bg-slate-100 px-1 rounded">ppdt-images</code>.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-black">2</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Set to Public</p>
                </div>
                <p className="text-xs font-medium text-slate-600">Ensure both buckets have the <b>"Public"</b> toggle set to ON in the bucket settings.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-black">3</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Run SQL Fix</p>
                </div>
                <p className="text-xs font-medium text-slate-600">Copy the code block below and paste it into your <b>SQL Editor</b> in the Supabase Dashboard.</p>
              </div>
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
                href="https://supabase.com/dashboard/project/_/storage/buckets" 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"
              >
                <Database size={14} /> Open Storage Dash <ExternalLink size={12} />
              </a>
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

      <div className="flex justify-center md:justify-start gap-4">
         <button onClick={() => setActiveTab('PPDT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'PPDT' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Target size={16} /> PPDT Pool</button>
         <button onClick={() => setActiveTab('TAT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'TAT' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Layers size={16} /> TAT Sets</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl sticky top-24">
             <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
               <Plus className={activeTab === 'PPDT' ? "text-blue-600" : "text-purple-600"} /> Upload Scenario
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
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
               <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className={`w-full py-5 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 transition-all active:scale-95 ${activeTab === 'PPDT' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                 {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={18} />} {isUploading ? 'Transferring...' : 'Select File'}
               </button>
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-12">
           {Object.keys(groupedImages).map((tag) => (
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
           ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
