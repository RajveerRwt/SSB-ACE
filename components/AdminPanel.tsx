
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Plus, Image as ImageIcon, Loader2, RefreshCw, Lock, Layers, Target, Info } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      const data = activeTab === 'PPDT' 
        ? await getPPDTScenarios() 
        : await getTATScenarios();
      setImages(data || []);
    } catch (e) {
      console.error(e);
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
    try {
      if (activeTab === 'PPDT') {
        await uploadPPDTScenario(file, newDescription || 'Standard PPDT Scenario');
      } else {
        await uploadTATScenario(file, newDescription || 'Standard TAT Scenario', setTag || 'Set 1');
      }
      setNewDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchImages();
    } catch (error) {
      console.error("Upload failed", error);
      alert(`Upload failed. Make sure 'tat_scenarios' table has 'set_tag' column and bucket exists.`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!window.confirm("Delete this scenario permanently?")) return;
    try {
      if (activeTab === 'PPDT') {
        await deletePPDTScenario(id, url);
      } else {
        await deleteTATScenario(id, url);
      }
      setImages(images.filter(img => img.id !== id));
    } catch (error) {
      console.error("Delete failed", error);
    }
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="bg-slate-900 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter flex items-center gap-4">
             <Lock className="text-red-500" /> Admin Panel
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-xs mt-2">Manage Board Scenarios</p>
        </div>
        <button onClick={fetchImages} className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all text-white">
          <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex justify-center md:justify-start gap-4">
         <button onClick={() => setActiveTab('PPDT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'PPDT' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}><Target size={16} /> PPDT</button>
         <button onClick={() => setActiveTab('TAT')} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${activeTab === 'TAT' ? 'bg-purple-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}><Layers size={16} /> TAT (Sets)</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
             <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
               <Plus className={activeTab === 'PPDT' ? "text-blue-600" : "text-purple-600"} /> Add {activeTab}
             </h3>
             <div className="space-y-4">
               {activeTab === 'TAT' && (
                 <div>
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Set Name/Tag</label>
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
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Description</label>
                 <input 
                    type="text" 
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="e.g. Group discussion..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                 />
               </div>
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
               <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className={`w-full py-5 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 ${activeTab === 'PPDT' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                 {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={18} />} {isUploading ? 'Uploading...' : 'Upload Image'}
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
                    {activeTab === 'TAT' && <span className={`ml-2 px-2 py-0.5 rounded text-[10px] ${groupedImages[tag].length >= 11 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{groupedImages[tag].length}/11 images</span>}
                 </h4>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 {groupedImages[tag].map((img: any) => (
                   <div key={img.id} className="group relative bg-white rounded-[2rem] border border-slate-100 shadow-lg overflow-hidden">
                      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                         <img src={img.image_url} alt="Scenario" className="w-full h-full object-cover grayscale" />
                      </div>
                      <div className="p-4 flex justify-between items-center">
                         <p className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{img.description}</p>
                         <button onClick={() => handleDelete(img.id, img.image_url)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                   </div>
                 ))}
               </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
