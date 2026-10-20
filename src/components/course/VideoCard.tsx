"use client";

import { ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import type { Video } from "@/lib/types";

/**
 * Vidéo YouTube chargée seulement au clic (miniature d'abord) :
 * page plus légère et aucun cookie YouTube avant lecture.
 */
export function VideoCard({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);
  const watchUrl = `https://www.youtube.com/watch?v=${video.youtubeId}`;

  return (
    <figure className="overflow-hidden rounded-xl border border-ink-700 bg-ink-850">
      <div className="relative aspect-video bg-ink-950">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0"
            aria-label={`Lire la vidéo : ${video.title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- miniature externe, sans optimisation nécessaire */}
            <img
              src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover opacity-70 transition group-hover:opacity-90"
            />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-neon-400 text-ink-950 shadow-lg transition group-hover:scale-110">
                <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
              </span>
            </span>
            <span className="absolute bottom-2 right-2 rounded bg-ink-950/90 px-1.5 py-0.5 font-mono text-[11px] text-ink-100">
              {video.duration}
            </span>
          </button>
        )}
      </div>
      <figcaption className="flex items-start justify-between gap-3 p-3.5">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug text-ink-100">{video.title}</p>
          <p className="mt-1 font-mono text-xs text-ink-400">
            {video.author} · <span className={video.lang === "fr" ? "text-neon-400" : "text-azure-300"}>{video.lang.toUpperCase()}</span>
          </p>
        </div>
        <a
          href={watchUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-ink-500 hover:text-ink-100"
          aria-label="Ouvrir sur YouTube"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </figcaption>
    </figure>
  );
}
