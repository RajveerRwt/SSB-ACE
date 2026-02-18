
import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle, AlertTriangle, Activity, Brain, Target, Mic, Download, Loader2, RefreshCw, Printer, ThumbsUp, ThumbsDown, MinusCircle, Clock } from 'lucide-react';
import { evaluatePerformance } from '../services/geminiService';
import { updateTestAttempt } from '../services/supabaseService';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  testType: string;
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, data, testType }) => {
  const [localData, setLocalData] = useState(data);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => { setLocalData(data); }, [data]);

  if (!isOpen || !localData) return null;

  const result = localData.result_data || localData; 
  const isPending = result.score === 0 || result.isPending || result.error;

  const attemptRetry = async () => {
      if (isRetrying) return;
      setIsRetrying(true);
      try {
          const newResult = await evaluatePerformance(testType, result);
          if (newResult && (newResult.score > 0 || !newResult.isPending)) {
              const merged = { ...result, ...newResult, error: false, isPending: false };
              if (localData.id) await updateTestAttempt(localData.id, merged);
              setLocalData({ ...localData, result_data: merged, score: merged.score });
          } else {
              alert("Server is still busy. Please try again in 5-10 minutes.");
          }
      } catch (e) {
          console.log("Retry failed");
      } finally {
          setIsRetrying(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 flex justify-between items-center bg-slate-50 border-b">
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isPending ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-blue-600'}`}>
                 <FileText size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900 uppercase">Assessment Dossier</h3>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{testType}</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 bg-white hover:bg-slate-200 rounded-full transition-colors text-slate-500 border border-slate-200"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8">
            <div className={`p-8 rounded-[2rem] border-2 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden ${isPending ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-900 text-white border-slate-800'}`}>
                <div className="space-y-2 text-center md:text-left z-10">
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isPending ? 'bg-indigo-200 text-indigo-800' : 'bg-yellow-400 text-black'}`}>
                        {isPending ? 'Analyzing Protocol' : 'Final Grade'}
                    </span>
                    <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{isPending ? 'Status: Queued' : `Score: ${result.score}/10`}</h2>
                    <p className={`text-sm font-medium ${isPending ? 'text-indigo-900' : 'text-slate-400'} leading-relaxed max-w-lg mt-4`}>
                        {isPending ? "Our AI psychologists are processing your dossier in the background. High traffic might delay scores." : result.recommendations}
                    </p>
                </div>
                {isPending && (
                    <button onClick={attemptRetry} disabled={isRetrying} className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-xl flex items-center gap-3 disabled:opacity-50">
                        {isRetrying ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16}/>} Check Result
                    </button>
                )}
            </div>

            {!isPending && result.recommendations && (
                <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-8 rounded-[2rem] border border-green-100 bg-green-50/50">
                            <h4 className="text-green-700 font-black uppercase text-xs tracking-widest mb-6 flex items-center gap-3"><ThumbsUp size={18}/> Strengths</h4>
                            <ul className="space-y-3">
                                {result.strengths?.map((s: string, i: number) => <li key={i} className="text-sm font-bold text-slate-700 flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"/> {s}</li>)}
                            </ul>
                        </div>
                        <div className="p-8 rounded-[2rem] border border-red-100 bg-red-50/50">
                            <h4 className="text-red-700 font-black uppercase text-xs tracking-widest mb-6 flex items-center gap-3"><AlertTriangle size={18}/> Improvements</h4>
                            <ul className="space-y-3">
                                {result.weaknesses?.map((w: string, i: number) => <li key={i} className="text-sm font-bold text-slate-700 flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"/> {w}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200">
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Original Transmission</h4>
                <div className="text-sm font-medium text-slate-700 italic leading-relaxed line-clamp-6 opacity-60">
                    {result.story || result.transcript || JSON.stringify(result.srtResponses || result.watResponses || "Dossier captured.")}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
