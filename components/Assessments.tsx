
import React, { useState, useEffect } from 'react';
import { getNewPendingAssessments, getNewCompletedAssessments, deleteNewPendingAssessment, updateNewCompletedAssessment } from '../services/supabaseService';
import { evaluatePerformance } from '../services/geminiService';
import { Clock, CheckCircle, RotateCcw, Loader2, ChevronRight, FileText, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import ReportModal from './ReportModal';

interface AssessmentsProps {
  userId: string;
  onRetry: (testType: string, originalData: any) => void;
}

const Assessments: React.FC<AssessmentsProps> = ({ userId, onRetry }) => {
  const [activeTab, setActiveTab] = useState<'completed' | 'pending' | 'retry'>('completed');
  const [pending, setPending] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [pendingData, completedData] = await Promise.all([
          getNewPendingAssessments(userId),
          getNewCompletedAssessments(userId)
        ]);
        setPending(pendingData || []);
        setCompleted(completedData || []);
      } catch (error) {
        console.error("Error fetching assessments:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId]);

  // Background Reprocessing Logic
  useEffect(() => {
    const reprocessAssessments = async () => {
      const processing = completed.filter(c => c.status === 'processing');
      if (processing.length === 0) return;

      for (const item of processing) {
        try {
          console.log(`Reprocessing assessment ${item.id} for ${item.test_type}...`);
          const newResult = await evaluatePerformance(item.test_type, item.result_data);
          
          if (newResult && !newResult._needs_reprocessing) {
            await updateNewCompletedAssessment(item.id, newResult.score || 0, newResult, newResult.feedback, 'completed');
            // Update local state to reflect completion
            setCompleted(prev => prev.map(c => 
              c.id === item.id 
                ? { ...c, status: 'completed', score: newResult.score, result_data: newResult, feedback: newResult.feedback } 
                : c
            ));
          }
        } catch (error) {
          console.error("Reprocessing failed for", item.id, error);
        }
      }
    };

    if (!loading && completed.length > 0) {
      reprocessAssessments();
    }
  }, [loading, completed]);

  const handleDeletePending = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this pending assessment?")) {
      await deleteNewPendingAssessment(id);
      setPending(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleViewReport = (item: any) => {
    setSelectedReport(item);
    setIsReportOpen(true);
  };

  const formatTestType = (type: string) => {
    if (!type) return 'Unknown Test';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  const renderCompleted = () => {
    const grouped = completed.reduce((acc: any, item: any) => {
      const type = item.test_type || 'Unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(item);
      return acc;
    }, {});

    return (
      <div className="space-y-8">
        {completed.length === 0 ? (
          <div className="text-center p-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <CheckCircle className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium italic">No completed assessments found.</p>
          </div>
        ) : (
          Object.keys(grouped).map(type => (
            <div key={type} className="space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2 px-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> {formatTestType(type)}
              </h3>
              <div className="grid gap-3">
                {grouped[type].map((item: any) => (
                  <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${item.status === 'processing' ? 'bg-blue-50 text-blue-600 animate-spin' : 'bg-slate-50 text-slate-400'}`}>
                        {item.status === 'processing' ? <RefreshCw size={16} /> : new Date(item.created_at).getDate()}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight">
                          {item.status === 'processing' ? 'Reprocessing Assessment...' : `Attempt on ${new Date(item.created_at).toLocaleDateString()}`}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                          {item.status === 'processing' 
                            ? 'AI is analyzing your data in the background' 
                            : `Score: ${item.score || 0} • ${new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                      </div>
                    </div>
                    {item.status === 'processing' ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        <Loader2 size={12} className="animate-spin" /> Processing
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleViewReport(item)}
                        className="px-4 py-2 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                      >
                        View Report
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderPending = () => {
    const grouped = pending.reduce((acc: any, item: any) => {
      const type = item.test_type || 'Unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(item);
      return acc;
    }, {});

    return (
      <div className="space-y-8">
        {pending.length === 0 ? (
          <div className="text-center p-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <Clock className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium italic">No pending assessments found.</p>
          </div>
        ) : (
          Object.keys(grouped).map(type => (
            <div key={type} className="space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2 px-2">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div> {formatTestType(type)}
              </h3>
              <div className="grid gap-3">
                {grouped[type].map((item: any) => (
                  <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center font-black text-xs">
                        <Clock size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Incomplete Session</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                          Started {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onRetry(item.test_type, item.original_data)}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                      >
                        Resume
                      </button>
                      <button 
                        onClick={() => handleDeletePending(item.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderRetry = () => (
    <div className="space-y-4">
      {completed.length === 0 ? (
        <div className="text-center p-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <RotateCcw className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500 font-medium italic">No assessments available for retry.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {/* Group by test type for "test-wise" display */}
          {Array.from(new Set(completed.map(c => c.test_type))).filter(Boolean).map(type => {
            const lastAttempt = completed.find(c => c.test_type === type);
            if (!lastAttempt) return null;
            return (
              <div key={type} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black">
                    {String(type).substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tight">{formatTestType(type)}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Last Attempt: {lastAttempt.created_at ? new Date(lastAttempt.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => onRetry(type, lastAttempt.result_data?._original_data)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  <RotateCcw size={14} /> Re-Attempt Test
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            <FileText className="text-blue-600" size={32} /> Assessment Center
          </h2>
          <p className="text-slate-500 text-sm font-medium italic mt-1">Manage your previous attempts and pending evaluations.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0">
          <button 
            onClick={() => setActiveTab('completed')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'completed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <CheckCircle size={14} /> Completed
          </button>
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Clock size={14} /> Pending
          </button>
          <button 
            onClick={() => setActiveTab('retry')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'retry' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Records...</p>
        </div>
      ) : (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'completed' && renderCompleted()}
          {activeTab === 'pending' && renderPending()}
          {activeTab === 'retry' && renderRetry()}
        </div>
      )}

      {selectedReport && (
        <ReportModal 
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          data={selectedReport}
          testType={selectedReport.test_type}
        />
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-start gap-4">
        <AlertCircle className="text-blue-600 shrink-0 mt-1" size={20} />
        <div>
          <h4 className="text-xs font-black uppercase text-blue-900 tracking-widest mb-1">Independent Records</h4>
          <p className="text-xs text-blue-700 font-medium leading-relaxed">
            These records are stored in dedicated assessment tables and do not affect your main Mission Log or Test History. Retrying a test will create a new entry in the pending section until completed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Assessments;
