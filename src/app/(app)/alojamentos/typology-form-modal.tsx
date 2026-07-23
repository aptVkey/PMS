"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";
import { saveTypology, type TypologyFormState } from "./actions";
import type { RoomTypology } from "@/lib/room-typologies";

const initialState: TypologyFormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

type PhotoPreview = { url: string; file?: File };

export function TypologyFormModal({
  typology,
  propertyId,
  onClose,
}: {
  typology?: RoomTypology;
  propertyId: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    saveTypology,
    initialState,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<PhotoPreview[]>(
    () => typology?.photos.map((url) => ({ url })) ?? [],
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
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-canvas shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">
            {typology ? "Editar tipologia" : "Nova tipologia"}
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
          className="flex flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          {typology && (
            <input type="hidden" name="id" value={typology.id} />
          )}
          <input type="hidden" name="propertyId" value={propertyId} />
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
              Nome da tipologia
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={typology?.name}
              placeholder="Ex: T2 Vista Mar"
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className={labelClasses}>
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={typology?.description ?? ""}
              placeholder="Descreve esta tipologia para os hóspedes."
              className={`${inputClasses} min-h-0 py-2`}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className={labelClasses}>Fotos</span>
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
                  Arrasta para ordenar. A primeira foto é a capa. Estas fotos
                  são partilhadas por todos os quartos desta tipologia.
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
                : typology
                  ? "Guardar alterações"
                  : "Guardar tipologia"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
