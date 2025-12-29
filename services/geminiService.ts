
import { GoogleGenAI, Type } from "@google/genai";

// Helper to get Gemini client with API key from environment
export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Extracts PIQ data from an uploaded image.
 */
export async function extractPIQFromImage(base64Data: string, mimeType: string) {
  const ai = getGeminiClient();
  const prompt = `Act as an expert SSB clerk. Extract info from this PIQ form (DIPR 107-A).
  Map to JSON: name, fatherName, selectionBoard, batchNo, chestNo, rollNo, residence, details (religion, category, tongue, dob, marital), family (array), education (array), activities.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }] },
    config: { 
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          fatherName: { type: Type.STRING },
          selectionBoard: { type: Type.STRING },
          batchNo: { type: Type.STRING },
          chestNo: { type: Type.STRING },
          rollNo: { type: Type.STRING },
          residence: {
            type: Type.OBJECT,
            properties: {
              max: { type: Type.STRING },
              present: { type: Type.STRING },
              permanent: { type: Type.STRING }
            }
          },
          details: {
            type: Type.OBJECT,
            properties: {
              religion: { type: Type.STRING },
              category: { type: Type.STRING },
              motherTongue: { type: Type.STRING },
              dob: { type: Type.STRING },
              maritalStatus: { type: Type.STRING }
            }
          },
          family: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                relation: { type: Type.STRING },
                education: { type: Type.STRING },
                occupation: { type: Type.STRING },
                income: { type: Type.STRING }
              }
            }
          },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                qualification: { type: Type.STRING },
                institution: { type: Type.STRING },
                board: { type: Type.STRING },
                year: { type: Type.STRING },
                marks: { type: Type.STRING },
                medium: { type: Type.STRING },
                status: { type: Type.STRING },
                achievement: { type: Type.STRING }
              }
            }
          },
          activities: {
            type: Type.OBJECT,
            properties: {
              ncc: { type: Type.STRING },
              games: { type: Type.STRING },
              hobbies: { type: Type.STRING },
              extraCurricular: { type: Type.STRING },
              responsibilities: { type: Type.STRING }
            }
          }
        }
      }
    }
  });
  return JSON.parse(response.text);
}

/**
 * Generates hazy pencil sketches for TAT/PPDT.
 */
export async function generateVisualStimulus(scenarioType: 'PPDT' | 'TAT', description?: string) {
  const ai = getGeminiClient();
  
  const scenarios = scenarioType === 'PPDT' ? [
    "A group of people discussing something near a damaged vehicle on a road.",
    "A person helping another climb a steep ledge in a village.",
    "People standing near a building with smoke coming out of windows.",
    "A person in military uniform talking to a group of villagers."
  ] : [
    "A boy looking at a violin with a look of intense longing and hidden determination.",
    "A hazy silhouette of a surgeon standing over a patient, showing focused resolve.",
    "A young man looking at a torn letter, face showing shock and grief.",
    "A solitary person standing at a graveyard, head bowed, mourning with a slight peaceful smile.",
    "A woman looking into a mirror, the reflection showing a face full of courage despite her actual tired state.",
    "Two figures in a field; one pointing towards a distant storm with urgency, the other listening calmly.",
    "A student at a desk with many books, face showing exhaustion but grit in the eyes.",
    "An elderly man giving a key to a young person, a look of profound trust on his face.",
    "A person in a dark room with a single lantern, writing intensely on a paper.",
    "A figure standing at the edge of a mountain looking at a valley, face showing a sense of victory.",
    "A person rowing a boat in a turbulent sea, facing the waves with a stern, focused expression."
  ];
  
  const finalScenario = description || scenarios[Math.floor(Math.random() * scenarios.length)];
  const prompt = `A professional black and white pencil sketch for an SSB psychological TAT stimulus. 
  Scene: ${finalScenario}. 
  Style: Emotional facial expressions (resolve, grit, grief, or concentration) are clearly visible but the background is hazy and slightly vague. Minimalist pencil line art, looking exactly like an official DIPR psychological drawing. No modern technology artifacts, just classic evocative storytelling art on textured white paper. Very high contrast.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "4:3" } }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image part");
  } catch (error) {
    return "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800&auto=format&fit=crop&grayscale=true";
  }
}

export async function generatePPDTStimulus(description?: string) {
  return generateVisualStimulus('PPDT', description);
}

export async function generateTATStimulus(description?: string) {
  return generateVisualStimulus('TAT', description);
}

export async function transcribeHandwrittenStory(base64Data: string, mimeType: string) {
  const ai = getGeminiClient();
  const prompt = "Transcribe this handwritten SSB story accurately. Return only text.";
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }] },
  });
  return response.text;
}

export async function generateTestContent(type: string) {
  const ai = getGeminiClient();
  const itemCount = (type === 'WAT' || type === 'SRT') ? 60 : (type === 'TAT' ? 11 : 10); 
  
  const srtPrompt = `Generate exactly 60 Situation Reaction Test (SRT) items for an SSB session. 
  Style: Follow the SSBCrack/DIPR format. Each situation MUST start with 'He/She' and MUST end with 'He/She...' or '...' 
  Example: 'He was going to appear for his exam and he forgot his hall ticket. He...' 
  Example: 'While traveling in a train, he saw some persons throwing stones at the train. He...'
  Cover themes of: Social problems, Military leadership, Personal emergencies, Responsibility, Integrity, and Group cooperation.`;

  const standardPrompt = `Generate ${itemCount} items for an SSB ${type} test as JSON. 
  For TAT, provide vague descriptive scenarios. 
  For WAT, provide impactful words (Verbs, Nouns, Adjectives).`;

  const finalPrompt = type === 'SRT' ? srtPrompt : standardPrompt;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: finalPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { id: { type: Type.STRING }, content: { type: Type.STRING } },
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
  const prompt = `Act as a Senior SSB Psychologist. Analyze this ${testType} session.
  Data: ${JSON.stringify(userData)}
  Evaluate 15 Officer Like Qualities (OLQs). Focus on: Hero identification, Social Effectiveness, Logic, and Character Maturity. 
  Provide a professional report in JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          verdict: { type: Type.STRING },
          olqAnalysis: {
            type: Type.OBJECT,
            properties: {
              planning: { type: Type.STRING },
              socialAdjustment: { type: Type.STRING },
              socialEffectiveness: { type: Type.STRING },
              dynamic: { type: Type.STRING }
            }
          },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.STRING },
          improvementPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['score', 'verdict', 'olqAnalysis', 'strengths', 'weaknesses', 'recommendations', 'improvementPoints']
      }
    }
  });
  return JSON.parse(response.text);
}
