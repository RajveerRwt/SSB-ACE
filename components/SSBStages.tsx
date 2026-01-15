
import React, { useState } from 'react';
import { Target, Brain, Users, Mic, Award, CheckCircle2, Shield, Calendar, Clock, MapPin, Info } from 'lucide-react';

const SSBStages: React.FC = () => {
  const [activeDay, setActiveDay] = useState(1);

  const stages = [
    {
      day: 1,
      title: "Stage I: Screening",
      subtitle: "The Filtration Round",
      icon: Target,
      color: "bg-blue-600",
      tasks: [
        { name: "OIR Test", desc: "Officer Intelligence Rating - Verbal & Non-Verbal reasoning tests. Decides your initial rating." },
        { name: "PPDT", desc: "Picture Perception & Description Test. Observation for 30s, Story writing for 4m." },
        { name: "Narration & GD", desc: "Individual narration (60-90s) followed by a group discussion to reach a common story." }
      ],
      tip: "First Impression is the Last Impression. Shave properly, dress decently, and be confident during narration."
    },
    {
      day: 2,
      title: "Stage II: Psychology",
      subtitle: "The Subconscious Probe",
      icon: Brain,
      color: "bg-purple-600",
      tasks: [
        { name: "TAT", desc: "Thematic Apperception Test - 11 hazy images + 1 blank slide for your own story." },
        { name: "WAT", desc: "Word Association Test - 60 words, 15s each to write a spontaneous sentence." },
        { name: "SRT", desc: "Situation Reaction Test - 60 practical life scenarios to be solved in 30 minutes." },
        { name: "SD", desc: "Self Description - Writing 5 paragraphs on what parents, teachers, and friends think of you." }
      ],
      tip: "The main character is 'YOU'. Project your true personality through the hero of your stories. Do not mask responses."
    },
    {
      day: 3,
      title: "Stage III: GTO-1",
      subtitle: "The Group Dynamics",
      icon: Users,
      color: "bg-green-600",
      tasks: [
        { name: "GD", desc: "Two rounds of Group Discussion on current affairs and social issues (20 mins each)." },
        { name: "GPE", desc: "Group Planning Exercise - Solving a multi-emergency map problem on a model." },
        { name: "PGT", desc: "Progressive Group Task - Crossing 4 obstacles as a group using cantilever principles." },
        { name: "Snake Race", desc: "Inter-group obstacle race carrying a heavy tent load (the 'snake')." }
      ],
      tip: "Cooperation is key. Be a team player, not a selfish competitor. The GTO looks for Social Effectiveness."
    },
    {
      day: 4,
      title: "Stage IV: GTO-2",
      subtitle: "Individual & Final Tasks",
      icon: Mic,
      color: "bg-yellow-600",
      tasks: [
        { name: "Lecturette", desc: "Individual short speeches on a prepared topic." },
        { name: "Half Group Task (HGT)", desc: "A smaller group task with specific rules, often splitting the main group." },
        { name: "Individual Obstacles (IO)", desc: "Candidates individually complete various obstacles, testing physical fitness and stamina." },
        { name: "Command Task (CT)", desc: "A challenging task where one candidate acts as the commander, directing others." },
        { name: "Final Group Task (FGT)", desc: "The last major group task, often the most demanding, testing leadership and coordination." }
      ],
      tip: "Demonstrate clear logic, courage, and the ability to influence the group positively during final tasks."
    },
    {
      day: 5,
      title: "Stage V: Conference",
      subtitle: "The Final Verdict",
      icon: Award,
      color: "bg-slate-900",
      tasks: [
        { name: "Assessors Meet", desc: "Psychologist, GTO, and IO discuss each case for a consensus." },
        { name: "Board Conference", desc: "A brief 1-2 minute final appearance before the board of 8-10 officers." },
        { name: "Result Declaration", desc: "Final list of recommended candidates is announced by afternoon." }
      ],
      tip: "If asked for suggestions, be constructive and frank, not complaining. Keep saying 'All is well'."
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl border-b-8 border-yellow-500">
        <div className="relative z-10 space-y-4">
          <span className="bg-yellow-400 text-black px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">The Complete Guide</span>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">5-Day Board <span className="text-yellow-400">Roadmap</span></h2>
          <p className="text-slate-400 max-w-2xl font-medium leading-relaxed italic text-sm md:text-base">
            "The SSB doesn't test your knowledge; it tests your personality, grit, and 15 Officer Like Qualities (OLQs)."
          </p>
        </div>
        <Shield className="absolute top-1/2 -right-12 -translate-y-1/2 w-48 h-48 md:w-80 md:h-80 text-white/5 rotate-12" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        {stages.map((s) => (
          <button
            key={s.day}
            onClick={() => setActiveDay(s.day)}
            className={`p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] transition-all border-2 text-left group ${
              activeDay === s.day 
                ? 'bg-white border-slate-900 shadow-xl -translate-y-2' 
                : 'bg-slate-50 border-transparent hover:bg-white hover:border-slate-200'
            }`}
          >
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl mb-3 md:mb-4 flex items-center justify-center transition-all ${
              activeDay === s.day ? s.color + ' text-white scale-110' : 'bg-slate-200 text-slate-500'
            }`}>
              <s.icon size={16} className="md:w-5 md:h-5" />
            </div>
            <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Day {s.day}</p>
            <h4 className={`font-black uppercase text-[10px] md:text-xs tracking-tight ${activeDay === s.day ? 'text-slate-900' : 'text-slate-500'}`}>{s.title.split(': ')[1]}</h4>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] md:rounded-[4rem] p-6 md:p-16 shadow-2xl border border-slate-100 relative overflow-hidden">
        {stages.map((s) => s.day === activeDay && (
          <div key={s.day} className="animate-in slide-in-from-right duration-500 space-y-8 md:space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <h3 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter">{s.title}</h3>
                <p className="text-blue-600 font-bold uppercase tracking-[0.3em] text-[10px]">{s.subtitle}</p>
              </div>
              <div className="bg-slate-50 px-6 py-3 md:px-8 md:py-4 rounded-3xl border border-slate-100">
                <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Reporting Window</p>
                <p className="text-lg md:text-xl font-black text-slate-900">06:00 AM Sharp</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {s.tasks.map((task, i) => (
                <div key={i} className="p-6 md:p-8 bg-slate-50 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 hover:border-blue-200 transition-all group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-slate-900 font-black text-[10px]">{i+1}</div>
                    <h5 className="font-black uppercase text-xs tracking-widest text-slate-800">{task.name}</h5>
                  </div>
                  <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">{task.desc}</p>
                </div>
              ))}
            </div>

            <div className={`p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] text-white flex flex-col md:flex-row items-center gap-6 md:gap-10 shadow-xl ${s.color}`}>
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shrink-0">
                <Info size={32} className="md:w-10 md:h-10" />
              </div>
              <div className="space-y-2 text-center md:text-left">
                <h4 className="text-base md:text-lg font-black uppercase tracking-widest">Psychologist's Briefing</h4>
                <p className="text-white/80 font-medium italic text-sm md:text-base">"{s.tip}"</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
        {[
          { icon: Calendar, title: "Reporting", detail: "Day 0 Afternoon" },
          { icon: Clock, title: "Total Testing", detail: "5 Intensive Days" },
          { icon: MapPin, title: "Selection Centres", detail: "Allahabad, Bhopal, Bengaluru..." }
        ].map((info, i) => (
          <div key={i} className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 flex items-center gap-6 shadow-lg">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500">
              <info.icon size={24} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">{info.title}</p>
              <p className="text-xs font-bold text-slate-800">{info.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SSBStages;
