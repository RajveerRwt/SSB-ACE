
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Star, Zap, CheckCircle, X, Loader2, QrCode, ArrowLeft, Smartphone, AlertCircle, Clock, Tag, CreditCard, BookOpen, ChevronRight, Coins, Plus, Info, Play, MonitorPlay } from 'lucide-react';
import { processRazorpayTransaction, getLatestPaymentRequest, validateCoupon, rewardCoins } from '../services/supabaseService';

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
  const [step, setStep] = useState<'SELECT' | 'PAY' | 'WATCH_AD' | 'SUCCESS'>('SELECT');
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [coinsToCredit, setCoinsToCredit] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<'PRO_SUBSCRIPTION' | 'STANDARD_SUBSCRIPTION' | 'INTERVIEW_ADDON' | 'COIN_PACK'>('COIN_PACK');
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Ad State
  const [adTimer, setAdTimer] = useState(15);
  const [isAdPlaying, setIsAdPlaying] = useState(false);

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
        setIsAdPlaying(false);
        setAdTimer(15);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: any;
    if (isAdPlaying && adTimer > 0) {
        timer = setInterval(() => setAdTimer(prev => prev - 1), 1000);
    } else if (isAdPlaying && adTimer === 0) {
        handleAdReward();
    }
    return () => clearInterval(timer);
  }, [isAdPlaying, adTimer]);

  if (!isOpen) return null;

  const initiatePayment = (amount: number, coins: number, type: 'COIN_PACK') => {
    setSelectedAmount(amount);
    setCoinsToCredit(coins);
    setSelectedPlan(type);
    setStep('PAY');
    setError('');
    setCouponCode('');
    setAppliedCoupon('');
    setDiscount(0);
    setCouponMessage(null);
  };

  const startAd = () => {
      setStep('WATCH_AD');
      setIsAdPlaying(true);
      setAdTimer(15);
  };

  const handleAdReward = async () => {
      setIsAdPlaying(false);
      setProcessing(true);
      try {
          await rewardCoins(userId, 5, "Watch Ad");
          setCoinsToCredit(5);
          setStep('SUCCESS');
          onSuccess();
      } catch (e) {
          setError("Failed to credit ad reward.");
      } finally {
          setProcessing(false);
      }
  };

  const handleCustomProceed = () => {
      const amount = parseInt(customAmount);
      if (!amount || amount < 10) {
          setError("Minimum amount is ₹10");
          return;
      }
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
    if (!code) { setValidatingCoupon(false); return; }
    try {
        const result = await validateCoupon(code);
        if (result.valid) {
            const discountAmount = Math.ceil(selectedAmount * (result.discount / 100));
            setDiscount(discountAmount);
            setAppliedCoupon(code);
            setCouponMessage({ type: 'success', text: result.message });
        } else {
            setDiscount(0); setAppliedCoupon('');
            setCouponMessage({ type: 'error', text: result.message });
        }
    } catch (e) { setCouponMessage({ type: 'error', text: "Verification failed." }); } finally { setValidatingCoupon(false); }
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
    if (!res) { setError("Payment gateway failed."); setProcessing(false); return; }
    let keyId = process.env.RAZORPAY_KEY_ID || "rzp_live_S6bUN9RquDzbeY";

    const options = {
      key: keyId, 
      amount: finalAmount * 100, 
      currency: "INR",
      name: "SSBPREP.ONLINE",
      description: `Coin Recharge: ${coinsToCredit} Coins`,
      image: "https://ssbprep.online/logo.svg",
      handler: async function (response: any) {
        try {
            await processRazorpayTransaction(userId, response.razorpay_payment_id, finalAmount, selectedPlan, appliedCoupon, coinsToCredit);
            setStep('SUCCESS');
            setProcessing(false);
            onSuccess(); 
        } catch (e: any) { setError("Coin credit failed. Contact Support."); setProcessing(false); }
      },
      prefill: { name: "", email: "", contact: "" },
      notes: { plan: selectedPlan, userId: userId, coins: coinsToCredit },
      theme: { color: "#1e293b" }
    };

    try {
        const paymentObject = new window.Razorpay(options);
        paymentObject.on('payment.failed', function (response: any){ setError(response.error.description); setProcessing(false); });
        paymentObject.open();
    } catch (e) { setError("Gateway error."); setProcessing(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
       <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="bg-slate-950 p-6 text-center relative shrink-0">
             <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors" disabled={isAdPlaying}>
               <X size={20} />
             </button>
             {(step === 'PAY' || (step === 'WATCH_AD' && !isAdPlaying)) && (
               <button onClick={() => setStep('SELECT')} className="absolute top-6 left-6 text-slate-500 hover:text-white transition-colors">
                 <ArrowLeft size={20} />
               </button>
             )}
             <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg text-black">
               <Coins size={24} />
             </div>
             <h3 className="text-white font-black uppercase tracking-widest text-lg">Aspirant Wallet</h3>
             <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Deployment Readiness Credits</p>
          </div>

          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
             
             {step === 'SELECT' && (
               <div className="space-y-8">
                  
                  {/* REWARDED AD OPTION */}
                  <div 
                    onClick={startAd}
                    className="bg-slate-900 p-6 rounded-[2rem] border-4 border-yellow-500/30 flex items-center justify-between group cursor-pointer hover:bg-black transition-all shadow-xl relative overflow-hidden"
                  >
                      <div className="absolute -right-4 -bottom-4 text-white/5 rotate-12">
                          <Zap size={120} />
                      </div>
                      <div className="flex items-center gap-4 relative z-10">
                          <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center text-black group-hover:scale-110 transition-transform">
                              <MonitorPlay size={24} />
                          </div>
                          <div>
                              <h4 className="text-white font-black uppercase text-sm tracking-widest">Logistics Support</h4>
                              <p className="text-yellow-500 text-[10px] font-bold uppercase">Watch drill & earn 5 Coins</p>
                          </div>
                      </div>
                      <div className="bg-white/10 px-4 py-2 rounded-xl text-yellow-400 font-black text-lg relative z-10">
                          +5 <span className="text-[10px] uppercase">Coins</span>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div onClick={() => initiatePayment(100, 110, 'COIN_PACK')} className="p-6 bg-white border-2 border-slate-100 rounded-[2rem] hover:border-blue-500 hover:shadow-xl cursor-pointer transition-all text-center">
                          <div className="text-[9px] font-black text-green-500 uppercase">+10 Bonus</div>
                          <h4 className="text-3xl font-black text-slate-900 mb-1">110</h4>
                          <p className="text-sm font-bold text-blue-600">₹100</p>
                      </div>
                      <div onClick={() => initiatePayment(200, 230, 'COIN_PACK')} className="p-6 bg-blue-50 border-2 border-blue-200 rounded-[2rem] hover:border-blue-600 hover:shadow-xl cursor-pointer transition-all text-center transform hover:-translate-y-1">
                          <div className="text-[9px] font-black text-blue-600 uppercase">+30 Bonus</div>
                          <h4 className="text-3xl font-black text-slate-900 mb-1">230</h4>
                          <p className="text-sm font-bold text-blue-700">₹200</p>
                      </div>
                      <div onClick={() => initiatePayment(300, 350, 'COIN_PACK')} className="p-6 bg-slate-900 border-2 border-slate-800 rounded-[2rem] hover:border-yellow-400 hover:shadow-xl cursor-pointer transition-all text-center">
                          <div className="text-[9px] font-black text-yellow-400 uppercase">+50 Bonus</div>
                          <h4 className="text-3xl font-black text-white mb-1">350</h4>
                          <p className="text-sm font-bold text-yellow-400">₹300</p>
                      </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">Custom Refill</label>
                      <div className="flex gap-4">
                          <div className="relative flex-1">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                              <input type="number" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="Enter Amount" className="w-full pl-8 pr-4 py-4 rounded-2xl border-none outline-none font-black text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all bg-white" />
                          </div>
                          <button onClick={handleCustomProceed} className="bg-slate-900 text-white px-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all">Proceed</button>
                      </div>
                  </div>
               </div>
             )}

             {step === 'WATCH_AD' && (
                 <div className="text-center py-10 space-y-8 animate-in zoom-in duration-500">
                     <div className="relative w-40 h-40 mx-auto">
                        <div className="absolute inset-0 bg-yellow-400/20 rounded-full animate-ping"></div>
                        <div className="relative w-full h-full bg-slate-900 rounded-full border-8 border-yellow-400 flex flex-col items-center justify-center shadow-2xl">
                            <span className="text-5xl font-black text-white">{adTimer}</span>
                            <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Seconds Left</span>
                        </div>
                     </div>
                     
                     <div className="space-y-3">
                         <h4 className="text-2xl font-black text-slate-900 uppercase">Aspirant Briefing</h4>
                         <p className="text-slate-500 text-sm font-medium leading-relaxed italic px-8">
                             "Patience and focus are virtues of an Officer. Complete this session to receive logistics credits."
                         </p>
                     </div>
                     
                     <div className="w-full max-w-sm mx-auto h-2 bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-yellow-400 transition-all duration-1000 ease-linear" style={{ width: `${(15-adTimer)/15*100}%` }}></div>
                     </div>
                 </div>
             )}

             {step === 'PAY' && (
               <div className="space-y-6 text-center animate-in slide-in-from-right duration-300">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Adding {coinsToCredit} Coins</p>
                    <div className="flex items-center justify-center gap-2">
                        {discount > 0 && <span className="text-lg font-bold text-slate-400 line-through">₹{selectedAmount}</span>}
                        <span className="text-4xl font-black text-slate-900">₹{finalAmount}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Coupon Code" className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-slate-900 transition-all" disabled={discount > 0} />
                          </div>
                          <button onClick={discount > 0 ? () => { setDiscount(0); setCouponCode(''); setAppliedCoupon(''); setCouponMessage(null); } : handleApplyCoupon} disabled={validatingCoupon} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${discount > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-900 text-white'}`}>
                              {validatingCoupon ? <Loader2 size={12} className="animate-spin" /> : (discount > 0 ? 'Remove' : 'Apply')}
                          </button>
                      </div>
                      {couponMessage && <p className={`text-[10px] font-bold mt-2 ${couponMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{couponMessage.text}</p>}
                  </div>

                  {error && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-xs font-bold"><AlertCircle size={16} /> {error}</div>}

                  <button onClick={handlePayNow} disabled={processing} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                    {processing ? <Loader2 className="animate-spin" size={16} /> : <CreditCard size={16} />}
                    {processing ? 'Uplinking...' : `Pay ₹${finalAmount}`}
                  </button>
               </div>
             )}

             {step === 'SUCCESS' && (
               <div className="text-center space-y-6 py-6 animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto border-4 border-green-50 shadow-xl">
                     <CheckCircle size={40} />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-2xl font-black text-slate-900 uppercase">Supply Drop Successful!</h3>
                     <p className="text-slate-500 font-medium text-sm leading-relaxed px-4">
                        {coinsToCredit} Coins added to your dossier. Ready for deployment.
                     </p>
                  </div>
                  <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg">Carry On</button>
               </div>
             )}

          </div>
       </div>
    </div>
  );
};

export default PaymentModal;
