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
import { ChevronDown, Plus, Search } from "lucide-react";

export default function AdminUsersPage() {
  const users = useAdminUsers();
  const forms = useAdminUserForms({ mutate: users.mutate, runUserAction: users.runUserAction });

  function handleMenuAction(user: UserItem, action: AdminAction) {
    if (action === "REJECT") {
      forms.openRejectDialog(user);
      return;
    }
    users.runUserAction(user.id, action);
  }

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
                value={users.search}
                onChange={(e) => users.setSearch(e.target.value)}
                className="w-full bg-white dark:bg-[#131B2F] border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
              />
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-wrap items-center gap-3 lg:gap-4">

              {/* Show Deleted Toggle */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#131B2F] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Show deleted</span>
                <button
                  onClick={() => users.setShowDeleted(!users.showDeleted)}
                  disabled={users.fetching}
                  className={`w-11 h-6 rounded-full relative transition-colors focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${users.showDeleted ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${users.showDeleted ? "left-6" : "left-1"
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
                onClick={() => forms.setShowAddDialog(true)}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-900 font-bold py-2.5 px-5 rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 whitespace-nowrap text-sm"
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
                    {users.visibleUsers.map((user) => (
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
                            onChange={(role) => users.updateUser(user.id, { role })}
                            disabled={users.busyUserId === user.id}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <UserStatusBadge status={user.status} />
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <UserActionsMenu user={user} onAction={handleMenuAction} disabled={users.busyUserId === user.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {users.visibleUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-white dark:bg-[#131B2F] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative"
                  >
                    <div className="absolute top-4 right-4">
                      <UserActionsMenu user={user} onAction={handleMenuAction} disabled={users.busyUserId === user.id} />
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
                          onChange={(role) => users.updateUser(user.id, { role })}
                          disabled={users.busyUserId === user.id}
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2.5 uppercase font-bold tracking-wider">
                          Status
                        </p>
                        <UserStatusBadge status={user.status} />
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

          {!users.loading && users.visibleUsers.length === 0 && (
            <div className="text-center py-12 text-slate-500">No users found.</div>
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
    </>
  );
}
