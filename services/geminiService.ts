
import { GoogleGenAI, Type, Chat, Part, GenerateContentResponse } from "@google/genai";

/* 
 * Guidelines: 
 * Basic Text Tasks: 'gemini-3-flash-preview'
 * Complex Text Tasks: 'gemini-3.1-pro-preview'
 * Image Generation: 'gemini-2.5-flash-image'
 */
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });

export const STANDARD_WAT_SET = [
  "Blood", "Army", "War", "Victory", "Defeat", "Leader", "Follow", "Mother", "Father", "Sister",
  "Brother", "Teacher", "School", "Home", "Money", "Time", "Work", "Play", "Friend", "Enemy",
  "Love", "Hate", "Life", "Death", "Fear", "Courage", "Risk", "Help", "Give", "Take",
  "Order", "Obey", "Win", "Lose", "Success", "Failure", "Happy", "Sad", "Strong", "Weak",
  "Light", "Dark", "Sun", "Moon", "Star", "Sky", "Earth", "Water", "Fire", "Air",
  "Food", "Drink", "Sleep", "Wake", "Run", "Walk", "Jump", "Sit", "Stand", "Lie"
];

// --- HELPER FUNCTIONS FOR ROBUST API CALLS ---

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const timeoutPromise = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Request Timeout")), ms));

/**
 * Wraps generateContent with retry logic and smart fallback.
 * Handles 503 (Overloaded) errors by switching to faster models immediately.
 */
async function generateWithRetry(
    model: string, 
    params: any, 
    retries = 2
): Promise<GenerateContentResponse> {
    try {
        // Race API call against a 60s timeout (Increased for heavy WAT/SRT/TAT loads)
        return await Promise.race([
            ai.models.generateContent({ ...params, model }),
            timeoutPromise(60000)
        ]) as GenerateContentResponse;
    } catch (e: any) {
        // Extensive Error Parsing for 503/Overloaded/Unavailable/Timeout
        const errorCode = e.status || e.code || (e.error ? e.error.code : 0);
        const errorMessage = e.message || (e.error ? e.error.message : "") || JSON.stringify(e);
        const errorStatus = e.statusText || (e.error ? e.error.status : "");

        const isOverloaded = 
            errorCode === 503 || 
            errorCode === 429 || 
            errorStatus === "UNAVAILABLE" ||
            errorMessage.includes("high demand") || 
            errorMessage.includes("overloaded") ||
            errorMessage.includes("quota") ||
            errorMessage === "Request Timeout";
        
        // IMMEDIATE FALLBACK STRATEGY
        if (isOverloaded) {
            console.warn(`Model ${model} overloaded (Code: ${errorCode}). Attempting fallback sequence...`);
            
            // Fallback Priority Chain
            // 1. Try gemini-3-flash-preview (Fast, High Capacity)
            // 2. Try gemini-flash-latest (Reliable Legacy 1.5 Flash)
            
            let fallbackModel = '';
            if (model === 'gemini-3-pro-preview') fallbackModel = 'gemini-3-flash-preview';
            else if (model === 'gemini-3-flash-preview') fallbackModel = 'gemini-flash-latest';
            else if (model.includes('pro')) fallbackModel = 'gemini-3-flash-preview';
            
            if (fallbackModel && fallbackModel !== model) {
                console.warn(`Switching to fallback model: ${fallbackModel}`);
                try {
                    // Try fallback immediately with same 60s timeout
                    return await Promise.race([
                        ai.models.generateContent({ ...params, model: fallbackModel }),
                        timeoutPromise(60000)
                    ]) as GenerateContentResponse;
                } catch (fallbackError: any) {
                    console.error(`Fallback ${fallbackModel} also failed:`, fallbackError);
                    
                    // LEVEL 3 FALLBACK: If 3-Flash fails, try 1.5 Flash (Most Stable)
                    if (fallbackModel === 'gemini-3-flash-preview') {
                         console.warn("Attempting final fallback: gemini-flash-latest");
                         try {
                            return await Promise.race([
                                ai.models.generateContent({ ...params, model: 'gemini-flash-latest' }),
                                timeoutPromise(60000)
                            ]) as GenerateContentResponse;
                         } catch (finalError) {
                             console.error("All models exhausted.");
                         }
                    }
                }
            }
        }

        // Standard Retry Logic (Exponential Backoff)
        if (retries > 0) {
            const delay = 2000 * (3 - retries); // 2000ms, 4000ms
            console.warn(`Retrying request in ${delay}ms... (${retries} attempts left)`);
            await wait(delay); 
            return generateWithRetry(model, params, retries - 1);
        }

        throw e;
    }
}

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
        observationAnalysis: "Content insufficient for analysis.",
        scoreDetails: { perception: 0, content: 0, expression: 0 }
    };
}

