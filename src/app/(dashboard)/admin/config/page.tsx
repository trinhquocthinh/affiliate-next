"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { apiFetch } from "@/lib/swr-fetcher";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_CONFIG } from "@/lib/constants";

type ConfigMap = Record<string, string>;

const CONFIG_FIELDS = [
  {
    key: "PLATFORMS",
    label: "Platforms",
    description: "Comma-separated list of allowed platforms (e.g. SHOPEE,TIKTOK,OTHER)",
    type: "text" as const,
  },
  {
    key: "STALE_REQUEST_HOURS",
    label: "Stale Request Hours",
    description: "Hours after which a pending request is considered stale",
    type: "number" as const,
  },
  {
    key: "DUPLICATE_WINDOW_HOURS",
    label: "Duplicate Window Hours",
    description: "Hours within which duplicate URL detection is active",
    type: "number" as const,
  },
  {
    key: "BULK_CLOSE_MIN_DAYS",
    label: "Bulk Close Min Days",
    description: "Minimum age in days for bulk close eligibility",
    type: "number" as const,
  },
];

type ConfigResponse = { ok: boolean; data?: ConfigMap; error?: { message?: string } };

export default function AdminConfigPage() {
  const { data, isLoading, mutate } = useSWR<ConfigResponse>("/api/config");
  const remoteConfig = data?.ok ? data.data ?? {} : {};
  const [overrides, setOverrides] = useState<ConfigMap>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
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
      const res = await apiFetch<{ ok: boolean; error?: { message?: string } }>(
        "/api/config",
        {
          method: "PUT",
          body: JSON.stringify({ key, value }),
        },
      );
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

  if (loading) {
    return (
      <>
        <AppHeader title="System Config" />
        <div className="flex-1 p-4 md:p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="System Config" />
      <div className="flex-1 p-4 md:p-6 space-y-4 max-w-2xl">
        {CONFIG_FIELDS.map((field) => (
          <Card key={field.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{field.label}</CardTitle>
              <CardDescription className="text-xs">
                {field.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type={field.type}
                  value={config[field.key] || ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                />
                <Button
                  onClick={() => saveField(field.key)}
                  disabled={saving === field.key}
                  size="sm"
                >
                  {saving === field.key ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" onClick={resetToDefaults} disabled={resetting} className="w-full">
          {resetting ? "Resetting..." : "Reset to Defaults"}
        </Button>
      </div>
    </>
  );
}
