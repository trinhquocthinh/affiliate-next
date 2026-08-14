import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  MoreHorizontal,
  RotateCcw,
  Trash2,
  XCircle,
  MessageSquare,
} from "lucide-react";
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
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-400"
          >
            <MoreHorizontal size={18} />
          </button>
        }
      />
      <DropdownMenuContent
        align="end"
        className="min-w-[160px] overflow-hidden rounded-xl border-slate-200 bg-white font-medium shadow-lg dark:border-slate-700 dark:bg-[#131B2F]"
      >
        <DropdownMenuItem
          onClick={() => onAction(user, "EDIT_DISCORD")}
          className="text-indigo-600 focus:bg-slate-50 focus:text-indigo-600 dark:text-indigo-400 dark:focus:bg-slate-800/50 dark:focus:text-indigo-400"
        >
          <MessageSquare size={16} className="mr-2" />
          Edit Discord ID
        </DropdownMenuItem>
        {user.status === "PENDING" && (
          <>
            <DropdownMenuItem
              onClick={() => onAction(user, "APPROVE")}
              className="text-emerald-600 focus:bg-slate-50 focus:text-emerald-600 dark:text-emerald-400 dark:focus:bg-slate-800/50 dark:focus:text-emerald-400"
            >
              <CheckCircle2 size={16} className="mr-2" />
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onAction(user, "REJECT")}
              className="text-red-600 focus:bg-slate-50 focus:text-red-600 dark:text-red-400 dark:focus:bg-slate-800/50 dark:focus:text-red-400"
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
            className="text-blue-600 focus:bg-slate-50 focus:text-blue-600 dark:text-blue-400 dark:focus:bg-slate-800/50 dark:focus:text-blue-400"
          >
            <RotateCcw size={16} className="mr-2" />
            Re-open
          </DropdownMenuItem>
        )}
        {user.status === "ACTIVE" && (
          <DropdownMenuItem
            onClick={() => onAction(user, "DELETE")}
            className="text-red-600 focus:bg-slate-50 focus:text-red-600 dark:text-red-400 dark:focus:bg-slate-800/50 dark:focus:text-red-400"
          >
            <Trash2 size={16} className="mr-2" />
            Deactivate
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
