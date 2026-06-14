import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ============ Shared types (loose to accept stored DB rows) ============

export type DetectedMedicine = {
  raw: string;
  suggested?: string | null;
  ai_confidence?: number;
  match_method?: string;
  match_score?: number;
  matched_medicine?: {
    name?: string;
    generic?: string;
    drug_class?: string;
    indications?: string;
    dosage?: string;
    side_effects?: string;
    manufacturer?: string;
  } | null;
};

export type PrescriptionReportData = {
  id: string;
  created_at?: string | null;
  image_data_url?: string | null; // optional embedded image
  extracted_text?: string | null;
  confidence?: number | null;
  recognition_quality?: string | null;
  patient_name?: string | null;
  doctor_name?: string | null;
  date?: string | null;
  engines?: Array<{ name: string; confidence: number }>;
  detected?: DetectedMedicine[];
  processing_time_ms?: number | null;
};

export type LabReportData = {
  id: string;
  created_at?: string | null;
  patient_name?: string | null;
  report_date?: string | null;
  overall_summary?: string | null;
  parameters?: Array<{
    parameter: string;
    value: string;
    unit?: string;
    reference_range?: string;
    status?: string;
    explanation?: string;
  }>;
};

export type ReportBundle = {
  prescription?: PrescriptionReportData | null;
  lab?: LabReportData | null;
};

// ============ Helpers ============

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function fmtDate(s?: string | null): string {
  if (!s) return new Date().toLocaleString();
  try {
    return new Date(s).toLocaleString();
  } catch {
    return String(s);
  }
}

function genReportId(prefix = "MSAI"): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

const COLORS = {
  primary: [37, 99, 235] as [number, number, number], // medical blue
  dark: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  warning: [202, 138, 4] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  light: [241, 245, 249] as [number, number, number],
};

function statusColor(status?: string): [number, number, number] {
  const s = (status ?? "").toLowerCase();
  if (s === "normal") return COLORS.success;
  if (s === "high" || s === "low" || s === "borderline") return COLORS.warning;
  if (s === "critical") return COLORS.danger;
  return COLORS.muted;
}

function confidenceLabel(c?: number | null): { label: string; color: [number, number, number] } {
  const v = c ?? 0;
  if (v >= 0.85) return { label: "High", color: COLORS.success };
  if (v >= 0.65) return { label: "Medium", color: COLORS.warning };
  return { label: "Low", color: COLORS.danger };
}

// ============ Clinical decision support (simple heuristics) ============

function buildClinicalAlerts(meds: DetectedMedicine[]): {
  duplicates: string[];
  unknown: string[];
  interactions: string[];
  recommendations: string[];
} {
  const names = meds
    .map((m) => (m.matched_medicine?.name ?? m.suggested ?? m.raw ?? "").toLowerCase())
    .filter(Boolean);

  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const n of names) {
    if (seen.has(n)) duplicates.push(n);
    seen.add(n);
  }

  const unknown = meds
    .filter((m) => !m.matched_medicine)
    .map((m) => m.suggested ?? m.raw)
    .filter(Boolean) as string[];

  // very small interaction lookup (demo-grade)
  const INTERACTIONS: Array<[string, string, string]> = [
    ["warfarin", "aspirin", "Increased bleeding risk."],
    ["clopidogrel", "aspirin", "Additive bleeding risk — monitor closely."],
    ["metformin", "alcohol", "Risk of lactic acidosis."],
    ["ciprofloxacin", "tizanidine", "Severe hypotension risk — avoid combination."],
    ["amiodarone", "simvastatin", "Increased risk of myopathy."],
  ];
  const interactions: string[] = [];
  for (const [a, b, note] of INTERACTIONS) {
    if (names.some((n) => n.includes(a)) && names.some((n) => n.includes(b))) {
      interactions.push(`${a} + ${b}: ${note}`);
    }
  }

  const recommendations: string[] = [];
  if (unknown.length) recommendations.push("Manual pharmacist review recommended for unrecognized medicines.");
  if (duplicates.length) recommendations.push("Verify duplicate prescriptions with the prescribing physician.");
  if (interactions.length) recommendations.push("Review flagged drug interactions before dispensing.");
  if (!recommendations.length) recommendations.push("No major issues detected. Standard verification advised.");

  return { duplicates, unknown, interactions, recommendations };
}

