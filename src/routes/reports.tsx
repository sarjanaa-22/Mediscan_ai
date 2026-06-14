import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPrescriptions, listLabReports, deleteRecord } from "@/lib/medicines.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Eye, Trash2, FileText, FileJson, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  adaptLabRow,
  adaptPrescriptionRow,
  downloadCsv,
  downloadJson,
  downloadPdf,
  getPdfDataUri,
  type ReportBundle,
} from "@/lib/report-generator";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — MediScan AI" }] }),
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

  const [previewing, setPreviewing] = useState<{ bundle: ReportBundle; dataUri: string } | null>(
    null,
  );

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

  function bundleFromPrescription(r: Prescription): ReportBundle {
    return { prescription: adaptPrescriptionRow(r) };
  }
  function bundleFromLab(r: LabReport): ReportBundle {
    return { lab: adaptLabRow(r) };
  }

  function openPreview(bundle: ReportBundle) {
    try {
      const { dataUri } = getPdfDataUri(bundle);
      setPreviewing({ bundle, dataUri });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          History of prescriptions and lab analyses. Preview or export as PDF, JSON, or CSV.
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
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base">
                      Prescription · {new Date(r.created_at).toLocaleString()}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      {r.extracted_text}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {Math.round(Number(r.confidence_score ?? 0) * 100)}%
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openPreview(bundleFromPrescription(r))}>
                    <Eye className="mr-2 h-4 w-4" /> Preview
                  </Button>
                  <Button size="sm" onClick={() => downloadPdf(bundleFromPrescription(r))}>
                    <FileText className="mr-2 h-4 w-4" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadJson(bundleFromPrescription(r))}>
                    <FileJson className="mr-2 h-4 w-4" /> JSON
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadCsv(bundleFromPrescription(r))}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-destructive"
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
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                  <div className="min-w-0">
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
                <CardContent className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openPreview(bundleFromLab(r))}>
                    <Eye className="mr-2 h-4 w-4" /> Preview
                  </Button>
                  <Button size="sm" onClick={() => downloadPdf(bundleFromLab(r))}>
                    <FileText className="mr-2 h-4 w-4" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadJson(bundleFromLab(r))}>
                    <FileJson className="mr-2 h-4 w-4" /> JSON
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadCsv(bundleFromLab(r))}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-destructive"
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

      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-4">
          <DialogHeader>
            <DialogTitle>Report Preview</DialogTitle>
          </DialogHeader>
          {previewing && (
            <div className="space-y-3">
              <iframe
                src={previewing.dataUri}
                title="Report preview"
                className="h-[70vh] w-full rounded-lg border border-border bg-white"
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => downloadPdf(previewing.bundle)}>
                  <FileText className="mr-2 h-4 w-4" /> Download PDF
                </Button>
                <Button variant="outline" onClick={() => downloadJson(previewing.bundle)}>
                  <FileJson className="mr-2 h-4 w-4" /> Download JSON
                </Button>
                <Button variant="outline" onClick={() => downloadCsv(previewing.bundle)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Download CSV
                </Button>
              </div>
            </div>
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

// Suppress unused warning — useMemo kept for future memo of bundles
void useMemo;
