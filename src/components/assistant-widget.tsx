"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Send, Sparkles, Trash2, X } from "lucide-react";
import { askAssistant } from "@/app/(app)/assistente/actions";

type Message = { role: "user" | "assistant"; text: string; isError?: boolean };

const SUGGESTIONS = [
  "Quais são os próximos check-ins?",
  "Quanto faturámos este mês?",
  "Que unidades têm ar condicionado?",
  "Que limpezas há hoje?",
];

// Texto simples com **negrito** e listas "- item", sem HTML injetado.
function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, index) => {
        const bullet = /^\s*[-*•]\s+/.test(line);
        const content = line.replace(/^\s*[-*•]\s+/, "");
        const parts = content
          .split(/(\*\*[^*]+\*\*)/g)
          .map((part, i) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={i}>{part.slice(2, -2)}</strong>
            ) : (
              <span key={i}>{part}</span>
            ),
          );
        if (!line.trim()) return <span key={index} className="h-1" />;
        return bullet ? (
          <p key={index} className="flex gap-2 pl-1">
            <span aria-hidden="true">•</span>
            <span>{parts}</span>
          </p>
        ) : (
          <p key={index}>{parts}</p>
        );
      })}
    </div>
  );
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isPending, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function send(text: string) {
    const question = text.trim();
    if (!question || isPending) return;

    const next: Message[] = [...messages, { role: "user", text: question }];
    setMessages(next);
    setInput("");

    // Só a conversa válida segue para o servidor (sem as mensagens de erro).
    const history = next
      .filter((m) => !m.isError)
      .slice(-12)
      .map(({ role, text: t }) => ({ role, text: t }));

    startTransition(async () => {
      const result = await askAssistant(history);
      setMessages((prev) => [
        ...prev,
        "error" in result
          ? { role: "assistant", text: result.error, isError: true }
          : { role: "assistant", text: result.answer },
      ]);
    });
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir assistente"
          // Posição também por estilo direto: não depende da cache de CSS do
          // servidor de desenvolvimento (já apareceu no canto errado por isso).
          style={{ position: "fixed", right: 20, bottom: 20 }}
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-elevated transition-transform duration-base ease-standard hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
        >
          <Sparkles className="h-6 w-6" strokeWidth={2} />
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Assistente"
          className="fixed inset-x-0 bottom-0 z-40 flex h-[85svh] flex-col rounded-t-2xl border border-border bg-canvas shadow-popover sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[600px] sm:max-h-[calc(100svh-2.5rem)] sm:w-[600px] sm:max-w-[calc(100vw-2.5rem)] sm:rounded-2xl"
        >
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-on-primary">
                <Sparkles className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <div>
                <p className="text-body font-bold text-ink">Assistente</p>
                <p className="text-[11px] text-ink-subdued">
                  Pergunta sobre reservas, faturação e alojamentos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  aria-label="Limpar conversa"
                  title="Limpar conversa"
                  className="rounded-md p-2 text-ink-subdued hover:bg-surface-1"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar assistente"
                className="rounded-md p-2 text-ink-subdued hover:bg-surface-1"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-body text-ink-muted">
                  Olá! Consulto a informação do backoffice a que tens acesso.
                  Experimenta:
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => send(suggestion)}
                      className="rounded-lg border border-border px-3 py-2.5 text-left text-body text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {messages.map((message, index) => (
                  <li
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-body ${
                        message.role === "user"
                          ? "rounded-br-sm bg-primary text-on-primary"
                          : message.isError
                            ? "rounded-bl-sm bg-error/10 text-error"
                            : "rounded-bl-sm bg-surface-1 text-ink"
                      }`}
                    >
                      {message.role === "user" ? (
                        <p className="whitespace-pre-wrap">{message.text}</p>
                      ) : (
                        <FormattedText text={message.text} />
                      )}
                    </div>
                  </li>
                ))}
                {isPending && (
                  <li className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-surface-1 px-3.5 py-2.5 text-body text-ink-subdued">
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        strokeWidth={2}
                      />
                      A consultar...
                    </div>
                  </li>
                )}
              </ul>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 border-t border-border p-3"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Pergunta
            </label>
            <textarea
              id="assistant-input"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Escreve a tua pergunta..."
              className="max-h-28 min-h-11 w-full resize-none rounded-lg border border-border bg-canvas px-3 py-2.5 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action"
            />
            <button
              type="submit"
              disabled={isPending || !input.trim()}
              aria-label="Enviar"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-action text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
