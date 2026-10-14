"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, BedDouble } from "lucide-react";
import type { Room } from "@/lib/rooms";
import { convertPropertyToMultiUnit } from "./actions";
import { RoomCard } from "./room-card";
import { RoomFormModal } from "./room-form-modal";
import { TypologyFormModal } from "./typology-form-modal";

export function RoomsGridView({
  propertyId,
  propertyName,
  rooms,
}: {
  propertyId: string;
  propertyName: string;
  rooms: Room[];
}) {
  const router = useRouter();
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [typologyModalOpen, setTypologyModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConverting, startTransition] = useTransition();

  // Enquanto o alojamento não tem sequer a sua unidade, o que falta é criar
  // essa unidade. A partir daí, acrescentar significa acrescentar tipologia —
  // e deixar de ser uma unidade singular.
  const needsFirstRoom = rooms.length === 0;

  function handleTypologySaved() {
    startTransition(async () => {
      const result = await convertPropertyToMultiUnit(propertyId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-ink-muted">
          {needsFirstRoom
            ? "Gere o teu alojamento, tipo e disponibilidade."
            : "Ao adicionares uma segunda tipologia, este alojamento passa a multi unidade."}
        </p>
        <button
          type="button"
          disabled={isConverting}
          onClick={() =>
            needsFirstRoom ? setRoomModalOpen(true) : setTypologyModalOpen(true)
          }
          className="flex min-h-11 items-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          {isConverting
            ? "A converter..."
            : needsFirstRoom
              ? "Adicionar alojamento"
              : "Adicionar nova tipologia"}
        </button>
      </div>

      {error && (
        <p aria-live="polite" className="text-body text-error">
          {error}
        </p>
      )}

      {needsFirstRoom ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <BedDouble className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            Ainda não tens alojamentos
          </p>
          <p className="max-w-sm text-body text-ink-subdued">
            Adiciona o primeiro alojamento para começares a preparar o teu
            inventário.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} entityLabel="alojamento" />
          ))}
        </div>
      )}

      {roomModalOpen && (
        <RoomFormModal
          propertyId={propertyId}
          defaultName={propertyName}
          entityLabel="alojamento"
          onClose={() => setRoomModalOpen(false)}
        />
      )}

      {typologyModalOpen && (
        <TypologyFormModal
          propertyId={propertyId}
          onClose={() => setTypologyModalOpen(false)}
          onSaved={handleTypologySaved}
        />
      )}
    </div>
  );
}
