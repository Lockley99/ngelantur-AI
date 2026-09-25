"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
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

const UI_TEXT = {
  title: "Bedah Kepribadian Bersama",
  subTitle: "Pilih hingga 5 film favoritmu dari TMDB, lalu biarkan Ngelantur AI membongkar MBTI, Red Flag, hingga Green Flag kamu.",
  placeholder: "Cari & pilih film (misal: Interstellar, Joker)...",
  selectedMovies: "Film Pilihanmu",
  clearAll: "Hapus Semua",
  emptyList: "Belum ada film yang dipilih. Ketik nama film di kolom pencarian di atas!",
  btnAnalyzing: "Ngelantur AI Sedang Menganalisis...",
  btnAction: "Ngelantur AI, Bedah Film Gue!",
  errMax: "Maksimal 5 film favorit saja ya!",
  errExist: "Film ini sudah ada di daftar pilihanmu!",
  errEmpty: "Pilih minimal 1 film favoritmu!",
  resultsHeader: "Hasil Bedah Ngelantur AI",
  personaBadge: "Persona Sinematik Ngelantur AI",
  redFlagTitle: "Red Flag",
  greenFlagTitle: "Green Flag",
  recGenre: "Rekomendasi Genre Film",
};

export default function MovieAnalyzer() {
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

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
          
          if (data.results && data.results.length > 0) {
            setSearchResults(data.results);
            setShowDropdown(true);
          } else {
            setSearchResults([]);
            setShowDropdown(false);
          }
        } catch (err) {
          console.error("Gagal melakukan pencarian:", err);
          setSearchResults([]);
          setShowDropdown(false);
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

  // Sembunyikan dropdown saat klik di luar area input
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectMovie = useCallback((movie: Movie) => {
    if (selectedMovies.some((m) => m.id === movie.id)) {
      setError(UI_TEXT.errExist);
      return;
    }

    if (selectedMovies.length >= 5) {
      setError(UI_TEXT.errMax);
      return;
    }

    setSelectedMovies((prev) => [...prev, movie]);
    setSearchQuery("");
    setShowDropdown(false);
    setError(null);
  }, [selectedMovies]);

  const handleRemoveMovie = useCallback((id: number) => {
    setSelectedMovies((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleClearMovies = useCallback(() => {
    setSelectedMovies([]);
    setError(null);
  }, []);

  const handleAnalyze = async () => {
    if (selectedMovies.length === 0) {
      setError(UI_TEXT.errEmpty);
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
      if (!res.ok) throw new Error(data.error || "Gagal melakukan analisis.");

      setAnalysis(data.analysis);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative">
      <HeaderSection />

      {/* Form Input & List Film */}
      <section className="bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        <div className="relative" ref={dropdownRef}>
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && searchResults.length > 0 && setShowDropdown(true)}
              placeholder={UI_TEXT.placeholder}
              className="w-full pl-11 pr-10 py-3.5 bg-slate-900/90 rounded-2xl border border-slate-700 text-slate-100 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all placeholder:text-slate-500"
            />
            {isSearching && (
              <Loader2 className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
            )}
          </div>

          {/* Dropdown Hasil Pencarian TMDB */}
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

        <SelectedMoviesGrid 
          movies={selectedMovies} 
          onRemove={handleRemoveMovie} 
          onClear={handleClearMovies} 
        />

        {/* Tombol Bedah Film */}
        {!isMounted ? (
          <button
            disabled
            className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold text-sm sm:text-base rounded-2xl opacity-40 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>{UI_TEXT.btnAnalyzing}</span>
          </button>
        ) : (
          <button
            onClick={handleAnalyze}
            disabled={isLoading || selectedMovies.length === 0}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{UI_TEXT.btnAnalyzing}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>{UI_TEXT.btnAction}</span>
              </>
            )}
          </button>
        )}
      </section>

      {/* Hasil Analisis */}
      {analysis && <AnalysisResults data={analysis} />}

      {/* Footer */}
      <footer className="pt-6 pb-2 text-center flex justify-center items-center">
        <div className="px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800/80 text-xs text-slate-400 shadow-inner">
          Made by{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 font-bold ml-0.5">
            Sir Ami
          </span>
        </div>
      </footer>
    </div>
  );
}

// --- Sub-Components ---

function HeaderSection() {
  const [imageError, setImageError] = useState(false);

  return (
    <header className="text-center space-y-3">
      {!imageError && (
        <div className="flex justify-center mb-2">
          <Image
            src="/logo.png"
            alt="Logo Ngelantur AI"
            width={80}
            height={80}
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md"
            priority
            onError={() => setImageError(true)}
          />
        </div>
      )}

      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-xs sm:text-sm font-semibold shadow-inner">
        <Clapperboard className="w-4 h-4 text-indigo-400" />
        <span>Ngelantur AI</span>
      </div>
      <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
        {UI_TEXT.title}{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
          Ngelantur AI
        </span>
      </h1>
      <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
        {UI_TEXT.subTitle}
      </p>
    </header>
  );
}

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
        <span>{UI_TEXT.selectedMovies} ({movies.length}/5)</span>
        {movies.length > 0 && (
          <button onClick={onClear} className="text-rose-400 hover:text-rose-300 hover:underline">
            {UI_TEXT.clearAll}
          </button>
        )}
      </div>

      {movies.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-700/80 rounded-2xl text-slate-500 text-xs sm:text-sm">
          {UI_TEXT.emptyList}
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
            {UI_TEXT.personaBadge}
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
          <h3>{UI_TEXT.resultsHeader}</h3>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm sm:text-base whitespace-pre-line">
          {data.summary}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TraitCard
          type="red"
          title={UI_TEXT.redFlagTitle}
          icon={<AlertTriangle className="w-5 h-5 shrink-0" />}
          content={data.red_flag}
        />
        <TraitCard
          type="green"
          title={UI_TEXT.greenFlagTitle}
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
            {UI_TEXT.recGenre}
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