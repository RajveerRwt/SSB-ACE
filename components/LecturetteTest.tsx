
import React, { useState, useEffect, useRef } from 'react';
import { Mic, BookOpen, Loader2, Play, X, Clock, AlertTriangle, CheckCircle, Volume2, Award, Activity, StopCircle, RefreshCw, Layout, FileAudio, MapPin, Filter } from 'lucide-react';
import { generateLecturette, evaluateLecturette } from '../services/geminiService';

const LECTURETTE_TOPICS = [
    // 11 SSB Allahabad
    { title: "Growing Economy", board: "11 SSB Allahabad", category: "Economy", difficulty: "Medium" },
    { title: "My first trip", board: "11 SSB Allahabad", category: "Personal", difficulty: "Low" },
    { title: "Waste management", board: "11 SSB Allahabad", category: "Environment", difficulty: "Medium" },
    { title: "Darjeeling", board: "11 SSB Allahabad", category: "General", difficulty: "Low" },
    { title: "Duty station", board: "11 SSB Allahabad", category: "Defense", difficulty: "Medium" },
    { title: "My first posting", board: "11 SSB Allahabad", category: "Defense", difficulty: "Medium" },
    { title: "Artificial intelligence", board: "11 SSB Allahabad", category: "Technology", difficulty: "High" },
    { title: "Indo pak relations", board: "11 SSB Allahabad", category: "International", difficulty: "High" },
    { title: "Poverty", board: "11 SSB Allahabad", category: "Social", difficulty: "Medium" },
    { title: "Disaster relief", board: "11 SSB Allahabad", category: "National", difficulty: "Medium" },
    { title: "Drill and discipline", board: "11 SSB Allahabad", category: "Defense", difficulty: "Medium" },
    { title: "Counter terrorism", board: "11 SSB Allahabad", category: "Security", difficulty: "High" },
    { title: "Financial literacy", board: "11 SSB Allahabad", category: "Economy", difficulty: "Medium" },
    { title: "My favourite festival", board: "11 SSB Allahabad", category: "Personal", difficulty: "Low" },
    { title: "AI in Defence Technology", board: "11 SSB Allahabad", category: "Defense", difficulty: "High" },
    { title: "Fitness", board: "11 SSB Allahabad", category: "Personal", difficulty: "Low" },

    // 34 SSB Allahabad
    { title: "Social media", board: "34 SSB Allahabad", category: "Social", difficulty: "Medium" },
    { title: "Beti Bachao Beti Padhao", board: "34 SSB Allahabad", category: "Social", difficulty: "Medium" },
    { title: "Climate change", board: "34 SSB Allahabad", category: "Environment", difficulty: "High" },
    { title: "Three pillars of democracy", board: "34 SSB Allahabad", category: "National", difficulty: "High" },
    { title: "Hollywood vs Bollywood", board: "34 SSB Allahabad", category: "General", difficulty: "Low" },
    { title: "Make in India", board: "34 SSB Allahabad", category: "Economy", difficulty: "Medium" },
    { title: "Medical tourism", board: "34 SSB Allahabad", category: "Economy", difficulty: "Medium" },
    { title: "Cyber security", board: "34 SSB Allahabad", category: "Technology", difficulty: "High" },
    { title: "Donald Trump", board: "34 SSB Allahabad", category: "International", difficulty: "Medium" },
    { title: "Brain drain", board: "34 SSB Allahabad", category: "Social", difficulty: "Medium" },
    { title: "Dowry system", board: "34 SSB Allahabad", category: "Social", difficulty: "Medium" },
    { title: "Swach bharat mission", board: "34 SSB Allahabad", category: "National", difficulty: "Medium" },
    { title: "North Korea", board: "34 SSB Allahabad", category: "International", difficulty: "High" },
    { title: "Online gaming", board: "34 SSB Allahabad", category: "Technology", difficulty: "Medium" },
    { title: "Russia US relationship", board: "34 SSB Allahabad", category: "International", difficulty: "High" },
    { title: "Skill india", board: "34 SSB Allahabad", category: "National", difficulty: "Medium" },
    { title: "3d printing", board: "34 SSB Allahabad", category: "Technology", difficulty: "Medium" },

    // 18 SSB Allahabad
    { title: "LGBTQ", board: "18 SSB Allahabad", category: "Social", difficulty: "High" },
    { title: "Internet of Things", board: "18 SSB Allahabad", category: "Technology", difficulty: "High" },
    { title: "Sports league", board: "18 SSB Allahabad", category: "Sports", difficulty: "Medium" },
    { title: "Uniform civil code", board: "18 SSB Allahabad", category: "National", difficulty: "High" },
    { title: "NHAI", board: "18 SSB Allahabad", category: "National", difficulty: "Medium" },
    { title: "Nuclear Disarmament", board: "18 SSB Allahabad", category: "International", difficulty: "High" },
    { title: "The world at a glance", board: "18 SSB Allahabad", category: "International", difficulty: "High" },
    { title: "Voting: right or duty", board: "18 SSB Allahabad", category: "National", difficulty: "Medium" },
    { title: "Niti Ayog", board: "18 SSB Allahabad", category: "National", difficulty: "Medium" },
    { title: "Coeducation", board: "18 SSB Allahabad", category: "Social", difficulty: "Medium" },
    { title: "BPL", board: "18 SSB Allahabad", category: "Social", difficulty: "Medium" },
    { title: "Physical fitness", board: "18 SSB Allahabad", category: "Personal", difficulty: "Low" },
    { title: "NSG", board: "18 SSB Allahabad", category: "Defense", difficulty: "High" },
    { title: "Drones", board: "18 SSB Allahabad", category: "Technology", difficulty: "Medium" },
    { title: "TRAI", board: "18 SSB Allahabad", category: "National", difficulty: "Medium" },
    { title: "Right to Education", board: "18 SSB Allahabad", category: "Social", difficulty: "Medium" },
    { title: "Population census", board: "18 SSB Allahabad", category: "National", difficulty: "Medium" },
    { title: "Favourite National Heritage", board: "18 SSB Allahabad", category: "General", difficulty: "Low" },
    { title: "Cybercrime", board: "18 SSB Allahabad", category: "Technology", difficulty: "Medium" },
    { title: "NGO", board: "18 SSB Allahabad", category: "Social", difficulty: "Medium" },
    { title: "Indian Agriculture", board: "18 SSB Allahabad", category: "Economy", difficulty: "Medium" },
    { title: "Indo Maldives relationship", board: "18 SSB Allahabad", category: "International", difficulty: "High" },
    { title: "Rain Water Harvesting", board: "18 SSB Allahabad", category: "Environment", difficulty: "Medium" },
    { title: "Indo Srilanka", board: "18 SSB Allahabad", category: "International", difficulty: "High" },
    { title: "India in 2047", board: "18 SSB Allahabad", category: "National", difficulty: "High" },
    { title: "Blockchain", board: "18 SSB Allahabad", category: "Technology", difficulty: "High" },
    { title: "Seven Wonders of the World", board: "18 SSB Allahabad", category: "General", difficulty: "Low" },
    { title: "Lockdown and its Effects", board: "18 SSB Allahabad", category: "Social", difficulty: "Medium" },
    { title: "My Favourite Personality", board: "18 SSB Allahabad", category: "Personal", difficulty: "Low" },
    { title: "Post-COVID Scenario", board: "18 SSB Allahabad", category: "Social", difficulty: "Medium" },
    { title: "Balanced Diet", board: "18 SSB Allahabad", category: "Health", difficulty: "Low" },
    { title: "Electric Vehicles (EVs)", board: "18 SSB Allahabad", category: "Environment", difficulty: "Medium" },
    { title: "Online Gaming India as a Manufacturing Hub", board: "18 SSB Allahabad", category: "Economy", difficulty: "High" },

    // 19 SSB Allahabad
    { title: "western powers", board: "19 SSB Allahabad", category: "International", difficulty: "High" },
    { title: "biofuel", board: "19 SSB Allahabad", category: "Environment", difficulty: "Medium" },
    { title: "incredible India", board: "19 SSB Allahabad", category: "Tourism", difficulty: "Medium" },
    { title: "online transaction system", board: "19 SSB Allahabad", category: "Economy", difficulty: "Medium" },
    { title: "Jammu and Kashmir development", board: "19 SSB Allahabad", category: "National", difficulty: "High" },
    { title: "corona", board: "19 SSB Allahabad", category: "Health", difficulty: "Medium" },
    { title: "Indo China relationship", board: "19 SSB Allahabad", category: "International", difficulty: "High" },
    { title: "Indo Nepal relationship", board: "19 SSB Allahabad", category: "International", difficulty: "Medium" },
    { title: "Drone technology", board: "19 SSB Allahabad", category: "Technology", difficulty: "Medium" },
    { title: "Indian Ocean", board: "19 SSB Allahabad", category: "Geopolitics", difficulty: "High" },
    { title: "Global warming", board: "19 SSB Allahabad", category: "Environment", difficulty: "Medium" },
    { title: "Social Reform", board: "19 SSB Allahabad", category: "Social", difficulty: "Medium" },

    // 24 SSB Bengaluru
    { title: "Role of India in UNSC", board: "24 SSB Bengaluru", category: "International", difficulty: "High" },
    { title: "Labor migration", board: "24 SSB Bengaluru", category: "Social", difficulty: "Medium" },
    { title: "Role of discipline in life", board: "24 SSB Bengaluru", category: "Personal", difficulty: "Low" },
    { title: "Indo-Russia relation", board: "24 SSB Bengaluru", category: "International", difficulty: "High" },
    { title: "Organic food", board: "24 SSB Bengaluru", category: "Health", difficulty: "Medium" },
    { title: "Drug addiction", board: "24 SSB Bengaluru", category: "Social", difficulty: "Medium" },
    { title: "India us relationship", board: "24 SSB Bengaluru", category: "International", difficulty: "High" },
    { title: "India and its nuclear supplier group", board: "24 SSB Bengaluru", category: "International", difficulty: "High" },

    // 17 SSB Bangalore
    { title: "Pollution in Cities", board: "17 SSB Bengaluru", category: "Environment", difficulty: "Medium" },
    { title: "Afforestation and Reforestation", board: "17 SSB Bengaluru", category: "Environment", difficulty: "Medium" },
    { title: "Water Crisis in Indian Cities", board: "17 SSB Bengaluru", category: "Environment", difficulty: "Medium" },
    { title: "Deforestation", board: "17 SSB Bengaluru", category: "Environment", difficulty: "Medium" },
    { title: "Ban on Plastic", board: "17 SSB Bengaluru", category: "Environment", difficulty: "Low" },
    { title: "Green Energy in India", board: "17 SSB Bengaluru", category: "Environment", difficulty: "Medium" },
    { title: "E-Governance", board: "17 SSB Bengaluru", category: "National", difficulty: "Medium" },

    // 20, 21, 22 SSB Bhopal
    { title: "Indian Parliament", board: "20/21/22 SSB Bhopal", category: "National", difficulty: "Medium" },
    { title: "My dream society", board: "20/21/22 SSB Bhopal", category: "Social", difficulty: "Medium" },
    { title: "Women empowerment", board: "20/21/22 SSB Bhopal", category: "Social", difficulty: "Medium" },
    { title: "Global conflicts", board: "20/21/22 SSB Bhopal", category: "International", difficulty: "High" },
    { title: "E-commerce in India", board: "20/21/22 SSB Bhopal", category: "Economy", difficulty: "Medium" },
    { title: "Paris Climate Agreement", board: "20/21/22 SSB Bhopal", category: "Environment", difficulty: "High" },
    { title: "Deepfake Technology", board: "20/21/22 SSB Bhopal", category: "Technology", difficulty: "High" },
    { title: "5G and Beyond", board: "20/21/22 SSB Bhopal", category: "Technology", difficulty: "Medium" },
    { title: "Digital India", board: "20/21/22 SSB Bhopal", category: "National", difficulty: "Medium" },
    { title: "ISRO vs NASA", board: "20/21/22 SSB Bhopal", category: "Space", difficulty: "High" },
    { title: "Facial Recognition Technology", board: "20/21/22 SSB Bhopal", category: "Technology", difficulty: "Medium" },
    { title: "Drug Abuse Among Youth", board: "20/21/22 SSB Bhopal", category: "Social", difficulty: "Medium" },
    { title: "Casteism in India", board: "20/21/22 SSB Bhopal", category: "Social", difficulty: "High" },

    // 4 AFSB Varanasi
    { title: "Mission Shakti", board: "4 AFSB Varanasi", category: "Defense", difficulty: "Medium" },
    { title: "Minimum Support Price", board: "4 AFSB Varanasi", category: "Agriculture", difficulty: "Medium" },
    { title: "Junk food", board: "4 AFSB Varanasi", category: "Health", difficulty: "Low" },
    { title: "Man Animal Conflict", board: "4 AFSB Varanasi", category: "Environment", difficulty: "Medium" },
    { title: "Indian Heritage", board: "4 AFSB Varanasi", category: "Culture", difficulty: "Medium" },
    { title: "My Best Friend", board: "4 AFSB Varanasi", category: "Personal", difficulty: "Low" },
    { title: "Elections in India", board: "4 AFSB Varanasi", category: "National", difficulty: "Medium" },
    { title: "Constitution", board: "4 AFSB Varanasi", category: "National", difficulty: "High" },
    { title: "Universal Basic Income", board: "4 AFSB Varanasi", category: "Economy", difficulty: "High" },
    { title: "Fiscal Policy", board: "4 AFSB Varanasi", category: "Economy", difficulty: "High" },
    { title: "Infrastructure Development", board: "4 AFSB Varanasi", category: "National", difficulty: "Medium" },
    { title: "Monetary Policy", board: "4 AFSB Varanasi", category: "Economy", difficulty: "High" },
    { title: "Kaveri Water Issues", board: "4 AFSB Varanasi", category: "National", difficulty: "Medium" },

    // 2 AFSB Mysore
    { title: "One Nation, One Election", board: "2 AFSB Mysore", category: "National", difficulty: "High" },
    { title: "India's G20 Presidency", board: "2 AFSB Mysore", category: "International", difficulty: "High" },
    { title: "Israel-Hamas Conflict", board: "2 AFSB Mysore", category: "International", difficulty: "High" },
    { title: "Role of India in BRICS", board: "2 AFSB Mysore", category: "International", difficulty: "High" },
    { title: "Ram Mandir Inauguration", board: "2 AFSB Mysore", category: "National", difficulty: "Medium" },
    { title: "NRC and CAA", board: "2 AFSB Mysore", category: "National", difficulty: "High" },
    { title: "India's Space Achievements", board: "2 AFSB Mysore", category: "Space", difficulty: "Medium" },
    { title: "Russia-Ukraine War", board: "2 AFSB Mysore", category: "International", difficulty: "High" },
    { title: "Reservation System in India", board: "2 AFSB Mysore", category: "Social", difficulty: "High" },
    { title: "Corruption in Public Life", board: "2 AFSB Mysore", category: "Social", difficulty: "Medium" },
    { title: "Population Explosion", board: "2 AFSB Mysore", category: "Social", difficulty: "Medium" },

    // 3 AFSB Gandhinagar
    { title: "Satellite", board: "3 AFSB Gandhinagar", category: "Space", difficulty: "Medium" },
    { title: "Quality of food", board: "3 AFSB Gandhinagar", category: "Health", difficulty: "Low" },
    { title: "Gen Z", board: "3 AFSB Gandhinagar", category: "Social", difficulty: "Medium" },
    { title: "Organic farming", board: "3 AFSB Gandhinagar", category: "Agriculture", difficulty: "Medium" },
    { title: "Cruise missiles", board: "3 AFSB Gandhinagar", category: "Defense", difficulty: "High" },
    { title: "LGBTQ+ Rights", board: "3 AFSB Gandhinagar", category: "Social", difficulty: "Medium" },

    // 1 AFSB Dehradun
    { title: "Instagram", board: "1 AFSB Dehradun", category: "Social Media", difficulty: "Low" },
    { title: "Compulsory military service", board: "1 AFSB Dehradun", category: "Defense", difficulty: "High" },
    { title: "Ancient India", board: "1 AFSB Dehradun", category: "History", difficulty: "Medium" },
    { title: "Net neutrality", board: "1 AFSB Dehradun", category: "Technology", difficulty: "High" },
    { title: "Food preservation", board: "1 AFSB Dehradun", category: "Science", difficulty: "Medium" },
    { title: "Globalization", board: "1 AFSB Dehradun", category: "Economy", difficulty: "High" },
    { title: "Measures to take during fire", board: "1 AFSB Dehradun", category: "Safety", difficulty: "Low" },
    { title: "Politics", board: "1 AFSB Dehradun", category: "National", difficulty: "Medium" },
    { title: "ISRO", board: "1 AFSB Dehradun", category: "Space", difficulty: "Medium" },
    { title: "Air travelling", board: "1 AFSB Dehradun", category: "Transport", difficulty: "Low" },
    { title: "Dog", board: "1 AFSB Dehradun", category: "General", difficulty: "Low" },
    { title: "Hindi", board: "1 AFSB Dehradun", category: "Culture", difficulty: "Medium" },
    { title: "Climate", board: "1 AFSB Dehradun", category: "Environment", difficulty: "Medium" },
    { title: "Television", board: "1 AFSB Dehradun", category: "Media", difficulty: "Low" },
    { title: "Stress", board: "1 AFSB Dehradun", category: "Health", difficulty: "Medium" },
    { title: "Time management", board: "1 AFSB Dehradun", category: "Personal", difficulty: "Medium" },
    { title: "Classical Language", board: "1 AFSB Dehradun", category: "Culture", difficulty: "Medium" },
    { title: "Machine Learning", board: "1 AFSB Dehradun", category: "Technology", difficulty: "High" },
    { title: "Yoga", board: "1 AFSB Dehradun", category: "Health", difficulty: "Low" },

    // NSB VIZAG
    { title: "Official Language", board: "NSB Vizag", category: "National", difficulty: "Medium" },
    { title: "Women in society", board: "NSB Vizag", category: "Social", difficulty: "Medium" },
    { title: "Energy crisis", board: "NSB Vizag", category: "National", difficulty: "Medium" },
    { title: "Cinema", board: "NSB Vizag", category: "Media", difficulty: "Low" },
    { title: "Road accidents", board: "NSB Vizag", category: "Social", difficulty: "Medium" },
    { title: "ChatGPT", board: "NSB Vizag", category: "Technology", difficulty: "Medium" },
    { title: "Forests and Men", board: "NSB Vizag", category: "Environment", difficulty: "Medium" },
    { title: "India as a superpower", board: "NSB Vizag", category: "International", difficulty: "High" },

    // NSB KOLKATA
    { title: "Child Labour", board: "NSB Kolkata", category: "Social", difficulty: "Medium" },
    { title: "Acid Attack Survivors", board: "NSB Kolkata", category: "Social", difficulty: "High" },
    { title: "AFSPA", board: "NSB Kolkata", category: "Defense", difficulty: "High" },
    { title: "Modernization of Indian Armed Forces", board: "NSB Kolkata", category: "Defense", difficulty: "High" },
    { title: "Role of India in UN Peacekeeping", board: "NSB Kolkata", category: "International", difficulty: "Medium" },
    { title: "Surgical Strikes", board: "NSB Kolkata", category: "Defense", difficulty: "Medium" },
    { title: "Make in India in Defense", board: "NSB Kolkata", category: "Defense", difficulty: "High" },
    { title: "Border Security Forces", board: "NSB Kolkata", category: "Defense", difficulty: "Medium" },
    { title: "Role of IAF in Disaster Relief", board: "NSB Kolkata", category: "Defense", difficulty: "Medium" },
    { title: "National Security Threats", board: "NSB Kolkata", category: "Security", difficulty: "High" },
    { title: "Nuclear Policy of India", board: "NSB Kolkata", category: "Defense", difficulty: "High" },
    { title: "Role of DRDO", board: "NSB Kolkata", category: "Defense", difficulty: "Medium" }
];

