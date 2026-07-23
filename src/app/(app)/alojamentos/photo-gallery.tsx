"use client";

import { useEffect, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, Images, X } from "lucide-react";

export function PhotoGallery({
  photos,
  alt,
}: {
  photos: string[];
  alt: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="flex h-48 w-full flex-col items-center justify-center gap-2 bg-surface-1">
        <Building2 className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
        <p className="text-[12px] text-ink-subdued">
          Ainda não há fotos desta tipologia
        </p>
      </div>
    );
  }

  const visible = photos.slice(0, 5);
  const count = visible.length;

  const rowsClass = count === 2 ? "sm:grid-rows-1" : "sm:grid-rows-2";
  const colsClass =
    count === 1
      ? ""
      : count === 2
        ? "sm:grid-cols-2"
        : count >= 5
          ? "sm:grid-cols-4"
          : "sm:grid-cols-2";
  const heroSpanClass =
    count >= 5
      ? "sm:col-span-2 sm:row-span-2"
      : count === 3
        ? "sm:row-span-2"
        : "";

  return (
    <div className="relative">
      <div
        className={`grid h-56 grid-cols-1 gap-1 sm:h-96 ${rowsClass} ${colsClass}`}
      >
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className={`group relative overflow-hidden ${heroSpanClass}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL */}
          <img
            src={visible[0]}
            alt={alt}
            className="h-full w-full object-cover transition-transform duration-base ease-standard group-hover:scale-105"
          />
        </button>
        {visible.slice(1).map((photo, i) => (
          <button
            key={photo}
            type="button"
            onClick={() => setLightboxIndex(i + 1)}
            className="group relative hidden overflow-hidden sm:block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL */}
            <img
              src={photo}
              alt=""
              className="h-full w-full object-cover transition-transform duration-base ease-standard group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {photos.length > 1 && (
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md bg-canvas px-3 py-1.5 text-[12px] font-semibold text-ink shadow-popover transition-colors duration-fast ease-standard hover:bg-surface-1"
        >
          <Images className="h-3.5 w-3.5" strokeWidth={2} />
          Ver todas as fotos ({photos.length})
        </button>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          alt={alt}
          onChangeIndex={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

function Lightbox({
  photos,
  index,
  alt,
  onChangeIndex,
  onClose,
}: {
  photos: string[];
  index: number;
  alt: string;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") {
        onChangeIndex((index - 1 + photos.length) % photos.length);
      }
      if (event.key === "ArrowRight") {
        onChangeIndex((index + 1) % photos.length);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, photos.length, onChangeIndex, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-md text-white hover:bg-white/10"
      >
        <X className="h-6 w-6" strokeWidth={2} />
      </button>

      {photos.length > 1 && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onChangeIndex((index - 1 + photos.length) % photos.length);
          }}
          aria-label="Foto anterior"
          className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-md text-white hover:bg-white/10 sm:left-4"
        >
          <ChevronLeft className="h-7 w-7" strokeWidth={2} />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL */}
      <img
        src={photos[index]}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
        className="max-h-full max-w-full rounded-md object-contain"
      />

      {photos.length > 1 && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onChangeIndex((index + 1) % photos.length);
          }}
          aria-label="Foto seguinte"
          className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-md text-white hover:bg-white/10 sm:right-4"
        >
          <ChevronRight className="h-7 w-7" strokeWidth={2} />
        </button>
      )}

      {photos.length > 1 && (
        <p className="absolute bottom-4 text-[12px] text-white/70">
          {index + 1} / {photos.length}
        </p>
      )}
    </div>
  );
}
