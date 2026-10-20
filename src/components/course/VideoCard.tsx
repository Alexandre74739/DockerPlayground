"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import type { Video } from "@/lib/types";

/**
 * Vidéo YouTube chargée seulement au clic (miniature d'abord) :
 * page plus légère et aucun cookie YouTube avant lecture.
 */
export function VideoCard({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);

  return (
    <figure className="group">
      <div className="relative aspect-video overflow-hidden rounded-lg border border-ink-800 bg-ink-950">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="absolute inset-0" aria-label={`Lire la vidéo : ${video.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- miniature externe, sans optimisation nécessaire */}
            <img
              src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover opacity-80 grayscale-[35%] transition duration-300 group-hover:opacity-100 group-hover:grayscale-0"
            />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-ink-950/80 text-ink-100 backdrop-blur transition group-hover:bg-neon-400 group-hover:text-ink-950">
                <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
              </span>
            </span>
            <span className="absolute bottom-2 right-2 rounded bg-ink-950/85 px-1.5 py-0.5 font-mono text-[11px] text-ink-200">
              {video.duration}
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-3">
        <a
          href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium leading-snug text-ink-100 hover:underline hover:decoration-ink-500 hover:underline-offset-[3px]"
        >
          {video.title}
        </a>
        <p className="mt-1 text-xs text-ink-500">
          {video.author} · {video.lang === "fr" ? "Français" : "Anglais"}
        </p>
      </figcaption>
    </figure>
  );
}
