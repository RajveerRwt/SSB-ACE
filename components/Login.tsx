
import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Loader2, Shield, AlertCircle, User, UserPlus, LogIn, ArrowLeft } from 'lucide-react';
import { signInWithEmail, signUpWithEmail } from '../services/supabaseService';

interface LoginProps {
  onLogin: (identifier: string, email?: string) => void;
  onCancel?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onCancel }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (isSignUp && !fullName) {
      setError('Full Name is required for registration.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await signUpWithEmail(email, password, fullName);
        if (error) throw error;
        if (data.user) {
          if (data.session) {
            onLogin(data.user.id, data.user.email);
          } else {
            setSuccessMsg("Registration successful! Please check your email inbox to confirm your account before logging in.");
            setIsLoading(false);
          }
        }
      } else {
        const { data, error } = await signInWithEmail(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Invalid credentials. If you just registered, please check your email for a confirmation link.");
          }
          throw error;
        }
        if (data.user) {
          onLogin(data.user.id, data.user.email);
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || "Authentication failed.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen military-gradient flex flex-col items-center justify-center p-4 md:p-6 font-sans relative">
      {onCancel && (
        <button 
          onClick={onCancel}
          className="absolute top-6 left-6 md:top-8 md:left-8 text-slate-400 hover:text-white flex items-center gap-2 transition-all group z-50"
        >
          <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 border border-white/5 backdrop-blur-sm transition-all group-hover:scale-110">
             <ArrowLeft size={20} />
          </div>
          <span className="text-xs font-black uppercase tracking-widest opacity-0 md:opacity-100 md:translate-x-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">Return to Base</span>
        </button>
      )}

      <div className="mb-8 text-center space-y-4 animate-in fade-in slide-in-from-top-8 duration-700">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto border border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
          <ShieldCheck className="w-8 h-8 md:w-10 md:h-10 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">
            SSB<span className="text-yellow-400">PREP</span>.ONLINE
          </h1>
          <p className="text-blue-200 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] mt-3">
            PREPARE. LEAD. SUCCEED
          </p>
        </div>
      </div>

      <div className="w-full max-w-md bg-white rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden animate-in zoom-in duration-500">
        <Shield className="absolute -top-10 -right-10 w-40 h-40 md:w-64 md:h-64 text-slate-50 rotate-12 pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">
            {isSignUp ? 'Candidate Registration' : 'Restricted Access'}
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">
            {isSignUp ? 'Create your service record' : 'Enter credentials to proceed'}
          </p>
          
          {successMsg ? (
            <div className="p-6 bg-green-50 rounded-2xl border border-green-200 text-center space-y-4 animate-in fade-in">
               <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                 <ShieldCheck size={24} />
               </div>
               <p className="text-green-800 font-bold text-sm">{successMsg}</p>
               <button 
                  onClick={() => { setIsSignUp(false); setSuccessMsg(''); }}
                  className="w-full py-4 bg-green-600 text-white rounded-xl font-black uppercase text-xs tracking-widest"
               >
                 Back to Login
               </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleAuth} className="space-y-4 md:space-y-6">
                {isSignUp && (
                  <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Full Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Cadet Name"
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 focus:border-slate-900 rounded-2xl font-bold text-slate-800 outline-none transition-all placeholder:text-slate-300"
                        disabled={isLoading}
                      />
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="cadet@example.com"
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 focus:border-slate-900 rounded-2xl font-bold text-slate-800 outline-none transition-all placeholder:text-slate-300"
                      disabled={isLoading}
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 focus:border-slate-900 rounded-2xl font-bold text-slate-800 outline-none transition-all placeholder:text-slate-300"
                      disabled={isLoading}
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-red-500 bg-red-50 p-4 rounded-xl border border-red-100">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold leading-relaxed">{error}</p>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                    <>
                      {isSignUp ? 'Initialize Dossier' : 'Authenticate'} 
                      {isSignUp ? <UserPlus size={16} /> : <LogIn size={16} />}
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
                <button 
                  onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccessMsg(''); }}
                  className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {isSignUp ? 'Already registered? Login' : 'New Candidate? Register here'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      <p className="mt-8 text-center text-slate-400/50 text-[9px] font-black uppercase tracking-[0.5em]">
        Defense Aspirant Verification Protocol
      </p>
    </div>
  );
};

export default Login;
