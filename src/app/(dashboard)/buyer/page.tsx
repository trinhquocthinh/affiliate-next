"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  CopyIcon,
  AlertTriangleIcon,
} from "lucide-react";

const PLATFORMS = [
  { value: "SHOPEE", label: "Shopee", color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  { value: "TIKTOK", label: "TikTok", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  { value: "OTHER", label: "Other", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
];

type ProductItem = {
  id: string;
  productUrl: string;
  productName: string;
};

type CreatedResult = {
  requestId: string;
  status: string;
  duplicateDetected: boolean;
  duplicateOfRequestId: string | null;
};

let nextItemId = 1;
function createEmptyItem(): ProductItem {
  return { id: String(nextItemId++), productUrl: "", productName: "" };
}

export default function BuyerRequestPage() {
  const [platform, setPlatform] = useState("SHOPEE");
  const [items, setItems] = useState<ProductItem[]>([createEmptyItem()]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CreatedResult[] | null>(null);

  const isBatch = items.length > 1;

  function addItem() {
    if (items.length >= 50) {
      toast.error("Maximum 50 items per batch");
      return;
    }
    setItems([...items, createEmptyItem()]);
  }

  function removeItem(id: string) {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  }

  function updateItem(id: string, field: keyof ProductItem, value: string) {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate at least one URL
    const validItems = items.filter((i) => i.productUrl.trim());
    if (validItems.length === 0) {
      toast.error("Please enter at least one product URL");
      return;
    }

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

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.ok) {
        toast.error(data.error?.message || "Failed to create request");
        return;
      }

      if (data.data.items) {
        // Batch result
        setResults(data.data.items);
        toast.success(`Created ${data.data.createdCount} request(s)`);
      } else {
        // Single result
        setResults([data.data]);
        toast.success(`Request ${data.data.requestId} created`);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setResults(null);
    setItems([createEmptyItem()]);
    setPlatform("SHOPEE");
  }

  function copyRequestId(id: string) {
    navigator.clipboard.writeText(id);
    toast.success("Copied!");
  }

  // Success state
  if (results) {
    return (
      <>
        <AppHeader title="New Request" />
        <div className="flex-1 p-4 md:p-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircleIcon className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl">
                {results.length === 1
                  ? "Request Created!"
                  : `${results.length} Requests Created!`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.map((r) => (
                <div
                  key={r.requestId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm font-medium">
                      {r.requestId}
                    </code>
                    <Badge variant="outline" className="text-xs">
                      {r.status}
                    </Badge>
                    {r.duplicateDetected && (
                      <Badge variant="secondary" className="text-xs text-amber-600">
                        <AlertTriangleIcon className="mr-1 h-3 w-3" />
                        Duplicate
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyRequestId(r.requestId)}
                  >
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button onClick={resetForm} className="w-full mt-4">
                Create Another
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="New Request" />
      <div className="flex-1 p-4 md:p-6">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
          {/* Platform Selection */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Platform</Label>
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlatform(p.value)}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    platform === p.value
                      ? `${p.color} border-primary ring-2 ring-primary/20`
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Products</Label>
              <span className="text-sm text-muted-foreground">
                {items.length}/50
              </span>
            </div>

            {items.map((item, index) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                      #{index + 1}
                    </span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`url-${item.id}`} className="text-sm">
                      Product URL *
                    </Label>
                    <Input
                      id={`url-${item.id}`}
                      placeholder="https://..."
                      value={item.productUrl}
                      onChange={(e) =>
                        updateItem(item.id, "productUrl", e.target.value)
                      }
                      required={index === 0}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`name-${item.id}`} className="text-sm">
                      Product Name{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id={`name-${item.id}`}
                      placeholder="e.g. Nike Air Max 90"
                      value={item.productName}
                      onChange={(e) =>
                        updateItem(item.id, "productName", e.target.value)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="w-full border-dashed"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add another product
            </Button>
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading
              ? "Creating..."
              : isBatch
                ? `Submit ${items.filter((i) => i.productUrl.trim()).length} Request(s)`
                : "Submit Request"}
          </Button>
        </form>
      </div>
    </>
  );
}
