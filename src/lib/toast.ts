"use client";

import { useSyncExternalStore } from "react";

export type ToastTone = "default" | "success" | "danger";

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

let toasts: Toast[] = [];
const EMPTY: Toast[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

function emit() {
  listeners.forEach((l) => l());
}

function remove(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(message: string, tone: ToastTone = "default") {
  const id = nextId++;
  toasts = [...toasts, { id, message, tone }];
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(() => remove(id), 2600);
  }
}

export function dismissToast(id: number) {
  remove(id);
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY,
  );
}
