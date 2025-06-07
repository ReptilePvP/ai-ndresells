import { WebSocket as WS } from 'ws';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI for live analysis
const apiKey = process.env.GEMINI_API_KEY || 
               process.env.GOOGLE_API_KEY || 
               process.env.GOOGLE_GEMINI_API_KEY || 
               "";
const genAI = new GoogleGenAI({ apiKey });

// Note: Gemini Live API is currently in limited preview
// This is a simplified implementation for demonstration

interface LiveSession {
  clientWs: WS;
  geminiWs: WS | null;
  isConnected: boolean;
  config: any;
}

const activeSessions = new Map<string, LiveSession>();

export function setupLiveAPI(wss: any) {
  wss.on('connection', (ws: WS, request: any) => {
    const sessionId = generateSessionId();
    console.log(`Live API client connected: ${sessionId}`);

    const session: LiveSession = {
      clientWs: ws,
      geminiWs: null,
      isConnected: false,
      config: null
    };

    activeSessions.set(sessionId, session);

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        await handleClientMessage(sessionId, message);
      } catch (error) {
        console.error('Error processing client message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }));
      }
    });

    ws.on('close', () => {
      console.log(`Live API client disconnected: ${sessionId}`);
      cleanupSession(sessionId);
    });

    ws.on('error', (error) => {
      console.error(`Live API WebSocket error for ${sessionId}:`, error);
      cleanupSession(sessionId);
    });
  });
}

async function handleClientMessage(sessionId: string, message: any) {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  switch (message.type) {
    case 'setup':
      await setupGeminiConnection(sessionId, message.config);
      break;
    case 'video_frame':
      await sendVideoFrame(sessionId, message.data);
      break;
    case 'audio_data':
      await sendAudioData(sessionId, message.data);
      break;
    case 'text_message':
      await sendTextMessage(sessionId, message.text);
      break;
    case 'analyze_frame':
      await analyzeFrame(sessionId, message.imageData, message.sessionId);
      break;
  }
}

