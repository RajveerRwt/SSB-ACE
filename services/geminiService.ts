
import { GoogleGenAI, Type } from "@google/genai";
import { getCachedContent, setCachedContent } from './supabaseService';

// Helper to get Gemini client with API key from environment
export const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("SSBprep.online Critical: API_KEY is MISSING.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper to safely parse JSON
const safeJSONParse = (text: string | undefined) => {
  if (!text) return {};
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error on AI Response:", e);
    return {};
  }
};

/**
 * COST SAVING: Local Evaluation Fallback
 * Used when API Quota is exceeded (429 Error) to ensure user still gets a result.
 */
const generateFallbackEvaluation = (testType: string, textContent: string) => {
  console.warn("Using Local Fallback Evaluation due to API Quota/Network Error");
  
  const wordCount = textContent.trim().split(/\s+/).length;
  const positiveKeywords = ['team', 'help', 'courage', 'led', 'plan', 'success', 'friend', 'duty', 'honest', 'brave', 'calm'];
  const hitCount = positiveKeywords.filter(w => textContent.toLowerCase().includes(w)).length;
  
  // STRICTER FALLBACK SCORING
  let score = 1.0; // Start low
  
  if (wordCount > 10) score += 2;
  if (wordCount > 50) score += 2;
  if (wordCount > 100) score += 1;
  score += Math.min(3, hitCount * 0.5);
  
  // Cap score
  score = Math.min(9, score);
  score = Math.round(score * 10) / 10;

  const isInsufficient = wordCount < 20;

  return {
    score: score,
    verdict: isInsufficient ? "Insufficient Data" : (score > 6 ? "Recommended (Fallback)" : "Average (Fallback)"),
    recommendations: isInsufficient 
      ? "Assessment incomplete. Your response was too short to evaluate. Please provide more detailed answers." 
      : "Note: This is a preliminary assessment due to high server traffic. Your responses show potential, but focus on more organized planning and clearer expression of ideas.",
    strengths: isInsufficient ? [] : ["Effort in participation", "Basic situational awareness"],
    weaknesses: isInsufficient ? ["Lack of content", "Premature conclusion"] : ["Need more depth in planning", "Elaborate on the outcome"],
    idealStory: "An ideal story would clearly identify the main character, establish a problem (e.g., organizing a village fair or helping an injured person), show the character taking concrete steps to solve it with the help of others, and conclude with a positive outcome.",
    // TAT/PPDT Specifics
    individualStories: Array(12).fill(null).map((_, i) => ({
      storyIndex: i + 1,
      perceivedAccurately: true,
      theme: "Assessment Pending",
      analysis: "Content length insufficient for full psychological profile.",
      olqProjected: "N/A"
    })),
    // PPDT Specific
    observationAnalysis: "Could not verify observation accuracy in fallback mode.",
    // WAT/SRT Specifics (Fallback)
    attemptedCount: 0,
    qualityStats: { positive: 0, neutral: 0, negative: 0, effective: 0, partial: 0, passive: 0 },
    generalFeedback: "Server unavailable. Review your responses manually.",
    detailedAnalysis: [],
    // Legacy support
    detailedComparison: [],
    perception: {
       heroAge: "N/A", heroSex: "N/A", heroMood: "N/A", mainTheme: "N/A"
    },
    storyAnalysis: {
       action: "N/A",
       outcome: "N/A",
       coherence: "Low"
    },
    // Interview Specifics
    factorAnalysis: {
      factor1_planning: isInsufficient ? "Not Observed" : "Average planning capacity observed.",
      factor2_social: isInsufficient ? "Not Observed" : "Social adaptability needs more examples.",
      factor3_effectiveness: isInsufficient ? "Not Observed" : "Effective under normal conditions.",
      factor4_dynamic: isInsufficient ? "Not Observed" : "Shows signs of dynamism."
    },
    bodyLanguage: {
      posture: "Stable (Assumed)",
      eyeContact: "Consistent (Assumed)",
      gestures: "Moderate"
    }
  };
};

export function createSSBChat() {
  const ai = getGeminiClient();
  return ai.chats.create({
    model: 'gemini-3-flash-preview', // Use 3-Flash for Text Chat
    config: {
      systemInstruction: `You are Major Veer, a senior SSB assessor. Guide candidates through SSB. Be concise, military-like, and encouraging.`,
    }
  });
}

