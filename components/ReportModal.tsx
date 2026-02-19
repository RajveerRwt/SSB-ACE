import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle, AlertTriangle, Activity, Brain, Target, Mic, Download, Loader2, RefreshCw, Star, Eye, Volume2, BookOpen, ScanEye, BrainCircuit, ShieldCheck, HelpCircle, ChevronDown, ChevronUp, Image as ImageIcon, Info } from 'lucide-react';
import { evaluatePerformance } from '../services/geminiService';
import { updateAssessmentReport } from '../services/supabaseService';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any; // Now expects data from 'assessment_reports' table
  testType: string;
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, data, testType }) => {
  const [localData, setLocalData] = useState(data);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showScoreHelp, setShowScoreHelp] = useState(false);

  useEffect(() => {
      setLocalData(data);
  }, [data]);

  if (!isOpen || !localData) return null;

  const results = localData.report_data || {};
  const inputs = localData.input_data || {};
  const isPending = localData.status === 'PENDING';
  
  // Stimulus extraction - Handle multiple formats
  const stimulusImage = inputs.stimulusImage || results.stimulusImage;
  const stimulusUrl = inputs.currentImageUrl || inputs.stimulusUrl;

  const attemptRetry = async () => {
      if (isRetrying) return;
      setIsRetrying(true);
      try {
          // Re-evaluate using saved raw inputs from the dedicated table
          const newResult = await evaluatePerformance(testType, inputs);
          
          if (newResult && newResult.score > 0) {
              // Update dedicated DB table
              await updateAssessmentReport(localData.id, newResult);
              
              // Update View
              setLocalData({ 
                  ...localData, 
                  status: 'COMPLETED', 
                  report_data: newResult, 
                  score: newResult.score 
              });
          }
      } catch (e) {
          console.error("Retry failed:", e);
      } finally {
          setIsRetrying(false);
      }
  };

  const handleDownload = () => {
    window.print();
  };

  const getScoreColor = (score: number) => {
      if (score >= 8) return 'text-green-600';
      if (score >= 6) return 'text-blue-600';
      if (score >= 4) return 'text-yellow-600';
      return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 print:bg-white print:p-0 print:static">
      
      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #report-content, #report-content * { visibility: visible; }
            #report-content {
              position: absolute; left: 0; top: 0; width: 100%;
              padding: 20px; background: white !important; color: black !important;
              box-shadow: none !important; border: none !important; overflow: visible !important;
            }
            .no-print { display: none !important; }
            .bg-slate-900, .bg-slate-950 { background-color: #1e293b !important; color: white !important; -webkit-print-color-adjust: exact; }
            .text-yellow-400 { color: #facc15 !important; }
            .bg-blue-50, .bg-green-50, .bg-red-50, .bg-yellow-50 { background-color: white !important; border: 1px solid #ccc; }
          }
        `}
      </style>

      <div id="report-content" className="bg-slate-50 w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20 print:max-h-none print:rounded-none">
        
        {/* TOP ACTION BAR */}
        <div className="bg-white px-8 py-4 flex justify-between items-center border-b border-slate-200 shrink-0 no-print">
            <div className="flex items-center gap-3">
                <ShieldCheck className="text-blue-600" size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authentic Board Assessment Log</span>
            </div>
            <div className="flex gap-2">
                <button onClick={handleDownload} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title="Print/Download Report">
                    <Download size={20} />
                </button>
                <button onClick={onClose} className="p-2.5 hover:bg-red-50 hover:text-red-500 rounded-full text-slate-500 transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar space-y-8 print:p-0">
            
            {/* HERO VERDICT BANNER */}
            <div className="bg-slate-950 p-8 md:p-16 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
                  <div className="text-center md:text-left space-y-6 flex-1">
                     <span className="bg-yellow-400 text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-lg">Final Board Verdict</span>
                     <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
                        {testType} <br/><span className="text-yellow-400">Report</span>
                     </h2>
                     <p className="text-slate-400 font-medium max-w-lg leading-relaxed text-sm md:text-lg italic opacity-80">
                        "{results.recommendations || (isPending ? "Analysis paused due to server congestion. All inputs safely archived." : "Assessment Summary Loading...")}"
                     </p>
                  </div>
                  
                  <div className="flex flex-col items-center bg-white/5 p-8 md:p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-3xl shadow-2xl relative">
                     {isPending && isRetrying && (
                         <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-[3.5rem] z-20 flex items-center justify-center">
                             <Loader2 className="animate-spin text-yellow-400" size={40} />
                         </div>
                     )}
                     
                     <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">Board Score</span>
                     <div className={`text-7xl md:text-9xl font-black ${isPending ? 'text-slate-700' : 'text-yellow-400'}`}>
                        {isPending ? '?' : (results.score || 0)}
                     </div>
                     
                     {isPending ? (
                         <button 
                            onClick={attemptRetry}
                            disabled={isRetrying}
                            className="mt-6 flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all no-print shadow-xl"
                         >
                            <RefreshCw size={14} className={isRetrying ? 'animate-spin' : ''} /> Retry Analysis
                         </button>
                     ) : (
                         <button 
                            onClick={() => setShowScoreHelp(!showScoreHelp)}
                            className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors no-print"
                         >
                            <HelpCircle size={14} /> View Scaling {showScoreHelp ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                         </button>
                     )}
                  </div>
               </div>
            </div>

            {!isPending && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
                    
                    {/* SCORE SCALING GUIDE */}
                    {showScoreHelp && (
                        <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
                           {[
                               { range: '9.0 - 10', label: 'Outstanding', color: 'border-green-500', text: 'Exceptional OLQ demonstration.' },
                               { range: '7.0 - 8.9', label: 'High Potential', color: 'border-blue-500', text: 'Good consistency and thought.' },
                               { range: '5.0 - 6.9', label: 'Borderline', color: 'border-yellow-500', text: 'Needs polish in planning.' },
                               { range: '0.0 - 4.9', label: 'Below Avg', color: 'border-red-500', text: 'Requires more practice.' }
                           ].map((item, i) => (
                               <div key={i} className={`bg-white p-4 rounded-2xl border-l-4 ${item.color} shadow-sm`}>
                                   <span className="block text-lg font-black text-slate-900">{item.range}</span>
                                   <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{item.label}</span>
                                   <p className="text-[10px] text-slate-500 mt-1">{item.text}</p>
                               </div>
                           ))}
                        </div>
                    )}

                    {/* DUAL VIEW: STIMULUS & INPUT */}
                    {(testType.includes('PPDT') || testType.includes('TAT')) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Target size={14} /> Test Stimulus
                                </h4>
                                <div className="bg-white p-4 rounded-[2.5rem] border border-slate-200 shadow-xl aspect-video overflow-hidden flex items-center justify-center">
                                    {(stimulusImage || stimulusUrl) ? (
                                        <img 
                                            src={stimulusImage ? `data:image/jpeg;base64,${stimulusImage}` : stimulusUrl} 
                                            className="max-h-full max-w-full object-contain grayscale contrast-[1.2]" 
                                            alt="Stimulus"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 text-slate-300">
                                            <ImageIcon size={48} />
                                            <span className="text-[10px] font-black uppercase">Stimulus Not Available</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Eye size={14} /> Your Perception
                                </h4>
                                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl h-full flex flex-col">
                                    <p className="text-slate-700 font-medium italic leading-relaxed whitespace-pre-wrap text-sm md:text-base flex-1">
                                        "{inputs.story || inputs.tatPairs?.[0]?.userStoryText || "No written input found in record."}"
                                    </p>
                                    {inputs.uploadedStoryImage && (
                                        <div className="mt-6 pt-6 border-t border-slate-100">
                                            <span className="text-[9px] font-black uppercase text-blue-600 block mb-3 tracking-widest">Handwritten Record</span>
                                            <img src={`data:image/jpeg;base64,${inputs.uploadedStoryImage}`} className="w-24 h-32 object-cover rounded-xl border" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ASSESSMENT MATRIX */}
                    {results.scoreDetails && (
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                                <Activity size={24} className="text-blue-600" /> Professional Assessment Matrix
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { label: 'Perception', score: results.scoreDetails.perception, total: 3, icon: Eye, color: 'blue', desc: 'Accuracy & Depth' },
                                    { label: 'Content', score: results.scoreDetails.content, total: 5, icon: BookOpen, color: 'purple', desc: 'Action & OLQs' },
                                    { label: 'Expression', score: results.scoreDetails.expression, total: 2, icon: Volume2, color: 'green', desc: 'Fluency & Clarity' }
                                ].map((item, i) => (
                                    <div key={i} className={`bg-${item.color}-50 p-6 rounded-3xl border border-${item.color}-100 flex flex-col h-full`}>
                                        <div className="flex justify-between items-start mb-6">
                                            <span className={`text-[10px] font-black uppercase tracking-widest text-${item.color}-600`}>{item.label}</span>
                                            <item.icon size={20} className={`text-${item.color}-500`} />
                                        </div>
                                        <div className="flex items-end gap-2 mt-auto">
                                            <span className="text-5xl font-black text-slate-900">{item.score || 0}</span>
                                            <span className="text-sm font-bold text-slate-400 mb-2">/ {item.total}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* OLQ DOSSIER */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 border-l-[12px] border-l-green-500">
                            <h4 className="font-black text-green-700 uppercase tracking-widest mb-8 flex items-center gap-4 text-sm">
                                <ShieldCheck size={20}/> Demonstrated OLQs
                            </h4>
                            <ul className="space-y-4">
                                {results.strengths?.map((s: string, i: number) => (
                                    <li key={i} className="text-sm font-bold text-slate-700 flex gap-4">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"/> 
                                        <span>{s}</span>
                                    </li>
                                ))}
                                {(!results.strengths || results.strengths.length === 0) && (
                                    <p className="text-xs text-slate-400 italic">No specific strengths highlighted.</p>
                                )}
                            </ul>
                        </div>
                        
                        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 border-l-[12px] border-l-red-500">
                            <h4 className="font-black text-red-700 uppercase tracking-widest mb-8 flex items-center gap-4 text-sm">
                                <AlertTriangle size={20}/> Areas for Growth
                            </h4>
                            <ul className="space-y-4">
                                {results.weaknesses?.map((w: string, i: number) => (
                                    <li key={i} className="text-sm font-bold text-slate-700 flex gap-4">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"/> 
                                        <span>{w}</span>
                                    </li>
                                ))}
                                {(!results.weaknesses || results.weaknesses.length === 0) && (
                                    <p className="text-xs text-slate-400 italic">No critical gaps identified.</p>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* RECOMMENDED IDEAL PLOT (For PPDT/TAT) */}
                    {results.idealStory && (
                        <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                             <Star className="absolute -top-10 -right-10 text-yellow-400/10 w-48 h-48 rotate-12" />
                             <h4 className="text-yellow-400 font-black uppercase text-xs tracking-widest mb-6 flex items-center gap-3">
                                <Star size={16} fill="currentColor" /> Recommended Solution Model
                             </h4>
                             <p className="text-slate-300 font-medium italic leading-relaxed text-sm md:text-base border-l-2 border-slate-700 pl-6">
                                "{results.idealStory}"
                             </p>
                        </div>
                    )}
                </div>
            )}
            
            {/* PENDING VIEW */}
            {isPending && !isRetrying && (
                <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in">
                    <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center shadow-inner">
                        <AlertTriangle size={48} />
                    </div>
                    <div className="text-center space-y-4 max-w-md">
                        <h3 className="text-2xl font-black text-slate-900 uppercase">Analysis Halted</h3>
                        <p className="text-slate-600 font-medium leading-relaxed">
                            This report is in the "PENDING" state. This happens when the AI is overloaded during your test.
                        </p>
                        <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 text-left">
                            <p className="text-xs font-bold text-yellow-800 leading-relaxed">
                                <Info size={14} className="inline mr-2" />
                                Your raw data (stories/images) is <b>safely archived</b>. 
                                Click the "Retry Analysis" button in the verdict box to generate your report now.
                            </p>
                        </div>
                    </div>
                </div>
            )}

        </div>
        
        {/* FOOTER INFO */}
        <div className="bg-white p-6 border-t border-slate-200 text-center shrink-0">
            <p className="text-[9px] font-black uppercase text-slate-300 tracking-[0.5em]">
                Secure Digital Dossier • {new Date(localData.created_at).toLocaleString()}
            </p>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;