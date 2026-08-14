import { useState } from "react";
import type { FormEvent } from "react";
import type { UserItem } from "@/lib/user-status";

export function EditDiscordDialog({
  target,
  onClose,
  onSubmit,
}: {
  target: UserItem | null;
  onClose: () => void;
  onSubmit: (userId: string, discordId: string | null) => Promise<void>;
}) {
  if (!target) return null;

  return (
    <EditDiscordDialogContent
      key={target.id}
      target={target}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function EditDiscordDialogContent({
  target,
  onClose,
  onSubmit,
}: {
  target: UserItem;
  onClose: () => void;
  onSubmit: (userId: string, discordId: string | null) => Promise<void>;
}) {
  const [discordId, setDiscordId] = useState(target.discordId || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await onSubmit(target.id, discordId.trim() || null);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/50 p-4 backdrop-blur-sm duration-200 fade-in">
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700/50 dark:bg-[#131B2F]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Edit Discord ID</h2>
          <p className="mt-1 text-sm text-slate-500">Update Discord ID for {target.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">
                Discord ID
              </label>
              <input
                type="text"
                placeholder="e.g. 123456789012345678"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-200"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-colors hover:bg-indigo-700 disabled:opacity-70"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