export async function fetchDailyNews() {
  const dateKey = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
  
  // 1. CHECK CACHE FIRST
  try {
      const cachedData = await getCachedContent('DAILY_NEWS', dateKey);
      if (cachedData) {
          console.log("Serving Daily News from Cache");
          return cachedData;
      }
  } catch(e) {
      console.warn("Cache read failed", e);
  }

  // 2. FETCH FROM AI IF NOT CACHED
  const ai = getGeminiClient();
  const date = new Date().toDateString();
  
  const prompt = `
    Act as a Senior Defense Analyst for SSB aspirants.
    Search for the top 6 most important current affairs news for today (${date}) or this week.
    Focus on: Defense (New missiles, exercises, deals), Geopolitics (India's relations), National Issues (Schemes, Bills), and International Summits (G20, QUAD, etc.).
    
    CRITICAL FORMATTING INSTRUCTION:
    You must format each news item strictly within '---NEWS_BLOCK---' delimiters so I can parse it programmatically.
    
    Structure for each item:
    ---NEWS_BLOCK---
    HEADLINE: [Concise Headline]
    TAG: [Defense / International / National / Economy / Science]
    SUMMARY: [3-4 sentence summary of the event]
    SSB_RELEVANCE: [Explain WHY this topic is important for Lecturette or Group Discussion. E.g. "Useful for topics on Indo-China relations."]
    ---END_BLOCK---
    
    Provide 6 diverse items.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Switched to 2.5-flash for better tool stability
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    
    const result = {
        text: response.text,
        groundingMetadata: response.candidates?.[0]?.groundingMetadata
    };
    
    // 3. SAVE TO CACHE
    await setCachedContent('DAILY_NEWS', dateKey, result);
    
    return result;

  } catch (e) {
    console.error("News Fetch Failed:", e);
    // Return Fallback Data instead of throwing error
    return {
        text: `
---NEWS_BLOCK---
HEADLINE: Live Intelligence Feed Temporarily Offline
TAG: System Status
SUMMARY: We are unable to retrieve real-time updates from the secure server at this moment. This may be due to network restrictions or high traffic.
SSB_RELEVANCE: Officers must be prepared to operate with limited intelligence. Review the static archives below.
---END_BLOCK---
---NEWS_BLOCK---
HEADLINE: India's Push for Defense Indigenization (Atmanirbhar Bharat)
TAG: Defense
SUMMARY: The Ministry of Defence continues to release positive indigenization lists, banning the import of hundreds of military subsystems to boost local manufacturing. This includes light tanks, helicopters, and ammunition.
SSB_RELEVANCE: Crucial for Lecturette topics on 'Self-Reliance in Defense', 'Make in India', and 'Modernization of Armed Forces'.
---END_BLOCK---
---NEWS_BLOCK---
HEADLINE: India-US Initiative on Critical and Emerging Technology (iCET)
TAG: International
SUMMARY: India and the US are deepening cooperation in space, semiconductors, and defense technology. Recent deals include GE jet engines and MQ-9B drones.
SSB_RELEVANCE: Key points for Group Discussions on 'India-US Relations' vs 'India-Russia Relations'.
---END_BLOCK---
---NEWS_BLOCK---
HEADLINE: Women Officers in Command Roles
TAG: National
SUMMARY: The Indian Army has begun assigning women officers to command roles (Colonel rank) in unprecedented numbers, breaking the glass ceiling in combat support arms.
SSB_RELEVANCE: Highly probable topic for GD: 'Women in Combat Roles' or 'Gender Equality in the Armed Forces'.
---END_BLOCK---
        `,
        groundingMetadata: null
    };
  }
}

export async function extractPIQFromImage(base64Data: string, mimeType: string) {
  const ai = getGeminiClient();
  const prompt = `Act as an expert SSB clerk. Extract info from this PIQ form (DIPR 107-A). Map to JSON structure provided.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }] },
      config: { responseMimeType: 'application/json' }
    });
    return safeJSONParse(response.text);
  } catch (e) {
    console.error("PIQ Extraction Failed:", e);
    return {}; // Return empty to allow manual entry
  }
}

