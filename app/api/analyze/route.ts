import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// 1. Ambil semua API Key yang tersedia
const apiKeys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter(Boolean) as string[];

// 2. Fungsi Eksekusi Bergantian (Round-Robin)
async function generateContent(prompt: string) {
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

// 3. Handler Utama API POST
export async function POST(request: Request) {
  try {
    const { movies } = await request.json();

    if (!movies || !Array.isArray(movies) || movies.length === 0) {
      return NextResponse.json(
        { error: "Pilih minimal satu film." },
        { status: 400 }
      );
    }

    const movieListStr = movies.map((m: any) => `- ${m.title}`).join("\n");

    const prompt = `
Kamu adalah Ngelantur AI, seorang ahli psikologi film dan pop culture yang santai, cerdas, sedikit humoris, dan suka ngobrol/ngelantur tapi tetap akurat.

Berikut adalah daftar film favorit pengguna:
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

    const response = await generateContent(prompt);
    const textResult = response?.text;

    if (!textResult) {
      throw new Error("Gagal menerima respons dari Ngelantur AI.");
    }

    const analysisData = JSON.parse(textResult);

    return NextResponse.json({ analysis: analysisData });
  } catch (error: any) {
    console.error("Error pada Handler Ngelantur AI:", error);

    if (error?.status === 429 || error?.message?.includes("429")) {
      return NextResponse.json(
        { error: "Semua API Key sedang mencapai kuota limit. Silakan coba 1 menit lagi." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan saat Ngelantur AI menganalisis kepribadian." },
      { status: 500 }
    );
  }
}