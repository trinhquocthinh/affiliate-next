"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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

export default function AdminConfigPage() {
  const [config, setConfig] = useState<ConfigMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      if (data.ok) {
        setConfig(data.data);
      } else {
        toast.error(data.error?.message || "Failed to load config");
      }
    } catch {
      toast.error("Failed to load config");
    } finally {
      setLoading(false);
    }
  }

  async function saveField(key: string) {
    const value = config[key];
    if (value === undefined) return;

    setSaving(key);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`${key} updated`);
      } else {
        toast.error(data.error?.message || "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(null);
    }
  }

  async function resetToDefaults() {
    if (!confirm("Reset all config values to defaults?")) return;

    for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
      setConfig((prev) => ({ ...prev, [key]: value }));
      try {
        await fetch("/api/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        });
      } catch {
        // continue
      }
    }
    toast.success("Reset to defaults");
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
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
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

        <Button variant="outline" onClick={resetToDefaults} className="w-full">
          Reset to Defaults
        </Button>
      </div>
    </>
  );
}
