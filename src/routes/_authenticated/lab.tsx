import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Upload, Loader2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { analyzeLabReport } from "@/lib/lab.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/lab")({
  head: () => ({ meta: [{ title: "Lab Report Analyzer — MediScan AI" }] }),
  component: LabPage,
});

function LabPage() {
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const fn = useServerFn(analyzeLabReport);

  const mutation = useMutation({
    mutationFn: async (p: { url: string; name: string }) =>
      fn({ data: { fileDataUrl: p.url, fileName: p.name } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-reports"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Lab report analyzed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) return toast.error("File too large (max 10MB)");
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const payload = { url, name: file.name };
      setPreview(payload);
      mutation.mutate(payload);
    };
    reader.readAsDataURL(file);
  }

  const result = mutation.data?.analysis;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lab Report Analyzer</h1>
        <p className="text-sm text-muted-foreground">
          Upload a lab report image — we'll extract parameters and explain each result.
        </p>
      </div>

      <Card className="card-elevated">
        <CardContent className="pt-6">
          {!preview ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              className="flex h-56 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/30 text-center"
            >
              <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">Drag and drop your lab report</p>
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG (max 10MB)</p>
              <Button className="mt-4" size="sm" onClick={() => fileRef.current?.click()}>
                <FileText className="mr-2 h-4 w-4" />
                Choose file
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-medium">{preview.name}</span>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => {
                  setPreview(null);
                  mutation.reset();
                }}
              >
                Upload another
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {mutation.isPending && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing lab report...
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {result.overall_summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {result.overall_summary}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Reference Range</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.parameters.map((p, i) => (
                    <>
                      <TableRow key={i}>
                        <TableCell className="font-medium">{p.parameter}</TableCell>
                        <TableCell>
                          {p.value} {p.unit}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.reference_range}</TableCell>
                        <TableCell>
                          <StatusPill status={p.status} />
                        </TableCell>
                      </TableRow>
                      {p.explanation && (
                        <TableRow key={i + "-x"} className="border-0">
                          <TableCell colSpan={4} className="pt-0 text-xs text-muted-foreground">
                            {p.explanation}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    normal: "bg-success text-success-foreground",
    high: "bg-warning text-warning-foreground",
    low: "bg-warning text-warning-foreground",
    critical: "bg-destructive text-destructive-foreground",
    unknown: "bg-secondary text-secondary-foreground",
  };
  return <Badge className={map[status] ?? map.unknown}>{status}</Badge>;
}
