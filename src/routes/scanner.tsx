import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { Upload, Camera, Loader2, FileImage, Sparkles, CheckCircle2, AlertTriangle, HelpCircle, FileText, Download, Eye, FileJson, FileSpreadsheet, Trash2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { scanPrescription } from "@/lib/ocr.functions";
import { generatePrescriptionPdf, downloadJson, downloadCsv, type ScanResult as PdfScanResult } from "@/lib/pdf-report";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CameraCapture } from "@/components/camera-capture";
import { compressImage } from "@/lib/image-compress";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/scanner")({
  head: () => ({ meta: [{ title: "Prescription Scanner — MediScan AI" }] }),
  component: ScannerPage,
});

type ScanResult = Awaited<ReturnType<typeof scanPrescription>>;

function ScannerPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const fn = useServerFn(scanPrescription);

  const mutation = useMutation({
    mutationFn: async (imageDataUrl: string) => fn({ data: { imageDataUrl } }),
    onSuccess: async (data: ScanResult) => {
      setEditedText(data.extracted_text);
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["prescriptions"] });
      toast.success("Prescription analyzed");
      try {
        const doc = await generatePrescriptionPdf(data as PdfScanResult, preview);
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        doc.save(`mediscan-report-${data.id.slice(0, 8)}.pdf`);
        toast.success("PDF report downloaded");
      } catch (e) {
        console.error(e);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runScan = useCallback((dataUrl: string) => {
    setPreview(dataUrl);
    mutation.mutate(dataUrl);
  }, [mutation]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image too large (max 20MB)");
      return;
    }
    try {
      const compressed = await compressImage(file, { maxWidth: 1200, quality: 0.8 });
      runScan(compressed);
    } catch {
      toast.error("Could not read image");
    }
  }, [runScan]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  const reset = useCallback(() => {
    setPreview(null);
    setEditedText("");
    setPdfUrl(null);
    mutation.reset();
  }, [mutation]);

  const downloadImage = useCallback(() => {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = `prescription-${Date.now()}.jpg`;
    a.click();
  }, [preview]);

  const result = mutation.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prescription Scanner</h1>
        <p className="text-sm text-muted-foreground">
          Upload or capture a handwritten prescription — we'll digitize it instantly.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT: Image */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Prescription Image</CardTitle>
          </CardHeader>
          <CardContent>
            {!preview ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`flex h-80 flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-border bg-secondary/30"
                }`}
              >
                <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">Drag &amp; drop, capture, or upload an image</p>
                <p className="mt-1 text-xs text-muted-foreground">PNG / JPG · auto-compressed to 1200px</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button size="sm" onClick={() => setCameraOpen(true)}>
                    <Camera className="mr-2 h-4 w-4" />
                    Open Camera
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                    <FileImage className="mr-2 h-4 w-4" />
                    Upload Image
                  </Button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <img
                  src={preview}
                  alt="Prescription"
                  className="max-h-[420px] w-full rounded-lg border border-border object-contain bg-secondary/30"
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={reset}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Re-scan
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadImage}>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                  <Button variant="outline" size="sm" onClick={reset}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setCameraOpen(true)}>
                    <Camera className="mr-2 h-4 w-4" /> Recapture
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: Extracted text */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Extracted Text</CardTitle>
            {result && (
              <Badge variant="secondary">
                <Sparkles className="mr-1 h-3 w-3" /> {Math.round(result.confidence * 100)}% confidence
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {mutation.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex items-center gap-2 pt-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing handwriting...
                </div>
              </div>
            ) : result ? (
              <>
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
                <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
                  <Stat label="Confidence" value={`${Math.round(result.confidence * 100)}%`} />
                  <Stat label="Quality" value={result.recognition_quality} />
                  <Stat label="Time" value={`${(result.processing_time_ms / 1000).toFixed(1)}s`} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Upload a prescription to see the extracted text here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {result && (
        <>
          {/* Report actions */}
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Report
              </CardTitle>
              <Badge variant="secondary">Auto-downloaded</Badge>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pdfUrl}
                onClick={() => setPdfOpen(true)}
              >
                <Eye className="mr-2 h-4 w-4" /> View Report
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  const doc = await generatePrescriptionPdf(result as PdfScanResult, preview);
                  doc.save(`mediscan-report-${result.id.slice(0, 8)}.pdf`);
                }}
              >
                <Download className="mr-2 h-4 w-4" /> Download PDF Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadJson(`mediscan-${result.id.slice(0, 8)}.json`, result)}
              >
                <FileJson className="mr-2 h-4 w-4" /> Download JSON Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCsv(`mediscan-${result.id.slice(0, 8)}.csv`, result as PdfScanResult)}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Download CSV Report
              </Button>
            </CardContent>
          </Card>

          {/* OCR Engines comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">OCR Engine Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-2">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={result.engines.map((e) => ({
                      name: e.name,
                      confidence: Math.round(e.confidence * 100),
                    }))}
                    layout="vertical"
                    margin={{ left: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={12} width={130} />
                    <Tooltip />
                    <Bar dataKey="confidence" fill="var(--primary)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {result.engines.map((e) => (
                    <div
                      key={e.name}
                      className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm"
                    >
                      <span className="font-medium">{e.name}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={e.confidence * 100} className="w-24" />
                        <span className="w-10 text-right text-muted-foreground">
                          {Math.round(e.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detected medicines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detected Medicines</CardTitle>
            </CardHeader>
            <CardContent>
              {result.detected.length === 0 ? (
                <p className="text-sm text-muted-foreground">No medicines detected.</p>
              ) : (
                <div className="space-y-3">
                  {result.detected.map((d, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground">
                              "{d.raw}"
                            </span>
                            <span>→</span>
                            <span className="font-semibold">
                              {d.matched_medicine?.name ?? d.suggested ?? "Unknown"}
                            </span>
                          </div>
                          {d.matched_medicine && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {d.matched_medicine.generic} · {d.matched_medicine.drug_class}
                            </div>
                          )}
                        </div>
                        <StatusBadge method={d.match_method} score={d.match_score} matched={!!d.matched_medicine} />
                      </div>
                      {d.matched_medicine && (
                        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                          <div><span className="text-muted-foreground">Uses:</span> {d.matched_medicine.indications}</div>
                          <div><span className="text-muted-foreground">Dosage:</span> {d.matched_medicine.dosage}</div>
                          <div><span className="text-muted-foreground">Side effects:</span> {d.matched_medicine.side_effects}</div>
                          <div><span className="text-muted-foreground">Manufacturer:</span> {d.matched_medicine.manufacturer}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-4">
            <DialogTitle>Prescription Report Preview</DialogTitle>
          </DialogHeader>
          {pdfUrl ? (
            <iframe src={pdfUrl} title="PDF Preview" className="h-full w-full border-0" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Generating preview...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-bold capitalize">{value}</div>
    </div>
  );
}

function StatusBadge({ method, score, matched }: { method: string; score: number; matched: boolean }) {
  if (!matched) {
    return (
      <Badge variant="destructive" className="shrink-0">
        <HelpCircle className="mr-1 h-3 w-3" />
        Unknown
      </Badge>
    );
  }
  if (method === "exact") {
    return (
      <Badge className="shrink-0 bg-success text-success-foreground">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Exact match
      </Badge>
    );
  }
  if (method === "abbreviation") {
    return (
      <Badge variant="secondary" className="shrink-0">
        <Sparkles className="mr-1 h-3 w-3" />
        Abbreviation
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="shrink-0">
      <AlertTriangle className="mr-1 h-3 w-3" />
      Fuzzy ({Math.round(score * 100)}%)
    </Badge>
  );
}
