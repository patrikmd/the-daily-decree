import { GoogleGenAI, Type } from "@google/genai";
import { NewspaperData, TurnHistory, GameStats, Country, Character, RecommendedAction, AdvisorOpinion, ForeignCountry } from "../types";
import { COUNTRY_LIST } from "../constants";

const apiKey = process.env.API_KEY;

const getAIClient = () => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }
  return new GoogleGenAI({ apiKey });
};

const TEXT_MODEL_NAME = "gemini-2.0-flash";
const IMAGE_MODEL_NAME = "gemini-2.0-flash";

// Rate limiting state
const MAX_REQUESTS_PER_MINUTE = 15;
const WINDOW_SIZE_MS = 60000;
let requestTimestamps: number[] = [];

/**
 * Checks if we are within the rate limit (15 requests per minute).
 * Throws an error if the limit is exceeded.
 */
const checkRateLimit = () => {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(ts => now - ts < WINDOW_SIZE_MS);

  if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldestTs = requestTimestamps[0];
    const waitTimeSeconds = Math.ceil((WINDOW_SIZE_MS - (now - oldestTs)) / 1000);
    throw new Error(`The newsroom is overwhelmed! Please wait ${waitTimeSeconds} seconds for the printers to cool down (Free Tier Limit).`);
  }
  requestTimestamps.push(now);
};

// --- Schemas ---

const storySchema = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING },
    subhead: { type: Type.STRING },
    content: { type: Type.STRING, description: "Detailed article text. Use \\n\\n for paragraphs." },
    author: { type: Type.STRING },
    category: { type: Type.STRING }
  },
  required: ["headline", "content"]
};

const marketItemSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    value: { type: Type.STRING },
    change: { type: Type.STRING },
    trend: { type: Type.STRING, enum: ['up', 'down', 'neutral'] }
  },
  required: ["name", "value", "change", "trend"]
};

const characterSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    role: { type: Type.STRING },
    description: { type: Type.STRING }
  },
  required: ["name", "role"]
};

const recommendedActionSchema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING, description: "A high-stakes, concise executive order proposal." },
    recommender: { type: Type.STRING, description: "The full name and complete official title of the official." }
  },
  required: ["text", "recommender"]
};

const advisorResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      advisorName: { type: Type.STRING },
      role: { type: Type.STRING },
      advice: { type: Type.STRING }
    },
    required: ["advisorName", "role", "advice"]
  }
};

const foreignCountrySchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    leaderName: { type: Type.STRING },
    governmentType: { type: Type.STRING },
    stance: { type: Type.STRING, enum: ['Ally', 'Friendly', 'Neutral', 'Strained', 'Hostile', 'War'] },
    description: { type: Type.STRING, description: "Brief intelligence summary." }
  },
  required: ["name", "leaderName", "governmentType", "stance", "description"]
};

const NEWSPAPER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    issueDate: { type: Type.STRING },
    issueNumber: { type: Type.INTEGER },
    newspaperName: { type: Type.STRING },
    country: { type: Type.STRING, enum: ['USA', 'UK', 'GERMANY'] },
    characters: { type: Type.ARRAY, items: characterSchema },
    recommendedActions: { type: Type.ARRAY, items: recommendedActionSchema },
    mainStory: {
      type: Type.OBJECT,
      properties: {
        headline: { type: Type.STRING },
        subhead: { type: Type.STRING },
        content: { type: Type.STRING },
        author: { type: Type.STRING },
        visualPrompt: { type: Type.STRING }
      },
      required: ["headline", "content", "visualPrompt"]
    },
    editorial: storySchema,
    worldNews: { type: Type.ARRAY, items: storySchema },
    localNews: { type: Type.ARRAY, items: storySchema },
    businessNews: { type: Type.ARRAY, items: storySchema },
    marketData: {
      type: Type.OBJECT,
      properties: {
        indices: { type: Type.ARRAY, items: marketItemSchema },
        commodities: { type: Type.ARRAY, items: marketItemSchema },
        currencies: { type: Type.ARRAY, items: marketItemSchema }
      },
      required: ["indices", "commodities", "currencies"]
    },
    stats: {
      type: Type.OBJECT,
      properties: {
        economy: { type: Type.INTEGER },
        stability: { type: Type.INTEGER },
        liberty: { type: Type.INTEGER },
        approval: { type: Type.INTEGER }
      },
      required: ["economy", "stability", "liberty", "approval"]
    },
    gameOver: { type: Type.BOOLEAN },
    gameOverReason: { type: Type.STRING }
  },
  required: ["issueDate", "mainStory", "editorial", "worldNews", "localNews", "businessNews", "marketData", "stats", "gameOver", "characters", "recommendedActions"]
};

const DIPLOMACY_SCHEMA = {
  type: Type.ARRAY,
  items: foreignCountrySchema
};

// --- Helpers ---

const getResponseText = (response: any): string => {
  if (typeof response.text === 'function') return response.text();
  if (typeof response.text === 'string') return response.text;
  if (response.candidates?.[0]?.content?.parts?.[0]?.text) return response.candidates[0].content.parts[0].text;
  return "";
};