function generateErrorEvaluation() {
    return {
        score: 0,
        verdict: "Technical Failure",
        strengths: ["Data Saved"],
        weaknesses: ["Server Busy"],
        recommendations: "The AI is currently overloaded. Your response has been saved locally. Please use the 'Retry Generation' button in the report to analyze this data again in a few moments.",
        perception: { heroAge: "-", heroSex: "-", heroMood: "-", mainTheme: "-" },
        storyAnalysis: { action: "-", outcome: "-", coherence: "-" },
        observationAnalysis: "Analysis pending due to high traffic.",
        scoreDetails: { perception: 0, content: 0, expression: 0 },
        error: true
    };
}

export async function generateTestContent(testType: string) {
  if (testType === 'SRT') {
      const response = await generateWithRetry(
          'gemini-3-flash-preview',
          {
              contents: 'Generate 60 varied Situation Reaction Test (SRT) questions for SSB interview. Return as a JSON array of strings.',
              config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                  }
              }
          }
      );
      return { items: safeJSONParse(response.text || "") || [] };
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
        const response = await generateWithRetry(
            'gemini-3.1-pro-preview', 
            {
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
            }
        );
        return safeJSONParse(response.text || "") || generateErrorEvaluation();
    } catch (e) {
        console.error("Lecturette Eval Failed", e);
        return { ...generateErrorEvaluation(), transcript }; // Return inputs
    }
}

