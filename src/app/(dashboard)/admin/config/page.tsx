"use client";

import { useAdminConfig } from "@/hooks/use-admin-config";
import { useAffiliateAllowedColumns } from "@/hooks/use-affiliate-allowed-columns";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { CONFIG_FIELDS } from "@/lib/constants";
import { AFFILIATE_COLUMNS } from "@/lib/affiliate-columns";

export default function AdminConfigPage() {
  const admin = useAdminConfig();
  const columns = useAffiliateAllowedColumns({
    remoteValue: admin.remoteConfig.AFFILIATE_ALLOWED_COLUMNS,
    mutate: admin.mutate,
  });

  if (admin.loading) {
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
                  value={admin.config[field.key] || ""}
                  onChange={(e) => admin.setField(field.key, e.target.value)}
                />
                <Button
                  onClick={() => admin.saveField(field.key)}
                  disabled={admin.saving === field.key}
                  size="sm"
                >
                  {admin.saving === field.key ? "Saving..." : "Save"}
                </Button>
              </div>
              {field.key === "BULK_CLOSE_MIN_DAYS" && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
                  <span className="text-xs text-muted-foreground">
                    Manually trigger the cleanup using the saved threshold. Runs
                    automatically every day at 00:00 UTC.
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={admin.runCleanupNow}
                    disabled={admin.runningCleanup}
                  >
                    {admin.runningCleanup ? "Running..." : "Run Cleanup Now"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Affiliate Queue Columns</CardTitle>
            <CardDescription className="text-xs">
              Columns affiliates are allowed to see and toggle in their queue.
              Mandatory columns are always enabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {AFFILIATE_COLUMNS.map((col) => {
              const checked = col.mandatory || columns.allowedColumns.has(col.id);
              return (
                <div
                  key={col.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{col.label}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">{col.id}</span>
                  </div>
                  <Switch
                    checked={checked}
                    onCheckedChange={(v) => columns.toggleColumn(col.id, !!v)}
                    disabled={!!col.mandatory}
                    aria-label={`Allow ${col.label} column`}
                  />
                </div>
              );
            })}
            <div className="flex justify-end pt-1">
              <Button
                size="sm"
                onClick={columns.saveAllowedColumns}
                disabled={!columns.columnsDirty || columns.savingColumns}
              >
                {columns.savingColumns ? "Saving..." : "Save Columns"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" onClick={admin.resetToDefaults} disabled={admin.resetting} className="w-full">
          {admin.resetting ? "Resetting..." : "Reset to Defaults"}
        </Button>
      </div>
    </>
  );
}
