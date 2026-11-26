import { AlertCircle, RotateCw } from "lucide-react";
import { messageTime } from "@/lib/chat-time";
import type { LocalMessage } from "@/lib/chat-messages";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  message: LocalMessage;
  mine: boolean;
  /** Va pegado al anterior del mismo autor. */
  joinedAbove: boolean;
  /** Le sigue otro del mismo autor. */
  joinedBelow: boolean;
  onRetry: (message: LocalMessage) => void;
};

export function MessageBubble({ message, mine, joinedAbove, joinedBelow, onRetry }: MessageBubbleProps) {
  const failed = message.status === "failed";
  return (
    <li className={cn("flex flex-col", mine ? "items-end" : "items-start", joinedAbove ? "mt-0.5" : "mt-3")}>
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap break-words rounded-[1.25rem] px-3.5 py-2 text-base leading-snug",
          mine ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground ring-1 ring-border",
          mine && joinedAbove && "rounded-tr-md",
          mine && joinedBelow && "rounded-br-md",
          !mine && joinedAbove && "rounded-tl-md",
          !mine && joinedBelow && "rounded-bl-md",
          message.status === "sending" && "opacity-70",
          failed && "bg-destructive/10 text-foreground ring-1 ring-destructive/40",
        )}
      >
        {message.text}
        <span
          className={cn(
            "float-right ml-2 mt-1.5 translate-y-0.5 text-[0.6875rem] tabular-nums leading-none",
            mine && !failed ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {message.status === "sending" ? "Enviando…" : messageTime(message.createdAt)}
        </span>
      </div>
      {failed ? (
        <button
          type="button"
          onClick={() => onRetry(message)}
          className="flex min-h-11 items-center gap-1.5 px-1 text-sm text-destructive active:opacity-70"
        >
          <AlertCircle className="size-4" aria-hidden />
          {message.error ?? "No se ha enviado"} ·
          <span className="inline-flex items-center gap-1 font-semibold">
            <RotateCw className="size-3.5" aria-hidden />
            Reintentar
          </span>
        </button>
      ) : null}
    </li>
  );
}
