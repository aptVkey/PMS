"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";
import { saveRoom, type RoomFormState } from "./actions";
import {
  AMENITIES,
  ROOM_TYPES,
  ROOM_TYPE_LABELS,
  type BathroomConfig,
  type BedroomConfig,
  type Room,
} from "@/lib/rooms";
import { BedroomsEditor } from "./bedrooms-editor";
import { BathroomsEditor } from "./bathrooms-editor";
import type { RoomTypology } from "@/lib/room-typologies";

const initialState: RoomFormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

type PhotoPreview = { url: string; file?: File };

const defaultBedrooms: BedroomConfig[] = [
  { beds: [{ type: "casal", count: 1 }] },
];
const defaultBathrooms: BathroomConfig[] = [{ ensuiteBedroomIndex: null }];

export function RoomFormModal({
  room,
  propertyId,
  typologies,
  defaultTypologyId,
  defaultName,
  entityLabel = "quarto",
  onClose,
}: {
  room?: Room;
  propertyId: string;
  typologies?: RoomTypology[];
  defaultTypologyId?: string;
  defaultName?: string;
  entityLabel?: "quarto" | "alojamento";
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    saveRoom,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const managedByTypology = typologies !== undefined;
  const [previews, setPreviews] = useState<PhotoPreview[]>(
    () => room?.photos.map((url) => ({ url })) ?? [],
  );
  const [bedrooms, setBedrooms] = useState<BedroomConfig[]>(
    () => room?.bedrooms ?? defaultBedrooms,
  );
  const [bathrooms, setBathrooms] = useState<BathroomConfig[]>(
    () => room?.bathrooms ?? defaultBathrooms,
  );
  const dragIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (state && "success" in state) {
      onClose();
    }
  }, [state, onClose]);

  useEffect(() => {
    return () => {
      previews.forEach((p) => {
        if (p.file) URL.revokeObjectURL(p.url);
      });
    };
  }, [previews]);

  function handleBedroomsChange(next: BedroomConfig[]) {
    setBedrooms(next);
    setBathrooms((prev) =>
      prev.map((b) =>
        b.ensuiteBedroomIndex !== null && b.ensuiteBedroomIndex >= next.length
          ? { ensuiteBedroomIndex: null }
          : b,
      ),
    );
  }

  function syncFileInput(items: PhotoPreview[]) {
    if (!fileInputRef.current) return;
    const dataTransfer = new DataTransfer();
    items.forEach((item) => {
      if (item.file) dataTransfer.items.add(item.file);
    });
    fileInputRef.current.files = dataTransfer.files;
  }

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const newItems = Array.from(fileList).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    const next = [...previews, ...newItems];
    setPreviews(next);
    syncFileInput(next);
  }

  function removePreview(index: number) {
    const removed = previews[index];
    if (removed.file) URL.revokeObjectURL(removed.url);
    const next = previews.filter((_, i) => i !== index);
    setPreviews(next);
    syncFileInput(next);
  }

  function reorderPreviews(from: number, to: number) {
    if (from === to) return;
    const next = [...previews];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setPreviews(next);
    syncFileInput(next);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-canvas shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">
            {room ? `Editar ${entityLabel}` : `Adicionar ${entityLabel}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-ink-subdued hover:bg-surface-1"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <form
          ref={formRef}
          action={formAction}
          className="flex flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          {room && <input type="hidden" name="id" value={room.id} />}
          <input type="hidden" name="propertyId" value={propertyId} />
          <input
            type="hidden"
            name="bedroomsJson"
            value={JSON.stringify(bedrooms)}
          />
          <input
            type="hidden"
            name="bathroomsJson"
            value={JSON.stringify(bathrooms)}
          />
          {previews
            .filter((p) => !p.file)
            .map((p) => (
              <input
                key={p.url}
                type="hidden"
                name="existingPhotoUrls"
                value={p.url}
              />
            ))}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className={labelClasses}>
              Nome do {entityLabel}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={room?.name ?? defaultName ?? ""}
              placeholder={
                entityLabel === "alojamento"
                  ? "Ex: Apartamento com Varanda"
                  : "Ex: Quarto Duplo com Varanda"
              }
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="type" className={labelClasses}>
              Tipo
            </label>
            <select
              id="type"
              name="type"
              defaultValue={room?.type ?? ROOM_TYPES[0]}
              className={inputClasses}
            >
              {ROOM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ROOM_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          {managedByTypology && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="typologyId" className={labelClasses}>
                Tipologia
              </label>
              {typologies.length === 0 ? (
                <p className="text-body text-ink-subdued">
                  Ainda não tens tipologias. Cria uma primeiro.
                </p>
              ) : (
                <select
                  id="typologyId"
                  name="typologyId"
                  required
                  defaultValue={room?.typology_id ?? defaultTypologyId ?? ""}
                  className={inputClasses}
                >
                  <option value="" disabled>
                    Selecionar...
                  </option>
                  {typologies.map((typology) => (
                    <option key={typology.id} value={typology.id}>
                      {typology.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className={labelClasses}>
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={room?.description ?? ""}
              placeholder={`Descreve o ${entityLabel} para os hóspedes verem no site de reservas.`}
              className={`${inputClasses} min-h-0 py-2`}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className={labelClasses}>Capacidade máxima</span>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="capacityAdults" className="text-[12px] text-ink-subdued">
                  Adultos
                </label>
                <input
                  id="capacityAdults"
                  name="capacityAdults"
                  type="number"
                  min={1}
                  required
                  defaultValue={room?.capacity_adults ?? 2}
                  className={inputClasses}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="capacityChildren" className="text-[12px] text-ink-subdued">
                  Crianças
                </label>
                <input
                  id="capacityChildren"
                  name="capacityChildren"
                  type="number"
                  min={0}
                  required
                  defaultValue={room?.capacity_children ?? 0}
                  className={inputClasses}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="capacityInfants" className="text-[12px] text-ink-subdued">
                  Bebés
                </label>
                <input
                  id="capacityInfants"
                  name="capacityInfants"
                  type="number"
                  min={0}
                  required
                  defaultValue={room?.capacity_infants ?? 0}
                  className={inputClasses}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <span className={labelClasses}>Quartos</span>
            <BedroomsEditor value={bedrooms} onChange={handleBedroomsChange} />
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <span className={labelClasses}>Casas de banho</span>
            <BathroomsEditor
              value={bathrooms}
              bedroomCount={bedrooms.length}
              onChange={setBathrooms}
            />
          </div>

          <div className="flex flex-col gap-1.5 border-t border-border pt-4 sm:w-1/2 sm:pr-2">
            <label htmlFor="sizeM2" className={labelClasses}>
              Área (m²) — opcional
            </label>
            <input
              id="sizeM2"
              name="sizeM2"
              type="number"
              min={0}
              defaultValue={room?.size_m2 ?? ""}
              placeholder="Ex: 25"
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className={labelClasses}>Comodidades</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {AMENITIES.map((amenity) => (
                <label
                  key={amenity}
                  className="flex items-center gap-2 text-body text-ink-muted"
                >
                  <input
                    type="checkbox"
                    name="amenities"
                    value={amenity}
                    defaultChecked={room?.amenities.includes(amenity)}
                    className="h-4 w-4 rounded border-border text-action focus:ring-action"
                  />
                  {amenity}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className={labelClasses}>Fotos</span>
            {managedByTypology && (
              <p className="text-[12px] text-ink-subdued">
                Opcional. Se não adicionares fotos próprias, mostramos as
                fotos da tipologia.
              </p>
            )}
            <input
              ref={fileInputRef}
              name="photos"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="text-body text-ink-muted file:mr-3 file:min-h-9 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:text-body file:font-semibold file:text-primary hover:file:bg-surface-1"
            />
            {previews.length > 0 && (
              <>
                <p className="text-[12px] text-ink-subdued">
                  Arrasta para ordenar. A primeira foto é a capa.
                </p>
                <div className="mt-1 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {previews.map((preview, index) => (
                    <div
                      key={preview.url}
                      draggable
                      onDragStart={() => {
                        dragIndexRef.current = index;
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIndexRef.current !== null) {
                          reorderPreviews(dragIndexRef.current, index);
                        }
                        dragIndexRef.current = null;
                      }}
                      onDragEnd={() => {
                        dragIndexRef.current = null;
                      }}
                      className="group relative cursor-move"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- blob/remote preview URL, next/image can't optimize these */}
                      <img
                        src={preview.url}
                        alt=""
                        className="h-20 w-full rounded-md border border-border object-cover"
                      />
                      <div className="absolute left-1 top-1 rounded bg-black/50 p-0.5 text-white">
                        <GripVertical className="h-3.5 w-3.5" strokeWidth={2} />
                      </div>
                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-on-primary">
                          Capa
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removePreview(index)}
                        aria-label="Remover foto"
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-on-primary shadow-popover"
                      >
                        <X className="h-3 w-3" strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <label className="flex items-center gap-2 text-body font-semibold text-ink">
            <input
              type="checkbox"
              name="isPublished"
              defaultChecked={room?.is_published}
              className="h-4 w-4 rounded border-border text-action focus:ring-action"
            />
            Publicar no site de reservas
          </label>

          {state && "error" in state && (
            <p aria-live="polite" className="text-body text-error">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending
                ? "A guardar..."
                : room
                  ? "Guardar alterações"
                  : `Guardar ${entityLabel}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
