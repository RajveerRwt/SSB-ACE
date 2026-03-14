import React, { useState, useEffect } from 'react';
import { supabase, saveTestAttempt, submitUserFeedback } from '../services/supabaseService';
import { Target, Calendar, CheckCircle, Lock, Play, Loader2, ArrowLeft, Brain, Zap, Image as ImageIcon, Send, Upload, Timer, FastForward, Eye, X, FileText, Camera, Trash2, Edit, Activity, MessageCircle, Star } from 'lucide-react';
import { PIQData } from '../types';
import { GoogleGenAI, Type } from '@google/genai';
import CameraModal from './CameraModal';

interface Challenge14DayProps {
    onBack: () => void;
    userId?: string;
    piqData?: PIQData;
}

const fallbackWATWords = [
    "Accept", "Action", "Advantage", "Afraid", "Aim", "Alone", "Anger", "Anxiety", "Attack", "Attempt",
    "Bad", "Beat", "Beautiful", "Blood", "Bomb", "Brave", "Care", "Change", "Character", "Cheat",
    "Clear", "Company", "Confidence", "Cooperation", "Courage", "Coward", "Crisis", "Danger", "Dark", "Death",
    "Defeat", "Delay", "Destroy", "Difficult", "Discipline", "Disease", "Doubt", "Duty", "Enemy", "Escape",
    "Fail", "Fear", "Fight", "Fire", "Friend", "Ghost", "Girl", "God", "Grief", "Guilt",
    "Happy", "Hate", "Help", "Hero", "Hide", "Honest", "Hope", "Idea", "Impossible", "Initiative"
];

const fallbackSRTSituations = [
    "You are walking alone at night and see a group of men teasing a girl. You would...",
    "Your friend is drowning in a river and you don't know how to swim. You would...",
    "You are traveling in a train and notice a suspicious bag under your seat. You would...",
    "You are appearing for an important exam and your pen stops working. You would...",
    "You find a wallet full of money on the street. You would...",
    "Your neighbor's house catches fire. You would...",
    "You are lost in a jungle and it is getting dark. You would...",
    "You are the captain of your team and your star player is injured right before the final match. You would...",
    "You see an old man struggling to cross a busy road. You would...",
    "You are riding a bike and suddenly a child runs in front of you. You would...",
    "Your parents want you to take up a job, but you want to start a business. You would...",
    "You are in a movie theater and someone shouts 'Fire!'. You would...",
    "You are preparing for an interview and the power goes off. You would...",
    "You are assigned a task by your boss that you think is impossible. You would...",
    "You see a person lying unconscious on the road. You would...",
    "You are traveling in a bus and it breaks down in a deserted area. You would...",
    "Your friend asks you to help him cheat in an exam. You would...",
    "You are late for an important meeting and get stuck in traffic. You would...",
    "You find out that your colleague is stealing from the company. You would...",
    "You are organizing an event and the main speaker cancels at the last minute. You would...",
    "You are alone at home and hear strange noises from the backyard. You would...",
    "You are participating in a debate and forget your lines. You would...",
    "You see a snake in your room. You would...",
    "You are traveling in a train and someone tries to snatch your bag. You would...",
    "You are given a team project, but your team members are not cooperating. You would...",
    "You are offered a bribe to clear a file. You would...",
    "You are driving and your car's brakes fail. You would...",
    "You are in a crowded market and realize your phone is missing. You would...",
    "You are trekking in the mountains and one of your friends sprains his ankle. You would...",
    "You are preparing for a presentation and your laptop crashes. You would...",
    "You see a child crying in a mall, looking for his parents. You would...",
    "You are traveling in a flight and it experiences severe turbulence. You would...",
    "You are asked to lead a team of people who are older and more experienced than you. You would...",
    "You find out that a rumor is being spread about you. You would...",
    "You are in a bank and armed robbers enter. You would...",
    "You are walking in a park and a stray dog attacks you. You would...",
    "You are given a task with a very tight deadline. You would...",
    "You see a person throwing garbage on the street. You would...",
    "You are in a restaurant and find a bug in your food. You would...",
    "You are traveling in a train and the person sitting next to you falls sick. You would...",
    "You are asked to speak on a topic you know nothing about. You would...",
    "You find a lost child at a railway station. You would...",
    "You are in a hotel and the fire alarm goes off. You would...",
    "You are driving and witness a hit-and-run accident. You would...",
    "You are preparing for an exam and your neighbors are playing loud music. You would...",
    "You are in a lift and it gets stuck between floors. You would...",
    "You see a person trying to commit suicide. You would...",
    "You are traveling in a bus and the driver is driving recklessly. You would...",
    "You are asked to work on a weekend when you have personal plans. You would...",
    "You find out that your best friend has been lying to you. You would...",
    "You are in a new city and lose your way. You would...",
    "You are participating in a race and twist your ankle near the finish line. You would...",
    "You see a person being bullied by a group of people. You would...",
    "You are in a shop and the shopkeeper gives you extra change by mistake. You would...",
    "You are traveling in a train and notice a person traveling without a ticket. You would...",
    "You are asked to do a task that goes against your principles. You would...",
    "You find a confidential document lying on the floor in your office. You would...",
    "You are in a meeting and someone takes credit for your idea. You would...",
    "You see a person drowning in a lake. You would...",
    "You are traveling in a bus and a passenger starts arguing with the conductor. You would..."
];