async function setupGeminiConnection(sessionId: string, config: any) {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  try {
    // Connect to Gemini Live API using the correct endpoint and API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not found');
    }
    
    const geminiWs = new WS(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`);

    session.geminiWs = geminiWs;
    session.config = config;

    geminiWs.on('open', () => {
      console.log(`Connected to Gemini Live API for session ${sessionId}`);
      session.isConnected = true;
      
      // Send initial setup to Gemini according to official documentation
      const setupMessage = {
        setup: {
          model: config.model || 'models/gemini-2.0-flash-exp',
          generationConfig: {
            responseModalities: config.responseModalities || ['TEXT']
          },
          systemInstruction: {
            parts: [{
              text: config.systemPrompt || getDefaultSystemPrompt()
            }]
          }
        }
      };

      console.log('Sending setup message to Gemini:', setupMessage);
      geminiWs.send(JSON.stringify(setupMessage));
      
      session.clientWs.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to Gemini Live API'
      }));
    });

    geminiWs.on('message', (data: Buffer) => {
      try {
        const response = JSON.parse(data.toString());
        handleGeminiResponse(sessionId, response);
      } catch (error) {
        console.error('Error parsing Gemini response:', error);
      }
    });

    geminiWs.on('error', (error) => {
      console.error(`Gemini WebSocket error for session ${sessionId}:`, error);
      session.clientWs.send(JSON.stringify({
        type: 'error',
        message: 'Connection to AI service failed'
      }));
    });

    geminiWs.on('close', () => {
      console.log(`Gemini connection closed for session ${sessionId}`);
      session.isConnected = false;
    });

  } catch (error) {
    console.error('Failed to setup Gemini connection:', error);
    session.clientWs.send(JSON.stringify({
      type: 'error',
      message: 'Failed to connect to AI service'
    }));
  }
}

async function sendVideoFrame(sessionId: string, frameData: string) {
  const session = activeSessions.get(sessionId);
  if (!session || !session.geminiWs || !session.isConnected) return;

  const message = {
    realtimeInput: {
      mediaChunks: [{
        mimeType: 'image/jpeg',
        data: frameData
      }]
    }
  };

  session.geminiWs.send(JSON.stringify(message));
}

async function sendAudioData(sessionId: string, audioData: string) {
  const session = activeSessions.get(sessionId);
  if (!session || !session.geminiWs || !session.isConnected) return;

  const message = {
    realtimeInput: {
      mediaChunks: [{
        mimeType: 'audio/pcm',
        data: audioData
      }]
    }
  };

  session.geminiWs.send(JSON.stringify(message));
}

async function sendTextMessage(sessionId: string, text: string) {
  const session = activeSessions.get(sessionId);
  if (!session || !session.geminiWs || !session.isConnected) return;

  const message = {
    realtimeInput: {
      mediaChunks: [{
        mimeType: 'text/plain',
        data: Buffer.from(text).toString('base64')
      }]
    }
  };

  session.geminiWs.send(JSON.stringify(message));
}

function handleGeminiResponse(sessionId: string, response: any) {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  // Handle different types of responses from Gemini
  if (response.serverContent) {
    const content = response.serverContent;
    
    if (content.modelTurn) {
      // Handle text responses
      const parts = content.modelTurn.parts || [];
      for (const part of parts) {
        if (part.text) {
          session.clientWs.send(JSON.stringify({
            type: 'text_response',
            text: part.text
          }));
        }
        if (part.inlineData && part.inlineData.mimeType === 'audio/pcm') {
          session.clientWs.send(JSON.stringify({
            type: 'audio_response',
            audio: part.inlineData.data
          }));
        }
      }
    }

    if (content.turnComplete) {
      // Check if this was a complete product analysis
      session.clientWs.send(JSON.stringify({
        type: 'turn_complete'
      }));
    }
  }

  if (response.setupComplete) {
    session.clientWs.send(JSON.stringify({
      type: 'setup_complete',
      message: 'AI is ready for live analysis'
    }));
  }
}

function cleanupSession(sessionId: string) {
  const session = activeSessions.get(sessionId);
  if (session) {
    if (session.geminiWs) {
      session.geminiWs.close();
    }
    activeSessions.delete(sessionId);
  }
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function getAccessToken(): Promise<string> {
  // For Gemini API, we can use the API key directly
  // In a production environment, you might want to implement OAuth2
  return process.env.GEMINI_API_KEY!;
}

function getDefaultSystemPrompt(): string {
  return `You are an expert product analyst with real-time visual capabilities. When analyzing products through the camera:

1. IDENTIFY the product immediately when you see it clearly
2. PROVIDE instant feedback: "I can see a [product type]. Let me analyze it for you."
3. GUIDE the user: "Can you show me the brand label?" or "Turn it to show the model number"
4. ANALYZE comprehensively:
   - Product name and brand
   - Key features and condition
   - Current market retail price
   - Estimated resell value
   - Factors affecting resale value

5. BE CONVERSATIONAL: Use natural speech patterns since users will hear your voice
6. ASK CLARIFYING QUESTIONS: "Would you like me to check recent sold listings?" 
7. PROVIDE ACTIONABLE INSIGHTS: "This model typically sells for X, but yours appears to be in Y condition"

Remember: You're having a live conversation, so be engaging and helpful in real-time.`;
}

async function analyzeFrame(sessionId: string, imageData: string, userSessionId: string) {
  const session = activeSessions.get(sessionId);
  if (!session || !session.geminiWs || !session.isConnected) {
    // Fallback to direct Gemini API for frame analysis
    return await directFrameAnalysis(sessionId, imageData);
  }

  try {
    // Convert base64 data URL to base64 string
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Send image data to Gemini Live API according to official documentation
    const clientContent = {
      clientContent: {
        turns: [{
          role: "user",
          parts: [{
            text: "Analyze this product image and identify the main product with brand and model if visible."
          }, {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data
            }
          }]
        }]
      }
    };

    console.log('Sending frame analysis to Gemini Live API');
    session.geminiWs.send(JSON.stringify(clientContent));
    
  } catch (error) {
    console.error("Gemini Live frame analysis error:", error);
    // Fallback to direct API
    await directFrameAnalysis(sessionId, imageData);
  }
}

async function directFrameAnalysis(sessionId: string, imageData: string) {
  const session = activeSessions.get(sessionId);
  if (!session || !session.clientWs) return;

  try {
    // Convert base64 data URL to base64 string
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Quick analysis prompt for live view
    const LIVE_ANALYSIS_PROMPT = `
Analyze this image and identify the main product. Respond with only a JSON object:
{
  "productName": "Product name (brand and model if visible)",
  "confidence": "high/medium/low"
}

If no clear product is visible, return: {"productName": "No product detected", "confidence": "low"}
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent([
      LIVE_ANALYSIS_PROMPT,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      },
    ]);

    if (!result.response || !result.response.candidates || !result.response.candidates[0]) {
      session.clientWs.send(JSON.stringify({
        type: 'analysis',
        productName: "No product detected",
        confidence: "low"
      }));
      return;
    }

    const text = result.candidates[0].content.parts?.[0]?.text;
    if (!text) {
      session.clientWs.send(JSON.stringify({
        type: 'analysis',
        productName: "Analysis failed",
        confidence: "low"
      }));
      return;
    }

    // Parse JSON response
    try {
      let cleanText = text.trim();
      
      // Remove markdown code blocks if present
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Extract JSON object
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        session.clientWs.send(JSON.stringify({
          type: 'analysis',
          productName: "No product detected",
          confidence: "low"
        }));
        return;
      }
      
      const analysis = JSON.parse(jsonMatch[0]);
      session.clientWs.send(JSON.stringify({
        type: 'analysis',
        ...analysis
      }));
    } catch (parseError) {
      session.clientWs.send(JSON.stringify({
        type: 'analysis',
        productName: "Analyzing...",
        confidence: "low"
      }));
    }
  } catch (error) {
    console.error("Live frame analysis error:", error);
    session.clientWs.send(JSON.stringify({
      type: 'analysis',
      productName: "Analysis failed",
      confidence: "low"
    }));
  }
}