export async function generateLecturette(topic: string) {
  const ai = getGeminiClient();
  const prompt = `Generate a structured 3-minute lecturette speech on the topic: "${topic}".
  Structure it strictly as JSON:
  {
    "introduction": "Brief powerful opening (30s)",
    "keyPoints": ["Point 1 (Social/Political)", "Point 2 (Economic/Military)", "Point 3 (Future/Global)"],
    "conclusion": "Strong closing statement"
  }
  Keep it concise and suitable for an SSB interview.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: { responseMimeType: 'application/json' }
    });
    return safeJSONParse(response.text);
  } catch (e) {
    console.error("Lecturette Gen Failed", e);
    return null;
  }
}

/**
 * STRICT COST SAVING: No AI Image Generation.
 * Returns a static URL if the DB didn't provide one.
 */
export async function generateVisualStimulus(scenarioType: 'PPDT' | 'TAT', description?: string) {
  const filters = "&sat=-100&blur=1&contrast=10"; // Black and white look
  
  const ppdtBackups = [
    `https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80${filters}`,
    `https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80${filters}`,
    `https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80${filters}`,
    `https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80${filters}`, // Group discussion
    `https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80${filters}`  // Medical scene
  ];

  const tatBackups = [
    `https://images.unsplash.com/photo-1504194569302-3c4ba34c1422?auto=format&fit=crop&w=800&q=80${filters}`, // Solitude
    `https://images.unsplash.com/photo-1485178575877-1a13bf489dfe?auto=format&fit=crop&w=800&q=80${filters}`, // Woman thinking
    `https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=800&q=80${filters}`, // Discussion
    `https://images.unsplash.com/photo-1628155930542-4131433dd6bf?auto=format&fit=crop&w=800&q=80${filters}`, // Silhouette
    `https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=800&q=80${filters}`  // Landscape/Mood
  ];

  // Strictly use static backups. No AI Generation.
  const source = scenarioType === 'PPDT' ? ppdtBackups : tatBackups;
  return source[Math.floor(Math.random() * source.length)];
}

export async function generatePPDTStimulus(description?: string) {
  return generateVisualStimulus('PPDT', description);
}

export async function generateTATStimulus(description?: string) {
  return generateVisualStimulus('TAT', description);
}

export async function transcribeHandwrittenStory(base64Data: string, mimeType: string) {
  const ai = getGeminiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ inlineData: { data: base64Data, mimeType } }, { text: "Transcribe handwritten text." }] },
    });
    return response.text || "";
  } catch (e) {
    return "Transcription unavailable (Quota Limit). Please type your story.";
  }
}

// EXPORTED FOR EXTERNAL USE
export const STANDARD_WAT_SET = [
  "Mother", "Delay", "Danger", "Leader", "Risk", "Fail", "Family", "Duty", "Fear", "Win",
  "Impossible", "Help", "Attack", "Enemy", "Friend", "Exam", "Alone", "Dark", "Country", "Flag",
  "Money", "Time", "Blood", "Peace", "Atom", "Society", "Character", "Goal", "Play", "Team",
  "Climb", "Sleep", "Joke", "Criticize", "Problem", "Solution", "Initiative", "Hard", "Luck", "Ghost",
  "Snake", "Fire", "Water", "Step", "Run", "Hide", "Book", "Teacher", "Sister", "Baby",
  "Women", "Sports", "Music", "Think", "Idea", "Cheat", "Loyal", "Brave", "Coward", "Dead"
];

