"use client";

import { SWRConfig } from "swr";
import { toast } from "sonner";
import { swrFetcher, FetchError } from "@/lib/swr-fetcher";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        revalidateOnFocus: false,
        revalidateIfStale: true,
        keepPreviousData: true,
        dedupingInterval: 2000,
        shouldRetryOnError: (err) => {
          // Don't retry on auth / client errors
          if (err instanceof FetchError) {
            return err.status >= 500;
          }
          return true;
        },
        errorRetryCount: 2,
        onError: (err) => {
          if (err instanceof FetchError && err.status === 401) return;
          const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi";
          toast.error(msg);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
