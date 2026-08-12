import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/swr-fetcher";
import type { QueueItem } from "@/lib/affiliate-queue";

/**
 * Kept separate from `use-request-detail.ts` on purpose: this modal has
 * fields/endpoints with no equivalent there — `subIdStamped` on fill, a
 * note-only save path against `/api/requests/:id/note` (distinct from
 * buyer-note/admin-correct), and an admin order-id edit against a plain
 * `PATCH /api/requests/:id` (distinct from admin-correct). Merging onto the
 * shared dialog would silently drop this behavior.
 */
export function useAffiliateDetail(onMutated: () => void) {
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [affiliateLink, setAffiliateLink] = useState("");
  const [note, setNote] = useState("");
  const [subIdStamped, setSubIdStamped] = useState(false);
  const [closeReason, setCloseReason] = useState("BOUGHT");
  const [closeNote, setCloseNote] = useState("");
  const [orderId, setOrderId] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [editOrderId, setEditOrderId] = useState("");

  function openDetail(item: QueueItem) {
    setSelected(item);
    setAffiliateLink(item.affiliateLink || "");
    setNote(item.notes || "");
    setSubIdStamped(false);
    setCloseReason("BOUGHT");
    setCloseNote("");
    setOrderId("");
    setEditOrderId(item.orderId || "");
  }

  function closeDetail() {
    setSelected(null);
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    toast.success("Copied!");
  }

  async function handleUpdateOrderId() {
    if (!selected) return;
    setActionLoading("editOrderId");
    try {
      const data = await apiFetch<{ ok: boolean; data?: { orderId: string }; error?: { message?: string } }>(
        `/api/requests/${selected.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ orderId: editOrderId.trim() }),
        },
      );
      if (data.ok && data.data) {
        toast.success("Order ID updated");
        const newOrderId = data.data.orderId;
        setSelected((prev) => (prev ? { ...prev, orderId: newOrderId } : null));
        onMutated();
      } else {
        toast.error(data.error?.message || "Failed to update Order ID");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update Order ID");
    } finally {
      setActionLoading("");
    }
  }

  async function handleSave() {
    if (!selected) return;
    setActionLoading("save");

    try {
      if (affiliateLink.trim()) {
        const data = await apiFetch<{ ok: boolean; error?: { message?: string } }>(
          `/api/affiliate/${selected.id}/fill`,
          {
            method: "POST",
            body: JSON.stringify({
              affiliateLink: affiliateLink.trim(),
              note: note.trim() || undefined,
              subIdStamped,
              expectedLastUpdatedAt: selected.lastUpdatedAt,
            }),
          },
        );
        if (data.ok) {
          toast.success("Saved successfully!");
          setSelected(null);
          onMutated();
        } else {
          toast.error(data.error?.message || "Failed to save");
        }
      } else if (note.trim() !== (selected.notes || "")) {
        const data = await apiFetch<{
          ok: boolean;
          data?: { lastUpdatedAt: string };
          error?: { message?: string };
        }>(`/api/requests/${selected.id}/note`, {
          method: "POST",
          body: JSON.stringify({
            note: note.trim(),
            expectedLastUpdatedAt: selected.lastUpdatedAt,
          }),
        });
        if (data.ok && data.data) {
          toast.success("Note saved");
          onMutated();
          const lastUpdatedAt = data.data.lastUpdatedAt;
          setSelected((prev) => (prev ? { ...prev, notes: note.trim(), lastUpdatedAt } : null));
        } else {
          toast.error(data.error?.message || "Failed to save");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setActionLoading("");
    }
  }

  async function handleClose() {
    if (!selected) return;
    setActionLoading("close");

    try {
      const data = await apiFetch<{ ok: boolean; error?: { message?: string } }>(
        `/api/requests/${selected.id}/close`,
        {
          method: "POST",
          body: JSON.stringify({
            closeReason,
            closeNote: closeNote.trim() || undefined,
            orderId: closeReason === "BOUGHT" ? orderId : undefined,
            expectedLastUpdatedAt: selected.lastUpdatedAt,
          }),
        },
      );

      if (data.ok) {
        toast.success("Request closed");
        setSelected(null);
        onMutated();
      } else {
        toast.error(data.error?.message || "Failed to close");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to close");
    } finally {
      setActionLoading("");
    }
  }

  return {
    selected,
    affiliateLink,
    setAffiliateLink,
    note,
    setNote,
    subIdStamped,
    setSubIdStamped,
    closeReason,
    setCloseReason,
    closeNote,
    setCloseNote,
    orderId,
    setOrderId,
    actionLoading,
    editOrderId,
    setEditOrderId,
    openDetail,
    closeDetail,
    copyId,
    handleUpdateOrderId,
    handleSave,
    handleClose,
  };
}
