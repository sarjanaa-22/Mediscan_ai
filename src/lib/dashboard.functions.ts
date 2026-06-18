import { createServerFn } from "@tanstack/react-start";

export const getDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getOptionalUserId } = await import("./auth-helpers.server");
  const userId = await getOptionalUserId();

  const rxBase = supabaseAdmin
    .from("prescriptions")
    .select("id, confidence_score, created_at", { count: "exact" })
    .order("created_at", { ascending: false });
  const labBase = supabaseAdmin.from("lab_reports").select("id, created_at", { count: "exact" });
  const verBase = supabaseAdmin
    .from("verification_logs")
    .select("verification_status, created_at, medicine_name, match_score", { count: "exact" })
    .order("created_at", { ascending: false });

  const [rxRes, labRes, verRes, medRes, medLatest] = await Promise.all([
    userId ? rxBase.eq("user_id", userId) : Promise.resolve({ data: [], count: 0 } as Awaited<typeof rxBase>),
    userId ? labBase.eq("user_id", userId) : Promise.resolve({ data: [], count: 0 } as Awaited<typeof labBase>),
    userId ? verBase.eq("user_id", userId) : Promise.resolve({ data: [], count: 0 } as Awaited<typeof verBase>),
    supabaseAdmin.from("medicines").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("medicines")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);


  const rxs = rxRes.data ?? [];
  const vers = verRes.data ?? [];
  const verified = vers.filter(
    (v) => v.verification_status === "verified" || v.verification_status === "needs_review",
  ).length;
  const accuracy =
    rxs.length > 0
      ? rxs.reduce((s, r) => s + Number(r.confidence_score ?? 0), 0) / rxs.length
      : 0;

  const months: { month: string; prescriptions: number; accuracy: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("en", { month: "short" });
    const monthRx = rxs.filter((r) => {
      const c = new Date(r.created_at);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    });
    const acc =
      monthRx.length > 0
        ? monthRx.reduce((s, r) => s + Number(r.confidence_score ?? 0), 0) / monthRx.length
        : 0;
    months.push({ month: label, prescriptions: monthRx.length, accuracy: Math.round(acc * 100) });
  }

  const verCounts = {
    verified: vers.filter((v) => v.verification_status === "verified").length,
    review: vers.filter((v) => v.verification_status === "needs_review").length,
    unknown: vers.filter((v) => v.verification_status === "unknown").length,
  };

  const recent = vers.slice(0, 8);

  return {
    totals: {
      prescriptions: rxRes.count ?? rxs.length,
      lab_reports: labRes.count ?? 0,
      medicines_verified: verified,
      accuracy: Math.round(accuracy * 100),
      medicines_catalog: medRes.count ?? 0,
      last_import: medLatest.data?.created_at ?? null,
    },
    monthly: months,
    verification: verCounts,
    recent,
  };
});
