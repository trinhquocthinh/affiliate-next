import React, { forwardRef } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

interface TurnstileWidgetProps {
  onTokenChange: (token: string) => void;
  siteKey?: string;
}

export const TurnstileWidget = forwardRef<TurnstileInstance, TurnstileWidgetProps>(
  function TurnstileWidget(
    { onTokenChange, siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "" },
    ref,
  ) {
    if (!siteKey) {
      return (
        <p className="text-xs text-amber-600">
          Turnstile site key missing — set NEXT_PUBLIC_TURNSTILE_SITE_KEY.
        </p>
      );
    }

    return (
      <div className="flex justify-center">
        <Turnstile
          ref={ref}
          siteKey={siteKey}
          onSuccess={(token) => onTokenChange(token)}
          onError={() => onTokenChange("")}
          onExpire={() => onTokenChange("")}
          options={{ theme: "light" }}
        />
      </div>
    );
  },
);
