"use client";

import { useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { MESSAGE_MAX_LENGTH } from "@/lib/chat-messages";
import { cn } from "@/lib/utils";

const MAX_HEIGHT = 128; // ~5 líneas

/** Campo de texto que crece hasta 5 líneas y botón de enviar. */
export function Composer({ onSend, onFocus }: { onSend: (text: string) => void; onFocus?: () => void }) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();
  const tooLong = trimmed.length > MESSAGE_MAX_LENGTH;
  const canSend = trimmed.length > 0 && !tooLong;

  function resize() {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
  }

  function submit() {
    if (!canSend) return;
    onSend(trimmed);
    setText("");
    requestAnimationFrame(resize);
  }

  const nearLimit = trimmed.length > MESSAGE_MAX_LENGTH - 200;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {/* En el flujo (no flotando encima): en iOS lo que sobresale de la barra no se ve. */}
      {nearLimit ? (
        <p
          id="chat-input-count"
          aria-live="polite"
          className={cn(
            "px-4 pb-1.5 text-right text-xs tabular-nums",
            tooLong ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {tooLong
            ? `Sobran ${trimmed.length - MESSAGE_MAX_LENGTH} caracteres (máximo ${MESSAGE_MAX_LENGTH})`
            : `${trimmed.length}/${MESSAGE_MAX_LENGTH}`}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <label htmlFor="chat-input" className="sr-only">
          Mensaje
        </label>
        <textarea
          id="chat-input"
          ref={ref}
          value={text}
          rows={1}
          placeholder="Escribe un mensaje"
          autoComplete="off"
          onFocus={onFocus}
          onChange={(event) => {
            setText(event.target.value);
            resize();
          }}
          onKeyDown={(event) => {
            // Con teclado físico, Enter envía (Mayús+Enter, salto de línea). En el iPhone, Enter es salto de línea.
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing &&
              window.matchMedia("(pointer: fine)").matches
            ) {
              event.preventDefault();
              submit();
            }
          }}
          aria-invalid={tooLong || undefined}
          aria-describedby={nearLimit ? "chat-input-count" : undefined}
          className={cn(
            "block max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-[1.375rem] border border-border bg-card px-4 py-2.5 text-base leading-snug outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
            tooLong && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30",
          )}
        />
        <button
          type="submit"
          aria-label="Enviar"
          disabled={!canSend}
          // Sin esto, pulsar el botón quita el foco y el teclado de iOS se cierra tras cada mensaje.
          onPointerDown={(event) => event.preventDefault()}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-[opacity,transform] active:scale-90 disabled:opacity-40"
        >
          <ArrowUp className="size-5" strokeWidth={2.4} aria-hidden />
        </button>
      </div>
    </form>
  );
}
