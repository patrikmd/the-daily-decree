import { GoogleGenAI, Type } from "@google/genai";
import { NewspaperData, TurnHistory, GameStats, Country, Character, RecommendedAction, AdvisorOpinion, ForeignCountry } from "../types";

const apiKey = process.env.API_KEY;

const getAIClient = () => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }
  return new GoogleGenAI({ apiKey });
};

const TEXT_MODEL_NAME = "gemini-1.5-flash";
const IMAGE_MODEL_NAME = "gemini-2.0-flash-exp"; // Highly capable and better quotas than gemini-3-flash currently

// Reusable story schema
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

// Market item schema
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

// Character schema for memory
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
    recommender: { type: Type.STRING, description: "The full name and complete official title of the official (e.g. 'Victoria Thorne, Chancellor of the Exchequer' or 'Marcus Halloway, Secretary of State for the Home Department')." }
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
    description: { type: Type.STRING, description: "Brief intelligence summary of their current state." }
  },
  required: ["name", "leaderName", "governmentType", "stance", "description"]
};

import { COUNTRY_LIST } from "../constants";

// ... (existing imports and code)

// Extended Schema for detailed content
const NEWSPAPER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    issueDate: { type: Type.STRING, description: "Current date in the simulation" },
    issueNumber: { type: Type.INTEGER },
    newspaperName: { type: Type.STRING },
    country: { type: Type.STRING, enum: ['USA', 'UK', 'GERMANY'] },

    // Memory
    characters: {
      type: Type.ARRAY,
      items: characterSchema,
      description: "List of ALL key named characters. Maintain this list to ensure name consistency across issues."
    },

    // Diplomacy - Pre-generated (REMOVED: Done in parallel request now)
    // diplomaticReport: { ... },

    recommendedActions: {
      type: Type.ARRAY,
      items: recommendedActionSchema,
      description: "Exactly 3 recommended executive actions for the player to choose from in the next turn."
    },

    // Page 1
    mainStory: {
      type: Type.OBJECT,
      properties: {
        headline: { type: Type.STRING, description: "Sensational all-caps headline" },
        subhead: { type: Type.STRING },
        content: { type: Type.STRING, description: "Very detailed main story (400+ words). NEVER use placeholders like [Name]. Always use specific character names." },
        author: { type: Type.STRING },
        visualPrompt: { type: Type.STRING, description: "Visual description for image generation." }
      },
      required: ["headline", "content", "visualPrompt"]
    },
    editorial: { ...storySchema, description: "Opinion piece." },

    // Page 2
    worldNews: {
      type: Type.ARRAY,
      items: storySchema,
      description: "Minimum 4 distinct international stories. MUST include geographical variety (South America, Africa, SE Asia, etc.)."
    },
    localNews: { type: Type.ARRAY, items: storySchema, description: "2 distinct local/national stories." },

    // Page 3
    businessNews: { type: Type.ARRAY, items: storySchema, description: "1 major business story." },
    marketData: {
      type: Type.OBJECT,
      properties: {
        indices: { type: Type.ARRAY, items: marketItemSchema, description: "3-4 Major stock indices" },
        commodities: { type: Type.ARRAY, items: marketItemSchema, description: "Oil, Gold, Wheat, etc." },
        currencies: { type: Type.ARRAY, items: marketItemSchema, description: "Major currency pairs" }
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
  items: foreignCountrySchema,
  description: `A COMPLETE list of intelligence reports for ALL of the following countries: ${COUNTRY_LIST.join(", ")}. Do not miss any.`
};

// Helper to generate the image based on the prompt
const generateNewspaperImage = async (visualPrompt: string): Promise<string | undefined> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [{ text: visualPrompt + " black and white, grainy newspaper photography style, high contrast, 1980s press photo aesthetic" }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.warn("Image generation failed, falling back to placeholder.", error);
    return undefined;
  }
  return undefined;
};

const getCountryContext = (country: Country) => {
  switch (country) {
    case 'USA':
      return "United States of America. Leader Title: President. Currency: USD. Capital: Washington D.C. Issues: Polarization, Global Hegemony, Economy.";
    case 'UK':
      return "United Kingdom. Leader Title: Prime Minister. Currency: GBP. Capital: London. Issues: Post-Brexit Economy, NHS, Constitutional Monarchy.";
    case 'GERMANY':
      return "Germany. Leader Title: Chancellor. Currency: EUR. Capital: Berlin. Issues: EU Leadership, Energy Crisis, Industrial Output.";
    default:
      return "A fictional nation.";
  }
};

