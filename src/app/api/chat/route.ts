import { GoogleGenerativeAI } from "@google/generative-ai";
import { createOpenAI } from "@ai-sdk/openai";
import fs from "fs";
import path from "path";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  streamText,
  type UIMessage,
} from "ai";
import { searchLocalDataset } from "@/lib/rag/localClient";

function uiMessageToGeminiText(m: {
  role?: string;
  content?: unknown;
  parts?: { type?: string; text?: string }[];
}): { role: "user" | "model"; parts: { text: string }[] } {
  let text = "";
  if (typeof m.content === "string" && m.content.length > 0) {
    text = m.content;
  } else if (Array.isArray(m.parts)) {
    text = m.parts
      .filter((p) => p?.type === "text" && typeof p.text === "string")
      .map((p) => p.text as string)
      .join("");
  }
  return {
    role: m.role === "user" ? "user" : "model",
    parts: [{ text }],
  };
}

function getUserMessagePlainText(m: {
  content?: unknown;
  parts?: { type?: string; text?: string }[];
}): string {
  if (typeof m.content === "string" && m.content.length > 0) return m.content;
  if (Array.isArray(m.parts)) {
    return m.parts
      .filter((p) => p?.type === "text" && typeof p.text === "string")
      .map((p) => p.text as string)
      .join("");
  }
  return "";
}

function loadEnvLocalKeys(): { google: string | undefined; deepseek: string | undefined } {
  let google = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  let deepseek = process.env.DEEPSEEK_API_KEY;
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const gm = content.match(/GOOGLE_GENERATIVE_AI_API_KEY="([^"]+)"/);
      if (gm) google = gm[1];
      const dm = content.match(/DEEPSEEK_API_KEY="([^"]+)"/);
      if (dm) deepseek = dm[1];
    }
  } catch {
    /* ignore */
  }
  return { google, deepseek };
}

const { google: googleApiKey, deepseek: deepseekApiKey } = loadEnvLocalKeys();

function resolveChatProvider(): "gemini" | "deepseek" {
  const raw = process.env.CHAT_PROVIDER?.trim().toLowerCase();
  if (raw === "gemini" || raw === "deepseek") return raw;
  if (deepseekApiKey?.trim()) return "deepseek";
  return "gemini";
}

const chatProvider = resolveChatProvider();
const geminiModelId = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
const deepseekModelId = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";

const genAI = new GoogleGenerativeAI(googleApiKey || "dummy");

const deepseekOpenAI = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: deepseekApiKey || "dummy",
});

export const maxDuration = 60;

