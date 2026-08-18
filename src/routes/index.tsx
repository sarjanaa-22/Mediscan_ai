import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ScanLine,
  FlaskConical,
  Pill,
  FileText,
  ShieldCheck,
  Sparkles,
  Camera,
  Activity,
} from "lucide-react";

const TITLE = "AI Medical Report Analyzer & Prescription Scanner — MediScan AI";
const DESCRIPTION =
  "MediScan AI reads handwritten prescriptions with AI OCR, verifies medicines against 11,800+ drugs, and explains lab and radiology reports in plain language.";
const URL = "https://ai-mediscan.lovable.app/";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "MediScan AI",
          applicationCategory: "HealthApplication",
          operatingSystem: "Web",
          url: URL,
          description: DESCRIPTION,
        }),
      },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: ScanLine,
    title: "Handwritten prescription OCR",
    body: "Upload or photograph a prescription and AI vision extracts the full text, including difficult handwriting, with a per-scan confidence score.",
  },
  {
    icon: Pill,
    title: "Medicine detection & verification",
    body: "Detected drug names are fuzzy-matched and expanded from abbreviations (PCM, AMOX), then verified against a catalogue of 11,800+ medicines with composition and manufacturer.",
  },
  {
    icon: FlaskConical,
    title: "Lab report explanation",
    body: "Blood panels, biochemistry and radiology reports are parsed into parameters with reference ranges, and abnormal values are explained in plain language.",
  },
  {
    icon: Activity,
    title: "Findings in plain English",
    body: "Medical terms found in reports — cysts, nodules, tumours, impressions — get a simple explanation and whether they read as confirmed or suspected.",
  },
  {
    icon: FileText,
    title: "Downloadable PDF reports",
    body: "Every analysis can be exported as a branded PDF, or as JSON and CSV, with the medicine table, confidence score and AI summary included.",
  },
  {
    icon: Camera,
    title: "Camera capture on mobile",
    body: "Use the front or rear camera directly in the browser. Images are compressed before upload so scans work on slow connections.",
  },
];

const steps = [
  { n: "1", t: "Capture", d: "Photograph or upload a prescription or lab report." },
  { n: "2", t: "Analyze", d: "AI vision extracts text, parameters and medicine names." },
  { n: "3", t: "Verify", d: "Medicines are matched against the drug database and flagged." },
  { n: "4", t: "Export", d: "Read the summary on screen or download a PDF report." },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2 font-semibold">
            <ScanLine className="h-5 w-5 text-primary" aria-hidden="true" />
            MediScan AI
          </span>
          <nav className="flex items-center gap-2" aria-label="Main">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/scanner">Scan a prescription</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            AI prescription digitization & clinical decision support
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            AI medical report analyzer and handwritten prescription scanner
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            MediScan AI turns a photo of a handwritten prescription into structured, verified
            medicine data, and translates lab and radiology reports into language patients and
            clinicians can act on — in seconds, with a downloadable PDF report.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/scanner">Scan a prescription</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/lab">Analyze a lab report</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/medicines">Browse medicine database</Link>
            </Button>
          </div>
        </section>

        <section className="border-y border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-2xl font-bold tracking-tight">What MediScan AI does</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              One workspace for prescription digitization, medicine verification and medical report
              explanation.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <Card key={f.title}>
                  <CardHeader className="pb-2">
                    <f.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <CardTitle className="text-base">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{f.body}</CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <li key={s.n} className="rounded-lg border border-border/60 p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {s.n}
                </span>
                <h3 className="mt-3 font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-2xl font-bold tracking-tight">Who it's for</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Patients</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Understand what a prescription actually says and what a lab value means, without
                  waiting for a follow-up appointment.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Clinicians</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Digitize paper prescriptions into structured records and cross-check drug names
                  and compositions before dispensing.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Pharmacies & clinics</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Reduce transcription errors with confidence scoring and a searchable catalogue of
                  11,800+ medicines.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold tracking-tight">Common questions</h2>
          <Accordion type="single" collapsible className="mt-4 max-w-3xl">
            <AccordionItem value="a">
              <AccordionTrigger>Can it read genuinely bad handwriting?</AccordionTrigger>
              <AccordionContent>
                MediScan AI uses an AI vision model rather than classic character OCR, which handles
                cursive and abbreviated prescriptions far better. Every scan returns a confidence
                score so low-quality results are obvious and can be re-scanned.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="b">
              <AccordionTrigger>What kinds of lab reports are supported?</AccordionTrigger>
              <AccordionContent>
                Blood counts, biochemistry and metabolic panels, thyroid and lipid profiles, and
                narrative radiology reports with impressions. Image uploads are supported today.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="c">
              <AccordionTrigger>Do I need an account?</AccordionTrigger>
              <AccordionContent>
                You can continue as a guest to try the tools. Signing in saves your scans and
                analyses to your report history so you can download them later.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="d">
              <AccordionTrigger>Is this a medical diagnosis?</AccordionTrigger>
              <AccordionContent>
                No. MediScan AI is an assistive tool for digitization and explanation. It does not
                diagnose or prescribe, and its output should always be reviewed by a qualified
                healthcare professional.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section className="border-t border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-6xl px-4 py-14 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Try it on your next prescription</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              No setup required — open the scanner, capture the page, and get a verified medicine
              list with a downloadable report.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/scanner">Open the scanner</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            MediScan AI is an assistive tool and does not replace professional medical advice,
            diagnosis or treatment.
          </p>
          <nav className="mt-4 flex flex-wrap gap-4" aria-label="Footer">
            <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <Link to="/scanner" className="hover:text-foreground">Prescription scanner</Link>
            <Link to="/lab" className="hover:text-foreground">Lab report analyzer</Link>
            <Link to="/medicines" className="hover:text-foreground">Medicines</Link>
            <Link to="/reports" className="hover:text-foreground">Reports</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
