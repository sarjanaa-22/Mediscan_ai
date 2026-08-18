import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MediScan AI" },
      { name: "description", content: "Manage your MediScan AI preferences, appearance theme, OCR defaults and account details." },
      { property: "og:title", content: "Settings — MediScan AI" },
      { property: "og:description", content: "Manage your MediScan AI preferences, appearance theme, OCR defaults and account details." },
      { property: "og:url", content: "https://ai-mediscan.lovable.app/settings" },
      { name: "twitter:title", content: "Settings — MediScan AI" },
      { name: "twitter:description", content: "Manage your MediScan AI preferences, appearance theme, OCR defaults and account details." },
    ],
    links: [{ rel: "canonical", href: "https://ai-mediscan.lovable.app/settings" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your MediScan AI experience.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">
              Switch between light and dark mode.
            </p>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">MediScan AI</span> — AI-powered
            prescription digitization and clinical decision support.
          </p>
          <p>
            OCR powered by Gemini 2.5 Vision. Medicine catalog with ~150 common drugs.
            This is a standalone clinical tool — no user accounts required.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
