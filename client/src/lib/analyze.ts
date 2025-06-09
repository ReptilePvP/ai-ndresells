// analyze.ts
import { v4 as uuidv4 } from 'uuid';
import { db } from './db'; // Replit DB client wrapper
import { analyzeWithGemini } from './gemini'; // Gemini helper

export interface UserInput {
  brand?: string;
  size?: string;
  condition?: string;
}

export interface GeminiResult {
  title: string;
  category: string;
  description: string;
  resale_value: number;
  confidence: 'High' | 'Medium' | 'Low';
  keywords: string[];
  note?: string;
}

export interface AnalysisRecord {
  id: string;
  created_at: string;
  image_url: string;
  user_input: UserInput;
  gemini_result: GeminiResult;
  marketplace_prices?: {
    ebay_avg?: number;
    stockx_avg?: number;
  };
  status: 'complete' | 'pending' | 'error';
}

function buildPrompt(imageUrl: string, userInput: UserInput): string {
  return `
You are a resale product analysis assistant. Given an image and optional user input, return structured pricing data for resale purposes.

Example 1:
User input:
Brand: Nike
Size: 10
Condition: New

Output:
{
  "title": "Nike Dunk Low Panda",
  "category": "shoes",
  "description": "Nike Dunk Low in black and white, men's size 10, brand new condition",
  "resale_value": 180,
  "confidence": "High",
  "keywords": ["nike", "dunk low", "panda", "sneaker"]
}

Now respond with JSON in this exact format. Avoid extra text or commentary.

User input:
Brand: ${userInput.brand || 'unknown'}
Size: ${userInput.size || 'unknown'}
Condition: ${userInput.condition || 'unknown'}

Image: ${imageUrl}
`;
}

export async function runAnalysis(imageUrl: string, userInput: UserInput): Promise<AnalysisRecord> {
  const id = `img_${uuidv4()}`;
  const created_at = new Date().toISOString();
  const prompt = buildPrompt(imageUrl, userInput);

  let gemini_result: GeminiResult;

  try {
    gemini_result = await analyzeWithGemini(imageUrl, prompt);
  } catch (error) {
    throw new Error(`Gemini analysis failed: ${error}`);
  }

  const record: AnalysisRecord = {
    id,
    created_at,
    image_url: imageUrl,
    user_input: userInput,
    gemini_result,
    status: 'complete'
  };

  await db.set(`analysis:${id}`, record);
  return record;
}
