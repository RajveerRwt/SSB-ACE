
import React, { useState, useEffect } from 'react';
import { 
  Award, CheckCircle, Loader2, Send, 
  User, Mail, BookOpen, PenTool, AlertCircle,
  ShieldCheck, Star, Users, Target
} from 'lucide-react';
import { requestMentorApproval, getMentorProfile } from '../services/supabaseService';

interface MentorRegistrationProps {
  userId: string;
  userEmail: string;
  userName: string;
  onSuccess: () => void;
}

const MentorRegistration: React.FC<MentorRegistrationProps> = ({ userId, userEmail, userName, onSuccess }) => {
  const [fullName, setFullName] = useState(userName || '');
  const [email, setEmail] = useState(userEmail || '');
  const [bio, setBio] = useState('');
  const [specialization, setSpecialization] = useState('Psychology');
  const [loading, setLoading] = useState(false);
  const [existingMentor, setExistingMentor] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const profile = await getMentorProfile(userId);
      if (profile) {
        setExistingMentor(profile);
        setSubmitted(true);
      }
    };
    checkStatus();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !bio || !specialization) return;
    
    setLoading(true);
    try {
      await requestMentorApproval(userId, fullName, email, bio, specialization);
      setSubmitted(true);
      onSuccess();
    } catch (error) {
      console.error("Error requesting mentor approval:", error);
      alert("Error submitting request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-[3rem] p-12 border border-slate-100 shadow-xl text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
          {existingMentor?.status === 'APPROVED' ? <ShieldCheck size={48} /> : <Loader2 size={48} className="animate-spin" />}
        </div>
        
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">
            {existingMentor?.status === 'APPROVED' ? "Command Granted" : 
             existingMentor?.status === 'REJECTED' ? "Application Rejected" : "Application Under Review"}
          </h2>
          <p className="text-slate-500 font-medium italic">
            {existingMentor?.status === 'APPROVED' 
              ? "Your mentor status is active. You can now manage batches and students." 
              : existingMentor?.status === 'REJECTED'
              ? "Your application was not approved at this time. Please contact support for details."
              : "Our HQ is reviewing your credentials. You will be notified once approved."}
          </p>
        </div>

        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 text-left space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm text-slate-400">
              <User size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</p>
              <p className="text-sm font-bold text-slate-800">{existingMentor?.full_name || fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm text-slate-400">
              <Target size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Specialization</p>
              <p className="text-sm font-bold text-slate-800">{existingMentor?.specialization || specialization}</p>
            </div>
          </div>
        </div>

        {existingMentor?.status === 'APPROVED' && (
          <button 
            onClick={onSuccess}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
          >
            Enter Command Center <CheckCircle size={18} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center animate-in fade-in duration-700">
      {/* Left: Info */}
      <div className="space-y-8">
        <div>
          <span className="px-4 py-1.5 bg-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">Recruitment Open</span>
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mt-4 leading-none">Become an SSB Mentor</h2>
          <p className="text-slate-500 mt-4 font-medium italic leading-relaxed">Join our elite network of officers and psychologists to guide the next generation of leaders.</p>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <Users size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Manage Batches</h4>
              <p className="text-xs text-slate-500 font-medium">Create private groups for your students and track their progress collectively.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <PenTool size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Assign Assessments</h4>
              <p className="text-xs text-slate-500 font-medium">Schedule tests from our database or use your custom sets for evaluation.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <Star size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Direct Feedback</h4>
              <p className="text-xs text-slate-500 font-medium">Review student responses and provide manual remarks and scores.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
        
        <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <User size={10} /> Full Name
              </label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800 text-sm"
                placeholder="Major Rajveer"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Target size={10} /> Specialization
              </label>
              <select 
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800 text-sm"
              >
                <option value="Psychology">Psychology</option>
                <option value="Interview">Interview (IO)</option>
                <option value="GTO">GTO</option>
                <option value="Screening">Screening</option>
                <option value="General">General Guidance</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Mail size={10} /> Official Email
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800 text-sm"
              placeholder="mentor@ssbzone.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <BookOpen size={10} /> Professional Bio
            </label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800 text-sm h-32 resize-none"
              placeholder="Briefly describe your experience and credentials..."
            />
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={16} />
            <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
              By applying, you agree to our Mentor Code of Conduct. Your profile will be visible to students once approved by the HQ.
            </p>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><Send size={18} /> Submit Application</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MentorRegistration;
