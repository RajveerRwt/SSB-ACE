import React from 'react';
import { Target, CheckCircle, Image as ImageIcon, FileText, AlertTriangle } from 'lucide-react';

interface ChallengeFeedbackProps {
    evaluationResult: any;
    resources: any[];
    tatUploads: Record<string, string>;
    answers: Record<string, string>;
    onClose: () => void;
}

export const ChallengeFeedback: React.FC<ChallengeFeedbackProps> = ({ evaluationResult, resources, tatUploads, answers, onClose }) => {
    const { tatFeedback, watFeedback, srtFeedback, sdtFeedback } = evaluationResult;

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900 overflow-y-auto animate-in fade-in duration-500">
            <div className="max-w-6xl mx-auto py-12 px-6">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yellow-500/20 text-yellow-400 mb-6 shadow-[0_0_40px_rgba(234,179,8,0.2)]">
                        <CheckCircle size={48} />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Evaluation Complete</h2>
                    <p className="text-slate-400 mt-4 text-xl">Here is your AI-generated feedback</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="md:col-span-1 bg-yellow-900/20 rounded-3xl p-8 border border-yellow-500/20 text-center flex flex-col justify-center backdrop-blur-sm">
                        <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest mb-4">Overall Score</h3>
                        <div className="text-7xl font-black text-white">{evaluationResult.score}<span className="text-3xl text-yellow-500/50">/10</span></div>
                    </div>
                    <div className="md:col-span-2 bg-slate-800/50 rounded-3xl p-8 border border-slate-700 backdrop-blur-sm">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Recommendations</h3>
                        <p className="text-slate-300 leading-relaxed text-lg">{evaluationResult.recommendations}</p>
                    </div>
                </div>

                {/* TAT Feedback */}
                {tatFeedback && tatFeedback.individualStories && (
                    <div className="mb-16">
                        <h3 className="text-3xl font-black text-white mb-8 border-b border-slate-700 pb-4">TAT Assessment</h3>
                        <div className="space-y-8">
                            {tatFeedback.individualStories.map((story: any, i: number) => {
                                const tatRes = resources.filter(r => r.resource_type === 'TAT')[i];
                                const stimulusUrl = tatRes?.content;
                                const userUpload = tatRes ? tatUploads[tatRes.id] : null;
                                const userText = tatRes ? answers[tatRes.id] : null;

                                return (
                                    <div key={i} className={`p-8 rounded-3xl border-2 transition-all ${story.perceivedAccurately ? 'bg-slate-800 border-slate-700' : 'bg-red-900/20 border-red-500/30'}`}>
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h4 className="text-xl font-bold text-white">Story {i + 1}</h4>
                                                <p className="text-sm text-slate-400">{story.theme || "General Theme"}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-3xl font-black text-white">{story.score || 0}<span className="text-slate-500 text-sm">/10</span></div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Stimulus</p>
                                                    {stimulusUrl && stimulusUrl !== 'BLANK' ? (
                                                        <img src={stimulusUrl} alt="Stimulus" className="w-full rounded-xl border border-slate-700" />
                                                    ) : (
                                                        <div className="w-full aspect-[4/3] bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center text-slate-600 font-black tracking-widest">BLANK</div>
                                                    )}
                                                </div>
                                                {userUpload && (
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Your Upload</p>
                                                        <img src={`data:image/jpeg;base64,${userUpload}`} alt="Upload" className="w-full rounded-xl border border-slate-700" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="lg:col-span-2 space-y-6">
                                                <div>
                                                    <h5 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-2">Detailed Overview</h5>
                                                    <p className="text-slate-400">{story.detailedOverview}</p>
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-2">Observation Accuracy</h5>
                                                    <p className="text-slate-400">{story.observationAccuracy}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <h5 className="text-sm font-bold text-yellow-400 uppercase tracking-widest mb-2">Strengths</h5>
                                                        <ul className="list-disc list-inside text-slate-400 text-sm">
                                                            {story.keyStrengths?.map((s: string, idx: number) => <li key={idx}>{s}</li>)}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-2">Gaps</h5>
                                                        <ul className="list-disc list-inside text-slate-400 text-sm">
                                                            {story.olqGaps?.map((g: string, idx: number) => <li key={idx}>{g}</li>)}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* WAT Feedback */}
                {watFeedback && watFeedback.detailedAnalysis && (
                    <div className="mb-16">
                        <h3 className="text-3xl font-black text-white mb-8 border-b border-slate-700 pb-4">WAT Assessment</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {watFeedback.detailedAnalysis.map((item: any, i: number) => (
                                <div key={i} className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="text-lg font-bold text-white">{item.word || item.situation || `Word ${i + 1}`}</div>
                                        <div className="text-xl font-black text-yellow-400">{item.score}/10</div>
                                    </div>
                                    <div className="mb-4">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Your Response</p>
                                        <p className="text-slate-300 italic">"{item.userResponse}"</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Assessment</p>
                                        <p className="text-sm text-slate-400">{item.textAssessment}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* SRT Feedback */}
                {srtFeedback && srtFeedback.detailedAnalysis && (
                    <div className="mb-16">
                        <h3 className="text-3xl font-black text-white mb-8 border-b border-slate-700 pb-4">SRT Assessment</h3>
                        <div className="space-y-4">
                            {srtFeedback.detailedAnalysis.map((item: any, i: number) => (
                                <div key={i} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col md:flex-row gap-6">
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Situation {i + 1}</p>
                                        <p className="text-lg font-medium text-white mb-4">{item.word || item.situation}</p>
                                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Your Reaction</p>
                                            <p className="text-slate-300">"{item.userResponse}"</p>
                                        </div>
                                    </div>
                                    <div className="md:w-1/3 flex flex-col justify-center">
                                        <div className="text-right mb-4">
                                            <div className="text-3xl font-black text-yellow-400">{item.score}<span className="text-slate-500 text-sm">/10</span></div>
                                        </div>
                                        <p className="text-sm text-slate-400">{item.textAssessment}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* SDT Feedback */}
                {sdtFeedback && sdtFeedback.detailedAnalysis && (
                    <div className="mb-16">
                        <h3 className="text-3xl font-black text-white mb-8 border-b border-slate-700 pb-4">SDT Assessment</h3>
                        <div className="space-y-6">
                            {['parents', 'teachers', 'friends', 'self', 'aim'].map((key) => {
                                const analysis = sdtFeedback.detailedAnalysis[key];
                                if (!analysis) return null;
                                return (
                                    <div key={key} className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                        <h4 className="text-xl font-bold text-white capitalize mb-4">{key}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Assessment</p>
                                                <p className="text-slate-300">{analysis.assessment}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">OLQs Projected</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {analysis.olqProjected?.map((olq: string, idx: number) => (
                                                        <span key={idx} className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-xs font-bold">{olq}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-10 py-5 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl font-black text-xl transition-all shadow-xl hover:scale-105"
                    >
                        Return to Map
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChallengeFeedback;
