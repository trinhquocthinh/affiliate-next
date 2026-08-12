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
    <Card className="bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm overflow-hidden mb-6">
      <CardContent className="p-0">
        <button
          type="button"
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
          onClick={onToggleExpanded}
        >
          <div className="flex items-center gap-3">
            <Link2Icon size={18} className="text-slate-400 dark:text-slate-500" />
            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Discord</span>
            {discordId ? (
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-md font-semibold border border-emerald-200 dark:border-emerald-500/30">Đã liên kết</span>
            ) : (
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 px-2.5 py-0.5 rounded-md font-semibold border border-slate-200 dark:border-slate-700">Chưa liên kết</span>
            )}
          </div>
          <ChevronDownIcon size={16} className={`text-slate-400 transition-transform ${discordExpanded ? "rotate-180" : ""}`} />
        </button>
        {discordExpanded && (
          <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Liên kết Discord để fill link trực tiếp từ group chat.
              Lấy User ID: Discord Settings → Advanced → bật Developer Mode → chuột phải avatar → Copy User ID.
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onUnlink}
                  disabled={discordLinking}
                >
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
