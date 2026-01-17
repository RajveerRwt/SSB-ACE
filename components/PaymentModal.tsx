
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Star, Zap, CheckCircle, X, Loader2, QrCode, ArrowLeft, Smartphone, AlertCircle, Clock, Tag } from 'lucide-react';
import { submitPaymentRequest, getLatestPaymentRequest } from '../services/supabaseService';

// --- CONFIGURATION ---
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
  const [step, setStep] = useState<'SELECT' | 'PAY' | 'PENDING'>('SELECT');
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<'PRO_SUBSCRIPTION' | 'INTERVIEW_ADDON'>('PRO_SUBSCRIPTION');
  const [utr, setUtr] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [pendingReq, setPendingReq] = useState<any>(null);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (isOpen && userId && !userId.startsWith('demo')) {
        // Check if user already has a pending request
        getLatestPaymentRequest(userId).then((req) => {
            if (req && req.status === 'PENDING') {
                setPendingReq(req);
                setStep('PENDING');
            } else {
                setPendingReq(null);
                setStep('SELECT');
            }
        });
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const initiatePayment = (amount: number, type: 'PRO_SUBSCRIPTION' | 'INTERVIEW_ADDON') => {
    setSelectedAmount(amount);
    setSelectedPlan(type);
    setStep('PAY');
    setError('');
    setUtr('');
    // Reset Coupon
    setCouponCode('');
    setDiscount(0);
    setCouponMessage(null);
  };

  const handleApplyCoupon = () => {
    setCouponMessage(null);
    const code = couponCode.trim().toUpperCase();

    if (!code) return;

    if (code === 'REPUBLIC26') {
        if (selectedPlan === 'PRO_SUBSCRIPTION') {
            // 26% Discount on 299
            const discountAmount = Math.round(selectedAmount * 0.26);
            setDiscount(discountAmount);
            setCouponMessage({ type: 'success', text: `Republic Day Offer Applied! You saved ₹${discountAmount}.` });
        } else {
            setDiscount(0);
            setCouponMessage({ type: 'error', text: 'This coupon is valid only for the Pro Cadet Plan.' });
        }
    } else {
        setDiscount(0);
        setCouponMessage({ type: 'error', text: 'Invalid Coupon Code.' });
    }
  };

  const finalAmount = selectedAmount - discount;

  const handleSubmitRequest = async () => {
    setError('');

    // 1. Basic Validation
    if (utr.length < 10) {
      setError("Invalid UTR. It must be at least 10-12 digits.");
      return;
    }
    // Regex for numeric or alphanumeric UTR (most banks use 12 digits)
    if (!/^[a-zA-Z0-9]{10,25}$/.test(utr)) {
      setError("Invalid format. UTR contains special characters.");
      return;
    }
    
    setVerifying(true);
    
    try {
        // 2. Submit to Backend for Manual Review & Email Notification
        await submitPaymentRequest(userId, utr, finalAmount, selectedPlan);
        setVerifying(false);
        setStep('PENDING'); // Show success message
        setPendingReq({ utr: utr }); // Mock updated state immediately
    } catch (e: any) {
        setVerifying(false);
        setError(e.message || "Submission failed. Please try again.");
    }
  };

  // Generate UPI Deep Link
  const upiLink = `upi://pay?pa=${ADMIN_UPI_ID}&pn=${encodeURIComponent(ADMIN_NAME)}&am=${finalAmount}&cu=INR`;
  // Generate QR Image URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
       <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="bg-slate-950 p-6 text-center relative shrink-0">
             <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
               <X size={20} />
             </button>
             {step === 'PAY' && (
               <button onClick={() => setStep('SELECT')} className="absolute top-6 left-6 text-slate-500 hover:text-white transition-colors">
                 <ArrowLeft size={20} />
               </button>
             )}
             <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg text-slate-900">
               <ShieldCheck size={24} />
             </div>
             <h3 className="text-white font-black uppercase tracking-widest text-lg">Premium Access</h3>
             <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Secure Payment Gateway</p>
          </div>

          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
             
             {step === 'SELECT' && (
               <div className="space-y-4">
                  <div 
                    onClick={() => initiatePayment(299, 'PRO_SUBSCRIPTION')}
                    className="p-5 rounded-[2rem] border-2 border-slate-100 hover:border-yellow-400 cursor-pointer transition-all hover:bg-yellow-50 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-yellow-400 text-black px-3 py-1 rounded-bl-xl text-[9px] font-black uppercase tracking-widest">Recommended</div>
                    <div className="flex justify-between items-center mb-2">
                       <h4 className="font-black text-slate-900 uppercase italic text-lg">Pro Cadet</h4>
                       <span className="text-xl font-black text-slate-900">₹299</span>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-2 font-medium">
                       <li className="flex gap-2"><CheckCircle size={14} className="text-green-500" /> 20 PPDT Total Sets</li>
                       <li className="flex gap-2"><CheckCircle size={14} className="text-green-500" /> 7 TAT Psychology Sets</li>
                       <li className="flex gap-2"><CheckCircle size={14} className="text-green-500" /> 5 AI Mock Interviews</li>
                       <li className="flex gap-2"><CheckCircle size={14} className="text-green-500" /> Detailed Performance Analytics</li>
                    </ul>
                  </div>

                  <div 
                    onClick={() => initiatePayment(49, 'INTERVIEW_ADDON')}
                    className="p-5 rounded-[2rem] border-2 border-slate-100 hover:border-blue-400 cursor-pointer transition-all hover:bg-blue-50 group"
                  >
                    <div className="flex justify-between items-center mb-2">
                       <h4 className="font-black text-slate-900 uppercase italic text-lg">Interview Top-up</h4>
                       <span className="text-xl font-black text-slate-900">₹49</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                       Add <span className="text-slate-900 font-bold">1 Extra AI Interview Credit</span> to your existing plan. Valid until used.
                    </p>
                  </div>
               </div>
             )}

             {step === 'PAY' && (
               <div className="space-y-6 text-center animate-in slide-in-from-right duration-300">
                  
                  {/* Amount Display */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Scan to Pay</p>
                    <div className="flex items-center justify-center gap-2">
                        {discount > 0 && (
                            <span className="text-lg font-bold text-slate-400 line-through">₹{selectedAmount}</span>
                        )}
                        <span className="text-3xl font-black text-slate-900">₹{finalAmount}</span>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 inline-block mx-auto relative">
                     <img src={qrCodeUrl} alt="UPI QR" className="w-40 h-40 mix-blend-multiply" />
                     {discount > 0 && (
                         <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[9px] font-black px-2 py-1 rounded-full shadow-md animate-bounce">
                             SAVE ₹{discount}
                         </div>
                     )}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-900 bg-slate-100 py-2 px-4 rounded-lg inline-block select-all">{ADMIN_UPI_ID}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Name: {ADMIN_NAME}</p>
                  </div>

                  {/* Discount Coupon Section */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input 
                                type="text"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                placeholder="Have a coupon code?"
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase placeholder:normal-case outline-none focus:border-slate-900 transition-all"
                                disabled={discount > 0}
                              />
                          </div>
                          <button 
                            onClick={discount > 0 ? () => { setDiscount(0); setCouponCode(''); setCouponMessage(null); } : handleApplyCoupon}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${discount > 0 ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-900 text-white hover:bg-black'}`}
                          >
                              {discount > 0 ? 'Remove' : 'Apply'}
                          </button>
                      </div>
                      {couponMessage && (
                          <p className={`text-[10px] font-bold mt-2 ${couponMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                              {couponMessage.text}
                          </p>
                      )}
                  </div>

                  {/* UTR Input */}
                  <div className="text-left space-y-2">
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Enter Transaction ID (UTR)</label>
                     <input 
                        type="text" 
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                        placeholder="e.g. 3289XXXXXXXX"
                        className="w-full p-4 bg-slate-50 border-2 border-slate-200 focus:border-slate-900 rounded-xl font-bold text-slate-900 outline-none transition-all uppercase placeholder:normal-case"
                     />
                     <p className="text-[9px] text-slate-400 leading-relaxed px-1">
                        * After payment, copy the 12-digit UTR/Reference No. from your UPI app and paste it here for verification.
                     </p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-xs font-bold">
                       <AlertCircle size={16} /> {error}
                    </div>
                  )}

                  <button 
                    onClick={handleSubmitRequest}
                    disabled={verifying}
                    className="w-full py-4 bg-green-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-green-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {verifying ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                    {verifying ? 'Verifying...' : 'Submit for Verification'}
                  </button>
               </div>
             )}

             {step === 'PENDING' && (
               <div className="text-center space-y-6 py-6 animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto border-4 border-yellow-50 animate-pulse">
                     <Clock size={40} />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-2xl font-black text-slate-900 uppercase">Verification Pending</h3>
                     <p className="text-slate-500 font-medium text-sm leading-relaxed px-4">
                        Your payment details have been sent to the admin. <br/>
                        <span className="text-slate-900 font-bold">Estimated Time: Approx. 30-60 Minutes.</span>
                     </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 font-mono">
                     Ref: {pendingReq?.utr || utr}
                  </div>
                  <button 
                    onClick={onClose}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg"
                  >
                    Close & Check Dashboard
                  </button>
               </div>
             )}

          </div>
       </div>
    </div>
  );
};

export default PaymentModal;
