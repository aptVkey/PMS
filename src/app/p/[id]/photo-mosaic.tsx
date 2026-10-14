"use client";

import { useState } from "react";
import Image from "next/image";
import { Grid3x3, X } from "lucide-react";

// Mosaico 1+4 como nos sites de listing: a primeira foto ocupa metade e as
// quatro seguintes preenchem a outra metade. Com menos de cinco fotos degrada
// para uma única imagem larga, senão ficariam buracos na grelha.
export function PhotoMosaic({
  photos,
  alt,
}: {
  photos: string[];
  alt: string;
}) {
  const [open, setOpen] = useState(false);

  if (photos.length === 0) return null;

  const mosaic = photos.slice(0, 5);
  const hasFullMosaic = mosaic.length === 5;

  return (
    <>
      <div className="relative">
        {hasFullMosaic ? (
          <div className="grid h-[320px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-lg md:h-[420px]">
            {mosaic.map((photo, i) => (
              <button
                key={photo}
                type="button"
                onClick={() => setOpen(true)}
                aria-label={`Ver fotografia ${i + 1} de ${photos.length}`}
                className={`relative overflow-hidden transition-opacity duration-fast ease-standard hover:opacity-90 ${
                  i === 0 ? "col-span-2 row-span-2" : ""
                }`}
              >
                <Image
                  src={photo}
                  alt={alt}
                  fill
                  priority={i === 0}
                  sizes={i === 0 ? "(max-width: 768px) 100vw, 560px" : "280px"}
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative block h-[320px] w-full overflow-hidden rounded-lg md:h-[420px]"
          >
            <Image
              src={mosaic[0]}
              alt={alt}
              fill
              priority
              sizes="(max-width: 1120px) 100vw, 1120px"
              className="object-cover"
            />
          </button>
        )}

        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute bottom-4 right-4 flex min-h-9 items-center gap-2 rounded-md border border-ink bg-canvas px-3 text-[13px] font-semibold text-ink shadow-card transition-colors duration-fast ease-standard hover:bg-surface-1"
          >
            <Grid3x3 className="h-3.5 w-3.5" strokeWidth={2} />
            Mostrar todas as fotos
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-canvas">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-canvas px-6 py-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar galeria"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-surface-1"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            <span className="text-[13px] text-ink-muted">
              {photos.length}{" "}
              {photos.length === 1 ? "fotografia" : "fotografias"}
            </span>
          </div>

          <div className="mx-auto flex max-w-3xl flex-col gap-3 px-6 py-8">
            {photos.map((photo) => (
              <div
                key={photo}
                className="relative aspect-[4/3] w-full overflow-hidden rounded-lg"
              >
                <Image
                  src={photo}
                  alt={alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
