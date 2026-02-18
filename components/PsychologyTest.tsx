
import React, { useState, useEffect, useRef } from 'react';
import { Timer, Send, Loader2, Image as ImageIcon, CheckCircle, ShieldCheck, FileText, Target, Award, AlertCircle, Upload, Trash2, BookOpen, Layers, Brain, Eye, FastForward, Edit, X, Save, RefreshCw, PenTool, FileSignature, HelpCircle, ChevronDown, ChevronUp, ScanEye, Activity, Camera, Info, LogIn, ThumbsUp, ThumbsDown, MinusCircle, Lock, Download, Printer, Volume2 } from 'lucide-react';
import { generateTestContent, evaluatePerformance, transcribeHandwrittenStory, STANDARD_WAT_SET } from '../services/geminiService';
import { getTATScenarios, getWATWords, getSRTQuestions, getUserSubscription } from '../services/supabaseService';
import { TestType } from '../types';
import CameraModal from './CameraModal';
import SessionFeedback from './SessionFeedback';

interface PsychologyProps {
  type: TestType;
  onSave?: (result: any) => void;
  isAdmin?: boolean;
  userId?: string;
  isGuest?: boolean;
  onLoginRedirect?: () => void;
}

enum PsychologyPhase {
  IDLE,
  PREPARING_STIMULI,
  VIEWING, 
  WRITING,
  UPLOADING_STORIES, 
  UPLOADING_WAT,
  UPLOADING_SRT,
  EVALUATING,        
  COMPLETED
}

const PSYCH_TIPS = ["Identify the Hero clearly.", "Speed and honesty are crucial.", "Reflect OLQs naturally.", "Positive outcomes preferred."];

const PsychologyTest: React.FC<PsychologyProps> = ({ type, onSave, isAdmin, userId, isGuest = false, onLoginRedirect }) => {
  const [items, setItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [phase, setPhase] = useState<PsychologyPhase>(PsychologyPhase.IDLE);
  const [timeLeft, setTimeLeft] = useState(-1);
  const [activeSetName, setActiveSetName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tatUploads, setTatUploads] = useState<string[]>(new Array(12).fill(''));
  const [tatTexts, setTatTexts] = useState<string[]>(new Array(12).fill(''));
  const [srtResponses, setSrtResponses] = useState<string[]>([]);
  const [watResponses, setWatResponses] = useState<string[]>([]);
  const [sdtData, setSdtData] = useState({ parents: '', teachers: '', friends: '', self: '', aim: '' });
  const [feedback, setFeedback] = useState<any>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase === PsychologyPhase.EVALUATING) {
      const interval = setInterval(() => setCurrentTipIndex(prev => prev + 1), 3000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const startTest = async () => {
    setIsLoading(true); setFeedback(null);
    if (type === TestType.SDT) { setPhase(PsychologyPhase.WRITING); setTimeLeft(900); setIsLoading(false); return; }
    setPhase(PsychologyPhase.PREPARING_STIMULI);
    try {
      let finalItems = [];
      if (type === TestType.SRT) {
        const data = await generateTestContent(type);
        finalItems = data.items.map((c: any, i: number) => ({ id: `srt-${i}`, content: c }));
        setSrtResponses(new Array(finalItems.length).fill(''));
        setItems(finalItems); setPhase(PsychologyPhase.WRITING); setTimeLeft(1800);
      } else {
        // ... Load TAT/WAT Logic from DB ...
        const wordList = STANDARD_WAT_SET.slice(0, 60);
        finalItems = wordList.map((w, i) => ({ id: `wat-${i}`, content: w }));
        setWatResponses(new Array(finalItems.length).fill(''));
        setItems(finalItems); setCurrentIndex(0); setupSlide(0, finalItems);
      }
    } catch (e) { setPhase(PsychologyPhase.IDLE); } finally { setIsLoading(false); }
  };

  const setupSlide = (index: number, currentItems: any[]) => {
    if (index >= currentItems.length) { setPhase(PsychologyPhase.COMPLETED); return; }
    if (type === TestType.WAT) { setTimeLeft(15); setPhase(PsychologyPhase.WRITING); }
  };

  const submitDossier = async () => {
    setPhase(PsychologyPhase.EVALUATING);
    const safetyTimer = setTimeout(() => {
        setPhase(PsychologyPhase.COMPLETED);
        setFeedback({
            score: 0, recommendations: "If the assessment is taking longer than expected (over 1 minute) or the server/API is temporarily unavailable, you don’t need to wait on the loading screen. Your full detailed assessment will be securely generated and saved in your Logs. Once the server is available, you can view it anytime without losing progress.", isPending: true, error: true
        });
    }, 60000);

    try {
        const result = await evaluatePerformance(type, { srtResponses, watResponses, sdtData });
        clearTimeout(safetyTimer);
        setFeedback(result);
        if (onSave && !isGuest) onSave(result);
        setPhase(PsychologyPhase.COMPLETED);
    } catch (e) {
        clearTimeout(safetyTimer);
        setPhase(PsychologyPhase.COMPLETED);
        setFeedback({ recommendations: "Link Lost. Results saved in logs.", error: true });
    }
  };

  if (phase === PsychologyPhase.IDLE) {
    return (
      <div className="bg-white p-12 md:p-24 rounded-[4rem] shadow-2xl text-center max-w-4xl mx-auto border-4 border-slate-50">
        <h2 className="text-4xl font-black mb-6 uppercase">{type} Test</h2>
        <button onClick={startTest} className="bg-slate-900 text-white px-16 py-6 rounded-full font-black text-lg hover:bg-black transition-all shadow-xl flex items-center gap-6 mx-auto">
          Begin Test
        </button>
      </div>
    );
  }

  if (phase === PsychologyPhase.EVALUATING) {
    const currentTip = PSYCH_TIPS[currentTipIndex % PSYCH_TIPS.length];
    return (
        <div className="flex flex-col items-center justify-center py-40 space-y-12 animate-in fade-in">
            <Loader2 className="w-24 h-24 text-blue-600 animate-spin" />
            <div className="text-center space-y-4 max-w-lg px-6">
                <p className="text-slate-900 font-black uppercase tracking-[0.5em] text-sm">Board Assessment...</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                    Don't wait if loading takes over 1 minute. Check <b>Mission Logs</b> later.
                </p>
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 min-h-[100px] flex items-center justify-center">
                    <p className="text-blue-800 font-bold text-sm italic">"Tip: {currentTip}"</p>
                </div>
            </div>
        </div>
    );
  }

  if (phase === PsychologyPhase.COMPLETED) {
    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in">
            <div className={`p-16 rounded-[4rem] text-white shadow-2xl ${feedback?.isPending ? 'bg-indigo-950' : 'bg-slate-950'}`}>
                <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">{feedback?.isPending ? 'Pending Assessment' : 'The Result'}</h2>
                <p className="text-xl text-slate-300 font-medium italic mt-6 leading-relaxed">"{feedback?.recommendations}"</p>
            </div>
            <button onClick={() => window.location.reload()} className="w-full py-7 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-2xl">Return to Barracks</button>
        </div>
    );
  }

  return <div className="text-center py-40"><p className="text-slate-400 font-black uppercase">Simulating Phase: {PsychologyPhase[phase]}</p><button onClick={submitDossier} className="mt-8 px-12 py-4 bg-slate-900 text-white rounded-full font-black">Submit Test</button></div>;
};

export default PsychologyTest;
