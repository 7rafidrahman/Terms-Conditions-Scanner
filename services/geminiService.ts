
import { GoogleGenAI, Type } from "@google/genai";
import type { ImageFile, SummaryReport } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function fileToGenerativePart(dataUrl: string) {
  const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
  const base64Data = dataUrl.substring(dataUrl.indexOf(',') + 1);
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
}

const summarySchema = {
    type: Type.OBJECT,
    properties: {
        full_text: {
            type: Type.STRING,
            description: "The full, accurately extracted text from the document(s)."
        },
        summary_en: {
            type: Type.STRING,
            description: "A concise summary of the document in simple English."
        },
        summary_bn: {
            type: Type.STRING,
            description: "A concise summary of the document in Bengali (Bangla)."
        },
        key_clauses: {
            type: Type.ARRAY,
            description: "An array of up to 5 most critical clauses.",
            items: {
                type: Type.OBJECT,
                properties: {
                    clause: { type: Type.STRING, description: "The title or a key phrase of the clause." },
                    explanation_en: { type: Type.STRING, description: "A simple explanation of the clause in English." },
                    explanation_bn: { type: Type.STRING, description: "A simple explanation of the clause in Bengali (Bangla)." }
                },
                required: ["clause", "explanation_en", "explanation_bn"]
            }
        }
    },
    required: ["full_text", "summary_en", "summary_bn", "key_clauses"]
};

export const generateSummaryFromImages = async (images: ImageFile[]): Promise<Omit<SummaryReport, 'id' | 'title' | 'timestamp'>> => {
    const imageParts = images.map(img => fileToGenerativePart(img.dataUrl));
    
    const prompt = `You are an expert legal assistant specializing in simplifying complex terms and conditions for laypeople. Analyze the text from the following image(s).

1.  Extract all text content accurately.
2.  Provide a concise summary in simple English.
3.  Provide a concise summary in Bengali (Bangla).
4.  Identify and list up to 5 most critical clauses a user should be aware of. For each clause, provide a brief explanation in both English and Bengali. Examples include: automatic subscription renewals, data privacy and sharing policies, termination clauses, liability limitations, and arbitration clauses.
5.  Return the entire response as a single JSON object matching the provided schema. Do not include any text outside the JSON object or any markdown formatting.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        // FIX: The parts for a multimodal prompt must be in a single content object.
        contents: {
            parts: [
                ...imageParts,
                { text: prompt }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: summarySchema,
        },
    });
    
    const jsonText = response.text.trim();
    try {
        return JSON.parse(jsonText);
    } catch(e) {
        console.error("Failed to parse Gemini response:", e);
        console.error("Raw response:", jsonText);
        throw new Error("The AI returned an invalid response. Please try again.");
    }
};
