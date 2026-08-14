import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { apiFetch } from "@/lib/swr-fetcher";
import { DEFAULT_CONFIG } from "@/lib/constants";

export type ConfigMap = Record<string, string>;
type ConfigResponse = { ok: boolean; data?: ConfigMap; error?: { message?: string } };

export function useAdminConfig() {
  const { data, isLoading, mutate } = useSWR<ConfigResponse>("/api/config");
  const remoteConfig: ConfigMap = data?.ok ? (data.data ?? {}) : {};
  const [overrides, setOverrides] = useState<ConfigMap>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [runningCleanup, setRunningCleanup] = useState(false);
  const loading = isLoading;

  const config: ConfigMap = { ...remoteConfig, ...overrides };

  function setField(key: string, value: string) {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }

  async function saveField(key: string) {
    const value = config[key];
    if (value === undefined) return;

    setSaving(key);
    try {
      const res = await apiFetch<{ ok: boolean; error?: { message?: string } }>("/api/config", {
        method: "PUT",
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        toast.success(`${key} updated`);
        // Clear local override so SWR data becomes the source of truth
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        mutate();
      } else {
        toast.error(res.error?.message || "Failed to save");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  }

  async function runCleanupNow() {
    if (
      !confirm(
        "Run bulk close now? This will close all stale active requests older than the configured threshold.",
      )
    ) {
      return;
    }
    setRunningCleanup(true);
    try {
      const res = await apiFetch<{
        ok: boolean;
        data?: { closedCount: number; olderThanDays: number };
        error?: { message?: string };
      }>("/api/requests/bulk-close", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (res.ok && res.data) {
        toast.success(
          `Closed ${res.data.closedCount} request${res.data.closedCount === 1 ? "" : "s"} (≥ ${res.data.olderThanDays} days old)`,
        );
        mutate();
      } else {
        toast.error(res.error?.message || "Cleanup failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cleanup failed");
    } finally {
      setRunningCleanup(false);
    }
  }

  async function resetToDefaults() {
    if (!confirm("Reset all config values to defaults?")) return;
    setResetting(true);
    try {
      for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
        try {
          await apiFetch("/api/config", {
            method: "PUT",
            body: JSON.stringify({ key, value }),
          });
        } catch {
          // continue
        }
      }
      setOverrides({});
      await mutate();
      toast.success("Reset to defaults");
    } finally {
      setResetting(false);
    }
  }

  return {
    remoteConfig,
    config,
    loading,
    saving,
    resetting,
    runningCleanup,
    setField,
    saveField,
    runCleanupNow,
    resetToDefaults,
    mutate,
  };
}