export async function evaluatePerformance(testType: string, userData: any) {
    try {
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

            const response = await generateWithRetry(
                'gemini-3.1-pro-preview',
                {
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
                }
            );
            // MERGE USERDATA ON FAILURE
            const parsed = safeJSONParse(response.text || "");
            return parsed || { ...generateErrorEvaluation(), ...userData };
        }

        // 2. WAT / SRT EVALUATION
        else if (testType === 'WAT' || testType === 'SRT') {
            const isWAT = testType === 'WAT';
            const items = isWAT ? userData.watResponses : userData.srtResponses;
            const promptText = isWAT 
                ? `Evaluate Word Association Test responses. Check for OLQs, positivity, and spontaneity. Map the user's responses (from typed JSON or handwritten transcripts) to the provided Words by ID or Content. 
IMPORTANT RULES:
1. Return analysis for ALL items. If a word has no response, mark 'userResponse' as 'Not Attempted', but YOU MUST PROVIDE an 'idealResponse' for it.
2. STRICT SCORING (0-10): The overall score MUST reflect the number of valid, attempted responses. If a response is 'Not Attempted', gibberish, or completely unrelated to the word, it receives 0 marks.
3. If the majority of items are 'Not Attempted' or invalid, the overall score MUST be very low (e.g., 0-3) and the generalFeedback MUST state that the test was largely unattempted or invalid.
4. Do not generate a positive overall assessment or high score if the user failed to attempt the test properly.`
                : `Evaluate Situation Reaction Test responses. Check for quick decision making, social responsibility, and effectiveness. Map the user's responses (from typed JSON or handwritten transcripts) to the provided Situations by ID or Content. 
IMPORTANT RULES:
1. Return analysis for ALL items. If a situation has no response, mark 'userResponse' as 'Not Attempted', but YOU MUST PROVIDE an 'idealResponse' for it.
2. STRICT SCORING (0-10): The overall score MUST reflect the number of valid, attempted responses. If a response is 'Not Attempted', gibberish, or completely unrelated to the situation, it receives 0 marks.
3. If the majority of items are 'Not Attempted' or invalid, the overall score MUST be very low (e.g., 0-3) and the generalFeedback MUST state that the test was largely unattempted or invalid.
4. Do not generate a positive overall assessment or high score if the user failed to attempt the test properly.`;

            const parts: Part[] = [{ text: promptText }];
            
            const images = isWAT ? userData.watSheetImages : userData.srtSheetImages;
            if (images && images.length > 0) {
                images.forEach((img: string, i: number) => {
                    parts.push({ inlineData: { data: img, mimeType: 'image/jpeg' } });
                    parts.push({ text: `Page ${i+1} of handwritten responses.` });
                });
            }

            if (!isWAT && userData.srtSheetTranscripts && userData.srtSheetTranscripts.length > 0) {
                 const combinedTranscript = userData.srtSheetTranscripts.filter((t: string) => t).join('\n\n--- PAGE BREAK ---\n\n');
                 if (combinedTranscript.trim()) {
                    parts.push({ text: `[Handwritten Transcripts Provided by User]:\n${combinedTranscript}\n\nNote: Use these transcripts if the structured JSON responses are empty. Match answers to questions sequentially or by context.` });
                 }
            }

            if (isWAT && userData.watSheetTranscripts && userData.watSheetTranscripts.length > 0) {
                 const combinedTranscript = userData.watSheetTranscripts.filter((t: string) => t).join('\n\n--- PAGE BREAK ---\n\n');
                 if (combinedTranscript.trim()) {
                    parts.push({ text: `[Handwritten Transcripts Provided by User]:\n${combinedTranscript}\n\nNote: Use these transcripts if the structured JSON responses are empty. Match answers to words sequentially or by context.` });
                 }
            }

            parts.push({ text: `Candidate Typed Responses (Reference for IDs): ${JSON.stringify(items)}` });

            const response = await generateWithRetry(
                'gemini-3.1-pro-preview',
                {
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
                                        effective: { type: Type.INTEGER }, 
                                        partial: { type: Type.INTEGER },   
                                        passive: { type: Type.INTEGER }    
                                    }
                                },
                                detailedAnalysis: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            id: { type: Type.INTEGER, description: "The original Question ID from the input list." },
                                            word: { type: Type.STRING },      
                                            situation: { type: Type.STRING }, 
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
                }
            );
            // MERGE USERDATA ON FAILURE
            const parsed = safeJSONParse(response.text || "");
            return parsed || { ...generateErrorEvaluation(), ...userData };
        }

        // 3. PPDT EVALUATION
        else if (testType.includes('PPDT')) {
            combinedTextForFallback = (userData.story || "") + " " + (userData.narration || "");
            const wordCount = combinedTextForFallback.split(/\s+/).length;

            if (wordCount < 5) {
                return generateFallbackEvaluation(testType, combinedTextForFallback);
            }

            const parts: Part[] = [];
            parts.push({ text: `
            Act as an Expert Psychologist at the Services Selection Board (SSB). Evaluate this PPDT (Screening) attempt.
            
            *** STRICT SCORING RUBRIC (0-10) ***
            Calculate the 'score' by summing these 3 factors. BE CRITICAL.
            
            1. PERCEPTION (Max 3 Marks): 
            - Did the candidate identify the characters, mood, and setting accurately based on the STIMULUS IMAGE?
            - If the story contradicts the image (hallucination), Perception = 0.
            
            2. CONTENT & ACTION (Max 5 Marks):
            - Is there a clear Hero? 
            - Is there a defined problem/challenge?
            - Is the solution logical, practical, and positive?
            - Are OLQs (Initiative, Planning, Empathy) visible?
            
            3. EXPRESSION (Max 2 Marks):
            - Evaluate the provided "Candidate's Narration" transcript.
            - CRITICAL RULE: If the "Candidate's Narration" is empty, blank, "N/A", or contains less than 5 meaningful words, the Expression score MUST be 0. Do not give participation points for silence.
            - If narration exists: Fluency, clarity, and confidence determine the score.
            
            *** IMPORTANT ***
            - The 'score' MUST match your text assessment.
            - If the score is < 5, the 'verdict' must be 'Screened Out / Borderline'.
            - If the story is completely unrelated to the image, the total score CANNOT exceed 3.0.
            
            Return JSON.
            ` });

            if (userData.stimulusImage) {
                parts.push({ inlineData: { data: userData.stimulusImage, mimeType: 'image/jpeg' } });
                parts.push({ text: `Stimulus Image (What the candidate saw).` });
            }
            
            parts.push({ text: `Candidate's Story: "${userData.story}"` });
            parts.push({ text: `Candidate's Narration: "${userData.narration}"` });
            
            const response = await generateWithRetry(
                'gemini-3.1-pro-preview', 
                {
                    contents: { parts: parts },
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            score: { type: Type.NUMBER },
                            scoreDetails: {
                                type: Type.OBJECT,
                                properties: {
                                    perception: { type: Type.NUMBER, description: "Score out of 3 for accuracy of observation" },
                                    content: { type: Type.NUMBER, description: "Score out of 5 for story quality and OLQs" },
                                    expression: { type: Type.NUMBER, description: "Score out of 2 for narration flow" }
                                }
                            },
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
                            observationAnalysis: { type: Type.STRING, description: "Detailed feedback on whether the story matched the image provided. Mention missed details." },
                            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                            recommendations: { type: Type.STRING, description: "Final verdict explanation consistent with the calculated score." },
                            idealStory: { type: Type.STRING, description: "A short, high-scoring example story based on the same image." }
                        }
                        }
                    }
                }
            );
            // MERGE USERDATA ON FAILURE
            const parsed = safeJSONParse(response.text || "");
            return parsed || { ...generateErrorEvaluation(), ...userData };
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
            
            const response = await generateWithRetry(
                'gemini-3.1-pro-preview',
                {
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
                                            heroAnalysis: { type: Type.STRING, description: "Analysis of the hero's character and qualities." },
                                            actionAnalysis: { type: Type.STRING, description: "Analysis of the actions taken by the hero." },
                                            outcomeAnalysis: { type: Type.STRING, description: "Analysis of the story's outcome." },
                                            olqProjected: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of OLQs observed in this story." },
                                            perceivedAccurately: { type: Type.BOOLEAN },
                                            score: { type: Type.NUMBER, description: "Score for this individual story (0-10)." }
                                        }
                                    }
                                },
                                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                                recommendations: { type: Type.STRING }
                            }
                        }
                    }
                }
            );
            // MERGE USERDATA ON FAILURE
            const parsed = safeJSONParse(response.text || "");
            return parsed || { ...generateErrorEvaluation(), ...userData };
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
            if (userData.sdtImages) {
                Object.keys(userData.sdtImages).forEach(key => {
                    const img = userData.sdtImages[key];
                    if (img) {
                        parts.push({ inlineData: { data: img.data, mimeType: img.mimeType } });
                        parts.push({ text: `Handwritten ${key} paragraph` });
                    }
                });
            }

            const response = await generateWithRetry(
                'gemini-3.1-pro-preview',
                {
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
                }
            );
            // MERGE USERDATA ON FAILURE
            const parsed = safeJSONParse(response.text || "");
            return parsed || { ...generateErrorEvaluation(), ...userData };
        }

        return generateErrorEvaluation();
    } catch (e) {
        console.error("Evaluation API Error:", e);
        // CRITICAL FIX: Return inputs so they can be saved to Supabase for later retry
        return { 
            ...generateErrorEvaluation(), 
            ...userData 
        };
    }
}

