
import { GoogleGenAI, Type, Chat, Part, GenerateContentResponse } from "@google/genai";

/* 
 * SSB Performance Optimization: 
 * Using Gemini 3 series for precision with aggressive fallback to Flash for availability.
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

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const timeoutPromise = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("GATEWAY_TIMEOUT")), ms));

/**
 * Wraps generateContent with robust error handling.
 * On 503 (Overloaded) or 429 (Rate Limit), it falls back to Flash IMMEDIATELY.
 * Includes a 25s hard timeout per attempt.
 */
async function generateWithRetry(
    model: string, 
    params: any, 
    retries = 0
): Promise<GenerateContentResponse> {
    try {
        // Hard timeout of 25s for the AI call
        return await Promise.race([
            ai.models.generateContent({ ...params, model }),
            timeoutPromise(25000)
        ]) as GenerateContentResponse;
    } catch (e: any) {
        const isOverloaded = e.status === 503 || e.status === 429 || (e.error && e.error.code === 503) || e.message === "GATEWAY_TIMEOUT";
        
        // If the heavy Pro model is busy, switch to Flash immediately
        if (isOverloaded && (model.includes('pro'))) {
            console.warn(`Primary model ${model} busy. Falling back to Flash for speed.`);
            try {
                return await Promise.race([
                    ai.models.generateContent({ ...params, model: 'gemini-3-flash-preview' }),
                    timeoutPromise(25000)
                ]) as GenerateContentResponse;
            } catch (fallbackError) {
                console.error("Critical: Both Pro and Flash models are busy.");
                throw e; 
            }
        }

        if (retries > 0) {
            await wait(1000);
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

/**
 * Returns a result object that preserves user input even if AI evaluation fails.
 * This allows the Dashboard logs to show the raw attempt and allows for future retry.
 */
function generatePendingEvaluation(userData: any) {
    return {
        ...userData, // Spread raw inputs (story, transcript, etc.)
        score: 0,
        verdict: "Evaluation Pending",
        recommendations: "The evaluation server is taking longer than expected. Your performance has been securely saved in your Mission Logs. You can view the full detailed report there once processed.",
        strengths: ["Persistence"],
        weaknesses: ["Server Delay"],
        isPending: true,
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
    const prompt = `Act as a GTO in SSB. Evaluate Lecturette: Topic: "${topic}", Transcript: "${transcript}", Time: ${durationSeconds}s. Return JSON.`;
    try {
        const response = await generateWithRetry('gemini-3-pro-preview', {
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return safeJSONParse(response.text || "") || generatePendingEvaluation({ transcript });
    } catch (e) {
        return generatePendingEvaluation({ transcript });
    }
}

export async function evaluatePerformance(testType: string, userData: any) {
    try {
        let prompt = "";
        let model = 'gemini-3-pro-preview';

        if (testType.includes('Interview') || userData.testType === 'Interview') {
            prompt = `Evaluate SSB Interview for candidate. PIQ: ${JSON.stringify(userData.piq)}. Transcript: "${userData.transcript}". Return detailed JSON assessment.`;
        } else if (testType === 'WAT' || testType === 'SRT') {
            prompt = `Evaluate ${testType} responses. Check for OLQs. User Data: ${JSON.stringify(userData)}. Return JSON analysis.`;
        } else if (testType.includes('PPDT')) {
            prompt = `Evaluate PPDT attempt. Story: "${userData.story}". Narration: "${userData.narration}". Return JSON score and feedback.`;
        } else if (testType === 'TAT') {
            prompt = `Evaluate TAT Dossier. Analyze for OLQs. Data: ${JSON.stringify(userData)}. Return JSON.`;
        } else if (testType === 'SDT') {
            prompt = `Evaluate Self Description. Consistency and OLQs. Data: ${JSON.stringify(userData)}. Return JSON.`;
        }

        const response = await generateWithRetry(model, {
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        
        return safeJSONParse(response.text || "") || generatePendingEvaluation(userData);
    } catch (e) {
        console.error("Evaluation API Error:", e);
        return generatePendingEvaluation(userData);
    }
}

export async function transcribeHandwrittenStory(base64: string, mimeType: string) {
    try {
        const response = await generateWithRetry('gemini-3-flash-preview', {
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: "Transcribe this handwritten text accurately. Return only the text content." }
                ]
            }
        });
        return response.text || "";
    } catch (e) {
        return "Transcription unavailable (Server Busy).";
    }
}

/**
 * Fixed createSSBChat to be synchronous as per SDK behavior to resolve SSBBot.tsx type errors
 */
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
        const response = await generateWithRetry('gemini-3-flash-preview', {
            contents: `Generate a lecturette outline for: ${topic}. JSON: {introduction, keyPoints:[], conclusion}`,
            config: { responseMimeType: 'application/json' }
        });
        return safeJSONParse(response.text || "");
    } catch (e) { return null; }
}

export async function generatePPDTStimulus(promptText: string) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Black and white hazy ambiguous charcoal sketch for SSB PPDT: ${promptText}` }] }
        });
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80";
    } catch (e) {
        return "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80";
    }
}

/**
 * Added extractPIQFromImage to resolve missing export error in PIQForm.tsx
 */
export async function extractPIQFromImage(base64: string, mimeType: string) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: "Extract the data from this PIQ form. Return a JSON object matching the PIQData structure (selectionBoard, batchNo, chestNo, rollNo, name, fatherName, residence, details, family, education, activities, previousAttempts)." }
                ]
            }],
            config: {
                responseMimeType: 'application/json'
            }
        });
        return safeJSONParse(response.text || "{}");
    } catch (e) {
        console.error("Vision API Error:", e);
        return null;
    }
}

/**
 * Added fetchDailyNews to resolve missing export error in CurrentAffairs.tsx and ResourceCenter.tsx
 */
export async function fetchDailyNews() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: "Fetch 6-8 latest national and international defense news articles relevant to SSB aspirants. For each article, provide HEADLINE, TAG, SUMMARY, and SSB_RELEVANCE. Separate each block with ---NEWS_BLOCK---.",
            config: {
                tools: [{ googleSearch: {} }]
            }
        });
        return {
            text: response.text,
            groundingMetadata: response.candidates?.[0]?.groundingMetadata
        };
    } catch (e) {
        console.error("News Search Error:", e);
        throw e;
    }
}
