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
  base64Image?: { mimeType: string; data: string },
  maxTokens: number = 2500
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
      const payload = {
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" } as any,
      };

      try {
        const completion = await groq.chat.completions.create(payload);
        return completion.choices[0]?.message?.content || "";
      } catch (error: any) {
        if (error?.status === 429 || error?.status === 413 || error?.message?.includes("429") || error?.message?.includes("413") || error?.message?.includes("Connection error") || error?.code === 'ECONNRESET') {
          console.warn(`[RATE LIMIT / TIMEOUT] Groq Free Tier saturé ou Perte de Connexion. Pause de 20s pour purger le rolling window/récupérer le réseau...`);
          await new Promise(resolve => setTimeout(resolve, 20000));
          console.log(`[RATE LIMIT] Reprise Groq...`);
          try {
             const retryCompletion = await groq.chat.completions.create(payload);
             return retryCompletion.choices[0]?.message?.content || "";
          } catch (retryError: any) {
             console.warn(`[RATE LIMIT SECOND ÉCHEC] Toujours saturé. Pause ultime de 25s...`);
             await new Promise(resolve => setTimeout(resolve, 25000));
             const finalCompletion = await groq.chat.completions.create(payload);
             return finalCompletion.choices[0]?.message?.content || "";
          }
        }
        throw error;
      }
    }

    case "gemini": {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemPrompt,
      });

      const content: any[] = [userPrompt];
      if (base64Image) {
        content.push({
          inlineData: { data: base64Image.data, mimeType: base64Image.mimeType },
        });
      }

      const executeGemini = async (attempt: number = 1): Promise<string> => {
        try {
          const result = await model.generateContent(content);
          return result.response.text() || "";
        } catch (error: any) {
          if ((error?.status === 503 || error?.message?.includes("503")) && attempt <= 3) {
            const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
            console.warn(`[GEMINI 503 ERROR] API saturée. Tentative ${attempt}/3 dans ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return executeGemini(attempt + 1);
          }
          if (error?.status === 429 || error?.message?.includes("429")) {
            console.warn(`[RATE LIMIT] Quota 'gemini-2.5-flash' dépassé. Tentative de Fallback sur 'gemini-2.5-flash'...`);
            try {
               const fbModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: systemPrompt });
               const fbRes = await fbModel.generateContent(content);
               return fbRes.response.text() || "";
            } catch (e2: any) {
               const match = error?.message?.match(/Please retry in ([\d.]+)s/);
               const sleepSeconds = match ? parseFloat(match[1]) : 60;
               const sleepMs = Math.ceil((sleepSeconds + 1) * 1000);
               console.warn(`[RATE LIMIT] Fallback échoué. Pause de ${Math.round(sleepMs/1000)}s...`);
               await new Promise(resolve => setTimeout(resolve, sleepMs));
               const retryResult = await model.generateContent(content);
               return retryResult.response.text() || "";
            }
          }
          throw error;
        }
      };

      return executeGemini();
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
