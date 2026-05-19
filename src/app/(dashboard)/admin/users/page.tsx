"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { apiFetch } from "@/lib/swr-fetcher";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { AppHeader } from "@/components/layout/app-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Plus,
  Search,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trash2,
} from "lucide-react";

type UserItem = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
};

type AdminAction = "APPROVE" | "REJECT" | "DELETE" | "REOPEN";

const roleStyles: Record<string, string> = {
  BUYER:
    "text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 dark:text-blue-400 dark:border-blue-500/30 dark:bg-blue-500/10 dark:hover:bg-blue-500/20",
  AFFILIATE:
    "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20",
  ADMIN:
    "text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100 dark:text-purple-400 dark:border-purple-500/30 dark:bg-purple-500/10 dark:hover:bg-purple-500/20",
};

const avatarColors: Record<string, string> = {
  BUYER: "bg-blue-500/20 text-blue-400 border border-blue-500/20",
  AFFILIATE: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20",
  ADMIN: "bg-purple-500/20 text-purple-400 border border-purple-500/20",
};

const statusStyles: Record<string, string> = {
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

const ACTION_SUCCESS_TOAST: Record<AdminAction, string> = {
  APPROVE: "Đã duyệt người dùng",
  REJECT: "Đã từ chối người dùng",
  DELETE: "Đã vô hiệu hoá người dùng",
  REOPEN: "Đã mở lại tài khoản",
};

function StatusBadge({ status }: { status: string }) {
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

function RoleDropdown({
  role,
  onChange,
  disabled,
}: {
  role: string;
  onChange: (role: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative inline-block w-32">
      <select
        className={`appearance-none w-full px-3 py-1.5 text-xs font-bold rounded-full border focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${roleStyles[role] || ""
          }`}
        value={role}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="BUYER">BUYER</option>
        <option value="AFFILIATE">AFFILIATE</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
        <ChevronDown size={14} className="opacity-70" />
      </div>
    </div>
  );
}

function UserActionsMenu({
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

type UsersResponse = { ok: boolean; data?: { users: UserItem[] }; error?: { message?: string } };

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [roleFilter, setRoleFilter] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("BUYER");

  const [rejectTarget, setRejectTarget] = useState<UserItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  const swrKey = (() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (roleFilter) params.set("role", roleFilter);
    const qs = params.toString();
    return `/api/users${qs ? `?${qs}` : ""}`;
  })();

  const { data, isLoading, isValidating, mutate } = useSWR<UsersResponse>(swrKey);
  const users = data?.ok ? data.data?.users ?? [] : [];
  const loading = isLoading;
  const fetching = isValidating;

  async function updateUser(userId: string, updates: Record<string, unknown>) {
    setBusyUserId(userId);
    try {
      const res = await apiFetch<UsersResponse>(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        toast.success("User updated");
        mutate();
      } else {
        toast.error(res.error?.message || "Failed to update");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusyUserId(null);
    }
  }

  async function runUserAction(
    userId: string,
    action: AdminAction,
    reason?: string,
  ): Promise<boolean> {
    setBusyUserId(userId);
    try {
      const res = await apiFetch<UsersResponse>(`/api/admin/users/${userId}/action`, {
        method: "PATCH",
        body: JSON.stringify({ action, reason }),
      });
      if (res.ok) {
        toast.success(ACTION_SUCCESS_TOAST[action]);
        mutate();
        return true;
      }
      toast.error(res.error?.message || "Thao tác thất bại");
      return false;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
      return false;
    } finally {
      setBusyUserId(null);
    }
  }

  function handleMenuAction(user: UserItem, action: AdminAction) {
    if (action === "REJECT") {
      setRejectTarget(user);
      setRejectReason("");
      return;
    }
    runUserAction(user.id, action);
  }

  async function submitReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) { toast.error("Vui lòng nhập lý do từ chối"); return; }
    setRejectLoading(true);
    const ok = await runUserAction(rejectTarget.id, "REJECT", reason);
    setRejectLoading(false);
    if (ok) { setRejectTarget(null); setRejectReason(""); }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    try {
      const res = await apiFetch<UsersResponse>("/api/users", {
        method: "POST",
        body: JSON.stringify({
          email: newEmail,
          displayName: newDisplayName || undefined,
          password: newPassword,
          role: newRole,
        }),
      });
      if (res.ok) {
        toast.success("User created");
        setShowAddDialog(false);
        setNewEmail(""); setNewDisplayName(""); setNewPassword(""); setNewRole("BUYER");
        mutate();
      } else {
        toast.error(res.error?.message || "Failed to create user");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setAddLoading(false);
    }
  }

  const visibleUsers = showDeleted
    ? users
    : users.filter((u) => u.status !== "DELETED");

  return (
    <>
      <AppHeader title="User Management" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-400 mx-auto w-full pb-20">

          {/* Toolbar */}
          <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">

            {/* Search */}
            <div className="relative w-full lg:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white dark:bg-[#131B2F] border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
              />
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-wrap items-center gap-3 lg:gap-4">

              {/* Show Deleted Toggle */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#131B2F] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Show deleted</span>
                <button
                  onClick={() => setShowDeleted(!showDeleted)}
                  disabled={fetching}
                  className={`w-11 h-6 rounded-full relative transition-colors focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${showDeleted ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${showDeleted ? "left-6" : "left-1"
                      }`}
                  />
                </button>
              </div>

              {/* Role Filter */}
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  disabled={fetching}
                  className="appearance-none bg-white dark:bg-[#131B2F] border border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300 text-sm rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">All roles</option>
                  <option value="BUYER">BUYER</option>
                  <option value="AFFILIATE">AFFILIATE</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 dark:text-slate-500">
                  <ChevronDown size={16} />
                </div>
              </div>

              {/* Add User */}
              <button
                onClick={() => setShowAddDialog(true)}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-900 font-bold py-2.5 px-5 rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 whitespace-nowrap text-sm"
              >
                <Plus size={18} />
                <span>Add User</span>
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {!loading && visibleUsers.length > 0 && (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block bg-white dark:bg-[#131B2F] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="text-xs font-bold uppercase tracking-wider bg-slate-50 dark:bg-[#0B1120]/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Last Login</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {visibleUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50 dark:hover:bg-[#1A233A]/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border shadow-sm ${avatarColors[user.role] ||
                                "bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"
                                }`}
                            >
                              {getInitials(user.displayName, user.email)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-200">
                                {user.displayName || user.email}
                              </div>
                              <div className="text-xs font-medium text-slate-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <RoleDropdown
                            role={user.role}
                            onChange={(role) => updateUser(user.id, { role })}
                            disabled={busyUserId === user.id}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={user.status} />
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <UserActionsMenu user={user} onAction={handleMenuAction} disabled={busyUserId === user.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {visibleUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-white dark:bg-[#131B2F] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative"
                  >
                    <div className="absolute top-4 right-4">
                      <UserActionsMenu user={user} onAction={handleMenuAction} disabled={busyUserId === user.id} />
                    </div>
                    <div className="flex items-center gap-4 mb-5 pr-10">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base border shadow-sm ${avatarColors[user.role] ||
                          "bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"
                          }`}
                      >
                        {getInitials(user.displayName, user.email)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-200 text-lg">
                          {user.displayName || user.email}
                        </div>
                        <div className="text-sm font-medium text-slate-500">
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-[#0B1120]/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2 uppercase font-bold tracking-wider">
                          Role
                        </p>
                        <RoleDropdown
                          role={user.role}
                          onChange={(role) => updateUser(user.id, { role })}
                          disabled={busyUserId === user.id}
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2.5 uppercase font-bold tracking-wider">
                          Status
                        </p>
                        <StatusBadge status={user.status} />
                      </div>
                      <div className="col-span-2 pt-2">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1 uppercase font-bold tracking-wider">
                          Last Login
                        </p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && visibleUsers.length === 0 && (
            <div className="text-center py-12 text-slate-500">No users found.</div>
          )}
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Add User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid gap-2">
              <label htmlFor="add-email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
              <input
                id="add-email"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
                className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="add-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">Display Name</label>
              <input
                id="add-name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="John Doe"
                className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="add-password" className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <input
                id="add-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
              <div className="relative">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="appearance-none w-full bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
                >
                  <option value="BUYER">BUYER</option>
                  <option value="AFFILIATE">AFFILIATE</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 dark:text-slate-500">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={addLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:opacity-50 text-white dark:text-slate-900 font-bold py-2.5 px-4 rounded-lg shadow-md shadow-emerald-500/20 transition-all text-sm"
            >
              {addLoading ? "Creating..." : "Create User"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="max-w-md bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">
              Từ chối người dùng
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitReject} className="space-y-4">
            {rejectTarget && (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <p>
                  Bạn đang từ chối tài khoản{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {rejectTarget.displayName || rejectTarget.email}
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
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all resize-y"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 text-right">
                {rejectReason.length}/1000
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-2.5 px-4 rounded-lg transition-all text-sm"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={rejectLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg shadow-md shadow-red-500/20 transition-all text-sm"
              >
                {rejectLoading ? "Đang xử lý..." : "Từ chối"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}