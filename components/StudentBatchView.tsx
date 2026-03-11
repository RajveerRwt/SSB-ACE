
import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Calendar, FileText, CheckCircle, Clock, 
  ChevronRight, Search, UserPlus, MessageSquare, 
  Award, BarChart3, Settings, ExternalLink, Trash2,
  Video, BookOpen, ClipboardList, AlertCircle, Loader2,
  Lock, ShieldCheck, Zap, RefreshCw
} from 'lucide-react';
import { getStudentBatches, joinBatch, getBatchTests, getStudentSubmissions, submitBatchTest } from '../services/supabaseService';

interface StudentBatchViewProps {
  userId: string;
  onStartTest: (testType: string, config: any, batchTestId?: string) => void;
}

const StudentBatchView: React.FC<StudentBatchViewProps> = ({ userId, onStartTest }) => {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [batchTests, setBatchTests] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Join Batch State
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [batchCode, setBatchCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [studentBatches, studentSubmissions] = await Promise.all([
          getStudentBatches(userId),
          getStudentSubmissions(userId)
        ]);
        setBatches(studentBatches);
        setSubmissions(studentSubmissions);
      } catch (error) {
        console.error("Error fetching student batch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [studentBatches, studentSubmissions] = await Promise.all([
        getStudentBatches(userId),
        getStudentSubmissions(userId)
      ]);
      setBatches(studentBatches);
      setSubmissions(studentSubmissions);
      
      if (selectedBatch) {
        const updatedBatch = studentBatches.find(b => b.batches.id === selectedBatch.id);
        if (updatedBatch) {
          setSelectedBatch(updatedBatch.batches);
          const tests = await getBatchTests(updatedBatch.batches.id);
          setBatchTests(tests);
        }
      }
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleJoinBatch = async () => {
    if (!batchCode) return;
    setJoining(true);
    try {
      await joinBatch(userId, batchCode);
      const updatedBatches = await getStudentBatches(userId);
      setBatches(updatedBatches);
      setShowJoinModal(false);
      setBatchCode('');
    } catch (error: any) {
      alert(error.message || "Error joining batch");
    } finally {
      setJoining(false);
    }
  };

  const handleSelectBatch = async (batch: any) => {
    setSelectedBatch(batch);
    setLoading(true);
    try {
      const tests = await getBatchTests(batch.id);
      setBatchTests(tests);
    } catch (error) {
      console.error("Error loading batch tests:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSubmissionForTest = (testId: string) => {
    return submissions.find(s => s.batch_test_id === testId);
  };

  if (loading && batches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Syncing with HQ...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            <Users className="text-blue-600" size={32} /> My Batches
          </h2>
          <p className="text-slate-500 text-sm font-medium italic mt-1">Join your mentor's squad and attempt assigned assessments.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className={`p-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all ${refreshing ? 'animate-spin' : ''}`}
            title="Refresh Data"
          >
            <RefreshCw size={20} />
          </button>
          <button 
            onClick={() => setShowJoinModal(true)}
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
          >
            <Plus size={18} /> Join New Batch
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Sidebar: Batch List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Enrolled Batches</h3>
            <div className="space-y-3">
              {batches.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Users className="mx-auto text-slate-300 mb-3" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Batches Joined</p>
                </div>
              ) : (
                batches.map(b => (
                  <button 
                    key={b.id}
                    onClick={() => handleSelectBatch(b.batches)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center justify-between group ${selectedBatch?.id === b.batches.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-blue-200'}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <p className="text-xs font-black uppercase tracking-tight">{b.batches.name}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedBatch?.id === b.batches.id ? 'text-blue-100' : 'text-slate-400'}`}>
                          Mentor: {b.batches.mentors?.full_name || 'Officer'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {b.status === 'PENDING' && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-[8px] font-black uppercase tracking-widest rounded">Pending</span>
                        )}
                        {b.status === 'REJECTED' && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[8px] font-black uppercase tracking-widest rounded">Rejected</span>
                        )}
                        <ChevronRight size={16} className={selectedBatch?.id === b.batches.id ? 'text-white' : 'text-slate-300 group-hover:translate-x-1 transition-transform'} />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full -mr-16 -mt-16 blur-3xl opacity-20" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
              <ShieldCheck size={12} /> Mentor Guidance
            </h4>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              Batch tests are evaluated manually by your mentors. AI scores are not applicable here. Check your dashboard for remarks and scores.
            </p>
          </div>
        </div>

        {/* Main Panel */}
        <div className="lg:col-span-8 space-y-8">
          {selectedBatch ? (
            (() => {
              const membership = batches.find(b => b.batches.id === selectedBatch.id);
              if (membership?.status === 'PENDING') {
                return (
                  <div className="bg-white rounded-[2.5rem] p-12 border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mb-6">
                      <Clock size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Approval Pending</h3>
                    <p className="text-slate-400 text-sm font-medium italic max-w-xs">Your request to join <strong>{selectedBatch.name}</strong> is awaiting mentor approval. Please check back later.</p>
                  </div>
                );
              }
              if (membership?.status === 'REJECTED') {
                return (
                  <div className="bg-white rounded-[2.5rem] p-12 border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6">
                      <AlertCircle size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Request Rejected</h3>
                    <p className="text-slate-400 text-sm font-medium italic max-w-xs">Your request to join <strong>{selectedBatch.name}</strong> was not approved by the mentor.</p>
                  </div>
                );
              }
              return (
                <div className="animate-in slide-in-from-right-4 duration-500">
                  <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                          <Users size={24} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedBatch.name}</h3>
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Mentor: {selectedBatch.mentors?.full_name}</p>
                        </div>
                      </div>
                      
                      {selectedBatch.meeting_link && (
                        <a 
                          href={selectedBatch.meeting_link.startsWith('http') ? selectedBatch.meeting_link : `https://${selectedBatch.meeting_link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-6 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                        >
                          <Video size={16} /> Join Live Session
                        </a>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm font-medium italic">{selectedBatch.description}</p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-2 flex items-center gap-2">
                      <Calendar size={14} /> Assigned Assessments
                    </h3>
                    
                    <div className="grid gap-4">
                      {batchTests.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                          <ClipboardList className="mx-auto text-slate-300 mb-4" size={48} />
                          <p className="text-slate-500 font-medium italic">No tests assigned to this batch yet.</p>
                        </div>
                      ) : (
                        batchTests.map(t => {
                          const submission = getSubmissionForTest(t.id);
                          const isPast = t.deadline && new Date(t.deadline) < new Date();
                          const isUpcoming = new Date(t.scheduled_at) > new Date();

                          return (
                            <div key={t.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-blue-200 transition-all">
                              <div className="flex items-center gap-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${submission ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                                  {submission ? <CheckCircle size={24} /> : t.test_type.substring(0,2).toUpperCase()}
                                </div>
                                <div>
                                  <h4 className="font-black text-slate-900 uppercase tracking-tight">{t.test_type} Assessment</h4>
                                  <div className="flex items-center gap-4 mt-1">
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                      <Clock size={10} /> {new Date(t.scheduled_at).toLocaleString()}
                                    </p>
                                    {t.deadline && (
                                      <p className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 ${isPast ? 'text-red-500' : 'text-slate-400'}`}>
                                        <AlertCircle size={10} /> {isPast ? 'Deadline Passed' : `Deadline: ${new Date(t.deadline).toLocaleDateString()}`}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="w-full md:w-auto">
                                {submission ? (
                                  <div className="flex flex-col items-end gap-2">
                                    <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${submission.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                      {submission.status === 'reviewed' ? `Score: ${submission.score}/10` : 'Awaiting Review'}
                                    </div>
                                    {submission.mentor_remarks && (
                                      <div className="group relative">
                                        <button className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-1">
                                          <MessageSquare size={10} /> View Remarks
                                        </button>
                                        <div className="absolute bottom-full right-0 mb-2 w-64 p-4 bg-slate-900 text-white rounded-2xl text-[10px] font-medium leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-2xl border border-white/10">
                                          <p className="text-blue-400 font-black uppercase tracking-widest mb-2">Mentor Remarks</p>
                                          {submission.mentor_remarks}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => onStartTest(t.test_type, t.test_config, t.id)}
                                    disabled={isPast || isUpcoming}
                                    className={`w-full md:w-auto px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isUpcoming ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'}`}
                                  >
                                    {isUpcoming ? <><Lock size={14} /> Scheduled</> : <><Zap size={14} /> Attempt Now</>}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="bg-white rounded-[2.5rem] p-12 border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-3xl flex items-center justify-center mb-6">
                <Users size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Select a Squad</h3>
              <p className="text-slate-400 text-sm font-medium italic max-w-xs">Choose a batch from the sidebar to view your assigned tests and mentor feedback.</p>
            </div>
          )}
        </div>
      </div>

      {/* Join Batch Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <UserPlus size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Join a Batch</h3>
            <p className="text-slate-500 text-sm font-medium italic mb-8">Enter the unique 6-character code provided by your mentor.</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Batch Code</label>
                <input 
                  type="text" 
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value.toUpperCase())}
                  placeholder="E.G. X7Y2Z9"
                  maxLength={6}
                  className="w-full px-5 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-slate-900 text-2xl tracking-[0.5em] text-center"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleJoinBatch}
                  disabled={joining || batchCode.length < 6}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {joining ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Join Squad"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentBatchView;
