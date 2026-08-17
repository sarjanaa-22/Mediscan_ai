import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGateway, tryParseJson } from "./ai-gateway.server";

const Input = z.object({
  fileDataUrl: z.string().min(20),
  fileName: z.string().optional(),
});

export type LabParameter = {
  name: string;
  result: string;
  unit: string;
  reference_range: string;
  /** normal | borderline | high | low | unknown */
  status: string;
  explanation: string;
};

export type AbnormalResult = {
  parameter: string;
  result: string;
  status: string;
  measures: string;
  meaning: string;
  possible_associations: string[];
  next_step: string;
};

export type MedicalFinding = {
  term: string;
  category: string;
  report_context: string;
  explanation: string;
  what_it_can_mean: string;
  possible_associations: string[];
  symptoms: string[];
  evaluation: string;
  /** confirmed | suspected | possible_association | unclear */
  diagnostic_status: string;
};

export type LabAnalysis = {
  is_medical_report: boolean;
  report_type: string | null;
  readability: "good" | "partial" | "poor";
  /** none | attention | important | urgent */
  attention_level: string;
  summary: {
    status: string;
    text: string;
    key_points: string[];
  };
  extracted_text: string;
  parameters: LabParameter[];
  abnormal_results: AbnormalResult[];
  medical_findings: MedicalFinding[];
  impression: { original: string; explanation: string } | null;
  recommendations: string[];
  warnings: string[];
};

export const analyzeLabReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const system = `You are a careful clinical report analysis assistant supporting patients.
Rules you must never break:
- Extract only what is actually present in the document. NEVER invent values, ranges, findings or text.
- Always prioritise the reference range printed on the report. If a range is absent, set reference_range to "" and note that interpretation requires clinical context.
- A finding is NOT a diagnosis. Only use diagnostic_status "confirmed" when the report explicitly states a confirmed diagnosis. Use "suspected" for wording like "suggestive of", "likely", "probable"; "possible_association" for differential/possible wording; "unclear" when the term appears without interpretation.
- Never tell the patient they definitely have a disease. Never prescribe medicine, dosages, or treatment plans.
- Do not declare anything urgent unless the report itself flags it as urgent/critical.
- If you are not confident about a medical definition, say so in the explanation rather than guessing.
Return STRICT JSON only.`;

    const userPrompt = `Analyse this uploaded medical report image (lab, pathology, blood test, or radiology: MRI/CT/X-ray/Ultrasound/PET/Mammography).

Detect medical/biological terms and findings dynamically (e.g. tumor, meningioma, cyst, lesion, nodule, adenoma, carcinoma, fibrosis, thrombosis, anemia, leukocytosis, neutropenia, inflammation, infection, calcification, hepatomegaly, fatty liver, osteoporosis, edema, fracture, mass, atrophy, hemorrhage — not limited to these).
Give special weight to the Impression / Conclusion / Opinion section.

Return JSON exactly in this shape:
{
  "is_medical_report": true,
  "report_type": "e.g. Complete Blood Count / MRI Brain, or null",
  "readability": "good" | "partial" | "poor",
  "attention_level": "none" | "attention" | "important" | "urgent",
  "summary": { "status": "Normal" | "Needs Attention" | "Significant Findings Detected", "text": "plain-language summary", "key_points": ["short bullet", "..."] },
  "extracted_text": "complete OCR text of the report, preserving test names, values, units, ranges, findings, impression, recommendations",
  "parameters": [
    { "name": "Hemoglobin", "result": "13.8", "unit": "g/dL", "reference_range": "12-16", "status": "normal" | "borderline" | "high" | "low" | "unknown", "explanation": "one plain sentence" }
  ],
  "abnormal_results": [
    { "parameter": "HbA1c", "result": "8.2 %", "status": "high", "measures": "what this parameter measures in simple words", "meaning": "what this result may indicate, hedged", "possible_associations": ["..."], "next_step": "Discuss the result with a healthcare professional." }
  ],
  "medical_findings": [
    { "term": "Possible Meningioma", "category": "radiology finding" , "report_context": "quote/summary of the relevant line from the report", "explanation": "what it is, patient-friendly", "what_it_can_mean": "general clinical significance", "possible_associations": ["..."], "symptoms": ["..."], "evaluation": "how it is usually evaluated, general", "diagnostic_status": "confirmed" | "suspected" | "possible_association" | "unclear" }
  ],
  "impression": { "original": "verbatim impression/conclusion text", "explanation": "plain-language explanation" },
  "recommendations": ["prefer recommendations printed in the report; otherwise general guidance"],
  "warnings": ["e.g. Some sections could not be read clearly"]
}

If the image is not a medical report, return {"is_medical_report": false, "extracted_text": "...", "summary": {"status":"","text":"","key_points":[]}, "parameters": [], "abnormal_results": [], "medical_findings": [], "impression": null, "recommendations": [], "warnings": [], "readability": "good", "attention_level": "none", "report_type": null}.
Use empty arrays / empty strings for anything absent. Never fabricate.`;

    const raw = await callGateway({
      model: "google/gemini-2.5-flash",
      responseJson: true,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: data.fileDataUrl } },
          ],
        },
      ],
    });

    const parsed = tryParseJson<Partial<LabAnalysis>>(raw);
    if (!parsed) {
      throw new Error(
        "Unable to read the report clearly. Please upload a higher-resolution image.",
      );
    }

    const analysis: LabAnalysis = {
      is_medical_report: parsed.is_medical_report !== false,
      report_type: parsed.report_type ?? null,
      readability: parsed.readability ?? "good",
      attention_level: parsed.attention_level ?? "none",
      summary: {
        status: parsed.summary?.status ?? "",
        text: parsed.summary?.text ?? "",
        key_points: parsed.summary?.key_points ?? [],
      },
      extracted_text: parsed.extracted_text ?? "",
      parameters: parsed.parameters ?? [],
      abnormal_results: parsed.abnormal_results ?? [],
      medical_findings: parsed.medical_findings ?? [],
      impression: parsed.impression?.original ? parsed.impression : null,
      recommendations: parsed.recommendations ?? [],
      warnings: parsed.warnings ?? [],
    };

    if (!analysis.is_medical_report) {
      throw new Error(
        "This doesn't appear to be a medical report. Please upload a valid lab, pathology, or radiology report.",
      );
    }
    if (
      analysis.readability === "poor" &&
      analysis.parameters.length === 0 &&
      analysis.medical_findings.length === 0 &&
      !analysis.impression
    ) {
      throw new Error(
        "Unable to read the report clearly. Please upload a higher-resolution image.",
      );
    }
    if (analysis.readability === "partial") {
      analysis.warnings = [
        "Some sections could not be read clearly. Please verify the extracted information against the original report.",
        ...analysis.warnings,
      ];
    }

    const { getOptionalUserId } = await import("./auth-helpers.server");
    const userId = await getOptionalUserId();

    let id: string = crypto.randomUUID() as string;
    if (userId) {
      const { data: row, error } = await supabaseAdmin
        .from("lab_reports")
        .insert({
          report_path: null,
          extracted_data: analysis,
          user_id: userId,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = row.id as string;
    }

    return { id, analysis };
  });
