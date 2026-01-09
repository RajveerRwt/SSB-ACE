
import React, { useState } from 'react';
import { Send, MessageSquare, Loader2, CheckCircle2, AlertOctagon, Mail } from 'lucide-react';
import { PIQData } from '../types';

// Updated to accept piqData prop to resolve "Property 'piqData' does not exist on type 'IntrinsicAttributes'" error in App.tsx
const ContactForm: React.FC<{ piqData?: PIQData }> = ({ piqData }) => {
  const [status, setStatus] = useState<'IDLE' | 'SUBMITTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [formData, setFormData] = useState({
    email: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('SUBMITTING');

    try {
      // Including piqData in the payload to give administrators context of the user's progress
      const response = await fetch('https://formspree.io/f/mdaoqdqy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, piqData })
      });

      if (response.ok) {
        setStatus('SUCCESS');
        setFormData({ email: '', message: '' });
      } else {
        setStatus('ERROR');
      }
    } catch (error) {
      setStatus('ERROR');
    }
  };

  if (status === 'SUCCESS') {
    return (
      <div className="max-w-2xl mx-auto py-20 md:py-32 text-center space-y-8 animate-in zoom-in duration-500">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/20 shadow-xl">
          <CheckCircle2 size={40} className="md:w-12 md:h-12" />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter">Message Received</h2>
          <p className="text-slate-500 font-medium italic">"Transmission logged. Thank you for your input, Gentleman."</p>
        </div>
        <button 
          onClick={() => setStatus('IDLE')}
          className="px-10 md:px-12 py-4 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-black transition-all"
        >
          New Transmission
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 md:py-10 animate-in fade-in duration-700 space-y-8 md:space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900">Support <span className="text-blue-600">Desk</span></h1>
        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Direct Uplink to Board Admin</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl border border-slate-100 space-y-6 md:space-y-8">
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
            <Mail size={12} /> Return Email (Optional)
          </label>
          <input 
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full p-4 md:p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
            placeholder="How can we reach you?"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
            <MessageSquare size={12} /> Message / Feedback
          </label>
          <textarea 
            required
            value={formData.message}
            onChange={(e) => setFormData({...formData, message: e.target.value})}
            className="w-full h-48 md:h-64 p-6 md:p-8 bg-slate-50 border border-slate-200 rounded-[2rem] md:rounded-[2.5rem] font-medium text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
            placeholder="Type your query or feedback here..."
          />
        </div>

        {status === 'ERROR' && (
          <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-black uppercase text-[9px] tracking-widest animate-bounce">
            <AlertOctagon size={14} /> Failed to transmit. Check connection.
          </div>
        )}

        <button 
          disabled={status === 'SUBMITTING'}
          type="submit"
          className="w-full py-5 md:py-6 bg-slate-900 text-white rounded-full font-black uppercase tracking-[0.5em] text-[10px] md:text-[11px] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-4 disabled:opacity-50"
        >
          {status === 'SUBMITTING' ? <Loader2 className="animate-spin" /> : <Send size={16} />}
          {status === 'SUBMITTING' ? 'Uplinking...' : 'Send Transmission'}
        </button>
      </form>
      
      <p className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">
        Secure Handshake • 256-Bit Encrypted Link
      </p>
    </div>
  );
};

export default ContactForm;
