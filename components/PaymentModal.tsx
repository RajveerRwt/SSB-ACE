
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

    // ROBUST KEY RETRIEVAL STRATEGY
    // We cast to 'any' to avoid TypeScript build errors if types aren't fully loaded
    let keyId = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID;
    
    if (!keyId || keyId === 'PASTE_YOUR_KEY_HERE') {
        // Fallback to process.env if available
        if (typeof process !== 'undefined' && (process as any).env) {
            keyId = (process as any).env.RAZORPAY_KEY_ID;
        }
    }
    
    // Direct Fallback if Env fails
    if (!keyId || keyId === 'PASTE_YOUR_KEY_HERE') {
        keyId = "rzp_live_S6bUN9RquDzbeY";
    }
    
    if (!keyId) {
        console.error("Razorpay Key is missing completely.");
        setError("Payment System Error: Merchant Key Missing. Please restart server.");
        setProcessing(false);
        return;
    }

    const options = {
      key: keyId, 
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
       <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
          
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
               <div className="space-y-6">
                  <div className="text-center space-y-2">
                      <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Select Your Mission Pack</h4>
                      <p className="text-slate-500 text-xs font-medium">Upgrade to unlock full assessment capabilities.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* FREE PLAN */}
                      <div className="p-6 rounded-[2rem] border-2 border-slate-100 bg-slate-50 flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
                          <div>
                              <div className="flex justify-between items-start mb-4">
                                  <h5 className="font-black text-slate-500 uppercase tracking-widest text-xs">Cadet</h5>
                                  <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-[9px] font-bold uppercase">Basic</span>
                              </div>
                              <div className="mb-6">
                                  <span className="text-3xl font-black text-slate-400">Free</span>
                              </div>
                              <ul className="space-y-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                  <li className="flex gap-2"><CheckCircle size={14} /> 1 Interview Trial</li>
                                  <li className="flex gap-2"><CheckCircle size={14} /> 10 PPDT Sets</li>
                                  <li className="flex gap-2"><CheckCircle size={14} /> 2 TAT Sets</li>
                                  <li className="flex gap-2"><CheckCircle size={14} /> Limited History</li>
                              </ul>
                          </div>
                      </div>

                      {/* PRO PLAN */}
                      <div 
                        onClick={() => initiatePayment(199, 'PRO_SUBSCRIPTION')}
                        className="p-6 rounded-[2rem] border-4 border-yellow-400 bg-white relative overflow-hidden cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all group"
                      >
                          <div className="absolute top-0 right-0 bg-yellow-400 text-black px-4 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest shadow-md">Recommended</div>
                          <div>
                              <div className="flex justify-between items-start mb-4">
                                  <h5 className="font-black text-slate-900 uppercase tracking-widest text-xs">Officer</h5>
                                  <span className="bg-blue-600 text-white px-2 py-1 rounded text-[9px] font-bold uppercase">Pro</span>
                              </div>
                              <div className="mb-6 flex items-baseline gap-2">
                                  <span className="text-3xl font-black text-slate-900">₹199</span>
                                  <span className="text-sm font-bold text-slate-400 line-through">₹399</span>
                              </div>
                              <ul className="space-y-3 text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                                  <li className="flex gap-2"><Zap size={14} className="text-blue-600 fill-blue-600" /> 5 AI Interviews</li>
                                  <li className="flex gap-2"><Zap size={14} className="text-blue-600 fill-blue-600" /> 30 PPDT Sets</li>
                                  <li className="flex gap-2"><Zap size={14} className="text-blue-600 fill-blue-600" /> 7 TAT Sets</li>
                                  <li className="flex gap-2"><Zap size={14} className="text-blue-600 fill-blue-600" /> Advanced Analytics</li>
                              </ul>
                          </div>
                          <button className="w-full mt-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest group-hover:bg-black transition-colors">Select Plan</button>
                      </div>
                  </div>

                  {/* Interview Top-up */}
                  <div 
                    onClick={() => initiatePayment(19, 'INTERVIEW_ADDON')}
                    className="p-4 rounded-[1.5rem] border-2 border-slate-100 hover:border-blue-300 cursor-pointer transition-all hover:bg-blue-50 flex items-center justify-between gap-4 group"
                  >
                    <div>
                       <h4 className="font-black text-slate-700 uppercase text-xs tracking-widest">Need more Interviews?</h4>
                       <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Add 1 Extra Credit for ₹19</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200 group-hover:border-blue-200 shadow-sm">
                        <Smartphone size={20} className="text-slate-400 group-hover:text-blue-500" />
                    </div>
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
