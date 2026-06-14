import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callGateway, tryParseJson } from "./ai-gateway.server";

const Input = z.object({
  fileDataUrl: z.string().min(20),
  fileName: z.string().optional(),
});

export type LabParameter = {
  parameter: string;
  value: string;
  unit: string;
  reference_range: string;
  status: "normal" | "high" | "low" | "critical" | "unknown";
  explanation: string;
};

export type LabAnalysis = {
  patient_name: string | null;
  report_date: string | null;
  parameters: LabParameter[];
  overall_summary: string;
};

export const analyzeLabReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const system = `You are a clinical pathologist assistant. Read laboratory reports (CBC, lipid, metabolic panels, etc) from images or PDFs and extract structured data. Provide a plain-English explanation for each parameter understandable by patients. Return STRICT JSON.`;

    const userPrompt = `Extract every measured parameter from this lab report. Focus on common ones (Hemoglobin, WBC, Platelets, Glucose, HbA1c, Cholesterol, HDL, LDL, Triglycerides, Creatinine, Urea, ALT, AST, TSH, etc) but include any others present.

Return JSON exactly in this shape:
{
  "patient_name": "if visible or null",
  "report_date": "if visible or null",
  "parameters": [
    {
      "parameter": "Hemoglobin",
      "value": "13.5",
      "unit": "g/dL",
      "reference_range": "13.0-17.0",
      "status": "normal"|"high"|"low"|"critical"|"unknown",
      "explanation": "one sentence patient-friendly explanation"
    }
  ],
  "overall_summary": "2-3 sentence summary of the report"
}`;

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

    const parsed = tryParseJson<LabAnalysis>(raw);
    if (!parsed) throw new Error("Could not parse lab report. Try a clearer file.");

    const { data: row, error } = await context.supabase
      .from("lab_reports")
      .insert({
        user_id: context.userId,
        report_path: null,
        patient_name: parsed.patient_name,
        extracted_data: parsed,
        summary: parsed.overall_summary,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { id: row.id as string, analysis: parsed };
  });
