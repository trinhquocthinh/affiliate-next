"use client";

import { getInitials } from "@/lib/utils";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { useAdminUserForms } from "@/hooks/use-admin-user-forms";
import { avatarColors, type AdminAction, type UserItem } from "@/lib/user-status";
import { AppHeader } from "@/components/layout/app-header";
import { Skeleton } from "@/components/ui/skeleton";
import { UserStatusBadge } from "@/components/admin/user-status-badge";
import { RoleDropdown } from "@/components/admin/role-dropdown";
import { UserActionsMenu } from "@/components/admin/user-actions-menu";
import { AddUserDialog } from "@/components/admin/add-user-dialog";
import { RejectReasonDialog } from "@/components/admin/reject-reason-dialog";
import { EditDiscordDialog } from "@/components/admin/edit-discord-dialog";
import { ChevronDown, Plus, Search } from "lucide-react";

export default function AdminUsersPage() {
  const users = useAdminUsers();
  const forms = useAdminUserForms({
    mutate: users.mutate,
    runUserAction: users.runUserAction,
    updateUser: users.updateUser,
  });

  function handleMenuAction(user: UserItem, action: AdminAction) {
    if (action === "REJECT") {
      forms.openRejectDialog(user);
      return;
    }
    if (action === "EDIT_DISCORD") {
      forms.openEditDiscordDialog(user);
      return;
    }
    users.runUserAction(user.id, action);
  }

  return (
    <>
      <AppHeader title="User Management" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-400 pb-20">
          {/* Toolbar */}
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative w-full lg:max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search size={18} className="text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Search by email or name..."
                value={users.search}
                onChange={(e) => users.setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-[#131B2F] dark:text-slate-200 dark:placeholder-slate-500"
              />
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-wrap items-center gap-3 lg:gap-4">
              {/* Show Deleted Toggle */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-[#131B2F]">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Show deleted
                </span>
                <button
                  onClick={() => users.setShowDeleted(!users.showDeleted)}
                  disabled={users.fetching}
                  className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                    users.showDeleted ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                >
                  <div
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                      users.showDeleted ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* Role Filter */}
              <div className="relative">
                <select
                  value={users.roleFilter}
                  onChange={(e) => users.setRoleFilter(e.target.value)}
                  disabled={users.fetching}
                  className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-4 text-sm font-medium text-slate-700 shadow-sm transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-[#131B2F] dark:text-slate-300"
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
                onClick={() => forms.setShowAddDialog(true)}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold whitespace-nowrap text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-900 dark:hover:bg-emerald-400"
              >
                <Plus size={18} />
                <span>Add User</span>
              </button>
            </div>
          </div>

          {/* Loading */}
          {users.loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {!users.loading && users.visibleUsers.length > 0 && (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block dark:border-slate-800 dark:bg-[#131B2F]">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-[#0B1120]/50 dark:text-slate-400">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Last Login</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {users.visibleUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="group transition-colors hover:bg-slate-50 dark:hover:bg-[#1A233A]/50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold shadow-sm ${
                                avatarColors[user.role] ||
                                "border-slate-300 bg-slate-200 text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {getInitials(user.displayName, user.email)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-200">
                                {user.displayName || user.email}
                              </div>
                              <div className="text-xs font-medium text-slate-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <RoleDropdown
                            role={user.role}
                            onChange={(role) => users.updateUser(user.id, { role })}
                            disabled={users.busyUserId === user.id}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <UserStatusBadge status={user.status} />
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <UserActionsMenu
                            user={user}
                            onAction={handleMenuAction}
                            disabled={users.busyUserId === user.id}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="space-y-4 md:hidden">
                {users.visibleUsers.map((user) => (
                  <div
                    key={user.id}
                    className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#131B2F]"
                  >
                    <div className="absolute top-4 right-4">
                      <UserActionsMenu
                        user={user}
                        onAction={handleMenuAction}
                        disabled={users.busyUserId === user.id}
                      />
                    </div>
                    <div className="mb-5 flex items-center gap-4 pr-10">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full border text-base font-bold shadow-sm ${
                          avatarColors[user.role] ||
                          "border-slate-300 bg-slate-200 text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {getInitials(user.displayName, user.email)}
                      </div>
                      <div>
                        <div className="text-lg font-bold text-slate-900 dark:text-slate-200">
                          {user.displayName || user.email}
                        </div>
                        <div className="text-sm font-medium text-slate-500">{user.email}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800/50 dark:bg-[#0B1120]/50">
                      <div>
                        <p className="mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                          Role
                        </p>
                        <RoleDropdown
                          role={user.role}
                          onChange={(role) => users.updateUser(user.id, { role })}
                          disabled={users.busyUserId === user.id}
                        />
                      </div>
                      <div>
                        <p className="mb-2.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                          Status
                        </p>
                        <UserStatusBadge status={user.status} />
                      </div>
                      <div className="col-span-2 pt-2">
                        <p className="mb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
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

          {!users.loading && users.visibleUsers.length === 0 && (
            <div className="py-12 text-center text-slate-500">No users found.</div>
          )}
        </div>
      </div>

      <AddUserDialog
        open={forms.showAddDialog}
        onOpenChange={forms.setShowAddDialog}
        email={forms.newEmail}
        onEmailChange={forms.setNewEmail}
        displayName={forms.newDisplayName}
        onDisplayNameChange={forms.setNewDisplayName}
        password={forms.newPassword}
        onPasswordChange={forms.setNewPassword}
        role={forms.newRole}
        onRoleChange={forms.setNewRole}
        loading={forms.addLoading}
        onSubmit={forms.handleAddUser}
      />

      <RejectReasonDialog
        target={forms.rejectTarget}
        reason={forms.rejectReason}
        onReasonChange={forms.setRejectReason}
        loading={forms.rejectLoading}
        onSubmit={forms.submitReject}
        onCancel={forms.closeRejectDialog}
      />

      <EditDiscordDialog
        target={forms.editDiscordTarget}
        onClose={forms.closeEditDiscordDialog}
        onSubmit={forms.submitEditDiscord}
      />
    </>
  );
}
