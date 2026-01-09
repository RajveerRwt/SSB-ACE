import { GoogleGenAI, Type } from "@google/genai";

// Helper to get Gemini client with API key from environment
export const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  
  // Debug Log for Cloud Troubleshooting
  if (!apiKey) {
    console.error("SSBzone Critical: API_KEY is MISSING in environment. App is running in offline fallback mode.");
  } else {
    // Log masked key to confirm injection worked (e.g. "AIza...5fA")
    console.log(`SSBzone: API Client Initialized. Key present: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
  }

  // Fixed: Always use exactly new GoogleGenAI({ apiKey: process.env.API_KEY }) as per guidelines
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
  // Fix: Ensure text is not undefined before parsing
  return JSON.parse(response.text || '{}');
}

/**
 * Generates hazy pencil sketches for TAT/PPDT.
 */
export async function generateVisualStimulus(scenarioType: 'PPDT' | 'TAT', description?: string) {
  const ai = getGeminiClient();
  
  // Real SSB Archive Scenarios (Based on Centurion/SSBCrack references)
  const ppdtScenarios = [
    "A hazy charcoal sketch of a group of 3 young men standing near a jeep discussing a map",
    "A blurry pencil sketch of a doctor checking a patient while a woman watches anxiously",
    "A rough sketch of a man helping another man climb a wall or steep ledge",
    "A vague drawing of students sitting in a circle having a discussion",
    "A sketch of rural life showing a farmer talking to a man in formal clothes",
    "A scene of an accident on the road with a few people gathering around",
    "A hazy drawing of two people pushing a cart uphill",
    "A sketch of 3 people gathered around a table with papers on it",
    "A blurry drawing of a person saving someone from drowning"
  ];

  const tatScenarios = [
    "A dark charcoal sketch of a young man sitting alone with his head in his hands",
    "A silhouette of a woman standing at a door looking into a dark room",
    "A blurry sketch of a boy looking at a trophy on a high shelf",
    "A rough sketch of two men in uniform talking seriously near a tent",
    "A vague drawing of a person rowing a boat alone in a storm",
    "A sketch of a young man looking at a violin with a contemplative expression",
    "A person standing on a cliff edge looking at the horizon",
    "A student studying late at night with a lamp",
    "A woman sitting on a park bench looking at a letter",
    "Two people arguing in a room, hazy details"
  ];
  
  const scenarios = scenarioType === 'PPDT' ? ppdtScenarios : tatScenarios;
  const finalScenario = description || scenarios[Math.floor(Math.random() * scenarios.length)];
  
  // STRICTER PROMPT: ENFORCING HUMAN CHARACTERS
  // Added mandatory instruction to include people to avoid "river/landscape only" images.
  const prompt = `Generate a rough, vintage charcoal sketch for a psychological test (SSB ${scenarioType}).
  Subject: ${finalScenario}.
  
  MANDATORY CONTENT:
  - The image MUST contain HUMAN CHARACTERS (at least one person).
  - Scene must be a social or individual human situation.
  - NO landscapes without people. NO rivers/mountains/buildings without people.
  
  ART STYLE STRICT GUIDELINES:
  - TYPE: Hand-drawn charcoal or pencil sketch on textured paper.
  - STYLE: Rough, hasty, unfinished, vintage illustration (1950s style).
  - CLARITY: BLURRY, HAZY, OUT OF FOCUS.
  - DETAILS: Faceless characters. Ambiguous expressions.
  - COLOR: Black and White / Grayscale ONLY.
  
  NEGATIVE PROMPTS:
  - No empty landscapes.
  - No clear faces.
  - No text.
  - No photorealistic skin.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { 
        imageConfig: { aspectRatio: "4:3" }
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
    throw new Error("No image part generated");
  } catch (error) {
    console.error("Image Gen Error. USING FALLBACKS. If hosted, check API_KEY.", error);
    
    // ENHANCED BACKUP STRATEGY (V3):
    // Added heavier blur to fallback URLs (blur=15) so the CSS filters in the components
    // can turn them into convincing "sketches".
    
    if (scenarioType === 'PPDT') {
        // PPDT Fallbacks: Social interactions, groups
        const backups = [
          "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=800&auto=format&fit=crop&grayscale=true&blur=15", // Office/Group discussion
          "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=800&auto=format&fit=crop&grayscale=true&blur=15", // Friends talking
          "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=800&auto=format&fit=crop&grayscale=true&blur=15"  // Group gathering
        ];
        return backups[Math.floor(Math.random() * backups.length)];
    } else {
        // TAT Fallbacks: Individual character focus (No empty landscapes)
        const backups = [
           "https://images.unsplash.com/photo-1504194569302-3c4ba34c1422?q=80&w=800&auto=format&fit=crop&grayscale=true&blur=15", // Silhouette Man in dark
           "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop&grayscale=true&blur=15", // Person in gym/room (ambiguous action)
           "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop&grayscale=true&blur=15"  // Portrait of man in dark
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
  const prompt = "Transcribe this handwritten SSB story accurately. Also, identify if there is a 'Character Box' (a small rectangle with symbols like P, N, M, F and age numbers). Transcribe the story text only.";
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }] },
  });
  // Fix: Handle undefined text
  return response.text || "";
}

export async function generateTestContent(type: string) {
  const ai = getGeminiClient();
  
  // Isolated Prompts based on Type to prevent cross-contamination
  let systemPrompt = '';
  let count = 60;

  if (type === 'TAT') {
    count = 11;
    systemPrompt = `Generate exactly 11 vague, descriptive scenarios for a Thematic Apperception Test (TAT). 
    Do NOT include prefixes like "TAT:". Provide descriptive prompts suitable for drawing a black and white sketch, like "A surgeon in a dark room" or "A student with a letter". 
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

  // Fix: Handle undefined text
  const text = response.text || '{"items": []}';
  const parsed = JSON.parse(text);
  
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
    // Fix: Handle undefined text
    return JSON.parse(response.text || '{}');
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
    // Fix: Handle undefined text
    return JSON.parse(response.text || '{}');
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
    // Fix: Handle undefined text
    return JSON.parse(response.text || '{}');
  }

  // Default Fallback
  return { score: 0, verdict: 'Error', strengths: [], weaknesses: [], recommendations: 'Could not process test type.' };
}