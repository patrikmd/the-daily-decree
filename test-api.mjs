
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

// Read .env.local manually since we are running with node
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const match = envContent.match(/GEMINI_API_KEY=(.+)/);
const apiKey = match ? match[1].trim() : null;

if (!apiKey) {
    console.error("Could not find GEMINI_API_KEY in .env.local");
    process.exit(1);
}

console.log("Found API Key:", apiKey.substring(0, 5) + "...");

const main = async () => {
    try {
        const client = new GoogleGenAI({ apiKey });
        console.log("Listing available models...");
        const response = await client.models.list();
        // SDK returns an object with a models property which is an array
        if (response.models) {
            response.models.slice(0, 10).forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("No models property in list response.");
        }
    } catch (e) { console.log("List failed:", e.message); }

    const modelsToTest = ["gemini-1.5-flash", "gemini-2.0-flash", "models/gemini-1.5-flash", "models/gemini-2.0-flash"];
    for (const modelId of modelsToTest) {
        console.log(`\n--- Testing Model: ${modelId} ---`);
        try {
            const client = new GoogleGenAI({ apiKey });
            const response = await client.models.generateContent({
                model: modelId,
                contents: "Hello"
            });
            console.log(`SUCCESS [${modelId}]:`, getResponseText(response));
            return; // Exit if we find one that works
        } catch (error) {
            console.error(`FAILED [${modelId}]:`, error.message);
        }
    }
};

const getResponseText = (response) => {
    if (typeof response.text === 'function') return response.text();
    if (response.candidates?.[0]?.content?.parts?.[0]?.text) return response.candidates[0].content.parts[0].text;
    return "No text produced";
};

main();
