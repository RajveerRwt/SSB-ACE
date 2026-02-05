
import React from 'react';
import { Instagram, Youtube, FileText, Shield, CreditCard, Mail } from 'lucide-react';
import { TestType } from '../types';

interface FooterProps {
  onNavigate: (test: TestType) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="mt-12 bg-slate-900 rounded-[2.5rem] p-8 md:p-16 text-slate-400 relative overflow-hidden border-t-8 border-slate-800 shadow-2xl">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-20"></div>
      
      <div className="relative z-10 flex flex-col items-center text-center space-y-10">
        
        {/* Social Links */}
        <div className="flex gap-6">
           <a 
             href="https://www.instagram.com/ssbprep.online?utm_source=qr&igsh=ZjdvdGdwZGo5OXBl" 
             target="_blank" 
             rel="noreferrer"
             className="p-4 bg-white/5 hover:bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 hover:text-white rounded-2xl transition-all shadow-lg group border border-white/5"
             title="Follow on Instagram"
           >
             <Instagram size={28} />
           </a>
           <a 
             href="https://youtube.com/@ssbprep.online?si=616euo_H_rJ4wwFo" 
             target="_blank" 
             rel="noreferrer" 
             className="p-4 bg-white/5 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-lg border border-white/5"
             title="Subscribe on YouTube"
           >
             <Youtube size={28} />
           </a>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-xs font-black uppercase tracking-widest text-slate-500">
          <a href="/terms.html" className="hover:text-white transition-colors flex items-center gap-2">
             <FileText size={14} /> Terms
          </a>
          <a href="/privacy.html" className="hover:text-white transition-colors flex items-center gap-2">
             <Shield size={14} /> Privacy
          </a>
          <button onClick={() => onNavigate(TestType.REFUND)} className="hover:text-white transition-colors flex items-center gap-2">
             <CreditCard size={14} /> Refunds
          </button>
          <button onClick={() => onNavigate(TestType.CONTACT)} className="hover:text-white transition-colors flex items-center gap-2">
             <Mail size={14} /> Support
          </button>
        </div>

        <div className="w-24 h-1 bg-slate-800 rounded-full" />

        {/* Disclaimer & Copyright */}
        <div className="space-y-4 max-w-3xl">
            <p className="text-[10px] md:text-xs leading-relaxed opacity-60 font-medium">
                <span className="text-yellow-500 font-bold uppercase tracking-wider">Official Disclaimer:</span> This website is a private educational platform and is <strong>NOT associated, affiliated, or endorsed</strong> by the Indian Army, Air Force, Navy, or Ministry of Defence. The characters "Major Veer" and "Col. Arjun Singh" are fictional AI personas created for simulation purposes only.
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 pt-4">
                © 2026 SSBPREP.ONLINE • Prepare. Lead. Succeed.
            </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
