
import React from 'react';
import { ShieldCheck, Monitor, Phone, Gift, X, CheckCircle, Mail } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border-4 border-white relative overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-32 bg-slate-900" />
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-24 h-24 bg-yellow-400 rounded-3xl rotate-12 border-4 border-white shadow-xl flex items-center justify-center z-10">
            <ShieldCheck size={48} className="text-slate-900" />
        </div>

        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-20"
        >
            <X size={24} />
        </button>

        <div className="pt-36 pb-10 px-8 text-center space-y-6">
            <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Welcome, Cadet!</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Preparation Phase Initiated</p>
            </div>

            <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-start gap-4 text-left">
                    <div className="p-2 bg-green-100 rounded-xl text-green-600 shrink-0">
                        <Gift size={20} />
                    </div>
                    <div>
                        <h4 className="font-black text-green-800 text-sm uppercase tracking-wide">Free Credits Activated</h4>
                        <p className="text-xs text-green-700 font-medium leading-relaxed mt-1">
                            We've added free trial credits to your account. Use them to experience our AI Interview and Psychology tests.
                        </p>
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-4 text-left">
                    <div className="p-2 bg-blue-100 rounded-xl text-blue-600 shrink-0">
                        <Monitor size={20} />
                    </div>
                    <div>
                        <h4 className="font-black text-blue-800 text-sm uppercase tracking-wide">Device Recommendation</h4>
                        <p className="text-xs text-blue-700 font-medium leading-relaxed mt-1">
                            For the most realistic SSB simulation, we strongly recommend using a <strong>Desktop or Laptop</strong>.
                        </p>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Support Channel</p>
                <div className="flex flex-col md:flex-row gap-3 justify-center text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                        <Phone size={14} className="text-slate-900" /> +91 9131112322
                    </span>
                    <span className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                        <Mail size={14} className="text-slate-900" /> Support Desk
                    </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 italic">Call us without hesitation for any assistance.</p>
            </div>

            <button 
                onClick={onClose}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-black transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
                <CheckCircle size={16} /> Get Started
            </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
