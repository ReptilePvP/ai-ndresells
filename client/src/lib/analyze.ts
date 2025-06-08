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

export async function runAnalysis(imageUrl: string, userInput: UserInput): Promise<AnalysisRecord> {
  const id = `img_${uuidv4()}`;
  const created_at = new Date().toISOString();

  // Combine prompt with user input
  const prompt = `
You are a resale assistant. Based on this image, identify:
- title
- category (e.g., clothing, shoes)
- detailed description (brand, model, color, condition, size if visible)
- estimated resale_value in USD
- a self-assessed confidence: High, Medium, or Low

User input:
Brand: ${userInput.brand || 'unknown'}
Size: ${userInput.size || 'unknown'}
Condition: ${userInput.condition || 'unknown'}

Return EXACTLY this JSON:
{
  "title": "...",
  "category": "...",
  "description": "...",
  "resale_value": 0,
  "confidence": "High",
  "keywords": ["brand","model","type","color"]
}
If conditions are unclear, include a "note" field explaining uncertainty.
`;

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
