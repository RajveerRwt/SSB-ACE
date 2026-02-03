
import React, { useState, useRef, useEffect } from 'react';
import { Timer, Mic, Square, Save, ArrowRight, Loader2, ImagePlus, Target, Upload, Info, CheckCircle } from 'lucide-react';
import { generatePPDTStimulus, evaluatePerformance } from '../services/geminiService';
import { TestType } from '../types';
import { SSBLogo } from './Logo';

export enum PPDTStep {
  IDLE = 'IDLE',
  VIEW = 'VIEW',
  WRITE = 'WRITE',
  NARRATION = 'NARRATION',
  RESULT = 'RESULT'
}

interface PPDTTestProps {
  onSave: (result: any) => void;
  isAdmin?: boolean;
  userId?: string;
  isGuest?: boolean;
  onLoginRedirect?: () => void;
}

const PPDTTest: React.FC<PPDTTestProps> = ({ onSave, isAdmin, userId, isGuest, onLoginRedirect }) => {
  const [step, setStep] = useState<PPDTStep>(PPDTStep.IDLE);
  const [image, setImage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [story, setStory] = useState('');
  const [narration, setNarration] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const customStimulusInputRef = useRef<HTMLInputElement>(null);
  const [verifyingLimit, setVerifyingLimit] = useState(false);

  useEffect(() => {
    let interval: any;
    if (timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && step === PPDTStep.VIEW) {
      setStep(PPDTStep.WRITE);
      setTimeLeft(240); // 4 mins
    } else if (timeLeft === 0 && step === PPDTStep.WRITE) {
      setStep(PPDTStep.NARRATION);
      setTimeLeft(60); // 1 min
    }
    return () => clearInterval(interval);
  }, [timeLeft, step]);

  const handleStandardStart = async () => {
    setVerifyingLimit(true);
    try {
        const imgUrl = await generatePPDTStimulus();
        setImage(imgUrl);
        setStep(PPDTStep.VIEW);
        setTimeLeft(30);
    } catch (e) {
        console.error(e);
    } finally {
        setVerifyingLimit(false);
    }
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              setImage(ev.target?.result as string);
              setStep(PPDTStep.VIEW);
              setTimeLeft(30);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSubmit = async () => {
      setIsProcessing(true);
      try {
          const result = await evaluatePerformance(TestType.PPDT, {
              story,
              narration,
              stimulusImage: image
          });
          onSave(result);
          setStep(PPDTStep.IDLE);
          alert("PPDT Evaluation Complete. Check Dashboard.");
      } catch (e) {
          console.error(e);
          alert("Submission failed.");
      } finally {
          setIsProcessing(false);
      }
  };

  if (step === PPDTStep.IDLE) {
      return (
          <div className="max-w-4xl mx-auto text-center py-20 md:py-28 space-y-12 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-900 text-yellow-400 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3 border-8 border-slate-50 ring-4 ring-slate-100">
              <SSBLogo className="w-12 h-12 md:w-16 md:h-16" />
            </div>
            
            <div className="space-y-4">
               <h3 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter">PPDT Simulation</h3>
               <p className="text-slate-500 text-lg md:text-2xl font-medium italic max-w-lg mx-auto leading-relaxed">
                 "Your perception defines your reality. Observe, Analyze, and Lead."
               </p>
               
               <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 max-w-xl mx-auto mt-6 text-left shadow-sm">
                  <h4 className="font-black uppercase text-xs tracking-widest text-blue-800 flex items-center gap-2 mb-2">
                      <Info size={14} /> Procedure Brief
                  </h4>
                  <p className="text-xs md:text-sm font-medium text-blue-900/80 leading-relaxed">
                      You can <strong>type your story manually</strong> or <strong>write on paper and upload a photo</strong> at the end. 
                      After the writing phase, you will proceed to Narration. 
                      <br/><span className="font-bold text-blue-700 block mt-2">✨ You will receive a full detailed assessment after submission.</span>
                  </p>
               </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-8">
                <button 
                    onClick={handleStandardStart}
                    disabled={verifyingLimit}
                    className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 hover:border-slate-900 hover:shadow-2xl transition-all group relative overflow-hidden text-left"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Target size={100} />
                    </div>
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        {verifyingLimit ? <Loader2 className="animate-spin" /> : <Target size={24} />}
                    </div>
                    <h4 className="text-xl font-black uppercase text-slate-900 mb-2 tracking-tight">Standard Board Assessment</h4>
                    <p className="text-xs text-slate-500 font-medium">{isGuest ? "Trial Mode: Fixed Image Set. Login to unlock randomized sets." : "Official database images. Full psychological evaluation."}</p>
                </button>

                <button 
                    onClick={() => customStimulusInputRef.current?.click()}
                    className="bg-blue-50 p-8 rounded-[2rem] border-2 border-blue-100 hover:border-blue-500 hover:shadow-2xl transition-all group relative overflow-hidden text-left"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-blue-600">
                        <ImagePlus size={100} />
                    </div>
                    <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Upload size={24} />
                    </div>
                    <h4 className="text-xl font-black uppercase text-blue-900 mb-2 tracking-tight">Upload Custom Image</h4>
                    <p className="text-xs text-blue-700/70 font-medium">Practice with your own pictures. Unlimited attempts. Does NOT consume credits.</p>
                </button>
                <input 
                    type="file" 
                    ref={customStimulusInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleCustomUpload} 
                />
            </div>
          </div>
      );
  }

  return (
      <div className="max-w-4xl mx-auto py-10 space-y-8">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <span className="font-black text-slate-900 uppercase tracking-widest">{step} PHASE</span>
              <div className="flex items-center gap-2 font-mono font-bold text-xl text-blue-600">
                  <Timer size={20} /> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
          </div>

          {step === PPDTStep.VIEW && image && (
              <div className="bg-black rounded-3xl overflow-hidden flex items-center justify-center h-[500px]">
                  <img src={image} alt="Stimulus" className="max-h-full max-w-full object-contain grayscale" />
              </div>
          )}

          {step === PPDTStep.WRITE && (
              <div className="space-y-4">
                  <textarea 
                      value={story}
                      onChange={(e) => setStory(e.target.value)}
                      placeholder="Write your story here... (Describe characters, action, and outcome)"
                      className="w-full h-96 p-6 rounded-3xl border border-slate-200 resize-none outline-none focus:border-blue-500 font-medium text-slate-700 leading-relaxed"
                  />
                  <button 
                    onClick={() => { setStep(PPDTStep.NARRATION); setTimeLeft(60); }}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest"
                  >
                      Submit & Proceed to Narration
                  </button>
              </div>
          )}

          {step === PPDTStep.NARRATION && (
              <div className="space-y-4">
                  <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 text-yellow-800 text-sm font-medium">
                      Simulate narration. Speak out loud or type your narration script below.
                  </div>
                  <textarea 
                      value={narration}
                      onChange={(e) => setNarration(e.target.value)}
                      placeholder="Type your narration here (or transcribe it)..."
                      className="w-full h-48 p-6 rounded-3xl border border-slate-200 resize-none outline-none focus:border-blue-500 font-medium text-slate-700 leading-relaxed"
                  />
                  <button 
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className="w-full py-4 bg-green-600 text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                      {isProcessing ? <Loader2 className="animate-spin" /> : <Save size={18} />} Finish Assessment
                  </button>
              </div>
          )}
      </div>
  );
};

export default PPDTTest;
