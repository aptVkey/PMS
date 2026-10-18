"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { GripVertical, RotateCw, X } from "lucide-react";
import { saveRoom, type RoomFormState } from "./actions";
import { uploadRoomPhoto, PhotoUploadError } from "./upload-photos";
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

// Uma vez com .url do Storage (sem .file), a foto já foi enviada — é isso
// que decide o que vai como existingPhotoUrls na submissão.
type PhotoPreview = {
  url: string;
  file?: File;
  uploading?: boolean;
  error?: string;
};

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
  const [state, formAction, pending] = useActionState(saveRoom, initialState);
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

  // Cada foto sobe para o Storage assim que é escolhida, não quando o
  // formulário é submetido — assim o pedido de gravação nunca carrega
  // binário, só os URLs já prontos (ver upload-photos.ts).
  function startUpload(item: PhotoPreview) {
    const file = item.file;
    if (!file) return;
    // Identifica o preview pelo File, não pela posição nem pela referência
    // do objeto — ambos mudam entre re-renders (reordenar, retry), o File
    // em si é a única coisa estável do início ao fim do upload.
    uploadRoomPhoto(file)
      .then((publicUrl) => {
        URL.revokeObjectURL(item.url);
        setPreviews((prev) =>
          prev.map((p) => (p.file === file ? { url: publicUrl } : p)),
        );
      })
      .catch((err) => {
        setPreviews((prev) =>
          prev.map((p) =>
            p.file === file
              ? {
                  ...p,
                  uploading: false,
                  error:
                    err instanceof PhotoUploadError
                      ? err.message
                      : "Não foi possível enviar esta foto.",
                }
              : p,
          ),
        );
      });
  }

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const newItems: PhotoPreview[] = Array.from(fileList).map((file) => ({
      file,
      url: URL.createObjectURL(file),
      uploading: true,
    }));
    setPreviews((prev) => [...prev, ...newItems]);
    newItems.forEach(startUpload);
  }

  function retryUpload(index: number) {
    setPreviews((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, uploading: true, error: undefined } : p,
      ),
    );
    startUpload({ ...previews[index], uploading: true, error: undefined });
  }

  function removePreview(index: number) {
    const removed = previews[index];
    if (removed.file) URL.revokeObjectURL(removed.url);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function reorderPreviews(from: number, to: number) {
    if (from === to) return;
    setPreviews((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  const hasPendingUploads = previews.some((p) => p.uploading);
  const failedUploads = previews.filter((p) => p.error);
  const hasFailedUploads = failedUploads.length > 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-canvas shadow-popover ui-form-modal">
        <div className="ui-form-header flex items-center justify-between border-b border-border px-6 py-4">
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
          action={formAction}
          className="ui-form-scroll flex flex-col gap-5 overflow-y-auto px-6 py-5"
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

          <h3 className="ui-form-section-title">Identificação</h3>
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

          <h3 className="ui-form-section-title">Descrição e capacidade</h3>
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
                <label
                  htmlFor="capacityAdults"
                  className="text-[12px] text-ink-subdued"
                >
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
                <label
                  htmlFor="capacityChildren"
                  className="text-[12px] text-ink-subdued"
                >
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
                <label
                  htmlFor="capacityInfants"
                  className="text-[12px] text-ink-subdued"
                >
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

          <div className="flex flex-col gap-1.5 border-t border-border pt-4 sm:w-1/2 sm:pr-2">
            <label htmlFor="accessCode" className={labelClasses}>
              Código de acesso (keysafe) — opcional
            </label>
            <input
              id="accessCode"
              name="accessCode"
              type="text"
              defaultValue={room?.access_code ?? ""}
              placeholder="Ex: 4821"
              className={inputClasses}
            />
            <p className="text-[12px] text-ink-subdued">
              Usado nos emails automáticos de check-in em Email marketing.
            </p>
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
                Opcional. Se não adicionares fotos próprias, mostramos as fotos
                da tipologia.
              </p>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                // Não é um campo do formulário — as fotos vão como URLs
                // (existingPhotoUrls) depois de enviadas, não como ficheiro.
                e.target.value = "";
              }}
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
                      draggable={!preview.uploading}
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
                        className={`h-20 w-full rounded-md border object-cover ${
                          preview.error ? "border-error" : "border-border"
                        } ${preview.uploading ? "opacity-50" : ""}`}
                      />
                      {preview.uploading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-canvas border-t-transparent" />
                        </div>
                      )}
                      {preview.error && (
                        <button
                          type="button"
                          onClick={() => retryUpload(index)}
                          title={preview.error}
                          className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-md bg-error/10 text-[10px] font-semibold text-error"
                        >
                          <RotateCw className="h-4 w-4" strokeWidth={2} />
                          Tentar de novo
                        </button>
                      )}
                      {!preview.uploading && (
                        <div className="absolute left-1 top-1 rounded bg-black/50 p-0.5 text-white">
                          <GripVertical
                            className="h-3.5 w-3.5"
                            strokeWidth={2}
                          />
                        </div>
                      )}
                      {index === 0 && !preview.uploading && (
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

          {hasFailedUploads && (
            <div aria-live="polite" className="text-body text-error">
              <p>
                Uma ou mais fotos falharam a enviar. Tenta de novo ou remove-as
                antes de guardar.
              </p>
              <ul className="mt-1 list-inside list-disc text-[12px]">
                {failedUploads.map((p) => (
                  <li key={p.url}>{p.error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="ui-form-footer flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || hasPendingUploads || hasFailedUploads}
              className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending
                ? "A guardar..."
                : hasPendingUploads
                  ? "A enviar fotos..."
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
