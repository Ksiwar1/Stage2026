import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

export type AIType = "groq" | "gemini" | "claude";

export function getAIType(override?: string): AIType {
  const type = (override || process.env.AI_TYPE || "groq").toLowerCase();
  if (type === "gemini" || type === "claude" || type === "groq") return type;
  return "groq";
}

export async function generateAIResponse(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.7,
  aiTypeOverride?: string,
  base64Image?: { mimeType: string; data: string }
): Promise<string> {
  let aiType = getAIType(aiTypeOverride);

  // FALLBACK: Groq a désactivé "llama-3.2-11b-vision-preview" de son API publique.
  // Si on reçoit une image et qu'on est sur Groq, on bascule automatiquement, silencieusement et gratuitement vers Gemini 2.0 Flash qui gère l'OCR à la perfection.
  if (aiType === "groq" && base64Image) {
     console.warn("Groq Vision API decommissioned. Fallbacking to Gemini 2.0 Flash automatically.");
     aiType = "gemini";
  }

  switch (aiType) {
    case "groq": {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
      const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: 2500,
        response_format: { type: "json_object" },
      });
      return completion.choices[0]?.message?.content || "";
    }

    case "gemini": {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-latest",
        systemInstruction: systemPrompt,
      });

      const content: any[] = [userPrompt];
      if (base64Image) {
        content.push({
          inlineData: { data: base64Image.data, mimeType: base64Image.mimeType },
        });
      }

      const result = await model.generateContent(content);
      return result.response.text() || "";
    }

    case "claude": {
      const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY || "" });
      const messageContent: any[] = [];
      if (base64Image) {
        messageContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: base64Image.mimeType,
            data: base64Image.data,
          },
        });
      }
      messageContent.push({ type: "text", text: userPrompt });

      const message = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: messageContent }],
        temperature,
      });
      const block = message.content[0];
      return block.type === "text" ? block.text : "";
    }
  }
}

export function getAILabel(override?: string): string {
  const type = getAIType(override);
  if (type === "gemini") return "Gemini 2.0 Flash";
  if (type === "claude") return "Claude Sonnet";
  return "Groq (Llama 3.1 8B)";
}

export function getDefaultAIType(): AIType {
  return getAIType();
}
