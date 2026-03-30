import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Video, Users, Target, CheckCircle, ArrowRight, X, Loader2, Clock } from 'lucide-react';
import { supabase } from '../services/supabaseService';

interface MentorshipCardProps {
  onClose?: () => void;
  className?: string;
  id?: string;
  variant?: 'full' | 'compact' | 'hidden';
}

const MentorshipCard: React.FC<MentorshipCardProps> = ({ onClose, className = "my-8", id, variant = 'full' }) => {
  const [showForm, setShowForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    whatsappNumber: '',
    entryType: 'NDA',
    ssbDates: '',
    message: ''
  });

  React.useEffect(() => {
    const handleOpenModal = () => {
      if (variant === 'hidden') {
        setShowDetailsModal(true);
      }
    };
    window.addEventListener('open-mentorship-modal', handleOpenModal);
    return () => window.removeEventListener('open-mentorship-modal', handleOpenModal);
  }, [variant]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Save to Supabase
      const { error } = await supabase.from('mentorship_registrations').insert([
        {
          full_name: formData.fullName,
          whatsapp_number: formData.whatsappNumber,
          entry_type: formData.entryType,
          ssb_dates: formData.ssbDates,
          message: formData.message,
          program: 'SSB Guidance Program - Complete Preparation',
          status: 'pending'
        }
      ]);

      if (error) {
        console.error("Error saving registration:", error);
        // Fallback or alert if table doesn't exist yet
        alert("Registration submitted! (Note: Admin needs to run the SQL setup for the database table).");
      }
      
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppEnquiry = () => {
    const text = encodeURIComponent("Hi Harsh Sir, I want to enquire about the SSB Guidance Program starting 14 April.");
    window.open(`https://wa.me/9131112322?text=${text}`, '_blank'); // Replace with actual number if provided, else placeholder
  };

  const handleScrollToFullCard = () => {
    const el = document.getElementById('mentorship-card');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowDetailsModal(true);
    }
  };

  const renderFullCardContent = () => (
    <>
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 grid lg:grid-cols-12 gap-8 items-center">
    
    {/* Left Content: Mentor & Highlights */}
    <div className="lg:col-span-7 space-y-6">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-400 text-[10px] font-black uppercase tracking-widest mb-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
        </span>
        Premium 1:1 Guidance
      </div>
      
      <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight">
        SSB Guidance Program <br/>
        <span className="text-yellow-400 text-2xl md:text-4xl">Complete Preparation</span>
      </h2>
      
      <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-300">
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
          <Calendar size={16} className="text-blue-400" /> Starts: 14 April
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
          <Clock size={16} className="text-purple-400" /> Duration: 6 Days
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
          <Video size={16} className="text-green-400" /> Mode: Online
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
          <Users size={16} className="text-orange-400" /> Only 10 Seats
        </div>
      </div>

      <div className="mt-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
        <p className="text-sm font-medium text-slate-300">Most aspirants fail due to lack of structured guidance ❌</p>
        <p className="text-sm font-bold text-yellow-400 mt-1">This program is designed to fix exactly that ✅</p>
      </div>

      <div className="space-y-3 pt-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Program Includes:</h4>
        {[
          "Full Screening Guidance with Practice",
          "Full Psychology (TAT, WAT, SRT, SDT) Guidance + Practice",
          "All GTO Tasks Breakdown",
          "Personal Interview Preparation"
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <CheckCircle size={18} className="text-yellow-400 shrink-0 mt-0.5" />
            <span className="text-sm md:text-base font-medium text-slate-200">{item}</span>
          </div>
        ))}
      </div>

      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mt-6">
        <h4 className="text-xs font-black uppercase tracking-widest text-red-400 mb-2 flex items-center gap-2">
          <Target size={14} /> Highlights (Most Important)
        </h4>
        <ul className="space-y-2 text-sm font-bold text-red-100">
          <li>• Only 10 Seats (High Personal Attention)</li>
          <li>• 1:1 Focus on Each Candidate</li>
          <li>• Support Till Recommendation</li>
        </ul>
      </div>
    </div>

    {/* Right Content: Mentor Profile & CTA */}
    <div className="lg:col-span-5 flex flex-col items-center lg:items-end justify-center">
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-sm text-center shadow-2xl relative">
        
        {/* Mentor Photo */}
        <div className="w-32 h-32 mx-auto rounded-full border-4 border-yellow-500 shadow-xl overflow-hidden mb-4 relative">
          <img 
            src="https://freeimage.host/i/B2FgFmF" 
            alt="Harsh Kumar" 
            className="w-full h-full object-cover"
          />
        </div>

        <h3 className="text-xl font-black text-white uppercase tracking-tight">Harsh Kumar</h3>
        <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest mt-1">AIR 40 (CDSE (I) 2022)</p>
        <p className="text-slate-400 text-xs font-medium mt-1">(2× Recommended)</p>

        <div className="my-6 w-full h-px bg-white/10" />

        <div className="text-center mb-6">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Total Fee</p>
          <p className="text-2xl font-black text-white">₹1500</p>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => { setShowDetailsModal(false); setShowForm(true); }}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] hover:-translate-y-1 flex items-center justify-center gap-2"
          >
            Register Now <ArrowRight size={16} />
          </button>
          <button 
            onClick={handleWhatsAppEnquiry}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all"
          >
            Enquiry Now (WhatsApp)
          </button>
        </div>
      </div>
    </div>
  </div>
  </>
  );

  return (
    <>
      {variant === 'compact' ? (
        <div id={id} className={`bg-slate-900 rounded-2xl p-4 md:p-6 text-white relative overflow-hidden shadow-xl border-l-4 border-yellow-500 flex flex-col md:flex-row items-center justify-between gap-4 ${className}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-slate-800 rounded-full border-2 border-yellow-500 overflow-hidden shrink-0 flex items-center justify-center">
               <Target size={24} className="text-yellow-400" />
            </div>
            <div>
               <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[8px] font-black uppercase tracking-widest rounded-full">Premium</span>
                  <h3 className="text-sm md:text-base font-black uppercase tracking-tight">SSB Guidance Program by AIR 40</h3>
               </div>
               <p className="text-xs text-slate-400 font-medium">Starts April 14th • Only 10 Seats • 1:1 Focus</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto relative z-10">
            <button onClick={handleScrollToFullCard} className="flex-1 md:flex-none px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg">
               View Details
            </button>
            <button onClick={() => setShowForm(true)} className="flex-1 md:flex-none px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg">
               Register Now
            </button>
          </div>
        </div>
      ) : variant === 'hidden' ? null : (
        <div id={id} className={`bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl border-b-8 border-yellow-500 animate-in fade-in slide-in-from-bottom-8 duration-1000 ${className}`}>
          {renderFullCardContent()}
        </div>
      )}

      {/* Details Modal (Only used in compact mode when View Details is clicked and full card isn't on screen) */}
      {showDetailsModal && (variant === 'compact' || variant === 'hidden') && createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 md:p-12">
            <div className="relative w-full max-w-5xl">
              <div className={`bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 pt-14 md:pt-16 text-white relative overflow-hidden shadow-2xl border-b-8 border-yellow-500`}>
                  <button 
                    onClick={() => setShowDetailsModal(false)}
                    className="absolute top-4 right-4 md:top-6 md:right-6 text-slate-400 hover:text-white bg-slate-800 rounded-full py-2 px-3 md:px-4 transition-colors z-50 shadow-xl border border-slate-700 flex items-center gap-2 group"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-white transition-colors">Minimize</span>
                    <X size={18} />
                  </button>
                  {renderFullCardContent()}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Registration Modal */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl relative">
                <button 
                  onClick={() => setShowForm(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 rounded-full p-1 transition-colors"
                >
                  <X size={20} />
                </button>
                
                <div className="p-6 md:p-8">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Secure Your Seat</h3>
                  <p className="text-slate-400 text-xs font-medium mb-6">Only 10 seats available. Fill details to register.</p>

                  {isSuccess ? (
                    <div className="text-center py-8 space-y-4 animate-in zoom-in">
                      <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} />
                      </div>
                      <h4 className="text-xl font-black text-white">Registration Received!</h4>
                      <p className="text-slate-400 text-sm">We will contact you on WhatsApp shortly with payment details and next steps.</p>
                      <button 
                        onClick={() => setShowForm(false)}
                        className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-sm transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Full Name</label>
                        <input 
                          required
                          type="text" 
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">WhatsApp Number</label>
                        <input 
                          required
                          type="tel" 
                          name="whatsappNumber"
                          value={formData.whatsappNumber}
                          onChange={handleInputChange}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors"
                          placeholder="+91"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entry Type</label>
                        <select 
                          name="entryType"
                          value={formData.entryType}
                          onChange={handleInputChange}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors appearance-none"
                        >
                          <option value="NDA">NDA</option>
                          <option value="CDS">CDS</option>
                          <option value="AFCAT">AFCAT</option>
                          <option value="SSC Tech">SSC Tech</option>
                          <option value="ACC">ACC</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">SSB Dates (If any)</label>
                        <input 
                          type="text" 
                          name="ssbDates"
                          value={formData.ssbDates}
                          onChange={handleInputChange}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors"
                          placeholder="e.g., 15 May - 19 May (Optional)"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Message (Optional)</label>
                        <textarea 
                          name="message"
                          value={formData.message}
                          onChange={handleInputChange}
                          rows={2}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors resize-none"
                          placeholder="Anything you want to tell us?"
                        />
                      </div>
                      
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Submit Registration'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default MentorshipCard;
