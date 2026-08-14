import { useRef, useState, useCallback } from "react";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { toast } from "sonner";

export function useTurnstile() {
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const resetTurnstile = useCallback(() => {
    turnstileRef.current?.reset();
    setTurnstileToken("");
  }, []);

  const ensureToken = useCallback(() => {
    if (!turnstileToken) {
      toast.error("Please complete the captcha.");
      return false;
    }
    return true;
  }, [turnstileToken]);

  return {
    turnstileToken,
    setTurnstileToken,
    turnstileRef,
    resetTurnstile,
    ensureToken,
  };
}
