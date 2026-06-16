import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { searchMedicines } from "@/lib/medicines.functions";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ChevronLeft, ChevronRight, Database, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/medicines")({
  head: () => ({ meta: [{ title: "Medicines Workspace — MediScan AI" }] }),
  component: MedicinesPage,
});

const PAGE_SIZE = 100;

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function MedicinesPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounced(q, 350);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  const searchFn = useServerFn(searchMedicines);
  const statsFn = useServerFn(getDashboardStats);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["medicines", debouncedQ, page],
    queryFn: () => searchFn({ data: { q: debouncedQ, page, limit: PAGE_SIZE } }),
    placeholderData: keepPreviousData,
  });

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => statsFn(),
  });

  const meds = data?.medicines ?? [];
  const total = data?.total_records ?? 0;
  const totalPages = data?.total_pages ?? 1;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  const pageNumbers = useMemo(() => buildPager(page, totalPages), [page, totalPages]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Medicines Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Browse and search the complete medicine catalog.
        </p>
      </div>

      <Card className="card-elevated border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Medicine Database</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                Status: <span className="font-medium text-success">Ready</span>
              </div>
            </div>
          </div>
          <div className="flex gap-6">
            <div>
              <div className="text-xs text-muted-foreground">Total imported</div>
              <div className="text-xl font-bold">
                {(stats?.totals.medicines_catalog ?? total).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Last import</div>
              <div className="text-sm font-medium">
                {stats?.totals.last_import
                  ? new Date(stats.totals.last_import).toLocaleDateString()
                  : "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, composition or manufacturer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {isLoading ? (
            "Loading…"
          ) : (
            <>
              Showing <span className="font-medium text-foreground">{from.toLocaleString()}</span>–
              <span className="font-medium text-foreground">{to.toLocaleString()}</span> of{" "}
              <span className="font-medium text-foreground">{total.toLocaleString()}</span> medicines
            </>
          )}
        </div>
      </div>

      <Card className="card-elevated overflow-hidden">
        <div className="relative max-h-[65vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="min-w-[180px]">Medicine</TableHead>
                <TableHead className="min-w-[220px]">Composition</TableHead>
                <TableHead className="min-w-[240px]">Uses</TableHead>
                <TableHead className="min-w-[160px]">Manufacturer</TableHead>
                <TableHead className="text-right">Excellent %</TableHead>
                <TableHead className="text-right">Average %</TableHead>
                <TableHead className="text-right">Poor %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : meds.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.medicine_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.composition ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="line-clamp-2">{m.indications ?? "—"}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.manufacturer ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtPct(m.excellent_review)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtPct(m.average_review)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtPct(m.poor_review)}
                      </TableCell>
                    </TableRow>
                  ))}
              {!isLoading && meds.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No medicines found for "{debouncedQ}".
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          Page {page} of {totalPages.toLocaleString()} {isFetching && "· updating…"}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          {pageNumbers.map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} className="px-2 text-sm text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                className="min-w-9"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function fmtPct(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return `${Number(v).toFixed(0)}%`;
}

function buildPager(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}
