
import { GoogleGenAI, Type } from "@google/genai";

// Helper to get Gemini client with API key from environment
export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Creates a chat session for the SSB Bot (Major Veer Persona).
 */
export function createSSBChat() {
  const ai = getGeminiClient();
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are Major Veer, a senior SSB assessor and expert mentor for defense aspirants.
      
      MISSION:
      Guide candidates through the Services Selection Board (SSB) process (5-Day procedure).
      
      EXPERTISE:
      1. Screening (OIR, PPDT).
      2. Psychology (TAT, WAT, SRT, SD).
      3. GTO Tasks (Ground Tasks, Command Tasks, Snake Race).
      4. Personal Interview (PIQ analysis, OLQs).
      5. Conference.
      
      PROTOCOL:
      - Tone: Professional, authoritative yet encouraging, concise, and military-like.
      - Use terms like "Gentleman", "Roger", "Assessors", "OLQs (Officer Like Qualities)".
      - Focus on developing personality traits: Integrity, Courage, Determination, Teamwork.
      - If asked about non-defense topics, firmly strictly redirect to SSB preparation.
      
      FORMAT:
      - Keep responses structured (bullet points where possible).
      - Be direct. Do not waffle.`,
    }
  });
}

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
    "A boy looking at a violin with a look of intense longing.",
    "A hazy silhouette of a surgeon standing over a patient.",
    "A young man looking at a torn letter, face showing shock.",
    "A solitary person standing at a graveyard.",
    "A woman looking into a mirror, reflection showing a different face.",
    "Two figures in a field; one pointing towards a distant storm.",
    "A student at a desk with many books, face showing exhaustion.",
    "An elderly man giving a key to a young person.",
    "A person in a dark room with a single lantern, writing.",
    "A figure standing at the edge of a mountain looking at a valley.",
    "A person rowing a boat in a turbulent sea."
  ];
  
  const finalScenario = description || scenarios[Math.floor(Math.random() * scenarios.length)];
  const prompt = `A professional black and white pencil sketch for an SSB psychological TAT stimulus. 
  Scene: ${finalScenario}. 
  Style: Hazy, vague, minimalist pencil line art. Evocative storytelling art on textured paper. High contrast. DIPR style.`;

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
  const prompt = "Transcribe this handwritten SSB story accurately. Also, identify if there is a 'Character Box' (a small rectangle with symbols like P, N, M, F and age numbers). Transcribe the story text only.";
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }] },
  });
  return response.text;
}

export async function generateTestContent(type: string) {
  const ai = getGeminiClient();
  
  // Isolated Prompts based on Type to prevent cross-contamination
  let systemPrompt = '';
  let count = 60;

  if (type === 'TAT') {
    count = 11;
    systemPrompt = `Generate exactly 11 vague, descriptive scenarios for a Thematic Apperception Test (TAT). 
    Do NOT include prefixes like "TAT:". Provide descriptive prompts like "A surgeon in a dark room" or "A student with a letter". 
    Each item must be a scene description.`;
  } else if (type === 'WAT') {
    count = 60;
    systemPrompt = `Generate exactly 60 single, high-impact words for a Word Association Test (WAT). 
    Words must be Nouns, Verbs, or Adjectives related to daily life and psychology. 
    Do NOT include prefixes like "WAT:" or "Word:". Just the single word in uppercase. 
    Examples: COURAGE, FAILURE, HOME, SOCIETY, DEATH.`;
  } else if (type === 'SRT') {
    count = 60;
    systemPrompt = `Generate exactly 60 Situation Reaction Test (SRT) items. 
    Each situation MUST start with "He/She" and end with "He/She..." or "...". 
    Do NOT include prefixes like "SRT:". 
    Example: "He was traveling in a train and realized his wallet was stolen. He..."`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: systemPrompt,
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
                content: { type: Type.STRING, description: "The core content of the item without any test-type prefixes." } 
              },
              required: ['id', 'content']
            }
          }
        },
        required: ['items']
      }
    }
  });

  const parsed = JSON.parse(response.text);
  
  parsed.items = parsed.items.map((item: any) => ({
    ...item,
    content: item.content.replace(/^(TAT|WAT|SRT|Word|Situation):\s*/i, '').trim()
  }));

  return parsed;
}

/**
 * Enhanced Evaluation Function with Specific Schemas per Test
 */
export async function evaluatePerformance(testType: string, userData: any) {
  const ai = getGeminiClient();
  const contents: any[] = [];
  
  // ==========================================================
  // 1. TAT EVALUATION (Story-by-Story Analysis)
  // ==========================================================
  if (userData.testType === 'TAT' && userData.tatImages) {
    userData.tatImages.forEach((base64: string, i: number) => {
      if (base64) {
        contents.push({
          inlineData: { data: base64, mimeType: 'image/jpeg' }
        });
      }
    });
    
    const prompt = `Act as a Senior SSB Psychologist. Review these handwritten TAT stories (up to 12).
    Provide a specific analysis for EACH story regarding its theme and the quality projected.
    Then, provide a final dossier assessment.`;
    contents.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: contents },
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
                  olqProjected: { type: Type.STRING }
                }
              }
            },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.STRING }
          },
          required: ['score', 'verdict', 'individualStories', 'strengths', 'weaknesses', 'recommendations']
        }
      }
    });
    return JSON.parse(response.text);
  } 
  
  // ==========================================================
  // 2. PPDT EVALUATION (Hero, Action, Outcome)
  // ==========================================================
  else if (testType.includes('PPDT')) {
    if (userData.uploadedStoryImage) {
      contents.push({
        inlineData: { data: userData.uploadedStoryImage, mimeType: 'image/jpeg' }
      });
    }
    const prompt = `Act as an SSB Psychologist for PPDT.
    Context Stimulus: "${userData.visualStimulusProvided || 'Unknown'}".
    Handwritten Story text: "${userData.story}".
    Narration: "${userData.narration}".
    
    Evaluate:
    1. Identification of Hero (Age, Sex, Mood).
    2. The Main Theme (Past/Present/Future).
    3. Action/Problem Solving.
    4. Outcome.
    5. Narration confidence.`;
    contents.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: contents },
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
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.STRING }
          },
          required: ['score', 'verdict', 'perception', 'storyAnalysis', 'strengths', 'weaknesses', 'recommendations']
        }
      }
    });
    return JSON.parse(response.text);
  }

  // ==========================================================
  // 3. INTERVIEW EVALUATION (Factor-wise OLQs)
  // ==========================================================
  else if (testType.includes('Interview')) {
     const prompt = `Act as an Interviewing Officer (IO) at SSB.
     Analyze this interview transcript based on the 4 factors of Officer Like Qualities (OLQ).
     Transcript: "${userData.transcript}".
     PIQ Context: ${JSON.stringify(userData.piq)}.
     
     Provide a breakdown for:
     1. Planning & Organizing (Factor I)
     2. Social Adjustment (Factor II)
     3. Social Effectiveness (Factor III)
     4. Dynamic (Factor IV)
     `;
     contents.push({ text: prompt });

     const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: contents },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            verdict: { type: Type.STRING },
            factorAnalysis: {
              type: Type.OBJECT,
              properties: {
                factor1_planning: { type: Type.STRING, description: "Reasoning ability, organizing ability, power of expression" },
                factor2_social: { type: Type.STRING, description: "Social adaptability, cooperation, sense of responsibility" },
                factor3_effectiveness: { type: Type.STRING, description: "Initiative, self-confidence, speed of decision, ability to influence" },
                factor4_dynamic: { type: Type.STRING, description: "Determination, courage, stamina" }
              }
            },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.STRING }
          },
          required: ['score', 'verdict', 'factorAnalysis', 'strengths', 'weaknesses', 'recommendations']
        }
      }
    });
    return JSON.parse(response.text);
  }

  // Default Fallback
  return { score: 0, verdict: 'Error', strengths: [], weaknesses: [], recommendations: 'Could not process test type.' };
}
