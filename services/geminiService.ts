import { GoogleGenAI, Type, Chat, Part, Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const STANDARD_WAT_SET = [
  "Blood", "Army", "War", "Victory", "Defeat", "Leader", "Follow", "Mother", "Father", "Sister",
  "Brother", "Teacher", "School", "Home", "Money", "Time", "Work", "Play", "Friend", "Enemy",
  "Love", "Hate", "Life", "Death", "Fear", "Courage", "Risk", "Help", "Give", "Take",
  "Order", "Obey", "Win", "Lose", "Success", "Failure", "Happy", "Sad", "Strong", "Weak",
  "Light", "Dark", "Sun", "Moon", "Star", "Sky", "Earth", "Water", "Fire", "Air",
  "Food", "Drink", "Sleep", "Wake", "Run", "Walk", "Jump", "Sit", "Stand", "Lie"
];

function safeJSONParse(text: string) {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse failed", text);
    return null;
  }
}

function generateFallbackEvaluation(testType: string, text: string) {
    return {
        score: 0,
        verdict: "Insufficient Data",
        strengths: ["Attempted"],
        weaknesses: ["Response too short"],
        recommendations: "Please write a more detailed response to allow for proper AI assessment.",
        perception: { heroAge: "N/A", heroSex: "N/A", heroMood: "N/A", mainTheme: "N/A" },
        storyAnalysis: { action: "N/A", outcome: "N/A", coherence: "Low" },
        observationAnalysis: "Content insufficient for analysis."
    };
}

export async function generateTestContent(testType: string) {
  if (testType === 'SRT') {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: 'Generate 60 varied Situation Reaction Test (SRT) questions for SSB interview. Return as a JSON array of strings.',
          config: {
              responseMimeType: 'application/json',
              responseSchema: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
              }
          }
      });
      return { items: safeJSONParse(response.text) || [] };
  }
  return { items: [] };
}

