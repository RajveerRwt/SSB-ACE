
import React, { useState } from 'react';
import { Target, Brain, Users, Mic, Award, CheckCircle2, Shield, Calendar, Clock, MapPin, Info, FileText, Activity, Flag } from 'lucide-react';

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
        { name: "OIR Test", desc: "Officer Intelligence Rating – Verbal and non-verbal reasoning questions to test basic intelligence." },
        { name: "PPDT", desc: "Picture Perception & Discussion Test – Write a story on a hazy picture (4 min) and discuss it in a group." },
        { name: "Result", desc: "Screening results declared. Selected candidates stay for Stage II; others are routed back." }
      ],
      tip: "Speak clearly and logically during the PPDT discussion. Do not dominate; facilitate the group to reach a common story."
    },
    {
      day: 2,
      title: "Stage II: Psychology",
      subtitle: "The Subconscious Probe",
      icon: Brain,
      color: "bg-purple-600",
      tasks: [
        { name: "TAT", desc: "Thematic Apperception Test – Write stories on 11 pictures + 1 blank slide (4 min each)." },
        { name: "WAT", desc: "Word Association Test – 60 words shown back-to-back (15s each). Write the first thought." },
        { name: "SRT", desc: "Situation Reaction Test – 60 practical life situations. Give reactions in 30 mins." },
        { name: "SDT", desc: "Self-Description Test – Write opinions of parents, teachers, friends, self, and future aims." }
      ],
      tip: "The main character is 'YOU'. Project your true personality. Speed and honesty are crucial."
    },
    {
      day: 3,
      title: "Stage III: GTO-1",
      subtitle: "Group Dynamics",
      icon: Users,
      color: "bg-green-600",
      tasks: [
        { name: "GD", desc: "Two rounds of Group Discussion on current affairs and social issues (20 mins each)." },
        { name: "GPE", desc: "Group Planning Exercise – Solving a multi-emergency map problem on a model." },
        { name: "PGT", desc: "Progressive Group Task – Crossing 4 obstacles as a group using helping materials." },
        { name: "HGT & Snake Race", desc: "Half Group Task and Inter-group obstacle race carrying a heavy load." }
      ],
      tip: "Cooperation over competition. The GTO looks for 'Social Effectiveness' and your ability to work in a team."
    },
    {
      day: 4,
      title: "Stage IV: GTO-2",
      subtitle: "Final Tasks",
      icon: Flag,
      color: "bg-yellow-600",
      tasks: [
        { name: "Individual Obstacles", desc: "10 obstacles to be cleared individually in 3 minutes." },
        { name: "Command Task", desc: "You are the commander. Lead 2 subordinates to solve a task." },
        { name: "Lecturette", desc: "Speak for 3 minutes on a chosen topic from a card." },
        { name: "FGT", desc: "Final Group Task – The last hurdle to test group cohesion." }
      ],
      tip: "Demonstrate courage and stamina in Individual Obstacles. Be clear and firm in the Command Task."
    },
    {
      day: 5,
      title: "Interview & Conference",
      subtitle: "The Final Verdict",
      icon: Mic,
      color: "bg-slate-900",
      tasks: [
        { name: "Personal Interview", desc: "Conducted on any day (Day 2-4) in afternoon/evening. Covers PIQ, life journey, and general awareness." },
        { name: "Closing Address", desc: "A senior officer addresses the candidates before the final conference." },
        { name: "Board Conference", desc: "Candidates appear individually before the complete board of assessors." },
        { name: "Results", desc: "Final recommendations are announced. Selected candidates stay for medicals." }
      ],
      tip: "The Interview is a conversation, not an interrogation. Be honest about your strengths and weaknesses."
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl border-b-8 border-yellow-500">
        <div className="relative z-10 space-y-4">
          <span className="bg-yellow-400 text-black px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">The Complete Guide</span>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">5-Day Board <span className="text-yellow-400">Roadmap</span></h2>
          <p className="text-slate-400 max-w-2xl font-medium leading-relaxed italic text-sm md:text-base">
            "The SSB process is designed to test your 'Manas, Vach, Karmana' (Mind, Speech, and Action)."
          </p>
        </div>
        <Shield className="absolute top-1/2 -right-12 -translate-y-1/2 w-48 h-48 md:w-80 md:h-80 text-white/5 rotate-12" />
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {stages.map((s) => (
          <button
            key={s.day}
            onClick={() => setActiveDay(s.day)}
            className={`p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] transition-all border-2 text-left group flex flex-col justify-between h-full ${
              activeDay === s.day 
                ? 'bg-white border-slate-900 shadow-xl -translate-y-1 md:-translate-y-2' 
                : 'bg-slate-50 border-transparent hover:bg-white hover:border-slate-200'
            }`}
          >
            <div>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl mb-3 md:mb-4 flex items-center justify-center transition-all ${
                activeDay === s.day ? s.color + ' text-white scale-110' : 'bg-slate-200 text-slate-500'
                }`}>
                <s.icon size={16} className="md:w-5 md:h-5" />
                </div>
                <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Day {s.day}</p>
                <h4 className={`font-black uppercase text-[10px] md:text-xs tracking-tight leading-tight ${activeDay === s.day ? 'text-slate-900' : 'text-slate-500'}`}>
                    {s.title.includes(':') ? s.title.split(': ')[1] : s.title}
                </h4>
            </div>
          </button>
        ))}
      </div>

      {/* Active Stage Details */}
      <div className="bg-white rounded-[2rem] md:rounded-[4rem] p-6 md:p-16 shadow-2xl border border-slate-100 relative overflow-hidden min-h-[400px]">
        {stages.map((s) => s.day === activeDay && (
          <div key={s.day} className="animate-in slide-in-from-right duration-500 space-y-8 md:space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <h3 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter">{s.title}</h3>
                <p className="text-blue-600 font-bold uppercase tracking-[0.3em] text-[10px]">{s.subtitle}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {s.tasks.map((task, i) => (
                <div key={i} className="p-6 md:p-8 bg-slate-50 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 hover:border-blue-200 transition-all group hover:bg-blue-50/30">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-slate-900 font-black text-[10px] shrink-0">{i+1}</div>
                    <h5 className="font-black uppercase text-xs tracking-widest text-slate-800 leading-tight">{task.name}</h5>
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{task.desc}</p>
                </div>
              ))}
            </div>

            <div className={`p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] text-white flex flex-col md:flex-row items-center gap-6 md:gap-10 shadow-xl ${s.color}`}>
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shrink-0">
                <Info size={32} className="md:w-10 md:h-10" />
              </div>
              <div className="space-y-2 text-center md:text-left">
                <h4 className="text-base md:text-lg font-black uppercase tracking-widest">Expert Insight</h4>
                <p className="text-white/80 font-medium italic text-sm md:text-base">"{s.tip}"</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Post Recommendation Section */}
      <div className="bg-green-50 rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 border border-green-100 flex flex-col md:flex-row items-center gap-8 shadow-inner">
         <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm">
            <Activity size={40} />
         </div>
         <div className="flex-1 space-y-2 text-center md:text-left">
            <h4 className="text-lg md:text-xl font-black text-green-900 uppercase tracking-tighter">Medical Examination & Merit List</h4>
            <p className="text-xs md:text-sm text-green-800/80 font-medium leading-relaxed">
               Candidates recommended by the board undergo a detailed medical examination at a military hospital (lasts 3-5 days). 
               Final selection is based on the All India Merit List, combining your SSB marks and Medical fitness.
            </p>
         </div>
      </div>

      {/* Footer Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
        {[
          { icon: Calendar, title: "Reporting", detail: "Day 0 Afternoon" },
          { icon: Clock, title: "Total Testing", detail: "5 Intensive Days" },
          { icon: MapPin, title: "Selection Centres", detail: "Kapurthala, Bhopal, Bangalore..." }
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
