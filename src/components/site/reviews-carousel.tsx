"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { SiteReview } from "@/lib/site-data";

// Reviews em faixa horizontal com scroll-snap; as setas deslizam um cartão.
export function ReviewsCarousel({ reviews }: { reviews: SiteReview[] }) {
  const track = useRef<HTMLUListElement>(null);

  const slide = (direction: 1 | -1) => {
    const node = track.current;
    if (!node) return;
    const card = node.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 24 : 400;
    node.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return (
    <div>
      <ul
        ref={track}
        className="-mx-5 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-px-5 px-5 pb-4 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:-mx-12 lg:scroll-px-12 lg:px-12 [&::-webkit-scrollbar]:hidden"
      >
        {reviews.map((review) => (
          <li
            key={review.id}
            className="flex w-[86%] shrink-0 snap-start flex-col justify-between gap-10 rounded-[6px] border border-canvas/15 bg-canvas/[0.04] p-8 sm:w-[60%] sm:p-10 lg:w-[38%]"
          >
            <div>
              <div className="flex items-center justify-between">
                <span
                  className="text-[15px] tracking-[0.2em] text-highlight"
                  role="img"
                  aria-label={`${review.rating} em 5 estrelas`}
                >
                  {"★".repeat(review.rating)}
                  <span className="text-canvas/20">
                    {"★".repeat(5 - review.rating)}
                  </span>
                </span>
                {review.is_demo && (
                  <span className="site-eyebrow text-canvas/40">Exemplo</span>
                )}
              </div>
              <blockquote className="mt-8 font-serif text-[26px] leading-[1.2] tracking-tight text-canvas sm:text-[30px]">
                “{review.body}”
              </blockquote>
            </div>
            <div className="flex items-center gap-4 border-t border-canvas/15 pt-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas/10 font-serif text-[20px] text-canvas">
                {review.author_name.charAt(0)}
              </span>
              <div>
                <p className="text-[15px] font-medium text-canvas">
                  {review.author_name}
                </p>
                <p className="text-[13px] text-canvas/55">
                  {[review.author_location, review.property_name]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {reviews.length > 1 && (
        <div className="mt-8 flex gap-3">
          {([-1, 1] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => slide(dir)}
              aria-label={dir === -1 ? "Review anterior" : "Review seguinte"}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-canvas/25 text-canvas transition-colors duration-300 hover:bg-canvas hover:text-ink"
            >
              {dir === -1 ? (
                <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
              ) : (
                <ArrowRight className="h-5 w-5" strokeWidth={1.5} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