const Challenge14Day: React.FC<Challenge14DayProps> = ({ onBack, userId, piqData }) => {
    const [days, setDays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [resources, setResources] = useState<any[]>([]);
    
    // Test State
    const [isTesting, setIsTesting] = useState(false);
    const [currentResourceIndex, setCurrentResourceIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [sdtAnswers, setSdtAnswers] = useState<Record<string, string>>({
        parents: '', teachers: '', friends: '', self: '', aim: ''
    });
    const [timeLeft, setTimeLeft] = useState(-1);
    const [isTimed, setIsTimed] = useState(true);
    const [testPhase, setTestPhase] = useState<'VIEWING' | 'WRITING' | 'UPLOAD_ANSWERS'>('WRITING');
    const [isPhaseTransition, setIsPhaseTransition] = useState(false);
    const [completedDays, setCompletedDays] = useState<number[]>([]);
    const [progressData, setProgressData] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'MAP' | 'ABOUT'>('MAP');
    const [evaluationTipIndex, setEvaluationTipIndex] = useState(0);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluationResult, setEvaluationResult] = useState<any>(null);
    const [feedbackRating, setFeedbackRating] = useState<number>(0);
    const [feedbackText, setFeedbackText] = useState<string>('');
    const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
    const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
    const [pendingProgress, setPendingProgress] = useState<any>(null);

    const EVALUATION_TIPS = [
        "Did you know? The TAT measures your subconscious needs and drives.",
        "In WAT, your first spontaneous thought is usually the most genuine.",
        "SRT evaluates your practical intelligence and everyday problem-solving skills.",
        "SDT helps assessors understand your level of self-awareness.",
        "Consistency across all four psychological tests is key to a recommendation.",
        "A positive attitude in your stories reflects a constructive mindset.",
        "Keep your sentences short and meaningful in the Word Association Test."
    ];

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isEvaluating) {
            interval = setInterval(() => {
                setEvaluationTipIndex(prev => (prev + 1) % EVALUATION_TIPS.length);
            }, 4000);
        }
        return () => clearInterval(interval);
    }, [isEvaluating]);
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);

    // Evaluation State

    // New Upload States
    const [tatUploads, setTatUploads] = useState<Record<string, string>>({});
    const [tatTexts, setTatTexts] = useState<Record<string, string>>({});
    const [transcribingTat, setTranscribingTat] = useState<string[]>([]);
    
    const [watSheetUploads, setWatSheetUploads] = useState<string[]>([]);
    const [watSheetTexts, setWatSheetTexts] = useState<string[]>([]);
    const [transcribingWat, setTranscribingWat] = useState<number[]>([]);
    
    const [srtSheetUploads, setSrtSheetUploads] = useState<string[]>([]);
    const [srtSheetTexts, setSrtSheetTexts] = useState<string[]>([]);
    const [transcribingSrt, setTranscribingSrt] = useState<number[]>([]);
    
    const [sdtImages, setSdtImages] = useState<Record<string, any>>({ parents: null, teachers: null, friends: null, self: null, aim: null });
    const [showCamera, setShowCamera] = useState(false);
    const [activeCameraKey, setActiveCameraKey] = useState<string | number | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    
    // Progress saving refs
    const progressStateRef = React.useRef<any>(null);
    const lastSavedProgressRef = React.useRef<string>('');

    useEffect(() => {
        progressStateRef.current = {
            selectedDay,
            currentResourceIndex,
            testPhase,
            timeLeft,
            isTimed,
            answers,
            tatUploads,
            tatTexts,
            watSheetUploads,
            watSheetTexts,
            srtSheetUploads,
            srtSheetTexts,
            sdtImages,
            sdtAnswers
        };
    }, [selectedDay, currentResourceIndex, testPhase, timeLeft, isTimed, answers, tatUploads, tatTexts, watSheetUploads, watSheetTexts, srtSheetUploads, srtSheetTexts, sdtImages, sdtAnswers]);

    useEffect(() => {
        if (!userId || !isTesting) return;

        const interval = setInterval(async () => {
            const currentProgress = progressStateRef.current;
            if (!currentProgress || !currentProgress.selectedDay) return;
            
            const currentString = JSON.stringify(currentProgress);
            if (currentString === lastSavedProgressRef.current) return;
            
            lastSavedProgressRef.current = currentString;
            
            try {
                const { data: existing } = await supabase
                    .from('test_history')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('test_type', 'CHALLENGE_14_DAY_PROGRESS')
                    .limit(1)
                    .maybeSingle();

                if (existing) {
                    await supabase
                        .from('test_history')
                        .update({ result_data: currentProgress })
                        .eq('id', existing.id);
                } else {
                    await supabase
                        .from('test_history')
                        .insert({
                            user_id: userId,
                            test_type: 'CHALLENGE_14_DAY_PROGRESS',
                            score: 0,
                            result_data: currentProgress
                        });
                }
            } catch (e) {
                console.error("Failed to save progress", e);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [userId, isTesting]);

    useEffect(() => {
        fetchDays();
        fetchUserProgress();
    }, [userId]);

    const fetchUserProgress = async () => {
        if (!userId) return;
        const { data, error } = await supabase
            .from('test_history')
            .select('result_data, test_type')
            .eq('user_id', userId)
            .in('test_type', ['CHALLENGE_14_DAY', 'CHALLENGE_14_DAY_PROGRESS']);
            
        if (!error && data) {
            const completedData = data.filter(d => d.test_type === 'CHALLENGE_14_DAY');
            const parsedData = completedData.map(d => {
                let res = d.result_data;
                if (typeof res === 'string') {
                    try { res = JSON.parse(res); } catch (e) {}
                }
                return { ...d, result_data: res };
            });
            setProgressData(parsedData);
            const days = parsedData.map(d => d.result_data?.day).filter(Boolean);
            const uniqueDays = [...new Set(days)];
            setCompletedDays(uniqueDays);

            const pendingData = data.find(d => d.test_type === 'CHALLENGE_14_DAY_PROGRESS');
            if (pendingData) {
                let res = pendingData.result_data;
                if (typeof res === 'string') {
                    try { res = JSON.parse(res); } catch (e) {}
                }
                setPendingProgress(res);
            } else {
                setPendingProgress(null);
            }
        }
    };

    useEffect(() => {
        if (isTesting && isTimed && timeLeft >= 0 && !isPhaseTransition) {
            if (timeLeft > 0) {
                timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
            } else {
                const currentRes = resources[currentResourceIndex];
                if (currentRes?.resource_type === 'TAT' && testPhase === 'VIEWING') {
                    setTestPhase('WRITING');
                    setTimeLeft(240);
                } else {
                    handleNext();
                }
            }
        }
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [timeLeft, isTesting, isTimed, testPhase, currentResourceIndex, resources]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const fetchDays = async () => {
        setLoading(true);
        // Mock 12 days
        const mockDays = [
            { 
                id: 1, day_number: 1, title: 'Day 1', description: 'Core Identity (SDT)',
                details: {
                    what: 'Self Description Test (SDT) focusing on core identity.',
                    how: 'Write a 5-paragraph Self Description Test within 15 minutes.',
                    why: 'To establish a baseline of your self-awareness and how you perceive yourself vs how others perceive you.'
                }
            },
            { 
                id: 2, day_number: 2, title: 'Day 2', description: 'TAT Story Structure',
                details: {
                    what: 'Thematic Apperception Test focusing on story structure.',
                    how: 'Write 4 TAT stories focusing strictly on the Past → Present → Future structure.',
                    why: 'To build a strong foundation in structuring your thoughts logically and sequentially.'
                }
            },
            { 
                id: 3, day_number: 3, title: 'Day 3', description: 'WAT Basics',
                details: {
                    what: 'Word Association Test basics focusing on the psychology of words.',
                    how: 'Write sentences for 20 given words within 15 seconds each.',
                    why: 'To train your subconscious mind to react positively and constructively to basic stimuli.'
                }
            },
            { 
                id: 4, day_number: 4, title: 'Day 4', description: 'SRT Basics',
                details: {
                    what: 'Situation Reaction Test basics focusing on practical intelligence.',
                    how: 'Respond to 20 real-life situations within 10 minutes.',
                    why: 'To evaluate your baseline practical intelligence and everyday problem-solving skills.'
                }
            },
            { 
                id: 5, day_number: 5, title: 'Day 5', description: 'Stress Psychology Test',
                details: {
                    what: 'A combined test of negative TAT pictures and negative WAT words.',
                    how: 'Attempt 4 negative TAT pictures and 20 negative WAT words.',
                    why: 'To test your ability to maintain composure and find positive outcomes in stressful or negative scenarios.'
                }
            },
            { 
                id: 6, day_number: 6, title: 'Day 6', description: 'TAT Speed Run',
                details: {
                    what: 'A speed-focused Thematic Apperception Test.',
                    how: 'Write 6 TAT stories with a strict 4-minute limit per picture.',
                    why: 'To build stamina and ensure you can maintain story quality under time pressure.'
                }
            },
            { 
                id: 7, day_number: 7, title: 'Day 7', description: 'WAT Speed Run',
                details: {
                    what: 'A speed-focused Word Association Test.',
                    how: 'Complete 60 WAT words with exactly 15 seconds per word.',
                    why: 'To eliminate hesitation and force purely subconscious, rapid reactions.'
                }
            },
            { 
                id: 8, day_number: 8, title: 'Day 8', description: 'SRT Marathon',
                details: {
                    what: 'An endurance test for Situation Reaction.',
                    how: 'Solve 60 SRT situations within 30 minutes.',
                    why: 'To test your mental endurance and consistency in practical reasoning over a longer period.'
                }
            },
            { 
                id: 9, day_number: 9, title: 'Day 9', description: 'Blank Slide Challenge',
                details: {
                    what: 'A creative challenge using the blank TAT slide.',
                    how: 'Write 2 completely different stories for the blank TAT picture.',
                    why: 'To assess your pure imagination and what core themes naturally surface without visual prompts.'
                }
            },
            { 
                id: 10, day_number: 10, title: 'Day 10', description: 'Mini Psychological Battery',
                details: {
                    what: 'A condensed version of the full psychological test.',
                    how: 'Attempt 6 TAT + 30 WAT + 30 SRT consecutively.',
                    why: 'To practice transitioning between different types of psychological tests without losing focus.'
                }
            },
            { 
                id: 11, day_number: 11, title: 'Day 11', description: 'Full Mock Test 1',
                details: {
                    what: 'A complete, full-length psychological test simulation.',
                    how: 'Attempt the complete battery: 12 TAT → 60 WAT → 60 SRT → SDT (15 mins).',
                    why: 'To experience the exact format, pressure, and duration of the actual SSB psychological testing phase.'
                }
            },
            { 
                id: 12, day_number: 12, title: 'Day 12', description: 'Full Mock Test 2',
                details: {
                    what: 'A second complete, full-length psychological test simulation.',
                    how: 'Attempt the full psychology battery again, actively applying improvements from Day 11.',
                    why: 'To verify that you can correct mistakes and perform better under the same full-test conditions.'
                }
            }
        ];
        setDays(mockDays);
        setLoading(false);
    };

    const fetchResources = async (dayNumber: number) => {
        setLoading(true);
        
        // First, fetch from the database
        const { data, error } = await supabase
            .from('challenge_resources')
            .select('*')
            .eq('day_number', dayNumber)
            .order('created_at', { ascending: true });
            
        const dbResources: any[] = data || [];
        
        // Generate hardcoded schedule based on user's plan
        let hardcodedData: any[] = [];
        if (dayNumber === 1) {
            hardcodedData.push({ id: `sdt-1`, day_number: 1, resource_type: 'SDT', content: 'Self Description Test', duration_seconds: 900 });
        } else if (dayNumber === 2) {
            for (let i=1; i<=4; i++) hardcodedData.push({ id: `tat-d2-${i}`, day_number: 2, resource_type: 'TAT', content: `https://picsum.photos/seed/tat-d2-${i}/800/600`, duration_seconds: 240 });
        } else if (dayNumber === 3) {
            const words = ['Accept', 'Action', 'Advantage', 'Aim', 'Alert', 'Attack', 'Attempt', 'Avoid', 'Awake', 'Brave', 'Care', 'Character', 'Cheer', 'Clear', 'Climb', 'Command', 'Company', 'Cooperate', 'Courage', 'Create'];
            words.forEach((w, i) => hardcodedData.push({ id: `wat-d3-${i}`, day_number: 3, resource_type: 'WAT', content: w, duration_seconds: 15 }));
        } else if (dayNumber === 4) {
            for (let i=1; i<=20; i++) hardcodedData.push({ id: `srt-d4-${i}`, day_number: 4, resource_type: 'SRT', content: `Situation ${i}: You are walking alone at night and see...`, duration_seconds: 45 });
        } else if (dayNumber === 5) {
            for (let i=1; i<=4; i++) hardcodedData.push({ id: `tat-d5-${i}`, day_number: 5, resource_type: 'TAT', content: `https://picsum.photos/seed/tat-neg-${i}/800/600`, duration_seconds: 240 });
            const words = ['Accident', 'Afraid', 'Anger', 'Anxiety', 'Attack', 'Bad', 'Beat', 'Blood', 'Bomb', 'Cheat', 'Crisis', 'Danger', 'Dark', 'Death', 'Defeat', 'Delay', 'Destroy', 'Difficult', 'Disaster', 'Disease'];
            words.forEach((w, i) => hardcodedData.push({ id: `wat-d5-${i}`, day_number: 5, resource_type: 'WAT', content: w, duration_seconds: 15 }));
        } else if (dayNumber === 6) {
            for (let i=1; i<=6; i++) hardcodedData.push({ id: `tat-d6-${i}`, day_number: 6, resource_type: 'TAT', content: `https://picsum.photos/seed/tat-d6-${i}/800/600`, duration_seconds: 240 });
        } else if (dayNumber === 7) {
            for (let i=1; i<=60; i++) hardcodedData.push({ id: `wat-d7-${i}`, day_number: 7, resource_type: 'WAT', content: fallbackWATWords[i-1] || `Word ${i}`, duration_seconds: 15 });
        } else if (dayNumber === 8) {
            for (let i=1; i<=60; i++) hardcodedData.push({ id: `srt-d8-${i}`, day_number: 8, resource_type: 'SRT', content: fallbackSRTSituations[i-1] || `Situation ${i}`, duration_seconds: 30 });
        } else if (dayNumber === 9) {
            hardcodedData.push({ id: `tat-d9-1`, day_number: 9, resource_type: 'TAT', content: `BLANK`, duration_seconds: 240 });
            hardcodedData.push({ id: `tat-d9-2`, day_number: 9, resource_type: 'TAT', content: `BLANK`, duration_seconds: 240 });
        } else if (dayNumber === 10) {
            for (let i=1; i<=6; i++) hardcodedData.push({ id: `tat-d10-${i}`, day_number: 10, resource_type: 'TAT', content: i === 6 ? 'BLANK' : `https://picsum.photos/seed/tat-d10-${i}/800/600`, duration_seconds: 240 });
            for (let i=1; i<=30; i++) hardcodedData.push({ id: `wat-d10-${i}`, day_number: 10, resource_type: 'WAT', content: fallbackWATWords[i-1] || `Word ${i}`, duration_seconds: 15 });
            for (let i=1; i<=30; i++) hardcodedData.push({ id: `srt-d10-${i}`, day_number: 10, resource_type: 'SRT', content: fallbackSRTSituations[i-1] || `Situation ${i}`, duration_seconds: 30 });
        } else if (dayNumber === 11 || dayNumber === 12) {
            // Special handling for Mock Test days as per user request
            const tatTag = dayNumber === 11 ? '6' : '5';
            const watTag = dayNumber === 11 ? '8' : '9';
            const srtTag = dayNumber === 11 ? '8' : '9';

            // Fetch TAT from tat_scenarios
            const { data: tatData } = await supabase
                .from('tat_scenarios')
                .select('*')
                .or(`set_tag.eq."${tatTag}",set_tag.eq."Set ${tatTag}",set_tag.eq."SET ${tatTag}"`);
            
            if (tatData && tatData.length > 0) {
                tatData.slice(0, 11).forEach((s, i) => hardcodedData.push({ 
                    id: `tat-d${dayNumber}-${i}`, 
                    day_number: dayNumber, 
                    resource_type: 'TAT', 
                    content: s.image_url, 
                    duration_seconds: 240 
                }));
            } else {
                for (let i=1; i<=11; i++) hardcodedData.push({ id: `tat-d${dayNumber}-${i}`, day_number: dayNumber, resource_type: 'TAT', content: `https://picsum.photos/seed/tat-d${dayNumber}-${i}/800/600`, duration_seconds: 240 });
            }
            // Always add the blank slide as the 12th TAT
            hardcodedData.push({ id: `tat-d${dayNumber}-12`, day_number: dayNumber, resource_type: 'TAT', content: 'BLANK', duration_seconds: 240 });

            // Fetch WAT from wat_words
            const { data: watData } = await supabase
                .from('wat_words')
                .select('*')
                .or(`set_tag.eq."${watTag}",set_tag.eq."Set ${watTag}",set_tag.eq."SET ${watTag}"`);
            
            if (watData && watData.length > 0) {
                watData.slice(0, 60).forEach((w, i) => hardcodedData.push({ 
                    id: `wat-d${dayNumber}-${i}`, 
                    day_number: dayNumber, 
                    resource_type: 'WAT', 
                    content: w.word, 
                    duration_seconds: 15 
                }));
            } else {
                for (let i=1; i<=60; i++) hardcodedData.push({ id: `wat-d${dayNumber}-${i}`, day_number: dayNumber, resource_type: 'WAT', content: fallbackWATWords[i-1] || `Word ${i}`, duration_seconds: 15 });
            }

            // Fetch SRT from srt_questions
            const { data: srtData } = await supabase
                .from('srt_questions')
                .select('*')
                .or(`set_tag.eq."${srtTag}",set_tag.eq."Set ${srtTag}",set_tag.eq."SET ${srtTag}"`);
            
            if (srtData && srtData.length > 0) {
                srtData.slice(0, 60).forEach((s, i) => hardcodedData.push({ 
                    id: `srt-d${dayNumber}-${i}`, 
                    day_number: dayNumber, 
                    resource_type: 'SRT', 
                    content: s.question, 
                    duration_seconds: 30 
                }));
            } else {
                for (let i=1; i<=60; i++) hardcodedData.push({ id: `srt-d${dayNumber}-${i}`, day_number: dayNumber, resource_type: 'SRT', content: fallbackSRTSituations[i-1] || `Situation ${i}`, duration_seconds: 30 });
            }

            hardcodedData.push({ id: `sdt-d${dayNumber}`, day_number: dayNumber, resource_type: 'SDT', content: 'Self Description Test', duration_seconds: 900 });
        }

        // Merge logic: For each resource type expected on this day, use DB resources if available, else hardcoded
        let finalData: any[] = [];
        const expectedTypes = Array.from(new Set(hardcodedData.map(r => r.resource_type)));
        
        if (expectedTypes.length > 0) {
            expectedTypes.forEach(type => {
                const dbOfType = dbResources.filter(r => r.resource_type === type);
                if (dbOfType.length > 0) {
                    finalData = [...finalData, ...dbOfType];
                } else {
                    finalData = [...finalData, ...hardcodedData.filter(r => r.resource_type === type)];
                }
            });
        } else {
            // If no hardcoded types, just use whatever is in DB
            finalData = dbResources;
        }

        // Ensure SDT is present on days 1, 11, 12 even if not in DB or hardcoded (safety net)
        if ([1, 11, 12].includes(dayNumber)) {
            if (!finalData.some(r => r.resource_type === 'SDT')) {
                finalData.push({
                    id: `sdt-auto-${dayNumber}`,
                    day_number: dayNumber,
                    resource_type: 'SDT',
                    content: 'Self Description Test',
                    duration_seconds: 900,
                    created_at: new Date().toISOString()
                });
            }
        }

        setResources(finalData);
        setLoading(false);
    };

    const handleDaySelect = (dayNumber: number) => {
        setSelectedDay(dayNumber);
        fetchResources(dayNumber);
        setIsTesting(false);
        setIsPhaseTransition(false);
        setEvaluationResult(null);
        setAnswers({});
        setCurrentResourceIndex(0);
        setCurrentAnswer('');
        
        // Reset upload states
        setTatUploads({});
        setTatTexts({});
        setWatSheetUploads([]);
        setWatSheetTexts([]);
        setSrtSheetUploads([]);
        setSrtSheetTexts([]);
        setSdtImages({ parents: null, teachers: null, friends: null, self: null, aim: null });
    };

    const getSRTBlock = (startIndex: number) => {
        const block = [];
        for (let i = startIndex; i < resources.length; i++) {
            if (resources[i].resource_type === 'SRT') {
                block.push(resources[i]);
            } else {
                break;
            }
        }
        return block;
    };

    const playBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
            
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

    const resumeTest = () => {
        if (!pendingProgress || pendingProgress.selectedDay !== selectedDay) return;
        
        setIsTesting(true);
        setIsPhaseTransition(false);
        setCurrentResourceIndex(pendingProgress.currentResourceIndex || 0);
        setTestPhase(pendingProgress.testPhase || 'VIEWING');
        setTimeLeft(pendingProgress.timeLeft || -1);
        setIsTimed(pendingProgress.isTimed ?? true);
        setAnswers(pendingProgress.answers || {});
        setTatUploads(pendingProgress.tatUploads || {});
        setTatTexts(pendingProgress.tatTexts || {});
        setWatSheetUploads(pendingProgress.watSheetUploads || []);
        setWatSheetTexts(pendingProgress.watSheetTexts || []);
        setSrtSheetUploads(pendingProgress.srtSheetUploads || []);
        setSrtSheetTexts(pendingProgress.srtSheetTexts || []);
        setSdtImages(pendingProgress.sdtImages || { parents: null, teachers: null, friends: null, self: null, aim: null });
        setSdtAnswers(pendingProgress.sdtAnswers || { parents: '', teachers: '', friends: '', self: '', aim: '' });
        setEvaluationResult(null);
        setFeedbackRating(0);
        setFeedbackText('');
        setFeedbackSubmitted(false);
        setCurrentAttemptId(null);
    };

    const startTest = () => {
        if (resources.length === 0) {
            alert("No resources available for this day yet.");
            return;
        }
        setIsTesting(true);
        setIsPhaseTransition(false);
        setCurrentResourceIndex(0);
        setCurrentAnswer('');
        setSdtAnswers({ parents: '', teachers: '', friends: '', self: '', aim: '' });
        setAnswers({});
        setEvaluationResult(null);
        
        const firstRes = resources[0];
        if (firstRes.resource_type === 'TAT') {
            setTestPhase('VIEWING');
            setTimeLeft(isTimed ? 30 : -1);
        } else {
            setTestPhase('WRITING');
            if (isTimed) {
                if (firstRes.resource_type === 'WAT') {
                    setTimeLeft(15);
                    playBeep();
                }
                else if (firstRes.resource_type === 'SRT') {
                    const srtBlock = getSRTBlock(0);
                    const totalDuration = srtBlock.reduce((acc, curr) => acc + (curr.duration_seconds || 30), 0);
                    setTimeLeft(totalDuration);
                }
                else if (firstRes.resource_type === 'SDT') setTimeLeft(900);
            } else {
                setTimeLeft(-1);
            }
        }
    };

    const handleNext = () => {
        const currentRes = resources[currentResourceIndex];
        let nextIdx = currentResourceIndex + 1;
        
        // If it's SRT, we skip the whole block because they are all shown at once
        if (currentRes.resource_type === 'SRT') {
            const srtBlock = getSRTBlock(currentResourceIndex);
            nextIdx = currentResourceIndex + srtBlock.length;
        }

        const answerToSave = currentRes.resource_type === 'SDT' 
            ? `Parents: ${sdtAnswers.parents}\n\nTeachers: ${sdtAnswers.teachers}\n\nFriends: ${sdtAnswers.friends}\n\nSelf: ${sdtAnswers.self}\n\nAim: ${sdtAnswers.aim}` 
            : currentAnswer;
        
        // For SRT, answers are already updated in the state via individual textareas
        const newAnswers = { ...answers };
        if (currentRes.resource_type !== 'SRT') {
            newAnswers[currentRes.id] = answerToSave;
        }
        setAnswers(newAnswers);
        
        if (nextIdx < resources.length) {
            const nextRes = resources[nextIdx];

            // Check for phase transition
            if (currentRes.resource_type !== nextRes.resource_type) {
                setCurrentResourceIndex(nextIdx - 1); // Point to the last item of current phase for transition logic
                setIsPhaseTransition(true);
                return;
            }

            setCurrentResourceIndex(nextIdx);
            setCurrentAnswer('');
            setSdtAnswers({ parents: '', teachers: '', friends: '', self: '', aim: '' });
            
            const nextResActual = resources[nextIdx];
            if (nextResActual.resource_type === 'TAT') {
                setTestPhase('VIEWING');
                setTimeLeft(isTimed ? 30 : -1);
            } else {
                setTestPhase('WRITING');
                if (isTimed) {
                    if (nextResActual.resource_type === 'WAT') {
                        setTimeLeft(15);
                        playBeep();
                    }
                    else if (nextResActual.resource_type === 'SRT') {
                        const srtBlock = getSRTBlock(nextIdx);
                        const totalDuration = srtBlock.reduce((acc, curr) => acc + (curr.duration_seconds || 30), 0);
                        setTimeLeft(totalDuration);
                    }
                    else if (nextResActual.resource_type === 'SDT') setTimeLeft(900);
                } else {
                    setTimeLeft(-1);
                }
            }
        } else {
            setTestPhase('UPLOAD_ANSWERS');
            setTimeLeft(-1);
        }
    };

    const startNextPhase = () => {
        setIsPhaseTransition(false);
        const nextIdx = currentResourceIndex + 1;
        setCurrentResourceIndex(nextIdx);
        setCurrentAnswer('');
        setSdtAnswers({ parents: '', teachers: '', friends: '', self: '', aim: '' });
        
        const nextRes = resources[nextIdx];
        if (nextRes.resource_type === 'TAT') {
            setTestPhase('VIEWING');
            setTimeLeft(isTimed ? 30 : -1);
        } else {
            setTestPhase('WRITING');
            if (isTimed) {
                if (nextRes.resource_type === 'WAT') {
                    setTimeLeft(15);
                    playBeep();
                }
                else if (nextRes.resource_type === 'SRT') {
                    const srtBlock = getSRTBlock(nextIdx);
                    const totalDuration = srtBlock.reduce((acc, curr) => acc + (curr.duration_seconds || 30), 0);
                    setTimeLeft(totalDuration);
                }
                else if (nextRes.resource_type === 'SDT') setTimeLeft(900);
            } else {
                setTimeLeft(-1);
            }
        }
    };

    const handleCameraCapture = async (base64Data: string) => {
        if (activeCameraKey === null) return;
        
        if (typeof activeCameraKey === 'string' && activeCameraKey.startsWith('tat-')) {
            const resId = activeCameraKey.replace('tat-', '');
            setTatUploads(prev => ({...prev, [resId]: base64Data}));
            transcribeImage(base64Data, resId, 'TAT');
        } else if (activeCameraKey === 'wat') {
            setWatSheetUploads(prev => [...prev, base64Data]);
            transcribeImage(base64Data, watSheetUploads.length, 'WAT');
        } else if (activeCameraKey === 'srt') {
            setSrtSheetUploads(prev => [...prev, base64Data]);
            transcribeImage(base64Data, srtSheetUploads.length, 'SRT');
        } else {
            setSdtImages(prev => ({...prev, [activeCameraKey]: { data: base64Data, mimeType: 'image/jpeg' }}));
        }
        setShowCamera(false);
        setActiveCameraKey(null);
    };

    const transcribeImage = async (base64Data: string, key: string | number, type: 'TAT' | 'WAT' | 'SRT') => {
        try {
            if (type === 'TAT') setTranscribingTat(prev => [...prev, key as string]);
            else if (type === 'WAT') setTranscribingWat(prev => [...prev, key as number]);
            else if (type === 'SRT') setTranscribingSrt(prev => [...prev, key as number]);

            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '' });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
                        { text: "Extract all handwritten or printed text from this image. Return ONLY the text, preserving newlines." }
                    ]
                }
            });
            const text = response.text || '';
            
            if (type === 'TAT') setTatTexts(prev => ({...prev, [key as string]: text}));
            else if (type === 'WAT') setWatSheetTexts(prev => { const n = [...prev]; n[key as number] = text; return n; });
            else if (type === 'SRT') setSrtSheetTexts(prev => { const n = [...prev]; n[key as number] = text; return n; });
        } catch (error) {
            console.error('Transcription error:', error);
        } finally {
            if (type === 'TAT') setTranscribingTat(prev => prev.filter(k => k !== key));
            else if (type === 'WAT') setTranscribingWat(prev => prev.filter(k => k !== key));
            else if (type === 'SRT') setTranscribingSrt(prev => prev.filter(k => k !== key));
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'TAT' | 'WAT' | 'SRT' | 'SDT', key?: string | number) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(file);
            });
            const base64Data = await base64Promise;
            
            if (type === 'TAT' && key) {
                setTatUploads(prev => ({...prev, [key as string]: base64Data}));
                transcribeImage(base64Data, key as string, 'TAT');
            } else if (type === 'WAT') {
                const newIdx = watSheetUploads.length + i;
                setWatSheetUploads(prev => [...prev, base64Data]);
                transcribeImage(base64Data, newIdx, 'WAT');
            } else if (type === 'SRT') {
                const newIdx = srtSheetUploads.length + i;
                setSrtSheetUploads(prev => [...prev, base64Data]);
                transcribeImage(base64Data, newIdx, 'SRT');
            } else if (type === 'SDT' && key) {
                setSdtImages(prev => ({...prev, [key as string]: { data: base64Data, mimeType: file.type }}));
            }
        }
    };

    const submitTest = async () => {
        setIsEvaluating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '' });
            
            // Combine all answers
            const finalAnswers: Record<string, string> = { ...answers };
            
            // Add TAT text
            Object.keys(tatTexts).forEach(key => {
                if (tatTexts[key]) finalAnswers[key] = (finalAnswers[key] ? finalAnswers[key] + '\n\n' : '') + '[Extracted from Image]:\n' + tatTexts[key];
            });
            
            // Add WAT sheets
            if (watSheetTexts.length > 0) {
                finalAnswers['WAT_SHEETS'] = watSheetTexts.join('\n\n---\n\n');
            }
            
            // Add SRT sheets
            if (srtSheetTexts.length > 0) {
                finalAnswers['SRT_SHEETS'] = srtSheetTexts.join('\n\n---\n\n');
            }
            
            // Add SDT
            const sdtRes = resources.find(r => r.resource_type === 'SDT');
            if (sdtRes) {
                finalAnswers[sdtRes.id] = `Parents: ${sdtAnswers.parents}\nTeachers: ${sdtAnswers.teachers}\nFriends: ${sdtAnswers.friends}\nSelf: ${sdtAnswers.self}\nAim: ${sdtAnswers.aim}`;
            }
            
            const hasTAT = resources.some(r => r.resource_type === 'TAT');
            const hasWAT = resources.some(r => r.resource_type === 'WAT');
            const hasSRT = resources.some(r => r.resource_type === 'SRT');
            const hasSDT = resources.some(r => r.resource_type === 'SDT');

            const promptText = `
                You are an expert SSB (Services Selection Board) psychologist with 20 years of experience. Your evaluation must be extremely rigorous, critical, and realistic. 
                ${hasTAT ? `
                CRITICAL INSTRUCTION FOR TAT (Thematic Apperception Test):
                You MUST compare each candidate's story to its corresponding stimulus picture. 
                - If the story is unrelated to the picture, give a very low score (Score < 2).
                - For EACH TAT story, provide a "detailedAssessment" focusing on specific improvements needed or identified OLQ (Officer Like Quality) gaps. Do not provide generic strengths/weaknesses at the top level; put them here.
                ` : ''}
                ${hasWAT ? `
                CRITICAL INSTRUCTION FOR WAT (Word Association Test):
                - For each WAT word that the candidate did not attempt (No response) or where the score is low (Score < 5), you MUST provide a "suggestedAnswer" (a model spontaneous, positive, and meaningful sentence).
                ` : ''}
                ${hasSRT ? `
                CRITICAL INSTRUCTION FOR SRT (Situation Reaction Test):
                - For each SRT situation that the candidate did not attempt (No response), you MUST provide a "suggestedAnswer" (a model practical, effective, and socially responsible reaction).
                ` : ''}
                ${hasSDT ? `
                CRITICAL INSTRUCTION FOR SDT (Self Description Test):
                - Evaluate each of the 5 sections (Parents, Teachers, Friends, Self, Aim) SEPARATELY. Return 5 separate items in the individualEvaluations array for SDT, one for each section.
                - If a section is missing or blank, give it a score of 0 and deduct points from the overall score.
                - If the candidate writes or uploads a TAT story (or any irrelevant content) in an SDT section, FLAG IT as irrelevant, give it a score of 0, and DO NOT evaluate it as a TAT story.
                ` : ''}

                Evaluate the candidate's responses for the 12-Day Challenge.
                
                CRITICAL INSTRUCTION ON MISSING ENTRIES:
                You MUST heavily penalize the OVERALL SCORE if the candidate fails to attempt any of the provided stimuli that were part of this day's challenge. 
                For example, if 4 TAT pictures were shown and the candidate only wrote 2 stories, the overall score must be significantly reduced to reflect the missing entries. 
                A score of 0 must be given to any individual unattempted item.
                NOTE: For WAT and SRT, candidates might upload handwritten sheets. If "TRANSCRIBED WAT SHEETS" or "TRANSCRIBED SRT SHEETS" are provided, you MUST extract their answers from those transcriptions and match them to the stimuli sequentially. Do NOT mark them as "No response" if their answer is present in the transcribed sheets or the uploaded images.

                Candidate PIQ Summary:
                Name: ${piqData?.name || 'Unknown'}
                Education: ${piqData?.education?.[0]?.qualification || 'N/A'}
                Hobbies: ${piqData?.activities?.hobbies || 'N/A'}
                
                EVALUATION CRITERIA:
                ${hasTAT ? '1. TAT: Relevance, structure, hero\'s character, and OLQs.' : ''}
                ${hasWAT ? '2. WAT: Spontaneity, positivity, and meaning.' : ''}
                ${hasSRT ? '3. SRT: Practicality, effectiveness, and responsibility.' : ''}
                ${hasSDT ? '4. SDT: Consistency, self-awareness, and relevance to the specific section.' : ''}

                Provide an overall score and general recommendations. Then, provide an individual evaluation for EACH item ${hasSDT ? '(including the 5 SDT sections separately)' : ''}.
                ONLY evaluate the tests that were actually part of this day's challenge. Do not penalize the candidate for missing tests if they were not asked for.
            `;
            
            const parts: any[] = [{ text: promptText }];

            // Add Stimuli and Responses in a structured way
            for (const r of resources) {
                if (r.resource_type === 'TAT') {
                    // Add Stimulus Image if it's a URL
                    if (r.content && r.content.startsWith('http')) {
                        try {
                            const imgRes = await fetch(r.content);
                            const blob = await imgRes.blob();
                            const base64 = await new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                                reader.readAsDataURL(blob);
                            });
                            parts.push({ inlineData: { data: base64, mimeType: blob.type } });
                            parts.push({ text: `STIMULUS PICTURE for TAT (ID: ${r.id})` });
                        } catch (e) {
                            console.error("Failed to fetch stimulus image", e);
                            parts.push({ text: `STIMULUS PICTURE URL for TAT (ID: ${r.id}): ${r.content}` });
                        }
                    } else {
                        parts.push({ text: `STIMULUS CONTENT for TAT (ID: ${r.id}): ${r.content}` });
                    }

                    // Add Candidate's Response
                    if (tatUploads[r.id]) {
                        parts.push({ inlineData: { data: tatUploads[r.id], mimeType: 'image/jpeg' } });
                        parts.push({ text: `CANDIDATE'S HANDWRITTEN STORY for TAT (ID: ${r.id})` });
                    }
                    if (finalAnswers[r.id]) {
                        parts.push({ text: `CANDIDATE'S TRANSCRIBED/TYPED STORY for TAT (ID: ${r.id}):\n${finalAnswers[r.id]}` });
                    }
                }
            }
            
            // Add WAT sheets
            watSheetUploads.forEach((sheet, idx) => {
                parts.push({ inlineData: { data: sheet, mimeType: 'image/jpeg' } });
                parts.push({ text: `Handwritten WAT Sheet ${idx + 1}` });
            });
            
            // Add SRT sheets
            srtSheetUploads.forEach((sheet, idx) => {
                parts.push({ inlineData: { data: sheet, mimeType: 'image/jpeg' } });
                parts.push({ text: `Handwritten SRT Sheet ${idx + 1}` });
            });
            
            // Add SDT images
            Object.keys(sdtImages).forEach(key => {
                if (sdtImages[key]) {
                    parts.push({ inlineData: { data: sdtImages[key].data, mimeType: sdtImages[key].mimeType } });
                    parts.push({ text: `Handwritten ${key} paragraph for SDT` });
                }
            });

            // Add non-TAT resources summary
            const nonTatSummary = resources.filter(r => r.resource_type !== 'TAT').map(r => `
                Type: ${r.resource_type}
                ID: ${r.id}
                Stimulus: ${r.content}
                Typed Response: ${finalAnswers[r.id] || 'No typed response'}
            `).join('\n');
            
            let otherTestsText = `OTHER TEST RESPONSES (WAT, SRT, SDT):\n${nonTatSummary}\n`;
            
            if (watSheetTexts.length > 0) {
                otherTestsText += `\n--- TRANSCRIBED WAT SHEETS ---\nThe candidate uploaded handwritten WAT sheets. Here is the transcription. Please match these responses to the WAT stimuli above in sequential order:\n${watSheetTexts.join('\n\n')}\n`;
            }
            if (srtSheetTexts.length > 0) {
                otherTestsText += `\n--- TRANSCRIBED SRT SHEETS ---\nThe candidate uploaded handwritten SRT sheets. Here is the transcription. Please match these responses to the SRT stimuli above in sequential order:\n${srtSheetTexts.join('\n\n')}\n`;
            }
            
            parts.push({ text: otherTestsText });
            
            const response = await ai.models.generateContent({
                model: 'gemini-3.1-pro-preview',
                contents: { parts },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            score: { type: Type.NUMBER, description: "Overall score out of 10" },
                            recommendations: { type: Type.STRING },
                            individualEvaluations: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        resourceId: { type: Type.STRING },
                                        type: { type: Type.STRING, description: "TAT, WAT, SRT, or SDT (specify section)" },
                                        stimulus: { type: Type.STRING },
                                        score: { type: Type.NUMBER },
                                        comments: { type: Type.STRING },
                                        detailedAssessment: { type: Type.STRING, description: "For TAT: improvements or OLQ gaps. Leave empty for others if not applicable." },
                                        suggestedAnswer: { type: Type.STRING, description: "For WAT/SRT: model response if unattempted or low score. Leave empty otherwise." }
                                    },
                                    required: ["resourceId", "type", "stimulus", "score", "comments"]
                                }
                            }
                        },
                        required: ["score", "recommendations", "individualEvaluations"]
                    }
                }
            });
            
            const result = JSON.parse(response.text || '{}');
            setEvaluationResult(result);
            
            if (userId) {
                const attempt = await saveTestAttempt(userId, 'CHALLENGE_14_DAY', {
                    day: selectedDay,
                    score: result.score,
                    recommendations: result.recommendations,
                    individualEvaluations: result.individualEvaluations,
                    answers: finalAnswers,
                    tatImages: tatUploads,
                    watImages: watSheetUploads,
                    srtImages: srtSheetUploads,
                    sdtImages: sdtImages
                });
                if (attempt?.id) {
                    setCurrentAttemptId(attempt.id);
                }
                await fetchUserProgress();
            }
        } catch (error) {
            console.error("Evaluation error:", error);
            alert("Failed to evaluate. Please try again.");
        } finally {
            setIsEvaluating(false);
            setIsTesting(false);
        }
    };

    if (loading && !selectedDay && days.length === 0) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-yellow-600" size={48} /></div>;
    }

    const submitFeedback = async () => {
        if (!currentAttemptId || feedbackRating === 0) return;
        
        try {
            const { data: currentAttempt } = await supabase
                .from('test_history')
                .select('result_data')
                .eq('id', currentAttemptId)
                .single();
                
            if (currentAttempt) {
                let resData = currentAttempt.result_data;
                if (typeof resData === 'string') {
                    try { resData = JSON.parse(resData); } catch (e) {}
                }
                const updatedResultData = {
                    ...resData,
                    userFeedback: {
                        rating: feedbackRating,
                        text: feedbackText,
                        submittedAt: new Date().toISOString()
                    }
                };
                
                await supabase
                    .from('test_history')
                    .update({ result_data: updatedResultData })
                    .eq('id', currentAttemptId);
                    
                if (userId) {
                    await submitUserFeedback(userId, `12-Day Challenge (Day ${selectedDay})`, feedbackRating, feedbackText);
                }
                    
                setFeedbackSubmitted(true);
                await fetchUserProgress(); // Refresh progress data
            }
        } catch (error) {
            console.error("Failed to submit feedback:", error);
        }
    };

    if (isTesting) {
        const currentRes = resources[currentResourceIndex];
        const isTAT = currentRes?.resource_type === 'TAT';
        const isWAT = currentRes?.resource_type === 'WAT';
        const isSRT = currentRes?.resource_type === 'SRT';
        const isSDT = currentRes?.resource_type === 'SDT';

        if (isPhaseTransition) {
            const nextRes = resources[currentResourceIndex + 1];
            return (
                <div className="fixed inset-0 z-[250] bg-slate-900 flex items-center justify-center p-6 text-center animate-in fade-in duration-500">
                    <div className="max-w-md w-full space-y-8">
                        <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto text-yellow-400 mb-6">
                            <CheckCircle size={48} />
                        </div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Phase Completed</h2>
                        <p className="text-slate-400 text-lg">You have completed the current phase. Take a breath and click below to start the next one.</p>
                        <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-4 text-blue-400 text-sm font-medium">
                            💡 Tip: You can write your answers on paper and upload a photo of them at the end of the test.
                        </div>
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Next Phase</div>
                            <div className="text-2xl font-black text-white uppercase tracking-tight">{nextRes?.resource_type} Test</div>
                        </div>
                        <button 
                            onClick={startNextPhase}
                            className="w-full py-5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl font-black text-xl transition-all shadow-xl shadow-yellow-500/20 flex items-center justify-center gap-3"
                        >
                            <Play size={24} fill="currentColor" /> Start {nextRes?.resource_type}
                        </button>
                    </div>
                </div>
            );
        }

        if (isTAT && testPhase === 'VIEWING') {
            return (
                <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center animate-in fade-in duration-500 cursor-none">
                    {currentRes.content === 'BLANK' ? (
                        <div className="text-center p-40">
                            <div className="text-slate-800 font-black text-[10rem] uppercase tracking-[0.5em] opacity-20 transform -rotate-12">BLANK</div>
                            <p className="text-slate-500 font-black uppercase tracking-[0.6em] text-xl mt-8">Prepare Final Story</p>
                        </div>
                    ) : (
                        <img src={currentRes.content} className="w-full h-full object-contain grayscale contrast-[1.4]" alt="Stimulus" referrerPolicy="no-referrer" />
                    )}
                    {isTimed && timeLeft >= 0 && (
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900">
                            <div className="h-full bg-slate-700 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 30) * 100}%` }} />
                        </div>
                    )}
                    <button onClick={() => { setTestPhase('WRITING'); setTimeLeft(isTimed ? 240 : -1); }} className="absolute bottom-6 right-6 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-all z-50 cursor-pointer">
                        Skip Viewing
                    </button>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 z-[200] bg-slate-50 text-slate-900 flex flex-col animate-in fade-in duration-500 overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsTesting(false)} className="text-slate-500 hover:text-slate-900 transition-colors">
                            <ArrowLeft size={24} />
                        </button>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Day {selectedDay} Challenge</h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-slate-500 font-bold text-sm bg-slate-100 px-4 py-2 rounded-xl uppercase tracking-widest">
                            {testPhase === 'UPLOAD_ANSWERS' ? 'FINAL REVIEW' : `${isTAT ? 'TAT' : isWAT ? 'WAT' : isSRT ? 'SRT' : 'SDT'} • ${currentResourceIndex + 1} / ${resources.length}`}
                        </div>
                        {isTimed && timeLeft >= 0 && testPhase !== 'UPLOAD_ANSWERS' && (
                            <div className={`px-5 py-2 rounded-xl border-2 font-mono text-xl font-black flex items-center gap-2 transition-all ${timeLeft < 10 ? 'border-red-500 text-red-600 bg-red-50 animate-pulse' : 'border-slate-200 text-slate-700 bg-white'}`}>
                                <Timer size={20} className={timeLeft < 10 ? 'text-red-600' : 'text-slate-500'} />
                                {formatTime(timeLeft)}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Content Area */}
                {testPhase === 'UPLOAD_ANSWERS' ? (
                    <div className="flex-1 flex flex-col p-6 md:p-12 max-w-5xl mx-auto w-full gap-8">
                        <div className="text-center space-y-6 mb-8">
                            <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Dossier Submission</h2>
                            <p className="text-slate-500 font-medium italic">"Upload your written responses for psychometric evaluation."</p>
                        </div>

                        {resources.filter(r => r.resource_type === 'TAT').length > 0 && (
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
                                <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3"><FileText className="text-blue-600" size={28}/> TAT Stories</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {resources.filter(r => r.resource_type === 'TAT').map((res, index) => {
                                        const hasImage = !!tatUploads[res.id];
                                        const isTranscribing = transcribingTat.includes(res.id);
                                        return (
                                            <div key={res.id} className={`bg-slate-50 rounded-3xl p-6 border-2 relative overflow-hidden transition-all ${hasImage ? 'border-yellow-200 shadow-md' : 'border-slate-200 shadow-sm'}`}>
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="font-black text-slate-400 text-xl select-none">{(index + 1).toString().padStart(2, '0')}</span>
                                                    {hasImage && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-bold uppercase">Uploaded</span>}
                                                </div>
                                                {hasImage ? (
                                                    <div className="space-y-4">
                                                        <div className="relative rounded-2xl overflow-hidden bg-slate-100 h-32 border border-slate-200 group">
                                                            <img src={`data:image/jpeg;base64,${tatUploads[res.id]}`} className="w-full h-full object-cover" alt="Upload" />
                                                            <button onClick={() => { setTatUploads(prev => { const n = {...prev}; delete n[res.id]; return n; }); setTatTexts(prev => { const n = {...prev}; delete n[res.id]; return n; }); }} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                                                        </div>
                                                        {isTranscribing ? (
                                                            <div className="flex items-center gap-2 text-xs text-blue-600 font-bold animate-pulse"><Loader2 size={12} className="animate-spin" /> Transcribing...</div>
                                                        ) : (
                                                            <div className="relative">
                                                                <textarea value={tatTexts[res.id] || ''} onChange={(e) => setTatTexts(prev => ({...prev, [res.id]: e.target.value}))} className="w-full text-xs p-3 bg-white rounded-xl resize-none outline-none border border-slate-200 focus:border-slate-400 h-24" placeholder="AI Transcript or type here..." />
                                                                <div className="absolute bottom-2 right-2 text-slate-400"><Edit size={12} /></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        <textarea value={answers[res.id] || ''} onChange={(e) => setAnswers(prev => ({...prev, [res.id]: e.target.value}))} className="w-full text-xs p-3 bg-white rounded-xl resize-none outline-none border border-slate-200 focus:border-slate-400 h-24 mb-2" placeholder="Type story here..." />
                                                        <label className="w-full h-12 bg-white rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center gap-2 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer">
                                                            <Upload size={14} /> <span className="text-[10px] font-black uppercase tracking-widest">Upload File</span>
                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'TAT', res.id)} />
                                                        </label>
                                                        <button onClick={() => { setActiveCameraKey(`tat-${res.id}`); setShowCamera(true); }} className="w-full h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"><Camera size={14} /> Camera</button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {resources.filter(r => r.resource_type === 'WAT').length > 0 && (
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                                <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3"><Upload className="text-blue-600" size={28}/> WAT Handwritten Response Verification</h3>
                                <div className="space-y-6 mb-8">
                                    {watSheetUploads.map((img, idx) => (
                                        <div key={idx} className="flex flex-col md:flex-row gap-6 p-4 rounded-3xl border border-slate-100 bg-slate-50">
                                            <div className="w-full md:w-1/3 relative rounded-2xl overflow-hidden aspect-[3/4] border-2 border-slate-200 shadow-sm group shrink-0">
                                                <img src={`data:image/jpeg;base64,${img}`} className="w-full h-full object-cover" alt={`Sheet ${idx + 1}`} />
                                                <button onClick={() => { setWatSheetUploads(prev => prev.filter((_, i) => i !== idx)); setWatSheetTexts(prev => prev.filter((_, i) => i !== idx)); }} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shadow-lg"><Trash2 size={14} /></button>
                                            </div>
                                            <div className="w-full md:w-2/3 flex flex-col">
                                                <textarea value={watSheetTexts[idx] || ""} onChange={(e) => { const val = e.target.value; setWatSheetTexts(prev => { const next = [...prev]; next[idx] = val; return next; }); }} placeholder={transcribingWat.includes(idx) ? "AI is reading..." : "Transcript..."} className="flex-1 w-full p-4 bg-white border border-slate-200 rounded-2xl focus:border-blue-500 outline-none transition-all font-mono text-sm text-slate-700 resize-none min-h-[200px]" />
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex gap-4">
                                        <label className="flex-1 flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-100 hover:border-slate-400 transition-all p-8 group">
                                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:bg-slate-200 transition-colors"><Upload size={24} className="text-slate-400 group-hover:text-slate-600"/></div>
                                            <span className="text-xs font-black uppercase text-slate-400 group-hover:text-slate-600 tracking-widest">Upload WAT Sheets</span>
                                            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'WAT')} />
                                        </label>
                                        <button onClick={() => { setActiveCameraKey('wat'); setShowCamera(true); }} className="flex-1 flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-100 hover:border-slate-400 transition-all p-8 group">
                                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:bg-slate-200 transition-colors"><Camera size={24} className="text-slate-400 group-hover:text-slate-600"/></div>
                                            <span className="text-xs font-black uppercase text-slate-400 group-hover:text-slate-600 tracking-widest">Camera</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-8">
                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Or Review Typed Answers</h4>
                                    <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                                        {resources.filter(r => r.resource_type === 'WAT').map((res, idx) => (
                                            <div key={res.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <span className="text-slate-400 font-bold w-6">{idx + 1}.</span>
                                                <span className="text-slate-800 font-black w-32 truncate">{res.content}</span>
                                                <input type="text" value={answers[res.id] || ''} onChange={(e) => setAnswers(prev => ({...prev, [res.id]: e.target.value}))} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-slate-400" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {resources.filter(r => r.resource_type === 'SRT').length > 0 && (
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                                <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3"><Upload className="text-blue-600" size={28}/> SRT Handwritten Response Verification</h3>
                                <div className="space-y-6 mb-8">
                                    {srtSheetUploads.map((img, idx) => (
                                        <div key={idx} className="flex flex-col md:flex-row gap-6 p-4 rounded-3xl border border-slate-100 bg-slate-50">
                                            <div className="w-full md:w-1/3 relative rounded-2xl overflow-hidden aspect-[3/4] border-2 border-slate-200 shadow-sm group shrink-0">
                                                <img src={`data:image/jpeg;base64,${img}`} className="w-full h-full object-cover" alt={`Sheet ${idx + 1}`} />
                                                <button onClick={() => { setSrtSheetUploads(prev => prev.filter((_, i) => i !== idx)); setSrtSheetTexts(prev => prev.filter((_, i) => i !== idx)); }} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shadow-lg"><Trash2 size={14} /></button>
                                            </div>
                                            <div className="w-full md:w-2/3 flex flex-col">
                                                <textarea value={srtSheetTexts[idx] || ""} onChange={(e) => { const val = e.target.value; setSrtSheetTexts(prev => { const next = [...prev]; next[idx] = val; return next; }); }} placeholder={transcribingSrt.includes(idx) ? "AI is reading..." : "Transcript..."} className="flex-1 w-full p-4 bg-white border border-slate-200 rounded-2xl focus:border-blue-500 outline-none transition-all font-mono text-sm text-slate-700 resize-none min-h-[200px]" />
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex gap-4">
                                        <label className="flex-1 flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-100 hover:border-slate-400 transition-all p-8 group">
                                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:bg-slate-200 transition-colors"><Upload size={24} className="text-slate-400 group-hover:text-slate-600"/></div>
                                            <span className="text-xs font-black uppercase text-slate-400 group-hover:text-slate-600 tracking-widest">Upload SRT Sheets</span>
                                            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'SRT')} />
                                        </label>
                                        <button onClick={() => { setActiveCameraKey('srt'); setShowCamera(true); }} className="flex-1 flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-100 hover:border-slate-400 transition-all p-8 group">
                                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:bg-slate-200 transition-colors"><Camera size={24} className="text-slate-400 group-hover:text-slate-600"/></div>
                                            <span className="text-xs font-black uppercase text-slate-400 group-hover:text-slate-600 tracking-widest">Camera</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-8">
                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Or Review Typed Answers</h4>
                                    <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                                        {resources.filter(r => r.resource_type === 'SRT').map((res, idx) => (
                                            <div key={res.id} className="flex flex-col gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <span className="text-slate-800 font-bold">{idx + 1}. {res.content}</span>
                                                <textarea value={answers[res.id] || ''} onChange={(e) => setAnswers(prev => ({...prev, [res.id]: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-400 min-h-[80px]" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {resources.filter(r => r.resource_type === 'SDT').length > 0 && (
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                                <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3"><Brain className="text-blue-600" size={28}/> SDT Verification</h3>
                                <div className="space-y-6">
                                    {[
                                        { label: "1. What do your Parents think of you?", key: 'parents' },
                                        { label: "2. What do your Teachers / Employers think?", key: 'teachers' },
                                        { label: "3. What do your Friends / Colleagues think?", key: 'friends' },
                                        { label: "4. What is your own opinion of yourself?", key: 'self' },
                                        { label: "5. What kind of person do you want to become?", key: 'aim' }
                                    ].map((section, idx) => (
                                        <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                            <div className="flex justify-between items-center mb-4">
                                                <label className="block text-sm font-black text-slate-700 uppercase tracking-wide">{section.label}</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="file" id={`file-${String(section.key)}`} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'SDT', section.key)} />
                                                    {sdtImages[section.key] ? (
                                                        <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-xl border border-yellow-100">
                                                            <ImageIcon size={14} className="text-yellow-600" />
                                                            <span className="text-[10px] font-bold text-yellow-700 uppercase">Image Attached</span>
                                                            <button onClick={() => setSdtImages(prev => ({...prev, [section.key]: null}))} className="ml-1 p-1 hover:bg-red-100 rounded-full text-red-500 transition-colors"><Trash2 size={12} /></button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <label htmlFor={`file-${String(section.key)}`} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-xl cursor-pointer transition-all text-[10px] font-bold uppercase tracking-wide"><Upload size={12} /> Upload File</label>
                                                            <button onClick={() => { setActiveCameraKey(section.key); setShowCamera(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white hover:bg-black rounded-xl cursor-pointer transition-all text-[10px] font-bold uppercase tracking-wide"><Camera size={12} /> Camera</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4">
                                                <textarea value={(sdtAnswers as any)[section.key]} onChange={(e) => setSdtAnswers({...sdtAnswers, [section.key]: e.target.value})} className="w-full h-32 p-4 bg-white border border-slate-200 rounded-xl resize-none focus:border-slate-400 outline-none transition-all font-medium text-slate-700" />
                                                {sdtImages[section.key] && (
                                                    <div className="h-40 bg-white rounded-xl border border-slate-200 overflow-hidden relative group">
                                                        <img src={`data:${sdtImages[section.key].mimeType};base64,${sdtImages[section.key].data}`} alt="Upload Preview" className="w-full h-full object-contain p-2" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={() => submitTest()}
                                disabled={isEvaluating}
                                className="px-10 py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all disabled:opacity-50 text-xl shadow-xl shadow-slate-900/20"
                            >
                                {isEvaluating ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
                                Submit for Evaluation
                            </button>
                        </div>
                        <CameraModal isOpen={showCamera} onClose={() => setShowCamera(false)} onCapture={handleCameraCapture} />
                        
                        {isEvaluating && (
                            <div className="fixed inset-0 z-[300] bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                                <div className="w-32 h-32 relative mb-8">
                                    <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-t-yellow-500 border-r-yellow-500 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Brain className="text-yellow-500 animate-pulse" size={40} />
                                    </div>
                                </div>
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">Evaluating Your Responses</h2>
                                <p className="text-slate-400 text-lg max-w-md mx-auto mb-12">Our AI psychologist is analyzing your answers to provide detailed feedback.</p>
                                
                                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 max-w-lg w-full min-h-[120px] flex items-center justify-center transition-all duration-500">
                                    <p className="text-slate-300 text-lg italic font-medium text-center animate-in fade-in slide-in-from-bottom-2">
                                        "{EVALUATION_TIPS[evaluationTipIndex]}"
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-6 md:p-12 gap-8">
                    
                    {/* Stimulus */}
                    {isTAT ? (
                        <div className="bg-slate-950 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden min-h-[30vh]">
                            <FileText className="text-yellow-500 w-16 h-16 mb-6 animate-pulse" />
                            <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Writing Phase</h3>
                            <p className="text-slate-400 text-lg font-medium mt-2">Write your story based on the picture shown.</p>
                        </div>
                    ) : isSDT ? (
                        <div className="bg-slate-900 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden min-h-[20vh]">
                            <Brain className="text-yellow-500 w-16 h-16 mb-6 animate-pulse" />
                            <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Self Description Test</h3>
                            <p className="text-slate-400 text-lg font-medium mt-2">Answer the following 5 questions honestly.</p>
                        </div>
                    ) : isSRT ? (
                        <div className="bg-slate-900 rounded-[3rem] p-8 md:p-12 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                            <Activity className="text-yellow-500 w-12 h-12 mb-4 animate-pulse" />
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Situation Reaction Test</h3>
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">Respond to all situations below before time runs out.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[3rem] p-12 md:p-24 text-center shadow-xl border border-slate-100 min-h-[40vh] flex flex-col items-center justify-center relative">
                            <h1 className={`${isWAT ? 'text-[4rem] md:text-[6rem] lg:text-[8rem] uppercase' : 'text-3xl md:text-5xl italic'} font-black text-slate-900 tracking-tight leading-tight`}>
                                {isWAT ? currentRes?.content : `"${currentRes?.content}"`}
                            </h1>
                        </div>
                    )}
                    
                    {/* Input Area */}
                    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 flex flex-col gap-6">
                        {!isSRT && (
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Target size={16} className="text-yellow-500" /> Your Response
                                </label>
                            </div>
                        )}
                        
                        {isWAT ? (
                            <input
                                type="text"
                                value={currentAnswer}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                placeholder="Type your spontaneous thought..."
                                className="w-full bg-slate-50 p-6 text-xl md:text-2xl font-bold text-center border-b-4 border-slate-300 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300 rounded-t-2xl"
                                autoFocus
                            />
                        ) : isSDT ? (
                            <div className="space-y-6">
                                {[
                                    { label: "1. What do your Parents think of you?", key: 'parents' },
                                    { label: "2. What do your Teachers / Employers think?", key: 'teachers' },
                                    { label: "3. What do your Friends / Colleagues think?", key: 'friends' },
                                    { label: "4. What is your own opinion of yourself?", key: 'self' },
                                    { label: "5. What kind of person do you want to become?", key: 'aim' }
                                ].map((section, idx) => (
                                    <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                        <label className="block text-sm font-black text-slate-700 uppercase tracking-wide mb-4">{section.label}</label>
                                        <textarea
                                            value={sdtAnswers[section.key]}
                                            onChange={(e) => setSdtAnswers({...sdtAnswers, [section.key]: e.target.value})}
                                            className="w-full h-32 p-4 bg-white border border-slate-200 rounded-xl resize-none focus:border-slate-900 outline-none transition-all font-medium text-slate-700"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : isSRT ? (
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                {getSRTBlock(currentResourceIndex).map((item, idx) => (
                                    <div key={item.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative">
                                        <div className="flex gap-4">
                                            <span className="text-slate-300 font-black text-2xl select-none">{(idx + 1).toString().padStart(2, '0')}</span>
                                            <div className="flex-1 space-y-3">
                                                <p className="text-lg font-bold text-slate-800 leading-snug">{item.content}</p>
                                                <textarea 
                                                    value={answers[item.id] || ''} 
                                                    onChange={(e) => setAnswers(prev => ({ ...prev, [item.id]: e.target.value }))} 
                                                    placeholder="Type your reaction..." 
                                                    className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:border-slate-900 outline-none transition-all font-medium text-slate-700 min-h-[100px] resize-none" 
                                                />
                                            </div>
                                        </div>
                                        {answers[item.id] && answers[item.id].trim() && (
                                            <div className="absolute top-6 right-6 text-yellow-500 animate-in fade-in zoom-in">
                                                <CheckCircle size={20} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <textarea
                                value={currentAnswer}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                placeholder={isTAT ? "Write your story here..." : "Type your reaction..."}
                                className="w-full min-h-[200px] p-6 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 resize-y text-lg text-slate-800 placeholder-slate-400 transition-all outline-none"
                                autoFocus
                            />
                        )}
                        
                        <div className="flex justify-end pt-4 border-t border-slate-100 gap-4">
                            <button
                                onClick={handleNext}
                                className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                <FastForward size={20} /> Skip (Dev)
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={(isSDT ? !Object.values(sdtAnswers).some(val => val.trim()) : !currentAnswer.trim()) || isEvaluating}
                                className="px-8 py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-black flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:hover:bg-slate-900 text-lg shadow-lg shadow-slate-900/20"
                            >
                                {isEvaluating ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                {isSRT ? (
                                    (currentResourceIndex + getSRTBlock(currentResourceIndex).length) < resources.length ? 'Next Phase' : 'Finish Test'
                                ) : (
                                    currentResourceIndex < resources.length - 1 ? 'Next Resource' : 'Finish Test'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                )}
                
                {/* Progress Bar */}
                {isTimed && timeLeft >= 0 && testPhase !== 'UPLOAD_ANSWERS' && (
                    <div className="fixed bottom-0 left-0 h-1.5 bg-slate-200 w-full z-50">
                        <div 
                            className="h-full bg-slate-900 transition-all duration-1000 ease-linear"
                            style={{ 
                                width: `${(timeLeft / (
                                    isTAT ? 240 : 
                                    isSRT ? (getSRTBlock(currentResourceIndex).reduce((acc, curr) => acc + (curr.duration_seconds || 30), 0)) : 
                                    isSDT ? 900 : 
                                    15
                                )) * 100}%` 
                            }}
                        />
                    </div>
                )}
            </div>
        );
    }

    if (evaluationResult) {
        // Calculate breakdown
        const breakdown: Record<string, { total: number, count: number }> = {};
        if (evaluationResult.individualEvaluations) {
            evaluationResult.individualEvaluations.forEach((item: any) => {
                const type = item.type || 'Unknown';
                // Group SDT sections under 'SDT'
                const mainType = type.startsWith('SDT') ? 'SDT' : type;
                if (!breakdown[mainType]) breakdown[mainType] = { total: 0, count: 0 };
                breakdown[mainType].total += (Number(item.score) || 0);
                breakdown[mainType].count += 1;
            });
        }
        
        const breakdownElements = Object.keys(breakdown).map(type => {
            const avg = (breakdown[type].total / breakdown[type].count).toFixed(1);
            return (
                <div key={type} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 text-center flex-1 min-w-[120px]">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{type}</h4>
                    <div className="text-3xl font-black text-white">{avg}<span className="text-sm text-slate-500">/10</span></div>
                </div>
            );
        });

        return (
            <div className="fixed inset-0 z-[200] bg-slate-900 overflow-y-auto animate-in fade-in duration-500">
                <div className="max-w-4xl mx-auto py-12 px-6">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yellow-500/20 text-yellow-400 mb-6 shadow-[0_0_40px_rgba(234,179,8,0.2)]">
                            <CheckCircle size={48} />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Evaluation Complete</h2>
                        <p className="text-slate-400 mt-4 text-xl">Here is your AI-generated feedback for Day {selectedDay}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="md:col-span-1 bg-yellow-900/20 rounded-3xl p-8 border border-yellow-500/20 text-center flex flex-col justify-center backdrop-blur-sm">
                            <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest mb-4">Overall Score</h3>
                            <div className="text-7xl font-black text-white">{evaluationResult.score}<span className="text-3xl text-yellow-500/50">/10</span></div>
                        </div>
                        <div className="md:col-span-2 bg-slate-800/50 rounded-3xl p-8 border border-slate-700 backdrop-blur-sm">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">General Recommendations</h3>
                            <p className="text-slate-300 leading-relaxed text-lg">{evaluationResult.recommendations}</p>
                        </div>
                    </div>

                    {/* Score Meaning Legend */}
                    <div className="mb-12">
                        <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">What does your score mean?</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-slate-900/50 rounded-xl p-4 border border-yellow-500/20">
                                    <div className="text-yellow-400 font-black text-xl mb-1">8 - 10</div>
                                    <div className="text-slate-300 text-sm font-bold mb-1">Excellent (Recommended)</div>
                                    <div className="text-slate-500 text-xs">Strong presence of Officer Like Qualities (OLQs). Highly relevant and positive.</div>
                                </div>
                                <div className="bg-slate-900/50 rounded-xl p-4 border border-blue-500/20">
                                    <div className="text-blue-400 font-black text-xl mb-1">6 - 7</div>
                                    <div className="text-slate-300 text-sm font-bold mb-1">Good (Borderline)</div>
                                    <div className="text-slate-500 text-xs">Acceptable responses but lacks depth or polish. Needs slight improvement.</div>
                                </div>
                                <div className="bg-slate-900/50 rounded-xl p-4 border border-amber-500/20">
                                    <div className="text-amber-400 font-black text-xl mb-1">4 - 5</div>
                                    <div className="text-slate-300 text-sm font-bold mb-1">Below Average</div>
                                    <div className="text-slate-500 text-xs">Weak responses, lack of practicality, or missing key details. Needs significant work.</div>
                                </div>
                                <div className="bg-slate-900/50 rounded-xl p-4 border border-red-500/20">
                                    <div className="text-red-400 font-black text-xl mb-1">0 - 3</div>
                                    <div className="text-slate-300 text-sm font-bold mb-1">Poor (Not Recommended)</div>
                                    <div className="text-slate-500 text-xs">Irrelevant, negative, unrealistic, or unattempted responses.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {evaluationResult.individualEvaluations && evaluationResult.individualEvaluations.length > 0 && (
                        <div className="mb-12">
                            <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                                <FileText className="text-yellow-500" /> Detailed Test Assessment
                            </h3>
                            <div className="space-y-6">
                                {evaluationResult.individualEvaluations.map((item: any, i: number) => (
                                    <div key={i} className="bg-slate-800/40 border border-slate-700 rounded-3xl p-8 hover:bg-slate-800/60 transition-all shadow-lg">
                                        <div className="flex justify-between items-start gap-4 mb-6">
                                            <div>
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 inline-block ${
                                                    item.type === 'TAT' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                                                    item.type === 'WAT' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' :
                                                    'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                                                }`}>
                                                    {item.type} Test
                                                </span>
                                                <h4 className="text-white font-black text-xl md:text-2xl tracking-tight">
                                                    {item.type === 'TAT' ? `TAT Story ${i + 1}` : item.stimulus}
                                                </h4>
                                            </div>
                                            <div className="bg-slate-900 px-5 py-3 rounded-2xl border border-slate-700 shadow-inner">
                                                <span className="text-3xl font-black text-yellow-400">{item.score}</span>
                                                <span className="text-slate-500 text-sm font-bold ml-1">/10</span>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-6">
                                            <div>
                                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Psychologist's Comment</h5>
                                                <p className="text-slate-300 text-lg leading-relaxed italic">"{item.comments}"</p>
                                            </div>

                                            {item.detailedAssessment && (
                                                <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
                                                    <h5 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <Brain size={14} /> Detailed Assessment (OLQ Gaps / Improvements)
                                                    </h5>
                                                    <p className="text-slate-400 leading-relaxed">{item.detailedAssessment}</p>
                                                </div>
                                            )}

                                            {item.suggestedAnswer && (
                                                <div className="bg-yellow-900/10 rounded-2xl p-6 border border-yellow-500/10">
                                                    <h5 className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <Zap size={14} /> Recommended Model Response
                                                    </h5>
                                                    <p className="text-yellow-100/80 font-medium leading-relaxed">"{item.suggestedAnswer}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Feedback Form */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto w-full shadow-2xl">
                        <h3 className="text-2xl font-black text-white mb-2">How was your experience?</h3>
                        <p className="text-slate-400 mb-8">Your feedback helps us improve the 12-Day Challenge.</p>
                        
                        {feedbackSubmitted ? (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-green-400 flex flex-col items-center gap-3">
                                <CheckCircle size={32} />
                                <span className="font-bold">Thank you for your feedback!</span>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setFeedbackRating(star)}
                                            className={`p-2 transition-all hover:scale-110 ${feedbackRating >= star ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'text-slate-600 hover:text-slate-400'}`}
                                        >
                                            <Star size={36} fill={feedbackRating >= star ? "currentColor" : "none"} />
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    placeholder="Any additional comments? (Optional)"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none resize-none h-24"
                                />
                                <button
                                    onClick={submitFeedback}
                                    disabled={feedbackRating === 0}
                                    className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-bold transition-all"
                                >
                                    Submit Feedback
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col items-center gap-6 mt-8">
                        <button
                            onClick={() => {
                                setEvaluationResult(null);
                                setSelectedDay(null);
                                fetchUserProgress();
                            }}
                            className="px-10 py-5 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl font-black text-xl transition-all shadow-xl hover:scale-105"
                        >
                            Return to Map
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <div className="bg-slate-900 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-0 right-32 w-64 h-64 bg-slate-700 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-6 mb-6">
                        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft size={20} /> Back to Dashboard
                        </button>
                        <a 
                            href="https://wa.me/9131112322?text=Hi,%20I%20have%20some%20feedback%20for%20the%2012-Day%20Challenge.%20Please%20help%20us%20make%20it%20best." 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400 hover:text-yellow-300 rounded-xl transition-colors text-sm font-bold flex items-center gap-2 shadow-lg"
                        >
                            <MessageCircle size={16} /> Help us in making It best, give feedback and get 5 coin
                        </a>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter flex items-center gap-4">
                        <Target className="text-yellow-500" size={40} /> 12 Days PSYC Challenge
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">Master the SSB Psychology tests with daily practice.</p>
                </div>
                
                <div className="relative z-10 flex gap-4">
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-4 text-center min-w-[120px]">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Progress</div>
                        <div className="text-3xl font-black text-yellow-400 flex items-center justify-center gap-2">
                            <Target size={24} /> {completedDays.length}/12
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8">
                <button 
                    onClick={() => setActiveTab('MAP')}
                    className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all ${activeTab === 'MAP' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                >
                    Challenge Map
                </button>
                <button 
                    onClick={() => setActiveTab('ABOUT')}
                    className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all ${activeTab === 'ABOUT' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                >
                    About Challenge
                </button>
            </div>

            {activeTab === 'MAP' ? (
                <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-xl border border-slate-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">12 Days PSYC Challenge</h2>
                            <p className="text-slate-500 font-medium mt-1">Complete one challenge per day to build your progress.</p>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="text-sm font-bold text-slate-700">Timed Mode</div>
                            <button 
                                onClick={() => setIsTimed(!isTimed)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isTimed ? 'bg-yellow-500' : 'bg-slate-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isTimed ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 md:gap-6">
                        {days.map((day, index) => {
                            const isCompleted = completedDays.includes(day.day_number);
                            const isNext = !isCompleted && (index === 0 || completedDays.includes(days[index - 1]?.day_number));
                            const isLocked = !isCompleted && !isNext && index !== 0; 
                            
                            return (
                                <button
                                    key={day.id}
                                    onClick={() => {
                                        handleDaySelect(day.day_number);
                                    }}
                                    className={`relative aspect-square rounded-[2rem] flex flex-col items-center justify-center p-4 transition-all duration-300 ${
                                        isCompleted 
                                        ? 'bg-yellow-50 border-2 border-yellow-500 text-yellow-700 hover:bg-yellow-100 hover:scale-105 shadow-lg shadow-yellow-500/20' 
                                        : isNext
                                        ? 'bg-yellow-500 border-2 border-yellow-600 text-white hover:bg-yellow-600 hover:scale-110 hover:-translate-y-2 shadow-xl shadow-yellow-500/30 z-10'
                                        : 'bg-slate-50 border-2 border-slate-200 text-slate-400 hover:bg-slate-100 hover:scale-105'
                                    }`}
                                >
                                    {isCompleted && <div className="absolute -top-3 -right-3 bg-yellow-500 text-white rounded-full p-1.5 shadow-lg"><CheckCircle size={20} /></div>}
                                    {isLocked && <div className="absolute top-4 right-4 text-slate-300"><Lock size={16} /></div>}
                                    
                                    <div className={`text-4xl md:text-5xl font-black mb-1 ${isNext ? 'text-white' : ''}`}>{day.day_number}</div>
                                    <div className={`text-xs font-bold uppercase tracking-widest ${isNext ? 'text-yellow-200' : 'text-opacity-60'}`}>Day</div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-xl border border-slate-100 flex flex-col gap-6">
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">About 12 Days PSYC Challenge</h2>
                    <p className="text-slate-600 text-lg leading-relaxed">
                        The 12 Days PSYC Challenge is designed to simulate the rigorous psychological testing phase of the SSB interview. 
                        Over the course of 12 days, you will be exposed to a variety of tests including TAT (Thematic Apperception Test), 
                        WAT (Word Association Test), SRT (Situation Reaction Test), and SDT (Self Description Test).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">TAT (Thematic Apperception Test)</h3>
                            <p className="text-slate-600">You will be shown a picture for 30 seconds and then given 4 minutes to write a story based on it. The story should have a past, present, and future.</p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">WAT (Word Association Test)</h3>
                            <p className="text-slate-600">Words will be flashed on the screen for 15 seconds each. You must write the first thought or sentence that comes to your mind.</p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">SRT (Situation Reaction Test)</h3>
                            <p className="text-slate-600">You will be presented with everyday life situations. You have 30 seconds to write your reaction to each situation.</p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">SDT (Self Description Test)</h3>
                            <p className="text-slate-600">You will be asked to describe yourself from the perspective of your parents, teachers, friends, and yourself, along with your aims in life.</p>
                        </div>
                    </div>

                    <div className="mt-8 space-y-8">
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight border-b border-slate-100 pb-4">Daily Breakdown</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {days.map(day => (
                                <div key={day.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                    <h4 className="text-xl font-bold text-slate-800 mb-1">Day {day.day_number}: {day.title}</h4>
                                    <p className="text-slate-500 font-medium text-sm mb-4">{day.description}</p>
                                    <div className="space-y-3">
                                        <div><span className="font-bold text-slate-700">What:</span> <span className="text-slate-600">{day.details?.what}</span></div>
                                        <div><span className="font-bold text-slate-700">How:</span> <span className="text-slate-600">{day.details?.how}</span></div>
                                        <div><span className="font-bold text-slate-700">Why:</span> <span className="text-slate-600">{day.details?.why}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Day Overview Modal */}
            {selectedDay && !isTesting && !evaluationResult && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-3xl font-black text-slate-800">Day {selectedDay}</h2>
                                <p className="text-slate-500 font-medium mt-1">Challenge Overview</p>
                            </div>
                            <button onClick={() => setSelectedDay(null)} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 bg-slate-50 flex-1 overflow-y-auto">
                            {(() => {
                                const dayInfo = days.find(d => d.day_number === selectedDay);
                                return dayInfo ? (
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
                                        <h3 className="text-xl font-bold text-slate-800 mb-4">{dayInfo.description}</h3>
                                        <div className="space-y-3">
                                            <div><span className="font-bold text-slate-700">What:</span> <span className="text-slate-600">{dayInfo.details?.what}</span></div>
                                            <div><span className="font-bold text-slate-700">How:</span> <span className="text-slate-600">{dayInfo.details?.how}</span></div>
                                            <div><span className="font-bold text-slate-700">Why:</span> <span className="text-slate-600">{dayInfo.details?.why}</span></div>
                                        </div>
                                    </div>
                                ) : null;
                            })()}
                            {loading ? (
                                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-yellow-600" size={40} /></div>
                            ) : resources.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-slate-500 font-medium">No resources have been added for Day {selectedDay} yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center shadow-sm">
                                        <ImageIcon size={32} className="mx-auto text-orange-500 mb-3" />
                                        <div className="text-3xl font-black text-slate-800">{resources.filter(r => r.resource_type === 'TAT').length}</div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-2">TAT</div>
                                    </div>
                                    <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center shadow-sm">
                                        <Zap size={32} className="mx-auto text-yellow-600 mb-3" />
                                        <div className="text-3xl font-black text-slate-800">{resources.filter(r => r.resource_type === 'WAT').length}</div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-2">WAT</div>
                                    </div>
                                    <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center shadow-sm">
                                        <Brain size={32} className="mx-auto text-slate-600 mb-3" />
                                        <div className="text-3xl font-black text-slate-800">{resources.filter(r => r.resource_type === 'SRT').length}</div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-2">SRT</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                            <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                💡 Tip: You can write answers on paper and upload them at the end.
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setSelectedDay(null)} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                {completedDays.includes(selectedDay) && progressData.find(d => d.result_data?.day === selectedDay) && (
                                    <button 
                                        onClick={() => {
                                            const attempt = progressData.find(d => d.result_data?.day === selectedDay);
                                            if (attempt?.result_data) {
                                                setEvaluationResult(attempt.result_data);
                                                setCurrentAttemptId(attempt.id);
                                                setFeedbackRating(attempt.result_data.userFeedback?.rating || 0);
                                                setFeedbackText(attempt.result_data.userFeedback?.text || '');
                                                setFeedbackSubmitted(!!attempt.result_data.userFeedback);
                                            }
                                        }}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
                                    >
                                        <Eye size={20} /> View Overall Feedback
                                    </button>
                                )}
                                {pendingProgress?.selectedDay === selectedDay ? (
                                    <button 
                                        onClick={resumeTest}
                                        disabled={resources.length === 0}
                                        className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-500/30 transition-all disabled:opacity-50 disabled:shadow-none"
                                    >
                                        <Play size={20} fill="currentColor" /> Resume Challenge
                                    </button>
                                ) : (
                                    <button 
                                        onClick={startTest}
                                        disabled={resources.length === 0}
                                        className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-yellow-500/30 transition-all disabled:opacity-50 disabled:shadow-none"
                                    >
                                        <Play size={20} fill="currentColor" /> {completedDays.includes(selectedDay) ? 'Retake Challenge' : 'Start Challenge'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Challenge14Day;
