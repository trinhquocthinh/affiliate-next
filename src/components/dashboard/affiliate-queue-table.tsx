"use client";

import { Button } from "@/components/ui/button";
import { Columns3Icon, ChevronLeftIcon, ChevronRightIcon, GripVerticalIcon } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  renderAffiliateCell,
  type AffiliateQueueRow,
} from "@/components/dashboard/affiliate-queue-cells";
import type { AffiliateColumnId, EffectiveColumn } from "@/lib/affiliate-columns";
import { PAGE_SIZE, type QueueItem } from "@/lib/affiliate-queue";

function SortableHeader({
  id,
  label,
  draggable,
}: {
  id: AffiliateColumnId;
  label: string;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !draggable,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: draggable ? "grab" : "default",
  };
  return (
    <th
      ref={setNodeRef}
      style={style}
      className="px-5 py-4 select-none"
      {...attributes}
      {...(draggable ? listeners : {})}
    >
      <span className="inline-flex items-center gap-1.5">
        {draggable && (
          <GripVerticalIcon size={12} className="shrink-0 text-slate-300 dark:text-slate-600" />
        )}
        {label}
      </span>
    </th>
  );
}

export function AffiliateQueueTable({
  visibleColumns,
  items,
  onRowClick,
  onColumnReorder,
  onResetColumnDefaults,
  page,
  totalPages,
  total,
  onPageChange,
}: {
  visibleColumns: EffectiveColumn[];
  items: QueueItem[];
  onRowClick: (item: QueueItem) => void;
  onColumnReorder: (activeId: AffiliateColumnId, overId: AffiliateColumnId) => void;
  onResetColumnDefaults: () => void;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  // dnd-kit sensors — small activation distance so click-targets (sort header
  // text, dropdown trigger) still fire when the user merely clicks.
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleColumnDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onColumnReorder(active.id as AffiliateColumnId, over.id as AffiliateColumnId);
  }

  return (
    <>
      <div className="hidden overflow-hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm lg:block dark:border-slate-800/80 dark:bg-[#131B2F]">
        {visibleColumns.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Columns3Icon className="mb-3 h-10 w-10 text-slate-400 dark:text-slate-500" />
            <h3 className="mb-2 text-base font-bold text-slate-900 dark:text-white">
              All columns are hidden
            </h3>
            <p className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">
              Enable at least one column from the Columns menu, or restore the defaults.
            </p>
            <Button size="sm" variant="outline" onClick={onResetColumnDefaults}>
              Restore default columns
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleColumnDragEnd}
          >
            <table className="w-full text-left text-sm whitespace-nowrap text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:border-slate-800/80 dark:bg-[#0B1120]/50 dark:text-slate-400">
                <SortableContext
                  items={visibleColumns.map((c) => c.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <tr>
                    {visibleColumns.map((col) => (
                      <SortableHeader
                        key={col.id}
                        id={col.id}
                        label={col.label}
                        draggable={!col.mandatory}
                      />
                    ))}
                  </tr>
                </SortableContext>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#1A233A]/50"
                    onClick={() => onRowClick(item)}
                  >
                    {visibleColumns.map((col) => (
                      <td key={col.id} className="px-5 py-3.5">
                        {renderAffiliateCell(item as AffiliateQueueRow, col.id)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </DndContext>
        )}
      </div>

      {/* Desktop Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 hidden items-center justify-between lg:flex">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
