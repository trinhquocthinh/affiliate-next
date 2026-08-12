import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/swr-fetcher";

export function useAffiliateDiscordLink() {
  const [discordId, setDiscordId] = useState<string | null>(null);
  const [discordIdInput, setDiscordIdInput] = useState("");
  const [discordLinking, setDiscordLinking] = useState(false);
  const [discordExpanded, setDiscordExpanded] = useState(false);

  // Fetch Discord link status
  useEffect(() => {
    apiFetch<{ ok: boolean; data?: { discordId: string | null } }>("/api/users/me/discord")
      .then((data) => {
        if (data.ok && data.data) {
          setDiscordId(data.data.discordId);
          setDiscordIdInput(data.data.discordId || "");
        }
      })
      .catch(() => {});
  }, []);

  async function saveDiscordLink() {
    setDiscordLinking(true);
    try {
      const data = await apiFetch<{
        ok: boolean;
        data?: { discordId: string | null };
        error?: { message?: string };
      }>("/api/users/me/discord", {
        method: "PUT",
        body: JSON.stringify({ discordId: discordIdInput.trim() || null }),
      });
      if (!data.ok || !data.data) {
        toast.error(data.error?.message || "Lỗi khi lưu Discord ID");
        return;
      }
      setDiscordId(data.data.discordId);
      toast.success(data.data.discordId ? "Đã liên kết Discord!" : "Đã gỡ liên kết Discord");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi kết nối");
    } finally {
      setDiscordLinking(false);
    }
  }

  async function unlinkDiscord() {
    setDiscordIdInput("");
    setDiscordLinking(true);
    try {
      const data = await apiFetch<{ ok: boolean }>("/api/users/me/discord", {
        method: "PUT",
        body: JSON.stringify({ discordId: null }),
      });
      if (data.ok) {
        setDiscordId(null);
        toast.success("Đã gỡ liên kết Discord");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi kết nối");
    } finally {
      setDiscordLinking(false);
    }
  }

  return {
    discordId,
    discordIdInput,
    setDiscordIdInput,
    discordLinking,
    discordExpanded,
    setDiscordExpanded,
    saveDiscordLink,
    unlinkDiscord,
  };
}
