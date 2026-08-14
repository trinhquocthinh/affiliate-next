"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { apiFetch } from "@/lib/swr-fetcher";
import {
  AFFILIATE_COLUMNS,
  getDefaultAllowedColumnIds,
  getDefaultPreferences,
  parseAllowedColumns,
  parseColumnPreferences,
  resolveEffectiveColumns,
  type AffiliateColumnId,
  type ColumnPreference,
  type EffectiveColumn,
} from "@/lib/affiliate-columns";

type PrefsResponse = {
  ok: boolean;
  data?: {
    columns: ColumnPreference[] | null;
    allowedColumns: AffiliateColumnId[];
  };
};

const SAVE_DEBOUNCE_MS = 500;

export function useAffiliateColumns() {
  const {
    data: prefsResp,
    isLoading: prefsLoading,
    mutate: mutatePrefs,
  } = useSWR<PrefsResponse>("/api/users/me/preferences");

  const allowedColumns: AffiliateColumnId[] =
    prefsResp?.ok && prefsResp.data?.allowedColumns
      ? parseAllowedColumns(JSON.stringify(prefsResp.data.allowedColumns))
      : getDefaultAllowedColumnIds();

  const storedPrefs: ColumnPreference[] =
    prefsResp?.ok && prefsResp.data?.columns
      ? parseColumnPreferences(prefsResp.data.columns)
      : getDefaultPreferences();

  // Local state mirrors server prefs but is the source of truth for the UI so
  // toggles/drags feel instant. We re-sync only when the user has no pending
  // edits.
  const [localPrefs, setLocalPrefs] = useState<ColumnPreference[]>(storedPrefs);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (dirtyRef.current) return;
    setLocalPrefs(storedPrefs);
    // We intentionally serialize storedPrefs for the dep to avoid identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(storedPrefs)]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedulePersist = useCallback(
    (next: ColumnPreference[]) => {
      dirtyRef.current = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await apiFetch("/api/users/me/preferences", {
            method: "PATCH",
            body: JSON.stringify({ columns: next }),
          });
          dirtyRef.current = false;
          mutatePrefs(
            (prev) =>
              prev
                ? ({
                    ...prev,
                    ok: true,
                    data: { ...(prev.data ?? { allowedColumns }), columns: next },
                  } as PrefsResponse)
                : ({ ok: true, data: { columns: next, allowedColumns } } as PrefsResponse),
            { revalidate: false },
          );
        } catch {
          // SWR global onError toasts; keep dirty so a later save retries.
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [mutatePrefs, allowedColumns],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const columns: EffectiveColumn[] = resolveEffectiveColumns(allowedColumns, localPrefs);

  const setVisibility = useCallback(
    (id: AffiliateColumnId, visible: boolean) => {
      setLocalPrefs((prev) => {
        // Build from current effective so non-pref columns become real entries.
        const effective = resolveEffectiveColumns(allowedColumns, prev);
        const next = effective.map((c) => ({
          id: c.id,
          visible: c.id === id ? visible : c.visible,
          order: c.order,
        }));
        schedulePersist(next);
        return next;
      });
    },
    [allowedColumns, schedulePersist],
  );

  const reorder = useCallback(
    (activeId: AffiliateColumnId, overId: AffiliateColumnId) => {
      if (activeId === overId) return;
      setLocalPrefs((prev) => {
        const effective = resolveEffectiveColumns(allowedColumns, prev);
        const fromIdx = effective.findIndex((c) => c.id === activeId);
        const toIdx = effective.findIndex((c) => c.id === overId);
        if (fromIdx < 0 || toIdx < 0) return prev;
        // Mandatory columns are pinned: refuse moves that affect them.
        const movingMandatory = !!effective[fromIdx].mandatory;
        const targetMandatory = !!effective[toIdx].mandatory;
        if (movingMandatory || targetMandatory) return prev;
        const copy = [...effective];
        const [moved] = copy.splice(fromIdx, 1);
        copy.splice(toIdx, 0, moved);
        const next: ColumnPreference[] = copy.map((c, idx) => ({
          id: c.id,
          visible: c.visible,
          order: idx,
        }));
        schedulePersist(next);
        return next;
      });
    },
    [allowedColumns, schedulePersist],
  );

  const resetDefaults = useCallback(() => {
    const next = AFFILIATE_COLUMNS.map((c, idx) => ({
      id: c.id,
      visible: true,
      order: idx,
    }));
    setLocalPrefs(next);
    schedulePersist(next);
  }, [schedulePersist]);

  return {
    columns,
    allowedColumns,
    setVisibility,
    reorder,
    resetDefaults,
    isLoading: prefsLoading,
  };
}
