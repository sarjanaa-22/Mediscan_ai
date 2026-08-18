import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPrescriptions, listLabReports, deleteRecord } from "@/lib/medicines.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — MediScan AI" },
      { name: "description", content: "Browse, preview and download your saved prescription digitizations and AI lab report analyses as PDF, JSON or CSV." },
      { property: "og:title", content: "Reports — MediScan AI" },
      { property: "og:description", content: "Browse, preview and download your saved prescription digitizations and AI lab report analyses as PDF, JSON or CSV." },
      { property: "og:url", content: "https://ai-mediscan.lovable.app/reports" },
      { name: "twitter:title", content: "Reports — MediScan AI" },
      { name: "twitter:description", content: "Browse, preview and download your saved prescription digitizations and AI lab report analyses as PDF, JSON or CSV." },
    ],
    links: [{ rel: "canonical", href: "https://ai-mediscan.lovable.app/reports" }],
  }),
  component: ReportsPage,
});

type Prescription = Awaited<ReturnType<typeof listPrescriptions>>[number];
type LabReport = Awaited<ReturnType<typeof listLabReports>>[number];

function ReportsPage() {
  const rxFn = useServerFn(listPrescriptions);
  const labFn = useServerFn(listLabReports);
  const delFn = useServerFn(deleteRecord);
  const qc = useQueryClient();

  const rx = useQuery({ queryKey: ["prescriptions"], queryFn: () => rxFn() });
  const lab = useQuery({ queryKey: ["lab-reports"], queryFn: () => labFn() });

  const [viewing, setViewing] = useState<{ kind: "rx"; row: Prescription } | { kind: "lab"; row: LabReport } | null>(null);

  const del = useMutation({
    mutationFn: async (p: { id: string; kind: "prescription" | "lab" }) => delFn({ data: p }),
    onSuccess: (_d, vars) => {
      toast.success("Deleted");
      qc.invalidateQueries({
        queryKey: vars.kind === "prescription" ? ["prescriptions"] : ["lab-reports"],
      });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function downloadJson(name: string, data: unknown) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Your history of prescriptions and lab analyses.
        </p>
      </div>

      <Tabs defaultValue="rx">
        <TabsList>
          <TabsTrigger value="rx">Prescriptions</TabsTrigger>
          <TabsTrigger value="lab">Lab Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="rx" className="mt-4 space-y-3">
          {rx.isLoading ? (
            <Skeleton className="h-40" />
          ) : (rx.data ?? []).length === 0 ? (
            <Empty msg="No prescriptions yet." />
          ) : (
            (rx.data ?? []).map((r) => (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">
                      Prescription · {new Date(r.created_at).toLocaleString()}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      {r.extracted_text}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {Math.round(Number(r.confidence_score ?? 0) * 100)}%
                  </Badge>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewing({ kind: "rx", row: r })}>
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadJson(`prescription-${r.id}.json`, r)}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => del.mutate({ id: r.id, kind: "prescription" })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="lab" className="mt-4 space-y-3">
          {lab.isLoading ? (
            <Skeleton className="h-40" />
          ) : (lab.data ?? []).length === 0 ? (
            <Empty msg="No lab reports yet." />
          ) : (
            (lab.data ?? []).map((r) => (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">
                      Lab Report · {new Date(r.created_at).toLocaleString()}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      {(() => {
                        const d = r.extracted_data as { overall_summary?: string } | null;
                        return d?.overall_summary ?? "Lab analysis stored";
                      })()}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewing({ kind: "lab", row: r })}>
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadJson(`lab-${r.id}.json`, r)}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => del.mutate({ id: r.id, kind: "lab" })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {viewing?.kind === "rx" ? "Prescription details" : "Lab report details"}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <pre className="overflow-auto rounded-lg bg-secondary/40 p-4 text-xs">
              {JSON.stringify(viewing.row, null, 2)}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">{msg}</CardContent>
    </Card>
  );
}
