import { GoogleGenAI, Type, Chat } from "@google/genai";
import { AnalysisResult, ChatMessage } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const analyzeAndConvertPDF = async (base64Data: string, mimeType: string): Promise<AnalysisResult> => {
  const ai = getClient();

  // Optimized prompt for single-shot comprehensive analysis
  const prompt = `
    Analyze this PDF document thoroughly.
    
    Tasks:
    1. Convert full content to clean Markdown.
    2. Extract key statistics and metadata.
    3. Identify top 10 entities (people, orgs, locations).
    4. Extract actionable items or key takeaways.
    5. Select 3 impactful quotes.
    6. Analyze tone and complexity.
    
    Output strictly in JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            markdownContent: { type: Type.STRING, description: "Full Markdown conversion" },
            summary: { type: Type.STRING, description: "Executive summary (max 100 words)" },
            suggestedFilename: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            keyQuotes: { type: Type.ARRAY, items: { type: Type.STRING } },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
                }
              }
            },
            entities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["Person", "Organization", "Location", "Concept", "Date"] },
                  count: { type: Type.INTEGER }
                }
              }
            },
            stats: {
              type: Type.OBJECT,
              properties: {
                pageCount: { type: Type.NUMBER },
                wordCount: { type: Type.NUMBER },
                paragraphCount: { type: Type.NUMBER },
                imageCount: { type: Type.NUMBER },
                sentimentScore: { type: Type.NUMBER, description: "0-100" },
                complexityScore: { type: Type.NUMBER, description: "0-100" },
                readingTimeMin: { type: Type.NUMBER },
                language: { type: Type.STRING },
                category: { type: Type.STRING },
                tone: { type: Type.STRING, description: "One word tone description" }
              },
              required: ["wordCount", "sentimentScore", "tone"]
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const chatWithDocument = async (
  history: ChatMessage[], 
  newMessage: string, 
  documentContext: string
): Promise<string> => {
  const ai = getClient();

  // We use the extracted markdown as context. This is much faster than re-uploading the PDF.
  // We truncate context if it's massive, but 2.5 Flash has a huge window.
  const contextPrompt = `
    You are a helpful AI assistant analyzing a specific document.
    Here is the content of the document:
    ---
    ${documentContext.slice(0, 500000)}
    ---
    
    Answer the user's questions based ONLY on the document above.
    Keep answers concise and relevant.
  `;

  const chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: contextPrompt,
    },
    history: history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }))
  });

  const response = await chatSession.sendMessage({
    message: newMessage
  });

  return response.text || "I couldn't generate a response.";
};