const STANDARD_SRT_SET = [
  "He was going to the exam center and saw a person lying injured on the road. He",
  "He returned from a picnic and came to know that his mother had been insulted by his neighbour’s son. He",
  "He was appointed the captain of the basketball team but his teammates were not cooperating. He",
  "He was traveling by train and suddenly the lights went out and he heard women screaming. He",
  "He was in a dense forest and lost his way. It was getting dark. He",
  "His parents were forcing him to marry a girl he did not like. He",
  "He saw a fire breaking out in his neighbor's house. He",
  "He was short of money to pay his college fees. He",
  "His boss was very strict and often criticized his work publicly. He",
  "He saw two people fighting on the street with knives. He",
  "He was leading a patrol and suddenly they came under heavy fire from the enemy. He",
  "He found a purse lying on the road containing money and documents. He",
  "He was about to deliver a speech but forgot his notes. He",
  "He was in a boat which started leaking in the middle of the river. He",
  "He saw a snake entering his sleeping bag while camping. He",
  "He was mocked by his friends for his poor English. He",
  "He was assigned a difficult task which he had no experience in. He",
  "He saw a thief snatching a chain from a woman. He",
  "He was falsely accused of cheating in the exam. He",
  "He was the only one who knew the truth about a corruption case. He",
  "He had to choose between his career and his sick mother. He",
  "He saw his house catching fire. He",
  "He was traveling in a bus and the conductor refused to return the balance. He",
  "He was the monitor of the class and the students were making noise. He",
  "He saw a girl being teased by some goons. He",
  "He was running to catch the train and collided with an old man. He",
  "His senior officer asked him to do a personal favor which was against the rules. He",
  "He saw a drowning child in the river. He",
  "He was alone in the house and thieves entered. He",
  "He was going for an interview and his cycle got punctured. He",
  "He found a wallet with money and ID card. He",
  "He saw an accident on the highway. He",
  "He was insulted by his teacher in front of the class. He",
  "He failed in his final exams. He",
  "He was lost in a desert with limited water. He",
  "He saw a person burying something suspicious in the park. He",
  "He was asked to organize a cultural event in a short time. He",
  "He saw his friend copying in the exam. He",
  "He was challenged to a fight by a bully. He",
  "He saw a dog lying injured on the road. He",
  "He was travelling in a train and realized his ticket was missing. He",
  "He saw a leakage in the dam. He",
  "He was asked to lead a group of strangers on a trek. He",
  "He saw his sister speaking to a stranger late at night. He",
  "He was offered a bribe to pass a tender. He",
  "He saw a bridge collapsing while a train was approaching. He",
  "He was in a cinema hall and noticed smoke. He",
  "He was criticized for his dressing sense. He",
  "He saw a blind man trying to cross a busy road. He",
  "He was asked to give a speech on a topic he knew nothing about. He",
  "He saw his best friend stealing from a shop. He",
  "He was stuck in a lift between floors. He",
  "He saw a terrorist planting a bomb. He",
  "He was asked to compromise on his principles for a promotion. He",
  "He saw a bird trapped in a net. He",
  "He was leading a team and his best player got injured. He",
  "He saw a beggar asking for work instead of alms. He",
  "He was caught in a heavy storm while sailing. He",
  "He realized he had made a mistake in the office accounts. He",
  "He was asked to judge a competition where his brother was a participant. He"
];

export async function generateTestContent(type: string) {
  if (type === 'WAT') {
    return { items: STANDARD_WAT_SET.map((word, index) => ({ id: `wat-${index}`, content: word })) };
  } 
  else if (type === 'SRT') {
    return { items: STANDARD_SRT_SET.map((situation, index) => ({ id: `srt-${index}`, content: situation })) };
  }
  else if (type === 'TAT') {
    // Return static prompts if AI fails
    const staticTAT = [
        "A doctor examining a patient", "Two soldiers talking near a tent", "A boy looking at a trophy", 
        "A person rowing a boat", "A student studying late", "Three people discussing a map",
        "A person standing on a cliff", "A farmer in a field", "A scene with several people gathered around a well in a rural area",
        "A meeting in a conference room", "A woman looking out a window"
    ];
    return { items: staticTAT.map((s, i) => ({ id: `tat-${i}`, content: s })) };
  }
  return { items: [] };
}

/**
 * Enhanced Evaluation Function with Specific Schemas per Test
 */
