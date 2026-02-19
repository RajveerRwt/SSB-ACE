
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
 */
async function generateWithRetry(
    model: string, 
    params: any, 
    retries = 2
): Promise<GenerateContentResponse> {
    try {
        return await Promise.race([
            ai.models.generateContent({ ...params, model }),
            timeoutPromise(60000)
        ]) as GenerateContentResponse;
    } catch (e: any) {
        const errorCode = e.status || e.code || (e.error ? e.error.code : 0);
        const errorMessage = e.message || (e.error ? e.error.message : "") || JSON.stringify(e);
        
        const isOverloaded = 
            errorCode === 503 || 
            errorCode === 429 || 
            errorMessage.includes("high demand") || 
            errorMessage.includes("overloaded") ||
            errorMessage === "Request Timeout";
        
        if (isOverloaded) {
            let fallbackModel = '';
            if (model === 'gemini-3-pro-preview') fallbackModel = 'gemini-3-flash-preview';
            else if (model === 'gemini-3-flash-preview') fallbackModel = 'gemini-flash-latest';
            
            if (fallbackModel) {
                try {
                    return await Promise.race([
                        ai.models.generateContent({ ...params, model: fallbackModel }),
                        timeoutPromise(60000)
                    ]) as GenerateContentResponse;
                } catch (fallbackError) {}
            }
        }

        if (retries > 0) {
            await wait(2000); 
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
    return null;
  }
}

function generateErrorEvaluation(userData: any) {
    return {
        score: 0,
        verdict: "Pending Analysis",
        recommendations: "The AI is currently under high load. Your dossier has been saved securely. Please open this report from 'Mission Logs' in a few minutes to retry the analysis.",
        error: true,
        ...userData // Preserve story, narration, and images for later evaluation
    };
}

export async function evaluatePerformance(testType: string, userData: any) {
    try {
        // 1. INTERVIEW EVALUATION
        if (testType.includes('Interview') || userData.testType === 'Interview') {
            const prompt = `Evaluate Personal Interview for Officer Like Qualities. PIQ: ${JSON.stringify(userData.piq)}. Transcript: "${userData.transcript}"`;
            const response = await generateWithRetry('gemini-3-pro-preview', {
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            return safeJSONParse(response.text || "") || generateErrorEvaluation(userData);
        }

        // 2. PPDT EVALUATION
        else if (testType.includes('PPDT')) {
            const parts: Part[] = [{ text: `Act as an SSB Psychologist. Evaluate this PPDT attempt. Story: "${userData.story}". Narration: "${userData.narration}". Return JSON with score (0-10), verdict, strengths, weaknesses, recommendations, and idealStory.` }];
            
            if (userData.stimulusImage) parts.push({ inlineData: { data: userData.stimulusImage, mimeType: 'image/jpeg' } });
            if (userData.uploadedStoryImage) parts.push({ inlineData: { data: userData.uploadedStoryImage, mimeType: 'image/jpeg' } });

            const response = await generateWithRetry('gemini-3-pro-preview', {
                contents: { parts },
                config: { responseMimeType: 'application/json' }
            });
            return safeJSONParse(response.text || "") || generateErrorEvaluation(userData);
        }

        // 3. WAT / SRT EVALUATION
        else if (testType === 'WAT' || testType === 'SRT') {
            const response = await generateWithRetry('gemini-3-pro-preview', {
                contents: `Evaluate ${testType} responses: ${JSON.stringify(userData)}. Return JSON.`,
                config: { responseMimeType: 'application/json' }
            });
            return safeJSONParse(response.text || "") || generateErrorEvaluation(userData);
        }

        return generateErrorEvaluation(userData);
    } catch (e) {
        console.error("Evaluation API Error:", e);
        return generateErrorEvaluation(userData);
    }
}

export async function transcribeHandwrittenStory(base64: string, mimeType: string) {
    try {
        const response = await generateWithRetry('gemini-3-flash-preview', {
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: "Transcribe this handwritten text accurately. Return only the text." }
                ]
            }
        });
        return response.text || "";
    } catch (e) {
        return "Transcription unavailable (Service Busy). Please type manually.";
    }
}

export async function extractPIQFromImage(base64: string, mimeType: string) {
    try {
        const response = await generateWithRetry('gemini-3-flash-preview', {
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: "Extract PIQ data from this image into JSON format." }
                ]
            },
            config: { responseMimeType: 'application/json' }
        });
        return safeJSONParse(response.text || "") || {};
    } catch (e) {
        return {};
    }
}

export async function fetchDailyNews() {
    try {
        const response = await generateWithRetry('gemini-3-flash-preview', {
            contents: 'Provide 5 latest defense and geopolitical news items relevant to India for SSB aspirants.',
            config: { tools: [{ googleSearch: {} }] }
        });
        return { text: response.text || "", groundingMetadata: response.candidates?.[0]?.groundingMetadata };
    } catch (e) {
        return { text: "", groundingMetadata: null };
    }
}

export function createSSBChat(): Chat {
    return ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction: "You are Major Veer, an expert SSB mentor." }
    });
}

export async function generateLecturette(topic: string) {
    try {
        const response = await generateWithRetry('gemini-3-flash-preview', {
            contents: `Generate a lecturette outline for the topic: ${topic}.`,
            config: { responseMimeType: 'application/json' }
        });
        return safeJSONParse(response.text || "");
    } catch (e) {
        return null;
    }
}

export async function generatePPDTStimulus(promptText: string) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `SSB PPDT hazy charcoal sketch: ${promptText}` }] }
        });
        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80";
    } catch (e) {
        return "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80";
    }
}

// Fixing missing generateTestContent function in geminiService
export async function generateTestContent(testType: string) {
    try {
        const prompt = `Generate 60 items for SSB ${testType} test. If testType is WAT, return an array of words. If testType is SRT, return an array of situations. Return only JSON format with an "items" array where each object has a "content" field.`;
        const response = await generateWithRetry('gemini-3-flash-preview', {
            contents: prompt,
            config: { 
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        items: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    content: { type: Type.STRING }
                                },
                                required: ["content"]
                            }
                        }
                    },
                    required: ["items"]
                }
            }
        });
        return safeJSONParse(response.text || "") || { items: [] };
    } catch (e) {
        console.error("generateTestContent Error:", e);
        return { items: [] };
    }
}

// Fixing missing evaluateLecturette function in geminiService
export async function evaluateLecturette(topic: string, transcript: string, duration: number) {
    try {
        const prompt = `Act as an SSB GTO. Evaluate this Lecturette attempt. 
        Topic: "${topic}"
        Speech Duration: ${duration} seconds
        Transcript: "${transcript}"
        Return JSON with score (0-10), verdict, structureAnalysis, contentAnalysis, poeAnalysis, and timeManagementRemark.`;
        
        const response = await generateWithRetry('gemini-3-pro-preview', {
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return safeJSONParse(response.text || "") || { 
            score: 0, 
            verdict: "Evaluation Error", 
            structureAnalysis: "Analysis unavailable.", 
            contentAnalysis: "Analysis unavailable.", 
            poeAnalysis: "Analysis unavailable.", 
            timeManagementRemark: "Analysis unavailable." 
        };
    } catch (e) {
        console.error("evaluateLecturette Error:", e);
        return { 
            score: 0, 
            verdict: "Technical Failure", 
            structureAnalysis: "Connection lost during evaluation.", 
            contentAnalysis: "Connection lost during evaluation.", 
            poeAnalysis: "Connection lost during evaluation.", 
            timeManagementRemark: "Connection lost during evaluation." 
        };
    }
}