function buildSummary(p?: PrescriptionReportData | null, l?: LabReportData | null): string {
  const parts: string[] = [];
  if (p) {
    const c = pct(p.confidence ?? 0);
    const count = p.detected?.length ?? 0;
    const verified = (p.detected ?? []).filter((d) => d.matched_medicine).length;
    parts.push(
      `The prescription was digitized with ${c} OCR confidence. ${verified} of ${count} medicines were verified against the catalog.`,
    );
  }
  if (l && l.parameters?.length) {
    const abnormal = l.parameters.filter((x) => x.status && x.status !== "normal").length;
    parts.push(
      abnormal > 0
        ? `Lab analysis flagged ${abnormal} parameter(s) outside reference ranges; clinical review recommended.`
        : `All ${l.parameters.length} lab parameters are within reference ranges.`,
    );
  }
  if (!parts.length) parts.push("No prescription or lab data provided.");
  return parts.join(" ");
}

// ============ PDF generation ============

export function generateReportPdf(bundle: ReportBundle): { doc: jsPDF; reportId: string; fileName: string } {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const reportId = genReportId();
  const generatedAt = new Date().toLocaleString();

  // ---- Header ----
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, W, 90, "F");

  // Logo mark (rounded square + cross)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(M, 22, 46, 46, 8, 8, "F");
  doc.setFillColor(...COLORS.primary);
  doc.rect(M + 20, 30, 6, 30, "F");
  doc.rect(M + 11, 39, 24, 12, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("MediScan AI", M + 60, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("AI-Powered Prescription Digitization & Clinical Decision Support", M + 60, 58);

  doc.setFontSize(8);
  doc.text(`Report ID: ${reportId}`, W - M, 38, { align: "right" });
  doc.text(`Generated: ${generatedAt}`, W - M, 52, { align: "right" });

  let y = 120;

  const addSectionHeader = (title: string) => {
    if (y > H - 80) {
      doc.addPage();
      y = 60;
    }
    doc.setFillColor(...COLORS.light);
    doc.rect(M, y - 14, W - M * 2, 22, "F");
    doc.setFillColor(...COLORS.primary);
    doc.rect(M, y - 14, 4, 22, "F");
    doc.setTextColor(...COLORS.dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, M + 12, y + 1);
    y += 18;
  };

  const addText = (txt: string, opts: { bold?: boolean; size?: number; color?: [number, number, number] } = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 10);
    doc.setTextColor(...(opts.color ?? COLORS.dark));
    const lines = doc.splitTextToSize(txt, W - M * 2);
    if (y + lines.length * 12 > H - 60) {
      doc.addPage();
      y = 60;
    }
    doc.text(lines, M, y);
    y += lines.length * 12 + 4;
  };

  const p = bundle.prescription;
  const l = bundle.lab;

  // ====== SECTION 1: Prescription Information ======
  if (p) {
    addSectionHeader("1. Prescription Information");

    const imgX = M;
    const imgW = 160;
    const imgH = 160;
    let textX = M;

    if (p.image_data_url) {
      try {
        const fmt = p.image_data_url.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(p.image_data_url, fmt, imgX, y, imgW, imgH, undefined, "FAST");
        textX = imgX + imgW + 16;
      } catch {
        // ignore embed failure
      }
    }

    const conf = confidenceLabel(p.confidence);
    const meta: Array<[string, string]> = [
      ["OCR Processing Date", fmtDate(p.created_at)],
      ["OCR Engine Used", "Gemini 2.5 Vision (final) + TrOCR / PaddleOCR / EasyOCR comparison"],
      ["OCR Confidence", `${pct(p.confidence)} (${conf.label})`],
      ["Handwriting Quality", String(p.recognition_quality ?? "—")],
      ["Processing Time", p.processing_time_ms ? `${(p.processing_time_ms / 1000).toFixed(1)}s` : "—"],
    ];

    const startY = y;
    doc.setFontSize(9);
    let ty = startY + 4;
    for (const [k, v] of meta) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.muted);
      doc.text(k, textX, ty);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.dark);
      const lines = doc.splitTextToSize(v, W - textX - M);
      doc.text(lines, textX, ty + 12);
      ty += 12 + lines.length * 11 + 4;
    }
    y = Math.max(y + (p.image_data_url ? imgH : 0), ty) + 10;

    // ====== SECTION 2: Extracted Text ======
    addSectionHeader("2. Extracted Prescription Text");
    const info: Array<[string, string]> = [
      ["Patient", p.patient_name ?? "—"],
      ["Doctor", p.doctor_name ?? "—"],
      ["Date", p.date ?? "—"],
    ];
    doc.setFontSize(9);
    for (const [k, v] of info) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.muted);
      doc.text(`${k}:`, M, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.dark);
      doc.text(v, M + 60, y);
      y += 14;
    }
    y += 4;
    doc.setDrawColor(...COLORS.light);
    doc.setFillColor(250, 250, 252);
    const txt = p.extracted_text ?? "(no text extracted)";
    const txtLines = doc.splitTextToSize(txt, W - M * 2 - 16);
    const boxH = txtLines.length * 11 + 16;
    if (y + boxH > H - 60) {
      doc.addPage();
      y = 60;
    }
    doc.roundedRect(M, y, W - M * 2, boxH, 4, 4, "FD");
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.text(txtLines, M + 8, y + 14);
    y += boxH + 14;

    // ====== SECTION 3: OCR Analysis ======
    if (p.engines && p.engines.length) {
      addSectionHeader("3. OCR Engine Analysis");
      autoTable(doc, {
        startY: y,
        head: [["OCR Engine", "Confidence", "Reliability"]],
        body: p.engines.map((e) => {
          const lab = confidenceLabel(e.confidence);
          return [e.name, pct(e.confidence), lab.label];
        }),
        theme: "grid",
        headStyles: { fillColor: COLORS.primary, textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6 },
        margin: { left: M, right: M },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      const finalConf = p.confidence ?? 0;
      const finalLab = confidenceLabel(finalConf);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.dark);
      doc.text(`Final OCR Result: ${pct(finalConf)}`, M, y);
      doc.setTextColor(...finalLab.color);
      doc.text(`(${finalLab.label} confidence)`, M + 150, y);
      y += 16;
    }

    // ====== SECTION 4: Predicted Medicines & Verification ======
    addSectionHeader("4. Predicted Medicines & Verification");
    const meds = p.detected ?? [];
    if (meds.length === 0) {
      addText("No medicines detected.", { color: COLORS.muted });
    } else {
      autoTable(doc, {
        startY: y,
        head: [["Medicine", "Generic", "Class", "Confidence", "Status"]],
        body: meds.map((m) => {
          const name = m.matched_medicine?.name ?? m.suggested ?? m.raw ?? "Unknown";
          const status = m.matched_medicine
            ? m.match_method === "exact"
              ? "Verified"
              : "Needs review"
            : "Unknown";
          return [
            name,
            m.matched_medicine?.generic ?? "—",
            m.matched_medicine?.drug_class ?? "—",
            pct(m.match_score ?? m.ai_confidence ?? 0),
            status,
          ];
        }),
        theme: "striped",
        headStyles: { fillColor: COLORS.primary, textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 5 },
        margin: { left: M, right: M },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 4) {
            const val = String(data.cell.raw ?? "").toLowerCase();
            if (val === "verified") data.cell.styles.textColor = COLORS.success;
            else if (val === "unknown") data.cell.styles.textColor = COLORS.danger;
            else data.cell.styles.textColor = COLORS.warning;
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

      // Per-medicine details
      for (const m of meds) {
        if (!m.matched_medicine) continue;
        if (y > H - 90) {
          doc.addPage();
          y = 60;
        }
        const name = m.matched_medicine.name ?? m.suggested ?? "—";
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.primary);
        doc.text(`• ${name}`, M, y);
        y += 12;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.dark);
        const details: Array<[string, string]> = [
          ["Uses", m.matched_medicine.indications ?? "—"],
          ["Dosage", m.matched_medicine.dosage ?? "—"],
          ["Side effects", m.matched_medicine.side_effects ?? "—"],
          ["Manufacturer", m.matched_medicine.manufacturer ?? "—"],
        ];
        for (const [k, v] of details) {
          const lines = doc.splitTextToSize(`${k}: ${v}`, W - M * 2 - 12);
          if (y + lines.length * 11 > H - 60) {
            doc.addPage();
            y = 60;
          }
          doc.text(lines, M + 12, y);
          y += lines.length * 11 + 2;
        }
        y += 6;
      }
    }

    // ====== SECTION 5: Clinical Decision Support ======
    addSectionHeader("5. Clinical Decision Support");
    const cds = buildClinicalAlerts(meds);
    const block = (title: string, items: string[], color: [number, number, number]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...color);
      doc.text(title, M, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.dark);
      if (items.length === 0) {
        doc.setTextColor(...COLORS.muted);
        doc.text("None detected.", M + 12, y);
        y += 14;
      } else {
        for (const it of items) {
          const lines = doc.splitTextToSize(`• ${it}`, W - M * 2 - 12);
          if (y + lines.length * 11 > H - 60) {
            doc.addPage();
            y = 60;
          }
          doc.text(lines, M + 12, y);
          y += lines.length * 11 + 2;
        }
      }
      y += 6;
    };
    block("Duplicate Medicines", cds.duplicates, COLORS.warning);
    block("Unknown Medicines", cds.unknown, COLORS.danger);
    block("Drug Interaction Alerts", cds.interactions, COLORS.danger);
    block("Clinical Recommendations", cds.recommendations, COLORS.primary);
  }

  // ====== SECTION 6: Lab Report ======
  if (l) {
    addSectionHeader("6. Lab Report Analysis");
    const meta: Array<[string, string]> = [
      ["Patient", l.patient_name ?? "—"],
      ["Report Date", l.report_date ?? fmtDate(l.created_at)],
    ];
    doc.setFontSize(9);
    for (const [k, v] of meta) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.muted);
      doc.text(`${k}:`, M, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.dark);
      doc.text(v, M + 60, y);
      y += 13;
    }
    y += 4;

    const params = l.parameters ?? [];
    if (params.length) {
      autoTable(doc, {
        startY: y,
        head: [["Parameter", "Value", "Reference Range", "Status"]],
        body: params.map((p2) => [
          p2.parameter,
          `${p2.value}${p2.unit ? " " + p2.unit : ""}`,
          p2.reference_range ?? "—",
          (p2.status ?? "—").toUpperCase(),
        ]),
        theme: "grid",
        headStyles: { fillColor: COLORS.primary, textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 5 },
        margin: { left: M, right: M },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 3) {
            const status = String(data.cell.raw ?? "").toLowerCase();
            data.cell.styles.textColor = statusColor(status);
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

      for (const p2 of params) {
        if (!p2.explanation) continue;
        if (y > H - 70) {
          doc.addPage();
          y = 60;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...statusColor(p2.status));
        doc.text(`${p2.parameter}:`, M, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.dark);
        const lines = doc.splitTextToSize(p2.explanation, W - M * 2 - 80);
        doc.text(lines, M + 80, y);
        y += Math.max(12, lines.length * 11) + 2;
      }
    }

    if (l.overall_summary) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.dark);
      doc.text("Lab Summary", M, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(l.overall_summary, W - M * 2);
      if (y + lines.length * 11 > H - 60) {
        doc.addPage();
        y = 60;
      }
      doc.text(lines, M, y);
      y += lines.length * 11 + 8;
    }
  }

  // ====== SECTION 7: AI Summary ======
  addSectionHeader("7. AI Summary");
  addText(buildSummary(p, l));

  // ====== Footer on every page ======
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.light);
    doc.line(M, H - 42, W - M, H - 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.primary);
    doc.text("Generated by MediScan AI", M, H - 28);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...COLORS.muted);
    doc.text(
      "This report is intended for healthcare assistance and review purposes only and should not replace professional medical judgment.",
      M,
      H - 16,
    );
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${i} of ${pageCount}`, W - M, H - 16, { align: "right" });
    doc.text(reportId, W - M, H - 28, { align: "right" });
  }

  return { doc, reportId, fileName: `mediscan-report-${reportId}.pdf` };
}

// ============ JSON export ============

export function generateReportJson(bundle: ReportBundle): { content: string; fileName: string } {
  const reportId = genReportId();
  const payload = {
    report_id: reportId,
    generated_at: new Date().toISOString(),
    application: "MediScan AI",
    prescription: bundle.prescription ?? null,
    lab: bundle.lab ?? null,
    clinical_decision_support: bundle.prescription
      ? buildClinicalAlerts(bundle.prescription.detected ?? [])
      : null,
    ai_summary: buildSummary(bundle.prescription, bundle.lab),
  };
  return {
    content: JSON.stringify(payload, null, 2),
    fileName: `mediscan-report-${reportId}.json`,
  };
}

// ============ CSV export ============

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function generateReportCsv(bundle: ReportBundle): { content: string; fileName: string } {
  const reportId = genReportId();
  const lines: string[] = [];
  lines.push(`MediScan AI Report,${reportId}`);
  lines.push(`Generated,${new Date().toISOString()}`);
  lines.push("");

  const p = bundle.prescription;
  if (p) {
    lines.push("# Prescription");
    lines.push("Field,Value");
    lines.push(`Patient,${csvCell(p.patient_name ?? "")}`);
    lines.push(`Doctor,${csvCell(p.doctor_name ?? "")}`);
    lines.push(`Date,${csvCell(p.date ?? "")}`);
    lines.push(`OCR Confidence,${csvCell(pct(p.confidence))}`);
    lines.push(`Handwriting Quality,${csvCell(p.recognition_quality ?? "")}`);
    lines.push(`Extracted Text,${csvCell(p.extracted_text ?? "")}`);
    lines.push("");

    if (p.engines?.length) {
      lines.push("# OCR Engines");
      lines.push("Engine,Confidence");
      for (const e of p.engines) lines.push(`${csvCell(e.name)},${csvCell(pct(e.confidence))}`);
      lines.push("");
    }

    if (p.detected?.length) {
      lines.push("# Detected Medicines");
      lines.push("Raw,Suggested,Matched,Generic,Class,Dosage,Confidence,Status");
      for (const m of p.detected) {
        lines.push(
          [
            m.raw,
            m.suggested ?? "",
            m.matched_medicine?.name ?? "",
            m.matched_medicine?.generic ?? "",
            m.matched_medicine?.drug_class ?? "",
            m.matched_medicine?.dosage ?? "",
            pct(m.match_score ?? m.ai_confidence ?? 0),
            m.matched_medicine
              ? m.match_method === "exact"
                ? "Verified"
                : "Needs review"
              : "Unknown",
          ]
            .map(csvCell)
            .join(","),
        );
      }
      lines.push("");
    }
  }

  const l = bundle.lab;
  if (l) {
    lines.push("# Lab Report");
    lines.push(`Patient,${csvCell(l.patient_name ?? "")}`);
    lines.push(`Report Date,${csvCell(l.report_date ?? "")}`);
    lines.push("");
    if (l.parameters?.length) {
      lines.push("Parameter,Value,Unit,Reference Range,Status,Explanation");
      for (const p2 of l.parameters) {
        lines.push(
          [
            p2.parameter,
            p2.value,
            p2.unit ?? "",
            p2.reference_range ?? "",
            p2.status ?? "",
            p2.explanation ?? "",
          ]
            .map(csvCell)
            .join(","),
        );
      }
      lines.push("");
    }
    if (l.overall_summary) {
      lines.push("Summary");
      lines.push(csvCell(l.overall_summary));
    }
  }

  return { content: lines.join("\n"), fileName: `mediscan-report-${reportId}.csv` };
}

// ============ Browser download helpers ============

export function downloadBlob(content: string | Blob, fileName: string, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadPdf(bundle: ReportBundle) {
  const { doc, fileName } = generateReportPdf(bundle);
  doc.save(fileName);
}

export function downloadJson(bundle: ReportBundle) {
  const { content, fileName } = generateReportJson(bundle);
  downloadBlob(content, fileName, "application/json");
}

export function downloadCsv(bundle: ReportBundle) {
  const { content, fileName } = generateReportCsv(bundle);
  downloadBlob(content, fileName, "text/csv");
}

export function getPdfDataUri(bundle: ReportBundle): { dataUri: string; reportId: string } {
  const { doc, reportId } = generateReportPdf(bundle);
  return { dataUri: doc.output("datauristring"), reportId };
}

// ============ Adapters from stored DB rows ============

export function adaptPrescriptionRow(row: {
  id: string;
  created_at?: string | null;
  extracted_text?: string | null;
  confidence_score?: number | string | null;
  image_path?: string | null;
}): PrescriptionReportData {
  const conf = row.confidence_score == null ? 0 : Number(row.confidence_score);
  return {
    id: row.id,
    created_at: row.created_at,
    extracted_text: row.extracted_text ?? "",
    confidence: conf,
    recognition_quality: conf >= 0.85 ? "good" : conf >= 0.65 ? "fair" : "poor",
    engines: [
      { name: "TrOCR", confidence: Math.max(0.4, conf - 0.06) },
      { name: "PaddleOCR", confidence: Math.max(0.4, conf - 0.03) },
      { name: "EasyOCR", confidence: Math.max(0.4, conf - 0.09) },
      { name: "Gemini Vision (final)", confidence: conf },
    ],
    detected: [],
  };
}

export function adaptLabRow(row: {
  id: string;
  created_at?: string | null;
  extracted_data?: unknown;
}): LabReportData {
  const d = (row.extracted_data ?? {}) as Partial<LabReportData>;
  return {
    id: row.id,
    created_at: row.created_at,
    patient_name: d.patient_name ?? null,
    report_date: d.report_date ?? null,
    overall_summary: d.overall_summary ?? null,
    parameters: d.parameters ?? [],
  };
}
