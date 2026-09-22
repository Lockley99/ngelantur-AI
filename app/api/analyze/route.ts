import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const apiKeys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter(Boolean) as string[];

async function generateContentWithRotationAndRetry(prompt: string) {
  if (apiKeys.length === 0) {
    throw new Error("Tidak ada GEMINI_API_KEY yang terkonfigurasi di Environment Variables.");
  }

  let lastError: any = null;
  let delay = 1000;

  // Mencoba setiap API Key satu per satu secara berurutan
  for (let i = 0; i < apiKeys.length; i++) {
    const selectedApiKey = apiKeys[i];
    const ai = new GoogleGenAI({ apiKey: selectedApiKey });

    try {
      console.log(`[Ngelantur AI] Menjalankan permintaan dengan API Key #${i + 1}`);

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash", // Menggunakan model resmi dengan kuota normal
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      return response; // Berhasil! Kembalikan hasil
    } catch (error: any) {
      lastError = error;
      const isRateLimited = error?.status === 429 || error?.message?.includes("429");
      const isUnavailable = error?.status === 503 || error?.message?.includes("503");

      if (isRateLimited || isUnavailable) {
        console.warn(
          `[Ngelantur AI] API Key #${i + 1} terkena limit/sibuk (${error?.status || 429}). Berpindah ke API Key berikutnya...`
        );
        // Jeda sebentar sebelum berpindah ke key berikutnya
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // Jika error bukan karena limit (misal kesalahan prompt/format), lempar error langsung
        throw error;
      }
    }
  }

  // Jika semua API Key habis dan tetap gagal
  throw lastError;
}

export async function POST(request: Request) {
  try {
    const { movies, language = "id" } = await request.json();

    if (!movies || !Array.isArray(movies) || movies.length === 0) {
      return NextResponse.json(
        { error: language === "en" ? "Select at least one movie." : "Pilih minimal satu film." },
        { status: 400 }
      );
    }

    const movieListStr = movies.map((m: any) => `- ${m.title}`).join("\n");

    const isEn = language === "en";

    const prompt = isEn
      ? `
You are "Ngelantur AI", a witty, pop-culture savvy, film-obsessed, and slightly sarcastic AI personality analyzer.
You breakdown people's inner minds based on their favorite movies with clever humor, playful roasts, and sharp cinematic insights.

Selected favorite movies:
${movieListStr}

Analyze the user's personality based on these movies and return a PURE JSON response with this EXACT structure:
{
  "mbti": "MBTI Type (e.g. INTJ, ENFP, etc.)",
  "archetype": "A catchy, cinematic title/archetype (e.g. 'The Existential Daydreamer')",
  "summary": "A witty, fun, and insightful breakdown of their personality based on movie themes.",
  "green_flag": "Their best personality trait or social strength.",
  "red_flag": "A playful, lighthearted roast or cinematic red flag based on their choices.",
  "recommended_genre": "Movie genre recommendation that fits their vibe."
}
Maintain a casual, fun, witty, and engaging tone in English. Avoid boring or generic academic tone.
`
      : `
Kamu adalah "Ngelantur AI", seorang ahli psikologi film dan pop culture yang santai, cerdas, humoris, dan suka ngobrol/ngelantur tapi tetap akurat.

Daftar film favorit pengguna:
${movieListStr}

Berdasarkan pilihan film tersebut, buatlah analisis kepribadian dalam format JSON murni dengan struktur berikut:
{
  "mbti": "Tipe MBTI (contoh: INTJ, ENFP, dll)",
  "archetype": "Gelar unik persona sinematik (contoh: Sang Pemimpi Filosofis)",
  "summary": "Penjelasan ringkas kepribadian mereka berdasarkan tema film.",
  "green_flag": "Sisi positif atau kelebihan mereka dalam hubungan/sosial.",
  "red_flag": "Roasting ringan atau sisi negatif dari pilihan film mereka.",
  "recommended_genre": "Rekomendasi genre film lain yang cocok untuk mereka."
}
Gunakan bahasa Indonesia yang santai, ala anak muda, dan seru khas Ngelantur AI.
`;

    const response = await generateContentWithRotationAndRetry(prompt);
    const textResult = response?.text;

    if (!textResult) {
      throw new Error("Gagal menerima respons.");
    }

    const analysisData = JSON.parse(textResult);

    return NextResponse.json({ analysis: analysisData });
  } catch (error: any) {
    console.error("Error pada Handler Ngelantur AI:", error);

    return NextResponse.json(
      { error: "Server AI sedang sibuk/limit. Silakan coba beberapa saat lagi." },
      { status: 429 }
    );
  }
}