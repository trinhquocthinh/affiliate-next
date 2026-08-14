import { statusStyles } from "@/lib/user-status";

export function UserStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase ${
        statusStyles[status] ||
        "border-slate-300 bg-slate-200 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400"
      }`}
    >
      {status}
    </span>
  );
}
