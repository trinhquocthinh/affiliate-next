export type UserItem = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  status: string;
  discordId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export type AdminAction = "APPROVE" | "REJECT" | "DELETE" | "REOPEN" | "EDIT_DISCORD";

export type UsersResponse = {
  ok: boolean;
  data?: { users: UserItem[] };
  error?: { message?: string };
};

export const roleStyles: Record<string, string> = {
  BUYER:
    "text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 dark:text-blue-400 dark:border-blue-500/30 dark:bg-blue-500/10 dark:hover:bg-blue-500/20",
  AFFILIATE:
    "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20",
  ADMIN:
    "text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100 dark:text-purple-400 dark:border-purple-500/30 dark:bg-purple-500/10 dark:hover:bg-purple-500/20",
};

export const avatarColors: Record<string, string> = {
  BUYER: "bg-blue-500/20 text-blue-400 border border-blue-500/20",
  AFFILIATE: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20",
  ADMIN: "bg-purple-500/20 text-purple-400 border border-purple-500/20",
};

export const statusStyles: Record<string, string> = {
  PENDING:
    "text-amber-700 border-amber-200 bg-amber-100 dark:text-amber-400 dark:border-amber-500/30 dark:bg-amber-500/10",
  ACTIVE:
    "text-emerald-700 border-emerald-200 bg-emerald-100 dark:text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10",
  REJECTED:
    "text-red-700 border-red-200 bg-red-100 dark:text-red-400 dark:border-red-500/30 dark:bg-red-500/10",
  DELETED:
    "text-slate-600 border-slate-300 bg-slate-200 dark:text-slate-400 dark:border-slate-500/30 dark:bg-slate-500/10",
  INACTIVE:
    "text-gray-600 border-gray-300 bg-gray-100 dark:text-gray-400 dark:border-gray-500/30 dark:bg-gray-500/10",
};

export const ACTION_SUCCESS_TOAST: Record<AdminAction, string> = {
  APPROVE: "Đã duyệt người dùng",
  REJECT: "Đã từ chối người dùng",
  DELETE: "Đã vô hiệu hoá người dùng",
  REOPEN: "Đã mở lại tài khoản",
  EDIT_DISCORD: "Đã cập nhật Discord ID",
};