export async function transcribeHandwrittenStory(base64: string, mimeType: string) {
    try {
        const response = await generateWithRetry(
            'gemini-3-flash-preview',
            {
                contents: {
                    parts: [
                        { inlineData: { data: base64, mimeType } },
                        { text: "Transcribe this handwritten text accurately. Return only the text content." }
                    ]
                }
            }
        );
        return response.text || "";
    } catch (e) {
        console.error("Transcription failed", e);
        return "";
    }
}

export async function extractPIQFromImage(base64: string, mimeType: string) {
    try {
        const response = await generateWithRetry(
            'gemini-3-flash-preview',
            {
                contents: {
                    parts: [
                        { inlineData: { data: base64, mimeType } },
                        { text: "Extract PIQ data from this image into JSON format matching the standard SSB PIQ form structure." }
                    ]
                },
                config: {
                    responseMimeType: 'application/json'
                }
            }
        );
        return safeJSONParse(response.text || "") || {};
    } catch (e) {
        console.error("OCR failed", e);
        return {};
    }
}

export async function fetchDailyNews() {
    try {
        const response = await generateWithRetry(
            'gemini-3-flash-preview',
            {
                contents: 'Provide 5 latest defense and geopolitical news items relevant to India for SSB aspirants. Format with HEADLINE, TAG, SUMMARY, SSB_RELEVANCE. Separate items with ---NEWS_BLOCK---',
                config: {
                    tools: [{ googleSearch: {} }]
                }
            }
        );
        return { text: response.text || "", groundingMetadata: response.candidates?.[0]?.groundingMetadata };
    } catch (e) {
        console.error("News fetch failed", e);
        return { text: "", groundingMetadata: null };
    }
}

export function createSSBChat(): Chat {
    return ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: "You are Major Veer, an expert SSB mentor. Guide the candidate on SSB procedure, OLQs, and mindset."
        }
    });
}

export async function generateLecturette(topic: string) {
    try {
        const response = await generateWithRetry(
            'gemini-3-flash-preview',
            {
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
            }
        );
        return safeJSONParse(response.text || "");
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
