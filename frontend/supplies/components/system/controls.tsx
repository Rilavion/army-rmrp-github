"use client";

import { Check, Truck, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

export function StatusBanner({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: ReactNode;
}) {
  const colors =
    tone === "error"
      ? "border-rose-400/25 bg-rose-400/8 text-rose-100"
      : tone === "success"
        ? "border-emerald-400/25 bg-emerald-400/8 text-emerald-100"
        : "border-cyan-300/20 bg-cyan-300/7 text-cyan-50";
  return (
    <output className={`status-banner block rounded-xl border px-4 py-3 text-sm ${colors}`}>
      {children}
    </output>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  danger = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previousFocus = (dialogRef.current?.getRootNode() as ShadowRoot)?.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
    ) ?? []).filter(element => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      const dialogs = Array.from((dialogRef.current?.getRootNode() as ShadowRoot).querySelectorAll('dialog[open]'));
      if (dialogs[dialogs.length - 1] !== dialogRef.current) return;
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key === "Tab") {
        const controls = focusable();
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && (dialogRef.current?.getRootNode() as ShadowRoot)?.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (dialogRef.current?.getRootNode() as ShadowRoot)?.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 grid place-items-end bg-[#020711]/80 p-0 backdrop-blur-sm sm:place-items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <dialog
        ref={dialogRef}
        open
        aria-modal="true"
        aria-labelledby={titleId}
        className={`modal-sheet relative m-0 max-h-[92vh] w-full overflow-auto rounded-t-3xl border bg-[#0b1929] p-0 text-inherit shadow-2xl sm:max-w-2xl sm:rounded-3xl ${danger ? "border-rose-400/25" : "border-white/10"}`}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/8 bg-[#0b1929]/95 px-5 py-5 backdrop-blur-xl sm:px-6">
          <div>
            <h2 id={titleId} className="text-xl font-semibold text-white">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          </div>
          <button
            aria-label="Закрыть"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </header>
        {children}
      </dialog>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 px-5 py-16 text-center">
      <p className="font-medium text-slate-200">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="grid gap-3" aria-label="Загрузка">
      <div className="h-28 animate-pulse rounded-2xl bg-white/[.04]" />
      <div className="h-28 animate-pulse rounded-2xl bg-white/[.04]" />
      <div className="h-28 animate-pulse rounded-2xl bg-white/[.04]" />
    </div>
  );
}

export function DeliveryAnimation({ phase }: { phase: "idle" | "driving" | "success" }) {
  if (phase === "idle") return null;
  return (
    <div className="delivery-animation" role="status" aria-live="polite">
      <div className="delivery-card">
        <div className={`delivery-scene ${phase}`}>
          <div className="delivery-glow" />
          <div className="delivery-road">
            <span />
            <span />
            <span />
          </div>
          <div className="delivery-truck">
            {phase === "success" ? <Check size={36} /> : <Truck size={42} />}
          </div>
        </div>
        <p className="mt-6 text-lg font-semibold text-white">
          {phase === "success" ? "Поставка сохранена" : "Отправляем в систему…"}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {phase === "success"
            ? "Данные уже появились в истории и статистике"
            : "Сохраняем поставку в общую базу ВС РФ"}
        </p>
        <div className="delivery-progress">
          <span className={phase === "success" ? "complete" : ""} />
        </div>
      </div>
    </div>
  );
}