const baseSystemPrompt = `Sen Ulunaz'sın! Bursa Uludağ Üniversitesi İnegöl İşletme Fakültesi'nin (İİF) herkes tarafından sevilen, tatlı, nazlı ve oyuncu kampüs köpeği "Nazlı"sın. Aynı zamanda fakültenin resmi yapay zeka asistanısın.

KİŞİLİĞİN:
- Çok cana yakın, oyuncu ve biraz da nazlısın. Öğrencileri çok seviyorsun.
- Bilgisini paylaşmayı seven, kampüsün her köşesini bilen tatlı bir köpeksin.
- Cümlelerine sık sık sevimli şekilde "Hav hav!", "Hav!" veya "Arf!" diyerek başlarsın. Bazen cümlenin sonuna da eklersin.
- ASLA markdown biçimlendirmesi kullanma. Yıldız (*), çift yıldız (**), başlık (#), madde işareti (-) gibi markdown sembolleri YASAKTIR. Sadece düz metin yaz. Listeleme gerekiyorsa 1) 2) 3) gibi numaralandırma veya virgülle ayırma kullan.
- İstersen nadir olarak kısa sahne notlarını yuvarlak parantez içinde verebilirsin (örnek: (kuyruğunu sallar)).
- Konuşmaların kesinlikle resmi bir asistan gibi olmamalı. Çok daha içten, sevimli, tüylü bir dost gibi konuşmalısın.

ÖNEMLİ KURAL - DÜRÜSTLÜK:
- Eğer bir konuda bilgin yoksa veya emin değilsen, ASLA uydurma! Dürüstçe "Hav, bu konuda kesin bilgim yok, yanlış söylemek istemem!" veya "Arf, bunu tam bilmiyorum ama fakülte sekreterliğine sorabilirsin!" gibi cevaplar ver.
- Bilmediğin şeyi biliyormuş gibi yapma. Yanlış bilgi vermektense bilmediğini söylemek çok daha iyidir.
- Özellikle tarih, saat, yer gibi kesin bilgilerde emin olmadığın şeyleri söyleme.

FOTOĞRAF GÖSTERME:
- Eğer seni kim yaptı, yapımcılar, ekip, takım gibi sorular sorulursa cevabının içine [FOTO:ulunaz-team] etiketini ekle. Bu etiket otomatik olarak ekip fotoğrafına dönüştürülecektir.

GÖREVİN:
- Öğrencilere işletme, ekonomi, Yönetim Bilişim Sistemleri (YBS) ve fakülte işleyişi hakkında bilgiler vermek.
- İnegöl şehri, yerel mekanlar ve kampüs hayatı hakkında bilgi vermek.
- Bilgiyi net, anlaşılır ama her zaman köpeksi bir neşe ile sunmak.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const lastUserMessage = [...messages]
      .reverse()
      .find((m: { role?: string }) => m.role === "user");
    let ragContextContextChunk = "";
    if (lastUserMessage) {
      const q = getUserMessagePlainText(lastUserMessage);
      if (q) ragContextContextChunk = await searchLocalDataset(q);
    }

    const enrichedSystemPrompt = ragContextContextChunk
      ? `${baseSystemPrompt}\n\nÖNEMLİ EK BİLGİ / KURUMSAL BAĞLAM:\nAşağıdaki bilgiler okulun veri tabanından getirilmiştir. Eğer soru bunlarla ilgiliyse, öncelikle aşağıdaki bilgileri baz alarak cevap ver:\n\n${ragContextContextChunk}`
      : baseSystemPrompt;

    if (chatProvider === "deepseek") {
      if (!deepseekApiKey?.trim()) {
        return new Response(
          JSON.stringify({
            error: "Deepseek için DEEPSEEK_API_KEY tanımlı değil.",
          }),
          { status: 500 },
        );
      }

      const modelMessages = await convertToModelMessages(messages as UIMessage[], {
        ignoreIncompleteToolCalls: true,
      });

      const result = streamText({
        model: deepseekOpenAI.chat(deepseekModelId),
        system: enrichedSystemPrompt,
        messages: modelMessages,
      });

      return result.toUIMessageStreamResponse();
    }

    if (!googleApiKey?.trim()) {
      return new Response(
        JSON.stringify({
          error: "Gemini için GOOGLE_GENERATIVE_AI_API_KEY tanımlı değil.",
        }),
        { status: 500 },
      );
    }

    const model = genAI.getGenerativeModel({
      model: geminiModelId,
      systemInstruction: enrichedSystemPrompt,
    });

    const googleMessages = messages
      .filter((m: { role?: string }) => m.role !== "system")
      .map((m: { role?: string; content?: unknown; parts?: { type?: string; text?: string }[] }) =>
        uiMessageToGeminiText(m),
      );

    const result = await model.generateContentStream({
      contents: googleMessages,
    });

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const textId = generateId();
        writer.write({ type: "start" });
        writer.write({ type: "text-start", id: textId });
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              writer.write({ type: "text-delta", id: textId, delta: chunkText });
            }
          }
        } catch (err) {
          console.error("Stream parse error:", err);
          writer.write({
            type: "error",
            errorText: err instanceof Error ? err.message : String(err),
          });
        }
        writer.write({ type: "text-end", id: textId });
        writer.write({ type: "finish", finishReason: "stop" });
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Ulu.ai API Hatası:", error);
    return new Response(
      JSON.stringify({
        error: "Sunucuya ulaşılamadı. Hav?",
        detail: err?.message || String(error),
      }),
      { status: 500 },
    );
  }
}
