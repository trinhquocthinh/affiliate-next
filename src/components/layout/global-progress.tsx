"use client";

import { useEffect, useRef, useState } from "react";
import { useInflight } from "@/lib/progress-store";

/**
 * Thin (2px) gradient top progress bar, NProgress-style.
 * Shows while any apiFetch call is in flight.
 */
export function GlobalProgress() {
  const inflight = useInflight();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Synchronizing UI state with the external inflight subscription is the
    // intended use of an effect here; setState calls below are intentional.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (inflight > 0) {
      if (hideRef.current) {
        clearTimeout(hideRef.current);
        hideRef.current = null;
      }
      setVisible(true);
      setProgress((p) => (p < 10 ? 15 : p));
      if (!trickleRef.current) {
        trickleRef.current = setInterval(() => {
          setProgress((p) => {
            if (p >= 90) return p;
            const inc = (90 - p) * 0.08 + 0.5;
            return Math.min(90, p + inc);
          });
        }, 200);
      }
    } else {
      if (trickleRef.current) {
        clearInterval(trickleRef.current);
        trickleRef.current = null;
      }
      setProgress(100);
      hideRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    return () => {
      if (trickleRef.current && inflight === 0) {
        clearInterval(trickleRef.current);
        trickleRef.current = null;
      }
    };
  }, [inflight]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 right-0 left-0 z-100 h-0.5"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease" }}
    >
      <div
        className="h-full bg-linear-to-r from-sky-400 via-indigo-500 to-emerald-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
        style={{
          width: `${progress}%`,
          transition: "width 200ms ease-out",
        }}
      />
    </div>
  );
}
