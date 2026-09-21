import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Fungsi penolong untuk menangani retry saat error 503 / 429
async function generateWithRetry(prompt: string, maxRetries = 3) {
  let delay = 1000; // Mulai dari jeda 1 detik

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash", // Menggunakan nama model resmi
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });
      return response;
    } catch (error: any) {
      const isUnavailable = error?.status === 503 || error?.message?.includes("503");
      const isRateLimited = error?.status === 429 || error?.message?.includes("429");

      if ((isUnavailable || isRateLimited) && i < maxRetries - 1) {
        console.warn(`[Gemini API] Server sibuk. Mencoba ulang ke-${i + 1} dalam ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Perpanjang jeda waktu tunggu (exponential backoff)
      } else {
        throw error;
      }
    }
  }
}

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
Kamu adalah seorang ahli psikologi film dan pop culture yang santai, cerdas, dan sedikit humoris.
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
Gunakan bahasa Indonesia yang santai dan seru.
`;

    const response = await generateWithRetry(prompt);
    const textResult = response?.text;

    if (!textResult) {
      throw new Error("Gagal menerima respons teks dari Gemini.");
    }

    const analysisData = JSON.parse(textResult);

    return NextResponse.json({ analysis: analysisData });
  } catch (error: any) {
    console.error("Error in Gemini /api/analyze:", error);

    if (error?.status === 503 || error?.message?.includes("503")) {
      return NextResponse.json(
        { error: "Server AI sedang sangat padat. Silakan coba klik tombol analisis beberapa saat lagi." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan saat menganalisis kepribadian." },
      { status: 500 }
    );
  }
}