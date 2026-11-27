"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";
import { BookCover } from "./book-cover";

type Transform = { scale: number; x: number; y: number };

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };

type Point = { x: number; y: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Portada de la ficha: al tocarla se abre a pantalla completa, donde sí se puede ampliar. */
export function CoverViewer({ title, author, coverUrl }: { title: string; author?: string; coverUrl?: string }) {
  const [open, setOpen] = useState(false);

  if (!coverUrl) return <BookCover title={title} author={author} size="lg" />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ver la portada de ${title} a pantalla completa`}
        className="rounded-cover outline-offset-4 active:opacity-90"
      >
        <BookCover title={title} author={author} coverUrl={coverUrl} size="lg" />
      </button>
      {open ? <Viewer title={title} coverUrl={coverUrl} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function Viewer({ title, coverUrl, onClose }: { title: string; coverUrl: string; onClose: () => void }) {
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const pinchStart = useRef<{ distance: number; transform: Transform } | null>(null);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  /** Mantiene la imagen dentro de la pantalla: sin hueco al arrastrar con zoom. */
  function bounded(next: Transform): Transform {
    const rect = stageRef.current?.getBoundingClientRect();
    const scale = clamp(next.scale, MIN_SCALE, MAX_SCALE);
    if (!rect || scale === MIN_SCALE) return { scale, x: 0, y: 0 };
    const maxX = ((scale - 1) * rect.width) / 2;
    const maxY = ((scale - 1) * rect.height) / 2;
    return { scale, x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
  }

  /** Cambia la escala manteniendo fijo el punto `at` (relativo al centro del escenario). */
  function zoomAround(base: Transform, scale: number, at: Point): Transform {
    const ratio = clamp(scale, MIN_SCALE, MAX_SCALE) / base.scale;
    return { scale, x: at.x - (at.x - base.x) * ratio, y: at.y - (at.y - base.y) * ratio };
  }

  function centerOf(clientX: number, clientY: number): Point {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
  }

  function onPointerDown(event: React.PointerEvent) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), transform };
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const current = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, current);

    if (pointers.current.size >= 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = centerOf((a.x + b.x) / 2, (a.y + b.y) / 2);
      const base = pinchStart.current.transform;
      const scale = clamp(base.scale * (distance / pinchStart.current.distance), MIN_SCALE, MAX_SCALE);
      setTransform(bounded(zoomAround(base, scale, mid)));
      moved.current = true;
    } else if (pointers.current.size === 1) {
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      if (Math.abs(dx) + Math.abs(dy) > 0) moved.current = true;
      if (transform.scale > 1) setTransform(bounded({ ...transform, x: transform.x + dx, y: transform.y + dy }));
    }
  }

  function onPointerUp(event: React.PointerEvent) {
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (!wasSingle || moved.current) {
      lastTap.current = null;
      return;
    }

    // Toque suelto: el segundo en menos de 300 ms alterna entre ajustado y ampliado.
    const now = event.timeStamp;
    const previous = lastTap.current;
    if (previous && now - previous.time < 300 && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 30) {
      lastTap.current = null;
      setTransform(
        transform.scale > 1
          ? IDENTITY
          : bounded(zoomAround(transform, DOUBLE_TAP_SCALE, centerOf(event.clientX, event.clientY))),
      );
    } else {
      lastTap.current = { time: now, x: event.clientX, y: event.clientY };
    }
  }

  function onPointerCancel(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    pinchStart.current = null;
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Portada de ${title}`} className="fixed inset-0 z-[100] bg-black">
      <div
        ref={stageRef}
        // touch-action: none → el navegador no hace scroll ni zoom: lo gestionamos nosotros.
        className="absolute inset-0 touch-none select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div
          className="relative size-full will-change-transform"
          style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
        >
          <Image
            src={coverUrl}
            alt={`Portada de ${title}`}
            fill
            sizes="100vw"
            draggable={false}
            className="object-contain p-4"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex size-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur active:bg-white/25"
      >
        <X aria-hidden className="size-6" />
      </button>
    </div>,
    document.body,
  );
}
