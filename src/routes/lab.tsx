import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Loader2,
  FileText,
  X,
  AlertTriangle,
  Brain,
  Search,
  Stethoscope,
  ClipboardList,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { analyzeLabReport, type LabAnalysis } from "@/lib/lab.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/lab")({
  head: () => ({
    meta: [
      { title: "AI Medical Report Analyzer — MediScan AI" },
      {
        name: "description",
        content:
          "Upload a lab, pathology, blood test, or radiology report and get AI-extracted parameters, detected medical findings, and plain-language explanations.",
      },
      { property: "og:title", content: "AI Medical Report Analyzer — MediScan AI" },
      {
        property: "og:description",
        content:
          "Extract, analyze and explain lab, pathology and radiology reports in simple language.",
      },
      { property: "og:url", content: "https://ai-mediscan.lovable.app/lab" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://ai-mediscan.lovable.app/lab" }],
  }),
  component: LabPage,
});

const STAGES = [
  "Uploading",
  "Reading Report",
  "Extracting Data",
  "Analyzing Findings",
  "Generating Explanation",
];

const ACCEPT = "image/png,image/jpeg,image/jpg,image/webp";

function LabPage() {
  const [file, setFile] = useState<{ url: string; name: string } | null>(null);
  const [stage, setStage] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const fn = useServerFn(analyzeLabReport);

  const mutation = useMutation({
    mutationFn: async (p: { url: string; name: string }) =>
      fn({ data: { fileDataUrl: p.url, fileName: p.name } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-reports"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Report analyzed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!mutation.isPending) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 2500);
    return () => clearInterval(t);
  }, [mutation.isPending]);

  function pickFile(f: File) {
    if (f.type === "application/pdf") {
      toast.error("PDF isn't supported yet — please upload a PNG, JPG or WEBP image of the report.");
      return;
    }
    if (!f.type.startsWith("image/")) return toast.error("Unsupported file type");
    if (f.size > 10 * 1024 * 1024) return toast.error("File too large (max 10MB)");
    const reader = new FileReader();
    reader.onload = () => {
      mutation.reset();
      setFile({ url: reader.result as string, name: f.name });
    };
    reader.readAsDataURL(f);
  }

  const result = mutation.data?.analysis as LabAnalysis | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Your Medical Report</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Upload a lab, pathology, blood test, or radiology report and AI will extract, analyze, and
          explain the findings in simple language.
        </p>
      </div>

      <Card className="card-elevated">
        <CardContent className="pt-6">
          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) pickFile(f);
              }}
              className="flex h-56 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/30 text-center"
            >
              <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">Drag and drop your medical report</p>
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WEBP (max 10MB)</p>
              <Button className="mt-4" size="sm" onClick={() => fileRef.current?.click()}>
                <FileText className="mr-2 h-4 w-4" />
                Browse file
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <img
                  src={file.url}
                  alt={`Preview of uploaded medical report ${file.name}`}
                  className="h-32 w-full max-w-[220px] rounded-md border border-border object-cover"
                />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="truncate font-medium">{file.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate(file)}
                    >
                      {mutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Brain className="mr-2 h-4 w-4" />
                      )}
                      Analyze Report
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={mutation.isPending}
                      onClick={() => fileRef.current?.click()}
                    >
                      Replace
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={mutation.isPending}
                      onClick={() => {
                        setFile(null);
                        mutation.reset();
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept={ACCEPT}
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {mutation.isPending && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {STAGES[stage]}...
            </div>
            <Progress value={((stage + 1) / STAGES.length) * 100} />
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {STAGES.map((s, i) => (
                <span
                  key={s}
                  className={i <= stage ? "font-medium text-foreground" : undefined}
                >
                  {s}
                  {i < STAGES.length - 1 ? " →" : ""}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {mutation.isError && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-start gap-3 pt-6 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <span>{(mutation.error as Error).message}</span>
          </CardContent>
        </Card>
      )}

      {result && <Results a={result} />}
    </div>
  );
}

function Results({ a }: { a: LabAnalysis }) {
  return (
    <div className="space-y-6">
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" /> Overall Report Summary
          </CardTitle>
          <AttentionPill level={a.attention_level} />
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {a.report_type && (
            <p className="text-xs text-muted-foreground">Report type: {a.report_type}</p>
          )}
          {a.summary.status && (
            <p>
              <span className="font-medium">Overall status: </span>
              {a.summary.status}
            </p>
          )}
          {a.summary.text && <p className="text-muted-foreground">{a.summary.text}</p>}
          {a.summary.key_points.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {a.summary.key_points.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {a.warnings.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="space-y-1 pt-6 text-sm">
            {a.warnings.map((w, i) => (
              <p key={i} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" /> {w}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {a.impression && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4 text-primary" /> Report Impression
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="rounded-md border border-border bg-secondary/40 p-3 font-mono text-xs whitespace-pre-wrap">
              {a.impression.original}
            </p>
            {a.impression.explanation && (
              <p className="text-muted-foreground">{a.impression.explanation}</p>
            )}
          </CardContent>
        </Card>
      )}

      {a.parameters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lab Results</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Reference Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Explanation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {a.parameters.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.result || "—"}</TableCell>
                    <TableCell>{p.unit || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.reference_range || (
                        <span className="text-xs">
                          Reference range not available — interpretation requires clinical context.
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={p.status} />
                    </TableCell>
                    <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                      {p.explanation}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {a.abnormal_results.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning" /> Findings That May Need Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {a.abnormal_results.map((r, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{r.parameter}</span>
                  <StatusPill status={r.status} />
                </div>
                <p className="text-muted-foreground">Result: {r.result}</p>
                {r.measures && (
                  <Field label="What does this measure?" value={r.measures} />
                )}
                {r.meaning && <Field label="What does this result indicate?" value={r.meaning} />}
                {r.possible_associations?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium">Possible reasons</p>
                    <ul className="list-disc pl-5 text-xs text-muted-foreground">
                      {r.possible_associations.map((x, j) => (
                        <li key={j}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {r.next_step && <Field label="What to do next" value={r.next_step} />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {a.medical_findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-primary" /> Medical Findings Explained
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {a.medical_findings.map((f, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{f.term}</span>
                  {f.category && (
                    <Badge variant="outline" className="text-xs">
                      {f.category}
                    </Badge>
                  )}
                </div>
                <DiagnosticPill status={f.diagnostic_status} />
                {f.explanation && <Field label="What is it?" value={f.explanation} />}
                {f.report_context && (
                  <Field label="What does the report say?" value={f.report_context} />
                )}
                {f.what_it_can_mean && (
                  <Field label="What can it mean?" value={f.what_it_can_mean} />
                )}
                {f.possible_associations?.length > 0 && (
                  <ListField label="Possible causes / associations" items={f.possible_associations} />
                )}
                {f.symptoms?.length > 0 && (
                  <ListField label="Possible symptoms" items={f.symptoms} />
                )}
                {f.evaluation && (
                  <Field label="How is it usually evaluated?" value={f.evaluation} />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {a.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4 text-primary" /> Suggested Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {a.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {a.extracted_text && (
        <Card>
          <CardContent className="pt-2">
            <Accordion type="single" collapsible>
              <AccordionItem value="text" className="border-0">
                <AccordionTrigger className="text-sm font-medium">
                  Extracted Report Text
                </AccordionTrigger>
                <AccordionContent>
                  <pre className="max-h-96 overflow-auto rounded-md bg-secondary/40 p-3 text-xs whitespace-pre-wrap">
                    {a.extracted_text}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-medium text-foreground">Medical Disclaimer — </span>
          This AI-generated analysis is for informational and educational purposes only. It does not
          replace a diagnosis, examination, or advice from a qualified healthcare professional. AI
          interpretations may contain errors. Always discuss abnormal or concerning findings with
          your doctor.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{value}</p>
    </div>
  );
}

function ListField({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium">{label}</p>
      <ul className="list-disc pl-5 text-xs text-muted-foreground">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = (status || "unknown").toLowerCase();
  const map: Record<string, { cls: string; icon: string; label: string }> = {
    normal: { cls: "bg-success text-success-foreground", icon: "🟢", label: "Normal" },
    borderline: { cls: "bg-warning text-warning-foreground", icon: "🟠", label: "Borderline" },
    attention: { cls: "bg-warning text-warning-foreground", icon: "🟠", label: "Attention" },
    high: { cls: "bg-destructive text-destructive-foreground", icon: "🔴", label: "High" },
    critical: { cls: "bg-destructive text-destructive-foreground", icon: "🔴", label: "Critical" },
    low: { cls: "bg-primary text-primary-foreground", icon: "🔵", label: "Low" },
    unknown: { cls: "bg-secondary text-secondary-foreground", icon: "⚪", label: "Undetermined" },
  };
  const v = map[s] ?? map.unknown;
  return (
    <Badge className={v.cls}>
      <span className="mr-1">{v.icon}</span>
      {v.label}
    </Badge>
  );
}

function AttentionPill({ level }: { level: string }) {
  const map: Record<string, { cls: string; text: string }> = {
    none: {
      cls: "bg-success text-success-foreground",
      text: "🟢 No significant abnormality detected",
    },
    attention: {
      cls: "bg-warning text-warning-foreground",
      text: "🟡 Some results may need attention",
    },
    important: {
      cls: "bg-warning text-warning-foreground",
      text: "🟠 Important findings detected",
    },
    urgent: {
      cls: "bg-destructive text-destructive-foreground",
      text: "🔴 Potentially urgent finding mentioned in report",
    },
  };
  const v = map[(level || "none").toLowerCase()] ?? map.none;
  return <Badge className={`${v.cls} whitespace-normal text-right`}>{v.text}</Badge>;
}

function DiagnosticPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; text: string }> = {
    confirmed: {
      cls: "bg-destructive text-destructive-foreground",
      text: "Confirmed in the report",
    },
    suspected: {
      cls: "bg-warning text-warning-foreground",
      text: "Suspected / suggestive finding",
    },
    possible_association: {
      cls: "bg-primary text-primary-foreground",
      text: "Possible association",
    },
    unclear: {
      cls: "bg-secondary text-secondary-foreground",
      text: "Term detected — clinical significance unclear",
    },
  };
  const v = map[(status || "unclear").toLowerCase()] ?? map.unclear;
  return (
    <Badge className={`${v.cls} gap-1 whitespace-normal`}>
      <CheckCircle2 className="h-3 w-3" />
      {v.text}
    </Badge>
  );
}
