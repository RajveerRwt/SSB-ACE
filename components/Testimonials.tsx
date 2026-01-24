
import React from 'react';
import { Star, Quote, CheckCircle, User } from 'lucide-react';

const Testimonials: React.FC = () => {
  const reviews = [
    {
      name: "Lt. Rahul Sharma",
      role: "Recommended (AIR 4)",
      text: "The AI Interviewer (Col. Arjun) is terrifyingly realistic. It caught my habit of looking away while thinking. The feedback on my body language was the game changer for my actual SSB at Bhopal.",
      initial: "R",
      color: "bg-blue-600"
    },
    {
      name: "Cadet Priya Singh",
      role: "Recommended (OTA Chennai)",
      text: "I used to struggle with TAT stories. The automated analysis here pointed out that my outcomes were always 'wishful' rather than 'practical'. Fixed it in 2 weeks using the practice sets.",
      initial: "P",
      color: "bg-purple-600"
    },
    {
      name: "Vikram Malhotra",
      role: "Screened In (NSB Vizag)",
      text: "PPDT was my nightmare. The custom image practice mode helped me write stories on random stimuli. The timer pressure here feels exactly like the real testing hall.",
      initial: "V",
      color: "bg-green-600"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-10 py-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter">
          Hall of <span className="text-yellow-500">Fame</span>
        </h2>
        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">
          Real Stories. Real Recommendations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {reviews.map((review, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative group hover:-translate-y-2 transition-all duration-300">
            <div className="absolute top-8 right-8 text-slate-100 group-hover:text-yellow-100 transition-colors">
              <Quote size={64} fill="currentColor" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 ${review.color} text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg`}>
                  {review.initial}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase text-sm tracking-wide">{review.name}</h4>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase tracking-widest mt-1">
                    <CheckCircle size={10} /> {review.role}
                  </div>
                </div>
              </div>

              <div className="flex gap-1">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>

              <p className="text-slate-600 text-sm font-medium leading-relaxed italic">
                "{review.text}"
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Testimonials;
