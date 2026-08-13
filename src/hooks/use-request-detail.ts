import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { useActor } from "@/components/layout/actor-provider";
import { apiFetch } from "@/lib/swr-fetcher";
import { computeRequestPermissions } from "@/lib/request-status";
import { usePermissions } from "@/hooks/use-permissions";

export type RequestDetail = {
  id: string;
  createdAt: string;
  platform: string;
  productUrlRaw: string;
  productName: string | null;
  affiliateLink: string | null;
  filledAt: string | null;
  status: string;
  closeReason: string | null;
  orderId: string | null;
  notes: string | null;
  buyerNote: string | null;
  isStale: boolean;
  ageHours: number;
  lastUpdatedAt: string;
  createdBy: { displayName: string | null; email: string };
  affiliateOwner: { displayName: string | null; email: string } | null;
};

type RequestDetailResponse = { ok: boolean; data?: RequestDetail; error?: { message?: string } };

export function useRequestDetail({
  requestId,
  open,
  onOpenChange,
  onMutated,
}: {
  requestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMutated?: () => void;
}) {
  const actor = useActor();
  const { hasPermission, getPermissionScope } = usePermissions();
  const swrKey = open && requestId ? `/api/requests/${requestId}` : null;
  const {
    data: swrData,
    isLoading: swrLoading,
    mutate,
  } = useSWR<RequestDetailResponse>(swrKey);

  const data: RequestDetail | null = swrData?.ok && swrData.data ? swrData.data : null;
  const loading = swrLoading;

  // Form state
  const [buyerNote, setBuyerNote] = useState("");
  const [editProductUrl, setEditProductUrl] = useState("");
  const [editPlatform, setEditPlatform] = useState("");
  const [editProductName, setEditProductName] = useState("");
  const [affiliateLink, setAffiliateLink] = useState("");
  const [affNote, setAffNote] = useState("");
  const [closeReason, setCloseReason] = useState("BOUGHT");
  const [closeNote, setCloseNote] = useState("");
  const [orderId, setOrderId] = useState("");
  const [adminOrderId, setAdminOrderId] = useState("");
  const [adminBuyerNote, setAdminBuyerNote] = useState("");
  const [busy, setBusy] = useState<string>("");

  // Sync form state from fetched data
  useEffect(() => {
    if (!data) return;
    setBuyerNote(data.buyerNote || "");
    setEditProductUrl(data.productUrlRaw);
    setEditPlatform(data.platform);
    setEditProductName(data.productName || "");
    setAffiliateLink(data.affiliateLink || "");
    setAffNote(data.notes || "");
    setCloseReason("BOUGHT");
    setCloseNote("");
    setOrderId("");
    setAdminOrderId(data.orderId || "");
    setAdminBuyerNote(data.buyerNote || "");
  }, [data]);

  // Handle fetch errors
  useEffect(() => {
    if (swrData && !swrData.ok) {
      toast.error(swrData.error?.message || "Failed to load request");
      onOpenChange(false);
    }
  }, [swrData, onOpenChange]);

  function notifyMutation() {
    onMutated?.();
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    toast.success("Copied!");
  }

  // ─── Mutations ───────────────────────────────────────────────────────────

  async function handleSaveEdit() {
    if (!data) return;
    setBusy("edit");
    try {
      const body: Record<string, unknown> = {
        expectedLastUpdatedAt: data.lastUpdatedAt,
      };
      if (editProductUrl !== data.productUrlRaw) body.productUrl = editProductUrl;
      if (editPlatform !== data.platform) body.platform = editPlatform;
      if (editProductName !== (data.productName || ""))
        body.productName = editProductName || null;
      const json = await apiFetch<{ ok: boolean; error?: { message?: string } }>(
        `/api/requests/${data.id}/edit`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      if (json.ok) {
        toast.success("Request updated");
        await mutate();
        notifyMutation();
      } else {
        toast.error(json.error?.message || "Failed to update");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusy("");
    }
  }

  async function handleSaveBuyerNote() {
    if (!data) return;
    setBusy("buyerNote");
    try {
      const json = await apiFetch<{ ok: boolean; error?: { message?: string } }>(
        `/api/requests/${data.id}/buyer-note`,
        {
          method: "POST",
          body: JSON.stringify({ buyerNote, expectedLastUpdatedAt: data.lastUpdatedAt }),
        },
      );
      if (json.ok) {
        toast.success("Note saved");
        await mutate();
        notifyMutation();
      } else {
        toast.error(json.error?.message || "Failed to save note");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setBusy("");
    }
  }

  async function handleFill() {
    if (!data) return;
    setBusy("fill");
    try {
      const json = await apiFetch<{ ok: boolean; error?: { message?: string } }>(
        `/api/affiliate/${data.id}/fill`,
        {
          method: "POST",
          body: JSON.stringify({
            affiliateLink: affiliateLink.trim(),
            note: affNote || undefined,
            expectedLastUpdatedAt: data.lastUpdatedAt,
          }),
        },
      );
      if (json.ok) {
        toast.success("Saved");
        await mutate();
        notifyMutation();
      } else {
        toast.error(json.error?.message || "Failed to save");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy("");
    }
  }

  async function handleClose() {
    if (!data) return;
    setBusy("close");
    try {
      const json = await apiFetch<{ ok: boolean; error?: { message?: string } }>(
        `/api/requests/${data.id}/close`,
        {
          method: "POST",
          body: JSON.stringify({
            closeReason,
            closeNote: closeNote || undefined,
            orderId: closeReason === "BOUGHT" ? orderId : undefined,
            expectedLastUpdatedAt: data.lastUpdatedAt,
          }),
        },
      );
      if (json.ok) {
        toast.success("Request closed");
        onOpenChange(false);
        notifyMutation();
      } else {
        toast.error(json.error?.message || "Failed to close");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to close");
    } finally {
      setBusy("");
    }
  }

  async function handleAdminCorrect() {
    if (!data) return;
    setBusy("adminCorrect");
    try {
      const json = await apiFetch<{ ok: boolean; error?: { message?: string } }>(
        `/api/requests/${data.id}/admin-correct`,
        {
          method: "PATCH",
          body: JSON.stringify({
            orderId: adminOrderId || null,
            buyerNote: adminBuyerNote || null,
          }),
        },
      );
      if (json.ok) {
        toast.success("Correction saved");
        await mutate();
        notifyMutation();
      } else {
        toast.error(json.error?.message || "Failed to save");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy("");
    }
  }

  const { isOwner, canBuyerEdit, canAffiliateAct, canAdminCorrect, canBuyerNote } = computeRequestPermissions(
    data,
    actor,
    hasPermission,
    getPermissionScope,
  );

  return {
    data,
    loading,
    busy,
    isOwner,
    canBuyerNote,
    canBuyerEdit,
    canAffiliateAct,
    canAdminCorrect,
    form: {
      buyerNote,
      setBuyerNote,
      editProductUrl,
      setEditProductUrl,
      editPlatform,
      setEditPlatform,
      editProductName,
      setEditProductName,
      affiliateLink,
      setAffiliateLink,
      affNote,
      setAffNote,
      closeReason,
      setCloseReason,
      closeNote,
      setCloseNote,
      orderId,
      setOrderId,
      adminOrderId,
      setAdminOrderId,
      adminBuyerNote,
      setAdminBuyerNote,
    },
    actions: {
      copyId,
      saveEdit: handleSaveEdit,
      saveBuyerNote: handleSaveBuyerNote,
      fill: handleFill,
      close: handleClose,
      adminCorrect: handleAdminCorrect,
    },
  };
}
