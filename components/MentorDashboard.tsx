
import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Calendar, FileText, CheckCircle, Clock, 
  ChevronRight, Search, UserPlus, MessageSquare, 
  Award, BarChart3, Settings, ExternalLink, Trash2,
  Video, BookOpen, ClipboardList, AlertCircle, Loader2, Play, ShieldCheck
} from 'lucide-react';
import AdminPanel from './AdminPanel';
import MentorBatchControl from './MentorBatchControl';
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

const TEST_DURATIONS: Record<string, number> = {
  'OIR': 30 * 60,
  'PPDT': 6 * 60, // 30s image + 1m char + 4m story + buffer
  'TAT': 12 * 60,
  'WAT': 15 * 60,
  'SRT': 30 * 60,
  'GPE': 20 * 60,
  'SDT': 15 * 60,
};

const LiveTimer: React.FC<{ scheduledAt: string; testType: string }> = ({ scheduledAt, testType }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const duration = TEST_DURATIONS[testType.toUpperCase()] || 30 * 60;
    const startTime = new Date(scheduledAt).getTime();
    const endTime = startTime + (duration * 1000);

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.floor((endTime - now) / 1000);
      
      if (diff <= 0) {
        setTimeLeft(0);
        setIsFinished(true);
      } else {
        setTimeLeft(diff);
        setIsFinished(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [scheduledAt, testType]);

  if (isFinished) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-500 rounded-full border border-slate-200 animate-in fade-in">
        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
        <span className="text-[9px] font-black uppercase tracking-widest">Test Concluded</span>
      </div>
    );
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 animate-pulse">
      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
      <span className="text-[9px] font-black uppercase tracking-widest">Live: {mins}:{secs < 10 ? '0' : ''}{secs} Remaining</span>
    </div>
  );
};

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

      const scheduledAtUTC = isLiveTest ? new Date().toISOString() : new Date(scheduledAt).toISOString();
      const newTest = await scheduleBatchTest(selectedBatch.id, testType, config, scheduledAtUTC, deadline);
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
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-1000">
      {/* Top Command Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 blur-[100px] -ml-32 -mb-32"></div>
        
        <div className="flex items-center gap-8 relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-600/40 transform -rotate-3">
            <Users size={40} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-blue-500/30">Command Center</span>
              <h2 className="text-3xl font-black uppercase tracking-tighter">Mentor HQ</h2>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] opacity-80 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              {mentor.full_name} • Operational
            </p>
          </div>
        </div>
        
        <div className="flex gap-4 relative z-10">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'batches', label: 'Batches', icon: Users },
            { id: 'library', label: 'Library', icon: BookOpen }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-xl scale-105' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'library' ? (
        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl animate-in slide-in-from-bottom-8 duration-700">
          <AdminPanel isMentorMode={true} />
        </div>
      ) : (
      <div className="grid lg:grid-cols-12 gap-10">
        {/* Left Sidebar: Navigation & Batches */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
              <Users size={120} />
            </div>
            
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Tactical Units</h3>
                <p className="text-lg font-black text-slate-900 uppercase tracking-tighter mt-1">Active Batches</p>
              </div>
              <button 
                onClick={() => setShowCreateBatch(true)}
                className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all duration-500 flex items-center justify-center shadow-lg shadow-blue-600/5"
              >
                <Plus size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {batches.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No units deployed</p>
                </div>
              ) : (
                batches.map(b => (
                  <button 
                    key={b.id}
                    onClick={() => handleSelectBatch(b)}
                    className={`w-full text-left p-6 rounded-[2rem] border-2 transition-all duration-500 flex items-center justify-between group relative overflow-hidden ${selectedBatch?.id === b.id ? 'bg-slate-900 border-slate-900 text-white shadow-2xl' : 'bg-slate-50 border-transparent text-slate-600 hover:border-blue-200 hover:bg-white'}`}
                  >
                    {selectedBatch?.id === b.id && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 blur-2xl -mr-12 -mt-12"></div>
                    )}
                    <div className="relative z-10">
                      <p className="text-sm font-black uppercase tracking-tight mb-1">{b.name}</p>
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${selectedBatch?.id === b.id ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-200 text-slate-500'}`}>
                          {b.batch_code}
                        </span>
                        <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedBatch?.id === b.id ? 'text-slate-400' : 'text-slate-400'}`}>
                          {b.member_count || 0} Personnel
                        </p>
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${selectedBatch?.id === b.id ? 'bg-blue-600 text-white rotate-90' : 'bg-white text-slate-300 group-hover:translate-x-1'}`}>
                      <ChevronRight size={20} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Intelligent Insights Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <BarChart3 size={80} />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-8">Fleet Intelligence</h4>
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-black tracking-tighter">{batches.length}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Total Batches</p>
                </div>
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400">
                  <Users size={28} />
                </div>
              </div>
              <div className="h-px bg-white/5"></div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-black tracking-tighter text-blue-500">{submissions.filter(s => s.status === 'submitted').length}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Pending Intel</p>
                </div>
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-blue-500">
                  <AlertCircle size={28} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Panel: Tactical View */}
        <div className="lg:col-span-8 space-y-10">
          {selectedBatch ? (
            <div className="animate-in slide-in-from-right-8 duration-700 space-y-10">
              {/* Batch Detail Header */}
              <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 blur-[100px] -mr-32 -mt-32"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <Users size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full">Operational</span>
                          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{selectedBatch.name}</h3>
                        </div>
                        <p className="text-slate-400 text-sm font-medium italic">"{selectedBatch.description || 'No mission briefing provided.'}"</p>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      const now = new Date();
                      const offset = now.getTimezoneOffset() * 60000;
                      const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
                      setScheduledAt(localISOTime);
                      setShowScheduleTest(true);
                    }}
                    className="group px-8 py-5 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all duration-500 flex items-center justify-center gap-3 shadow-2xl"
                  >
                    <Calendar size={18} className="group-hover:scale-110 transition-transform" /> Advanced Deployment
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-10 mt-12 pt-10 border-t border-slate-50">
                  {[
                    { label: 'Personnel', value: batchMembers.length, icon: Users },
                    { label: 'Sorties', value: batchTests.length, icon: Play },
                    { label: 'Sector Code', value: selectedBatch.batch_code, icon: Search }
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
                        <stat.icon size={20} />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Launch Control */}
              <MentorBatchControl 
                batchId={selectedBatch.id} 
                onTestScheduled={(newTest) => setBatchTests([newTest, ...batchTests])} 
              />

              {/* Tabs for Batch View */}
              <div className="space-y-8">
                <div className="flex items-center gap-12 border-b border-slate-100 px-8">
                  <button className="pb-6 text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 border-b-4 border-blue-600 transition-all">Deployment History</button>
                  <button className="pb-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-600 transition-all">Personnel Roster</button>
                </div>

                <div className="grid gap-6">
                  {batchTests.length === 0 ? (
                    <div className="text-center py-24 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                      <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl text-slate-200">
                        <ClipboardList size={40} />
                      </div>
                      <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">No active deployments in this sector</p>
                      <button 
                        onClick={() => {
                          const now = new Date();
                          const offset = now.getTimezoneOffset() * 60000;
                          const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
                          setScheduledAt(localISOTime);
                          setShowScheduleTest(true);
                        }}
                        className="mt-6 text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] hover:text-blue-700 transition-all flex items-center gap-2 mx-auto"
                      >
                        Initiate First Sortie <ChevronRight size={14} />
                      </button>
                    </div>
                  ) : (
                    batchTests.map(t => (
                      <div key={t.id} className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-md hover:shadow-2xl transition-all duration-500 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center gap-8 relative z-10">
                          <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center font-black text-lg shadow-xl group-hover:scale-110 transition-transform duration-500">
                            {t.test_type.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter">{t.test_type} Assessment</h4>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-widest rounded border border-blue-100">Verified</span>
                            </div>
                            <div className="flex items-center gap-6">
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} className="text-blue-500" /> {new Date(t.scheduled_at).toLocaleString()}
                              </p>
                              {(() => {
                                const startTime = new Date(t.scheduled_at).getTime();
                                const duration = TEST_DURATIONS[t.test_type.toUpperCase()] || 30 * 60;
                                const endTime = startTime + (duration * 1000);
                                const now = new Date().getTime();
                                
                                if (now >= startTime && now <= endTime) {
                                  return <LiveTimer scheduledAt={t.scheduled_at} testType={t.test_type} />;
                                }
                                return null;
                              })()}
                              {t.deadline && (
                                <p className="text-[10px] text-red-500 font-black uppercase tracking-widest flex items-center gap-2">
                                  <AlertCircle size={12} /> Deadline: {new Date(t.deadline).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 w-full md:w-auto relative z-10">
                          <button 
                            onClick={() => handleViewSubmissions(t.id)}
                            className="flex-1 md:flex-none px-10 py-5 bg-blue-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all duration-500 flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
                          >
                            <FileText size={18} /> Review Intel
                          </button>
                          <button className="w-14 h-14 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-500">
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] p-20 border border-slate-100 shadow-xl text-center flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 blur-[120px] -mr-48 -mt-48"></div>
              <div className="w-32 h-32 bg-slate-50 text-slate-200 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-inner relative z-10">
                <Users size={64} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4 relative z-10">Select Tactical Unit</h3>
              <p className="text-slate-400 text-sm font-medium italic max-w-sm leading-relaxed relative z-10">Choose a batch from the command roster to initiate deployments, manage personnel, and analyze mission performance data.</p>
              <div className="mt-12 flex gap-4 relative z-10">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-3 h-3 bg-blue-200 rounded-full animate-bounce delay-200"></div>
              </div>
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
                      const offset = now.getTimezoneOffset() * 60000;
                      const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
                      setScheduledAt(localISOTime);
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

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-4 max-h-[500px] overflow-y-auto space-y-6">
                          {(() => {
                                    const currentTestType = (s.test_type || s.batch_tests?.test_type)?.toUpperCase();
                                    if (currentTestType === 'PPDT' || currentTestType === 'TAT') {
                                      return (
                                        <div className="space-y-6">
                                          {/* Character Data */}
                                          {s.response_data?.characters && (
                                            <div>
                                              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Character Assessment</h5>
                                              <div className="flex flex-wrap gap-2">
                                                {s.response_data.characters.map((char: any, idx: number) => (
                                                  <div key={idx} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold">
                                                    {char.sex} • {char.age} • {char.mood}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Story Content */}
                                          <div>
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Written Story</h5>
                                            <div className="p-4 bg-blue-50/30 rounded-xl border border-blue-100/50 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium italic">
                                              {s.response_data?.story || s.response_data?.transcribedStory || "No story content provided."}
                                            </div>
                                          </div>

                                          {/* Handwritten Image if available */}
                                          {(s.response_data?.handwrittenImageUrl || s.response_data?.uploadedImage) && (
                                            <div>
                                              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Handwritten Submission</h5>
                                              <img 
                                                src={s.response_data.handwrittenImageUrl || `data:image/jpeg;base64,${s.response_data.uploadedImage}`} 
                                                alt="Handwritten Story" 
                                                className="w-full rounded-2xl border border-slate-200 shadow-sm"
                                                referrerPolicy="no-referrer"
                                              />
                                              {s.response_data.transcribedStory && (
                                                <div className="mt-4">
                                                  <h6 className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-2">AI Transcription</h6>
                                                  <p className="text-xs text-slate-500 italic leading-relaxed">{s.response_data.transcribedStory}</p>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    } else if (currentTestType === 'OIR') {
                                      return (
                                        <div className="space-y-6">
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                                              <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Score</p>
                                              <p className="text-2xl font-black text-blue-600">{s.response_data?.correct || 0}/{s.response_data?.totalQuestions || 0}</p>
                                            </div>
                                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                                              <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">Accuracy</p>
                                              <p className="text-2xl font-black text-emerald-600">{Math.round(s.response_data?.percentage || 0)}%</p>
                                            </div>
                                            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 text-center">
                                              <p className="text-[10px] font-black uppercase text-purple-400 mb-1">OIR Rating</p>
                                              <p className="text-2xl font-black text-purple-600">{s.response_data?.oir || 'N/A'}</p>
                                            </div>
                                            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-center">
                                              <p className="text-[10px] font-black uppercase text-orange-400 mb-1">Status</p>
                                              <p className="text-sm font-black text-orange-600 uppercase">Completed</p>
                                            </div>
                                          </div>
                                          
                                          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Performance Summary</h5>
                                            <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                              The student attempted {s.response_data?.totalQuestions} questions and correctly answered {s.response_data?.correct}. 
                                              Based on the performance, the calculated OIR rating is {s.response_data?.oir}.
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    } else if (currentTestType === 'WAT' || currentTestType === 'SRT') {
                                      return (
                                        <div className="space-y-6">
                                          <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Responses</h5>
                                          <div className="space-y-4">
                                            {s.response_data?.responses?.map((res: any, idx: number) => (
                                              <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 mb-1">#{idx + 1} {res.word || res.situation}</p>
                                                <p className="text-sm text-slate-700 font-medium">{res.response}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    } else if (currentTestType === 'GPE') {
                                      return (
                                        <div className="space-y-6">
                                          <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Group Planning Exercise</h5>
                                          <div className="p-4 bg-blue-50/30 rounded-xl border border-blue-100/50 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium italic">
                                            {s.response_data?.plan || "No plan provided."}
                                          </div>
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className="space-y-4">
                                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tactical Intel Data</p>
                                          <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-6 rounded-[2rem] border border-slate-100 overflow-x-auto">
                                            {(() => {
                                              try {
                                                const data = typeof s.response_data === 'string' ? JSON.parse(s.response_data) : s.response_data;
                                                return (
                                                  <div className="space-y-3">
                                                    {Object.entries(data).map(([key, value]: [string, any]) => (
                                                      <div key={key} className="flex flex-col border-b border-slate-200/50 pb-2 last:border-0">
                                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{key.replace(/_/g, ' ')}</span>
                                                        <span className="text-sm text-slate-800 font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                );
                                              } catch (e) {
                                                return <pre className="font-mono">{String(s.response_data)}</pre>;
                                              }
                                            })()}
                                          </div>
                                        </div>
                                      );
                                    }
                                  })()}
                        </div>

                        {s.status === 'reviewed' && (
                          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mt-4">
                            <h5 className="text-[10px] font-black uppercase text-blue-900 mb-3 flex items-center gap-2">
                              <ShieldCheck size={14} /> Mentor Assessment
                            </h5>
                            <p className="text-sm text-blue-700 font-medium leading-relaxed italic">"{s.mentor_remarks}"</p>
                            {(() => {
                              const currentTestType = (s.test_type || s.batch_tests?.test_type)?.toUpperCase();
                              return currentTestType !== 'OIR' && (
                                <div className="mt-4 pt-4 border-t border-blue-200/50 flex items-center justify-between">
                                  <p className="text-xs font-black text-blue-900">Tactical Score</p>
                                  <p className="text-xl font-black text-blue-600">{s.score}/10</p>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      <div className="w-full md:w-64 space-y-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add Review</h5>
                        {(() => {
                          const currentTestType = (s.test_type || s.batch_tests?.test_type)?.toUpperCase();
                          return (
                            <>
                              {currentTestType !== 'OIR' && (
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
                              )}
                              <div>
                                <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
                                  {currentTestType === 'PPDT' || currentTestType === 'TAT' ? 'Detailed Intel Feedback' : 'Remarks'}
                                </label>
                                <textarea 
                                  value={selectedSubmission?.id === s.id ? reviewRemarks : ''}
                                  onChange={(e) => {
                                    setSelectedSubmission(s);
                                    setReviewRemarks(e.target.value);
                                  }}
                                  placeholder={currentTestType === 'PPDT' ? "Review the story, characterization, and theme..." : "Great work, but focus on..."}
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-medium h-32 resize-none shadow-inner"
                                />
                              </div>
                            </>
                          );
                        })()}
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
