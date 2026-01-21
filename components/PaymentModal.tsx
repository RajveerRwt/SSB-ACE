
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Star, Zap, CheckCircle, X, Loader2, QrCode, ArrowLeft, Smartphone, AlertCircle, Clock, Tag, CreditCard } from 'lucide-react';
import { processRazorpayTransaction, getLatestPaymentRequest, validateCoupon } from '../services/supabaseService';

interface PaymentModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  planType?: 'PRO' | 'ADDON';
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PaymentModal: React.FC<PaymentModalProps> = ({ userId, isOpen, onClose, onSuccess, planType = 'PRO' }) => {
  const [step, setStep] = useState<'SELECT' | 'PAY' | 'SUCCESS'>('SELECT');
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<'PRO_SUBSCRIPTION' | 'STANDARD_SUBSCRIPTION' | 'INTERVIEW_ADDON'>('PRO_SUBSCRIPTION');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setStep('SELECT');
        setError('');
        setProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const initiatePayment = (amount: number, type: 'PRO_SUBSCRIPTION' | 'STANDARD_SUBSCRIPTION' | 'INTERVIEW_ADDON') => {
    setSelectedAmount(amount);
    setSelectedPlan(type);
    setStep('PAY');
    setError('');
    // Reset Coupon
    setCouponCode('');
    setAppliedCoupon('');
    setDiscount(0);
    setCouponMessage(null);
  };

  const handleApplyCoupon = async () => {
    setCouponMessage(null);
    setValidatingCoupon(true);
    const code = couponCode.trim().toUpperCase();

    if (!code) {
        setValidatingCoupon(false);
        return;
    }

    try {
        const result = await validateCoupon(code);
        
        if (result.valid) {
            // Apply discount
            const discountAmount = Math.ceil(selectedAmount * (result.discount / 100));
            setDiscount(discountAmount);
            setAppliedCoupon(code);
            setCouponMessage({ type: 'success', text: result.message });
        } else {
            setDiscount(0);
            setAppliedCoupon('');
            setCouponMessage({ type: 'error', text: result.message });
        }
    } catch (e) {
        setCouponMessage({ type: 'error', text: "Verification failed. Check network." });
    } finally {
        setValidatingCoupon(false);
    }
  };

  const finalAmount = selectedAmount - discount;

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayNow = async () => {
    setProcessing(true);
    setError('');

    const res = await loadRazorpay();

    if (!res) {
      setError("Razorpay SDK failed to load. Check connection.");
      setProcessing(false);
      return;
    }

    // Access Key via injected process.env (handled in vite.config.ts)
    const keyId = process.env.RAZORPAY_KEY_ID;
    
    if (!keyId || keyId === 'PASTE_YOUR_KEY_HERE') {
        console.error("Razorpay Key is missing. Check .env file and restart server.");
        setError("Payment System Error: Merchant Key Missing. Admin: Check Console.");
        setProcessing(false);
        return;
    }

    const options = {
      key: keyId, // Enter the Key ID generated from the Dashboard
      amount: finalAmount * 100, // Amount is in currency subunits. Default currency is INR.
      currency: "INR",
      name: "SSBPREP.ONLINE",
      description: selectedPlan === 'PRO_SUBSCRIPTION' ? "Pro Cadet Access" : "Interview Add-on",
      image: "https://ssbprep.online/logo.svg", // Using site logo
      handler: async function (response: any) {
        // Handle Success
        try {
            await processRazorpayTransaction(
                userId, 
                response.razorpay_payment_id, 
                finalAmount, 
                selectedPlan, 
                appliedCoupon
            );
            setStep('SUCCESS');
            setProcessing(false);
            onSuccess(); // Trigger parent refresh if needed
        } catch (e: any) {
            setError("Payment successful but activation failed. Contact Support with Ref: " + response.razorpay_payment_id);
            setProcessing(false);
        }
      },
      prefill: {
        name: "", // Can fetch from user profile if needed
        email: "",
        contact: ""
      },
      notes: {
        plan: selectedPlan,
        userId: userId
      },
      theme: {
        color: "#1e293b"
      }
    };

    try {
        const paymentObject = new window.Razorpay(options);
        paymentObject.on('payment.failed', function (response: any){
            setError(response.error.description || "Payment Failed");
            setProcessing(false);
        });
        paymentObject.open();
    } catch (e) {
        console.error(e);
        setError("Could not initialize payment gateway.");
        setProcessing(false);
    }
  };

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
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg text-white">
               <CreditCard size={24} />
             </div>
             <h3 className="text-white font-black uppercase tracking-widest text-lg">Secure Checkout</h3>
             <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Powered by Razorpay</p>
          </div>

          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
             
             {step === 'SELECT' && (
               <div className="space-y-4">
                  {/* Single PRO Plan - Price updated to 199 */}
                  <div 
                    onClick={() => initiatePayment(199, 'PRO_SUBSCRIPTION')}
                    className="p-5 rounded-[2rem] border-2 border-slate-100 hover:border-yellow-400 cursor-pointer transition-all hover:bg-yellow-50/50 group relative overflow-hidden bg-white shadow-sm"
                  >
                    <div className="absolute top-0 right-0 bg-yellow-400 text-black px-3 py-1 rounded-bl-xl text-[9px] font-black uppercase tracking-widest">Best Value</div>
                    <div className="flex justify-between items-center mb-2">
                       <h4 className="font-black text-slate-900 uppercase italic text-lg">Pro Cadet</h4>
                       <span className="text-xl font-black text-slate-900">₹199</span>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-1.5 font-medium">
                       <li className="flex gap-2"><CheckCircle size={14} className="text-green-500" /> 5 Mock Interviews</li>
                       <li className="flex gap-2"><CheckCircle size={14} className="text-green-500" /> 20 PPDT Sets</li>
                       <li className="flex gap-2"><CheckCircle size={14} className="text-green-500" /> 7 TAT & 10 WAT/SRT Sets</li>
                       <li className="flex gap-2"><CheckCircle size={14} className="text-green-500" /> AI Guide & SDT Access</li>
                    </ul>
                  </div>

                  {/* Interview Top-up - Price updated to 19 */}
                  <div 
                    onClick={() => initiatePayment(19, 'INTERVIEW_ADDON')}
                    className="p-5 rounded-[2rem] border-2 border-slate-100 hover:border-blue-400 cursor-pointer transition-all hover:bg-blue-50 group"
                  >
                    <div className="flex justify-between items-center mb-2">
                       <h4 className="font-black text-blue-900 uppercase italic text-lg">Interview Top-up</h4>
                       <span className="text-xl font-black text-blue-900">₹19</span>
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
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Payable</p>
                    <div className="flex items-center justify-center gap-2">
                        {discount > 0 && (
                            <span className="text-lg font-bold text-slate-400 line-through">₹{selectedAmount}</span>
                        )}
                        <span className="text-4xl font-black text-slate-900">₹{finalAmount}</span>
                    </div>
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
                            onClick={discount > 0 ? () => { setDiscount(0); setCouponCode(''); setAppliedCoupon(''); setCouponMessage(null); } : handleApplyCoupon}
                            disabled={validatingCoupon}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${discount > 0 ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-900 text-white hover:bg-black'}`}
                          >
                              {validatingCoupon ? <Loader2 size={12} className="animate-spin" /> : (discount > 0 ? 'Remove' : 'Apply')}
                          </button>
                      </div>
                      {couponMessage && (
                          <p className={`text-[10px] font-bold mt-2 ${couponMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                              {couponMessage.text}
                          </p>
                      )}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-xs font-bold">
                       <AlertCircle size={16} /> {error}
                    </div>
                  )}

                  <button 
                    onClick={handlePayNow}
                    disabled={processing}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processing ? <Loader2 className="animate-spin" size={16} /> : <CreditCard size={16} />}
                    {processing ? 'Processing...' : 'Pay with Razorpay'}
                  </button>
                  
                  <div className="flex justify-center gap-4 opacity-50 grayscale hover:grayscale-0 transition-all">
                     {/* Placeholder icons for trust badges */}
                     <span className="text-[10px] font-bold text-slate-400">UPI</span>
                     <span className="text-[10px] font-bold text-slate-400">Cards</span>
                     <span className="text-[10px] font-bold text-slate-400">NetBanking</span>
                  </div>
               </div>
             )}

             {step === 'SUCCESS' && (
               <div className="text-center space-y-6 py-6 animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto border-4 border-green-50 shadow-xl">
                     <CheckCircle size={40} />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-2xl font-black text-slate-900 uppercase">Payment Successful!</h3>
                     <p className="text-slate-500 font-medium text-sm leading-relaxed px-4">
                        Your plan has been upgraded instantly. You can now access all Pro features.
                     </p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg"
                  >
                    Start Training Now
                  </button>
               </div>
             )}

          </div>
       </div>
    </div>
  );
};

export default PaymentModal;
