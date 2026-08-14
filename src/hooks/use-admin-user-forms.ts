import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/swr-fetcher";
import type { AdminAction, UserItem, UsersResponse } from "@/lib/user-status";

export function useAdminUserForms({
  mutate,
  runUserAction,
  updateUser,
}: {
  mutate: () => void;
  runUserAction: (userId: string, action: AdminAction, reason?: string) => Promise<boolean>;
  updateUser: (userId: string, updates: Record<string, unknown>) => Promise<void>;
}) {
  // Add User dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("BUYER");

  async function handleAddUser(e: FormEvent) {
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
        setNewEmail("");
        setNewDisplayName("");
        setNewPassword("");
        setNewRole("BUYER");
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

  // Reject-reason dialog
  const [rejectTarget, setRejectTarget] = useState<UserItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  function openRejectDialog(user: UserItem) {
    setRejectTarget(user);
    setRejectReason("");
  }

  function closeRejectDialog() {
    setRejectTarget(null);
    setRejectReason("");
  }

  async function submitReject(e: FormEvent) {
    e.preventDefault();
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    setRejectLoading(true);
    const ok = await runUserAction(rejectTarget.id, "REJECT", reason);
    setRejectLoading(false);
    if (ok) closeRejectDialog();
  }

  // Edit Discord ID
  const [editDiscordTarget, setEditDiscordTarget] = useState<UserItem | null>(null);

  function openEditDiscordDialog(user: UserItem) {
    setEditDiscordTarget(user);
  }

  function closeEditDiscordDialog() {
    setEditDiscordTarget(null);
  }

  async function submitEditDiscord(userId: string, discordId: string | null) {
    await updateUser(userId, { discordId });
    closeEditDiscordDialog();
    toast.success("Đã cập nhật Discord ID");
  }

  return {
    showAddDialog,
    setShowAddDialog,
    addLoading,
    newEmail,
    setNewEmail,
    newDisplayName,
    setNewDisplayName,
    newPassword,
    setNewPassword,
    newRole,
    setNewRole,
    handleAddUser,
    rejectTarget,
    rejectReason,
    setRejectReason,
    rejectLoading,
    openRejectDialog,
    closeRejectDialog,
    submitReject,
    editDiscordTarget,
    openEditDiscordDialog,
    closeEditDiscordDialog,
    submitEditDiscord,
  };
}