export async function evaluatePerformance(testType: string, userData: any) {
  const ai = getGeminiClient();
  
  // Prepare content strings for Fallback Logic calculation
  let combinedTextForFallback = "";

  try {
    // 1. TAT EVALUATION
    if (testType === 'TAT' || (userData.testType === 'TAT')) {
        const tatParts: any[] = [];
        const pairs = userData.tatPairs || []; 
        let totalWordCount = 0;

        tatParts.push({ text: `Evaluate these TAT stories. 
        CRITICAL INSTRUCTION: For each story, I will provide the Stimulus Image and the User's Story.
        1. Compare the User's Story with the Stimulus Image. 
        2. Set 'perceivedAccurately' to FALSE if the story describes things NOT in the image or misses obvious details (e.g. ignoring a dead body, describing a party when it's a funeral).
        3. In the 'analysis' field, explicitly mention if the story is related to the image or not, and provide specific improvements on observation (e.g., "You missed the gun in the background").
        4. Assess Officer Like Qualities (OLQs), Theme, and Outcome.
        
        Return JSON.` });

        for (const pair of pairs) {
            const txt = pair.userStoryText || "No text";
            combinedTextForFallback += txt + " ";
            totalWordCount += txt.split(/\s+/).length;
            
            tatParts.push({ text: `--- Story ${pair.storyIndex} ---` });
            
            // Add Stimulus Image if available
            if (pair.stimulusImage) {
                 tatParts.push({ inlineData: { data: pair.stimulusImage, mimeType: 'image/jpeg' } });
                 tatParts.push({ text: `Stimulus Image above.` });
            } else {
                 tatParts.push({ text: `Stimulus Description: ${pair.stimulusDesc}` });
            }
            
            tatParts.push({ text: `User Story: ${txt}` });
        }

        // GUARDRAIL: Short Content
        if (totalWordCount < 50) {
             return generateFallbackEvaluation(testType, combinedTextForFallback);
        }

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts: tatParts },
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
                      perceivedAccurately: { type: Type.BOOLEAN, description: "True if the story matches the visual details of the image. False if unrelated." },
                      theme: { type: Type.STRING },
                      analysis: { type: Type.STRING, description: "Detailed feedback on relevance to image and observation accuracy." },
                      olqProjected: { type: Type.STRING }
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
    
    // 2. WAT EVALUATION (Specific "No Score" request)
    else if (testType === 'WAT') {
        const { watResponses, watSheetImages } = userData;
        // watResponses is array of {id, word, response}
        
        let parts: any[] = [];
        let promptText = "";

        if (watSheetImages && watSheetImages.length > 0) {
             promptText = `
             Analyze this Word Association Test (WAT).
             
             Context:
             The candidate was shown 60 words sequentially. They wrote responses on the uploaded sheets.
             The stimulus words in order (1-60) were:
             ${watResponses.map((i: any) => `${i.id}. ${i.word}`).join(", ")}

             Tasks:
             1. Transcribe the handwritten responses corresponding to each word number (1-60).
             2. If a response is missing or illegible, mark it as "Not Attempted".
             3. Assess each response for Officer Like Qualities (OLQ). Keep assessment brief (3-5 words).
             4. Provide an 'idealResponse' for EVERY word (including unattempted ones).
             5. Calculate a score (0-10) based on positive OLQ demonstration.
             
             Output Format: JSON
             `;
             parts.push({ text: promptText });
             watSheetImages.forEach((img: string) => {
                 parts.push({ inlineData: { data: img, mimeType: 'image/jpeg' } });
             });
        } else {
             promptText = `
             Analyze this Word Association Test (WAT) strictly based on SSB Psychological Standards.
             
             Scoring Criteria (SSB Method):
             - Positive/Constructive (High OLQ): Shows courage, determination, social responsibility, optimism. (1 Point)
             - Observational/Factual (Neutral): Describes the word or a fact. No personality projection. (0.5 Points)
             - Negative/Pessimistic/Avoidant (Low OLQ): Shows fear, anxiety, delay, or negative outcome. (0 Points)
             - 'I'/'Me' centric: Low score.
             
             Input Data:
             ${watResponses.map((i: any) => `Word ${i.id}: "${i.word}" -> User Response: "${i.response}"`).join("\n")}

             Tasks:
             1. Classify each response into 'Positive', 'Neutral', or 'Negative'.
             2. Calculate a final score out of 10 based on the quality and quantity of Positive responses.
             3. Provide an 'idealResponse' for EVERY word.
             
             Output Format: JSON
             `;
             parts.push({ text: promptText });
        }

        const response = await ai.models.generateContent({
            model: (watSheetImages && watSheetImages.length > 0) ? 'gemini-2.5-flash' : 'gemini-3-flash-preview', 
            contents: { parts: parts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER, description: "Overall score out of 10 based on OLQ." },
                        attemptedCount: { type: Type.INTEGER, description: "Total number of words attempted by user" },
                        qualityStats: {
                            type: Type.OBJECT,
                            properties: {
                                positive: { type: Type.INTEGER },
                                neutral: { type: Type.INTEGER },
                                negative: { type: Type.INTEGER }
                            }
                        },
                        generalFeedback: { type: Type.STRING, description: "Overall observation of personality based on responses." },
                        detailedAnalysis: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.INTEGER },
                                    word: { type: Type.STRING },
                                    userResponse: { type: Type.STRING, description: "The transcribed or typed response." },
                                    assessment: { type: Type.STRING, description: "Brief psychological remark (e.g. Positive, Neutral, Negative)." },
                                    idealResponse: { type: Type.STRING, description: "A high-OLQ example sentence." }
                                }
                            }
                        }
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

        const parts: any[] = [];
        parts.push({ text: `Evaluate PPDT Performance. 
        CRITICAL: Analyze the 'Stimulus Image' vs the 'Candidate's Story'.
        1. Check 'relevance': Is the story physically grounded in the image provided? (e.g. number of characters, gender, mood, setting).
        2. If the story is completely unrelated to the image (hallucinated), mark it as poor perception and penalize the score significantly.
        3. Fill 'observationAnalysis': Provide specific feedback on what they missed in the image or if they imagined things not present.
        4. Assess Perception, Action, Outcome.
        5. Generate an 'idealStory': Write a concise, high-scoring sample story (100-120 words) for this specific image that demonstrates excellent Officer Like Qualities (OLQ), clear perception, and a logical outcome.
        
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
                idealStory: { type: Type.STRING, description: "A sample high-scoring story for this image." },
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

    // 4. INTERVIEW EVALUATION
    else if (testType.includes('Interview')) {
        combinedTextForFallback = userData.transcript || "";
        const wordCount = combinedTextForFallback.split(/\s+/).length;

        // GUARDRAIL: Very short interview (e.g., just "hello sir")
        // Return low score immediately without burning AI tokens
        if (wordCount < 25) {
            return {
               score: 1.5,
               verdict: "Insufficient Data",
               recommendations: "The interview duration and content were too short to evaluate. Please ensure you speak at least 3-4 minutes and answer questions fully.",
               strengths: ["Presence"],
               weaknesses: ["Lack of content", "Very short responses"],
               factorAnalysis: {
                  factor1_planning: "N/A", factor2_social: "N/A", factor3_effectiveness: "N/A", factor4_dynamic: "N/A"
               },
               bodyLanguage: { posture: "Unknown", eyeContact: "Unknown", gestures: "Unknown" }
            };
        }

        const prompt = `Evaluate the following SSB Personal Interview Transcript. 
        Transcript: "${combinedTextForFallback}"
        
        STRICT SCORING RULES:
        1. If the candidate only gives one-word answers or the transcript is very short/trivial, score MUST be below 3.0.
        2. Do not hallucinate qualities if they are not demonstrated in the text.
        3. Assess 15 Officer Like Qualities (OLQs).
        4. LOOK FOR VISUAL CUES: Scan the transcript for remarks made by the Interviewer (Major Veer/Col Arjun) regarding the candidate's body language (e.g. "sit straight", "look at me", "you look nervous"). Use these to populate the 'bodyLanguage' field.
        
        Return JSON.`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview', // Updated
          contents: { parts: [{ text: prompt }] },
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
                bodyLanguage: {
                   type: Type.OBJECT,
                   properties: {
                      posture: { type: Type.STRING },
                      eyeContact: { type: Type.STRING },
                      gestures: { type: Type.STRING }
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
        const { sdtData, sdtImages } = userData;
        const parts: any[] = [];
        
        parts.push({ text: `Evaluate the Self Description Test (SDT).
        Analyze ALL provided content (text and images) for consistency, realism, and Officer Like Qualities (OLQs).
        
        STRICT RULE: If most sections are empty or trivial, give a low score (below 4.0).
        
        Return JSON.` });

        const sections = [
            { key: 'parents', label: '1. Parents Opinion' },
            { key: 'teachers', label: '2. Teachers/Employers Opinion' },
            { key: 'friends', label: '3. Friends/Colleagues Opinion' },
            { key: 'self', label: '4. Self Opinion' },
            { key: 'aim', label: '5. Future Aim' }
        ];

        for (const sec of sections) {
            const key = sec.key as keyof typeof sdtData;
            const text = sdtData[key];
            const img = sdtImages ? sdtImages[key] : null;
            
            parts.push({ text: `--- SECTION: ${sec.label} ---` });
            if (text && text.trim()) {
                parts.push({ text: `Typed Response: "${text}"` });
                combinedTextForFallback += text + " ";
            }
            if (img && img.data) {
                parts.push({ inlineData: { data: img.data, mimeType: img.mimeType || 'image/jpeg' } });
            }
            if (!text && (!img || !img.data)) {
                parts.push({ text: `(No response provided for this section)` });
            }
        }

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
                        consistencyAnalysis: { type: Type.STRING, description: "Analysis of how consistent the different paragraphs are with each other." },
                        olqs: { type: Type.ARRAY, items: { type: Type.STRING } },
                        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                        recommendations: { type: Type.STRING }
                    }
                }
            }
        });
        return safeJSONParse(response.text);
    }

    // 6. SRT EVALUATION
    else if (testType === 'SRT') {
        const { srtResponses, srtSheetImages } = userData;
        
        let parts: any[] = [];
        let promptText = "";

        if (srtSheetImages && srtSheetImages.length > 0) {
             promptText = `Evaluate these handwritten SRT (Situation Reaction Test) response sheets.
             
             Task:
             1. Transcribe the handwritten responses serial-wise (1-60).
             2. If a response is missing or illegible, mark it as "Not Attempted".
             3. Assess each response for Officer Like Qualities (OLQ).
             4. Provide an 'idealResponse' for EVERY situation.
             5. Calculate a Score (0-10) based on reaction quality (Effective vs Impulsive vs Passive).
             
             The situations were (in order):
             ${srtResponses.map((i: any) => `${i.id}. ${i.situation}`).join("\n")}
             
             Return JSON.`;
             
             parts.push({ text: promptText });
             srtSheetImages.forEach((img: string) => {
                 parts.push({ inlineData: { data: img, mimeType: 'image/jpeg' } });
             });
        } else {
            promptText = `Evaluate these SRT (Situation Reaction Test) responses based on SSB Standards.
            
            Scoring Guide:
            - Effective (High OLQ): Action-oriented, completes the task, socially responsible, brave. (1 Point)
            - Partial (Medium OLQ): Address the problem but incomplete solution or lacks resourcefulness. (0.5 Points)
            - Passive/Avoidant/Impulsive (Low OLQ): Ignores problem, runs away, or unrealistic action. (0 Points)
            
            Input Data:
            ${srtResponses.map((i: any) => `Q${i.id}: "${i.situation}" -> User Answer: "${i.response}"`).join("\n")}
            
            Return JSON.`;
            parts.push({ text: promptText });
        }

        const response = await ai.models.generateContent({
            model: (srtSheetImages && srtSheetImages.length > 0) ? 'gemini-2.5-flash' : 'gemini-3-flash-preview', 
            contents: { parts: parts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER, description: "Score out of 10 based on reaction effectiveness." },
                        attemptedCount: { type: Type.INTEGER, description: "Total number of situations attempted by user" },
                        qualityStats: {
                            type: Type.OBJECT,
                            properties: {
                                effective: { type: Type.INTEGER },
                                partial: { type: Type.INTEGER },
                                passive: { type: Type.INTEGER }
                            }
                        },
                        generalFeedback: { type: Type.STRING, description: "Overall observation of personality based on responses." },
                        detailedAnalysis: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.INTEGER },
                                    situation: { type: Type.STRING },
                                    userResponse: { type: Type.STRING, description: "The transcribed or typed response." },
                                    assessment: { type: Type.STRING, description: "Brief psychological remark (e.g. Effective, Passive, Partial)." },
                                    idealResponse: { type: Type.STRING, description: "A high-OLQ example reaction." }
                                }
                            }
                        }
                    }
                }
            }
        });
        return safeJSONParse(response.text);
    }

    return generateFallbackEvaluation(testType, "");

  } catch (error: any) {
    // CRITICAL COST SAVING: Catch 429 (Quota) or 503 (Overload) errors
    // Instead of crashing, run local logic so the user is happy.
    console.error("Gemini API Error (likely quota):", error);
    return generateFallbackEvaluation(testType, combinedTextForFallback);
  }
}
