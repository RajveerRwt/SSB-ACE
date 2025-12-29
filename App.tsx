
import React, { useState } from 'react';
import Layout from './components/Layout';
import PPDTTest from './components/PPDTTest';
import PsychologyTest from './components/PsychologyTest';
import Interview from './components/Interview';
import PIQForm from './components/PIQForm';
import { TestType, PIQData } from './types';
import { ShieldCheck, Target, Award, Users, TrendingUp, Brain, FileText, CheckCircle } from 'lucide-react';

const Dashboard: React.FC<{ onStartTest: (t: TestType) => void, piqLoaded: boolean }> = ({ onStartTest, piqLoaded }) => {
  const stats = [
    { label: 'Practice Hours', value: '12.5', icon: Target, color: 'text-blue-600' },
    { label: 'OLQ Index', value: '7.8', icon: Award, color: 'text-yellow-600' },
    { label: 'Tests Taken', value: '24', icon: Users, color: 'text-green-600' },
    { label: 'Progress', value: '+12%', icon: TrendingUp, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
         <div className="relative z-10 max-w-2xl">
           <h1 className="text-5xl font-black mb-6 tracking-tighter leading-none">Victory Favors <br/><span className="text-yellow-400">The Prepared.</span></h1>
           <p className="text-slate-400 text-lg mb-10 leading-relaxed font-medium">
             The Service Selection Board evaluates you for 15 Officer Like Qualities. 
             Maintain discipline, honesty, and mental alertness in every round.
           </p>
           <div className="flex gap-4">
             <button 
               onClick={() => onStartTest(TestType.INTERVIEW)}
               className="px-10 py-4 bg-yellow-400 text-black font-black rounded-2xl hover:bg-yellow-500 transition-all shadow-[0_10px_30px_rgba(234,179,8,0.3)] hover:-translate-y-1 uppercase tracking-widest text-sm"
             >
               Report to IO Board
             </button>
             {!piqLoaded && (
               <button 
                onClick={() => onStartTest(TestType.PIQ)}
                className="px-10 py-4 bg-white/10 text-white font-black rounded-2xl hover:bg-white/20 transition-all uppercase tracking-widest text-sm border border-white/10"
              >
                Complete PIQ First
              </button>
             )}
           </div>
         </div>
         <ShieldCheck className="absolute top-1/2 -right-12 -translate-y-1/2 w-[30rem] h-[30rem] text-white/5 rotate-12" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl bg-slate-50 ${stat.color}`}>
                <stat.icon className="w-7 h-7" />
              </div>
            </div>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">{stat.label}</p>
            <h4 className="text-3xl font-black text-slate-800">{stat.value}</h4>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8 pb-12">
         <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
           <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
             <Brain className="w-5 h-5 text-blue-600" /> Training Schedule
           </h3>
           <div className="space-y-4 flex-1">
              {[
                { id: TestType.PIQ, name: 'Personal Info Questionnaire', type: 'Administrative', time: '15 mins', status: piqLoaded ? 'Completed' : 'Mandatory' },
                { id: TestType.PPDT, name: 'PPDT Round Practice', type: 'Screening', time: '10 mins', status: 'Ready' },
                { id: TestType.INTERVIEW, name: 'AI Interview Simulation', type: 'Interview', time: '30 mins', status: 'Recommended' },
              ].map((test, i) => (
                <div 
                  key={i} 
                  onClick={() => onStartTest(test.id)}
                  className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    {test.status === 'Completed' && <CheckCircle className="text-green-500" size={16} />}
                    <div>
                      <h5 className="font-black text-slate-800 group-hover:text-blue-700 uppercase text-xs tracking-wider">{test.name}</h5>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{test.type} • {test.time}</p>
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    test.status === 'Ready' ? 'bg-green-100 text-green-700' : 
                    test.status === 'Recommended' ? 'bg-blue-100 text-blue-700' : 
                    test.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {test.status}
                  </span>
                </div>
              ))}
           </div>
         </div>

         <div className="bg-white p-10 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-full bg-yellow-50 flex items-center justify-center mb-6 shadow-inner">
               <Award className="w-12 h-12 text-yellow-600" />
            </div>
            <h3 className="text-xl font-bold mb-3">Psychologist's Insight</h3>
            <p className="text-slate-600 italic text-sm mb-8 leading-relaxed font-medium">"Your recent WAT responses reflect high social adaptability. Work on your narration speed in PPDT to improve Power of Expression."</p>
            <div className="w-full flex gap-3">
               <button onClick={() => onStartTest(TestType.PPDT)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all">Start PPDT</button>
               <button className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Report</button>
            </div>
         </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeTest, setActiveTest] = useState<TestType>(TestType.DASHBOARD);
  const [piqData, setPiqData] = useState<PIQData | undefined>();

  const handlePiqSave = (data: PIQData) => {
    setPiqData(data);
    setActiveTest(TestType.DASHBOARD);
  };

  const renderContent = () => {
    switch (activeTest) {
      case TestType.DASHBOARD:
        return <Dashboard onStartTest={setActiveTest} piqLoaded={!!piqData} />;
      case TestType.PIQ:
        return <PIQForm onSave={handlePiqSave} initialData={piqData} />;
      case TestType.PPDT:
        return <PPDTTest />;
      case TestType.WAT:
      case TestType.TAT:
      case TestType.SRT:
        return <PsychologyTest type={activeTest} />;
      case TestType.INTERVIEW:
        return <Interview piqData={piqData} />;
      default:
        return <Dashboard onStartTest={setActiveTest} piqLoaded={!!piqData} />;
    }
  };

  return (
    <Layout activeTest={activeTest} onNavigate={setActiveTest}>
      {renderContent()}
    </Layout>
  );
};

export default App;
