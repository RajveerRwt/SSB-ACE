
import React, { useState } from 'react';
import { ShieldCheck, Star, Zap, CheckCircle, X, Loader2, QrCode, ArrowLeft, Smartphone, AlertCircle } from 'lucide-react';
import { processPaymentSuccess } from '../services/supabaseService';

// --- CONFIGURATION ---
// REPLACE THIS WITH YOUR ACTUAL UPI ID (e.g., 'rajveer@okaxis' or '9876543210@ybl')
const ADMIN_UPI_ID = "9131112322@ybl"; 
const ADMIN_NAME = "SSBPrep Admin";

interface PaymentModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  planType?: 'PRO' | 'ADDON';
}

const PaymentModal: React.FC<PaymentModalProps> = ({ userId, isOpen, onClose, onSuccess, planType = 'PRO' }) => {
  const [step, setStep] = useState<'SELECT' | 'PAY'>('SELECT');
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<'PRO_SUBSCRIPTION' | 'INTERVIEW_ADDON'>('PRO_SUBSCRIPTION');
  const [utr, setUtr] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const initiatePayment = (amount: number, type: 'PRO_SUBSCRIPTION' | 'INTERVIEW_ADDON') => {
    setSelectedAmount(amount);
    setSelectedPlan(type);
    setStep('PAY');
    setError('');
    setUtr('');
  };

  const handleVerifyUTR = async () => {
    if (utr.length < 10) {
      setError("Invalid UTR/Transaction ID. Please check your payment app.");
      return;
    }
    
    setVerifying(true);
    
    // SIMULATED VERIFICATION
    // In a real app, you would send this UTR to your backend to verify against bank statement.
    // For this MVP, we "optimistically" approve it after a delay.
    setTimeout(async () => {
        await processPaymentSuccess(userId, selectedPlan);
        setVerifying(false);
        onSuccess();
        onClose();
        alert("Payment Verified! Account Upgraded.");
    }, 2000);
  };

  // Generate UPI Deep Link
  const upiLink = `upi://pay?pa=${ADMIN_UPI_ID}&pn=${encodeURIComponent(ADMIN_NAME)}&am=${selectedAmount}&cu=INR`;
  // Generate QR Image URL (using a free public API)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row relative min-h-[500px]">
         <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors z-20">
            <X size={20} className="text-slate-600" />
         </button>

         {/* Left Side: Features (Hidden on Mobile during Payment to save space) */}
         <div className={`w-full md:w-1/2 bg-slate-900 p-8 md:p-12 text-white relative overflow-hidden ${step === 'PAY' ? 'hidden md:block' : 'block'}`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 space-y-6">
               <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center text-slate-900 shadow-xl shadow-yellow-400/20">
                  <Star size={32} fill="currentColor" />
               </div>
               <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Officer Grade</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Unlock Full Training Potential</p>
               </div>

               <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-4">
                     <CheckCircle className="text-green-500 shrink-0" size={20} />
                     <span className="font-medium text-sm">5 Full AI Interviews (vs 1 Free)</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <CheckCircle className="text-green-500 shrink-0" size={20} />
                     <span className="font-medium text-sm">20 PPDT Scenarios (vs 5 Free)</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <CheckCircle className="text-green-500 shrink-0" size={20} />
                     <span className="font-medium text-sm">7 TAT Sets (vs 2 Free)</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <CheckCircle className="text-green-500 shrink-0" size={20} />
                     <span className="font-medium text-sm">Unlimited WAT & SRT</span>
                  </div>
               </div>
               
               <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Trusted by 500+ Aspirants</p>
               </div>
            </div>
         </div>

         {/* Right Side: Flow */}
         <div className="w-full md:w-1/2 p-8 md:p-12 bg-white flex flex-col justify-center">
            
            {step === 'SELECT' ? (
                // PLAN SELECTION VIEW
                <div className="space-y-8 animate-in slide-in-from-right">
                    <div className="text-center space-y-2">
                        <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Select Plan</h4>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-5xl font-black text-slate-900">₹299</span>
                            <span className="text-xs font-medium text-slate-500">/mo</span>
                        </div>
                        <p className="text-xs text-green-600 font-bold bg-green-50 inline-block px-3 py-1 rounded-full">Recommended</p>
                    </div>

                    <button 
                        onClick={() => initiatePayment(299, 'PRO_SUBSCRIPTION')}
                        className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl hover:-translate-y-1 flex items-center justify-center gap-3"
                    >
                        <Zap size={18} fill="currentColor" /> Upgrade Now
                    </button>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-widest">Or Top-Up</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black uppercase text-slate-700">1 Extra Interview</p>
                            <p className="text-[10px] text-slate-500 font-bold">Pay Per Use</p>
                        </div>
                        <button 
                            onClick={() => initiatePayment(49, 'INTERVIEW_ADDON')}
                            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                        >
                            Buy @ ₹49
                        </button>
                    </div>
                </div>
            ) : (
                // PAYMENT & QR VIEW
                <div className="space-y-6 animate-in slide-in-from-right relative h-full flex flex-col justify-center">
                    <button 
                        onClick={() => setStep('SELECT')}
                        className="absolute -top-4 -left-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>

                    <div className="text-center space-y-2">
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Paying to {ADMIN_UPI_ID}</p>
                        <h3 className="text-3xl font-black text-slate-900">₹{selectedAmount}.00</h3>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-white rounded-3xl border-2 border-slate-100 shadow-lg relative group">
                            <img src={qrCodeUrl} alt="UPI QR" className="w-48 h-48 mix-blend-multiply" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 font-bold text-xs uppercase tracking-widest">
                                Scan with any App
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Smartphone size={20} className="text-blue-600" />
                            <Smartphone size={20} className="text-purple-600" />
                            <Smartphone size={20} className="text-cyan-600" />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Enter UTR / Transaction ID</label>
                            <input 
                                type="text" 
                                value={utr}
                                onChange={(e) => setUtr(e.target.value)}
                                placeholder="e.g. 123456789012"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                         </div>
                         
                         {error && (
                            <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold">
                                <AlertCircle size={12} /> {error}
                            </div>
                         )}

                         <button 
                            onClick={handleVerifyUTR}
                            disabled={verifying || !utr}
                            className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-green-700 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                         >
                            {verifying ? <Loader2 className="animate-spin" /> : <ShieldCheck size={18} />}
                            {verifying ? 'Verifying Payment...' : 'Verify & Upgrade'}
                         </button>
                    </div>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default PaymentModal;
