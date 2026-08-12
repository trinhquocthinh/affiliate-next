import type { FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserItem } from "@/lib/user-status";

export function RejectReasonDialog({
  target,
  reason,
  onReasonChange,
  loading,
  onSubmit,
  onCancel,
}: {
  target: UserItem | null;
  reason: string;
  onReasonChange: (value: string) => void;
  loading: boolean;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="max-w-md bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">
            Từ chối người dùng
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {target && (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <p>
                Bạn đang từ chối tài khoản{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {target.displayName || target.email}
                </span>
                .
              </p>
            </div>
          )}
          <div className="grid gap-2">
            <label htmlFor="reject-reason" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Lý do từ chối <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reject-reason"
              required
              rows={4}
              maxLength={1000}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all resize-y"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 text-right">
              {reason.length}/1000
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-2.5 px-4 rounded-lg transition-all text-sm"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg shadow-md shadow-red-500/20 transition-all text-sm"
            >
              {loading ? "Đang xử lý..." : "Từ chối"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
