
import React, { useState, useEffect, useRef } from 'react';
import { 
  Timer, CheckCircle, Upload, Loader2, Image as ImageIcon, 
  FileText, AlertCircle, Eye, PenTool, BookOpen, 
  Zap, Clock, ShieldCheck, ChevronRight, X, Camera
} from 'lucide-react';
import { transcribeHandwrittenStory } from '../services/geminiService';
import { submitBatchTest } from '../services/supabaseService';
import { SSBLogo } from './Logo';
import CameraModal from './CameraModal';

enum TestStep {
  INSTRUCTIONS,
  IMAGE,
  CHARACTER_MARKING,
  STORY_WRITING,
  UPLOAD,
  SUBMITTING,
  COMPLETED
}

interface BatchPPDTTestProps {
  userId: string;
  batchTestId: string;
  config: {
    imageUrl: string;
    description: string;
  };
  onComplete: () => void;
}

const BatchPPDTTest: React.FC<BatchPPDTTestProps> = ({ userId, batchTestId, config, onComplete }) => {
  const [step, setStep] = useState<TestStep>(TestStep.INSTRUCTIONS);
  const [timeLeft, setTimeLeft] = useState(0);
  const [story, setStory] = useState('');
  const [characters, setCharacters] = useState<{ sex: string, age: string, mood: string }[]>([]);
  const [characterInput, setCharacterInput] = useState({ sex: 'M', age: '', mood: 'Positive' });
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const triggerBuzzer = () => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (ctx) {
      const playTone = (freq: number, start: number, duration: number = 0.5) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration + 0.1);
      };
      playTone(200, 0, 1.0);
    }
  };

  useEffect(() => {
    if (timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0) {
      if (step === TestStep.IMAGE) {
        triggerBuzzer();
        setStep(TestStep.CHARACTER_MARKING);
        setTimeLeft(60); // 1 minute
      } else if (step === TestStep.CHARACTER_MARKING) {
        triggerBuzzer();
        setStep(TestStep.STORY_WRITING);
        setTimeLeft(240); // 4 minutes
      } else if (step === TestStep.STORY_WRITING) {
        triggerBuzzer();
        setStep(TestStep.UPLOAD);
      }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, step]);

  const handleStart = () => {
    initAudio();
    setStep(TestStep.IMAGE);
    setTimeLeft(30); // 30 seconds
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsTranscribing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setUploadedImage(base64);
      try {
        const text = await transcribeHandwrittenStory(base64, file.type);
        if (text && !text.includes("Transcription unavailable")) {
          setStory(text);
        }
      } catch (err) {
        console.error("Transcription error:", err);
      } finally {
        setIsTranscribing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!story && !uploadedImage) {
      setError("Please provide your story (text or image).");
      return;
    }

    setStep(TestStep.SUBMITTING);
    try {
      const submissionData = {
        story,
        characters,
        uploadedImage,
        test_config: config,
        submitted_at: new Date().toISOString()
      };

      await submitBatchTest(batchTestId, userId, submissionData);
      setStep(TestStep.COMPLETED);
    } catch (err: any) {
      setError(err.message || "Error submitting test");
      setStep(TestStep.UPLOAD);
    }
  };

  if (step === TestStep.INSTRUCTIONS) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-6 text-center space-y-12 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-slate-900 text-yellow-400 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl border-8 border-slate-50">
          <SSBLogo className="w-12 h-12" />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Batch PPDT Assessment</h2>
          <p className="text-slate-500 font-medium italic">Standard Board Protocol: 30s Perception • 1m Marking • 4m Writing</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <Eye className="text-blue-600 mx-auto mb-3" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 1</p>
            <p className="text-xs font-bold text-slate-700 mt-1">30s Perception</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <PenTool className="text-purple-600 mx-auto mb-3" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 2</p>
            <p className="text-xs font-bold text-slate-700 mt-1">1m Marking</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <BookOpen className="text-slate-900 mx-auto mb-3" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 3</p>
            <p className="text-xs font-bold text-slate-700 mt-1">4m Writing</p>
          </div>
        </div>
        <button 
          onClick={handleStart}
          className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-3 mx-auto"
        >
          <Zap size={18} /> Start Assessment
        </button>
      </div>
    );
  }

  if (step === TestStep.IMAGE) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-0 z-50">
        <div className="w-full h-full relative">
          <img src={config.imageUrl} className="w-full h-full object-contain" alt="PPDT Stimulus" />
        </div>
      </div>
    );
  }

  if (step === TestStep.CHARACTER_MARKING || step === TestStep.STORY_WRITING) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-6 space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${step === TestStep.CHARACTER_MARKING ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
              {step === TestStep.CHARACTER_MARKING ? <PenTool size={28} /> : <BookOpen size={28} />}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                {step === TestStep.CHARACTER_MARKING ? 'Character Marking' : 'Story Composition'}
              </h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                {step === TestStep.CHARACTER_MARKING ? 'Mark on your physical answer sheet' : 'Narrate the Past, Present & Future'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-12 space-y-6">
            {step === TestStep.CHARACTER_MARKING ? (
              <div className="bg-white rounded-[2.5rem] p-12 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-6 min-h-[500px]">
                <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-[2rem] flex items-center justify-center animate-pulse">
                  <PenTool size={40} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Mark Characters Now</h4>
                  <p className="text-slate-500 font-medium italic max-w-md mx-auto">
                    Use your physical PPDT answer sheet to mark the age, sex, and mood of the characters you observed.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm min-h-[500px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Story</label>
                  </div>
                  <textarea 
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                    placeholder="Narrate your story here..."
                    className="flex-1 w-full p-0 bg-transparent border-none focus:ring-0 text-lg font-medium leading-relaxed text-slate-700 resize-none placeholder:italic placeholder:text-slate-300"
                  />
                </div>

                {/* Quick Upload Options during writing */}
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => document.getElementById('writing-file-upload')?.click()}
                    className="p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center gap-4 hover:border-blue-400 transition-all group shadow-sm"
                  >
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Handwritten</p>
                      <p className="text-xs font-bold text-slate-700">Upload Sheet</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => setShowCamera(true)}
                    className="p-6 bg-slate-900 text-white rounded-[2rem] flex items-center gap-4 hover:bg-black transition-all group shadow-xl"
                  >
                    <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Camera size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Instant</p>
                      <p className="text-xs font-bold text-white">Use Camera</p>
                    </div>
                  </button>
                  <input id="writing-file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </div>

                {uploadedImage && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center">
                        <CheckCircle size={16} />
                      </div>
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Sheet Attached Successfully</p>
                    </div>
                    <button onClick={() => setUploadedImage(null)} className="text-emerald-400 hover:text-red-500">
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {showCamera && (
          <CameraModal 
            isOpen={showCamera} 
            onClose={() => setShowCamera(false)} 
            onCapture={(base64) => {
              setUploadedImage(base64.split(',')[1]);
              setShowCamera(false);
            }} 
          />
        )}
      </div>
    );
  }

  if (step === TestStep.UPLOAD || step === TestStep.SUBMITTING) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 space-y-8 animate-in fade-in duration-700">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Final Submission</h2>
          <p className="text-slate-500 font-medium italic">Upload your handwritten sheet or finalize your typed story.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <FileText size={24} />
            </div>
            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Typed Story</h4>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 max-h-60 overflow-y-auto">
              <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                {story || "No text provided. Please upload an image of your handwritten story."}
              </p>
            </div>
            <button 
              onClick={() => setStep(TestStep.STORY_WRITING)}
              className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline"
            >
              Edit Story Text
            </button>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
              <Upload size={24} />
            </div>
            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Handwritten Sheet</h4>
            
            {uploadedImage ? (
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner">
                <img src={`data:image/jpeg;base64,${uploadedImage}`} className="w-full h-full object-cover" alt="Upload" />
                <button 
                  onClick={() => setUploadedImage(null)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-xl shadow-xl"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button 
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="w-full py-12 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                >
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 group-hover:text-blue-600 rounded-xl flex items-center justify-center transition-colors">
                    <Upload size={24} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600">Upload Photo</p>
                </button>
                <button 
                  onClick={() => setShowCamera(true)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                >
                  <Camera size={16} /> Use Camera
                </button>
              </div>
            )}
            <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="flex justify-center pt-8">
          <button 
            onClick={handleSubmit}
            disabled={step === TestStep.SUBMITTING || isTranscribing}
            className="px-16 py-6 bg-green-600 text-white rounded-full font-black uppercase text-sm tracking-[0.3em] shadow-xl shadow-green-600/20 hover:bg-green-700 transition-all flex items-center gap-4 disabled:opacity-50"
          >
            {step === TestStep.SUBMITTING ? <Loader2 className="animate-spin" /> : <CheckCircle size={24} />}
            {step === TestStep.SUBMITTING ? 'Deploying to Mentor...' : 'Submit to Mentor'}
          </button>
        </div>

        {showCamera && (
          <CameraModal 
            isOpen={showCamera} 
            onClose={() => setShowCamera(false)} 
            onCapture={(base64) => {
              setUploadedImage(base64.split(',')[1]);
              setShowCamera(false);
            }} 
          />
        )}
      </div>
    );
  }

  if (step === TestStep.COMPLETED) {
    return (
      <div className="max-w-2xl mx-auto py-28 px-6 text-center space-y-8 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-green-500/30">
          <CheckCircle size={48} />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Mission Accomplished</h2>
          <p className="text-slate-500 font-medium italic">Your story has been successfully deployed to your mentor's dashboard for evaluation.</p>
        </div>
        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Next Steps</p>
          <p className="text-sm text-slate-600 font-medium">Wait for your mentor to review your submission. You will be notified once the results are published.</p>
        </div>
        <button 
          onClick={onComplete}
          className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all"
        >
          Return to Batch
        </button>
      </div>
    );
  }

  return null;
};

export default BatchPPDTTest;
