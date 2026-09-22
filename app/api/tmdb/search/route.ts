import { NextResponse } from "next/server";

// Nama fungsi WAJIB kapital: GET (menyesuaikan konvensi Next.js App Router)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    // Jika parameter query kosong, kembalikan array kosong
    if (!query || query.trim() === "") {
      return NextResponse.json({ results: [] });
    }

    const tmdbApiKey = process.env.TMDB_API_KEY;

    // Pengecekan ketersediaan API Key TMDB
    if (!tmdbApiKey) {
      console.error("[TMDB API] Error: TMDB_API_KEY belum terpasang di .env!");
      return NextResponse.json(
        { error: "TMDB API Key belum terkonfigurasi pada server.", results: [] },
        { status: 500 }
      );
    }

    // Tembak API TMDB
    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(
        query
      )}&include_adult=false&language=id-ID&page=1`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        // Mencegah caching bermasalah di Next.js App Router
        cache: "no-store",
      }
    );

    if (!tmdbRes.ok) {
      console.error(`[TMDB API] Error Response Status: ${tmdbRes.status}`);
      return NextResponse.json(
        { error: "Gagal mengambil data dari TMDB.", results: [] },
        { status: tmdbRes.status }
      );
    }

    const data = await tmdbRes.json();

    return NextResponse.json({
      results: data.results || [],
    });
  } catch (error: any) {
    console.error("[TMDB API] Server Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal pada server.", results: [] },
      { status: 500 }
    );
  }
}