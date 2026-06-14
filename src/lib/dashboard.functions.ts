import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [rxRes, labRes, verRes] = await Promise.all([
      supabase
        .from("prescriptions")
        .select("id, confidence_score, created_at, detected_medicines", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("lab_reports")
        .select("id, created_at", { count: "exact" })
        .eq("user_id", userId),
      supabase
        .from("verification_logs")
        .select("verification_status, created_at, matched_medicine, raw_text", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    const rxs = rxRes.data ?? [];
    const verified = (verRes.data ?? []).filter(
      (v) => v.verification_status === "verified" || v.verification_status === "needs_review",
    ).length;
    const accuracy =
      rxs.length > 0
        ? rxs.reduce((s, r) => s + Number(r.confidence_score ?? 0), 0) / rxs.length
        : 0;

    // Monthly trend (last 6 months)
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
      verified: (verRes.data ?? []).filter((v) => v.verification_status === "verified").length,
      review: (verRes.data ?? []).filter((v) => v.verification_status === "needs_review").length,
      unknown: (verRes.data ?? []).filter((v) => v.verification_status === "unknown").length,
    };

    const recent = (verRes.data ?? []).slice(0, 8);

    return {
      totals: {
        prescriptions: rxRes.count ?? rxs.length,
        lab_reports: labRes.count ?? 0,
        medicines_verified: verified,
        accuracy: Math.round(accuracy * 100),
      },
      monthly: months,
      verification: verCounts,
      recent,
    };
  });
