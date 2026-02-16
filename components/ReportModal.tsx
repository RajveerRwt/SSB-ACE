
import React from 'react';
import { X, FileText, CheckCircle, AlertTriangle, Activity, Brain, Target, Mic, Download } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  testType: string;
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, data, testType }) => {
  if (!isOpen || !data) return null;

  const isError = data.score === 0 && (data.verdict === "Technical Failure" || data.error);
  const result = data.result_data || data; // Handle wrapping if coming from DB vs direct

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className={`p-6 md:p-8 flex justify-between items-center shrink-0 ${isError ? 'bg-red-50' : 'bg-slate-50'}`}>
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isError ? 'bg-red-100 text-red-600' : 'bg-white text-blue-600'}`}>
                 <FileText size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Mission Report</h3>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{testType} • {new Date(data.created_at || Date.now()).toLocaleDateString()}</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 bg-white hover:bg-slate-200 rounded-full transition-colors text-slate-500">
             <X size={20} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar space-y-8">
            
            {/* Verdict Banner */}
            <div className={`p-6 rounded-[2rem] border-2 ${isError ? 'bg-red-50 border-red-100' : 'bg-slate-900 text-white border-slate-800'} flex flex-col md:flex-row justify-between items-center gap-6`}>
                <div className="space-y-2 text-center md:text-left">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isError ? 'bg-red-200 text-red-800' : 'bg-yellow-400 text-black'}`}>
                        {isError ? 'System Alert' : 'Assessment Status'}
                    </span>
                    <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">
                        {isError ? 'Evaluation Pending' : `Score: ${result.score}/10`}
                    </h2>
                    <p className={`text-sm font-medium ${isError ? 'text-red-700' : 'text-slate-400'}`}>
                        {isError ? "AI Analysis unavailable at time of submission. Your raw inputs are saved below." : (result.verdict || "Assessment Complete")}
                    </p>
                </div>
                {!isError && (
                    <div className="flex gap-4">
                       <div className="text-center">
                          <Activity size={24} className="mx-auto mb-1 text-green-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Performance</span>
                       </div>
                    </div>
                )}
            </div>

            {/* Analysis Content (If Available) */}
            {!isError && result.recommendations && (
                <div className="space-y-6">
                    <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                        <h4 className="text-blue-800 font-black uppercase text-xs tracking-widest mb-3">Psychologist's Remarks</h4>
                        <p className="text-slate-700 font-medium italic leading-relaxed">"{result.recommendations}"</p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-[2rem] border border-green-100 bg-green-50/50">
                            <h4 className="text-green-700 font-black uppercase text-xs tracking-widest mb-4 flex items-center gap-2"><CheckCircle size={14}/> Strengths</h4>
                            <ul className="space-y-2">
                                {result.strengths?.map((s: string, i: number) => (
                                    <li key={i} className="text-xs font-bold text-slate-700 flex gap-2">• {s}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-6 rounded-[2rem] border border-red-100 bg-red-50/50">
                            <h4 className="text-red-700 font-black uppercase text-xs tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={14}/> Improvements</h4>
                            <ul className="space-y-2">
                                {result.weaknesses?.map((w: string, i: number) => (
                                    <li key={i} className="text-xs font-bold text-slate-700 flex gap-2">• {w}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* USER INPUTS (Raw Data) - Always Show */}
            <div className="border-t border-slate-100 pt-8 space-y-6">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Target size={20} className="text-slate-400"/> Your Dossier Inputs
                </h3>

                {/* PPDT / TAT Inputs */}
                {(testType.includes('PPDT') || testType.includes('TAT')) && (
                    <div className="space-y-6">
                        {/* Single PPDT Story */}
                        {result.story && (
                            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Written Story</span>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result.story}</p>
                            </div>
                        )}
                        {/* TAT Stories */}
                        {result.tatPairs && result.tatPairs.map((pair: any, i: number) => (
                            <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Story {pair.storyIndex}</span>
                                <div className="flex gap-4">
                                    {pair.userStoryImage && (
                                        <img src={`data:image/jpeg;base64,${pair.userStoryImage}`} className="w-24 h-24 object-cover rounded-xl border border-slate-100" />
                                    )}
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed flex-1">
                                        {pair.userStoryText || "Handwritten response uploaded."}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* WAT / SRT Inputs */}
                {(testType.includes('WAT') || testType.includes('SRT')) && (
                    <div className="grid grid-cols-1 gap-3">
                        {(result.watResponses || result.srtResponses)?.map((item: any, i: number) => (
                            <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex gap-4">
                                <span className="text-xs font-black text-slate-400 w-6">{(i+1).toString().padStart(2, '0')}</span>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-slate-900 mb-1">{item.word || item.situation}</p>
                                    <p className="text-xs text-blue-700 font-medium">{item.response || "No response"}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Interview Transcript */}
                {testType.includes('Interview') && result.transcript && (
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Transcript Log</span>
                        <div className="space-y-4 text-xs font-mono text-slate-700 max-h-60 overflow-y-auto custom-scrollbar">
                            {result.transcript.split('\n').map((line: string, i: number) => (
                                <p key={i} className={line.startsWith('IO:') ? 'text-red-600 font-bold' : 'text-blue-700'}>{line}</p>
                            ))}
                        </div>
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
};

export default ReportModal;
