import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Loader2, CheckCircle, FileText, Clock, AlertTriangle, Map, Mic, RefreshCw, Volume2, Users, ImageIcon } from 'lucide-react';
import { evaluateGPE, textToSpeech, simulateGPEDiscussion, transcribeHandwrittenStory, transcribeAudio } from '../services/geminiService';
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
    const [gtoAudio, setGtoAudio] = useState<string | null>(null);
    const [isNarrating, setIsNarrating] = useState(false);
    const [discussionPoints, setDiscussionPoints] = useState<any[]>([]);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isImageEnlarged, setIsImageEnlarged] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [userCounters, setUserCounters] = useState<any[]>([]);
    const [counterInput, setCounterInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const finalFileInputRef = useRef<HTMLInputElement>(null);
    const gtoAudioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (gtoAudio && gtoAudioRef.current) {
            gtoAudioRef.current.play().catch(e => console.warn("Auto-play blocked", e));
        }
    }, [gtoAudio]);

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
        
        // Start GTO Narration
        setIsNarrating(true);
        try {
            const audioData = await textToSpeech(`Welcome candidates. Observe this model. It represents the area of ${scenario.title}. I will now explain the features. ${scenario.narrative.substring(0, 200)}...`);
            if (audioData) {
                setGtoAudio(`data:audio/mp3;base64,${audioData}`);
            }
        } catch (e) {
            console.error("GTO Narration failed", e);
        } finally {
            setIsNarrating(false);
        }
    };

    const proceedToStory = () => setPhase(GPEPhase.STORY_READING);
    
    const proceedToCorrelation = () => {
        setPhase(GPEPhase.CORRELATION);
        setTimer(300); // 5 minutes
    };

    const submitIndividualSolution = async () => {
        setPhase(GPEPhase.GROUP_DISCUSSION);
        setTimer(900); // 15 minutes for discussion
        
        // Simulate discussion points
        try {
            const points = await simulateGPEDiscussion(selectedScenario.narrative, solutionText);
            setDiscussionPoints(points);
        } catch (e) {
            console.error("Discussion simulation failed", e);
        }
    };

    const handleHandwrittenUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'individual' | 'final') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsTranscribing(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const text = await transcribeHandwrittenStory(base64, file.type);
                if (target === 'individual') {
                    setSolutionText(prev => prev ? `${prev}\n\n[Transcribed Handwritten Solution]:\n${text}` : text);
                } else {
                    setFinalPlanText(prev => prev ? `${prev}\n\n[Transcribed Handwritten Final Plan]:\n${text}` : text);
                }
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error("Transcription failed", err);
            alert("Failed to transcribe image. Please try typing your solution.");
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleCounterSubmit = () => {
        if (!counterInput.trim()) return;
        setUserCounters([...userCounters, { text: counterInput, timestamp: new Date() }]);
        setCounterInput('');
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

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
                
                // Transcribe if in discussion phase
                if (phase === GPEPhase.GROUP_DISCUSSION) {
                    setIsTranscribing(true);
                    try {
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                            const base64 = (reader.result as string).split(',')[1];
                            const text = await transcribeAudio(base64, 'audio/webm');
                            if (text) {
                                setUserCounters(prev => [...prev, { text, timestamp: new Date() }]);
                            }
                        };
                        reader.readAsDataURL(audioBlob);
                    } catch (e) {
                        console.error("Audio transcription failed", e);
                    } finally {
                        setIsTranscribing(false);
                    }
                }
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
            const result = await evaluateGPE(selectedScenario.narrative, solutionText, finalPlanText || transcript, userCounters);
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
                            <div className={`relative transition-all duration-500 ${isImageEnlarged ? 'fixed inset-0 z-50 bg-black/95 p-4 flex flex-col items-center justify-center' : 'bg-slate-100 p-2 rounded-2xl'}`}>
                                <div className={`overflow-auto custom-scrollbar flex items-center justify-center w-full h-full ${isImageEnlarged ? '' : 'max-h-[400px]'}`}>
                                    <img 
                                        src={selectedScenario.image_url} 
                                        alt="GPE Model" 
                                        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                                        className={`rounded-xl transition-transform duration-200 ${isImageEnlarged ? '' : 'w-full h-auto object-contain cursor-zoom-in'}`}
                                        onClick={() => !isImageEnlarged && setIsImageEnlarged(true)}
                                    />
                                </div>
                                
                                <div className="absolute top-4 right-4 flex gap-2">
                                    {isImageEnlarged && (
                                        <>
                                            <button 
                                                onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 4))}
                                                className="p-3 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all"
                                                title="Zoom In"
                                            >
                                                <Play size={20} className="-rotate-90" />
                                            </button>
                                            <button 
                                                onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 0.5))}
                                                className="p-3 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all"
                                                title="Zoom Out"
                                            >
                                                <Play size={20} className="rotate-90" />
                                            </button>
                                        </>
                                    )}
                                    <button 
                                        onClick={() => {
                                            setIsImageEnlarged(!isImageEnlarged);
                                            if (isImageEnlarged) setZoomLevel(1);
                                        }}
                                        className="p-3 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all"
                                    >
                                        {isImageEnlarged ? <Square size={20} /> : <Map size={20} />}
                                    </button>
                                </div>
                                
                                {isImageEnlarged && (
                                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                                        <p className="text-white/60 font-black uppercase tracking-widest text-[10px]">Zoom: {Math.round(zoomLevel * 100)}%</p>
                                        <p className="text-white/40 font-bold uppercase tracking-widest text-[8px]">Click icon or press ESC to close</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {phase === GPEPhase.MODEL_EXPLANATION && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isNarrating ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-blue-600 text-white shadow-lg'}`}>
                                            <Volume2 size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">GTO Narration</h4>
                                            <p className="text-xs text-slate-500 uppercase font-black tracking-widest">{isNarrating ? 'GTO is explaining the model...' : 'Narration Ready'}</p>
                                        </div>
                                    </div>
                                    {gtoAudio && (
                                        <div className="flex gap-2">
                                            <audio ref={gtoAudioRef} src={gtoAudio} className="hidden" />
                                            <button 
                                                onClick={() => gtoAudioRef.current?.play()}
                                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                                            >
                                                <Play size={14} /> Play Again
                                            </button>
                                        </div>
                                    )}
                                </div>
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
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-6 flex items-start gap-3">
                                    <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <h4 className="text-sm font-black text-yellow-900 uppercase tracking-widest">Do Not Write Anything</h4>
                                        <p className="text-xs text-yellow-800 font-medium">You have 5 minutes to read the story cards and correlate the problems with the model.</p>
                                    </div>
                                </div>
                                
                                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-6">
                                    <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2"><FileText size={20} /> Story Card (Correlate with Map)</h4>
                                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">{selectedScenario?.narrative}</p>
                                </div>

                                <div className="mt-8 text-center">
                                    <button onClick={handleTimerEnd} className="text-xs font-bold text-slate-400 hover:text-slate-600 underline">Skip Timer (Admin/Dev)</button>
                                </div>
                            </div>
                        )}

                        {phase === GPEPhase.INDIVIDUAL_SOLUTION && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 flex items-start gap-3 flex-1 mr-4">
                                        <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={18} />
                                        <p className="text-xs text-yellow-800 font-medium">Write your individual solution. Identify problems, prioritize them, allocate resources, and state the final outcome.</p>
                                    </div>
                                    <div className="shrink-0">
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleHandwrittenUpload(e, 'individual')} />
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isTranscribing}
                                            className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 flex items-center gap-2"
                                        >
                                            {isTranscribing ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                                            Upload Handwritten
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    value={solutionText}
                                    onChange={(e) => setSolutionText(e.target.value)}
                                    placeholder="Type your individual solution here..."
                                    className="w-full h-64 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all resize-none font-medium text-slate-700"
                                />
                                <button 
                                    onClick={submitIndividualSolution} 
                                    disabled={!solutionText.trim() || isTranscribing}
                                    className="w-full mt-4 py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50"
                                >
                                    Submit Individual Solution
                                </button>
                            </div>
                        )}

                        {phase === GPEPhase.GROUP_DISCUSSION && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="text-center mb-8">
                                    <Users size={48} className="mx-auto text-blue-500 mb-4" />
                                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Group Discussion</h4>
                                    <p className="text-slate-500 font-medium max-w-md mx-auto">
                                        The group is discussing the plan. Counter points raised by others or support them. Address them by Chest No.
                                    </p>
                                </div>

                                <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto px-2 custom-scrollbar">
                                    {discussionPoints.length === 0 ? (
                                        <div className="flex flex-col items-center py-6">
                                            <Loader2 className="animate-spin text-blue-400 mb-2" />
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generating Group Input...</p>
                                        </div>
                                    ) : (
                                        <>
                                            {discussionPoints.map((p, i) => (
                                                <div key={`ai-${i}`} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-4 animate-in slide-in-from-left-4">
                                                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-md">
                                                        {p.chestNo}
                                                    </div>
                                                    <p className="text-sm text-slate-700 font-medium leading-relaxed italic">"{p.point}"</p>
                                                </div>
                                            ))}
                                            {userCounters.map((c, i) => (
                                                <div key={`user-${i}`} className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-row-reverse gap-4 animate-in slide-in-from-right-4">
                                                    <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-[10px] shrink-0 shadow-md">
                                                        YOU
                                                    </div>
                                                    <p className="text-sm text-blue-900 font-bold leading-relaxed text-right">{c.text}</p>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>

                                <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 mb-6 flex gap-2 items-end">
                                    <textarea 
                                        value={counterInput}
                                        onChange={(e) => setCounterInput(e.target.value)}
                                        placeholder="Type your counter/point (e.g. Chest No 5, I disagree because...)"
                                        className="flex-1 bg-transparent border-none outline-none font-medium text-sm resize-none h-20"
                                    />
                                    <div className="flex flex-col gap-2">
                                        <button 
                                            onClick={isRecording ? stopRecording : startRecording}
                                            className={`p-3 rounded-xl transition-all ${isRecording ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                        >
                                            <Mic size={18} />
                                        </button>
                                        <button 
                                            onClick={handleCounterSubmit}
                                            disabled={!counterInput.trim()}
                                            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
                                        >
                                            <Play size={18} />
                                        </button>
                                    </div>
                                </div>

                                <button onClick={skipDiscussion} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all shadow-lg">
                                    Proceed to Final Plan Nomination
                                </button>
                            </div>
                        )}

                        {phase === GPEPhase.FINAL_PLAN && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 flex-1 mr-4">
                                        <p className="text-xs text-blue-800 font-medium">You have been nominated to explain the agreed common plan. You can type it, record audio, or upload a handwritten plan.</p>
                                    </div>
                                    <div className="shrink-0">
                                        <input type="file" ref={finalFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleHandwrittenUpload(e, 'final')} />
                                        <button 
                                            onClick={() => finalFileInputRef.current?.click()}
                                            disabled={isTranscribing}
                                            className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 flex items-center gap-2"
                                        >
                                            {isTranscribing ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                                            Upload Handwritten
                                        </button>
                                    </div>
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
                                            <div className="flex items-baseline gap-2">
                                                <div className="text-4xl font-black text-blue-900">{feedback.score}/10</div>
                                                <div className={`text-xs font-black uppercase px-2 py-1 rounded ${
                                                    feedback.score >= 7.6 ? 'bg-green-100 text-green-700' :
                                                    feedback.score >= 6.0 ? 'bg-blue-100 text-blue-700' :
                                                    feedback.score >= 4.5 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    {feedback.verdict}
                                                </div>
                                            </div>
                                            <div className="mt-4 space-y-1">
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                    <span>0-4.4 Poor</span>
                                                    <span>4.5-5.9 Avg</span>
                                                    <span>6-7.5 Good</span>
                                                    <span>7.6+ Exc</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                                                    <div className="h-full bg-red-400" style={{ width: '44%' }}></div>
                                                    <div className="h-full bg-yellow-400" style={{ width: '15%' }}></div>
                                                    <div className="h-full bg-blue-400" style={{ width: '16%' }}></div>
                                                    <div className="h-full bg-green-400" style={{ width: '25%' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Problem Identification</h4>
                                            <div className="text-sm font-bold text-slate-700 leading-relaxed">{feedback.problemIdentification || 'Good'}</div>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                                        <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2"><Users size={18} /> Group Participation Analysis</h4>
                                        <p className="text-slate-700 text-sm leading-relaxed">{feedback.discussionFeedback}</p>
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
