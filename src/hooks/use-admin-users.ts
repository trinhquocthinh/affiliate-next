import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { apiFetch } from "@/lib/swr-fetcher";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ACTION_SUCCESS_TOAST, type AdminAction, type UsersResponse } from "@/lib/user-status";

export function useAdminUsers() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [roleFilter, setRoleFilter] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

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

  const visibleUsers = showDeleted ? users : users.filter((u) => u.status !== "DELETED");

  return {
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    showDeleted,
    setShowDeleted,
    busyUserId,
    loading,
    fetching,
    users,
    visibleUsers,
    updateUser,
    runUserAction,
    mutate,
  };
}
