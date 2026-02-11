
import { GoogleGenAI, Type } from "@google/genai";
import fs from 'fs';
import path from 'path';

// Read .env.local
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const match = envContent.match(/GEMINI_API_KEY=(.+)/);
const apiKey = match ? match[1].trim() : null;

if (!apiKey) {
    console.error("Could not find GEMINI_API_KEY");
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

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

// Mock Data
const targetCountry = "France";
const homeCountry = "USA";
const articlesText = "The President of the United States met with European leaders today. Tensions in the Middle East are rising.";

const prompt = `
    TASK: Identify or Generate details for the country: "${targetCountry}".
    
    SOURCE MATERIAL (Current Newspaper):
    ${articlesText}
    
    INSTRUCTIONS:
    1. Scan the SOURCE MATERIAL. Is there a leader mentioned for ${targetCountry}? If so, use their name.
    2. If NOT mentioned, GENERATE a realistic leader name, government type, and current diplomatic stance towards the player's country (${homeCountry}).
    3. Determine the 'stance' based on real-world geopolitics relative to ${homeCountry} or recent news events in the text.
`;

const main = async () => {
    console.log(`Testing identifyCountryDetails for ${targetCountry}...`);
    try {
        const response = await client.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: foreignCountrySchema,
                systemInstruction: "You are an intelligence analyst. Be consistent with the text provided."
            }
        });

        console.log("Full Response Object Keys:", Object.keys(response));
        if (response.text) {
            console.log("response.text type:", typeof response.text);
            console.log("response.text value:", response.text);
            try {
                const parsed = JSON.parse(response.text);
                console.log("Parsed JSON:", parsed);
            } catch (e) {
                console.error("JSON Parse Error:", e);
            }
        } else {
            console.log("response.text is undefined/null");
            // Check if it's a function
            // @ts-ignore
            if (typeof response.text === 'function') {
                console.log("response.text() result:", response.text());
            }
        }

    } catch (error) {
        console.error("Generate Content Failed:", error);
    }
};

main();
