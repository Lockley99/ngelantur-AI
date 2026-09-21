"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Clapperboard, 
  Sparkles, 
  Search, 
  Trash2, 
  Film, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  Compass,
  Star,
  Plus
} from "lucide-react";

export interface Movie {
  id: number;
  title: string;
  poster_path?: string;
  release_date?: string;
  vote_average?: number;
}

export interface AnalysisData {
  mbti: string;
  archetype: string;
  summary: string;
  green_flag: string;
  red_flag: string;
  recommended_genre: string;
}

export default function MovieAnalyzer() {
  const [isMounted, setIsMounted] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Pastikan komponen sudah terpasang di Client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Debounce Search ke API TMDB
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          setSearchResults(data.results || []);
          setShowDropdown(true);
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sembunyikan dropdown jika klik di luar area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectMovie = (movie: Movie) => {
    if (selectedMovies.some((m) => m.id === movie.id)) {
      setError("Film ini sudah ada di daftar pilihanmu!");
      return;
    }

    if (selectedMovies.length >= 5) {
      setError("Maksimal 5 film favorit saja ya!");
      return;
    }

    setSelectedMovies((prev) => [...prev, movie]);
    setSearchQuery("");
    setShowDropdown(false);
    setError(null);
  };

  const handleRemoveMovie = (id: number) => {
    setSelectedMovies((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAnalyze = async () => {
    if (selectedMovies.length === 0) {
      setError("Pilih minimal 1 film favoritmu!");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movies: selectedMovies }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menganalisis");

      setAnalysis(data.analysis);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <HeaderSection />

      {/* Box Input & Pilihan Film */}
      <section className="bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Input Auto-complete */}
        <div className="relative" ref={dropdownRef}>
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
              placeholder="Cari & pilih film (misal: Interstellar, Joker)..."
              className="w-full pl-11 pr-10 py-3.5 bg-slate-900/90 rounded-2xl border border-slate-700 text-slate-100 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all placeholder:text-slate-500"
            />
            {isSearching && (
              <Loader2 className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
            )}
          </div>

          {/* Menu Dropdown Hasil Pencarian TMDB */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl max-h-80 overflow-y-auto z-50 divide-y divide-slate-800/80">
              {searchResults.map((movie) => {
                const year = movie.release_date ? movie.release_date.split("-")[0] : null;
                const posterUrl = movie.poster_path
                  ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
                  : null;

                return (
                  <button
                    key={movie.id}
                    onClick={() => handleSelectMovie(movie)}
                    className="w-full text-left p-3 hover:bg-slate-800/90 transition-colors flex items-center gap-3.5 group"
                  >
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={movie.title}
                        className="w-10 h-14 object-cover rounded-lg bg-slate-800 shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-14 bg-slate-800 rounded-lg flex items-center justify-center shrink-0 text-slate-500">
                        <Film className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-200 group-hover:text-indigo-400 truncate">
                        {movie.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        {year && <span>{year}</span>}
                        {movie.vote_average !== undefined && (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Star className="w-3 h-3 fill-amber-400" />
                            {movie.vote_average.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 shrink-0 mr-2" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Grid Kartu Pilihan Film */}
        <SelectedMoviesGrid 
          movies={selectedMovies} 
          onRemove={handleRemoveMovie} 
          onClear={() => setSelectedMovies([])} 
        />

        {/* --- Tombol Eksekusi Analisis (Dua Jalur untuk Memutus Mismatch) --- */}
        {!isMounted ? (
          /* Tampilan Statis untuk Server Rendering / Hydration Awal */
          <button
            disabled={true}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold text-sm sm:text-base rounded-2xl opacity-40 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>Analisis Vibe Film Gue</span>
          </button>
        ) : (
          /* Tampilan Dinamis Setelah Terpasang di Client */
          <button
            onClick={handleAnalyze}
            disabled={isLoading || selectedMovies.length === 0}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Menganalisis Kepribadian...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Analisis Vibe Film Gue</span>
              </>
            )}
          </button>
        )}
      </section>

      {/* Hasil Analisis AI */}
      {analysis && <AnalysisResults data={analysis} />}
    </div>
  );
}

// --- Sub-komponen Tampilan ---

function SelectedMoviesGrid({ 
  movies, 
  onRemove, 
  onClear 
}: { 
  movies: Movie[]; 
  onRemove: (id: number) => void; 
  onClear: () => void; 
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
        <span>Film Pilihanmu ({movies.length}/5)</span>
        {movies.length > 0 && (
          <button onClick={onClear} className="text-rose-400 hover:text-rose-300 hover:underline">
            Hapus Semua
          </button>
        )}
      </div>

      {movies.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-700/80 rounded-2xl text-slate-500 text-xs sm:text-sm">
          Belum ada film yang dipilih. Ketik nama film di kolom pencarian di atas!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {movies.map((movie) => {
            const year = movie.release_date ? movie.release_date.split("-")[0] : null;
            const posterUrl = movie.poster_path
              ? `https://image.tmdb.org/t/p/w154${movie.poster_path}`
              : null;

            return (
              <div
                key={movie.id}
                className="flex items-center gap-3.5 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-slate-200 animate-in fade-in zoom-in duration-200 group"
              >
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={movie.title}
                    className="w-12 h-16 object-cover rounded-xl shrink-0 shadow-md bg-slate-800"
                  />
                ) : (
                  <div className="w-12 h-16 bg-slate-800 rounded-xl flex items-center justify-center shrink-0 text-slate-500">
                    <Film className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate text-white">
                    {movie.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    {year && <span>{year}</span>}
                    {movie.vote_average !== undefined && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {movie.vote_average.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(movie.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-all"
                  title="Hapus film"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HeaderSection() {
  return (
    <header className="text-center space-y-3">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-xs sm:text-sm font-semibold shadow-inner">
        <Clapperboard className="w-4 h-4 text-indigo-400" />
        <span>AI Film Personality Detector</span>
      </div>
      <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
        Bedah Kepribadian Lewat{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
          Film Favorit
        </span>
      </h1>
      <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
        Pilih hingga 5 film favoritmu dari TMDB, lalu biarkan AI membongkar MBTI, Red Flag, hingga Green Flag kamu.
      </p>
    </header>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
      <span>{message}</span>
    </div>
  );
}

function AnalysisResults({ data }: { data: AnalysisData }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-700 p-6 sm:p-8 text-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white backdrop-blur-md border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Persona Sinematik
          </span>
          <span className="text-xs font-mono font-bold tracking-wider bg-slate-900 text-indigo-300 px-3 py-1 rounded-full shadow-md border border-indigo-500/30">
            {data.mbti}
          </span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight tracking-tight">
          "{data.archetype}"
        </h2>
      </div>

      <div className="rounded-3xl bg-slate-800/90 border border-slate-700/80 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-2.5 mb-4 text-indigo-400 font-bold text-base sm:text-lg border-b border-slate-700/60 pb-3">
          <Clapperboard className="w-5 h-5" />
          <h3>Bedah Kepribadian</h3>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm sm:text-base whitespace-pre-line">
          {data.summary}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TraitCard
          type="red"
          title="Red Flag / Roasting"
          icon={<AlertTriangle className="w-5 h-5 shrink-0" />}
          content={data.red_flag}
        />
        <TraitCard
          type="green"
          title="Green Flag / Kelebihan"
          icon={<CheckCircle2 className="w-5 h-5 shrink-0" />}
          content={data.green_flag}
        />
      </div>

      <div className="rounded-3xl bg-slate-800/90 border border-slate-700/80 p-5 sm:p-6 flex items-center gap-4 shadow-xl">
        <div className="p-3 bg-indigo-950/80 border border-indigo-800/50 rounded-2xl text-indigo-400 shrink-0">
          <Compass className="w-6 h-6" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Rekomendasi Genre Film
          </span>
          <h4 className="text-base sm:text-lg font-bold text-white mt-0.5">
            {data.recommended_genre}
          </h4>
        </div>
      </div>
    </div>
  );
}

function TraitCard({
  type,
  title,
  icon,
  content,
}: {
  type: "red" | "green";
  title: string;
  icon: React.ReactNode;
  content: string;
}) {
  const isRed = type === "red";

  return (
    <div
      className={`rounded-3xl p-6 shadow-xl border ${
        isRed
          ? "bg-rose-950/30 border-rose-900/50"
          : "bg-emerald-950/30 border-emerald-900/50"
      }`}
    >
      <div
        className={`flex items-center gap-2 font-bold text-base sm:text-lg mb-3 ${
          isRed ? "text-rose-400" : "text-emerald-400"
        }`}
      >
        {icon}
        <h4>{title}</h4>
      </div>
      <p
        className={`text-sm leading-relaxed ${
          isRed ? "text-rose-200/90" : "text-emerald-200/90"
        }`}
      >
        {content}
      </p>
    </div>
  );
}