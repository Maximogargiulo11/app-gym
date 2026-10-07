"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** full: ocupa toda la pantalla (selector de ejercicios). */
  size?: "auto" | "full";
};

/** Panel inferior basado en <dialog>: foco atrapado, Esc para cerrar y fondo inerte. */
export function Sheet({ open, onClose, title, children, footer, size = "auto" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={title}
      className={cn(
        "text-text m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-black/70 sm:mx-auto sm:max-w-md",
        size === "full" ? "h-dvh max-h-dvh" : "max-h-[92dvh]",
      )}
    >
      <div
        className={cn(
          "pb-safe bg-surface flex flex-col sm:rounded-t-[22px]",
          size === "full" ? "h-full" : "max-h-[92dvh] rounded-t-[22px]",
        )}
      >
        <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="size-tap bg-surface-2 inline-flex items-center justify-center rounded-full"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-border border-t px-5 pt-3 pb-4">{footer}</div>}
      </div>
    </dialog>
  );
}
