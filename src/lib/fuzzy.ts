// Lightweight Levenshtein + match scoring used both client and server.

export function levenshtein(a: string, b: string): number {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const v0 = new Array(bl + 1);
  const v1 = new Array(bl + 1);
  for (let i = 0; i <= bl; i++) v0[i] = i;
  for (let i = 0; i < al; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < bl; j++) {
      const cost = a.charCodeAt(i) === b.charCodeAt(j) ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= bl; j++) v0[j] = v1[j];
  }
  return v1[bl];
}

export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  return 1 - levenshtein(a, b) / maxLen;
}

// Common abbreviation map (in-code, since the DB column was removed).
const ABBREVIATIONS: Record<string, string> = {
  pcm: "paracetamol",
  para: "paracetamol",
  amox: "amoxicillin",
  az: "azithromycin",
  azi: "azithromycin",
  met: "metformin",
  mtx: "methotrexate",
  ome: "omeprazole",
  pan: "pantoprazole",
  cipro: "ciprofloxacin",
  ceft: "ceftriaxone",
  ibu: "ibuprofen",
  dic: "diclofenac",
  asp: "aspirin",
  ator: "atorvastatin",
  losart: "losartan",
};

export type MedicineRow = {
  id: string;
  medicine_name: string;
  generic_name: string | null;
  drug_class: string | null;
  indications: string | null;
  dosage: string | null;
  side_effects: string | null;
  manufacturer: string | null;
  composition: string | null;
  image_url: string | null;
};

export type MatchResult = {
  query: string;
  matched: MedicineRow | null;
  score: number;
  method: "exact" | "abbreviation" | "fuzzy" | "none";
};

export function matchMedicine(query: string, catalog: MedicineRow[]): MatchResult {
  const q = query.trim();
  if (!q) return { query, matched: null, score: 0, method: "none" };
  const qLower = q.toLowerCase();

  // 1. Exact
  for (const m of catalog) {
    if (m.medicine_name.toLowerCase() === qLower) {
      return { query: q, matched: m, score: 1, method: "exact" };
    }
  }

  // 2. Abbreviation (in-code map)
  const expanded = ABBREVIATIONS[qLower];
  if (expanded) {
    for (const m of catalog) {
      if (
        m.medicine_name.toLowerCase() === expanded ||
        (m.generic_name ?? "").toLowerCase() === expanded
      ) {
        return { query: q, matched: m, score: 0.95, method: "abbreviation" };
      }
    }
  }

  // 3. Fuzzy
  let best: MatchResult = { query: q, matched: null, score: 0, method: "none" };
  for (const m of catalog) {
    const s = Math.max(
      similarity(qLower, m.medicine_name.toLowerCase()),
      m.generic_name ? similarity(qLower, m.generic_name.toLowerCase()) : 0,
    );
    if (s > best.score) {
      best = { query: q, matched: m, score: s, method: "fuzzy" };
    }
  }
  if (best.score < 0.7) {
    return { query: q, matched: null, score: best.score, method: "none" };
  }
  return best;
}
