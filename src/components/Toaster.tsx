"use client";

import { cn } from "@/lib/cn";
import { dismissToast, useToasts } from "@/lib/toast";

const TONE: Record<string, string> = {
  default: "border-zinc-200 bg-white text-zinc-800",
  success: "border-emerald-200 bg-white text-zinc-800",
  danger: "border-rose-200 bg-white text-zinc-800",
};

const DOT: Record<string, string> = {
  default: "bg-accent",
  success: "bg-emerald-500",
  danger: "bg-rose-500",
};

export function Toaster() {
  const toasts = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={cn(
            "jr-toast pointer-events-auto flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium shadow-lg shadow-black/5",
            TONE[t.tone],
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", DOT[t.tone])} />
          {t.message}
        </button>
      ))}
    </div>
  );
}