export async function evaluateLecturette(topic: string, transcript: string, durationSeconds: number) {
    const prompt = `
    Act as a GTO (Group Testing Officer) in SSB. Evaluate the candidate's Lecturette performance.
    
    Topic: "${topic}"
    Spoken Transcript: "${transcript}"
    Time Taken: ${durationSeconds} seconds (Target: 180 seconds / 3 Minutes).

    EVALUATION CRITERIA:
    1. Structure: Did they have a clear Intro, Body, and Conclusion?
    2. Content: Was it factual, logical, and relevant? Or just fluff?
    3. Power of Expression (POE): Fluency, vocabulary, and flow based on the text.
    4. Time Management: 
       - If time < 150s (2:30): Penalize heavily for stopping early.
       - If time > 190s: Penalize for lack of time sense.
       - 150s-180s is ideal.

    Return JSON:
    {
        "score": number (0-10),
        "structureAnalysis": "Specific feedback on intro/body/conclusion",
        "contentAnalysis": "Feedback on knowledge depth and arguments",
        "poeAnalysis": "Feedback on fluency and expression",
        "timeManagementRemark": "Feedback on timing",
        "verdict": "Recommended / Needs Improvement",
        "improvementTips": ["Tip 1", "Tip 2", "Tip 3"]
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER },
                        structureAnalysis: { type: Type.STRING },
                        contentAnalysis: { type: Type.STRING },
                        poeAnalysis: { type: Type.STRING },
                        timeManagementRemark: { type: Type.STRING },
                        verdict: { type: Type.STRING },
                        improvementTips: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        return safeJSONParse(response.text);
    } catch (e) {
        console.error("Lecturette Eval Failed", e);
        return null;
    }
}

export async function evaluatePerformance(testType: string, userData: any) {
    let combinedTextForFallback = "";

    // 1. INTERVIEW EVALUATION
    if (testType.includes('Interview') || userData.testType === 'Interview') {
        const prompt = `Evaluate Candidate for Indian Army Officer Role based on Personal Interview.
        PIQ Data: ${JSON.stringify(userData.piq)}
        Interview Duration: ${Math.floor(userData.duration / 60)} minutes.
        Transcript: "${userData.transcript}"
        
        Task: Assess Officer Like Qualities (OLQs).
        Return JSON with:
        - score (0-10)
        - recommendations (Detailed feedback)
        - strengths (List of 3-5)
        - weaknesses (List of 3-5)
        - bodyLanguage: { posture, eyeContact, gestures } (Infer from transcript context if possible or give general advice)
        - factorAnalysis: { factor1_planning, factor2_social, factor3_effectiveness, factor4_dynamic } (Short assessment for each)
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER },
                        recommendations: { type: Type.STRING },
                        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                        bodyLanguage: {
                            type: Type.OBJECT,
                            properties: {
                                posture: { type: Type.STRING },
                                eyeContact: { type: Type.STRING },
                                gestures: { type: Type.STRING }
                            }
                        },
                        factorAnalysis: {
                            type: Type.OBJECT,
                            properties: {
                                factor1_planning: { type: Type.STRING },
                                factor2_social: { type: Type.STRING },
                                factor3_effectiveness: { type: Type.STRING },
                                factor4_dynamic: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        });
        return safeJSONParse(response.text);
    }

    // 2. WAT / SRT EVALUATION
    else if (testType === 'WAT' || testType === 'SRT') {
        const isWAT = testType === 'WAT';
        const items = isWAT ? userData.watResponses : userData.srtResponses;
        const promptText = isWAT 
            ? "Evaluate Word Association Test responses. Check for OLQs, positivity, and spontaneity." 
            : "Evaluate Situation Reaction Test responses. Check for quick decision making, social responsibility, and effectiveness.";

        const parts: Part[] = [{ text: promptText }];
        
        // Add sheet images if available
        const images = isWAT ? userData.watSheetImages : userData.srtSheetImages;
        if (images && images.length > 0) {
            images.forEach((img: string, i: number) => {
                parts.push({ inlineData: { data: img, mimeType: 'image/jpeg' } });
                parts.push({ text: `Page ${i+1} of handwritten responses.` });
            });
        }

        // Add text responses
        parts.push({ text: `Candidate Responses: ${JSON.stringify(items)}` });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER },
                        attemptedCount: { type: Type.INTEGER },
                        generalFeedback: { type: Type.STRING },
                        qualityStats: {
                            type: Type.OBJECT,
                            properties: {
                                positive: { type: Type.INTEGER },
                                neutral: { type: Type.INTEGER },
                                negative: { type: Type.INTEGER },
                                effective: { type: Type.INTEGER }, // For SRT
                                partial: { type: Type.INTEGER },   // For SRT
                                passive: { type: Type.INTEGER }    // For SRT
                            }
                        },
                        detailedAnalysis: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    word: { type: Type.STRING },      // For WAT
                                    situation: { type: Type.STRING }, // For SRT
                                    userResponse: { type: Type.STRING },
                                    assessment: { type: Type.STRING },
                                    idealResponse: { type: Type.STRING }
                                }
                            }
                        },
                        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                        recommendations: { type: Type.STRING }
                    }
                }
            }
        });
        return safeJSONParse(response.text);
    }

    // 3. PPDT EVALUATION
    else if (testType.includes('PPDT')) {
        combinedTextForFallback = (userData.story || "") + " " + (userData.narration || "");
        const wordCount = combinedTextForFallback.split(/\s+/).length;

        // GUARDRAIL: Short PPDT
        if (wordCount < 20) {
            return generateFallbackEvaluation(testType, combinedTextForFallback);
        }

        const parts: Part[] = [];
        parts.push({ text: `Evaluate PPDT Performance. 
        CRITICAL: Analyze the 'Stimulus Image' vs the 'Candidate's Story'.
        1. Check 'relevance': Is the story physically grounded in the image provided? (e.g. number of characters, gender, mood, setting).
        2. If the story is completely unrelated to the image (hallucinated), mark it as poor perception and penalize the score significantly.
        3. Fill 'observationAnalysis': Provide specific feedback on what they missed in the image or if they imagined things not present.
        4. Assess Perception, Action, Outcome.
        
        Return JSON.` });

        if (userData.stimulusImage) {
             parts.push({ inlineData: { data: userData.stimulusImage, mimeType: 'image/jpeg' } });
             parts.push({ text: `Stimulus Image (What the candidate saw).` });
        }
        
        parts.push({ text: `Candidate's Story: "${userData.story}"` });
        parts.push({ text: `Candidate's Narration: "${userData.narration}"` });
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts: parts },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                verdict: { type: Type.STRING },
                perception: {
                  type: Type.OBJECT,
                  properties: {
                    heroAge: { type: Type.STRING },
                    heroSex: { type: Type.STRING },
                    heroMood: { type: Type.STRING },
                    mainTheme: { type: Type.STRING }
                  }
                },
                storyAnalysis: {
                  type: Type.OBJECT,
                  properties: {
                    action: { type: Type.STRING },
                    outcome: { type: Type.STRING },
                    coherence: { type: Type.STRING }
                  }
                },
                observationAnalysis: { type: Type.STRING, description: "Feedback on whether the story was related to the image and observation accuracy." },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendations: { type: Type.STRING }
              }
            }
          }
        });
        return safeJSONParse(response.text);
    }

    // 4. TAT EVALUATION
    else if (testType === 'TAT') {
        const parts: Part[] = [{ text: "Evaluate TAT Dossier. Analyze each story for OLQs (Officer Like Qualities). Check consistency across stories." }];
        if (userData.tatPairs) {
            for (const pair of userData.tatPairs) {
                if (pair.stimulusImage) {
                    parts.push({ inlineData: { data: pair.stimulusImage, mimeType: 'image/jpeg' } });
                    parts.push({ text: `Stimulus for Story ${pair.storyIndex}` });
                }
                if (pair.userStoryImage) {
                     parts.push({ inlineData: { data: pair.userStoryImage, mimeType: 'image/jpeg' } });
                     parts.push({ text: `Handwritten Story ${pair.storyIndex}` });
                }
                if (pair.userStoryText) {
                    parts.push({ text: `Transcribed Story ${pair.storyIndex}: ${pair.userStoryText}` });
                }
            }
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER },
                        verdict: { type: Type.STRING },
                        individualStories: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    storyIndex: { type: Type.INTEGER },
                                    theme: { type: Type.STRING },
                                    analysis: { type: Type.STRING },
                                    olqProjected: { type: Type.STRING },
                                    perceivedAccurately: { type: Type.BOOLEAN }
                                }
                            }
                        },
                        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                        recommendations: { type: Type.STRING }
                    }
                }
            }
        });
        return safeJSONParse(response.text);
    }

    // 5. SDT EVALUATION
    else if (testType === 'SDT') {
        const prompt = `Evaluate Self Description Test (SDT).
        Candidate Inputs:
        Parents: ${userData.sdtData?.parents}
        Teachers: ${userData.sdtData?.teachers}
        Friends: ${userData.sdtData?.friends}
        Self: ${userData.sdtData?.self}
        Aim: ${userData.sdtData?.aim}
        
        Check for consistency, honesty, and OLQs.`;

        const parts: Part[] = [{ text: prompt }];
        // Add images if any
        if (userData.sdtImages) {
            Object.keys(userData.sdtImages).forEach(key => {
                const img = userData.sdtImages[key];
                if (img) {
                    parts.push({ inlineData: { data: img.data, mimeType: img.mimeType } });
                    parts.push({ text: `Handwritten ${key} paragraph` });
                }
            });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER },
                        verdict: { type: Type.STRING },
                        consistencyAnalysis: { type: Type.STRING },
                        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                        recommendations: { type: Type.STRING }
                    }
                }
            }
        });
        return safeJSONParse(response.text);
    }

    // Default Fallback
    return { 
        score: 0, 
        verdict: "Evaluation Error", 
        strengths: ["Attempted"], 
        weaknesses: ["System could not process"], 
        recommendations: "Please try again." 
    };
}

