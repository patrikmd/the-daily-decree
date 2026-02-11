import { GoogleGenAI, Type } from "@google/genai";
import { NewspaperData, TurnHistory, GameStats, Country, Character, RecommendedAction, AdvisorOpinion } from "../types";

// --- Constants & Config ---
const apiKey = process.env.API_KEY;
const openRouterKey = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const TEXT_MODEL_NAME = "gemini-2.0-flash";
const IMAGE_MODEL_NAME = "gemini-2.0-flash";

// Try these models in order if Gemini fails (all :free to avoid billing errors)
const BACKUP_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "openrouter/auto:free"
];

// Rate limiting state
const MAX_REQUESTS_PER_MINUTE = 15;
const WINDOW_SIZE_MS = 60000;
let requestTimestamps: number[] = [];

// --- Helper Functions ---

const getAIClient = () => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Strips markdown code blocks, <think> reasoning blocks, and any extra
 * text from AI responses so that only the JSON payload remains.
 */
const cleanJSON = (text: string): string => {
  if (!text) return "";
  let cleaned = text;

  // 1. Strip <think>...</think> blocks (handles closed tags)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");

  // 2. Strip unclosed <think> blocks (model hit token limit before closing)
  cleaned = cleaned.replace(/<think>[\s\S]*/gi, "");

  cleaned = cleaned.trim();

  // 3. Try to extract content from markdown code fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }

  // 4. Last resort: find the first { or [ and extract from there
  const jsonStart = cleaned.search(/[{\[]/);
  if (jsonStart > 0) {
    cleaned = cleaned.substring(jsonStart);
  }

  return cleaned.trim();
};

const getResponseText = (response: any): string => {
  if (typeof response.text === 'function') return response.text();
  if (typeof response.text === 'string') return response.text;
  if (response.candidates?.[0]?.content?.parts?.[0]?.text) return response.candidates[0].content.parts[0].text;
  return "";
};

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

/**
 * Enhanced AI caller that tries Gemini first, then falls back to OpenRouter.
 */
const callAI = async (
  prompt: string,
  systemInstruction: string,
  schema: any,
  onProgress?: (modelName: string) => void
): Promise<{ text: string, model: string }> => {
  // 1. Try Gemini
  try {
    checkRateLimit();
    if (onProgress) onProgress("Gemini 2.0");
    const ai = getAIClient();

    const geminiTask = ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: systemInstruction
      }
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini Request Timeout")), 35000)
    );

    const response = await Promise.race([geminiTask, timeoutPromise]) as any;
    const text = getResponseText(response);

    // VALIDATION: Ensure Gemini actually gave us some JSON content
    if (text && text.includes("headline")) {
      return { text: cleanJSON(text), model: "Gemini 2.0" };
    }
    console.warn("Gemini returned empty or invalid content, trying OpenRouter...");
  } catch (error: any) {
    console.warn("Primary AI (Gemini) failed, checking for fallback...", error.message);
    if (!openRouterKey) throw error;
  }

  // 2. Fallback to OpenRouter - Try multiple models in the chain
  if (!openRouterKey || openRouterKey === "undefined") {
    throw new Error("Missing OpenRouter API Key. Please add OPENROUTER_API_KEY to Vercel/Environment.");
  }

  // Create a strict instruction with the schema for models that don't support responseSchema natively
  const schemaStr = JSON.stringify(schema, null, 2);
  const strictSystemInstruction = `${systemInstruction}\n\nYou MUST respond in valid JSON matching this structure exactly:\n${schemaStr}\n\nCRITICAL: Respond ONLY with the JSON object. No pre-amble, no explanations. Ensure all required fields are present.`;

  let lastError = null;
  for (const model of BACKUP_MODELS) {
    try {
      const friendlyName = model.split('/')[1]?.split(':')[0] || model;
      if (onProgress) onProgress(`Backup (${friendlyName})`);
      console.log(`Using OpenRouter Backup (Model: ${model})...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 40000); // 40s for larger models

      const body = {
        model: model,
        messages: [
          { role: "system", content: strictSystemInstruction },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      };

      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://the-daily-decree.vercel.app",
          "X-Title": "The Daily Decree"
        },
        body: JSON.stringify(body)
      });

      clearTimeout(timeoutId);

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error?.message || `HTTP ${response.status}`);
      }

      const rawContent = result.choices?.[0]?.message?.content || "";
      const content = cleanJSON(rawContent);

      // VALIDATION: Ensure the backup model actually gave us a headline
      if (content && content.includes("headline")) {
        return { text: content, model: friendlyName };
      }

      console.warn(`Model ${model} failed validation. Raw content sample:`, rawContent.substring(0, 100));
      throw new Error(`Model ${friendlyName} returned invalid content (No headline found)`);

    } catch (e: any) {
      console.warn(`OpenRouter model ${model} failed:`, e.name === 'AbortError' ? "Timeout" : e.message);
      lastError = e;
      continue;
    }
  }

  throw new Error(`AI Service Unavailable: ${lastError?.message || "All models failed"}`);
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

// --- Core Shared Logic ---

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

/**
 * Ensures the newspaper data is valid and has all required fields to prevent UI crashes.
 */
const sanitizeNewspaperData = (data: any, country: Country, model?: string): NewspaperData => {
  const defaultStory = {
    headline: "Extra! Extra! News Room Silenced!",
    subhead: "Technical difficulties in the capital",
    content: "The printing presses are struggling to keep up with the rapid pace of change. Our reporters are currently investigating the latest developments.",
    author: "Staff Reporter",
    visualPrompt: "Busy newsroom office 1980s"
  };

  const defaultStats = {
    economy: 50,
    stability: 50,
    liberty: 50,
    approval: 50
  };

  return {
    issueDate: data?.issueDate || new Date().toLocaleDateString(),
    issueNumber: data?.issueNumber || 1,
    newspaperName: data?.newspaperName || "The Daily Decree",
    country: country,
    characters: Array.isArray(data?.characters) ? data.characters : [],
    recommendedActions: Array.isArray(data?.recommendedActions) ? data.recommendedActions : [],
    mainStory: {
      headline: data?.mainStory?.headline || defaultStory.headline,
      subhead: data?.mainStory?.subhead || defaultStory.subhead,
      content: data?.mainStory?.content || defaultStory.content,
      author: data?.mainStory?.author || defaultStory.author,
      visualPrompt: data?.mainStory?.visualPrompt || defaultStory.visualPrompt
    },
    editorial: {
      headline: data?.editorial?.headline || "Opinion: The Road Ahead",
      content: data?.editorial?.content || "We must remain vigilant in these trying times."
    },
    worldNews: Array.isArray(data?.worldNews) ? data.worldNews : [],
    localNews: Array.isArray(data?.localNews) ? data.localNews : [],
    businessNews: Array.isArray(data?.businessNews) ? data.businessNews : [],
    marketData: {
      indices: Array.isArray(data?.marketData?.indices) ? data.marketData.indices : [],
      commodities: Array.isArray(data?.marketData?.commodities) ? data.marketData.commodities : [],
      currencies: Array.isArray(data?.marketData?.currencies) ? data.marketData.currencies : []
    },
    stats: {
      economy: Number(data?.stats?.economy) || defaultStats.economy,
      stability: Number(data?.stats?.stability) || defaultStats.stability,
      liberty: Number(data?.stats?.liberty) || defaultStats.liberty,
      approval: Number(data?.stats?.approval) || defaultStats.approval
    },
    gameOver: !!data?.gameOver,
    gameOverReason: data?.gameOverReason || "",
    aiModel: model || data?.aiModel || "Unknown"
  };
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
  const context = getCountryContext(country);

  try {
    if (onProgress) onProgress("Drafting Front Page...", 10);
    const promptNewspaper = `Initialize a political simulation for: ${context}. LEADER NAME: ${leaderName || "Generate a fitting name"}. Generate staff, 4+ world stories, and 3 recommended actions.`;

    const systemInstruction = "You are the Editor-in-Chief. Write detailed, immersive, journalistic content. NO PLACEHOLDERS.";
    const { text: newspaperText, model: usedModel } = await callAI(promptNewspaper, systemInstruction, NEWSPAPER_SCHEMA, (model) => {
      if (onProgress) onProgress(`Drafting Front Page (${model})...`, 10);
    });
    if (!newspaperText) throw new Error("No response text from AI.");

    const rawData = JSON.parse(newspaperText);
    const data = sanitizeNewspaperData(rawData, country, usedModel);
    data.country = country;

    if (data.mainStory?.visualPrompt) {
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
  const context = getCountryContext(country);
  const characterList = currentCharacters.map(c => `"${c.name}" (${c.role})`).join(", ");

  const prompt = `Country: ${context}. CHARACTERS: ${characterList}. PLAYER ACTION: "${action}". 4+ world news, 3 NEW actions.`;

  try {
    const systemInstruction = "Maintain character continuity. global variety. NO PLACEHOLDERS.";
    const { text, model: usedModel } = await callAI(prompt, systemInstruction, NEWSPAPER_SCHEMA, (model) => {
      console.log(`Processing Turn (${model})...`);
    });
    const rawData = JSON.parse(text);
    const data = sanitizeNewspaperData(rawData, country, usedModel);
    data.country = country;

    if (data.mainStory?.visualPrompt) {
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
  const prompt = `Question: "${question}". Cabinet: ${data.characters.map(c => c.name).join(", ")}. Provide strategic advice.`;

  try {
    const systemInstruction = "Provide strategic in-character advice.";
    const { text } = await callAI(prompt, systemInstruction, advisorResponseSchema);
    return JSON.parse(text) as AdvisorOpinion[];
  } catch (error) {
    console.error("Advisor failed", error);
    return [{ advisorName: "Chief of Staff", role: "Advisor", advice: "Communication breakdown, sir." }];
  }
};