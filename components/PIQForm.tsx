
import React, { useState, useRef } from 'react';
import { Shield, Upload, Save, User, MapPin, BookOpen, Users, Trophy, History, Loader2, CheckCircle, AlertCircle, Info, Plus, Trash2 } from 'lucide-react';
import { extractPIQFromImage } from '../services/geminiService';
import { PIQData } from '../types';

const INITIAL_PIQ: PIQData = {
  selectionBoard: '',
  batchNo: '',
  chestNo: '',
  rollNo: '',
  name: '',
  fatherName: '',
  residence: { max: '', present: '', permanent: '' },
  details: { religion: '', category: '', motherTongue: '', dob: '', maritalStatus: 'Single' },
  family: [
    { relation: 'Father', education: '', occupation: '', income: '' },
    { relation: 'Mother', education: '', occupation: '', income: '' }
  ],
  education: [
    { qualification: 'Matric / Hr. Sec', institution: '', board: '', year: '', marks: '', medium: '', status: '', achievement: '' },
    { qualification: '10+2 / Equivalent', institution: '', board: '', year: '', marks: '', medium: '', status: '', achievement: '' },
    { qualification: 'Graduation', institution: '', board: '', year: '', marks: '', medium: '', status: '', achievement: '' }
  ],
  activities: { ncc: '', games: '', hobbies: '', extraCurricular: '', responsibilities: '' },
  previousAttempts: []
};

// Moved outside to prevent focus loss on re-render
const InputField = ({ label, value, onChange, placeholder = "" }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</label>
    <input 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none transition-all" 
      placeholder={placeholder}
    />
  </div>
);