const LecturetteTest: React.FC = () => {
  const [selectedLecturette, setSelectedLecturette] = useState<string | null>(null);
  const [lecturetteContent, setLecturetteContent] = useState<any>(null);
  const [loadingLecturette, setLoadingLecturette] = useState(false);
  const [lecturetteTimer, setLecturetteTimer] = useState(180); // Preparation Timer
  const [speechTimer, setSpeechTimer] = useState(0); // Speech Duration
  const [isPrepTimerRunning, setIsPrepTimerRunning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeBoardFilter, setActiveBoardFilter] = useState<string>('ALL');
  
  // Media Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const playBuzzer = (freq: number = 200, duration: number = 0.5) => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  // Preparation Timer Logic
  useEffect(() => {
    let interval: any;
    if (isPrepTimerRunning && lecturetteTimer > 0) {
        interval = setInterval(() => {
            setLecturetteTimer(prev => {
                const val = prev - 1;
                if (val === 30) playBuzzer(400, 0.5); // Warning
                return val;
            });
        }, 1000);
    } else if (lecturetteTimer === 0 && isPrepTimerRunning) {
        setIsPrepTimerRunning(false);
        playBuzzer(200, 1.0);
    }
    return () => clearInterval(interval);
  }, [isPrepTimerRunning, lecturetteTimer]);

  // Speech Timer Logic
  useEffect(() => {
      let interval: any;
      if (isRecording) {
          interval = setInterval(() => {
              setSpeechTimer(prev => {
                  const newVal = prev + 1;
                  // Warning Bell at 2.5 minutes (150 seconds)
                  if (newVal === 150) {
                      playBuzzer(400, 1.0); 
                  }
                  return newVal;
              });
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [isRecording]);

  const handleLecturetteClick = async (topic: string) => {
      setSelectedLecturette(topic);
      setLecturetteContent(null);
      setLoadingLecturette(true);
      setLecturetteTimer(180);
      setSpeechTimer(0);
      setIsPrepTimerRunning(false);
      setFeedback(null);
      setAudioUrl(null);
      transcriptRef.current = "";
      
      try {
          const content = await generateLecturette(topic);
          setLecturetteContent(content);
      } catch (e) {
          console.error("Failed to gen lecturette", e);
      } finally {
          setLoadingLecturette(false);
      }
  };

  const handleClose = () => {
      setSelectedLecturette(null);
      setIsPrepTimerRunning(false);
      setIsRecording(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) recognitionRef.current.stop();
  };

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          setIsPrepTimerRunning(false);
          setIsRecording(true);
          setSpeechTimer(0);
          setAudioUrl(null);
          transcriptRef.current = "";
          audioChunksRef.current = [];

          // 1. Start Audio Recording for Playback
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          
          mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                  audioChunksRef.current.push(event.data);
              }
          };

          mediaRecorder.start();

          // 2. Start Speech Recognition for Analysis
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          if (SpeechRecognition) {
              const recognition = new SpeechRecognition();
              recognitionRef.current = recognition;
              recognition.continuous = true;
              recognition.interimResults = true;
              recognition.lang = 'en-IN';

              recognition.onresult = (event: any) => {
                  let finalTranscript = '';
                  for (let i = event.resultIndex; i < event.results.length; ++i) {
                      if (event.results[i].isFinal) {
                          finalTranscript += event.results[i][0].transcript + " ";
                      }
                  }
                  if (finalTranscript) {
                      transcriptRef.current += finalTranscript;
                  }
              };
              recognition.start();
          } else {
              console.warn("Speech Recognition API not supported");
          }

      } catch (err) {
          console.error("Microphone Access Denied", err);
          alert("Microphone access is required for the Lecturette test.");
      }
  };

  const stopRecording = async () => {
      setIsRecording(false);
      
      // Stop Recognition
      if (recognitionRef.current) recognitionRef.current.stop();
      
      // Stop Media Recorder
      if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.onstop = async () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const url = URL.createObjectURL(audioBlob);
              setAudioUrl(url);
              
              // Proceed to Evaluation
              handleEvaluation();
          };
      } else {
          handleEvaluation();
      }
  };

  const handleEvaluation = async () => {
      setIsEvaluating(true);
      try {
          const result = await evaluateLecturette(selectedLecturette || "Topic", transcriptRef.current, speechTimer);
          setFeedback(result);
      } catch (e) {
          console.error("Eval failed", e);
      } finally {
          setIsEvaluating(false);
      }
  };

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Filter Topics
  const boards = ['ALL', 'Allahabad', 'Bhopal', 'Bengaluru', 'Kapurthala', 'Dehradun', 'Visakhapatnam', 'Varanasi', 'Mysore', 'Gandhinagar', 'Kolkata'];
  const filteredTopics = LECTURETTE_TOPICS.filter(t => activeBoardFilter === 'ALL' || t.board.includes(activeBoardFilter));

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700 relative">
      
      {/* HEADER */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center border-b-8 border-purple-500">
         <div className="relative z-10 space-y-4">
            <span className="px-4 py-1.5 bg-purple-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-2 mx-auto w-fit">
               <Mic size={12} /> GTO Task 3
            </span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Lecturette <span className="text-yellow-400">Simulator</span></h1>
            <p className="text-slate-400 max-w-2xl font-medium leading-relaxed text-sm md:text-base">
               Practice board-specific topics. 3 Mins Preparation • 3 Mins Speech. AI evaluates your Content, Structure, and Fluency.
            </p>
         </div>
         <div className="absolute top-0 right-0 p-8 opacity-5">
             <Mic size={200} />
         </div>
      </div>

      {/* TOPIC LIST */}
      {!selectedLecturette && (
          <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-xl">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-100 pb-6 mb-6">
                  <div>
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Topic Cards</h3>
                      <p className="text-slate-500 text-xs font-bold mt-2">Recently asked topics in various SSB/AFSB Boards.</p>
                  </div>
                  
                  {/* BOARD FILTER */}
                  <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                      {boards.map(b => (
                          <button 
                            key={b}
                            onClick={() => setActiveBoardFilter(b)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeBoardFilter === b ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                          >
                              {b === 'ALL' ? 'All Boards' : b}
                          </button>
                      ))}
                  </div>
              </div>

              {filteredTopics.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">
                      No topics found for this board filter.
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredTopics.map((topic, i) => (
                          <div 
                            key={i} 
                            onClick={() => handleLecturetteClick(topic.title)}
                            className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all group shadow-sm hover:shadow-lg gap-4"
                          >
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-purple-600 group-hover:text-white transition-colors font-black text-xs shrink-0">
                                      {i + 1}
                                  </div>
                                  <div>
                                      <h5 className="font-bold text-slate-900 text-sm group-hover:text-purple-900 leading-tight">{topic.title}</h5>
                                      <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                              <MapPin size={10} /> {topic.board}
                                          </span>
                                          <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest px-2 py-0.5 bg-blue-50 rounded-full">
                                              {topic.category}
                                          </span>
                                      </div>
                                  </div>
                              </div>
                              <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest shrink-0 ${topic.difficulty === 'High' ? 'bg-red-100 text-red-700' : topic.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                  {topic.difficulty}
                              </span>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* SIMULATION MODAL */}
      {selectedLecturette && (
          <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-[2.5rem] w-full max-w-6xl max-h-[90vh] flex flex-col md:flex-row shadow-2xl overflow-hidden relative">
                  <button 
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-red-500 hover:text-white text-slate-400 rounded-full transition-all z-50"
                  >
                      <X size={24} />
                  </button>

                  {/* LEFT: AUDIO VISUALIZER */}
                  <div className="w-full md:w-1/2 bg-slate-900 relative flex flex-col justify-center items-center overflow-hidden shrink-0 h-72 md:h-auto border-b md:border-b-0 md:border-r border-slate-800">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black pointer-events-none"></div>
                      
                      <div className="relative z-10 text-center space-y-8">
                          <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center border-8 transition-all duration-500 ${isRecording ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)] bg-red-900/20' : 'border-slate-800 bg-slate-800'}`}>
                              <Mic size={64} className={`${isRecording ? 'text-red-500 animate-pulse' : 'text-slate-600'}`} />
                          </div>
                          
                          <div>
                              {isRecording ? (
                                  <>
                                    <div className="text-5xl md:text-6xl font-mono font-black text-white drop-shadow-lg tracking-tighter mb-2">
                                        {formatTime(speechTimer)}
                                    </div>
                                    <p className="text-red-500 font-black uppercase tracking-[0.5em] text-xs animate-pulse">Recording On Air</p>
                                    {speechTimer > 150 && (
                                        <p className="text-yellow-400 font-black uppercase tracking-[0.2em] text-[10px] mt-2 animate-bounce">
                                            Warning: Wrap Up (30s Left)
                                        </p>
                                    )}
                                  </>
                              ) : (
                                  <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs">Microphone Standby</p>
                              )}
                          </div>
                      </div>

                      {/* Waveform Animation */}
                      {isRecording && (
                          <div className="absolute bottom-0 left-0 w-full h-32 flex items-end justify-center gap-1 pb-10 opacity-30">
                              {[...Array(20)].map((_, i) => (
                                  <div 
                                    key={i} 
                                    className="w-2 bg-red-500 rounded-t-full animate-bounce" 
                                    style={{ 
                                        height: `${Math.random() * 80 + 20}%`, 
                                        animationDuration: `${Math.random() * 0.5 + 0.5}s`,
                                        animationDelay: `${i * 0.05}s`
                                    }} 
                                  />
                              ))}
                          </div>
                      )}
                  </div>

                  {/* RIGHT: CONTENT & CONTROLS */}
                  <div className="w-full md:w-1/2 bg-slate-50 flex flex-col relative overflow-hidden flex-1">
                      {/* EVALUATION VIEW */}
                      {feedback ? (
                          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
                              <div className="flex items-center gap-4 mb-4">
                                  <div className="p-3 bg-slate-900 text-yellow-400 rounded-2xl shadow-lg">
                                      <Award size={32} />
                                  </div>
                                  <div>
                                      <h3 className="text-2xl font-black text-slate-900 uppercase">GTO Assessment</h3>
                                      <p className="text-slate-500 text-xs font-bold">Verdict: <span className={feedback.score >= 6 ? "text-green-600" : "text-red-500"}>{feedback.verdict}</span></p>
                                  </div>
                                  <div className="ml-auto text-4xl font-black text-slate-900">{feedback.score}<span className="text-lg text-slate-400">/10</span></div>
                              </div>

                              {/* AUDIO PLAYER */}
                              {audioUrl && (
                                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                      <div className="flex items-center gap-2 mb-2 text-blue-600">
                                          <FileAudio size={16} />
                                          <span className="text-[10px] font-black uppercase tracking-widest">Your Recording</span>
                                      </div>
                                      <audio controls src={audioUrl} className="w-full h-10" />
                                  </div>
                              )}

                              <div className="grid grid-cols-1 gap-4">
                                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                      <h4 className="font-black text-xs uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-2"><Layout size={14}/> Structure</h4>
                                      <p className="text-sm font-medium text-slate-700">{feedback.structureAnalysis}</p>
                                  </div>
                                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                      <h4 className="font-black text-xs uppercase tracking-widest text-purple-600 mb-2 flex items-center gap-2"><BookOpen size={14}/> Content Depth</h4>
                                      <p className="text-sm font-medium text-slate-700">{feedback.contentAnalysis}</p>
                                  </div>
                                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                      <h4 className="font-black text-xs uppercase tracking-widest text-green-600 mb-2 flex items-center gap-2"><Volume2 size={14}/> Power of Expression</h4>
                                      <p className="text-sm font-medium text-slate-700">{feedback.poeAnalysis}</p>
                                  </div>
                                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                      <h4 className="font-black text-xs uppercase tracking-widest text-orange-600 mb-2 flex items-center gap-2"><Clock size={14}/> Time Management</h4>
                                      <p className="text-sm font-medium text-slate-700">{feedback.timeManagementRemark}</p>
                                  </div>
                              </div>

                              <button onClick={() => { setFeedback(null); setSelectedLecturette(null); }} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all">
                                  End Session
                              </button>
                          </div>
                      ) : isEvaluating ? (
                          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                              <Loader2 className="w-16 h-16 text-slate-900 animate-spin" />
                              <p className="font-black text-slate-500 uppercase tracking-widest text-xs">Analyzing Speech Patterns...</p>
                          </div>
                      ) : (
                          // PREPARATION VIEW
                          <>
                              <div className="p-6 md:p-8 border-b border-slate-200 bg-white">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Topic Card</span>
                                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mt-1">{selectedLecturette}</h3>
                                      </div>
                                      <div className={`text-3xl font-mono font-black ${lecturetteTimer < 30 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
                                          {formatTime(lecturetteTimer)}
                                      </div>
                                  </div>
                              </div>

                              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar relative">
                                  {loadingLecturette ? (
                                      <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Generating AI Outline...</p>
                                      </div>
                                  ) : lecturetteContent ? (
                                      <div className={`space-y-6 transition-all duration-500 ${isRecording ? 'blur-md select-none pointer-events-none opacity-50' : ''}`}>
                                          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 block">Intro Idea</span>
                                              <p className="text-sm font-medium text-slate-700">{lecturetteContent.introduction}</p>
                                          </div>
                                          <div className="space-y-2">
                                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Key Points</span>
                                              {lecturetteContent.keyPoints?.map((pt: string, idx: number) => (
                                                  <div key={idx} className="flex gap-3 text-sm font-bold text-slate-800 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                      <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] shrink-0">{idx + 1}</div>
                                                      {pt}
                                                  </div>
                                              ))}
                                          </div>
                                          <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                                              <span className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1 block">Conclusion Idea</span>
                                              <p className="text-sm font-medium text-slate-700">{lecturetteContent.conclusion}</p>
                                          </div>
                                      </div>
                                  ) : (
                                      <p className="text-center text-red-500 font-bold">Failed to load content.</p>
                                  )}
                                  
                                  {isRecording && (
                                      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl text-center border-2 border-red-100">
                                              <p className="text-slate-900 font-black uppercase tracking-widest mb-2">Eyes Up!</p>
                                              <p className="text-slate-500 text-xs font-medium max-w-[200px]">Content hidden. Speak from memory to demonstrate confidence.</p>
                                          </div>
                                      </div>
                                  )}
                              </div>

                              <div className="p-6 border-t border-slate-200 bg-white flex gap-4">
                                  {!isRecording ? (
                                      <>
                                          <button 
                                              onClick={() => setIsPrepTimerRunning(!isPrepTimerRunning)}
                                              className={`flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${isPrepTimerRunning ? 'bg-slate-100 text-slate-600' : 'bg-slate-900 text-white hover:bg-black'}`}
                                          >
                                              {isPrepTimerRunning ? 'Pause Prep' : 'Start Prep Timer'}
                                          </button>
                                          <button 
                                              onClick={startRecording}
                                              className="flex-1 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-700 shadow-lg flex items-center justify-center gap-2"
                                          >
                                              <Mic size={16} /> Start Speech
                                          </button>
                                      </>
                                  ) : (
                                      <button 
                                          onClick={stopRecording}
                                          className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black shadow-lg flex items-center justify-center gap-2"
                                      >
                                          <StopCircle size={16} /> Finish Lecturette
                                      </button>
                                  )}
                              </div>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default LecturetteTest;
