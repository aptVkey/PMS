"use client";

import { useEffect, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import { MAP_NAME_TO_NATIONALITY } from "@/lib/geo";

const WIDTH = 800;
const HEIGHT = 420;

type CountryProperties = { name: string };

type Hovered = { name: string; count: number; x: number; y: number };

export function WorldMap({
  counts,
}: {
  // Nome do país (em inglês, ver lib/geo.ts) -> número de reservas.
  counts: Record<string, number>;
}) {
  const [countries, setCountries] = useState<FeatureCollection<
    Geometry,
    CountryProperties
  > | null>(null);
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/world-110m.json")
      .then((res) => res.json())
      .then((topology: Topology) => {
        if (cancelled) return;
        const geojson = feature(
          topology,
          topology.objects.countries as GeometryCollection<CountryProperties>,
        ) as unknown as FeatureCollection<Geometry, CountryProperties>;
        setCountries(geojson);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!countries) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-border bg-canvas text-body text-ink-subdued"
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
      >
        A carregar mapa...
      </div>
    );
  }

  const maxCount = Math.max(1, ...Object.values(counts));
  const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], countries);
  const path = geoPath(projection);

  function handleHover(
    e: React.MouseEvent<SVGPathElement>,
    mapName: string,
    count: number,
  ) {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHovered({
      name: MAP_NAME_TO_NATIONALITY[mapName] ?? mapName,
      count,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="overflow-hidden rounded-lg border border-border bg-canvas p-2">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
          {countries.features.map((geo, i) => {
            const count = counts[geo.properties.name] ?? 0;
            const opacity = count > 0 ? 0.25 + 0.75 * (count / maxCount) : 0;
            return (
              <path
                key={geo.id ?? i}
                d={path(geo) ?? undefined}
                onMouseMove={(e) => handleHover(e, geo.properties.name, count)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  fill:
                    count > 0
                      ? "var(--color-action)"
                      : "var(--color-surface-1)",
                  fillOpacity: count > 0 ? opacity : 1,
                  stroke: "var(--color-border)",
                  strokeWidth: 0.5,
                }}
              />
            );
          })}
        </svg>
      </div>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border border-border bg-canvas px-2.5 py-1.5 text-[12px] font-semibold text-ink shadow-popover"
          style={{ left: hovered.x + 14, top: hovered.y + 14 }}
        >
          {hovered.name}
          <span className="ml-1.5 font-normal text-ink-muted">
            · {hovered.count} {hovered.count === 1 ? "reserva" : "reservas"}
          </span>
        </div>
      )}
    </div>
  );
}
