
import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Calendar, FileText, CheckCircle, Clock, 
  ChevronRight, Search, UserPlus, MessageSquare, 
  Award, BarChart3, Settings, ExternalLink, Trash2,
  Video, BookOpen, ClipboardList, AlertCircle, Loader2
} from 'lucide-react';
import AdminPanel from './AdminPanel';
import { 
  getMentorProfile, getMentorBatches, createBatch, 
  getBatchMembers, getBatchTests, scheduleBatchTest,
  getBatchSubmissions, reviewBatchSubmission,
  getOIRSets, getGPEScenarios, getPPDTScenarios, getTATScenarios,
  uploadCustomScenario
} from '../services/supabaseService';

interface MentorDashboardProps {
  userId: string;
  userEmail: string;
  userName: string;
}

const MentorDashboard: React.FC<MentorDashboardProps> = ({ userId, userEmail, userName }) => {
  const [mentor, setMentor] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [batchMembers, setBatchMembers] = useState<any[]>([]);
  const [batchTests, setBatchTests] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'batches' | 'submissions' | 'library'>('overview');
  
  // Form States
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDesc, setNewBatchDesc] = useState('');
  
  const [showScheduleTest, setShowScheduleTest] = useState(false);
  const [testType, setTestType] = useState('PPDT');
  const [scheduledAt, setScheduledAt] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedSetId, setSelectedSetId] = useState('');
  const [customFile, setCustomFile] = useState<File | null>(null);
  
  const [isLiveTest, setIsLiveTest] = useState(false);

  // Review States
  const [reviewScore, setReviewScore] = useState(5);
  const [reviewRemarks, setReviewRemarks] = useState('');

  // Library Data
  const [oirSets, setOirSets] = useState<any[]>([]);
  const [gpeScenarios, setGpeScenarios] = useState<any[]>([]);
  const [ppdtScenarios, setPpdtScenarios] = useState<any[]>([]);
  const [tatScenarios, setTatScenarios] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const profile = await getMentorProfile(userId);
        setMentor(profile);
        
        if (profile?.status === 'APPROVED') {
          const mentorBatches = await getMentorBatches(userId);
          setBatches(mentorBatches);
          
          // Load Library
          const [oir, gpe, ppdt, tat] = await Promise.all([
            getOIRSets(),
            getGPEScenarios(),
            getPPDTScenarios(),
            getTATScenarios()
          ]);
          setOirSets(oir);
          setGpeScenarios(gpe);
          setPpdtScenarios(ppdt);
          setTatScenarios(tat);
        }
      } catch (error) {
        console.error("Error initializing mentor dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [userId]);

  const handleCreateBatch = async () => {
    if (!newBatchName) return;
    try {
      const newBatch = await createBatch(userId, newBatchName, newBatchDesc);
      setBatches([newBatch, ...batches]);
      setShowCreateBatch(false);
      setNewBatchName('');
      setNewBatchDesc('');
    } catch (error: any) {
      console.error("Batch creation error:", error);
      alert("Error creating batch: " + (error.message || JSON.stringify(error)));
    }
  };

  const handleSelectBatch = async (batch: any) => {
    setSelectedBatch(batch);
    setLoading(true);
    try {
      const [members, tests] = await Promise.all([
        getBatchMembers(batch.id),
        getBatchTests(batch.id)
      ]);
      setBatchMembers(members);
      setBatchTests(tests);
    } catch (error) {
      console.error("Error loading batch details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleTest = async () => {
    if (!selectedBatch || !testType || !scheduledAt) return;
    try {
      let config: any = { setId: selectedSetId };
      
      if (customFile) {
        const url = await uploadCustomScenario(customFile);
        config.customImages = [url];
      }

      const newTest = await scheduleBatchTest(selectedBatch.id, testType, config, scheduledAt, deadline);
      setBatchTests([...batchTests, newTest]);
      setShowScheduleTest(false);
      setCustomFile(null);
    } catch (error: any) {
      console.error("Error scheduling test:", error);
      alert("Error scheduling test: " + (error.message || JSON.stringify(error)));
    }
  };

  const handleViewSubmissions = async (testId: string) => {
    setLoading(true);
    try {
      const subs = await getBatchSubmissions(testId);
      setSubmissions(subs);
      setActiveTab('submissions');
    } catch (error) {
      console.error("Error loading submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmission = async () => {
    if (!selectedSubmission) return;
    try {
      await reviewBatchSubmission(selectedSubmission.id, reviewScore, reviewRemarks);
      setSubmissions(submissions.map(s => 
        s.id === selectedSubmission.id 
          ? { ...s, score: reviewScore, mentor_remarks: reviewRemarks, status: 'reviewed' } 
          : s
      ));
      setSelectedSubmission(null);
      setReviewRemarks('');
    } catch (error) {
      alert("Error submitting review");
    }
  };

  if (loading && !mentor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Initializing Command Center...</p>
      </div>
    );
  }

  if (!mentor || mentor.status !== 'APPROVED') {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] p-12 border border-slate-100 shadow-xl text-center">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <Award size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Mentor Access Required</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          You need to be an approved mentor to access this dashboard. If you have already applied, please wait for admin approval.
        </p>
        <button className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all">
          Contact Support
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[2.5rem] text-white">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
            <Users size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">Mentor Command Center</h2>
            <p className="text-blue-300 text-xs font-bold uppercase tracking-widest opacity-80">Welcome back, {mentor.full_name}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('batches')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'batches' ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            Batches
          </button>
          <button 
            onClick={() => setActiveTab('library')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'library' ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            Library
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'library' ? (
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
          <AdminPanel isMentorMode={true} />
        </div>
      ) : (
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Sidebar: Batch List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Active Batches</h3>
              <button 
                onClick={() => setShowCreateBatch(true)}
                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {batches.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">No batches created yet.</div>
              ) : (
                batches.map(b => (
                  <button 
                    key={b.id}
                    onClick={() => handleSelectBatch(b)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${selectedBatch?.id === b.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-blue-200'}`}
                  >
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight">{b.name}</p>
                      <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedBatch?.id === b.id ? 'text-blue-100' : 'text-slate-400'}`}>
                        Code: {b.batch_code}
                      </p>
                    </div>
                    <ChevronRight size={16} className={selectedBatch?.id === b.id ? 'text-white' : 'text-slate-300 group-hover:translate-x-1 transition-transform'} />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-6">Performance Metrics</h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-2xl font-black">{batches.length}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Total Batches</p>
              </div>
              <div>
                <p className="text-2xl font-black">{submissions.filter(s => s.status === 'submitted').length}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Pending Reviews</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Panel */}
        <div className="lg:col-span-8 space-y-8">
          {selectedBatch ? (
            <div className="animate-in slide-in-from-right-4 duration-500">
              {/* Batch Detail Header */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-full">Active Batch</span>
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedBatch.name}</h3>
                    </div>
                    <p className="text-slate-500 text-sm font-medium italic">{selectedBatch.description || 'No description provided.'}</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowScheduleTest(true)}
                      className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                      <Calendar size={14} /> Schedule Test
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-50">
                  <div>
                    <p className="text-lg font-black text-slate-900">{batchMembers.length}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Students Joined</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900">{batchTests.length}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Tests Assigned</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900">{selectedBatch.batch_code}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Join Code</p>
                  </div>
                </div>
              </div>

              {/* Tabs for Batch View */}
              <div className="space-y-6">
                <div className="flex items-center gap-8 border-b border-slate-100 px-4">
                  <button className="pb-4 text-xs font-black uppercase tracking-widest text-blue-600 border-b-2 border-blue-600">Scheduled Tests</button>
                  <button className="pb-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Student List</button>
                </div>

                <div className="grid gap-4">
                  {batchTests.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                      <ClipboardList className="mx-auto text-slate-300 mb-4" size={48} />
                      <p className="text-slate-500 font-medium italic">No tests scheduled for this batch yet.</p>
                      <button 
                        onClick={() => setShowScheduleTest(true)}
                        className="mt-4 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                      >
                        Schedule First Test
                      </button>
                    </div>
                  ) : (
                    batchTests.map(t => (
                      <div key={t.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center font-black">
                            {t.test_type.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 uppercase tracking-tight">{t.test_type} Assessment</h4>
                            <div className="flex items-center gap-4 mt-1">
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                <Clock size={10} /> {new Date(t.scheduled_at).toLocaleString()}
                              </p>
                              {t.deadline && (
                                <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                  <AlertCircle size={10} /> Deadline: {new Date(t.deadline).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 w-full md:w-auto">
                          <button 
                            onClick={() => handleViewSubmissions(t.id)}
                            className="flex-1 md:flex-none px-6 py-3 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                          >
                            <FileText size={14} /> Submissions
                          </button>
                          <button className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] p-12 border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-3xl flex items-center justify-center mb-6">
                <Users size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Select a Batch</h3>
              <p className="text-slate-400 text-sm font-medium italic max-w-xs">Choose a batch from the sidebar to manage students, schedule tests, and review performance.</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Modals */}
      {showCreateBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-6">Create New Batch</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Batch Name</label>
                <input 
                  type="text" 
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g., Alpha Squad 2024"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Description (Optional)</label>
                <textarea 
                  value={newBatchDesc}
                  onChange={(e) => setNewBatchDesc(e.target.value)}
                  placeholder="What is this batch for?"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800 h-24 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowCreateBatch(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateBatch}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  Create Batch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScheduleTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-6">Schedule Assessment</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Test Type</label>
                  <select 
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800"
                  >
                    <option value="PPDT">PPDT</option>
                    <option value="TAT">TAT</option>
                    <option value="WAT">WAT</option>
                    <option value="SRT">SRT</option>
                    <option value="OIR">OIR</option>
                    <option value="GPE">GPE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Select Set (Optional)</label>
                  <select 
                    value={selectedSetId}
                    onChange={(e) => setSelectedSetId(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800"
                  >
                    <option value="">Random Set</option>
                    {testType === 'OIR' && oirSets.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    {testType === 'GPE' && gpeScenarios.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    {testType === 'PPDT' && ppdtScenarios.map(s => <option key={s.id} value={s.id}>{s.description.substring(0, 20)}...</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Upload Custom Set (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setCustomFile(e.target.files?.[0] || null)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-[10px] text-slate-400 mt-2 italic">Upload an image for custom PPDT/TAT scenarios. This will override the selected set.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Scheduled At</label>
                  <input 
                    type="datetime-local" 
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    disabled={isLiveTest}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Deadline (Optional)</label>
                  <input 
                    type="date" 
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <input 
                  type="checkbox" 
                  id="liveTest"
                  checked={isLiveTest}
                  onChange={(e) => {
                    setIsLiveTest(e.target.checked);
                    if (e.target.checked) {
                      const now = new Date();
                      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                      setScheduledAt(now.toISOString().slice(0, 16));
                    }
                  }}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="liveTest" className="text-sm font-bold text-blue-900 cursor-pointer">
                  Start Live Test Now
                  <span className="block text-[10px] font-medium text-blue-600 uppercase tracking-widest mt-0.5">Students can join immediately</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowScheduleTest(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleScheduleTest}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  Schedule Test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submission Review Modal */}
      {activeTab === 'submissions' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Student Submissions</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Review and provide feedback</p>
              </div>
              <button 
                onClick={() => setActiveTab('overview')}
                className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
              >
                <ChevronRight className="rotate-180" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid gap-6">
                {submissions.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 italic">No submissions yet.</div>
                ) : (
                  submissions.map(s => (
                    <div key={s.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 border border-slate-200 shadow-sm">
                            {s.aspirants?.full_name?.substring(0,1).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 uppercase tracking-tight">{s.aspirants?.full_name}</h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Submitted on {new Date(s.submitted_at).toLocaleString()}</p>
                          </div>
                          <span className={`ml-auto px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${s.status === 'reviewed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            {s.status}
                          </span>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 mb-4 max-h-40 overflow-y-auto">
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {typeof s.response_data === 'string' ? s.response_data : JSON.stringify(s.response_data, null, 2)}
                          </p>
                        </div>

                        {s.status === 'reviewed' && (
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <p className="text-[10px] font-black uppercase text-blue-900 mb-1">Your Remarks</p>
                            <p className="text-xs text-blue-700 font-medium">{s.mentor_remarks}</p>
                            <p className="text-xs font-black text-blue-900 mt-2">Score: {s.score}/10</p>
                          </div>
                        )}
                      </div>

                      <div className="w-full md:w-64 space-y-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add Review</h5>
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Score (0-10)</label>
                          <input 
                            type="range" min="0" max="10" step="0.5"
                            value={selectedSubmission?.id === s.id ? reviewScore : s.score || 5}
                            onChange={(e) => {
                              setSelectedSubmission(s);
                              setReviewScore(parseFloat(e.target.value));
                            }}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                          <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1">
                            <span>0</span>
                            <span className="text-blue-600 font-black">{selectedSubmission?.id === s.id ? reviewScore : s.score || 5}/10</span>
                            <span>10</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Remarks</label>
                          <textarea 
                            value={selectedSubmission?.id === s.id ? reviewRemarks : ''}
                            onChange={(e) => {
                              setSelectedSubmission(s);
                              setReviewRemarks(e.target.value);
                            }}
                            placeholder="Great work, but focus on..."
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-medium h-24 resize-none"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedSubmission(s);
                            handleReviewSubmission();
                          }}
                          disabled={!reviewRemarks && selectedSubmission?.id !== s.id}
                          className="w-full py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                          Submit Review
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorDashboard;
