import React, { useState, useEffect } from 'react';
import { ImageIcon, FileText, CheckCircle, Sparkles } from 'lucide-react';

const DemoShowcase: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: 'image',
      title: '1. See the Picture',
      icon: ImageIcon,
      content: (
        <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 flex items-center justify-center">
          <img
            src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80"
            alt="PPDT Example"
            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
          />
          <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg font-bold tracking-widest uppercase shadow-lg">
            Hazy Image Shown for 30s
          </div>
        </div>
      )
    },
    {
      id: 'story',
      title: '2. Write Your Story',
      icon: FileText,
      content: (
        <div className="w-full h-64 md:h-80 bg-yellow-50 rounded-xl p-6 border border-yellow-200 shadow-inner overflow-y-auto relative text-left">
          <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400"></div>
          <div className="flex gap-4 mb-4 border-b border-yellow-200 pb-4">
            <div className="flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Action</span>
              <span className="text-sm font-bold text-slate-800">Organizing a study camp</span>
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Characters</span>
              <span className="text-sm font-bold text-slate-800">3 (2M, 1F), Positive</span>
            </div>
          </div>
          <p className="text-slate-700 font-medium leading-relaxed text-sm italic">
            "Ram, a final year student, noticed his juniors were struggling with the new syllabus. He gathered his friends, collected previous year papers, and organized a 3-day study camp. He divided the topics among his peers based on their strengths. Through collaborative learning and daily mock tests, they covered the entire syllabus. In the end, everyone passed with flying colors and thanked Ram for his initiative."
          </p>
        </div>
      )
    },
    {
      id: 'assessment',
      title: '3. Get AI Assessment',
      icon: CheckCircle,
      content: (
        <div className="w-full h-64 md:h-80 bg-slate-900 rounded-xl p-6 border border-slate-700 shadow-inner overflow-y-auto relative text-left">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
              <Sparkles size={16} className="text-yellow-400" /> AI Evaluation
            </h4>
            <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-black border border-green-500/30 uppercase tracking-widest">
              Recommended
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">OLQs Detected</span>
              <div className="flex flex-wrap gap-2">
                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-[10px] font-bold border border-blue-500/20">Organizing Ability</span>
                <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-[10px] font-bold border border-purple-500/20">Initiative</span>
                <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-[10px] font-bold border border-yellow-500/20">Cooperation</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Feedback</span>
              <p className="text-slate-300 text-xs leading-relaxed">
                Excellent story structure. The action is practical and constructive. You clearly identified a problem and took logical steps to solve it using available resources. Good demonstration of leadership.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4000); // Auto-slide every 4 seconds
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="w-full bg-white rounded-[2rem] p-6 md:p-8 shadow-xl border border-slate-100 mb-12 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none"></div>
      
      <div className="text-center mb-8 relative z-10">
        <h3 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">
          How It Works
        </h3>
        <p className="text-slate-500 font-medium text-sm">
          Experience military-grade AI evaluation in 3 simple steps.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
        {/* Left: Navigation/Steps */}
        <div className="w-full md:w-1/3 space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = activeStep === index;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(index)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-300 flex items-center gap-4 ${
                  isActive 
                    ? 'bg-slate-900 text-white shadow-lg scale-105' 
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-200'}`}>
                  <Icon size={20} className={isActive ? 'text-white' : 'text-slate-600'} />
                </div>
                <span className="font-bold text-sm tracking-wide">{step.title}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Content Window */}
        <div className="w-full md:w-2/3 relative">
          <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100 shadow-inner">
             {/* Content transition wrapper */}
             <div className="relative overflow-hidden rounded-xl bg-white animate-in fade-in zoom-in-95 duration-500" key={activeStep}>
                {steps[activeStep].content}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoShowcase;
