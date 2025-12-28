
import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY || "";

export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: API_KEY });
};

/**
 * Generates a hazy, black & white PPDT style image using Gemini 2.5 Flash Image.
 */
export async function generatePPDTStimulus() {
  const ai = getGeminiClient();
  const scenarios = [
    "A person helping another climb a steep ledge in a village.",
    "People standing near a building with smoke coming out of windows.",
    "A group of people sitting on the ground in a rural setting, one person distributing food from a bucket.",
    "A person in military uniform talking to a group of villagers.",
    "A classroom scene with a teacher and small children, hazy atmosphere.",
    "Two people pushing a wooden cart on a mountain road.",
    "A person making an emergency call while another looks concerned in a dim room.",
    "People in a waiting room, one person looking anxious."
  ];
  
  const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  const prompt = `A hazy, blurry, low-contrast, black and white pencil-style sketch for an SSB PPDT test. 
  The scene shows: ${randomScenario}. 
  The image must be difficult to see clearly, as per PPDT standards.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: { imageConfig: { aspectRatio: "4:3" } }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data");
  } catch (error) {
    return "https://images.unsplash.com/photo-1541888941259-7b9192bb8de7?q=80&w=800&auto=format&fit=crop&blur=20&grayscale=true";
  }
}

export async function transcribeHandwrittenStory(base64Data: string, mimeType: string) {
  const ai = getGeminiClient();
  const prompt = "Accurately transcribe the handwritten SSB story. Return only the text.";
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }] },
  });
  return response.text;
}

export async function generateTestContent(type: string) {
  const ai = getGeminiClient();
  const prompt = `Generate content for an SSB ${type} test as JSON.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
                id: { type: Type.STRING },
                content: { type: Type.STRING }
              },
              required: ['id', 'content']
            }
          }
        },
        required: ['items']
      }
    }
  });
  return JSON.parse(response.text);
}

export async function evaluatePerformance(testType: string, userData: any) {
  const ai = getGeminiClient();
  const prompt = `Act as a Senior SSB Selection Board Psychologist and Interviewing Officer. 
  Conduct a DEEP analysis of the candidate's ${testType} performance based on the 15 Officer Like Qualities (OLQs).
  
  The interview was a long-form session (30-60 mins). 
  Analyze dialogue depth, consistency in responses, and psychological projection.
  
  OLQ Factors to evaluate:
  - Planning & Organizing (Effective Intelligence, Reasoning Ability, Organizing Ability, Power of Expression)
  - Social Adjustment (Social Adaptability, Cooperation, Sense of Responsibility)
  - Social Effectiveness (Initiative, Self Confidence, Speed of Decision, Ability to Influence Group, Liveliness)
  - Dynamic (Determination, Courage, Stamina)

  Data: ${JSON.stringify(userData)}
  
  Return a detailed JSON result following this exact schema.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          verdict: { type: Type.STRING, description: 'Recommended or Not Recommended with a brief summary' },
          olqAnalysis: {
            type: Type.OBJECT,
            properties: {
              planning: { type: Type.STRING },
              socialAdjustment: { type: Type.STRING },
              socialEffectiveness: { type: Type.STRING },
              dynamic: { type: Type.STRING }
            }
          },
          improvementPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Actionable points for improvement'
          },
          recommendations: { type: Type.STRING, description: 'Final concluding remarks' }
        },
        required: ['score', 'verdict', 'olqAnalysis', 'improvementPoints', 'recommendations']
      }
    }
  });

  return JSON.parse(response.text);
}
