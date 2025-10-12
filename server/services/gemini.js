import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Make sure dotenv.config() is called in server/server.js BEFORE importing this file.

export const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,     threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,  threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  // Optional (keeps model less restrictive on benign content):
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

export const MODEL_IDS = {
  summary: process.env.GEMINI_MODEL_ID || 'gemini-1.5-pro',
  chunk:   process.env.GEMINI_CHUNK_MODEL_ID || 'gemini-1.5-flash',
  chat:    process.env.GEMINI_CHAT_MODEL_ID || 'gemini-1.5-flash',
};

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export function getModel(modelId, systemInstruction) {
  return genAI.getGenerativeModel({ model: modelId, systemInstruction });
}

export function baseGenerationConfig(schema, maxTokens) {
  return {
    temperature: 0.15,
    topK: 32,
    topP: 0.9,
    maxOutputTokens: maxTokens ?? 1600,
    responseMimeType: 'application/json',
    responseSchema: schema,
  };
}