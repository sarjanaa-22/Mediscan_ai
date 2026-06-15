import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { searchMedicines } from "@/lib/medicines.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

export const Route = createFileRoute("/medicines")({
  head: () => ({ meta: [{ title: "Medicine Database — MediScan AI" }] }),
  component: MedicinesPage,
});

function MedicinesPage() {
  const [q, setQ] = useState("");
  const fn = useServerFn(searchMedicines);
  const { data, isLoading } = useQuery({
    queryKey: ["medicines", q],
    queryFn: () => fn({ data: { q } }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Medicine Database</h1>
        <p className="text-sm text-muted-foreground">
          Search our verified catalog of common medicines.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, generic or class…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data ?? []).map((m) => (
            <Card key={m.id} className="card-elevated overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  {m.image_url ? (
                    <img
                      src={m.image_url}
                      alt={m.medicine_name}
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-md border border-border/60 object-cover"
                      onError={(e) => ((e.currentTarget.style.display = "none"))}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{m.medicine_name}</CardTitle>
                      {m.drug_class && (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {m.drug_class}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {m.composition || m.generic_name}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs">
                <Row k="Uses" v={m.indications} />
                <Row k="Side effects" v={m.side_effects} />
                <Row k="Manufacturer" v={m.manufacturer} />
              </CardContent>
            </Card>
          ))}
          {(data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No medicines found.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null }) {
  if (!v) return null;
  return (
    <div>
      <span className="text-muted-foreground">{k}:</span> {v}
    </div>
  );
}
