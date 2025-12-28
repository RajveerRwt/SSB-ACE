
import React, { useState, useEffect, useRef } from 'react';
import { Timer, AlertCircle, Send } from 'lucide-react';
import { generateTestContent, evaluatePerformance } from '../services/geminiService';
import { TestType } from '../types';

interface PsychologyProps {
  type: TestType;
}

const PsychologyTest: React.FC<PsychologyProps> = ({ type }) => {
  const [items, setItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentResponse, setCurrentResponse] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);

  // Use ReturnType<typeof setTimeout> to avoid NodeJS namespace dependency in browser environments
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTest = async () => {
    setIsLoading(true);
    try {
      const data = await generateTestContent(type);
      setItems(data.items);
      setCurrentIndex(0);
      resetTimer();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const resetTimer = () => {
    // WAT: 15s per word, SRT: 30s per situation, TAT: 4m per story
    const times = { [TestType.WAT]: 15, [TestType.SRT]: 30, [TestType.TAT]: 240 };
    setTimeLeft(times[type as keyof typeof times] || 30);
  };

  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < items.length) {
      if (timeLeft > 0) {
        timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      } else {
        nextItem();
      }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, currentIndex]);

  const nextItem = () => {
    if (currentIndex >= 0) {
      setResponses(prev => ({ ...prev, [items[currentIndex].id]: currentResponse }));
      setCurrentResponse('');
      
      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
        resetTimer();
      } else {
        finishTest();
      }
    }
  };

  const finishTest = async () => {
    setCurrentIndex(items.length);
    setIsLoading(true);
    try {
      const results = await evaluatePerformance(type, responses);
      setFeedback(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (currentIndex === -1) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-sm border text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-4">{type} Test</h2>
        <p className="text-slate-500 mb-8">
          {type === TestType.WAT && "Word Association Test: 10 words, 15 seconds each. Write the first thought that comes to mind."}
          {type === TestType.SRT && "Situation Reaction Test: 5 realistic situations, 30 seconds each. How would you react?"}
          {type === TestType.TAT && "Thematic Apperception Test: Write stories based on the scenarios presented."}
        </p>
        <button 
          onClick={startTest} 
          disabled={isLoading}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          {isLoading ? "Generating Content..." : "Start Practice"}
        </button>
      </div>
    );
  }

  if (currentIndex < items.length) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-2">
            {items.map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${i === currentIndex ? 'bg-blue-600' : i < currentIndex ? 'bg-green-500' : 'bg-slate-200'}`} />
            ))}
          </div>
          <div className={`px-4 py-2 rounded-full font-mono font-bold flex items-center gap-2 ${timeLeft < 5 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
            <Timer className="w-5 h-5" /> {timeLeft}s
          </div>
        </div>

        <div className="bg-slate-50 p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center mb-8">
          {type === TestType.TAT && <img src={`https://picsum.photos/seed/${items[currentIndex].id}/800/400?grayscale`} className="mx-auto rounded-xl mb-6 shadow-lg" />}
          <h3 className="text-4xl font-bold text-slate-800">{items[currentIndex].content}</h3>
        </div>

        <div className="relative">
          <textarea
            autoFocus
            value={currentResponse}
            onChange={(e) => setCurrentResponse(e.target.value)}
            className="w-full h-40 p-6 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none text-xl shadow-sm"
            placeholder="Type your response here..."
          />
          <button 
            onClick={nextItem}
            className="absolute bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-black"
          >
            Next <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
       {isLoading ? (
         <div className="text-center py-20">
           <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
           <p className="font-medium text-slate-600">Calculating your Psychology Profile...</p>
         </div>
       ) : (
         <div className="space-y-6">
            <div className="bg-green-600 text-white p-8 rounded-2xl">
              <h2 className="text-2xl font-bold mb-2">Psychological Evaluation</h2>
              <p className="opacity-80">Based on your responses for {type}, here is your OLQ analysis.</p>
              <div className="mt-8 text-6xl font-black">{feedback?.score}/10</div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-4">Positive Projected Traits</h4>
                  <div className="flex flex-wrap gap-2">
                    {feedback?.strengths.map((s: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full border border-green-100">{s}</span>
                    ))}
                  </div>
               </div>
               <div className="bg-white p-6 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-4">Cognitive Gaps Identified</h4>
                  <div className="flex flex-wrap gap-2">
                    {feedback?.weaknesses.map((w: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-red-50 text-red-700 text-sm font-medium rounded-full border border-red-100">{w}</span>
                    ))}
                  </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200">
               <h4 className="font-bold text-slate-800 mb-4">Psychologist's Note</h4>
               <p className="text-slate-600 leading-relaxed italic">"{feedback?.recommendations}"</p>
            </div>

            <button onClick={() => setCurrentIndex(-1)} className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Return to Practice Dashboard</button>
         </div>
       )}
    </div>
  );
};

export default PsychologyTest;
