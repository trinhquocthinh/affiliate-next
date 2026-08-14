"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronDownIcon, Link2Icon, LoaderIcon } from "lucide-react";

export function AffiliateDiscordCard({
  discordId,
  discordIdInput,
  onDiscordIdInputChange,
  discordLinking,
  discordExpanded,
  onToggleExpanded,
  onSave,
  onUnlink,
}: {
  discordId: string | null;
  discordIdInput: string;
  onDiscordIdInputChange: (value: string) => void;
  discordLinking: boolean;
  discordExpanded: boolean;
  onToggleExpanded: () => void;
  onSave: () => void;
  onUnlink: () => void;
}) {
  return (
    <Card className="mb-6 overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#131B2F]">
      <CardContent className="p-0">
        <button
          type="button"
          className="flex w-full items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30"
          onClick={onToggleExpanded}
        >
          <div className="flex items-center gap-3">
            <Link2Icon size={18} className="text-slate-400 dark:text-slate-500" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Discord</span>
            {discordId ? (
              <span className="rounded-md border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400">
                Đã liên kết
              </span>
            ) : (
              <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
                Chưa liên kết
              </span>
            )}
          </div>
          <ChevronDownIcon
            size={16}
            className={`text-slate-400 transition-transform ${discordExpanded ? "rotate-180" : ""}`}
          />
        </button>
        {discordExpanded && (
          <div className="space-y-3 border-t border-slate-100 px-4 pt-3 pb-4 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Liên kết Discord để fill link trực tiếp từ group chat. Lấy User ID: Discord Settings →
              Advanced → bật Developer Mode → chuột phải avatar → Copy User ID.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Discord User ID (vd: 123456789012345678)"
                value={discordIdInput}
                onChange={(e) => onDiscordIdInputChange(e.target.value)}
                className="flex-1 text-sm"
              />
              <Button
                size="sm"
                onClick={onSave}
                disabled={discordLinking || discordIdInput === (discordId || "")}
              >
                {discordLinking ? <LoaderIcon className="h-4 w-4 animate-spin" /> : "Lưu"}
              </Button>
              {discordId && (
                <Button size="sm" variant="outline" onClick={onUnlink} disabled={discordLinking}>
                  Gỡ
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
