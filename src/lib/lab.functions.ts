import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const system = `You are a clinical pathologist assistant. Read laboratory reports from images and extract structured data. Provide a plain-English explanation for each parameter. Return STRICT JSON.`;

    const userPrompt = `Extract every measured parameter from this lab report. Return JSON exactly:
{
  "patient_name": "if visible or null",
  "report_date": "if visible or null",
  "parameters": [
    {"parameter": "Hemoglobin", "value": "13.5", "unit": "g/dL", "reference_range": "13.0-17.0", "status": "normal", "explanation": "one sentence patient-friendly explanation"}
  ],
  "overall_summary": "2-3 sentence summary"
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

    const { getOptionalUserId } = await import("./auth-helpers.server");
    const userId = await getOptionalUserId();

    let id: string = crypto.randomUUID() as string;
    if (userId) {
      const { data: row, error } = await supabaseAdmin
        .from("lab_reports")
        .insert({
          report_path: null,
          extracted_data: parsed,
          user_id: userId,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = row.id as string;
    }

    return { id, analysis: parsed };
  });

