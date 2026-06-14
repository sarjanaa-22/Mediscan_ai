import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ScanLine,
  ShieldCheck,
  FlaskConical,
  LayoutDashboard,
  Stethoscope,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediScan AI — AI Prescription Digitization & Clinical Decision Support" },
      {
        name: "description",
        content:
          "Digitize handwritten prescriptions, verify medicines and analyze lab reports with clinical-grade AI in seconds.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-tight">MediScan AI</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#ocr" className="hover:text-foreground">OCR</a>
            <a href="#dashboard" className="hover:text-foreground">Dashboard</a>
            <a href="#contact" className="hover:text-foreground">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="gradient-hero">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI-powered clinical workflows
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
              Turn unreadable prescriptions into{" "}
              <span className="text-primary">clinical clarity</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              MediScan AI digitizes handwritten prescriptions — even the worst handwriting —
              verifies every medicine against our drug database, and analyzes lab reports with
              patient-friendly explanations.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Upload Prescription
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#features">See how it works</a>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 text-center text-sm">
              {[
                ["98%", "OCR confidence"],
                ["<3s", "avg. extraction"],
                ["150+", "medicines verified"],
              ].map(([k, v]) => (
                <div key={v}>
                  <div className="text-2xl font-bold text-foreground">{k}</div>
                  <div className="text-xs text-muted-foreground">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything a modern clinic needs
            </h2>
            <p className="mt-3 text-muted-foreground">
              From scan to verified script in under a minute.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: ScanLine,
                title: "OCR Technology",
                body: "Multi-pass vision pipeline tuned for cursive doctor handwriting and faded prints.",
              },
              {
                icon: ShieldCheck,
                title: "Medicine Verification",
                body: "Exact match, abbreviation expansion (PCM→Paracetamol) and fuzzy correction.",
              },
              {
                icon: FlaskConical,
                title: "Lab Report Analysis",
                body: "Extracts every parameter with reference ranges and plain-English explanations.",
              },
              {
                icon: LayoutDashboard,
                title: "Live Dashboard",
                body: "Real-time stats — accuracy trends, monthly volume and verification breakdowns.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="card-elevated rounded-xl border border-border/60 p-6 transition-transform hover:-translate-y-1"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OCR Section */}
      <section id="ocr" className="border-t border-border/60 bg-secondary/30 py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold text-primary">OCR Engine</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Built for the messiest handwriting
            </h2>
            <p className="mt-4 text-muted-foreground">
              Our pipeline preprocesses the image, runs vision recognition, scores confidence per
              token and reconciles the final output — so &quot;Paracetmol&quot; still becomes{" "}
              <span className="font-medium text-foreground">Paracetamol</span>.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "TrOCR, PaddleOCR, EasyOCR comparison view",
                "Confidence score per engine",
                "Editable extracted text with one click",
                "Auto-detection of medicine names",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="card-elevated rounded-2xl border border-border/60 p-6">
            <div className="rounded-lg border border-dashed border-border/80 bg-background p-6 font-mono text-sm leading-relaxed text-muted-foreground">
              <div className="mb-2 text-[10px] uppercase tracking-widest text-primary">
                Extracted text
              </div>
              <div>
                Rx <br />
                1. <span className="text-foreground">PCM 500mg</span> — 1 tab TID × 5 days <br />
                2. <span className="text-foreground">AMOX 500mg</span> — 1 cap BD × 7 days <br />
                3. <span className="text-foreground">Omeprazole 20mg</span> — 1 OD × 14 days
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
              {[
                ["TrOCR", 0.84],
                ["PaddleOCR", 0.91],
                ["Gemini", 0.97],
              ].map(([n, c]) => (
                <div key={n as string} className="rounded-lg border border-border/60 p-3">
                  <div className="text-muted-foreground">{n}</div>
                  <div className="mt-1 text-base font-bold text-foreground">
                    {Math.round((c as number) * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard preview */}
      <section id="dashboard" className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Insights, not just outputs
            </h2>
            <p className="mt-3 text-muted-foreground">
              Track every scan, accuracy trend and verification status in one elegant dashboard.
            </p>
          </div>
          <div className="mt-10 overflow-hidden rounded-2xl border border-border/60 card-elevated">
            <div className="grid gap-4 bg-secondary/30 p-6 sm:grid-cols-4">
              {[
                ["Prescriptions", "248"],
                ["Medicines verified", "612"],
                ["OCR accuracy", "97%"],
                ["Lab reports", "84"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-xl border border-border/60 bg-card p-4"
                >
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="mt-1 text-2xl font-bold">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="border-t border-border/60 bg-secondary/30 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">Ready to digitize your practice?</h2>
          <p className="mt-3 text-muted-foreground">
            Start with a single prescription — no setup, no credit card.
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild size="lg">
              <Link to="/auth">
                Upload Prescription
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10 text-center text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">MediScan AI</span>
          </div>
          <p>© {new Date().getFullYear()} MediScan AI. For research and demo use only.</p>
        </div>
      </footer>
    </div>
  );
}
