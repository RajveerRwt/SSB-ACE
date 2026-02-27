
import React from 'react';
import { X, MessageCircle, Gift, CheckCircle } from 'lucide-react';

interface FreeCoinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FreeCoinModal: React.FC<FreeCoinModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleProceed = () => {
    const message = encodeURIComponent("i want free 50 coin credits");
    window.open(`https://wa.me/9131112322?text=${message}`, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors z-10">
          <X size={24} />
        </button>
        
        <div className="p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner transform rotate-3">
            <Gift size={40} />
          </div>
          
          <div className="space-y-3">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Exclusive Offer!</h3>
            <p className="text-slate-600 font-medium text-sm leading-relaxed">
              You will get <span className="text-blue-600 font-black">free 50 coin + exclusive SSB material</span>. 
              Help us in testing and provide your valuable feedback to improve the platform!
            </p>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <CheckCircle size={12} className="text-green-500" /> What you get:
            </div>
            <ul className="text-xs font-bold text-slate-700 space-y-1">
              <li>• 50 Free Credits for AI Tests</li>
              <li>• Premium SSB Study Material</li>
              <li>• Direct Support & Feedback Channel</li>
            </ul>
          </div>

          <button 
            onClick={handleProceed}
            className="w-full py-5 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-green-700 transition-all shadow-xl shadow-green-600/20 flex items-center justify-center gap-3 group"
          >
            <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
            Proceed to WhatsApp
          </button>
          
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Clicking proceed will open WhatsApp to claim your reward
          </p>
        </div>
      </div>
    </div>
  );
};

export default FreeCoinModal;
