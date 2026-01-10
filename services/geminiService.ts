
import { GoogleGenAI, Type } from "@google/genai";

// Helper to get Gemini client with API key from environment
export const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  
  // Debug Log for Cloud Troubleshooting
  if (!apiKey) {
    console.error("SSBprep.online Critical: API_KEY is MISSING in environment. App is running in offline fallback mode.");
  }

  // Fixed: Always use exactly new GoogleGenAI({ apiKey: process.env.API_KEY }) as per guidelines
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper to safely parse JSON from AI response that might contain Markdown code blocks
const safeJSONParse = (text: string | undefined) => {
  if (!text) return {};
  try {
    // Strip markdown code fences if present (e.g. ```json ... ```)
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error on AI Response:", e);
    // Return a valid fallback structure so the UI doesn't crash
    return {
      score: 0,
      verdict: "Evaluation Error",
      recommendations: "The AI assessment could not be processed. This might be due to a network interruption or empty response content.",
      strengths: ["N/A"],
      weaknesses: ["N/A"],
      factorAnalysis: {},
      perception: {},
      individualStories: []
    };
  }
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
  return safeJSONParse(response.text);
}

/**
 * Generates hazy pencil sketches for TAT/PPDT.
 */
export async function generateVisualStimulus(scenarioType: 'PPDT' | 'TAT', description?: string) {
  const ai = getGeminiClient();
  
  // Real SSB Archive Scenarios (Based on Centurion/SSBCrack references)
  const ppdtScenarios = [
    "A group of 3 young men standing near a jeep discussing a map",
    "A doctor checking a patient while a woman watches anxiously",
    "A man helping another man climb a wall or steep ledge",
    "Students sitting in a circle having a discussion",
    "A farmer talking to a man in formal clothes in a field",
    "A scene of an accident on the road with a few people gathering",
    "Two people pushing a cart uphill",
    "3 people gathered around a table with papers on it",
    "A person saving someone from drowning"
  ];

  const tatScenarios = [
    "A young man sitting alone with his head in his hands",
    "A woman standing at a door looking into a dark room",
    "A boy looking at a trophy on a high shelf",
    "Two men in uniform talking seriously near a tent",
    "A person rowing a boat alone in a storm",
    "A young man looking at a violin with a contemplative expression",
    "A person standing on a cliff edge looking at the horizon",
    "A student studying late at night with a lamp",
    "A woman sitting on a park bench looking at a letter",
    "Two people arguing in a room"
  ];
  
  const scenarios = scenarioType === 'PPDT' ? ppdtScenarios : tatScenarios;
  const finalScenario = description || scenarios[Math.floor(Math.random() * scenarios.length)];
  
  // OPTIMIZED PROMPT: Simpler prompt to ensure generation succeeds.
  const prompt = `Charcoal sketch of: ${finalScenario}. 
  Style: Rough, vintage, black and white sketch on paper. 
  Details: Ambiguous, hazy, high contrast, no colors.`;

  try {
    // Upgraded to Pro model for better adherence to "sketch" style
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: { 
        imageConfig: { aspectRatio: "4:3", imageSize: "1K" }
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    // If we get here, no image part was found (maybe text refused)
    console.warn("Gemini Image Gen: No image part in response. Using fallback.");
    throw new Error("No image part generated");
  } catch (error) {
    console.error("Image Gen Error (using fallback):", error);
    
    // ENHANCED BACKUP STRATEGY:
    const filters = "&sat=-100&blur=2&contrast=20";

    if (scenarioType === 'PPDT') {
        const backups = [
          `https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80${filters}`, 
          `https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80${filters}`, 
          `https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80${filters}` 
        ];
        return backups[Math.floor(Math.random() * backups.length)];
    } else {
        const backups = [
           `https://images.unsplash.com/photo-1504194569302-3c4ba34c1422?auto=format&fit=crop&w=800&q=80${filters}`, 
           `https://images.unsplash.com/photo-1485178575877-1a13bf489dfe?auto=format&fit=crop&w=800&q=80${filters}`, 
           `https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=800&q=80${filters}` 
        ];
        return backups[Math.floor(Math.random() * backups.length)];
    }
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
  const prompt = "Transcribe this handwritten SSB story accurately. Also, identify if there is a 'Character Box'. Transcribe the story text only.";
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }] },
  });
  return response.text || "";
}

