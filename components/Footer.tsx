
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
        <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
           <a 
             href="https://www.instagram.com/ssbprep.online?utm_source=qr&igsh=ZjdvdGdwZGo5OXBl" 
             target="_blank" 
             rel="noreferrer"
             className="flex items-center gap-3 px-6 py-4 bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 text-white rounded-2xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:-translate-y-1 group border border-white/10 w-full sm:w-auto"
             title="Follow on Instagram"
           >
             <div className="bg-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
               <Instagram size={24} />
             </div>
             <div className="flex flex-col items-start text-left">
               <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">For all updates</span>
               <span className="font-black text-sm tracking-wide">Follow on Instagram</span>
             </div>
           </a>
           <a 
             href="https://youtube.com/@ssbprep.online?si=616euo_H_rJ4wwFo" 
             target="_blank" 
             rel="noreferrer" 
             className="flex items-center gap-3 px-6 py-4 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white rounded-2xl transition-all shadow-lg hover:-translate-y-1 group border border-slate-700 hover:border-red-500 w-full sm:w-auto"
             title="Subscribe on YouTube"
           >
             <div className="bg-white/10 p-2 rounded-xl group-hover:scale-110 transition-transform">
               <Youtube size={24} />
             </div>
             <div className="flex flex-col items-start text-left">
               <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider group-hover:text-white/80">Watch videos</span>
               <span className="font-black text-sm tracking-wide">Subscribe on YouTube</span>
             </div>
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