const generateNewspaperImage = async (visualPrompt: string): Promise<string | undefined> => {
  try {
    checkRateLimit();
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [{ text: visualPrompt + " black and white, grainy newspaper photography style, high contrast, 1980s press photo aesthetic" }]
      },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  } catch (error) {
    console.warn("Image generation failed (Rate limit or API error):", error);
  }
  return undefined;
};

const getCountryContext = (country: Country) => {
  switch (country) {
    case 'USA': return "United States of America. Leader Title: President. Currency: USD. Capital: Washington D.C.";
    case 'UK': return "United Kingdom. Leader Title: Prime Minister. Currency: GBP. Capital: London.";
    case 'GERMANY': return "Germany. Leader Title: Chancellor. Currency: EUR. Capital: Berlin.";
    default: return "A fictional nation.";
  }
};

// --- Exported Functions ---

export const initializeGame = async (
  country: Country,
  leaderName?: string,
  onProgress?: (status: string, progress: number) => void
): Promise<NewspaperData> => {
  checkRateLimit();
  const ai = getAIClient();
  const context = getCountryContext(country);

  try {
    if (onProgress) onProgress("Drafting Front Page...", 10);
    const promptNewspaper = `Initialize a political simulation for: ${context}. LEADER NAME: ${leaderName || "Generate a fitting name"}. Generate staff, 4+ world stories, and 3 recommended actions.`;

    const newspaperResponse = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: promptNewspaper,
      config: {
        responseMimeType: "application/json",
        responseSchema: NEWSPAPER_SCHEMA,
        systemInstruction: "You are the Editor-in-Chief. Write detailed, immersive, journalistic content. NO PLACEHOLDERS."
      }
    });

    if (onProgress) onProgress("Printing Newspaper...", 40);
    const newspaperText = getResponseText(newspaperResponse);
    if (!newspaperText) throw new Error("No response text from AI.");

    const data = JSON.parse(newspaperText) as NewspaperData;
    data.country = country;
    data.diplomacy = {};

    // Parallel Diplomacy (Optional)
    try {
      if (onProgress) onProgress("Gathering Intelligence...", 60);
      checkRateLimit();
      const promptDiplomacy = `Generate a diplomatic report for: ${COUNTRY_LIST.join(", ")}.`;
      const diplomacyResponse = await ai.models.generateContent({
        model: TEXT_MODEL_NAME,
        contents: promptDiplomacy,
        config: {
          responseMimeType: "application/json",
          responseSchema: DIPLOMACY_SCHEMA,
          systemInstruction: "You are the Director of Intelligence."
        }
      });
      const diploText = getResponseText(diplomacyResponse);
      if (diploText) {
        const diploData = JSON.parse(diploText) as ForeignCountry[];
        diploData.forEach(c => data.diplomacy[c.name] = c);
      }
    } catch (e) { console.warn("Diplomacy failed", e); }

    if (data.mainStory.visualPrompt) {
      if (onProgress) onProgress("Developing Photos...", 90);
      data.imageUrl = await generateNewspaperImage(data.mainStory.visualPrompt);
    }

    return data;
  } catch (error) {
    console.error("Game init failed", error);
    throw error;
  }
};

export const processTurn = async (
  action: string,
  history: TurnHistory[],
  currentStats: GameStats,
  turnCount: number,
  country: Country,
  currentCharacters: Character[]
): Promise<NewspaperData> => {
  checkRateLimit();
  const ai = getAIClient();
  const context = getCountryContext(country);
  const characterList = currentCharacters.map(c => `"${c.name}" (${c.role})`).join(", ");

  const prompt = `Country: ${context}. CHARACTERS: ${characterList}. PLAYER ACTION: "${action}". 4+ world news, 3 NEW actions.`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: NEWSPAPER_SCHEMA,
        systemInstruction: "Maintain character continuity. global variety. NO PLACEHOLDERS."
      }
    });

    const text = getResponseText(response);
    const data = JSON.parse(text) as NewspaperData;
    data.country = country;
    data.diplomacy = {};

    if (data.mainStory.visualPrompt) {
      data.imageUrl = await generateNewspaperImage(data.mainStory.visualPrompt);
    }
    return data;
  } catch (error) {
    console.error("Turn processing failed", error);
    throw error;
  }
};

export const getAdvisorOpinion = async (
  question: string,
  data: NewspaperData,
  history: TurnHistory[]
): Promise<AdvisorOpinion[]> => {
  checkRateLimit();
  const ai = getAIClient();
  const prompt = `Question: "${question}". Cabinet: ${data.characters.map(c => c.name).join(", ")}. Provide strategic advice.`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: advisorResponseSchema,
        systemInstruction: "Provide strategic in-character advice."
      }
    });
    return JSON.parse(getResponseText(response)) as AdvisorOpinion[];
  } catch (error) {
    console.error("Advisor failed", error);
    return [{ advisorName: "Chief of Staff", role: "Advisor", advice: "Communication breakdown, sir." }];
  }
};

export const identifyCountryDetails = async (
  targetCountry: string,
  data: NewspaperData
): Promise<ForeignCountry> => {
  checkRateLimit();
  const ai = getAIClient();
  const prompt = `Context: ${data.mainStory.content}. Details for: ${targetCountry}.`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: foreignCountrySchema,
        systemInstruction: "Consistency is key."
      }
    });
    return JSON.parse(getResponseText(response)) as ForeignCountry;
  } catch (error) {
    throw error;
  }
};