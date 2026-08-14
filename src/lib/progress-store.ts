"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny global counter of in-flight requests routed through `apiFetch`.
 * Used by <GlobalProgress /> to show a top progress bar.
 */
type Listener = () => void;

let inflight = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export function progressStart() {
  inflight += 1;
  emit();
}

export function progressDone() {
  inflight = Math.max(0, inflight - 1);
  emit();
}

function getInflight() {
  return inflight;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useInflight(): number {
  return useSyncExternalStore(subscribe, getInflight, () => 0);
}
