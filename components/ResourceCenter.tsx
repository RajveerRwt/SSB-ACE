
import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, Globe, Zap, Layout, CheckCircle, Search, Calendar, Tag, MessageSquare, Loader2, ArrowRight, Mic, Users, Timer, X, Play, HelpCircle, Anchor, Shield, Plane, Award, Map, List, ChevronRight } from 'lucide-react';
import { fetchDailyNews } from '../services/geminiService';
import { getCachedContent, setCachedContent } from '../services/supabaseService';

interface ResourceCenterProps {
  initialTab?: 'GK' | 'GD' | 'INTERVIEW' | 'BLOG';
}

const ResourceCenter: React.FC<ResourceCenterProps> = ({ initialTab = 'GK' }) => {
  const [activeTab, setActiveTab] = useState<'GK' | 'GD' | 'INTERVIEW' | 'BLOG'>(initialTab);
  const [gkCategory, setGkCategory] = useState<'SERVICES' | 'RANKS' | 'AWARDS' | 'COMMANDS'>('SERVICES');
  const [blogContent, setBlogContent] = useState<any[]>([]);
  const [blogLoading, setBlogLoading] = useState(false);
  
  // Sync activeTab if initialTab changes
  useEffect(() => {
    if (initialTab) {
        setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (activeTab === 'BLOG' && blogContent.length === 0) {
      fetchBlogData();
    }
  }, [activeTab]);

  const fetchBlogData = async () => {
    setBlogLoading(true);
    const dateKey = new Date().toISOString().split('T')[0];

    try {
      // 1. Try Cache
      const cached = await getCachedContent('NEWS', dateKey);
      if (cached && cached.news) {
          setBlogContent(cached.news);
          setBlogLoading(false);
          return;
      }

      // 2. Fetch fresh
      const { text } = await fetchDailyNews();
      const blocks = text?.split('---NEWS_BLOCK---').slice(1) || [];
      const parsedNews = blocks.map((block: string) => {
          const headline = block.match(/HEADLINE:\s*(.*)/i)?.[1]?.trim() || "Defense Update";
          const tag = block.match(/TAG:\s*(.*)/i)?.[1]?.trim() || "National";
          const summary = block.match(/SUMMARY:\s*(.*)/i)?.[1]?.trim() || "No summary available.";
          const relevance = block.match(/SSB_RELEVANCE:\s*(.*)/i)?.[1]?.trim() || "General Awareness";
          return { headline, tag, summary, relevance };
      });
      setBlogContent(parsedNews);

      // 3. Cache it
      if (parsedNews.length > 0) {
          await setCachedContent('NEWS', dateKey, { news: parsedNews, sources: [] });
      }

    } catch (e) {
      console.error("Failed to fetch blog data", e);
    } finally {
      setBlogLoading(false);
    }
  };

  const SERVICE_INFO = [
      {
          id: 'ARMY',
          name: 'Indian Army',
          icon: Shield,
          color: 'text-green-700',
          bg: 'bg-green-50',
          border: 'border-green-200',
          details: [
              { label: 'Motto', value: 'Seva Paramo Dharma (Service Before Self)' },
              { label: 'Army Day', value: '15 January' },
              { label: 'Headquarters', value: 'New Delhi' },
              { label: 'Chief', value: 'Chief of the Army Staff (COAS) - General' }
          ]
      },
      {
          id: 'NAVY',
          name: 'Indian Navy',
          icon: Anchor,
          color: 'text-blue-800',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          details: [
              { label: 'Motto', value: 'Sham No Varunah (May the Lord of Water be auspicious unto us)' },
              { label: 'Navy Day', value: '04 December' },
              { label: 'Headquarters', value: 'New Delhi' },
              { label: 'Chief', value: 'Chief of the Naval Staff (CNS) - Admiral' }
          ]
      },
      {
          id: 'AIRFORCE',
          name: 'Indian Air Force',
          icon: Plane,
          color: 'text-sky-600',
          bg: 'bg-sky-50',
          border: 'border-sky-200',
          details: [
              { label: 'Motto', value: 'Nabhah Sparsham Diptam (Touch the sky with glory)' },
              { label: 'Air Force Day', value: '08 October' },
              { label: 'Headquarters', value: 'New Delhi' },
              { label: 'Chief', value: 'Chief of the Air Staff (CAS) - Air Chief Marshal' }
          ]
      }
  ];

  const RANKS_DATA = [
      { army: 'Lieutenant', navy: 'Sub Lieutenant', airforce: 'Flying Officer' },
      { army: 'Captain', navy: 'Lieutenant', airforce: 'Flight Lieutenant' },
      { army: 'Major', navy: 'Lt Commander', airforce: 'Squadron Leader' },
      { army: 'Lt Colonel', navy: 'Commander', airforce: 'Wing Commander' },
      { army: 'Colonel', navy: 'Captain', airforce: 'Group Captain' },
      { army: 'Brigadier', navy: 'Commodore', airforce: 'Air Commodore' },
      { army: 'Major General', navy: 'Rear Admiral', airforce: 'Air Vice Marshal' },
      { army: 'Lt General', navy: 'Vice Admiral', airforce: 'Air Marshal' },
      { army: 'General', navy: 'Admiral', airforce: 'Air Chief Marshal' },
      { army: 'Field Marshal', navy: 'Admiral of the Fleet', airforce: 'Marshal of the IAF' },
  ];

  const COMMANDS_DATA = [
      {
          service: 'Indian Army',
          commands: [
              { name: 'Northern', loc: 'Udhampur' },
              { name: 'Western', loc: 'Chandimandir' },
              { name: 'Eastern', loc: 'Kolkata' },
              { name: 'Southern', loc: 'Pune' },
              { name: 'Central', loc: 'Lucknow' },
              { name: 'South Western', loc: 'Jaipur' },
              { name: 'Training (ARTRAC)', loc: 'Shimla' }
          ]
      },
      {
          service: 'Indian Navy',
          commands: [
              { name: 'Western Naval Command', loc: 'Mumbai' },
              { name: 'Eastern Naval Command', loc: 'Visakhapatnam' },
              { name: 'Southern Naval Command', loc: 'Kochi' }
          ]
      },
      {
          service: 'Indian Air Force',
          commands: [
              { name: 'Western', loc: 'New Delhi' },
              { name: 'Eastern', loc: 'Shillong' },
              { name: 'Central', loc: 'Prayagraj' },
              { name: 'Southern', loc: 'Thiruvananthapuram' },
              { name: 'South Western', loc: 'Gandhinagar' },
              { name: 'Training', loc: 'Bengaluru' },
              { name: 'Maintenance', loc: 'Nagpur' }
          ]
      }
  ];

  const AWARDS_DATA = [
      {
          type: "Wartime Gallantry",
          awards: ["Param Vir Chakra (PVC)", "Maha Vir Chakra (MVC)", "Vir Chakra (VrC)"]
      },
      {
          type: "Peacetime Gallantry",
          awards: ["Ashoka Chakra (AC)", "Kirti Chakra (KC)", "Shaurya Chakra (SC)"]
      },
      {
          type: "Distinguished Service",
          awards: ["Param Vishisht Seva Medal (PVSM)", "Ati Vishisht Seva Medal (AVSM)", "Vishisht Seva Medal (VSM)"]
      }
  ];

  const GD_TOPICS = [
      {
          title: "Challenges to Development",
          description: "India faces a lot of challenges in its progress towards becoming a prosperous and secure nation. In your opinion, what is the biggest challenge for our development?",
          category: "National",
          leads: ["Caste and Religious Differences", "Rampant Corruption", "Population Explosion"]
      },
      {
          title: "Benefits of Space Exploration",
          description: "India has been in the forefront of space exploration in the recent times. In your opinion, what will be most significant benefit of space exploration?",
          category: "Sci-Tech",
          leads: ["Foreign Relations", "Military Applications", "Economic Growth"]
      },
      {
          title: "Rising Unemployment",
          description: "Unemployment is one of the major problems faced by the youth of our country. In your opinion, what is the main reason for increasing unemployment?",
          category: "Economy",
          leads: ["Increasing Privatisation", "Poor Education Policies", "Technological Advancements"]
      },
      {
          title: "Ukraine-Russia War Gains",
          description: "Although wars are not good, the war between Ukraine and Russia may prove to be beneficial for some countries. In your opinion, which country stands to gain the most due to this conflict?",
          category: "International",
          leads: ["China", "India", "USA"]
      },
      {
          title: "Impact of Social Media",
          description: "Social Media usage has been rapidly increasing over the last few years. In your opinion, what is the most adverse effect due to increasing social media?",
          category: "Social",
          leads: ["National Security", "Cyber Crimes", "Social Problems"]
      },
      {
          title: "MNCs in India",
          description: "Multinational companies have shown a lot of interest in India over the last few years. In your opinion, what is the main reason for their interest in our country?",
          category: "Economy",
          leads: ["Geographical Location", "Human Resources", "Transparent Democracy"]
      },
      {
          title: "Urban Hygiene Issues",
          description: "The unhygienic living conditions in our cities causes many health issues to its residents. In your opinion, what is the main reason for such conditions?",
          category: "Social",
          leads: ["Lack of Civic Sense", "Inefficient Administration", "Population Explosion"]
      },
      {
          title: "Water Scarcity",
          description: "Water bodies are reducing at a rapid pace leading to water scarcity in our cities. In your opinion, what is the main reason for this problem?",
          category: "Environment",
          leads: ["Rapid Industrialisation", "Population Explosion", "Rampant Corruption"]
      },
      {
          title: "Economic Sector Incentives",
          description: "For balanced growth a few sectors of our economy need more attention as compared to others. In your opinion, which sector requires additional incentives?",
          category: "Economy",
          leads: ["Agriculture Sector", "Tourism Sector", "Manufacturing Sector"]
      },
      {
          title: "Study Abroad Trends",
          description: "A lot of students from our country travel abroad for their higher education. In your opinion, why do some students prefer higher education from foreign countries?",
          category: "Education",
          leads: ["Better Opportunities", "Quality of Education", "To Migrate Abroad"]
      }
  ];

  const INTERVIEW_QUESTIONS = [
      {
          category: "CIQ 1 (Education & Family)",
          questions: [
              "Tell me about your academic performance starting from 10th class till now.",
              "Who is your favorite teacher and why? Who did you not like?",
              "Tell me about your family members and your relationship with them.",
              "How do you spend time with your parents?"
          ]
      },
      {
          category: "CIQ 2 (Friends & Hobbies)",
          questions: [
              "Who are your best friends and why? What qualities do you like in them?",
              "How do you spend your spare time?",
              "What are your hobbies and interests?",
              "Tell me about your daily routine."
          ]
      },
      {
          category: "Service Knowledge",
          questions: [
              "Why do you want to join the Defense Forces?",
              "Which regiment/branch do you want to join and why?",
              "What is the rank structure of the Army/Navy/Air Force?",
              "Tell me about the recent modernization in Indian Armed Forces."
          ]
      },
      {
          category: "Self Awareness",
          questions: [
              "What are your strengths and weaknesses?",
              "Tell me about a time you showed leadership.",
              "What is your backup plan if you don't get selected?",
              "What improvements have you made since your last attempt? (For Repeaters)"
          ]
      }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700 relative">
      
      {/* HEADER SEO */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center border-b-8 border-blue-500">
         <div className="relative z-10 space-y-4">
            <span className="px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-2 mx-auto w-fit">
               <BookOpen size={12} /> Knowledge Vault
            </span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Defense Aspirant <span className="text-yellow-400">Resource Library</span></h1>
            <p className="text-slate-400 max-w-2xl font-medium leading-relaxed text-sm md:text-base">
               Free curated study material for SSB Interview preparation. Access static GK, GD topics, Interview questions, and daily defense current affairs.
            </p>
         </div>
         <div className="absolute top-0 right-0 p-8 opacity-5">
             <FileText size={200} />
         </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap justify-center gap-4">
          {[
              { id: 'GK', label: 'Static Defence GK', icon: Shield },
              { id: 'GD', label: 'GD Topics', icon: Users },
              { id: 'INTERVIEW', label: 'Interview Questions', icon: MessageSquare },
              { id: 'BLOG', label: 'Daily Defense Blog', icon: Globe },
          ].map((tab) => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all ${
                      activeTab === tab.id 
                      ? 'bg-slate-900 text-white shadow-xl scale-105' 
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                  }`}
              >
                  <tab.icon size={16} /> {tab.label}
              </button>
          ))}
      </div>

      {/* CONTENT AREA */}
      <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-xl min-h-[500px]">
          
          {/* STATIC GK SECTION */}
          {activeTab === 'GK' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  {/* GK Sub-Tabs */}
                  <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-100 pb-4">
                      {[
                          { id: 'SERVICES', label: 'Services Info', icon: Shield },
                          { id: 'RANKS', label: 'Ranks', icon: List },
                          { id: 'AWARDS', label: 'Honours', icon: Award },
                          { id: 'COMMANDS', label: 'Commands', icon: Map },
                      ].map(sub => (
                          <button
                              key={sub.id}
                              onClick={() => setGkCategory(sub.id as any)}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                                  gkCategory === sub.id 
                                  ? 'bg-blue-600 text-white shadow-lg' 
                                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                              }`}
                          >
                              <sub.icon size={12} /> {sub.label}
                          </button>
                      ))}
                  </div>

                  {gkCategory === 'SERVICES' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {SERVICE_INFO.map((service, i) => (
                              <div key={i} className={`p-6 rounded-[2rem] border-2 ${service.bg} ${service.border} space-y-4`}>
                                  <div className="flex items-center gap-3 mb-2">
                                      <service.icon className={service.color} size={24} />
                                      <h4 className={`text-lg font-black uppercase tracking-tight ${service.color}`}>{service.name}</h4>
                                  </div>
                                  <div className="space-y-3">
                                      {service.details.map((d, idx) => (
                                          <div key={idx}>
                                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{d.label}</span>
                                              <p className="text-xs font-bold text-slate-800">{d.value}</p>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}

                  {gkCategory === 'RANKS' && (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200">
                          <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-900 text-white">
                                  <tr>
                                      <th className="p-4 text-xs font-black uppercase tracking-widest">Indian Army</th>
                                      <th className="p-4 text-xs font-black uppercase tracking-widest">Indian Navy</th>
                                      <th className="p-4 text-xs font-black uppercase tracking-widest">Indian Air Force</th>
                                  </tr>
                              </thead>
                              <tbody className="text-sm font-medium text-slate-700">
                                  {RANKS_DATA.map((row, i) => (
                                      <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                          <td className="p-4 border-r border-slate-100">{row.army}</td>
                                          <td className="p-4 border-r border-slate-100">{row.navy}</td>
                                          <td className="p-4">{row.airforce}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}

                  {gkCategory === 'AWARDS' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {AWARDS_DATA.map((cat, i) => (
                              <div key={i} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 relative overflow-hidden">
                                  <Award className="absolute -right-4 -bottom-4 text-slate-200 w-24 h-24 rotate-12" />
                                  <div className="relative z-10">
                                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">{cat.type}</h4>
                                      <ul className="space-y-3">
                                          {cat.awards.map((award, idx) => (
                                              <li key={idx} className="flex items-center gap-3">
                                                  <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] font-black text-slate-900 shadow-sm">{idx + 1}</div>
                                                  <span className="text-xs font-bold text-slate-700">{award}</span>
                                              </li>
                                          ))}
                                      </ul>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}

                  {gkCategory === 'COMMANDS' && (
                      <div className="space-y-8">
                          {COMMANDS_DATA.map((svc, i) => (
                              <div key={i}>
                                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                                      {svc.service === 'Indian Army' && <Shield size={18} className="text-green-600" />}
                                      {svc.service === 'Indian Navy' && <Anchor size={18} className="text-blue-600" />}
                                      {svc.service === 'Indian Air Force' && <Plane size={18} className="text-sky-600" />}
                                      {svc.service}
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      {svc.commands.map((cmd, idx) => (
                                          <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-400 transition-colors shadow-sm">
                                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{cmd.name}</p>
                                              <p className="text-xs font-bold text-slate-800">{cmd.loc}</p>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )}

          {/* GD TOPICS SECTION */}
          {activeTab === 'GD' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-center space-y-2 mb-8">
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Trending GD Topics (2025-26)</h3>
                      <p className="text-slate-500 text-xs font-bold">Standard Group Discussion topics with leads as per SSB procedure.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {GD_TOPICS.map((topic, i) => (
                          <div key={i} className="flex flex-col gap-4 p-6 bg-white border border-slate-200 rounded-[2rem] hover:border-slate-400 transition-all shadow-sm hover:shadow-lg h-full">
                              <div className="flex justify-between items-start gap-4">
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 font-black text-sm shrink-0">
                                          {i + 1}
                                      </div>
                                      <h5 className="font-bold text-slate-900 text-sm leading-tight">{topic.title}</h5>
                                  </div>
                                  <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest shrink-0">{topic.category}</span>
                              </div>
                              
                              <p className="text-sm font-medium text-slate-700 leading-relaxed italic bg-slate-50 p-4 rounded-xl border border-slate-100">
                                  "{topic.description}"
                              </p>

                              <div className="mt-auto pt-4 border-t border-slate-100">
                                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Discuss the main reason / Impact:</p>
                                  <div className="space-y-2">
                                      {topic.leads.map((lead, idx) => (
                                          <div key={idx} className="flex items-center gap-3">
                                              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">{idx + 1}</div>
                                              <span className="text-xs font-bold text-slate-800">{lead}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* INTERVIEW QUESTIONS SECTION */}
          {activeTab === 'INTERVIEW' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-6">
                      <div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">IO Interview Questions</h3>
                          <p className="text-slate-500 text-xs font-bold mt-2">Standard questions asked by the Interviewing Officer.</p>
                      </div>
                      <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hidden md:block">
                          Based on PIQ
                      </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                      {INTERVIEW_QUESTIONS.map((section, i) => (
                          <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                              <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-3">
                                  <div className="p-2 bg-white rounded-lg text-slate-700 shadow-sm">
                                      <HelpCircle size={16} />
                                  </div>
                                  <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">{section.category}</h4>
                              </div>
                              <div className="p-4 bg-white space-y-3">
                                  {section.questions.map((q, idx) => (
                                      <div key={idx} className="flex gap-3 items-start">
                                          <span className="text-slate-300 font-black text-xs mt-0.5">{idx + 1}.</span>
                                          <p className="text-sm font-medium text-slate-700">{q}</p>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* BLOG SECTION */}
          {activeTab === 'BLOG' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-center space-y-2 mb-8">
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Daily Defense Brief</h3>
                      <p className="text-slate-500 text-xs font-bold">Auto-generated intelligence report for SSB aspirants.</p>
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{new Date().toDateString()}</p>
                  </div>

                  {blogLoading ? (
                      <div className="flex flex-col items-center justify-center py-20">
                          <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
                          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Compiling Report...</p>
                      </div>
                  ) : blogContent.length === 0 ? (
                      <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-100">
                          <p className="text-slate-400 font-bold">No intelligence data available at this moment.</p>
                          <button onClick={fetchBlogData} className="mt-4 text-blue-600 text-xs font-black uppercase tracking-widest hover:underline">Retry Fetch</button>
                      </div>
                  ) : (
                      <div className="space-y-12">
                          {blogContent.map((news, i) => (
                              <article key={i} className="flex flex-col md:flex-row gap-8 border-b border-slate-100 pb-12 last:border-0">
                                  <div className="md:w-1/4 shrink-0">
                                      <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-3 ${news.tag.includes('Defense') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                          {news.tag}
                                      </span>
                                      <h4 className="text-xl font-black text-slate-900 leading-tight">{news.headline}</h4>
                                  </div>
                                  <div className="md:w-3/4 space-y-4">
                                      <p className="text-slate-600 font-medium leading-relaxed">{news.summary}</p>
                                      <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-blue-500">
                                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">SSB Relevance</p>
                                          <p className="text-xs font-bold text-blue-900 italic">"{news.relevance}"</p>
                                      </div>
                                  </div>
                              </article>
                          ))}
                      </div>
                  )}
              </div>
          )}

      </div>
    </div>
  );
};

export default ResourceCenter;
