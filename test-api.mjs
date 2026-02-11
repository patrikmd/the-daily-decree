
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
        const response = await client.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: "Hello, are you working?"
        });
        console.log("Full Response Object:", JSON.stringify(response, null, 2));
        if (typeof response.text === 'function') {
            console.log("response.text() result:", response.text());
        } else {
            console.log("response.text property:", response.text);
        }
    } catch (error) {
        console.error("ERROR: API Test Failed.");
        console.error(error);
        if (error.message) console.error("Message:", error.message);
        // Log full error object keys if possible
        console.log(JSON.stringify(error, null, 2));
    }
};

main();
