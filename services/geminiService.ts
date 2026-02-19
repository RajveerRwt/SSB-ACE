
import { GoogleGenAI, Type, Chat, Part, GenerateContentResponse } from "@google/genai";

/* 
 * Guidelines: 
 * Basic Text Tasks: 'gemini-3-flash-preview'
 * Complex Text Tasks: 'gemini-3-pro-preview'
 * Image Generation: 'gemini-2.5-flash-image'
 */
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
            
            let fallbackModel = '';
            if (model === 'gemini-3-pro-preview') fallbackModel = 'gemini-3-flash-preview';
            else if (model === 'gemini-3-flash-preview') fallbackModel = 'gemini-flash-latest';
            else if (model.includes('pro')) fallbackModel = 'gemini-3-flash-preview';
            
            if (fallbackModel && fallbackModel !== model) {
                console.warn(`Switching to fallback model: ${fallbackModel}`);
                try {
                    return await Promise.race([
                        ai.models.generateContent({ ...params, model: fallbackModel }),
                        timeoutPromise(60000)
                    ]) as GenerateContentResponse;
                } catch (fallbackError: any) {
                    console.error(`Fallback ${fallbackModel} also failed:`, fallbackError);
                    
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

        if (retries > 0) {
            const delay = 2000 * (3 - retries); 
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
        recommendations: "The AI is currently overloaded. Your response has been saved safely in 'Mission Logs'. Please retry analysis from there in a few minutes.",
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

    Return JSON:
    {
        "score": number (0-10),
        "structureAnalysis": "Specific feedback",
        "contentAnalysis": "Feedback",
        "poeAnalysis": "Feedback",
        "timeManagementRemark": "Feedback",
        "verdict": "Recommended / Needs Improvement",
        "improvementTips": ["Tip 1"]
    }
    `;

    try {
        const response = await generateWithRetry('gemini-3-pro-preview', { contents: prompt, config: { responseMimeType: 'application/json' } });
        return safeJSONParse(response.text || "") || generateErrorEvaluation();
    } catch (e) {
        return { ...generateErrorEvaluation(), topic, transcript, durationSeconds }; 
    }
}

export async function evaluatePerformance(testType: string, userData: any) {
    try {
        // 1. INTERVIEW EVALUATION
        if (testType.includes('Interview') || userData.testType === 'Interview') {
            const prompt = `Evaluate Candidate based on Personal Interview Transcript. PIQ: ${JSON.stringify(userData.piq)}. Transcript: "${userData.transcript}"`;
            const response = await generateWithRetry('gemini-3-pro-preview', { contents: prompt, config: { responseMimeType: 'application/json' } });
            const parsed = safeJSONParse(response.text || "");
            return parsed || { ...generateErrorEvaluation(), ...userData };
        }

        // 2. WAT / SRT EVALUATION
        else if (testType === 'WAT' || testType === 'SRT') {
            const isWAT = testType === 'WAT';
            const parts: Part[] = [{ text: `Evaluate ${testType} responses.` }];
            const images = isWAT ? userData.watSheetImages : userData.srtSheetImages;
            if (images) images.forEach((img: string) => parts.push({ inlineData: { data: img, mimeType: 'image/jpeg' } }));
            parts.push({ text: `Typed Responses: ${JSON.stringify(isWAT ? userData.watResponses : userData.srtResponses)}` });

            const response = await generateWithRetry('gemini-3-pro-preview', { contents: { parts }, config: { responseMimeType: 'application/json' } });
            const parsed = safeJSONParse(response.text || "");
            return parsed || { ...generateErrorEvaluation(), ...userData };
        }

        // 3. PPDT EVALUATION
        else if (testType.includes('PPDT')) {
            const combinedText = (userData.story || "") + " " + (userData.narration || "");
            if (combinedText.split(/\s+/).length < 5) return generateFallbackEvaluation(testType, combinedText);

            const parts: Part[] = [{ text: `Act as SSB Psychologist. Evaluate PPDT story: "${userData.story}" and narration: "${userData.narration}" based on the provided stimulus.` }];
            if (userData.stimulusImage) parts.push({ inlineData: { data: userData.stimulusImage, mimeType: 'image/jpeg' } });
            
            const response = await generateWithRetry('gemini-3-pro-preview', { contents: { parts }, config: { responseMimeType: 'application/json' } });
            const parsed = safeJSONParse(response.text || "");
            // CRITICAL: Always merge userData back on failure
            return parsed || { ...generateErrorEvaluation(), ...userData };
        }

        // 4. TAT EVALUATION
        else if (testType === 'TAT') {
            const parts: Part[] = [{ text: "Evaluate TAT Dossier." }];
            if (userData.tatPairs) {
                userData.tatPairs.forEach((pair: any) => {
                    if (pair.stimulusImage) parts.push({ inlineData: { data: pair.stimulusImage, mimeType: 'image/jpeg' } });
                    if (pair.userStoryImage) parts.push({ inlineData: { data: pair.userStoryImage, mimeType: 'image/jpeg' } });
                    parts.push({ text: `Story: ${pair.userStoryText}` });
                });
            }
            const response = await generateWithRetry('gemini-3-pro-preview', { contents: { parts }, config: { responseMimeType: 'application/json' } });
            const parsed = safeJSONParse(response.text || "");
            return parsed || { ...generateErrorEvaluation(), ...userData };
        }

        return generateErrorEvaluation();
    } catch (e) {
        console.error("Evaluation API Error:", e);
        return { ...generateErrorEvaluation(), ...userData };
    }
}

export async function transcribeHandwrittenStory(base64: string, mimeType: string) {
    try {
        const response = await generateWithRetry('gemini-3-flash-preview', { contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: "Transcribe text." }] } });
        return response.text || "";
    } catch (e) {
        return "Transcription unavailable (Server Busy).";
    }
}

export async function extractPIQFromImage(base64: string, mimeType: string) {
    try {
        const response = await generateWithRetry('gemini-3-flash-preview', { contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: "Extract PIQ JSON." }] }, config: { responseMimeType: 'application/json' } });
        return safeJSONParse(response.text || "") || {};
    } catch (e) { return {}; }
}

export async function fetchDailyNews() {
    try {
        const response = await generateWithRetry('gemini-3-flash-preview', { contents: 'Latest defense news for India.', config: { tools: [{ googleSearch: {} }] } });
        return { text: response.text || "", groundingMetadata: response.candidates?.[0]?.groundingMetadata };
    } catch (e) { return { text: "", groundingMetadata: null }; }
}

export function createSSBChat(): Chat {
    return ai.chats.create({ model: 'gemini-3-flash-preview', config: { systemInstruction: "SSB Mentor." } });
}

export async function generateLecturette(topic: string) {
    try {
        const response = await generateWithRetry('gemini-3-flash-preview', { contents: `Outline for ${topic}`, config: { responseMimeType: 'application/json' } });
        return safeJSONParse(response.text || "");
    } catch (e) { return null; }
}

export async function generatePPDTStimulus(promptText: string) {
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [{ text: `Charcoal sketch for PPDT: ${promptText}` }] } });
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80";
    } catch (e) { return "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80"; }
}
