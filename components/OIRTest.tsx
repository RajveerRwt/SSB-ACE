
import React, { useState, useEffect } from 'react';
import { generateOIRQuestions } from '../services/geminiService';
import { Loader2, Timer, CheckCircle, AlertCircle, Brain, RefreshCw, XCircle, LogIn, Coins } from 'lucide-react';
import { TEST_RATES } from '../services/supabaseService';

interface OIRTestProps {
  onSave?: (result: any) => void;
  isAdmin?: boolean;
  userId?: string;
  isGuest?: boolean;
  onLoginRedirect?: () => void;
  onConsumeCoins?: (cost: number) => Promise<boolean>;
}

const OIRTest: React.FC<OIRTestProps> = ({ onSave, isGuest, onLoginRedirect, onConsumeCoins }) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<'INTRO' | 'LOADING' | 'ACTIVE' | 'RESULT'>('INTRO');
  const [timeLeft, setTimeLeft] = useState(1200); // 20 mins
  const [score, setScore] = useState(0);
  const [oirRating, setOirRating] = useState(0);

  useEffect(() => {
    let timer: any;
    if (status === 'ACTIVE' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && status === 'ACTIVE') {
      handleSubmit();
    }
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  const startTest = async () => {
    if (!isGuest && onConsumeCoins) {
        const success = await onConsumeCoins(TEST_RATES.OIR);
        if (!success) return;
    }

    setStatus('LOADING');
    try {
        const qs = await generateOIRQuestions();
        if (qs && qs.length > 0) {
            setQuestions(qs);
            setStatus('ACTIVE');
            setTimeLeft(qs.length * 60); // 1 min per question avg
        } else {
            alert("Failed to generate test. Please try again.");
            setStatus('INTRO');
        }
    } catch (e) {
        console.error(e);
        setStatus('INTRO');
    }
  };

  const handleAnswer = (qid: number, option: string) => {
      setUserAnswers(prev => ({ ...prev, [qid]: option }));
  };

  const handleSubmit = () => {
      let correct = 0;
      questions.forEach(q => {
          if (userAnswers[q.id] === q.correctAnswer) correct++;
      });
      
      const percentage = (correct / questions.length) * 100;
      let rating = 5;
      if (percentage >= 90) rating = 1;
      else if (percentage >= 80) rating = 2;
      else if (percentage >= 70) rating = 3;
      else if (percentage >= 60) rating = 4;

      setScore(correct);
      setOirRating(rating);
      setStatus('RESULT');
      
      if (onSave && !isGuest) {
          onSave({ score: correct, oirRating: rating, total: questions.length, answers: userAnswers });
      }
  };

  const formatTime = (s: number) => {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (status === 'INTRO') {
      return (
          <div className="max-w-4xl mx-auto py-12 md:py-20 animate-in fade-in duration-500">
              <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-slate-100 text-center">
                  <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg text-white">
                      <Brain size={40} />
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter mb-4">Officer Intelligence Rating</h1>
                  <p className="text-slate-500 text-sm md:text-base font-medium max-w-xl mx-auto leading-relaxed mb-8">
                      The OIR test assesses your logical and analytical reasoning. It is the first hurdle in the Screening (Stage-1) process.
                      You will face Verbal and Non-Verbal questions under strict time limits.
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-6 mb-10 text-left">
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                          <h4 className="font-black text-blue-900 text-xs uppercase tracking-widest mb-1">Total Questions</h4>
                          <p className="text-2xl font-black text-blue-600">25 - 30</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                          <h4 className="font-black text-purple-900 text-xs uppercase tracking-widest mb-1">Time Limit</h4>
                          <p className="text-2xl font-black text-purple-600">Adaptive</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                          <h4 className="font-black text-green-900 text-xs uppercase tracking-widest mb-1">Target OIR</h4>
                          <p className="text-2xl font-black text-green-600">1 (Elite)</p>
                      </div>
                  </div>

                  {isGuest ? (
                      <button onClick={onLoginRedirect} className="px-12 py-5 bg-yellow-400 text-black rounded-full font-black uppercase tracking-widest text-xs hover:bg-yellow-300 transition-all shadow-xl flex items-center justify-center gap-2 mx-auto">
                          <LogIn size={16} /> Login to Start
                      </button>
                  ) : (
                      <button onClick={startTest} className="px-12 py-5 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2 mx-auto">
                          <Coins size={16} className="text-yellow-400" /> Start Test (5 Coins)
                      </button>
                  )}
              </div>
          </div>
      );
  }

  if (status === 'LOADING') {
      return (
          <div className="flex flex-col items-center justify-center py-40 space-y-6">
              <Loader2 className="w-16 h-16 text-slate-900 animate-spin" />
              <p className="font-black text-slate-500 uppercase tracking-widest text-xs">Generating Unique Test Set...</p>
          </div>
      );
  }

  if (status === 'RESULT') {
      return (
          <div className="max-w-3xl mx-auto py-12 md:py-20 animate-in zoom-in duration-500">
              <div className="bg-slate-900 text-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl text-center border-4 border-slate-800">
                  <p className="font-black text-slate-400 uppercase tracking-widest text-xs mb-4">Assessment Complete</p>
                  <div className="text-9xl font-black text-yellow-400 mb-2">{oirRating}</div>
                  <h2 className="text-2xl font-black uppercase tracking-tight mb-6">OIR Rating Achieved</h2>
                  
                  <div className="flex justify-center gap-8 mb-8">
                      <div className="text-center">
                          <span className="block text-2xl font-bold">{score}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Correct</span>
                      </div>
                      <div className="text-center">
                          <span className="block text-2xl font-bold">{questions.length}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Total</span>
                      </div>
                      <div className="text-center">
                          <span className="block text-2xl font-bold">{Math.round((score/questions.length)*100)}%</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Accuracy</span>
                      </div>
                  </div>

                  <button onClick={() => setStatus('INTRO')} className="px-8 py-4 bg-white text-slate-900 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all">
                      Return to Menu
                  </button>
              </div>
          </div>
      );
  }

  return (
      <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
          <div className="sticky top-4 z-20 bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex justify-between items-center mx-4 md:mx-0">
              <div className="flex items-center gap-3">
                  <Brain size={20} className="text-yellow-400" />
                  <span className="font-black uppercase tracking-widest text-xs hidden md:inline">OIR Test In Progress</span>
              </div>
              <div className={`font-mono font-black text-xl ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {formatTime(timeLeft)}
              </div>
              <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-green-700">
                  Submit
              </button>
          </div>

          <div className="grid grid-cols-1 gap-6 px-4 md:px-0">
              {questions.map((q, i) => (
                  <div key={q.id} className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex gap-4 mb-4">
                          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-black text-sm text-slate-500 shrink-0">
                              {i + 1}
                          </div>
                          <h3 className="font-bold text-slate-800 text-lg">{q.question}</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
                          {q.options.map((opt: string, idx: number) => (
                              <button
                                  key={idx}
                                  onClick={() => handleAnswer(q.id, opt)}
                                  className={`p-4 rounded-xl text-left text-sm font-medium transition-all border-2 ${
                                      userAnswers[q.id] === opt 
                                      ? 'bg-slate-900 border-slate-900 text-white' 
                                      : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                                  }`}
                              >
                                  {opt}
                              </button>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );
};

export default OIRTest;
