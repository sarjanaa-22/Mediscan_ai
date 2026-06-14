import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SearchInput = z.object({ q: z.string().min(0).max(100).default("") });

export const searchMedicines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SearchInput.parse(d))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("medicines")
      .select("*")
      .order("medicine_name")
      .limit(200);

    if (data.q && data.q.trim()) {
      const q = data.q.trim();
      query = query.or(
        `medicine_name.ilike.%${q}%,generic_name.ilike.%${q}%,drug_class.ilike.%${q}%`,
      );
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listPrescriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("prescriptions")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listLabReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lab_reports")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const DeleteInput = z.object({ id: z.string().uuid(), kind: z.enum(["prescription", "lab"]) });

export const deleteRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const table = data.kind === "prescription" ? "prescriptions" : "lab_reports";
    const { error } = await context.supabase
      .from(table)
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
