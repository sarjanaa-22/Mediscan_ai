import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SearchInput = z.object({
  q: z.string().min(0).max(200).default(""),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(500).default(100),
});

export const searchMedicines = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => SearchInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const orFilter =
      data.q && data.q.trim()
        ? (() => {
            const q = data.q.trim().replace(/,/g, " ").replace(/[%_]/g, " ");
            return `medicine_name.ilike.%${q}%,composition.ilike.%${q}%,manufacturer.ilike.%${q}%,generic_name.ilike.%${q}%`;
          })()
        : null;

    // 1) Count first so we can clamp the page and avoid PostgREST 416 errors
    //    when the requested range exceeds the filtered row count.
    const countQ = supabaseAdmin
      .from("medicines")
      .select("*", { count: "exact", head: true });
    const { count, error: countError } = await (orFilter ? countQ.or(orFilter) : countQ);
    if (countError) throw new Error(countError.message);

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / data.limit));
    const page = Math.min(Math.max(1, data.page), totalPages);
    const from = (page - 1) * data.limit;
    const to = from + data.limit - 1;

    type MedicineRow = Database["public"]["Tables"]["medicines"]["Row"];
    let rows: MedicineRow[] = [];
    if (total > 0) {
      const dataQ = supabaseAdmin
        .from("medicines")
        .select("*")
        .order("medicine_name")
        .range(from, to);
      const { data: result, error } = await (orFilter ? dataQ.or(orFilter) : dataQ);
      if (error) throw new Error(error.message);
      rows = result ?? [];
    }

    return {
      total_records: total,
      current_page: page,
      total_pages: totalPages,
      limit: data.limit,
      medicines: rows ?? [],
    };
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
