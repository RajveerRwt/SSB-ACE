
import React, { useState, useEffect } from 'react';
import { TestType } from '../types';
import { generateTATStimulus, generateTestContent, evaluatePerformance } from '../services/geminiService';
import { Loader2, Timer, ArrowRight, CheckCircle, Image as ImageIcon } from 'lucide-react';

interface PsychologyTestProps {
  type: TestType;
  onSave: (result: any) => void;
  isAdmin?: boolean;
  userId?: string;
  isGuest?: boolean;
  onLoginRedirect?: () => void;
}

const PsychologyTest: React.FC<PsychologyTestProps> = ({ type, onSave, isAdmin, userId, isGuest, onLoginRedirect }) => {
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [responses, setResponses] = useState<any>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadContent();
  }, [type]);

  useEffect(() => {
    let interval: any;
    if (timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && items.length > 0 && !isSubmitting) {
        handleNext();
    }
    return () => clearInterval(interval);
  }, [timeLeft, items, isSubmitting]);

  const loadContent = async () => {
      setLoading(true);
      try {
          if (type === TestType.TAT) {
              const content = await generateTestContent('TAT'); 
              setItems(content.items);
              setTimeLeft(30); 
          } else if (type === TestType.WAT) {
              const content = await generateTestContent('WAT');
              setItems(content.items);
              setTimeLeft(15);
          } else if (type === TestType.SRT) {
              const content = await generateTestContent('SRT');
              setItems(content.items);
              setTimeLeft(30 * 60); 
          } else if (type === TestType.SDT) {
              setItems([{id: 'sdt', content: 'Self Description'}]);
              setTimeLeft(15 * 60);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleNext = () => {
      if (activeItemIndex < items.length - 1) {
          setActiveItemIndex(prev => prev + 1);
          if (type === TestType.WAT) setTimeLeft(15);
          if (type === TestType.TAT) setTimeLeft(240); 
      } else {
          handleSubmit();
      }
  };

  const handleSubmit = async () => {
      setIsSubmitting(true);
      try {
          const payload = {
              testType: type,
              responses,
          };
          const result = await evaluatePerformance(type.toString(), payload);
          onSave(result);
      } catch (e) {
          console.error(e);
      } finally {
          setIsSubmitting(false);
      }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">
        <div className="bg-slate-50 p-8 rounded-[2rem] mb-12 text-left border border-slate-200">
           <h4 className="font-black text-xs uppercase tracking-widest text-blue-600 mb-4 underline">Board Briefing:</h4>
           <div className="text-slate-600 font-medium text-sm md:text-lg leading-relaxed italic space-y-4">
             {type === TestType.TAT ? (
               <>
                 <p>• 12 Pictures (11 from DB + 1 Blank). 30s viewing, 4m writing per slide.</p>
                 <p>• <strong>Input Mode:</strong> You can type your stories manually OR write on paper and <strong>upload photos of all 12 stories</strong> at the end.</p>
                 <p>• <strong>Result:</strong> Get a full detailed AI assessment including OLQs and feedback immediately after submission.</p>
               </>
             ) : type === TestType.SDT ? (
               <p>• Write 5 distinct paragraphs describing opinions of Parents, Teachers, Friends, Self, and Future Aims. Total time: 15 Minutes. Be realistic and honest.</p>
             ) : type === TestType.SRT ? (
               <p>• 60 Situations (30 Minutes). Respond to each situation naturally. <br/>• <strong>Note:</strong> You can type responses in the boxes below OR write on paper and upload a photo at the end.</p>
             ) : (
               <p>• 60 Words (15s each). Write the first thought that comes to mind. <br/>• <strong>Note:</strong> You can type responses in real-time OR write on paper and upload a photo at the end.</p>
             )}
           </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xl text-slate-900">{type} - Item {activeItemIndex + 1}/{items.length}</h3>
                <div className="font-mono text-xl font-bold text-blue-600">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
            </div>

            <div className="min-h-[200px] flex flex-col items-center justify-center text-center space-y-6">
                {type === TestType.TAT && (
                    <div className="w-full h-64 bg-slate-100 rounded-2xl flex items-center justify-center">
                       <ImageIcon size={48} className="text-slate-300"/>
                       <p className="text-slate-400 font-bold ml-2">Image {activeItemIndex+1}</p>
                    </div>
                )}
                <p className="text-2xl font-black text-slate-800">
                    {items[activeItemIndex]?.content}
                </p>
                
                <textarea 
                    className="w-full h-32 p-4 border border-slate-200 rounded-xl resize-none outline-none focus:border-blue-500"
                    placeholder="Type response here..."
                    value={responses[activeItemIndex] || ''}
                    onChange={(e) => setResponses({...responses, [activeItemIndex]: e.target.value})}
                />
            </div>

            <div className="mt-8 flex justify-end">
                <button 
                    onClick={handleNext}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2"
                >
                    {activeItemIndex < items.length - 1 ? 'Next' : 'Finish'} <ArrowRight size={16} />
                </button>
            </div>
        </div>
    </div>
  );
};

export default PsychologyTest;
