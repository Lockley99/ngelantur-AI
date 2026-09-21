import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ngelantur AI - Bedah Kepribadian Lewat Film Favorit",
  description: "Bongkar MBTI, Red Flag, hingga Green Flag kamu berdasarkan pilihan film favorit menggunakan Ngelantur AI.",
  icons: {
    icon: "/public/ngelantur.jpg", // Letakkan berkas favicon.ico di folder public/ atau app/
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}