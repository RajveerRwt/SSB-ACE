
import React from 'react';
import { Camera, Mic, Wifi, ShieldCheck, ClipboardList, Mic2, Brain, UserCheck, ChevronRight, AlertTriangle, MonitorPlay, LogIn, Lock } from 'lucide-react';
import { TestType } from '../types';

const HowToUse: React.FC<{ onNavigate: (t: TestType) => void }> = ({ onNavigate }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
         <div className="relative z-10 space-y-4">
            <span className="px-4 py-1.5 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">Standard Operating Procedure</span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Platform <span className="text-blue-500">Usage Guide</span></h1>
            <p className="text-slate-400 max-w-2xl font-medium leading-relaxed text-sm md:text-base">
               "This platform simulates the high-stress environment of the Services Selection Board. Adhere to the following protocols to ensure accurate assessment by the AI Interviewing Officer and Psychologists."
            </p>
         </div>
         <ShieldCheck className="absolute top-1/2 -right-12 -translate-y-1/2 w-64 h-64 text-white/5 rotate-12 pointer-events-none" />
      </div>

      {/* SYSTEM REQUIREMENTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
               <Camera size={32} />
            </div>
            <div>
               <h4 className="font-black text-slate-900 uppercase text-sm tracking-widest">Video Hardware</h4>
               <p className="text-slate-500 text-xs mt-2 font-medium">A working webcam is mandatory. The AI IO observes your body language, eye contact, and posture.</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex flex-col items-center text-center space-y-4">
            <div className="bg-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center text-purple-600">
               <Mic size={32} />
            </div>
            <div>
               <h4 className="font-black text-slate-900 uppercase text-sm tracking-widest">Audio Input</h4>
               <p className="text-slate-500 text-xs mt-2 font-medium">Use noise-cancelling headphones or sit in a silent room. The AI transcribes speech in real-time.</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex flex-col items-center text-center space-y-4">
            <div className="bg-green-50 w-16 h-16 rounded-2xl flex items-center justify-center text-green-600">
               <Wifi size={32} />
            </div>
            <div>
               <h4 className="font-black text-slate-900 uppercase text-sm tracking-widest">Connectivity</h4>
               <p className="text-slate-500 text-xs mt-2 font-medium">Stable broadband (4G/5G/WiFi) is required for low-latency voice interaction with the virtual IO.</p>
            </div>
         </div>
      </div>

      {/* PROCESS FLOW */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 md:p-12">
         <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
            <MonitorPlay className="text-blue-600" /> Assessment Workflow
         </h3>
         
         <div className="space-y-8 relative before:absolute before:left-4 md:before:left-8 before:top-0 before:h-full before:w-0.5 before:bg-slate-100">
            {/* Step 1 */}
            <div className="relative pl-12 md:pl-20">
               <div className="absolute left-0 top-0 w-8 h-8 md:w-16 md:h-16 bg-slate-900 text-white rounded-xl md:rounded-2xl flex items-center justify-center font-black text-sm md:text-xl shadow-lg border-4 border-white z-10">1</div>
               <div className="space-y-2">
                  <h4 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-wide">Authentication</h4>
                  <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">
                     Login is required to save your progress and test history. Guest users have limited access.
                  </p>
                  <button onClick={() => onNavigate(TestType.LOGIN)} className="mt-2 text-[10px] font-black uppercase text-blue-600 flex items-center gap-1 hover:underline">
                     Go to Login <ChevronRight size={12} />
                  </button>
               </div>
            </div>

            {/* Step 2 */}
            <div className="relative pl-12 md:pl-20">
               <div className="absolute left-0 top-0 w-8 h-8 md:w-16 md:h-16 bg-white border-2 border-slate-200 text-slate-500 rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm z-10">
                  <ClipboardList size={20} className="md:w-8 md:h-8" />
               </div>
               <div className="space-y-2">
                  <h4 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-wide">PIQ Form (Mandatory)</h4>
                  <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">
                     The <span className="text-red-500 font-bold">Personal Information Questionnaire</span> is the basis of your interview. The AI IO reads this data to ask personalized questions about your hobbies, education, and family.
                  </p>
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 inline-block">
                     <p className="text-[10px] font-bold text-yellow-800 flex items-center gap-2"><AlertTriangle size={12} /> Without PIQ, the Interview module is locked.</p>
                  </div>
                  <br />
                  <button onClick={() => onNavigate(TestType.PIQ)} className="mt-2 text-[10px] font-black uppercase text-blue-600 flex items-center gap-1 hover:underline">
                     Fill PIQ Now <ChevronRight size={12} />
                  </button>
               </div>
            </div>

            {/* Step 3 */}
            <div className="relative pl-12 md:pl-20">
               <div className="absolute left-0 top-0 w-8 h-8 md:w-16 md:h-16 bg-white border-2 border-slate-200 text-slate-500 rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm z-10">
                  <Brain size={20} className="md:w-8 md:h-8" />
               </div>
               <div className="space-y-2">
                  <h4 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-wide">Psychology & Screening</h4>
                  <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">
                     Attempt PPDT (Screening), TAT, WAT, SRT, and SDT. Write your responses within the time limit. The system provides an AI-generated assessment of your Officer Like Qualities (OLQs).
                  </p>
               </div>
            </div>

            {/* Step 4 */}
            <div className="relative pl-12 md:pl-20">
               <div className="absolute left-0 top-0 w-8 h-8 md:w-16 md:h-16 bg-blue-600 text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 z-10 animate-pulse">
                  <Mic2 size={20} className="md:w-8 md:h-8" />
               </div>
               <div className="space-y-2">
                  <h4 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-wide">1:1 Virtual Interview</h4>
                  <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">
                     Interact with <strong>Col. Arjun Singh (Virtual IO)</strong>.
                     <br/>- Speak clearly and confidently.
                     <br/>- Greet the officer immediately ("Good Morning Sir").
                     <br/>- Maintain eye contact with the camera.
                     <br/>- The interview lasts 25-30 minutes and covers PIQ, CIQ, and General Awareness.
                  </p>
                  <button onClick={() => onNavigate(TestType.INTERVIEW)} className="mt-2 text-[10px] font-black uppercase text-blue-600 flex items-center gap-1 hover:underline">
                     Start Interview <ChevronRight size={12} />
                  </button>
               </div>
            </div>
         </div>
      </div>

      {/* DO's and DON'Ts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
         <div className="bg-green-50 rounded-[2rem] p-8 border border-green-100">
            <h4 className="text-green-800 font-black uppercase text-sm tracking-widest mb-4 flex items-center gap-2">
               <UserCheck size={18} /> Best Practices
            </h4>
            <ul className="space-y-3 text-xs md:text-sm text-green-900/80 font-bold">
               <li className="flex gap-3"><span className="text-green-500">✔</span> Sit in a well-lit room facing the light.</li>
               <li className="flex gap-3"><span className="text-green-500">✔</span> Wear formal attire or neat casuals.</li>
               <li className="flex gap-3"><span className="text-green-500">✔</span> close background apps/tabs </li>
               <li className="flex gap-3"><span className="text-green-500">✔</span> Be honest. The IO cross-checks your PIQ data.</li>
            </ul>
         </div>
         
         <div className="bg-red-50 rounded-[2rem] p-8 border border-red-100">
            <h4 className="text-red-800 font-black uppercase text-sm tracking-widest mb-4 flex items-center gap-2">
               <Lock size={18} /> Strict Prohibitions
            </h4>
            <ul className="space-y-3 text-xs md:text-sm text-red-900/80 font-bold">
               <li className="flex gap-3"><span className="text-red-500">✖</span> Do not refresh the page during a test.</li>
               <li className="flex gap-3"><span className="text-red-500">✖</span> Do not use background noise (TV/Music).</li>
               <li className="flex gap-3"><span className="text-red-500">✖</span> Avoid one-word answers in the interview.</li>
               <li className="flex gap-3"><span className="text-red-500">✖</span> Do not turn off your camera during the call.</li>
            </ul>
         </div>
      </div>

      <div className="flex justify-center pt-4">
         <button 
            onClick={() => onNavigate(TestType.DASHBOARD)}
            className="px-12 py-5 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-2xl hover:scale-105"
         >
            Return to Dashboard
         </button>
      </div>

    </div>
  );
};

export default HowToUse;