// Helper to safely get partial text from response
const getResponseText = (response: any): string => {
  if (typeof response.text === 'function') {
    return response.text();
  } else if (typeof response.text === 'string') {
    return response.text;
  }
  // Try to extract from candidates if direct access fails (safety fallback)
  if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts.length > 0) {
    return response.candidates[0].content.parts[0].text || "";
  }
  return "";
};

export const initializeGame = async (
  country: Country,
  leaderName?: string,
  onProgress?: (status: string, progress: number) => void
): Promise<NewspaperData> => {
  const ai = getAIClient();
  const context = getCountryContext(country);

  // 1. Newspaper Generation (Main Game Logic)
  try {
    if (onProgress) onProgress("Drafting Front Page...", 10);
    const promptNewspaper = `
    Initialize a political simulation for: ${context}
    SCENARIO: A new leader (Player) has just been ELECTED/APPOINTED. 
    
    LEADER NAME: ${leaderName ? `The leader's name MUST be "${leaderName}".` : "Generate a unique and fitting name for the new leader. Avoid generic names like 'Sterling'."}
    
    CABINET/STAFF GENERATION:
    - You MUST generate a full team of supporting characters (e.g. Chief of Staff, Press Secretary, Secretary of Treasury, National Security Advisor).
    - Be creative with names. Use diverse cultural and linguistic origins fitting the country.
    - Save ALL these characters (Leader + Staff) in the 'characters' array.

    CRITICAL WORLD NEWS REQUIREMENTS:
    - Generate AT LEAST 4 World News articles from diverse global regions.
    - PRIORITIZE DIVERSE GEOGRAPHY: South America, Africa, Southeast Asia.
    
    RECOMMENDATION INSTRUCTION:
    - 3 Recommended Actions with FULL official titles from your newly generated staff.
  `;

    // 1. Newspaper Generation (Critical - Execute First)
    const newspaperResponse = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: promptNewspaper,
      config: {
        responseMimeType: "application/json",
        responseSchema: NEWSPAPER_SCHEMA,
        systemInstruction: "You are the Editor-in-Chief. Write detailed, immersive, journalistic content. Ensure name variety—do not repeat common last names like 'Sterling' unless historically appropriate. NO PLACEHOLDERS."
      }
    });

    if (onProgress) onProgress("Printing Newspaper...", 40);

    const newspaperText = getResponseText(newspaperResponse);
    if (!newspaperText) throw new Error("No response text from AI (Newspaper).");

    const data = JSON.parse(newspaperText) as NewspaperData;
    data.country = country;
    data.diplomacy = {};

    // 2. Diplomacy Witness (Optional - Execute Second)
    try {
      const promptDiplomacy = `
      TASK: Generate a comprehensive diplomatic intelligence report for the start of the game.
      COUNTRY CONTEXT: ${context}
      
      TARGET COUNTRIES:
      ${COUNTRY_LIST.join(", ")}
      
      INSTRUCTIONS:
      - For EVERY country in the list, provide a leader name, government type, diplomatic stance, and a brief status update/description.
      - Stances should be realistic based on the context of ${country}.
      `;

      const diplomacyResponse = await ai.models.generateContent({
        model: TEXT_MODEL_NAME,
        contents: promptDiplomacy,
        config: {
          responseMimeType: "application/json",
          responseSchema: DIPLOMACY_SCHEMA,
          systemInstruction: "You are the Director of National Intelligence. Provide a full briefing on all key nations."
        }
      });

      const diploText = getResponseText(diplomacyResponse);
      if (diploText) {
        const diploData = JSON.parse(diploText) as ForeignCountry[];
        if (Array.isArray(diploData)) {
          diploData.forEach((c) => {
            data.diplomacy[c.name] = c;
          });
        }
      }
    } catch (diplomacyError) {
      console.warn("Diplomacy pre-loading failed (non-critical):", diplomacyError);
    }

    if (data.mainStory.visualPrompt) {
      data.imageUrl = await generateNewspaperImage(data.mainStory.visualPrompt);
    }

    return data;
  } catch (error) {
    console.error("Failed to init game:", error);
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
  const ai = getAIClient();
  const context = getCountryContext(country);

  const historySummary = history.slice(-5).map(h =>
    `Turn ${h.turnNumber}: Action: "${h.playerAction}" -> Result: ${h.resultSummary}`
  ).join("\n");

  const characterList = currentCharacters.map(c => `"${c.name}" (${c.role})`).join(", ");

  const prompt = `
    Country: ${context}
    ESTABLISHED CHARACTERS: ${characterList}
    RECENT HISTORY:
    ${historySummary}

    PLAYER ACTION: "${action}"

    WORLD NEWS INSTRUCTION:
    - Generate AT LEAST 4 World News articles.
    - DIVERSITY IS MANDATORY: Africa, South America, and Asia.
    
    REQUIRED: 3 NEW Recommended Actions with FULL titles from the established cabinet.
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: NEWSPAPER_SCHEMA,
        systemInstruction: "You are a serious political journalist. Maintain character continuity using the provided list. Ensure global variety in news. NO PLACEHOLDERS."
      }
    });

    const text = getResponseText(response);
    if (!text) throw new Error("No response text from AI. Check safety settings or quota.");

    const data = JSON.parse(text) as NewspaperData;
    data.country = country;
    data.diplomacy = {}; // We will handle merging this in the App layer so we don't lose old data, or the AI can ignore it here.

    if (data.mainStory.visualPrompt) {
      data.imageUrl = await generateNewspaperImage(data.mainStory.visualPrompt);
    }

    return data;
  } catch (error) {
    console.error("Turn processing failed:", error);
    throw error;
  }
};

