"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { apiFetch } from "@/lib/swr-fetcher";
import { PlusIcon, TrashIcon, CheckCircleIcon, CopyIcon, AlertTriangleIcon, Loader2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { detectPlatformFromUrl, type DetectedPlatform } from "@/lib/url-utils";

type ProductItem = {
  id: string;
  productUrl: string;
  productName: string;
  isNameAutoFilled: boolean;
  detectedPlatform: DetectedPlatform | null;
  urlError: string | null;
  isLoadingName: boolean;
};

type CreatedResult = {
  requestId: string;
  status: string;
  duplicateDetected: boolean;
  duplicateOfRequestId: string | null;
};

let nextItemId = 1;
function createEmptyItem(): ProductItem {
  return {
    id: String(nextItemId++),
    productUrl: "",
    productName: "",
    isNameAutoFilled: false,
    detectedPlatform: null,
    urlError: null,
    isLoadingName: false,
  };
}

const PLATFORM_BADGE: Record<DetectedPlatform, { label: string; className: string }> = {
  SHOPEE: { label: "Shopee", className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  TIKTOK: { label: "TikTok", className: "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30" },
  OTHER: { label: "Other", className: "text-slate-400 bg-slate-500/10 border-slate-500/30" },
};

export default function BuyerRequestPage() {
  const [items, setItems] = useState<ProductItem[]>([createEmptyItem()]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CreatedResult[] | null>(null);

  const previewTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const isBatch = items.length > 1;

  function addItem() {
    if (items.length >= 50) { toast.error("Maximum 50 items per batch"); return; }
    setItems((prev) => [...prev, createEmptyItem()]);
  }

  function removeItem(id: string) {
    if (items.length <= 1) return;
    clearTimeout(previewTimers.current.get(id));
    previewTimers.current.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateItemField(id: string, field: "productName", value: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value, isNameAutoFilled: false } : i)),
    );
  }

  const handleUrlChange = useCallback((id: string, value: string) => {
    const detection = detectPlatformFromUrl(value);

    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
            ...i,
            productUrl: value,
            detectedPlatform: detection.platform,
            urlError: detection.errorMessage ?? null,
            isLoadingName: detection.errorMessage ? false : i.isLoadingName,
            productName: i.isNameAutoFilled ? "" : i.productName,
            isNameAutoFilled: i.isNameAutoFilled ? false : i.isNameAutoFilled,
          }
          : i,
      ),
    );

    clearTimeout(previewTimers.current.get(id));

    if (!detection.errorMessage && value.trim()) {
      const timer = setTimeout(async () => {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isLoadingName: true } : i)),
        );
        try {
          const data = await apiFetch<{ ok: boolean; data?: { title?: string } }>(
            `/api/preview?url=${encodeURIComponent(value.trim())}`,
          );
          if (data.ok && data.data?.title) {
            const title = data.data.title;
            setItems((prev) =>
              prev.map((i) =>
                i.id === id
                  ? {
                    ...i,
                    isLoadingName: false,
                    productName: i.productName.trim() ? i.productName : title,
                    isNameAutoFilled: !i.productName.trim(),
                  }
                  : i,
              ),
            );
          } else {
            setItems((prev) =>
              prev.map((i) => (i.id === id ? { ...i, isLoadingName: false } : i)),
            );
          }
        } catch {
          setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, isLoadingName: false } : i)),
          );
        }
      }, 500);
      previewTimers.current.set(id, timer);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validItems = items.filter((i) => i.productUrl.trim());
    if (validItems.length === 0) {
      toast.error("Please enter at least one product URL");
      return;
    }

    const hasErrors = validItems.some((i) => i.urlError);
    if (hasErrors) {
      toast.error("Please fix the URL errors before submitting");
      return;
    }

    const platforms = new Set(validItems.map((i) => i.detectedPlatform ?? "OTHER"));
    if (platforms.size > 1) {
      toast.error(
        "All products in a batch must be from the same platform. Please split into separate submissions.",
      );
      return;
    }
    const platform = [...platforms][0] as string;

    setLoading(true);
    try {
      let body: Record<string, unknown>;
      if (validItems.length === 1) {
        body = {
          productUrl: validItems[0].productUrl.trim(),
          platform,
          productName: validItems[0].productName.trim() || undefined,
        };
      } else {
        body = {
          items: validItems.map((i) => ({
            productUrl: i.productUrl.trim(),
            productName: i.productName.trim() || undefined,
          })),
          platform,
        };
      }

      const data = await apiFetch<{
        ok: boolean;
        data?: { items?: CreatedResult[]; createdCount?: number; requestId?: string };
        error?: { message?: string };
      }>("/api/requests", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!data.ok) { toast.error(data.error?.message || "Failed to create request"); return; }
      if (data.data?.items) {
        setResults(data.data.items);
        toast.success(`Created ${data.data.createdCount} request(s)`);
      } else if (data.data) {
        setResults([data.data as unknown as CreatedResult]);
        toast.success(`Request ${data.data.requestId} created`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setResults(null);
    setItems([createEmptyItem()]);
  }

  function copyRequestId(id: string) {
    navigator.clipboard.writeText(id);
    toast.success("Copied!");
  }

  const hasAnyUrlError = items.some((i) => i.productUrl.trim() && i.urlError);

  if (results) {
    return (
      <>
        <AppHeader title="New Request" />
        <div className="flex-1 p-4 md:p-6">
          <Card className="max-w-2xl mx-auto bg-[#131B2F] border-slate-800">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <CheckCircleIcon className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl text-white">
                {results.length === 1 ? "Request Created!" : `${results.length} Requests Created!`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.map((r) => (
                <div key={r.requestId} className="flex items-center justify-between rounded-lg border border-slate-700 bg-[#0B1120] p-3">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm font-medium text-slate-200">{r.requestId}</code>
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">{r.status}</Badge>
                    {r.duplicateDetected && (
                      <Badge variant="secondary" className="text-xs text-amber-400 bg-amber-500/10">
                        <AlertTriangleIcon className="mr-1 h-3 w-3" />Duplicate
                      </Badge>
                    )}
                  </div>
                  <button onClick={() => copyRequestId(r.requestId)} className="text-slate-400 hover:text-emerald-400 transition-colors p-1">
                    <CopyIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={resetForm}
                className="mt-4 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Create Another
              </button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="New Request" />
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="max-w-1xl mx-auto w-full pb-20 animate-in fade-in duration-500">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
              Create New Request
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Add products you want affiliates to promote.
            </p>
          </div>

          <div className="space-y-4">
            {/* Products header */}
            <div className="flex justify-between items-center px-1 mb-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Products</span>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{items.length}/50</span>
            </div>

            {/* Product Cards */}
            {items.map((item, index) => {
              const platformBadge = item.detectedPlatform
                ? PLATFORM_BADGE[item.detectedPlatform]
                : null;
              const urlHasError = Boolean(item.urlError);

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#131B2F] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm relative group transition-all"
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 font-bold px-2.5 py-1 rounded-md text-[11px]">
                        #{index + 1}
                      </span>
                      {platformBadge && (
                        <span className={`text-xs font-semibold px-2 py-1 rounded border ${platformBadge.className}`}>
                          {platformBadge.label}
                        </span>
                      )}
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors p-1"
                        title="Remove product"
                      >
                        <TrashIcon size={16} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                        Product URL <span className="text-emerald-500">*</span>
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={item.productUrl}
                        onChange={(e) => handleUrlChange(item.id, decodeURIComponent(e.target.value.split("?")[0]))}
                        className={`w-full bg-slate-50 dark:bg-[#0B1120] border rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all shadow-sm ${urlHasError
                            ? "border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                            : "border-slate-200 dark:border-slate-800/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          }`}
                      />
                      {urlHasError && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                          <AlertTriangleIcon size={12} />
                          {item.urlError}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                        Product Name{" "}
                        <span className="text-slate-400 dark:text-slate-500 font-medium normal-case tracking-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={item.isLoadingName ? "Fetching product name..." : "e.g. Nike Air Max 90"}
                          value={item.productName}
                          onChange={(e) => updateItemField(item.id, "productName", e.target.value)}
                          disabled={item.isLoadingName}
                          className="w-full bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm disabled:opacity-60 disabled:cursor-wait"
                        />
                        {item.isLoadingName && (
                          <Loader2Icon
                            size={14}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Another Button */}
            {items.length < 50 && (
              <button
                type="button"
                onClick={addItem}
                className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700/80 rounded-2xl py-4 flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 transition-all font-semibold text-sm mb-6 group"
              >
                <PlusIcon size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                <span>Add another product</span>
              </button>
            )}

            <hr className="border-slate-200 dark:border-slate-800/80 my-8" />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || hasAnyUrlError}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-slate-900 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm tracking-wide flex items-center justify-center gap-2"
            >
              {loading
                ? "Creating..."
                : isBatch
                  ? `Submit ${items.filter((i) => i.productUrl.trim() && !i.urlError).length} Request(s)`
                  : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}