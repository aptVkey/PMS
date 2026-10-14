"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { PROPERTY_TYPE_LABELS, type Property } from "@/lib/property";
import { PropertyNameForm } from "../property-name-form";
import { PropertyDescriptionForm } from "../property-description-form";
import { PropertyTimesForm } from "../property-times-form";
import { ConfirmDeletePropertyModal } from "../confirm-delete-property-modal";

const TABS = [
  { slug: "rates", label: "Rates" },
  { slug: "tipologias", label: "Tipologias" },
  { slug: "calendario", label: "Calendário" },
  { slug: "reservas", label: "Reservas" },
  { slug: "estatisticas", label: "Estatísticas" },
  { slug: "canais", label: "Canais" },
  { slug: "legal", label: "Legal" },
] as const;

export function WorkspaceChrome({ property }: { property: Property }) {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState(property.name);
  const [description, setDescription] = useState(property.description);
  const [times, setTimes] = useState({
    checkIn: property.check_in_time ?? "15:00:00",
    checkOut: property.check_out_time ?? "11:00:00",
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const base = `/alojamentos/${property.id}`;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/alojamentos"
        className="flex w-fit items-center gap-1.5 text-body font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Voltar aos alojamentos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PropertyNameForm
            propertyId={property.id}
            name={name}
            onSaved={setName}
          />
          <p className="mt-1 text-body text-ink-muted">
            {PROPERTY_TYPE_LABELS[property.property_type]}
          </p>
          <div className="mt-2">
            <PropertyDescriptionForm
              propertyId={property.id}
              description={description}
              onSaved={setDescription}
            />
          </div>
          <div className="mt-2">
            <PropertyTimesForm
              propertyId={property.id}
              checkInTime={times.checkIn}
              checkOutTime={times.checkOut}
              onSaved={setTimes}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDeleteModalOpen(true)}
          className="flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 text-body font-semibold text-error transition-colors duration-fast ease-standard hover:bg-error/5"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
          Eliminar
        </button>
      </div>

      <nav
        aria-label="Secções do alojamento"
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {TABS.map((tab) => {
          const href = `${base}/${tab.slug}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={tab.slug}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-body font-semibold transition-colors duration-fast ease-standard ${
                active
                  ? "border-action text-action"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {deleteModalOpen && (
        <ConfirmDeletePropertyModal
          property={{ ...property, name }}
          onClose={() => setDeleteModalOpen(false)}
          onDeleted={() => router.push("/alojamentos")}
        />
      )}
    </div>
  );
}
