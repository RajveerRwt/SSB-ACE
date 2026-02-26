
import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, CheckCircle, AlertTriangle, ChevronRight, ChevronLeft, 
  Play, Lock, Coins, Loader2, Trophy, ShieldCheck, ShieldAlert, 
  Brain, Image as ImageIcon, MessageSquare, Info, X, Target,
  Star, Award, AlertCircle, ArrowRight, PenTool, Volume2
} from 'lucide-react';
import { 
  getOIRSets, getOIRQuestions, getPPDTScenarios, 
  saveTestAttempt, TEST_RATES, checkAuthSession 
} from '../services/supabaseService';
import { evaluatePerformance } from '../services/geminiService';

interface ScreeningTestProps {
  onConsumeCoins: (cost: number) => Promise<boolean>;
  userId: string;
  isGuest?: boolean;
  onLoginRedirect?: () => void;
  onExit: () => void;
}

enum ScreeningStep {
  LOBBY,
  OIR_1_INSTRUCTIONS,
  OIR_1_TEST,
  OIR_2_INSTRUCTIONS,
  OIR_2_TEST,
  PPDT_INSTRUCTIONS,
  PPDT_IMAGE,
  PPDT_STORY,
  PPDT_NARRATION,
  EVALUATING,
  RESULT
}

