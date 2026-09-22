import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// 1. Ambil semua API Key yang tersedia dari environment variables
const apiKeys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter(Boolean) as string[];

// Fungsi untuk memilih API Key secara acak
function getRandomApiKey(): string {
  if (apiKeys.length === 0) {
    throw new Error("Tidak ada GEMINI_API_KEY yang terkonfigurasi di Environment Variables.");
  }
  const randomIndex = Math.floor(Math.random() * apiKeys.length);
  return apiKeys[randomIndex];
}

// 2. Fungsi eksekusi AI dengan rotasi API Key & Retry Mechanism
async function generateContentWithRotationAndRetry(prompt: string, maxRetries = 3) {
  let delay = 1000; // Mulai jeda 1 detik

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Pilih API Key acak untuk setiap percobaan
      const selectedApiKey = getRandomApiKey();
      const ai = new GoogleGenAI({ apiKey: selectedApiKey });

      console.log(`[Ngelantur AI] Menjalankan permintaan dengan API Key acak (Percobaan ke-${attempt + 1})`);

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      return response;
    } catch (error: any) {
      const isRateLimited = error?.status === 429 || error?.message?.includes("429");
      const isUnavailable = error?.status === 503 || error?.message?.includes("503");

      // Jika terkena Limit (429) atau Server Sibuk (503), coba ulang dengan API Key acak lainnya
      if ((isRateLimited || isUnavailable) && attempt < maxRetries - 1) {
        console.warn(
          `[Ngelantur AI] API Key terkena limit/sibuk (Status: ${error?.status || 'Unknown'}). Mencoba ulang dalam ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Gandakan jeda waktu (1s -> 2s -> 4s)
      } else {
        throw error;
      }
    }
  }
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
  "red_flag": "Roasting ringan atau sisi negatif dari pilihan film meeka.",
  "recommended_genre": "Rekomendasi genre film lain yang cocok untuk mereka."
}
Gunakan bahasa Indonesia yang santai, ala anak muda, dan seru khas Ngelantur AI.
`;

    const response = await generateContentWithRotationAndRetry(prompt);
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
        { error: "Semua API Key sedang mencapai kuota limit harian/menit. Silakan coba beberapa saat lagi." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan saat Ngelantur AI menganalisis kepribadian." },
      { status: 500 }
    );
  }
}