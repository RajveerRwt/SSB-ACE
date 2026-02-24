import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Loader2, CheckCircle, FileText, Clock, AlertTriangle, Map, Mic, RefreshCw, Volume2, Users } from 'lucide-react';
import { evaluateGPE } from '../services/geminiService';
import { getGPEScenarios, TEST_RATES } from '../services/supabaseService';

interface GPETestProps {
    onComplete: (feedback: any) => void;
    onConsumeCoins?: (amount: number) => Promise<boolean>;
    isGuest?: boolean;
    onLoginRedirect?: () => void;
}

enum GPEPhase {
    SELECTION = 'SELECTION',
    MODEL_EXPLANATION = 'MODEL_EXPLANATION',
    STORY_READING = 'STORY_READING',
    CORRELATION = 'CORRELATION',
    INDIVIDUAL_SOLUTION = 'INDIVIDUAL_SOLUTION',
    GROUP_DISCUSSION = 'GROUP_DISCUSSION',
    FINAL_PLAN = 'FINAL_PLAN',
    COMPLETED = 'COMPLETED'
}

export const GPETest: React.FC<GPETestProps> = ({ onComplete, onConsumeCoins, isGuest, onLoginRedirect }) => {
    const [phase, setPhase] = useState<GPEPhase>(GPEPhase.SELECTION);
    const [scenarios, setScenarios] = useState<any[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [timer, setTimer] = useState(0);
    const [solutionText, setSolutionText] = useState('');
    const [finalPlanText, setFinalPlanText] = useState('');
    const [feedback, setFeedback] = useState<any | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    // Audio recording for final plan
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [transcript, setTranscript] = useState('');

    useEffect(() => {
        const fetchScenarios = async () => {
            setLoading(true);
            try {
                const data = await getGPEScenarios();
                setScenarios(data || []);
            } catch (e) {
                console.error("Failed to fetch GPE scenarios", e);
            } finally {
                setLoading(false);
            }
        };
        fetchScenarios();
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if ((phase === GPEPhase.CORRELATION || phase === GPEPhase.INDIVIDUAL_SOLUTION || phase === GPEPhase.GROUP_DISCUSSION) && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        handleTimerEnd();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [phase, timer]);

    const handleTimerEnd = () => {
        if (phase === GPEPhase.CORRELATION) {
            setPhase(GPEPhase.INDIVIDUAL_SOLUTION);
            setTimer(600); // 10 minutes for writing
        } else if (phase === GPEPhase.INDIVIDUAL_SOLUTION) {
            setPhase(GPEPhase.GROUP_DISCUSSION);
            setTimer(900); // 15 minutes for discussion (simulated)
        } else if (phase === GPEPhase.GROUP_DISCUSSION) {
            setPhase(GPEPhase.FINAL_PLAN);
        }
    };

    const startScenario = async (scenario: any) => {
        if (isGuest && scenario.title !== "Free Practice GPE") {
            if (onLoginRedirect) onLoginRedirect();
            return;
        }

        if (onConsumeCoins) {
            const consumed = await onConsumeCoins(TEST_RATES.GPE || 0);
            if (!consumed) return;
        }

        setSelectedScenario(scenario);
        setPhase(GPEPhase.MODEL_EXPLANATION);
    };

    const proceedToStory = () => setPhase(GPEPhase.STORY_READING);
    
    const proceedToCorrelation = () => {
        setPhase(GPEPhase.CORRELATION);
        setTimer(300); // 5 minutes
    };

    const submitIndividualSolution = () => {
        setPhase(GPEPhase.GROUP_DISCUSSION);
        setTimer(900); // 15 minutes for discussion
    };

    const skipDiscussion = () => {
        setPhase(GPEPhase.FINAL_PLAN);
        setTimer(0);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
                // In a real app, we would transcribe this. For now, we'll rely on text input or simulate.
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Microphone access is required to record the final plan.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const submitFinalPlan = async () => {
        setIsEvaluating(true);
        setPhase(GPEPhase.COMPLETED);
        try {
            const result = await evaluateGPE(selectedScenario.narrative, solutionText, finalPlanText || transcript);
            setFeedback(result);
            onComplete(result);
        } catch (e) {
            console.error("Evaluation failed", e);
            setFeedback({ error: "Evaluation failed due to technical issues." });
        } finally {
            setIsEvaluating(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest">Loading Scenarios...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {phase === GPEPhase.SELECTION && (
                <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-xl">
                    <div className="mb-8">
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                            <Map className="text-blue-600" /> Group Planning Exercise (GPE)
                        </h3>
                        <p className="text-slate-500 text-sm font-medium mt-2">
                            Select a scenario to begin. The test simulates the real GTO environment with model explanation, story reading, correlation, individual writing, and final group plan nomination.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {scenarios.length === 0 ? (
                            <div className="col-span-2 text-center py-10 text-slate-400 font-bold">No scenarios available.</div>
                        ) : (
                            scenarios.map((scenario, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => startScenario(scenario)}
                                    className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all group shadow-sm hover:shadow-lg gap-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors font-black text-xs shrink-0">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-slate-900 text-sm group-hover:text-blue-900 leading-tight">{scenario.title}</h5>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${scenario.difficulty === 'High' ? 'bg-red-100 text-red-700' : scenario.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                    {scenario.difficulty || 'Medium'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {phase !== GPEPhase.SELECTION && phase !== GPEPhase.COMPLETED && (
                <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-xl">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                            {phase === GPEPhase.MODEL_EXPLANATION && "Stage 1: Model Explanation"}
                            {phase === GPEPhase.STORY_READING && "Stage 2: Story Reading"}
                            {phase === GPEPhase.CORRELATION && "Stage 3: Correlation (5 Mins)"}
                            {phase === GPEPhase.INDIVIDUAL_SOLUTION && "Stage 4: Individual Solution (10 Mins)"}
                            {phase === GPEPhase.GROUP_DISCUSSION && "Stage 5: Group Discussion (15 Mins)"}
                            {phase === GPEPhase.FINAL_PLAN && "Stage 6: Final Group Plan"}
                        </h3>
                        {(phase === GPEPhase.CORRELATION || phase === GPEPhase.INDIVIDUAL_SOLUTION || phase === GPEPhase.GROUP_DISCUSSION) && (
                            <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-mono text-xl font-bold shadow-inner">
                                <Clock size={20} className={timer < 60 ? "text-red-400 animate-pulse" : "text-blue-400"} />
                                <span className={timer < 60 ? "text-red-400" : ""}>{formatTime(timer)}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        {/* Always show model image if available */}
                        {selectedScenario?.image_url && (
                            <div className="bg-slate-100 p-2 rounded-2xl">
                                <img src={selectedScenario.image_url} alt="GPE Model" className="w-full h-auto rounded-xl max-h-[400px] object-contain" />
                            </div>
                        )}

                        {phase === GPEPhase.MODEL_EXPLANATION && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <p className="text-slate-600 font-medium leading-relaxed mb-6">
                                    Observe the model carefully. The GTO is explaining the terrain, scale, directions, and important landmarks. You may clarify any doubts regarding the model now.
                                </p>
                                <button onClick={proceedToStory} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2">
                                    Proceed to Story Reading <Play size={18} />
                                </button>
                            </div>
                        )}

                        {phase === GPEPhase.STORY_READING && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-6">
                                    <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2"><FileText size={20} /> Narrative Story</h4>
                                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedScenario?.narrative}</p>
                                </div>
                                <button onClick={proceedToCorrelation} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2">
                                    Start 5 Min Correlation <Clock size={18} />
                                </button>
                            </div>
                        )}

                        {phase === GPEPhase.CORRELATION && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-10">
                                <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
                                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Do Not Write Anything</h4>
                                <p className="text-slate-500 font-medium max-w-md mx-auto">
                                    You have 5 minutes to read the story cards (mentally) and correlate the problems with the model. Make a mental picture of all features and salient points.
                                </p>
                                <div className="mt-8">
                                    <button onClick={handleTimerEnd} className="text-xs font-bold text-slate-400 hover:text-slate-600 underline">Skip Timer (Admin/Dev)</button>
                                </div>
                            </div>
                        )}

                        {phase === GPEPhase.INDIVIDUAL_SOLUTION && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-4 flex items-start gap-3">
                                    <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={18} />
                                    <p className="text-sm text-yellow-800 font-medium">Write your individual solution. Identify problems, prioritize them, allocate resources, and state the final outcome.</p>
                                </div>
                                <textarea
                                    value={solutionText}
                                    onChange={(e) => setSolutionText(e.target.value)}
                                    placeholder="Type your individual solution here..."
                                    className="w-full h-64 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all resize-none font-medium text-slate-700"
                                />
                                <button 
                                    onClick={submitIndividualSolution} 
                                    disabled={!solutionText.trim()}
                                    className="w-full mt-4 py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50"
                                >
                                    Submit Individual Solution
                                </button>
                            </div>
                        )}

                        {phase === GPEPhase.GROUP_DISCUSSION && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-10">
                                <Users size={48} className="mx-auto text-blue-500 mb-4" />
                                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Group Discussion</h4>
                                <p className="text-slate-500 font-medium max-w-md mx-auto mb-8">
                                    In a real SSB, you would now discuss your solutions with the group to arrive at a common plan. For this practice, take a moment to review your solution and think about how you would convince others.
                                </p>
                                <button onClick={skipDiscussion} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-lg">
                                    Proceed to Final Plan
                                </button>
                            </div>
                        )}

                        {phase === GPEPhase.FINAL_PLAN && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-4">
                                    <p className="text-sm text-blue-800 font-medium">You have been nominated to explain the agreed common plan. You can type it or record your audio.</p>
                                </div>
                                
                                <div className="space-y-4">
                                    <textarea
                                        value={finalPlanText}
                                        onChange={(e) => setFinalPlanText(e.target.value)}
                                        placeholder="Type the final group plan here..."
                                        className="w-full h-32 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all resize-none font-medium text-slate-700"
                                    />
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">OR</div>
                                        <button
                                            onClick={isRecording ? stopRecording : startRecording}
                                            className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                                                isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {isRecording ? <><Square size={16} /> Stop Recording</> : <><Mic size={16} /> Record Final Plan</>}
                                        </button>
                                    </div>

                                    {audioUrl && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                                            <Volume2 className="text-slate-400" />
                                            <audio src={audioUrl} controls className="w-full h-8" />
                                        </div>
                                    )}

                                    <button 
                                        onClick={submitFinalPlan} 
                                        disabled={(!finalPlanText.trim() && !audioUrl) || isEvaluating}
                                        className="w-full mt-6 py-4 bg-green-600 text-white rounded-xl font-black uppercase tracking-widest text-sm hover:bg-green-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isEvaluating ? <><Loader2 size={18} className="animate-spin" /> Evaluating...</> : <><CheckCircle size={18} /> Submit for Evaluation</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {phase === GPEPhase.COMPLETED && (
                <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={40} />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Evaluation Complete</h3>
                        <p className="text-slate-500 font-medium mt-2">Here is the AI analysis of your GPE performance.</p>
                    </div>

                    {isEvaluating ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
                            <p className="text-slate-500 font-bold uppercase tracking-widest">Analyzing your plans...</p>
                        </div>
                    ) : feedback ? (
                        <div className="space-y-6">
                            {feedback.error ? (
                                <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200">
                                    <AlertTriangle size={24} className="mb-2" />
                                    <h4 className="font-bold">Evaluation Error</h4>
                                    <p>{feedback.error}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                                            <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Overall Score</h4>
                                            <div className="text-4xl font-black text-blue-900">{feedback.score}/10</div>
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Problem Identification</h4>
                                            <div className="text-lg font-bold text-slate-700">{feedback.problemIdentification || 'Good'}</div>
                                        </div>
                                    </div>

                                    <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                        <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2"><CheckCircle size={18} /> Strengths</h4>
                                        <ul className="space-y-2">
                                            {feedback.strengths?.map((s: string, i: number) => (
                                                <li key={i} className="flex items-start gap-2 text-green-800 text-sm">
                                                    <span className="mt-1 text-green-500">•</span> {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                                        <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2"><AlertTriangle size={18} /> Areas for Improvement</h4>
                                        <ul className="space-y-2">
                                            {feedback.weaknesses?.map((w: string, i: number) => (
                                                <li key={i} className="flex items-start gap-2 text-red-800 text-sm">
                                                    <span className="mt-1 text-red-500">•</span> {w}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                        <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><FileText size={18} /> Detailed Analysis</h4>
                                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{feedback.detailedAnalysis}</p>
                                    </div>
                                </>
                            )}
                            
                            <div className="flex justify-center mt-8">
                                <button 
                                    onClick={() => setPhase(GPEPhase.SELECTION)}
                                    className="px-8 py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2"
                                >
                                    <RefreshCw size={16} /> Try Another Scenario
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};
