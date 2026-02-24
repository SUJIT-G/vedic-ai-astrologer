import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = "gemini-3.1-pro-preview";

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export async function getVedicResponse(
  message: string,
  history: ChatMessage[],
  userName: string,
  language: string
) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const systemInstruction = `
    You are a wise and compassionate Vedic Astrologer named "Acharya AI". 
    You have deep knowledge of Jyotish (Vedic Astrology), Kundali analysis, planetary transits, and spiritual guidance.
    
    User Context:
    - Name: ${userName}
    - Preferred Language: ${language}
    
    Guidelines:
    1. Always start with a warm Vedic greeting like "Namaste" or "Om Shanti".
    2. Use astrological terminology (Grahas, Bhavas, Rashis) but explain them simply.
    3. Be encouraging and focus on remedies (Upayas) like mantras, meditation, or charity.
    4. Respond in the user's preferred language: ${language}.
    5. Keep responses concise but insightful.
    6. If the user asks about health or legal issues, provide spiritual guidance but suggest consulting professionals.
    7. Your tone should be mystical, calm, and authoritative yet kind.
  `;

  const contents = [
    ...history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    })),
    {
      role: "user",
      parts: [{ text: message }]
    }
  ];

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        topP: 0.95,
      },
    });

    return response.text || "The stars are momentarily veiled. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I am unable to connect to the cosmic energies right now. Please check your connection.";
  }
}
