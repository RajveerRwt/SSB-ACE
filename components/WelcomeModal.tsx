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
            Welcome, <span className="text-yellow-400">{userName}</span>!
          </h2>
        </div>

        {/* Content - Scrollable area */}
        <div className="p-3 md:p-5 space-y-2.5 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Mentor Guidance Section */}
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
            <p className="text-[9px] md:text-[10px] text-slate-600 font-bold leading-relaxed text-center italic">
              "Developed under the guidance of SSB mentors and trained on authentic selection data, ssbprep.online provides the most realistic preparation environment for aspiring officers."
            </p>
          </div>

          {/* Free Coins */}
          <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 group hover:border-yellow-200 transition-colors">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-yellow-400/20 text-slate-900 transition-transform group-hover:scale-110">
              <Gift size={16} />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-tight">50 Free Coins Credited</h3>
              <p className="text-[9px] text-slate-500 font-bold leading-relaxed mt-0.5">
                Your joining bonus is ready! Use these coins to unlock premium SSB tests and AI-powered interviews.
              </p>
            </div>
          </div>

          {/* Daily Practice */}
          <div className="flex items-start gap-3 md:gap-4 p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 group hover:border-blue-200 transition-colors">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-900 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-slate-900/20 text-white transition-transform group-hover:scale-110">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-tight">Daily Practice</h3>
              <p className="text-[9px] md:text-[10px] text-slate-500 font-bold leading-relaxed mt-0.5">
                Maintain your streak! Complete daily tasks to earn <strong className="text-slate-900">2 coins daily</strong>.
              </p>
            </div>
          </div>

          {/* Daily News */}
          <div className="flex items-start gap-3 md:gap-4 p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 group hover:border-rose-200 transition-colors">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-rose-500 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20 text-white transition-transform group-hover:scale-110">
              <Globe size={16} />
            </div>
            <div>
              <h3 className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-tight">Curated Daily News</h3>
              <p className="text-[9px] md:text-[10px] text-slate-500 font-bold leading-relaxed mt-0.5">
                Stay updated with current affairs specially selected for SSB aspirants and defense enthusiasts.
              </p>
            </div>
          </div>
        </div>

        {/* Footer / CTA */}
        <div className="p-3 md:p-4 bg-white border-t border-slate-100 flex flex-col gap-2 shrink-0">
          <a 
            href="https://www.instagram.com/ssbprep.online?utm_source=qr&igsh=ZjdvdGdwZGo5OXBl" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-xl font-black uppercase text-[9px] tracking-[0.2em] hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95"
          >
            <Instagram size={14} />
            Follow for Updates
          </a>
          
          <button 
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-black uppercase text-[9px] tracking-[0.2em] shadow-xl transition-all active:scale-95"
          >
            Start Preparing
          </button>
        </div>

      </div>
    </div>
  );
};

export default WelcomeModal;
