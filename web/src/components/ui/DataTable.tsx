"use client";

import clsx from "clsx";
import { useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";

export type Column<T> = {
  key: string;
  header: string;
  align?: "left" | "right";
  sortValue?: (row: T) => string | number;
  render: (row: T) => ReactNode;
};

const HEADER_CELL = "px-3 py-2.5 text-xs font-medium whitespace-nowrap first:pl-0 last:pr-0";
const BODY_CELL = "px-3 py-3 first:pl-0 last:pr-0";
const PAGE_SIZE = 10;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  paginate = false,
  emptyMessage = "No results found.",
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  paginate?: boolean;
  emptyMessage?: string;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  function handleSort(column: Column<T>) {
    if (!column.sortValue) return;
    if (sortKey === column.key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column.key);
      setSortDir("desc");
    }
    setPage(1);
  }

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sortKey);
    if (!column?.sortValue) return rows;
    const direction = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = column.sortValue!(a);
      const right = column.sortValue!(b);
      if (typeof left === "string" || typeof right === "string") {
        return String(left).localeCompare(String(right)) * direction;
      }
      return ((left as number) - (right as number)) * direction;
    });
  }, [rows, columns, sortKey, sortDir]);

  const pageCount = paginate ? Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)) : 1;
  const currentPage = Math.min(page, pageCount);
  const pageRows = paginate ? sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) : sorted;

  if (rows.length === 0) {
    return <EmptyState title={emptyMessage} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-x-auto">
        <table className="w-full">
          <thead className="text-left text-text-secondary">
            <tr className="border-b border-border">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={clsx(HEADER_CELL, column.align === "right" && "text-right")}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column)}
                      className={clsx(
                        "inline-flex items-center gap-1 transition-colors hover:text-text-primary",
                        column.align === "right" && "flex-row-reverse",
                        sortKey === column.key && "font-semibold text-text-primary",
                      )}
                    >
                      {column.header}
                      {sortKey === column.key && <span className="text-[10px]">{sortDir}</span>}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={rowKey(row)} className="h-12 border-b border-border transition-colors hover:bg-surface-raised">
                {columns.map((column) => (
                  <td key={column.key} className={clsx(BODY_CELL, column.align === "right" && "text-right tabular-nums")}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paginate && (
        <div className="flex flex-col items-center gap-2 text-text-secondary">
          <p>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-button border border-border px-3 py-1.5 transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="tabular-nums">
              Page {currentPage} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage === pageCount}
              className="rounded-button border border-border px-3 py-1.5 transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