export const getAdvisorOpinion = async (
  question: string,
  data: NewspaperData,
  history: TurnHistory[]
): Promise<AdvisorOpinion[]> => {
  const ai = getAIClient();
  const characterList = data.characters.map(c => `"${c.name}" (${c.role})`).join(", ");
  const historySummary = history.slice(-3).map(h =>
    `Action: "${h.playerAction}" -> Result: ${h.resultSummary}`
  ).join("\n");

  const prompt = `
    CONTEXT:
    Country: ${data.country}
    Current Situation Headline: "${data.mainStory.headline}"
    Stats: Economy ${data.stats.economy}, Stability ${data.stats.stability}, Liberty ${data.stats.liberty}, Approval ${data.stats.approval}.
    
    CABINET MEMBERS: ${characterList}
    
    RECENT HISTORY:
    ${historySummary}
    
    PLAYER QUESTION: "${question}"
    
    INSTRUCTION:
    Select 1-2 most relevant cabinet members to answer this question based on their role (e.g. Treasury for economy, General for war).
    Provide their direct, in-character advice. The advice should be concise but helpful.
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: advisorResponseSchema,
        systemInstruction: "You are the cabinet of the leader. Provide realistic, strategic advice."
      }
    });

    const text = getResponseText(response);
    if (!text) return [];
    return JSON.parse(text) as AdvisorOpinion[];
  } catch (error) {
    console.error("Advisor consult failed", error);
    return [{ advisorName: "Chief of Staff", role: "Advisor", advice: "I'm sorry sir, I couldn't reach the cabinet." }];
  }
};

export const identifyCountryDetails = async (
  targetCountry: string,
  data: NewspaperData
): Promise<ForeignCountry> => {
  const ai = getAIClient();
  const articlesText = [
    data.mainStory.content,
    ...data.worldNews.map(n => n.content),
    ...data.localNews.map(n => n.content)
  ].join("\n\n");

  const prompt = `
    TASK: Identify or Generate details for the country: "${targetCountry}".
    
    SOURCE MATERIAL (Current Newspaper):
    ${articlesText}
    
    INSTRUCTIONS:
    1. Scan the SOURCE MATERIAL. Is there a leader mentioned for ${targetCountry}? If so, use their name.
    2. If NOT mentioned, GENERATE a realistic leader name, government type, and current diplomatic stance towards the player's country (${data.country}).
    3. Determine the 'stance' based on real-world geopolitics relative to ${data.country} or recent news events in the text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: foreignCountrySchema,
        systemInstruction: "You are an intelligence analyst. Be consistent with the text provided."
      }
    });

    const text = getResponseText(response);
    if (!text) throw new Error("No intel generated. Response text was empty.");
    return JSON.parse(text) as ForeignCountry;
  } catch (error) {
    console.error("Diplomacy check failed", error);
    if (error instanceof Error) throw error; // Re-throw to let UI handle it, or at least return a modified error
    throw new Error(String(error));
  }
};