
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Star, Zap, CheckCircle, X, Loader2, QrCode, ArrowLeft, Smartphone, AlertCircle, Clock, Tag, CreditCard, BookOpen, ChevronRight, Coins, Plus, Info } from 'lucide-react';
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
  const [coinsToCredit, setCoinsToCredit] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<'PRO_SUBSCRIPTION' | 'STANDARD_SUBSCRIPTION' | 'INTERVIEW_ADDON' | 'COIN_PACK'>('COIN_PACK');
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

  const initiatePayment = (amount: number, coins: number, type: 'COIN_PACK') => {
    setSelectedAmount(amount);
    setCoinsToCredit(coins);
    setSelectedPlan(type);
    setStep('PAY');
    setError('');
    // Reset Coupon
    setCouponCode('');
    setAppliedCoupon('');
    setDiscount(0);
    setCouponMessage(null);
  };

  const handleCustomProceed = () => {
      const amount = parseInt(customAmount);
      if (!amount || amount < 10) {
          setError("Minimum amount is ₹10");
          return;
      }
      // Check for bundle matches to award bonus even if typed manually
      let coins = amount;
      if (amount === 100) coins = 110;
      if (amount === 200) coins = 230;
      if (amount === 300) coins = 350;

      initiatePayment(amount, coins, 'COIN_PACK');
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

    // Robust Key Retrieval
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
        console.error("Razorpay Key is missing.");
        setError("Payment System Error: Merchant Key Missing.");
        setProcessing(false);
        return;
    }

    const options = {
      key: keyId, 
      amount: finalAmount * 100, 
      currency: "INR",
      name: "SSBPREP.ONLINE",
      description: `Coin Recharge: ${coinsToCredit} Coins`,
      image: "https://ssbprep.online/logo.svg",
      handler: async function (response: any) {
        try {
            await processRazorpayTransaction(
                userId, 
                response.razorpay_payment_id, 
                finalAmount, 
                selectedPlan, 
                appliedCoupon,
                coinsToCredit // Pass calculated coins explicitly
            );
            setStep('SUCCESS');
            setProcessing(false);
            onSuccess(); 
        } catch (e: any) {
            setError("Payment successful but coin credit failed. Contact Support: " + response.razorpay_payment_id);
            setProcessing(false);
        }
      },
      prefill: { name: "", email: "", contact: "" },
      notes: { plan: selectedPlan, userId: userId, coins: coinsToCredit },
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
             <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg text-black">
               <Coins size={24} />
             </div>
             <h3 className="text-white font-black uppercase tracking-widest text-lg">Wallet Recharge</h3>
             <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Add Coins to Unlock Tests</p>
          </div>

          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
             
             {step === 'SELECT' && (
               <div className="space-y-8">
                  
                  {/* COIN BUNDLES */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Bundle 1 */}
                      <div 
                        onClick={() => initiatePayment(100, 110, 'COIN_PACK')}
                        className="p-6 bg-white border-2 border-slate-100 rounded-[2rem] hover:border-blue-500 hover:shadow-xl cursor-pointer transition-all group relative overflow-hidden text-center"
                      >
                          <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">+10 Free</div>
                          <h4 className="text-3xl font-black text-slate-900 mb-1">110 <span className="text-sm text-slate-400">Coins</span></h4>
                          <p className="text-lg font-bold text-blue-600">₹100</p>
                      </div>

                      {/* Bundle 2 */}
                      <div 
                        onClick={() => initiatePayment(200, 230, 'COIN_PACK')}
                        className="p-6 bg-blue-50 border-2 border-blue-200 rounded-[2rem] hover:border-blue-600 hover:shadow-xl cursor-pointer transition-all group relative overflow-hidden text-center transform hover:-translate-y-1"
                      >
                          <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">+30 Free</div>
                          <div className="absolute -left-4 -bottom-4 text-blue-100">
                              <Coins size={64} />
                          </div>
                          <h4 className="text-3xl font-black text-slate-900 mb-1 relative z-10">230 <span className="text-sm text-slate-500">Coins</span></h4>
                          <p className="text-lg font-bold text-blue-700 relative z-10">₹200</p>
                      </div>

                      {/* Bundle 3 */}
                      <div 
                        onClick={() => initiatePayment(300, 350, 'COIN_PACK')}
                        className="p-6 bg-slate-900 border-2 border-slate-800 rounded-[2rem] hover:border-yellow-400 hover:shadow-xl cursor-pointer transition-all group relative overflow-hidden text-center"
                      >
                          <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">+50 Free</div>
                          <h4 className="text-3xl font-black text-white mb-1">350 <span className="text-sm text-slate-500">Coins</span></h4>
                          <p className="text-lg font-bold text-yellow-400">₹300</p>
                      </div>
                  </div>

                  {/* CUSTOM AMOUNT */}
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">Custom Amount</label>
                      <div className="flex gap-4">
                          <div className="relative flex-1">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                              <input 
                                type="number" 
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                placeholder="Enter Amount" 
                                className="w-full pl-8 pr-4 py-4 rounded-2xl border-none outline-none font-black text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                              />
                          </div>
                          <button 
                            onClick={handleCustomProceed}
                            className="bg-slate-900 text-white px-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-lg"
                          >
                              Proceed
                          </button>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-2">
                          <Info size={12} /> 1 Rupee = 1 Coin (No Bonus on custom amounts)
                      </p>
                      {error && <p className="text-red-500 text-xs font-bold mt-2">{error}</p>}
                  </div>

               </div>
             )}

             {step === 'PAY' && (
               <div className="space-y-6 text-center animate-in slide-in-from-right duration-300">
                  
                  {/* Amount Display */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Adding {coinsToCredit} Coins</p>
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
                    {processing ? 'Processing Payment...' : `Pay ₹${finalAmount}`}
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
                        {coinsToCredit} Coins have been added to your wallet.
                     </p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg"
                  >
                    Continue
                  </button>
               </div>
             )}

          </div>
       </div>
    </div>
  );
};

export default PaymentModal;
