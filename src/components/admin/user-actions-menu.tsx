import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle2, MoreHorizontal, RotateCcw, Trash2, XCircle } from "lucide-react";
import type { AdminAction, UserItem } from "@/lib/user-status";

export function UserActionsMenu({
  user,
  onAction,
  disabled,
}: {
  user: UserItem;
  onAction: (user: UserItem, action: AdminAction) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            disabled={disabled}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:text-emerald-400 dark:hover:bg-emerald-400/10 rounded-lg transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MoreHorizontal size={18} />
          </button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-[160px] bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden font-medium">
        {user.status === "PENDING" && (
          <>
            <DropdownMenuItem
              onClick={() => onAction(user, "APPROVE")}
              className="text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 dark:focus:text-emerald-400 focus:bg-slate-50 dark:focus:bg-slate-800/50"
            >
              <CheckCircle2 size={16} className="mr-2" />
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onAction(user, "REJECT")}
              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-slate-50 dark:focus:bg-slate-800/50"
            >
              <XCircle size={16} className="mr-2" />
              Reject
            </DropdownMenuItem>
          </>
        )}
        {(user.status === "REJECTED" ||
          user.status === "DELETED" ||
          user.status === "INACTIVE") && (
            <DropdownMenuItem
              onClick={() => onAction(user, "REOPEN")}
              className="text-blue-600 dark:text-blue-400 focus:text-blue-600 dark:focus:text-blue-400 focus:bg-slate-50 dark:focus:bg-slate-800/50"
            >
              <RotateCcw size={16} className="mr-2" />
              Re-open
            </DropdownMenuItem>
          )}
        {user.status === "ACTIVE" && (
          <DropdownMenuItem
            onClick={() => onAction(user, "DELETE")}
            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-slate-50 dark:focus:bg-slate-800/50"
          >
            <Trash2 size={16} className="mr-2" />
            Deactivate
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
