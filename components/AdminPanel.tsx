
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Plus, Image as ImageIcon, Loader2, RefreshCw, Lock } from 'lucide-react';
import { uploadPPDTScenario, getPPDTScenarios, deletePPDTScenario } from '../services/supabaseService';

const AdminPanel: React.FC = () => {
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = async () => {
    setIsLoading(true);
    const data = await getPPDTScenarios();
    setImages(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadPPDTScenario(file, newDescription || 'Standard PPDT Scenario');
      setNewDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchImages();
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed. Ensure you have created the 'ppdt-images' bucket in Supabase.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!window.confirm("Delete this scenario permanently?")) return;
    try {
      await deletePPDTScenario(id, url);
      setImages(images.filter(img => img.id !== id));
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="bg-slate-900 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter flex items-center gap-4">
             <Lock className="text-red-500" /> Admin Command
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-xs mt-2">Manage Board Scenarios & Database</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={fetchImages} 
            className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all text-white"
            title="Refresh List"
          >
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
             <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
               <Plus className="text-blue-600" /> Add New Scenario
             </h3>
             
             <div className="space-y-4">
               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2 mb-1 block">Scene Description</label>
                 <input 
                    type="text" 
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="e.g. Group discussion near jeep..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-blue-500 transition-all"
                 />
               </div>
               
               <input 
                 type="file" 
                 ref={fileInputRef}
                 className="hidden"
                 accept="image/*"
                 onChange={handleUpload}
               />
               
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isUploading}
                 className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-70"
               >
                 {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
                 {isUploading ? 'Uploading...' : 'Select Image & Upload'}
               </button>
             </div>
             
             <p className="mt-4 text-[10px] text-slate-400 font-medium text-center">
               Images uploaded here will replace AI generation in the PPDT module.
             </p>
          </div>
        </div>

        {/* Gallery Section */}
        <div className="lg:col-span-2">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             {images.map((img) => (
               <div key={img.id} className="group relative bg-white rounded-[2rem] border border-slate-100 shadow-lg overflow-hidden transition-all hover:shadow-2xl">
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100 relative">
                     <img 
                       src={img.image_url} 
                       alt="Scenario" 
                       className="w-full h-full object-cover grayscale contrast-125 group-hover:scale-105 transition-transform duration-500"
                     />
                     <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                        PPDT
                     </div>
                  </div>
                  <div className="p-6 flex justify-between items-start">
                     <div>
                       <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                         {new Date(img.created_at).toLocaleDateString()}
                       </p>
                       <h4 className="font-bold text-slate-900 text-sm truncate max-w-[150px]">
                         {img.description || 'No description'}
                       </h4>
                     </div>
                     <button 
                       onClick={() => handleDelete(img.id, img.image_url)}
                       className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors"
                     >
                       <Trash2 size={16} />
                     </button>
                  </div>
               </div>
             ))}
             
             {images.length === 0 && !isLoading && (
               <div className="col-span-full py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <ImageIcon size={40} />
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Database Empty</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;