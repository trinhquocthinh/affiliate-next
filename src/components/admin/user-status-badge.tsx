import { statusStyles } from "@/lib/user-status";

export function UserStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full border ${statusStyles[status] ||
        "text-slate-600 border-slate-300 bg-slate-200 dark:text-slate-400 dark:border-slate-500/30 dark:bg-slate-500/10"
        }`}
    >
      {status}
    </span>
  );
}