const PIQForm: React.FC<{ onSave: (data: PIQData) => void, initialData?: PIQData }> = ({ onSave, initialData }) => {
  const [data, setData] = useState<PIQData>(initialData || INITIAL_PIQ);
  const [step, setStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    { label: 'Board Info', icon: Shield },
    { label: 'Personal', icon: User },
    { label: 'Residence', icon: MapPin },
    { label: 'Family', icon: Users },
    { label: 'Education', icon: BookOpen },
    { label: 'Activities', icon: Trophy },
    { label: 'SSB History', icon: History }
  ];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const extracted = await extractPIQFromImage(base64, file.type);
        setData({ ...data, ...extracted });
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const addFamilyMember = () => {
    setData({ ...data, family: [...data.family, { relation: '', education: '', occupation: '', income: '' }] });
  };

  const removeFamilyMember = (index: number) => {
    setData({ ...data, family: data.family.filter((_, i) => i !== index) });
  };

  const addAttempt = () => {
    setData({ ...data, previousAttempts: [...data.previousAttempts, { entry: '', ssb: '', date: '', result: '' }] });
  };

  const removeAttempt = (index: number) => {
    setData({ ...data, previousAttempts: data.previousAttempts.filter((_, i) => i !== index) });
  };

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="grid grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <InputField label="Selection Board (No. & Place)" value={data.selectionBoard} onChange={(v: string) => setData({...data, selectionBoard: v})} placeholder="e.g. 1 AFSB Dehradun" />
          <InputField label="Batch Number" value={data.batchNo} onChange={(v: string) => setData({...data, batchNo: v})} placeholder="e.g. M-NDA/123" />
          <InputField label="Chest Number" value={data.chestNo} onChange={(v: string) => setData({...data, chestNo: v})} />
          <InputField label="UPSC / Other Roll No." value={data.rollNo} onChange={(v: string) => setData({...data, rollNo: v})} />
        </div>
      );
      case 1: return (
        <div className="grid grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4">
          <div className="col-span-2">
            <InputField label="Name in CAPITALS (As in Matriculation)" value={data.name} onChange={(v: string) => setData({...data, name: v.toUpperCase()})} />
          </div>
          <div className="col-span-2">
            <InputField label="Father's Name" value={data.fatherName} onChange={(v: string) => setData({...data, fatherName: v.toUpperCase()})} />
          </div>
          <InputField label="Date of Birth" value={data.details.dob} onChange={(v: string) => setData({...data, details: {...data.details, dob: v}})} placeholder="DD/MM/YYYY" />
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Marital Status</label>
            <select 
              value={data.details.maritalStatus} 
              onChange={e => setData({...data, details: {...data.details, maritalStatus: e.target.value}})}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800"
            >
              <option>Single</option>
              <option>Married</option>
              <option>Widower</option>
            </select>
          </div>
          <InputField label="Religion" value={data.details.religion} onChange={(v: string) => setData({...data, details: {...data.details, religion: v}})} />
          <InputField label="Mother Tongue" value={data.details.motherTongue} onChange={(v: string) => setData({...data, details: {...data.details, motherTongue: v}})} />
          <div className="space-y-2 col-span-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Category (SC / ST / OBC)</label>
            <input 
              value={data.details.category} 
              onChange={e => setData({...data, details: {...data.details, category: e.target.value}})}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
              placeholder="Leave blank if General"
            />
          </div>
        </div>
      );
      case 2: return (
        <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-right-4">
          <InputField label="Place of Maximum Residence (Place, Dist, State, Pop.)" value={data.residence.max} onChange={(v: string) => setData({...data, residence: {...data.residence, max: v}})} />
          <InputField label="Place of Present Residence (Place, Dist, State, Pop.)" value={data.residence.present} onChange={(v: string) => setData({...data, residence: {...data.residence, present: v}})} />
          <InputField label="Place of Permanent Residence (Place, Dist, State, Pop.)" value={data.residence.permanent} onChange={(v: string) => setData({...data, residence: {...data.residence, permanent: v}})} />
          <p className="text-[10px] text-slate-400 font-bold uppercase italic">* Mention if District HQ or not in the residence description.</p>
        </div>
      );
      case 3: return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-black uppercase text-slate-600 tracking-widest">Parents' / Guardians' & Siblings' Particulars</h4>
            <button onClick={addFamilyMember} className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase hover:underline">
              <Plus size={14} /> Add Sibling/Guardian
            </button>
          </div>
          <div className="space-y-4">
            {data.family.map((member, i) => (
              <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 grid grid-cols-4 gap-4 relative group">
                {i > 1 && (
                  <button onClick={() => removeFamilyMember(i)} className="absolute -top-2 -right-2 p-2 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={12} />
                  </button>
                )}
                <InputField label="Relation" value={member.relation} onChange={(v: string) => {
                  const newList = [...data.family]; newList[i].relation = v; setData({...data, family: newList});
                }} />
                <InputField label="Education" value={member.education} onChange={(v: string) => {
                  const newList = [...data.family]; newList[i].education = v; setData({...data, family: newList});
                }} />
                <InputField label="Occupation" value={member.occupation} onChange={(v: string) => {
                  const newList = [...data.family]; newList[i].occupation = v; setData({...data, family: newList});
                }} />
                <InputField label="Income (pm)" value={member.income} onChange={(v: string) => {
                  const newList = [...data.family]; newList[i].income = v; setData({...data, family: newList});
                }} />
              </div>
            ))}
          </div>
        </div>
      );
      case 4: return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
          <h4 className="text-sm font-black uppercase text-slate-600 tracking-widest">Educational Record (Commencing from Matric)</h4>
          <div className="space-y-6">
            {data.education.map((edu, i) => (
              <div key={i} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <InputField label="Qualification" value={edu.qualification} onChange={(v: string) => {
                      const newList = [...data.education]; newList[i].qualification = v; setData({...data, education: newList});
                    }} />
                  </div>
                  <InputField label="Full Name of Institution" value={edu.institution} onChange={(v: string) => {
                    const newList = [...data.education]; newList[i].institution = v; setData({...data, education: newList});
                  }} />
                  <InputField label="Board / University" value={edu.board} onChange={(v: string) => {
                    const newList = [...data.education]; newList[i].board = v; setData({...data, education: newList});
                  }} />
                  <InputField label="Year" value={edu.year} onChange={(v: string) => {
                    const newList = [...data.education]; newList[i].year = v; setData({...data, education: newList});
                  }} />
                  <InputField label="Marks % & Div." value={edu.marks} onChange={(v: string) => {
                    const newList = [...data.education]; newList[i].marks = v; setData({...data, education: newList});
                  }} />
                  <InputField label="Medium of Instruction" value={edu.medium} onChange={(v: string) => {
                    const newList = [...data.education]; newList[i].medium = v; setData({...data, education: newList});
                  }} />
                  <InputField label="Boarder / Day Scholar" value={edu.status} onChange={(v: string) => {
                    const newList = [...data.education]; newList[i].status = v; setData({...data, education: newList});
                  }} />
                </div>
                <InputField label="Outstanding Achievements, if any" value={edu.achievement} onChange={(v: string) => {
                    const newList = [...data.education]; newList[i].achievement = v; setData({...data, education: newList});
                }} />
              </div>
            ))}
          </div>
        </div>
      );
      case 5: return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">NCC Training (Total Training, Wing, Div, Cert.)</label>
              <textarea value={data.activities.ncc} onChange={e=>setData({...data, activities: {...data.activities, ncc: e.target.value}})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold h-24" placeholder="e.g. 2 years, Army Wing, Div I, 'C' Certificate"/>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Games / Sports (Period, Representation, Achievement)</label>
              <textarea value={data.activities.games} onChange={e=>setData({...data, activities: {...data.activities, games: e.target.value}})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold h-24" placeholder="Cricket - School Team Captain - Won Zonal..."/>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Hobbies & Interests</label>
              <textarea value={data.activities.hobbies} onChange={e=>setData({...data, activities: {...data.activities, hobbies: e.target.value}})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold h-24" placeholder="Philately, Trekking, Blogging..."/>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Extra-Curricular Activities (Duration, Achievement)</label>
              <textarea value={data.activities.extraCurricular} onChange={e=>setData({...data, activities: {...data.activities, extraCurricular: e.target.value}})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold h-24" placeholder="Debating - 4 years - State Level Winner..."/>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Position of Responsibilities held in NCC/Scouting/Sports/Extra-Curricular</label>
              <textarea value={data.activities.responsibilities} onChange={e=>setData({...data, activities: {...data.activities, responsibilities: e.target.value}})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold h-24" placeholder="School Captain, NCC Under Officer..."/>
            </div>
          </div>
        </div>
      );
      case 6: return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-black uppercase text-slate-600 tracking-widest">Details of Previous Interviews (Army / Navy / Air Force)</h4>
            <button onClick={addAttempt} className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase hover:underline">
              <Plus size={14} /> Add Previous SSB
            </button>
          </div>
          {data.previousAttempts.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs tracking-widest">
              Fresh Candidate - No Previous Attempts
            </div>
          ) : (
            <div className="space-y-4">
              {data.previousAttempts.map((attempt, i) => (
                <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 grid grid-cols-4 gap-4 relative group">
                  <button onClick={() => removeAttempt(i)} className="absolute -top-2 -right-2 p-2 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={12} />
                  </button>
                  <InputField label="Type of Entry" value={attempt.entry} onChange={(v: string) => {
                    const newList = [...data.previousAttempts]; newList[i].entry = v; setData({...data, previousAttempts: newList});
                  }} />
                  <InputField label="SSB No. & Place" value={attempt.ssb} onChange={(v: string) => {
                    const newList = [...data.previousAttempts]; newList[i].ssb = v; setData({...data, previousAttempts: newList});
                  }} />
                  <InputField label="Date" value={attempt.date} onChange={(v: string) => {
                    const newList = [...data.previousAttempts]; newList[i].date = v; setData({...data, previousAttempts: newList});
                  }} />
                  <InputField label="Result (S/O, C/O, Rec)" value={attempt.result} onChange={(v: string) => {
                    const newList = [...data.previousAttempts]; newList[i].result = v; setData({...data, previousAttempts: newList});
                  }} />
                </div>
              ))}
            </div>
          )}
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 blur-[100px] rounded-full" />
        <div className="flex flex-col md:flex-row justify-between items-center relative z-10 gap-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-black uppercase tracking-tighter">PIQ Manual Entry</h2>
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">DIPR Official Form 107-A • Comprehensive Dossier</p>
          </div>
          <div className="flex gap-4">
            <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*"/>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all backdrop-blur-xl border border-white/5"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
              AI OCR Assist
            </button>
            <button 
              onClick={() => onSave(data)}
              className="px-8 py-4 bg-yellow-400 text-black rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl hover:-translate-y-1 transition-all"
            >
              <Save size={18} /> Finalize PIQ
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {steps.map((s, i) => (
          <button 
            key={i} 
            onClick={() => setStep(i)}
            className={`flex items-center gap-4 px-8 py-5 rounded-3xl border-2 transition-all shrink-0 font-black uppercase text-[10px] tracking-widest ${step === i ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
          >
            <s.icon size={16} /> {s.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-12 md:p-16 rounded-[4rem] shadow-2xl border border-slate-100 relative">
        {isProcessing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-md z-50 flex flex-col items-center justify-center rounded-[4rem]">
             <div className="w-20 h-20 border-8 border-slate-100 border-t-slate-900 rounded-full animate-spin mb-8" />
             <p className="text-slate-900 font-black uppercase tracking-[0.5em] text-xs">AI Extraction in Progress...</p>
          </div>
        )}
        <div className="max-w-4xl mx-auto">
          {renderStep()}
          
          <div className="mt-16 pt-10 border-t flex justify-between">
            <button disabled={step === 0} onClick={() => setStep(step - 1)} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 disabled:opacity-30">Previous</button>
            <button disabled={step === steps.length - 1} onClick={() => setStep(step + 1)} className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black">Next Section</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-10 bg-blue-50 rounded-[3rem] border border-blue-100">
           <Info className="text-blue-600 mb-6" size={32} />
           <h4 className="text-slate-800 font-black uppercase text-xs tracking-widest mb-4">Board Guidance</h4>
           <p className="text-slate-600 text-xs leading-relaxed font-medium">The PIQ is your first impression. Every detail matters. The IO will probe into gaps or achievements mentioned here.</p>
        </div>
        <div className="p-10 bg-green-50 rounded-[3rem] border border-green-100">
           <CheckCircle className="text-green-600 mb-6" size={32} />
           <h4 className="text-slate-800 font-black uppercase text-xs tracking-widest mb-4">Accuracy</h4>
           <p className="text-slate-600 text-xs leading-relaxed font-medium">Ensure names and dates match your certificates. Consistency is key for social adaptability and integrity OLQs.</p>
        </div>
        <div className="p-10 bg-red-50 rounded-[3rem] border border-red-100">
           <AlertCircle className="text-red-600 mb-6" size={32} />
           <h4 className="text-slate-800 font-black uppercase text-xs tracking-widest mb-4">Self Disclosure</h4>
           <p className="text-slate-600 text-xs leading-relaxed font-medium">Do not hide previous SSB attempts. The database is centralized; honesty is the most valued dynamic trait.</p>
        </div>
      </div>
    </div>
  );
};

export default PIQForm;
