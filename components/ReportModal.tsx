
import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle, AlertTriangle, Activity, Brain, Target, Mic, Download, Loader2, RefreshCw, Printer, ThumbsUp, ThumbsDown, MinusCircle, ShieldAlert, Zap, History, Layout, BookOpen, Volume2, Award } from 'lucide-react';
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
  const [showScoreHelp, setShowScoreHelp] = useState(false);

  useEffect(() => {
      setLocalData(data);
  }, [data, isOpen]);

  if (!isOpen || !localData) return null;

  const result = localData.result_data || localData; 
  const isPending = (result.score === 0 || !result.score) && (result.verdict?.includes("Pending") || result.error);

  const attemptRetry = async () => {
      if (isRetrying) return;
      setIsRetrying(true);
      try {
          const newResult = await evaluatePerformance(testType, result);
          if (newResult && (newResult.score > 0 || !newResult.error)) {
              const merged = { ...result, ...newResult, error: false };
              if (localData.id) {
                  await updateTestAttempt(localData.id, merged);
              }
              setLocalData({ ...localData, result_data: merged, score: merged.score });
          } else {
              alert("Server is still busy. Please try again in a few minutes.");
          }
      } catch (e) {
          console.error("Retry failed", e);
      } finally {
          setIsRetrying(false);
      }
  };

  const handleDownload = () => window.print();

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300 print:bg-white print:p-0 print:static">
      <style>
        {`@media print { body * { visibility: hidden; } #report-content, #report-content * { visibility: visible; } #report-content { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white !important; color: black !important; } .no-print { display: none !important; } }`}
      </style>

      <div id="report-content" className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:h-auto">
        
        {/* Header */}
        <div className={`p-6 md:p-8 flex justify-between items-center shrink-0 ${isPending ? 'bg-yellow-50 border-b border-yellow-100' : 'bg-slate-50 border-b border-slate-100'}`}>
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isPending ? 'bg-yellow-100 text-yellow-600' : 'bg-white text-blue-600'}`}>
                 <FileText size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Mission Dossier</h3>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{testType} • {new Date(localData.timestamp || localData.created_at || Date.now()).toLocaleDateString()}</p>
              </div>
           </div>
           <div className="flex gap-2 no-print">
             {!isPending && <button onClick={handleDownload} className="p-2 bg-white hover:bg-blue-50 text-slate-600 rounded-full border border-slate-200"><Download size={20} /></button>}
             <button onClick={onClose} className="p-2 bg-white hover:bg-slate-200 rounded-full text-slate-500 border border-slate-200"><X size={20} /></button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar space-y-8">
            
            {/* Verdict Card */}
            <div className={`p-8 rounded-[2.5rem] border-2 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8 ${isPending ? 'bg-white border-yellow-400 border-dashed' : 'bg-slate-900 text-white border-slate-800'}`}>
                {isRetrying && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10"><Loader2 className="animate-spin text-blue-600" size={40} /></div>}
                <div className="space-y-3 text-center md:text-left z-0 flex-1">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isPending ? 'bg-yellow-400 text-black' : 'bg-blue-600 text-white shadow-lg'}`}>
                        {isPending ? 'Awaiting Evaluation' : 'Psychology Result'}
                    </span>
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                        {isPending ? 'Processing...' : `Score: ${result.score}/10`}
                    </h2>
                    <p className={`text-sm font-medium leading-relaxed ${isPending ? 'text-slate-600 italic' : 'text-slate-400 opacity-80'}`}>
                        {isPending ? "Dossier inputs saved. The psychologist is currently analyzing your data. Click below to refresh results." : (result.verdict || "Assessment Complete")}
                    </p>
                </div>
                {isPending ? (
                    <button onClick={attemptRetry} disabled={isRetrying} className="w-full md:w-auto px-10 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-[0_15px_30px_rgba(37,99,235,0.3)] hover:bg-blue-700 transition-all flex items-center justify-center gap-3 no-print active:scale-95">
                        <RefreshCw size={18} className={isRetrying ? 'animate-spin' : ''} /> Generate Assessment
                    </button>
                ) : (
                    <div className="bg-white/10 p-6 rounded-[2.5rem] border border-white/10 backdrop-blur-xl text-center min-w-[140px] shadow-2xl">
                        <Activity size={32} className="mx-auto mb-2 text-yellow-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analysis Grade</span>
                    </div>
                )}
            </div>

            {/* Assessment Details */}
            {!isPending && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4">
                    {/* Rubric Breakdown for PPDT */}
                    {testType.includes('PPDT') && result.scoreDetails && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase text-blue-600 mb-2">Perception</span>
                                <div className="text-4xl font-black text-slate-900">{result.scoreDetails.perception}/3</div>
                            </div>
                            <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase text-purple-600 mb-2">Content</span>
                                <div className="text-4xl font-black text-slate-900">{result.scoreDetails.content}/5</div>
                            </div>
                            <div className="bg-green-50 p-6 rounded-3xl border border-green-100 flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase text-green-600 mb-2">Expression</span>
                                <div className="text-4xl font-black text-slate-900">{result.scoreDetails.expression}/2</div>
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-50 p-6 md:p-10 rounded-[2.5rem] border border-slate-100 space-y-6">
                        <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2"><Brain size={18}/> Expert Remark</h4>
                        <p className="text-lg md:text-xl font-medium text-slate-700 italic leading-relaxed">"{result.recommendations}"</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-green-50/50 p-8 rounded-[2.5rem] border border-green-100">
                            <h4 className="font-black text-green-700 uppercase text-xs tracking-widest mb-6 flex items-center gap-2"><CheckCircle size={16}/> Key Strengths</h4>
                            <ul className="space-y-3">
                                {result.strengths?.map((s: string, i: number) => <li key={i} className="text-xs md:text-sm font-bold text-slate-700 flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"/> {s}</li>)}
                            </ul>
                        </div>
                        <div className="bg-red-50/50 p-8 rounded-[2.5rem] border border-red-100">
                            <h4 className="font-black text-red-700 uppercase text-xs tracking-widest mb-6 flex items-center gap-2"><AlertTriangle size={16}/> Improvement Areas</h4>
                            <ul className="space-y-3">
                                {result.weaknesses?.map((w: string, i: number) => <li key={i} className="text-xs md:text-sm font-bold text-slate-700 flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"/> {w}</li>)}
                            </ul>
                        </div>
                    </div>

                    {result.idealStory && (
                        <div className="bg-slate-900 p-8 md:p-10 rounded-[3rem] text-white space-y-4">
                            {/* Award icon is now correctly imported */}
                            <h4 className="text-lg font-black uppercase text-yellow-400 tracking-widest flex items-center gap-2"><Award size={20}/> Board's Ideal Story</h4>
                            <p className="text-sm md:text-base font-medium text-slate-300 leading-relaxed italic">"{result.idealStory}"</p>
                        </div>
                    )}
                </div>
            )}

            {/* Dossier Inputs Section */}
            <div className="border-t border-slate-100 pt-10 space-y-8">
                <div className="flex items-center gap-4">
                    <History size={24} className="text-slate-400" />
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Your Inputs</h3>
                </div>

                {/* Stimulus Preview */}
                {result.stimulusImage && (
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Stimulus Image</span>
                        <img src={`data:image/jpeg;base64,${result.stimulusImage}`} className="h-48 md:h-64 mx-auto object-contain rounded-xl shadow-lg grayscale contrast-125" />
                    </div>
                )}

                {/* User Responses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Story Image */}
                    {result.uploadedStoryImage && (
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Handwritten Sheet</span>
                            <img src={`data:image/jpeg;base64,${result.uploadedStoryImage}`} className="h-48 md:h-64 mx-auto object-contain rounded-xl shadow-lg" />
                        </div>
                    )}
                    {/* Digital Story */}
                    {result.story && (
                        <div className={`p-6 rounded-[2rem] border border-slate-200 bg-white ${!result.uploadedStoryImage ? 'md:col-span-2' : ''}`}>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Transcript</span>
                            <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">"{result.story}"</p>
                        </div>
                    )}
                </div>

                {/* Narration Log */}
                {result.narration && (
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Narration Transcript</span>
                        <p className="text-xs md:text-sm font-mono text-slate-600 leading-relaxed italic bg-white p-6 rounded-2xl border border-slate-100 shadow-inner">
                            "{result.narration}"
                        </p>
                    </div>
                )}
            </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 bg-slate-900 border-t border-slate-800 text-center no-print">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Official Assessment Protocol • 2026</p>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
