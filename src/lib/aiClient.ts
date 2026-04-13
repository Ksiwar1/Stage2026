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
  aiTypeOverride?: string
): Promise<string> {
  const aiType = getAIType(aiTypeOverride);

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
      });
      return completion.choices[0]?.message?.content || "";
    }

    case "gemini": {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: systemPrompt,
      });
      const result = await model.generateContent(userPrompt);
      return result.response.text() || "";
    }

    case "claude": {
      const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY || "" });
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        temperature,
      });
      const block = message.content[0];
      return block.type === "text" ? block.text : "";
    }
  }
}

export function getAILabel(override?: string): string {
  const labels: Record<AIType, string> = {
    groq: "Groq (Llama 3.3 70B)",
    gemini: "Gemini 2.0 Flash",
    claude: "Claude Sonnet",
  };
  return labels[getAIType(override)];
}

export function getDefaultAIType(): AIType {
  return getAIType();
}