export async function transcribeHandwrittenStory(base64: string, mimeType: string) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: "Transcribe this handwritten text accurately. Return only the text content." }
                ]
            }
        });
        return response.text || "";
    } catch (e) {
        console.error("Transcription failed", e);
        return "";
    }
}

export async function extractPIQFromImage(base64: string, mimeType: string) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: "Extract PIQ data from this image into JSON format matching the standard SSB PIQ form structure." }
                ]
            },
            config: {
                responseMimeType: 'application/json'
            }
        });
        return safeJSONParse(response.text) || {};
    } catch (e) {
        console.error("OCR failed", e);
        return {};
    }
}

export async function fetchDailyNews() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Provide 5 latest defense and geopolitical news items relevant to India for SSB aspirants. Format with HEADLINE, TAG, SUMMARY, SSB_RELEVANCE. Separate items with ---NEWS_BLOCK---',
            config: {
                tools: [{ googleSearch: {} }]
            }
        });
        return { text: response.text, groundingMetadata: response.candidates?.[0]?.groundingMetadata };
    } catch (e) {
        console.error("News fetch failed", e);
        return { text: "", groundingMetadata: null };
    }
}

export function createSSBChat(): Chat {
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: "You are Major Veer, an expert SSB mentor. Guide the candidate on SSB procedure, OLQs, and mindset."
        }
    });
}

export async function generateLecturette(topic: string) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a lecturette outline for the topic: ${topic}. Structure: Introduction, Key Points (3), Conclusion.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        introduction: { type: Type.STRING },
                        keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                        conclusion: { type: Type.STRING }
                    }
                }
            }
        });
        return safeJSONParse(response.text);
    } catch (e) {
        console.error("Lecturette gen failed", e);
        return null;
    }
}

export async function generatePPDTStimulus(promptText: string) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: `Generate a black and white, slightly hazy and ambiguous charcoal sketch of a scene for SSB PPDT. Context: ${promptText}` }]
            }
        });
        
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        return "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80";
    } catch (e) {
        console.error("PPDT Image Generation Error", e);
        return "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80";
    }
}
