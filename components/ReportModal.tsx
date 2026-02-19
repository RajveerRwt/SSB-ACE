import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle, AlertTriangle, Activity, Brain, Target, Mic, Download, Loader2, RefreshCw, Printer, ThumbsUp, ThumbsDown, MinusCircle } from 'lucide-react';
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

  useEffect(() => {
      setLocalData(data);
  }, [data]);

  if (!isOpen || !localData) return null;

  const result = localData.result_data || localData; 
  const isError = result.score === 0 && (result.verdict === "Technical Failure" || result.error);

  const attemptRetry = async () => {
      if (isRetrying) return;
      setIsRetrying(true);
      try {
          // Re-evaluate using saved raw inputs preserved in result_data
          const newResult = await evaluatePerformance(testType, result);
          
          if (newResult && newResult.score > 0) {
              // Merge inputs back to preserve them
              const merged = { ...result, ...newResult, error: false };
              
              // Update DB
              if (localData.id) {
                  await updateTestAttempt(localData.id, merged);
              }
              
              // Update View
              setLocalData({ ...localData, result_data: merged, score: merged.score });
          }
      } catch (e) {
          console.log("Retry failed, still pending");
      } finally {
          setIsRetrying(false);
      }
  };

  const handleDownload = () => {
    window.print();
  };

  // Helper to determine status for unattempted items
  const isUnattempted = (response: string) => !response || response.trim() === "";

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300 print:bg-white print:p-0 print:static">
      
      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #report-content, #report-content * {
              visibility: visible;
            }
            #report-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20px;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border: none !important;
              overflow: visible !important;
            }
            /* Hide Buttons in Print */
            .no-print {
              display: none !important;
            }
            /* Adjust Colors for Print */
            .bg-slate-900 { background-color: #f1f5f9 !important; color: black !important; border: 1px solid #ddd; }
            .text-white { color: black !important; }
            .bg-blue-50, .bg-green-50, .bg-red-50, .bg-yellow-50 { background-color: white !important; border: 1px solid #ccc; }
          }
        `}
      </style>

      <div id="report-content" className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:rounded-none print:shadow-none print:h-auto">
        
        {/* Header */}
        <div className={`p-6 md:p-8 flex justify-between items-center shrink-0 ${isError ? 'bg-red-50' : 'bg-slate-50'} print:bg-white print:border-b`}>
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isError ? 'bg-red-100 text-red-600' : 'bg-white text-blue-600'} print:border`}>
                 <FileText size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Mission Report</h3>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{testType} • {new Date(localData.created_at || Date.now()).toLocaleDateString()}</p>
              </div>
           </div>
           <div className="flex gap-2 no-print">
             <button 
                onClick={handleDownload}
                className="p-2 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-full transition-colors border border-slate-200"
                title="Download PDF"
             >
                <Download size={20} />
             </button>
             <button onClick={onClose} className="p-2 bg-white hover:bg-slate-200 rounded-full transition-colors text-slate-500 border border-slate-200">
                <X size={20} />
             </button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar space-y-8 print:overflow-visible print:h-auto">
            
            {/* Verdict Banner */}
            <div className={`p-6 rounded-[2rem] border-2 ${isError ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-900 text-white border-slate-800'} flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden print:border-slate-300 print:bg-white`}>
                {isError && isRetrying && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 no-print">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                    </div>
                )}
                
                <div className="space-y-2 text-center md:text-left relative z-0">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isError ? 'bg-red-200 text-red-800' : 'bg-yellow-400 text-black'} print:border print:bg-white`}>
                        {isError ? 'Pending Analysis' : 'Assessment Status'}
                    </span>
                    <h2 className={`text-3xl md:text-4xl font-black uppercase tracking-tighter ${isError ? 'text-slate-900' : 'text-white'} print:text-black`}>
                        {isError ? 'In Queue' : `Score: ${result.score}/10`}
                    </h2>
                    <p className={`text-sm font-medium ${isError ? 'text-slate-600' : 'text-slate-400'} print:text-slate-600`}>
                        {isError ? "Assessment halted due to high server traffic. Click retry to analyze saved data." : (result.verdict || "Assessment Complete")}
                    </p>
                </div>
                {!isError && (
                    <div className="flex gap-4">
                       <div className="text-center">
                          <Activity size={24} className="mx-auto mb-1 text-green-400 print:text-black" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Performance</span>
                       </div>
                    </div>
                )}
                {isError && !isRetrying && (
                    <button 
                        onClick={attemptRetry}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 z-10 no-print shadow-lg"
                    >
                        <RefreshCw size={14} /> Retry Analysis
                    </button>
                )}
            </div>

            {/* Analysis Content (If Available) */}
            {!isError && result.recommendations && (
                <div className="space-y-6">
                    <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 print:border-slate-300">
                        <h4 className="text-blue-800 font-black uppercase text-xs tracking-widest mb-3 print:text-black">Psychologist's Remarks</h4>
                        <p className="text-slate-700 font-medium italic leading-relaxed">"{result.recommendations}"</p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6 print:block print:space-y-4">
                        <div className="p-6 rounded-[2rem] border border-green-100 bg-green-50/50 print:border-slate-300">
                            <h4 className="text-green-700 font-black uppercase text-xs tracking-widest mb-4 flex items-center gap-2 print:text-black"><CheckCircle size={14}/> Strengths</h4>
                            <ul className="space-y-2">
                                {result.strengths?.map((s: string, i: number) => (
                                    <li key={i} className="text-xs font-bold text-slate-700 flex gap-2">• {s}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-6 rounded-[2rem] border border-red-100 bg-red-50/50 print:border-slate-300">
                            <h4 className="text-red-700 font-black uppercase text-xs tracking-widest mb-4 flex items-center gap-2 print:text-black"><AlertTriangle size={14}/> Improvements</h4>
                            <ul className="space-y-2">
                                {result.weaknesses?.map((w: string, i: number) => (
                                    <li key={i} className="text-xs font-bold text-slate-700 flex gap-2">• {w}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* WAT / SRT Detailed Log with Unattempted Handling */}
            {((testType.includes('WAT') || testType.includes('SRT')) && result.detailedAnalysis) ? (
                <div className="border-t border-slate-100 pt-8 space-y-6 print:break-before-auto">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Target size={20} className="text-slate-400"/> Detailed Assessment Log
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        {(result.watResponses || result.srtResponses)?.map((item: any, i: number) => {
                            const itemId = i + 1;
                            // Match Analysis
                            const analysis = result.detailedAnalysis?.find((a: any) => 
                                a.id === itemId || 
                                (a.word === item.word) || 
                                (a.situation === item.situation)
                            );
                            
                            const unattempted = isUnattempted(item.response);

                            return (
                                <div key={i} className={`p-6 rounded-3xl border transition-all flex flex-col md:flex-row gap-6 mb-4 print:break-inside-avoid ${unattempted ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="md:w-1/4 shrink-0 flex items-center gap-4">
                                        <span className="text-2xl font-black text-slate-300">{(i + 1).toString().padStart(2, '0')}</span>
                                        <p className="text-sm md:text-lg font-black text-slate-900 uppercase tracking-wide leading-tight">{item.word || item.situation}</p>
                                    </div>
                                    <div className="md:w-3/4 grid md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Your Response</span>
                                                {unattempted ? (
                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-red-500">Missed</span>
                                                ) : (
                                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${
                                                        analysis?.assessment?.toLowerCase().includes('positive') ? 'text-green-600' : 'text-blue-600'
                                                    }`}>{analysis?.assessment || "Pending"}</span>
                                                )}
                                            </div>
                                            <p className={`p-3 rounded-xl text-sm font-medium ${unattempted ? 'bg-white text-red-400 border border-red-100 italic' : 'bg-white border border-slate-200 text-slate-700'}`}>
                                                {unattempted ? "Not Attempted" : (item.response)}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest">Ideal Response</span>
                                            <p className="p-3 bg-green-50 border border-green-100 rounded-xl text-sm font-medium text-slate-700">
                                                {analysis?.idealResponse || "See general recommendations for improvement."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* Standard Inputs for other tests (PPDT, Interview, etc) or Fallback if no detailed analysis */
                <div className="border-t border-slate-100 pt-8 space-y-6 print:break-before-auto">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Target size={20} className="text-slate-400"/> Your Dossier Inputs
                    </h3>

                    {/* PPDT / TAT Inputs */}
                    {(testType.includes('PPDT') || testType.includes('TAT')) && (
                        <div className="space-y-6">
                            {/* Single PPDT Story */}
                            {result.story && (
                                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm print:border-slate-300">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Written Story</span>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result.story}</p>
                                </div>
                            )}
                            {/* TAT Stories */}
                            {result.tatPairs && result.tatPairs.map((pair: any, i: number) => (
                                <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm print:border-slate-300 print:break-inside-avoid">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Story {pair.storyIndex}</span>
                                    <div className="flex gap-4">
                                        {pair.userStoryImage && (
                                            <img src={`data:image/jpeg;base64,${pair.userStoryImage}`} className="w-24 h-24 object-cover rounded-xl border border-slate-100 print:w-20 print:h-20" />
                                        )}
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed flex-1">
                                            {pair.userStoryText || "Handwritten response uploaded."}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Fallback View for WAT/SRT if detailedAnalysis is missing (e.g. pending/older records) */}
                    {(testType.includes('WAT') || testType.includes('SRT')) && !result.detailedAnalysis && (
                        <div className="grid grid-cols-1 gap-3">
                            {(result.watResponses || result.srtResponses)?.map((item: any, i: number) => (
                                <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex gap-4 print:border-slate-300 print:break-inside-avoid">
                                    <span className="text-xs font-black text-slate-400 w-6">{(i+1).toString().padStart(2, '0')}</span>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-slate-900 mb-1">{item.word || item.situation}</p>
                                        <p className="text-xs text-blue-700 font-medium print:text-black">{item.response || "No response"}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Interview Transcript */}
                    {testType.includes('Interview') && result.transcript && (
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 print:border-slate-300">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Transcript Log</span>
                            <div className="space-y-4 text-xs font-mono text-slate-700 max-h-60 overflow-y-auto custom-scrollbar print:max-h-none">
                                {result.transcript.split('\n').map((line: string, i: number) => (
                                    <p key={i} className={line.startsWith('IO:') ? 'text-red-600 font-bold print:text-black' : 'text-blue-700 print:text-black'}>{line}</p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default ReportModal;
