import React from 'react';
import { ShieldCheck, Gift, Clock, Globe, Instagram, X, Star } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, userName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="bg-slate-900 p-3 md:p-4 text-center relative shrink-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400" />
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 text-slate-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 p-1.5 rounded-full border border-white/5 z-10"
            aria-label="Close"
          >
            <X size={14} />
          </button>
          
          <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-400/10 rounded-xl flex items-center justify-center mx-auto mb-1.5 border border-yellow-400/20 shadow-[0_0_15px_rgba(250,204,21,0.1)]">
            <ShieldCheck size={20} className="text-yellow-400" />
          </div>
          
          <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tighter leading-none px-4">
            Jai Hind, <span className="text-yellow-400">{userName}</span>!
          </h2>
        </div>

        {/* Content - Scrollable area */}
        <div className="p-3 md:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Free Coins */}
          <div className="flex items-center gap-4 p-5 bg-yellow-50 rounded-2xl border border-yellow-200 group transition-all hover:shadow-md">
            <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-yellow-400/20 text-slate-900 transition-transform group-hover:scale-110">
              <Gift size={24} />
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight">20 Free Coins Credited!</h3>
              <p className="text-[10px] md:text-xs text-slate-600 font-bold leading-relaxed mt-1">
                Congratulations! You've received 20 free coins to explore and attempt any test on our platform. Start your journey now!
              </p>
            </div>
          </div>

        </div>

        {/* Footer / CTA */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl transition-all active:scale-95"
          >
            Start Preparing
          </button>
        </div>

      </div>
    </div>
  );
};

export default WelcomeModal;
