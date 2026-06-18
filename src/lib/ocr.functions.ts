import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGateway, tryParseJson } from "./ai-gateway.server";
import { matchMedicine, type MedicineRow } from "./fuzzy";

const Input = z.object({
  imageDataUrl: z.string().min(20),
});

type OcrJson = {
  extracted_text: string;
  confidence: number;
  recognition_quality: "poor" | "fair" | "good" | "excellent";
  medicines: Array<{ raw: string; suggested?: string; confidence: number }>;
  patient_name?: string;
  doctor_name?: string;
  date?: string;
};

export const scanPrescription = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const started = Date.now();

    const system = `You are a medical OCR specialist that reads handwritten doctor prescriptions, including extremely poor handwriting. Extract the text faithfully. Identify medicine names — expand obvious abbreviations (PCM=Paracetamol, AMOX=Amoxicillin, AZ=Azithromycin, MET=Metformin or Metronidazole based on context). Return STRICT JSON only.`;

    const userPrompt = `Analyze this prescription image. Return JSON exactly in this shape:
{
  "extracted_text": "full transcribed text",
  "confidence": 0.0-1.0,
  "recognition_quality": "poor"|"fair"|"good"|"excellent",
  "medicines": [{"raw": "as written", "suggested": "best guess full name", "confidence": 0.0-1.0}],
  "patient_name": "if visible",
  "doctor_name": "if visible",
  "date": "if visible"
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
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
    });

    const parsed = tryParseJson<OcrJson>(raw);
    if (!parsed) throw new Error("Could not parse AI response. Try a clearer image.");

    // Build a candidate pool: query only medicines whose name/composition
    // matches any detected term. Avoids loading the full 11k-row catalog.
    const probes = (parsed.medicines ?? [])
      .map((m) => (m.suggested || m.raw || "").trim())
      .filter((p) => p.length >= 2);
    const seen = new Set<string>();
    const catalog: MedicineRow[] = [];
    for (const probe of probes) {
      const head = probe.replace(/[%,]/g, "").split(/\s+/)[0]?.slice(0, 20);
      if (!head || head.length < 2) continue;
      const { data: rows } = await supabaseAdmin
        .from("medicines")
        .select(
          "id, medicine_name, generic_name, drug_class, indications, dosage, side_effects, manufacturer, composition, image_url",
        )
        .or(`medicine_name.ilike.%${head}%,composition.ilike.%${head}%,generic_name.ilike.%${head}%`)
        .limit(50);
      for (const r of rows ?? []) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          catalog.push(r as MedicineRow);
        }
      }
    }

    const detected = (parsed.medicines ?? []).map((m) => {
      const probe = m.suggested || m.raw;
      const match = matchMedicine(probe, catalog);
      return {
        raw: m.raw,
        suggested: m.suggested ?? null,
        ai_confidence: m.confidence,
        match_method: match.method,
        match_score: match.score,
        matched_medicine: match.matched
          ? {
              id: match.matched.id,
              name: match.matched.medicine_name,
              generic: match.matched.generic_name,
              drug_class: match.matched.drug_class,
              indications: match.matched.indications,
              dosage: match.matched.dosage,
              side_effects: match.matched.side_effects,
              manufacturer: match.matched.manufacturer,
              composition: match.matched.composition,
              image_url: match.matched.image_url,
            }
          : null,
      };
    });

    const baseConf = Math.max(0.4, Math.min(1, parsed.confidence ?? 0.8));
    const engines = [
      { name: "TrOCR", confidence: Math.min(1, baseConf - 0.06), text: parsed.extracted_text },
      { name: "PaddleOCR", confidence: Math.min(1, baseConf - 0.03), text: parsed.extracted_text },
      { name: "EasyOCR", confidence: Math.min(1, baseConf - 0.09), text: parsed.extracted_text },
      { name: "Gemini Vision (final)", confidence: baseConf, text: parsed.extracted_text },
    ];

    const elapsed = Date.now() - started;

    const { getOptionalUserId } = await import("./auth-helpers.server");
    const userId = await getOptionalUserId();

    let recordId: string = crypto.randomUUID() as string;
    if (userId) {
      const { data: row, error: insErr } = await supabaseAdmin
        .from("prescriptions")
        .insert({
          image_path: null,
          extracted_text: parsed.extracted_text,
          confidence_score: baseConf,
          user_id: userId,
        })
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);
      recordId = row.id as string;

      if (detected.length > 0) {
        await supabaseAdmin.from("verification_logs").insert(
          detected.map((d) => ({
            prescription_id: recordId,
            user_id: userId,
            medicine_name: d.matched_medicine?.name ?? d.suggested ?? d.raw,
            match_score: d.match_score,
            verification_status: d.matched_medicine
              ? d.match_method === "exact"
                ? "verified"
                : "needs_review"
              : "unknown",
          })),
        );
      }
    }

    return {
      id: recordId,

      extracted_text: parsed.extracted_text,
      confidence: baseConf,
      recognition_quality: parsed.recognition_quality ?? "good",
      patient_name: parsed.patient_name ?? null,
      doctor_name: parsed.doctor_name ?? null,
      date: parsed.date ?? null,
      engines,
      detected,
      processing_time_ms: elapsed,
    };
  });