export async function generateTestContent(type: string) {
  const ai = getGeminiClient();
  
  let systemPrompt = '';

  if (type === 'TAT') {
    systemPrompt = `Generate exactly 11 simple, descriptive scenarios for a Thematic Apperception Test (TAT). 
    Each scenario must be suitable for a sketch.
    Example: "A doctor examining a patient", "Two soldiers talking near a tent".
    Return a JSON array of items with 'id' and 'content'.`;
  } else if (type === 'WAT') {
    systemPrompt = `Generate exactly 60 single words for a Word Association Test (WAT).
    Words: Nouns/Verbs/Adjectives. High impact.
    Return JSON.`;
  } else if (type === 'SRT') {
    systemPrompt = `Generate exactly 60 Situation Reaction Test (SRT) items.
    Format: "He was...".
    Return JSON.`;
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

  const parsed = safeJSONParse(response.text);
  
  // Cleanup prefixes if any exist
  if (parsed.items) {
      parsed.items = parsed.items.map((item: any) => ({
        ...item,
        content: item.content.replace(/^(TAT|WAT|SRT|Word|Situation):\s*/i, '').trim()
      }));
  } else {
      parsed.items = [];
  }

  return parsed;
}

/**
 * Enhanced Evaluation Function with Specific Schemas per Test
 */
export async function evaluatePerformance(testType: string, userData: any) {
  const ai = getGeminiClient();
  const contents: any[] = [];
  
  // 1. TAT EVALUATION
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
      model: 'gemini-3-flash-preview', // Using Flash for faster evaluation
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
    return safeJSONParse(response.text);
  } 
  
  // 2. PPDT EVALUATION
  else if (testType.includes('PPDT')) {
    const ppdtParts: any[] = [];
    
    // 1. Stimulus Image (The hazy picture)
    if (userData.stimulusImage) {
        ppdtParts.push({ text: "Input 1: VISUAL STIMULUS (Hazy Picture shown to candidate):" });
        ppdtParts.push({
            inlineData: { data: userData.stimulusImage, mimeType: 'image/jpeg' }
        });
    }

    // 2. Candidate's Response (Handwritten)
    if (userData.uploadedStoryImage) {
      ppdtParts.push({ text: "Input 2: CANDIDATE'S HANDWRITTEN RESPONSE (Story + Character Box):" });
      ppdtParts.push({
        inlineData: { data: userData.uploadedStoryImage, mimeType: 'image/jpeg' }
      });
    }

    const prompt = `Act as an Expert SSB Psychologist for PPDT (Picture Perception & Description Test).
    
    INPUTS:
    1. Visual Stimulus: The hazy picture shown above (if provided).
    2. Handwritten Story: The candidate's paper response (if provided).
    3. Transcribed Story Text: "${userData.story}".
    4. Oral Narration Transcript: "${userData.narration}".
    5. Context Description: "${userData.visualStimulusProvided || 'Unknown'}".

    TASK:
    1. Compare the candidate's story with the Visual Stimulus. Is the perception accurate to the stimulus?
    2. Analyze the 'Character Box' data from the handwritten image if visible (Age, Sex, Mood).
    3. Evaluate the Hero's qualities, the Theme (Action), and the Outcome.
    4. Check for consistency between the written story and the narration.

    Provide a detailed assessment in JSON.`;
    
    ppdtParts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: ppdtParts },
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
    return safeJSONParse(response.text);
  }

  // 3. INTERVIEW EVALUATION
  else if (testType.includes('Interview')) {
     const prompt = `Act as an Interviewing Officer (IO) at SSB.
     Analyze this interview transcript based on the 4 factors of Officer Like Qualities (OLQ).
     
     INPUT DATA:
     Transcript: "${userData.transcript || 'No verbal response recorded.'}"
     PIQ Context: ${JSON.stringify(userData.piq || {})}
     
     TASK:
     Provide a JSON assessment of the candidate's performance. Even if the transcript is short, assess the demeanor and potential.`;
     
     contents.push({ text: prompt });

     const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
                factor1_planning: { type: Type.STRING },
                factor2_social: { type: Type.STRING },
                factor3_effectiveness: { type: Type.STRING },
                factor4_dynamic: { type: Type.STRING }
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
    return safeJSONParse(response.text);
  }

  return { score: 0, verdict: 'Error', strengths: [], weaknesses: [], recommendations: 'Could not process test type.' };
}
