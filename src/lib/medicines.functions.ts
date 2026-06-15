import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SearchInput = z.object({ q: z.string().min(0).max(100).default("") });

export const searchMedicines = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => SearchInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("medicines")
      .select("*")
      .order("medicine_name")
      .limit(60);

    if (data.q && data.q.trim()) {
      const q = data.q.trim().replace(/,/g, " ");
      query = query.or(
        `medicine_name.ilike.%${q}%,composition.ilike.%${q}%,generic_name.ilike.%${q}%,drug_class.ilike.%${q}%,manufacturer.ilike.%${q}%`,
      );
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listPrescriptions = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("prescriptions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listLabReports = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("lab_reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

const DeleteInput = z.object({ id: z.string().uuid(), kind: z.enum(["prescription", "lab"]) });

export const deleteRecord = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DeleteInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = data.kind === "prescription" ? "prescriptions" : "lab_reports";
    const { error } = await supabaseAdmin.from(table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
