
import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Play, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Upload,
  X
} from 'lucide-react';
import { getPPDTScenarios, scheduleBatchTest } from '../services/supabaseService';

interface MentorBatchControlProps {
  batchId: string;
  onTestScheduled: (newTest: any) => void;
}

const MentorBatchControl: React.FC<MentorBatchControlProps> = ({ batchId, onTestScheduled }) => {
  const [ppdtImages, setPpdtImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [view, setView] = useState<'gallery' | 'action'>('gallery');
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState('');
  
  const [scheduling, setScheduling] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [currentIST, setCurrentIST] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const istString = now.toLocaleString('en-US', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setCurrentIST(istString);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      try {
        const images = await getPPDTScenarios();
        setPpdtImages(images);
      } catch (error) {
        console.error("Error fetching PPDT images:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, []);

  const handleLiveTest = async () => {
    if (!selectedImage && !customImage) return;
    setScheduling(true);
    try {
      // Use India Timezone (IST)
      const now = new Date();
      
      const config = selectedImage ? { 
        setId: selectedImage.id,
        imageUrl: selectedImage.image_url,
        description: selectedImage.description
      } : {
        imageUrl: customImage,
        description: customDescription || "Custom Mentor Upload",
        isCustom: true
      };

      const newTest = await scheduleBatchTest(
        batchId, 
        'PPDT', 
        config, 
        now.toISOString(), // Store UTC in DB, but we'll display as IST
        undefined
      );
      
      onTestScheduled(newTest);
      setSelectedImage(null);
      setCustomImage(null);
      setCustomDescription('');
      setView('gallery');
      alert("Live Test Started Successfully!");
    } catch (error: any) {
      alert("Error starting live test: " + error.message);
    } finally {
      setScheduling(false);
    }
  };

  const handleScheduleTest = async () => {
    if ((!selectedImage && !customImage) || !scheduledAt) return;
    setScheduling(true);
    try {
      const config = selectedImage ? { 
        setId: selectedImage.id,
        imageUrl: selectedImage.image_url,
        description: selectedImage.description
      } : {
        imageUrl: customImage,
        description: customDescription || "Custom Mentor Upload",
        isCustom: true
      };

      const newTest = await scheduleBatchTest(
        batchId, 
        'PPDT', 
        config, 
        new Date(scheduledAt).toISOString(), 
        undefined
      );
      
      onTestScheduled(newTest);
      setSelectedImage(null);
      setCustomImage(null);
      setCustomDescription('');
      setView('gallery');
      setShowScheduleForm(false);
      setScheduledAt('');
      alert("Test Scheduled Successfully!");
    } catch (error: any) {
      alert("Error scheduling test: " + error.message);
    } finally {
      setScheduling(false);
    }
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImage(reader.result as string);
        setView('action');
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={24} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl mb-8 animate-in fade-in duration-700">
      {/* Header with IST Clock */}
      <div className="bg-slate-900 p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <ImageIcon size={28} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter">PPDT Mission Control</h3>
            <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest opacity-80">Select scenario to deploy assessment</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10">
          <div className="flex flex-col items-end">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">India Standard Time</p>
            <p className="text-xl font-mono font-bold tracking-tighter">{currentIST}</p>
          </div>
          <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400">
            <Clock size={20} />
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            {view === 'gallery' ? 'Available Scenarios' : 'Deployment Configuration'}
          </h4>
          {view === 'action' && (
            <button 
              onClick={() => { setView('gallery'); setSelectedImage(null); setShowScheduleForm(false); }}
              className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition-all"
            >
              <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Gallery
            </button>
          )}
        </div>

        {view === 'gallery' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {/* Custom Upload Card */}
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border-2 border-dashed border-slate-200 hover:border-blue-600 transition-all bg-slate-50 group">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleCustomUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 shadow-sm transition-colors mb-4">
                  <Upload size={24} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600">Custom Upload</p>
                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">Deploy own image</p>
              </div>
            </div>

            {ppdtImages.map((img) => (
              <button
                key={img.id}
                onClick={() => { setSelectedImage(img); setView('action'); }}
                className="group relative aspect-[4/5] rounded-3xl overflow-hidden border-2 border-transparent hover:border-blue-600 transition-all shadow-md hover:shadow-2xl hover:-translate-y-1"
              >
                <img 
                  src={img.image_url} 
                  alt={img.description} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-5">
                  <div className="bg-blue-600 text-white p-3 rounded-xl self-center mb-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <Play size={20} fill="currentColor" />
                  </div>
                  <p className="text-[9px] font-black text-white uppercase tracking-widest text-center">Select Scenario</p>
                </div>
              </button>
            ))}
            {ppdtImages.length === 0 && (
              <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <ImageIcon className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No PPDT images found in library</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-10 animate-in slide-in-from-right-8 duration-700">
            <div className="w-full lg:w-2/5 aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-slate-50 relative group">
              <img 
                src={selectedImage?.image_url || customImage || ''} 
                alt={selectedImage?.description || "Custom Upload"} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-[2.5rem]"></div>
            </div>
            
            <div className="flex-1 space-y-8">
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <ImageIcon size={64} />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-4 flex items-center gap-2">
                  <AlertCircle size={14} /> Intelligence Briefing
                </h4>
                
                {customImage ? (
                  <div className="space-y-4">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Scenario Description (Optional)</label>
                    <textarea 
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Describe the scenario for evaluation guidance..."
                      className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium italic"
                      rows={3}
                    />
                  </div>
                ) : (
                  <p className="text-base font-medium text-slate-700 italic leading-relaxed">
                    "{selectedImage?.description || "No description available for this scenario."}"
                  </p>
                )}
              </div>

              {!showScheduleForm ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <button
                    onClick={handleLiveTest}
                    disabled={scheduling}
                    className="flex flex-col items-center justify-center gap-4 p-10 bg-blue-600 text-white rounded-[2.5rem] hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-700">
                      <Play size={80} fill="currentColor" />
                    </div>
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 relative z-10">
                      <Play size={32} fill="currentColor" />
                    </div>
                    <div className="text-center relative z-10">
                      <p className="text-sm font-black uppercase tracking-[0.2em]">Live Test</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-2">Deploy Immediately</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowScheduleForm(true)}
                    disabled={scheduling}
                    className="flex flex-col items-center justify-center gap-4 p-10 bg-slate-900 text-white rounded-[2.5rem] hover:bg-black transition-all shadow-xl group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-700">
                      <Calendar size={80} />
                    </div>
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 relative z-10">
                      <Calendar size={32} />
                    </div>
                    <div className="text-center relative z-10">
                      <p className="text-sm font-black uppercase tracking-[0.2em]">Schedule</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-2">Plan for Future</p>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl space-y-8 animate-in zoom-in-95 duration-500">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h5 className="text-sm font-black uppercase tracking-tight text-slate-900">Schedule Assessment</h5>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select deployment date & time</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                        Deployment Time (IST)
                      </label>
                      <div className="relative">
                        <input 
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono font-bold text-slate-800 text-lg"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <Clock size={14} className="text-blue-600" />
                        <p className="text-[10px] text-blue-700 font-black uppercase tracking-widest">
                          Current IST: {currentIST}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        onClick={() => setShowScheduleForm(false)}
                        className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleScheduleTest}
                        disabled={!scheduledAt || scheduling}
                        className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                        {scheduling ? <Loader2 className="animate-spin" size={18} /> : (
                          <>
                            <CheckCircle size={18} />
                            Confirm Deployment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorBatchControl;
