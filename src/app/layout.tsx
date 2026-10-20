import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { KonamiCode } from "@/components/KonamiCode";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Docker Playground",
  description: "Apprends les commandes Docker par la pratique : cours, terminal simulé, exercices et quiz.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 sm:py-14">{children}</main>
        <footer className="border-t border-ink-800">
          <div className="mx-auto flex max-w-7xl justify-between px-6 py-6 text-xs text-ink-500">
            <span>Docker Playground est conçe par PEREZ Alexandre-Philippe, le meilleur dev</span>
            <span>Environnement simulé — aucune commande n&apos;est exécutée sur ta machine.</span>
          </div>
          <KonamiCode />
        </footer>
      </body>
    </html>
  );
}
