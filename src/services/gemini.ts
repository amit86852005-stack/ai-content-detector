import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY_MISSING');
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export interface AnalysisResult {
  isAI: boolean;
  confidence: number;
  reasoning: string;
  artifacts: string[];
}

export async function analyzeMedia(
  fileData: string,
  mimeType: string,
  isImage: boolean
): Promise<string> {
  // logging the file type before sending to api
  console.log("Analyzing file...", { mimeType, isImage });

  try {
    const ai = getAI();
    const model = ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: [
        {
          parts: [
            {
              text: `Analyze this ${isImage ? "image" : "video"} to see if it was created or modified by AI. 
              Explain your findings in simple, clear language that anyone can understand.
              
              Check for these common AI signs:
              - **Visual Glitches**: Look for weird blurring, warping, or "pixelated" areas that don't look natural.
              - **Lighting & Shadows**: Check if the light and shadows match up across the whole scene.
              - **Human Details**: Look closely at eyes, skin, and hands for anything that looks "too perfect" or strangely distorted.
              - **Background & Edges**: Check if objects in the background look blurry or if their edges look "cut out" or glowing.
              ${!isImage ? `
              - **Unnatural Motion Blur**: Look for blur that doesn't follow the direction of movement, or "ghosting" where a trail of the object remains visible. (Example: A moving hand that looks like a smeared smudge instead of a clear motion-blurred limb).
              - **Frame Rate Inconsistencies**: Check if the video speed seems to change randomly or if some frames look like they are "skipping" or "stuttering." (Example: A person walking where their legs suddenly move much faster for a split second).
              - **Jerky Transitions**: Look for sudden, sharp changes in the position or shape of objects between frames. (Example: A person's hair suddenly jumping to a different position or a background object disappearing and reappearing).
              - **Movement**: Check if things flicker or change shape strangely as they move.` : ""}
              
              OUTPUT FORMAT:
              Result: [Real | AI Generated]
              Confidence: [SCORE]%
              Reasons:
              • [Short Reason - max 5 words]
              • [Short Reason - max 5 words]
              • [Short Reason - max 5 words] (optional)
              
              Keep it extremely brief and simple. Avoid paragraphs.`
            },
            {
              inlineData: {
                data: fileData.split(",")[1],
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
    });

    const response = await model;
    
    console.log("Got response from Gemini API!");

    return response.text || "Failed to generate analysis.";
  } catch (error: any) {
    console.error("Oops, Gemini API Error:", error?.message || error);
    
    // Check for quota exhaustion (429)
    if (error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429 || error?.message?.includes("quota")) {
      throw new Error("QUOTA_EXHAUSTED");
    }
    
    throw error;
  }
}