const ScreeningTest: React.FC<ScreeningTestProps> = ({ onConsumeCoins, userId, isGuest = false, onLoginRedirect, onExit }) => {
  const [step, setStep] = useState<ScreeningStep>(ScreeningStep.LOBBY);
  const [isLoading, setIsLoading] = useState(true);
  const [availableSets, setAvailableSets] = useState<any[]>([]);
  const [selectedSet, setSelectedSet] = useState<any>(null);
  
  // Test Data
  const [oir1Questions, setOir1Questions] = useState<any[]>([]);
  const [oir2Questions, setOir2Questions] = useState<any[]>([]);
  const [ppdtScenario, setPpdtScenario] = useState<any>(null);
  
  // User Progress
  const [oir1Answers, setOir1Answers] = useState<number[]>([]);
  const [oir2Answers, setOir2Answers] = useState<number[]>([]);
  const [ppdtStory, setPpdtStory] = useState('');
  const [ppdtNarration, setPpdtNarration] = useState('');
  
  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const timerRef = useRef<any>(null);
  
  // Results
  const [results, setResults] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    loadScreeningData();
  }, []);

  const loadScreeningData = async () => {
    setIsLoading(true);
    try {
      const [oirSets, ppdtScenarios] = await Promise.all([
        getOIRSets(),
        getPPDTScenarios()
      ]);
      
      // Group them into "Screening Tests"
      // For now, we'll look for sets that contain "Screening" in title
      // If none found, we'll just create some virtual ones from available data
      const screeningOirSets = oirSets.filter(s => s.title.toLowerCase().includes('screening'));
      const screeningPpdt = ppdtScenarios.filter(s => s.description?.toLowerCase().includes('screening'));
      
      const tests = [];
      // If admin has uploaded specific sets, use them
      if (screeningOirSets.length >= 2 && screeningPpdt.length >= 1) {
          // Simple heuristic: group by number if present
          for (let i = 1; i <= 5; i++) {
              const o1 = screeningOirSets.find(s => s.title.includes(i.toString()));
              const o2 = screeningOirSets.find(s => s.title.includes(i.toString()) && s.id !== o1?.id);
              const p = screeningPpdt.find(s => s.description?.includes(i.toString()));
              
              if (o1 && o2 && p) {
                  tests.push({
                      id: `screening-${i}`,
                      title: `Screening TEST ${i}`,
                      oir1: o1,
                      oir2: o2,
                      ppdt: p
                  });
              }
          }
      }
      
      // Fallback: If no specific screening sets, create virtual ones from first few available
      if (tests.length === 0 && oirSets.length >= 2 && ppdtScenarios.length >= 1) {
          for (let i = 0; i < Math.min(5, Math.floor(oirSets.length / 2)); i++) {
              tests.push({
                  id: `virtual-screening-${i+1}`,
                  title: `Screening TEST ${i+1}`,
                  oir1: oirSets[i*2],
                  oir2: oirSets[i*2 + 1],
                  ppdt: ppdtScenarios[i % ppdtScenarios.length]
              });
          }
      }
      
      setAvailableSets(tests);
    } catch (e) {
      console.error("Failed to load screening data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const startScreening = async (test: any) => {
    if (isGuest) {
      onLoginRedirect?.();
      return;
    }

    const success = await onConsumeCoins(TEST_RATES.SCREENING_TEST);
    if (!success) return;

    setSelectedSet(test);
    setIsLoading(true);
    try {
      const [q1, q2] = await Promise.all([
        getOIRQuestions(test.oir1.id),
        getOIRQuestions(test.oir2.id)
      ]);
      setOir1Questions(q1);
      setOir2Questions(q2);
      setPpdtScenario(test.ppdt);
      setOir1Answers(new Array(q1.length).fill(-1));
      setOir2Answers(new Array(q2.length).fill(-1));
      setStep(ScreeningStep.OIR_1_INSTRUCTIONS);
    } catch (e) {
      alert("Failed to load test content.");
    } finally {
      setIsLoading(false);
    }
  };

  // Timer Logic
  useEffect(() => {
    if (timeLeft > 0 && [ScreeningStep.OIR_1_TEST, ScreeningStep.OIR_2_TEST, ScreeningStep.PPDT_IMAGE, ScreeningStep.PPDT_STORY, ScreeningStep.PPDT_NARRATION].includes(step)) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      handleTimeUp();
    }
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, step]);

  const handleTimeUp = () => {
    if (step === ScreeningStep.OIR_1_TEST) {
      setStep(ScreeningStep.OIR_2_INSTRUCTIONS);
    } else if (step === ScreeningStep.OIR_2_TEST) {
      setStep(ScreeningStep.PPDT_INSTRUCTIONS);
    } else if (step === ScreeningStep.PPDT_IMAGE) {
      setStep(ScreeningStep.PPDT_STORY);
      setTimeLeft(240); // 4 mins for story
    } else if (step === ScreeningStep.PPDT_STORY) {
      setStep(ScreeningStep.PPDT_NARRATION);
      setTimeLeft(60); // 1 min for narration
    } else if (step === ScreeningStep.PPDT_NARRATION) {
      stopNarration();
      evaluateFinalScreening();
    }
  };

  const startOir1 = () => {
    setStep(ScreeningStep.OIR_1_TEST);
    setTimeLeft(selectedSet.oir1.time_limit_seconds);
    setCurrentQIndex(0);
  };

  const startOir2 = () => {
    setStep(ScreeningStep.OIR_2_TEST);
    setTimeLeft(selectedSet.oir2.time_limit_seconds);
    setCurrentQIndex(0);
  };

  const startPpdt = () => {
    setStep(ScreeningStep.PPDT_IMAGE);
    setTimeLeft(30); // 30s for image
  };

  const startNarration = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) setPpdtNarration(prev => prev + (prev ? " " : "") + finalTranscript);
    };
    recognition.start();
    setIsRecording(true);
  };

  const stopNarration = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const evaluateFinalScreening = async () => {
    setStep(ScreeningStep.EVALUATING);
    setIsLoading(true);
    try {
      // 1. Calculate OIR Scores
      const oir1Correct = oir1Questions.filter((q, i) => oir1Answers[i] === q.correct_index).length;
      const oir2Correct = oir2Questions.filter((q, i) => oir2Answers[i] === q.correct_index).length;
      
      const oir1Perc = (oir1Correct / oir1Questions.length) * 100;
      const oir2Perc = (oir2Correct / oir2Questions.length) * 100;
      const oirAvgPerc = (oir1Perc + oir2Perc) / 2;
      const oirScore = oirAvgPerc / 10;

      // 2. Evaluate PPDT via Gemini
      const ppdtResult = await evaluatePerformance('PPDT Screening Board', {
        story: ppdtStory,
        narration: ppdtNarration,
        visualStimulusProvided: ppdtScenario.description
      });
      
      const ppdtScore = ppdtResult.score; // out of 10

      // 3. Final Weighted Score
      const finalScore = (oirScore * 0.4) + (ppdtScore * 0.6);

      // 4. Decision Logic
      let status: 'IN' | 'OUT' | 'BORDERLINE' = 'OUT';
      let reason = '';

      if (finalScore >= 7.5) status = 'IN';
      else if (finalScore >= 6.0) status = 'BORDERLINE';
      else status = 'OUT';

      // 5. Mandatory Elimination Rules
      if (ppdtScore < 5) {
          status = 'OUT';
          reason = 'PPDT performance below minimum threshold (Score < 5).';
      } else if (oirAvgPerc < 40) {
          status = 'OUT';
          reason = 'OIR average percentage below minimum threshold (Average < 40%).';
      } else if (oir1Perc < 50 && oir2Perc < 50) {
          status = 'OUT';
          reason = 'Failed to score above 50% in both OIR tests.';
      }

      const finalResults = {
        oir1Perc,
        oir2Perc,
        oirAvgPerc,
        oirScore,
        ppdtScore,
        finalScore,
        status,
        reason,
        ppdtFeedback: ppdtResult.recommendations,
        fullFeedback: `Based on your performance in the Screening Test:
        - OIR 1: ${oir1Perc.toFixed(1)}%
        - OIR 2: ${oir2Perc.toFixed(1)}%
        - PPDT Score: ${ppdtScore}/10
        
        Final Weighted Score: ${finalScore.toFixed(2)}/10
        
        ${reason ? `Elimination Rule Triggered: ${reason}` : ''}
        
        PPDT Analysis: ${ppdtResult.recommendations}`
      };

      setResults(finalResults);
      setStep(ScreeningStep.RESULT);
      
      // Save to history
      await saveTestAttempt(userId, 'SCREENING_TEST', { 
          score: finalScore, 
          ...finalResults 
      });

    } catch (e) {
      console.error(e);
      alert("Evaluation failed. Please try again.");
      setStep(ScreeningStep.LOBBY);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && step !== ScreeningStep.EVALUATING) {
    return <div className="flex justify-center py-40"><Loader2 className="animate-spin" size={40} /></div>;
  }

  if (step === ScreeningStep.LOBBY) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center border-b-8 border-emerald-500">
          <div className="relative z-10 space-y-4">
            <span className="px-4 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-2 mx-auto w-fit">
              <ShieldCheck size={12} /> Stage 1 Protocol
            </span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Screening <span className="text-yellow-400">Challenge</span></h1>
            <p className="text-slate-400 max-w-2xl font-medium leading-relaxed text-sm md:text-base">
              Complete 2 OIR Tests and 1 PPDT to receive your final screening evaluation. Realistic SSB scoring model applied.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableSets.map(test => (
            <div key={test.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Brain size={80} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase mb-2">{test.title}</h3>
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Target size={14} className="text-emerald-500" /> 2 OIR Sets Included
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <ImageIcon size={14} className="text-blue-500" /> 1 PPDT Scenario
                </div>
              </div>
              <button 
                onClick={() => startScreening(test)}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all flex items-center justify-center gap-2"
              >
                {isGuest ? <Lock size={14}/> : <Play size={14}/>} Start Screening
                {!isGuest && <span className="ml-2 bg-yellow-400 text-black px-2 py-0.5 rounded text-[9px] flex items-center gap-1"><Coins size={8}/> 50</span>}
              </button>
            </div>
          ))}
          
          {availableSets.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
               <Info size={40} className="mx-auto text-slate-300 mb-4" />
               <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No Screening Tests Available Yet.</p>
               <p className="text-slate-400 text-xs mt-2">Admin needs to upload OIR sets and PPDT scenarios labeled for screening.</p>
            </div>
          )}
        </div>

        <button onClick={onExit} className="mx-auto block text-slate-400 font-bold uppercase text-xs tracking-widest hover:text-slate-600 mt-8">Back to Dashboard</button>
      </div>
    );
  }

  if (step === ScreeningStep.OIR_1_INSTRUCTIONS || step === ScreeningStep.OIR_2_INSTRUCTIONS) {
    const isFirst = step === ScreeningStep.OIR_1_INSTRUCTIONS;
    const currentSet = isFirst ? selectedSet.oir1 : selectedSet.oir2;
    return (
      <div className="max-w-3xl mx-auto py-20 text-center space-y-8 animate-in zoom-in">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Brain size={40} />
        </div>
        <h2 className="text-4xl font-black uppercase tracking-tighter">OIR Test {isFirst ? '01' : '02'}</h2>
        <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-md mx-auto">
          {currentSet.title}. You have {Math.floor(currentSet.time_limit_seconds / 60)} minutes to complete this set.
        </p>
        <button 
          onClick={isFirst ? startOir1 : startOir2}
          className="px-12 py-5 bg-slate-900 text-white rounded-full font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:bg-black transition-all hover:scale-105"
        >
          Begin Test
        </button>
      </div>
    );
  }

  if (step === ScreeningStep.OIR_1_TEST || step === ScreeningStep.OIR_2_TEST) {
    const isFirst = step === ScreeningStep.OIR_1_TEST;
    const questions = isFirst ? oir1Questions : oir2Questions;
    const answers = isFirst ? oir1Answers : oir2Answers;
    const setAnswers = isFirst ? setOir1Answers : setOir2Answers;
    const currentQ = questions[currentQIndex];

    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center sticky top-4 z-20">
          <div>
            <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">OIR {isFirst ? '01' : '02'}: {isFirst ? selectedSet.oir1.title : selectedSet.oir2.title}</h4>
            <p className="text-[10px] font-bold text-slate-400">Question {currentQIndex + 1} / {questions.length}</p>
          </div>
          <div className={`px-4 py-2 rounded-xl font-mono font-black text-xl ${timeLeft < 60 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-900 text-white'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 min-h-[400px] flex flex-col">
          {currentQ.image_url && (
            <div className="mb-6 flex justify-center">
              <img src={currentQ.image_url} className="max-h-64 object-contain rounded-xl border border-slate-200" alt="Question" />
            </div>
          )}
          {currentQ.question_text && (
            <h3 className="text-xl font-bold text-slate-800 mb-8 leading-relaxed">{currentQ.question_text}</h3>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
            {currentQ.options.map((opt: string, idx: number) => (
              <button
                key={idx}
                onClick={() => {
                  const newAns = [...answers];
                  newAns[currentQIndex] = idx;
                  setAnswers(newAns);
                }}
                className={`p-4 rounded-xl text-left font-bold text-sm transition-all border-2 ${answers[currentQIndex] === idx ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-100 hover:border-slate-300 bg-slate-50 hover:bg-white shadow-sm'}`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center mr-4 font-black inline-flex ${answers[currentQIndex] === idx ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-md">
          <button 
            disabled={currentQIndex === 0}
            onClick={() => setCurrentQIndex(prev => prev - 1)}
            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-xs tracking-widest disabled:opacity-50 hover:bg-slate-200 transition-all"
          >
            Prev
          </button>
          
          {currentQIndex === questions.length - 1 ? (
            <button 
              onClick={() => {
                if (isFirst) setStep(ScreeningStep.OIR_2_INSTRUCTIONS);
                else setStep(ScreeningStep.PPDT_INSTRUCTIONS);
              }}
              className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 shadow-lg transition-all"
            >
              Finish Set
            </button>
          ) : (
            <button 
              onClick={() => setCurrentQIndex(prev => prev + 1)}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all"
            >
              Next
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step === ScreeningStep.PPDT_INSTRUCTIONS) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center space-y-8 animate-in zoom-in">
        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <ImageIcon size={40} />
        </div>
        <h2 className="text-4xl font-black uppercase tracking-tighter">PPDT Phase</h2>
        <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-md mx-auto">
          Picture Perception and Description Test. Observe the image for 30s, write your story in 4 mins, and narrate for 1 min.
        </p>
        <button 
          onClick={startPpdt}
          className="px-12 py-5 bg-blue-600 text-white rounded-full font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:bg-blue-700 transition-all hover:scale-105"
        >
          Start PPDT
        </button>
      </div>
    );
  }

  if (step === ScreeningStep.PPDT_IMAGE) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
        <img src={ppdtScenario.image_url} className="w-full h-full object-contain opacity-90 grayscale contrast-[1.2]" />
        <div className="absolute top-10 right-10 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full text-white font-mono text-3xl font-black">
          {timeLeft}s
        </div>
      </div>
    );
  }

  if (step === ScreeningStep.PPDT_STORY) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
        <div className="flex justify-between items-end border-b pb-6 border-slate-100">
          <div>
            <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Story Writing</h3>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">Describe what led to the scene, what is happening, and the outcome.</p>
          </div>
          <div className={`px-10 py-5 rounded-[2rem] font-mono font-black text-4xl border-4 ${timeLeft < 30 ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-white'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>
        <textarea 
          value={ppdtStory}
          onChange={(e) => setPpdtStory(e.target.value)}
          placeholder="Start typing your story here..."
          className="w-full h-[400px] p-10 rounded-[3rem] border-2 border-slate-100 focus:border-slate-900 outline-none transition-all text-lg leading-relaxed shadow-xl bg-white font-medium"
        />
        <div className="flex justify-end">
          <button 
            onClick={() => { setStep(ScreeningStep.PPDT_NARRATION); setTimeLeft(60); }}
            disabled={!ppdtStory.trim()}
            className="px-12 py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-2xl disabled:opacity-30"
          >
            Proceed to Narration
          </button>
        </div>
      </div>
    );
  }

  if (step === ScreeningStep.PPDT_NARRATION) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12 space-y-12 animate-in fade-in">
        <div className={`relative w-48 h-48 rounded-full flex items-center justify-center mx-auto transition-all duration-700 border-8 ${isRecording ? 'bg-red-50 border-red-500 scale-110 shadow-[0_0_80px_rgba(239,68,68,0.4)]' : 'bg-slate-50 border-slate-200 shadow-inner'}`}>
          {isRecording ? <Volume2 className="w-20 h-20 text-red-600 animate-pulse" /> : <PenTool className="w-20 h-20 text-slate-300" />}
        </div>
        <div className={`text-9xl font-mono font-black tabular-nums ${timeLeft < 10 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
          {timeLeft}s
        </div>
        <div className="bg-slate-50 p-12 rounded-[3.5rem] border border-slate-200 min-h-[200px] flex items-center justify-center italic text-slate-700 text-xl shadow-inner">
          {isRecording ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-blue-600 font-black uppercase tracking-[0.4em] text-xs">Recording Transmission...</span>
            </div>
          ) : (
            <span className="text-slate-300">"Confirm to start the 60s countdown..."</span>
          )}
        </div>
        <div className="flex justify-center gap-8">
          {!isRecording ? (
            <button onClick={startNarration} className="px-20 py-7 bg-red-600 text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-red-700 shadow-2xl transition-all">
              Start Narration
            </button>
          ) : (
            <button onClick={() => { stopNarration(); evaluateFinalScreening(); }} className="px-20 py-7 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-black shadow-2xl transition-all">
              Submit Session
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step === ScreeningStep.EVALUATING) {
    return (
      <div className="max-w-2xl mx-auto py-32 text-center space-y-8 animate-in zoom-in">
        <div className="relative w-32 h-32 mx-auto">
          <div className="absolute inset-0 border-8 border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border-8 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="text-emerald-500" size={40} />
          </div>
        </div>
        <h2 className="text-4xl font-black uppercase tracking-tighter">Analyzing Performance</h2>
        <p className="text-slate-500 font-medium text-lg leading-relaxed">
          Our AI Board is calculating your OIR rating and PPDT perception scores. Please wait...
        </p>
      </div>
    );
  }

  if (step === ScreeningStep.RESULT) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in pb-20">
        {/* Main Status Card */}
        <div className={`p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-12 ${results.status === 'IN' ? 'bg-emerald-600' : results.status === 'BORDERLINE' ? 'bg-yellow-500' : 'bg-red-600'}`}>
          <div className="relative z-10 text-center md:text-left space-y-4">
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">
              {results.status === 'IN' ? 'Screened IN' : results.status === 'BORDERLINE' ? 'Borderline' : 'Screened OUT'}
            </h2>
            <p className="text-white/80 font-bold uppercase tracking-[0.3em] text-sm">Official Screening Evaluation</p>
            {results.reason && (
              <div className="bg-black/20 p-4 rounded-2xl border border-white/10 max-w-md">
                <p className="text-xs font-bold leading-relaxed flex items-center gap-2">
                  <AlertTriangle size={16} /> {results.reason}
                </p>
              </div>
            )}
          </div>
          <div className="relative z-10 w-48 h-48 bg-white rounded-full flex flex-col items-center justify-center text-slate-900 shadow-2xl border-8 border-black/5">
            <span className="text-5xl font-black">{results.finalScore.toFixed(1)}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Final Score</span>
          </div>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Brain className="text-emerald-500" /> OIR Component (40%)
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                <span className="text-xs font-bold text-slate-500 uppercase">OIR Test 1</span>
                <span className="text-lg font-black text-slate-900">{results.oir1Perc.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                <span className="text-xs font-bold text-slate-500 uppercase">OIR Test 2</span>
                <span className="text-lg font-black text-slate-900">{results.oir2Perc.toFixed(1)}%</span>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm font-black text-slate-900 uppercase">Weighted OIR Score</span>
                <span className="text-2xl font-black text-emerald-600">{results.oirScore.toFixed(2)}/10</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <ImageIcon className="text-blue-500" /> PPDT Component (60%)
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                <span className="text-xs font-bold text-slate-500 uppercase">Perception & Narration</span>
                <span className="text-lg font-black text-slate-900">{results.ppdtScore}/10</span>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm font-black text-slate-900 uppercase">Weighted PPDT Score</span>
                <span className="text-2xl font-black text-blue-600">{(results.ppdtScore * 0.6).toFixed(2)}/6.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-6">
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
            <MessageSquare className="text-emerald-500" /> Board Feedback
          </h3>
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-line">
              {results.fullFeedback}
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button 
            onClick={() => setStep(ScreeningStep.LOBBY)}
            className="px-10 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
          >
            Try Another Set
          </button>
          <button 
            onClick={onExit}
            className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ScreeningTest;
