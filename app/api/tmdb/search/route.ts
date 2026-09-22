import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "TMDB API Key belum dikonfigurasi di .env.local" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=id-ID&query=${encodeURIComponent(query)}&page=1`
    );

    if (!res.ok) {
      throw new Error("Gagal mengambil data dari TMDB");
    }

    const data = await res.json();
    return NextResponse.json({ results: data.results || [] });
  } catch (error) {
    console.error("TMDB Search Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mencari film." },
      { status: 500 }
    );
  }
}