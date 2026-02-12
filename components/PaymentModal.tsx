
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Star, Zap, CheckCircle, X, Loader2, QrCode, ArrowLeft, Smartphone, AlertCircle, Clock, Tag, CreditCard, BookOpen, ChevronRight, IndianRupee, Coins } from 'lucide-react';
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
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [customAmount, setCustomAmount] = useState('');
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
        setCustomAmount('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const initiatePayment = (amount: number, type: string) => {
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

  const handleCustomPayment = () => {
      const amt = parseInt(customAmount);
      if (!amt || amt < 10) {
          setError("Minimum amount is ₹10");
          return;
      }
      // Check if custom amount matches a bundle, if so upgrade them
      if (amt === 100) initiatePayment(100, 'BUNDLE_100');
      else if (amt === 200) initiatePayment(200, 'BUNDLE_200');
      else if (amt === 300) initiatePayment(300, 'BUNDLE_300');
      else initiatePayment(amt, 'CUSTOM');
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
    let keyId = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID;
    
    if (!keyId || keyId === 'PASTE_YOUR_KEY_HERE') {
        if (typeof process !== 'undefined' && (process as any).env) {
            keyId = (process as any).env.RAZORPAY_KEY_ID;
        }
    }
    
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
      amount: finalAmount * 100, 
      currency: "INR",
      name: "SSBPREP.ONLINE",
      description: "Coin Wallet Top-up",
      image: "https://ssbprep.online/logo.svg",
      handler: async function (response: any) {
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
            onSuccess(); 
        } catch (e: any) {
            setError("Payment successful but coin activation failed. Contact Support with Ref: " + response.razorpay_payment_id);
            setProcessing(false);
        }
      },
      prefill: { name: "", email: "", contact: "" },
      notes: { plan: selectedPlan, userId: userId },
      theme: { color: "#1e293b" }
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

  const getCoinsReceived = (amount: number, type: string) => {
      if (type === 'BUNDLE_100' || amount === 100) return 110;
      if (type === 'BUNDLE_200' || amount === 200) return 230;
      if (type === 'BUNDLE_300' || amount === 300) return 350;
      return amount; // 1:1 Default
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
       <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
          
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
               <Coins size={24} />
             </div>
             <h3 className="text-white font-black uppercase tracking-widest text-lg">Wallet Top-Up</h3>
             <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">1 Coin = 1 Rupee (Bonus on Bundles)</p>
          </div>

          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
             
             {step === 'SELECT' && (
               <div className="space-y-6">
                  <div className="text-center space-y-2">
                      <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Select Bundle</h4>
                      <p className="text-slate-500 text-xs font-medium">Get extra coins with larger packs.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Bundle 100 */}
                      <div 
                        onClick={() => initiatePayment(100, 'BUNDLE_100')}
                        className="p-4 rounded-[1.5rem] border-2 border-slate-100 bg-white hover:border-blue-400 cursor-pointer transition-all hover:shadow-lg flex flex-col items-center justify-center gap-2 group text-center"
                      >
                         <div className="bg-slate-100 text-slate-500 p-3 rounded-xl mb-1">
                            <Coins size={20} />
                         </div>
                         <h4 className="font-black text-slate-900 text-lg">110 Coins</h4>
                         <p className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">10% Extra</p>
                         <span className="text-xl font-black text-slate-800 mt-2">₹100</span>
                      </div>

                      {/* Bundle 200 */}
                      <div 
                        onClick={() => initiatePayment(200, 'BUNDLE_200')}
                        className="p-4 rounded-[1.5rem] border-2 border-slate-100 bg-white hover:border-purple-400 cursor-pointer transition-all hover:shadow-lg flex flex-col items-center justify-center gap-2 group text-center"
                      >
                         <div className="bg-purple-50 text-purple-500 p-3 rounded-xl mb-1">
                            <Coins size={20} />
                         </div>
                         <h4 className="font-black text-slate-900 text-lg">230 Coins</h4>
                         <p className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">15% Extra</p>
                         <span className="text-xl font-black text-slate-800 mt-2">₹200</span>
                      </div>

                      {/* Bundle 300 */}
                      <div 
                        onClick={() => initiatePayment(300, 'BUNDLE_300')}
                        className="p-4 rounded-[1.5rem] border-4 border-yellow-400 bg-yellow-50/50 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all flex flex-col items-center justify-center gap-2 group text-center relative overflow-hidden"
                      >
                         <div className="absolute top-0 right-0 bg-yellow-400 text-black px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-xl">Best</div>
                         <div className="bg-yellow-400 text-black p-3 rounded-xl mb-1 shadow-sm">
                            <Zap size={20} fill="currentColor" />
                         </div>
                         <h4 className="font-black text-slate-900 text-lg">350 Coins</h4>
                         <p className="text-xs text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded">Max Value</p>
                         <span className="text-2xl font-black text-slate-900 mt-2">₹300</span>
                      </div>
                  </div>

                  {/* Custom Amount */}
                  <div className="pt-4 border-t border-slate-100">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center mb-3">Or Enter Custom Amount</p>
                      <div className="flex gap-2">
                          <div className="relative flex-1">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
                              <input 
                                  type="number" 
                                  value={customAmount}
                                  onChange={(e) => {
                                      setCustomAmount(e.target.value);
                                      setError('');
                                  }}
                                  placeholder="e.g. 50"
                                  className="w-full pl-8 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                              />
                          </div>
                          <button 
                              onClick={handleCustomPayment}
                              className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-lg"
                          >
                              Add
                          </button>
                      </div>
                      {error && <p className="text-red-500 text-xs font-bold mt-2 text-center">{error}</p>}
                  </div>
               </div>
             )}

             {step === 'PAY' && (
               <div className="space-y-6 text-center animate-in slide-in-from-right duration-300">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">You Pay</p>
                    <div className="flex items-center justify-center gap-2">
                        {discount > 0 && (
                            <span className="text-lg font-bold text-slate-400 line-through">₹{selectedAmount}</span>
                        )}
                        <span className="text-4xl font-black text-slate-900">₹{finalAmount}</span>
                    </div>
                    <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl inline-block mt-2 font-bold text-xs">
                        Getting {getCoinsReceived(selectedAmount, selectedPlan)} Coins
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
                        Coins have been added to your wallet.
                     </p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg"
                  >
                    Continue Training
                  </button>
               </div>
             )}

          </div>
       </div>
    </div>
  );
};

export default PaymentModal;
