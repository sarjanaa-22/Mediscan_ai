import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Stethoscope, Loader2, Mail, Lock, User as UserIcon, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — MediScan AI" }] }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Password required").max(128),
});
const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name too short").max(100),
    email: z.string().trim().email("Enter a valid email").max(255),
    password: z.string().min(8, "Minimum 8 characters").max(128),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

function AuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, signInGuest } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    if (isAuthenticated) navigate({ to: "/dashboard", replace: true });
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: "/dashboard", replace: true });
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = registerSchema.safeParse({
      name: fd.get("name"),
      email: fd.get("email"),
      password: fd.get("password"),
      confirm: fd.get("confirm"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: parsed.data.name },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created! Check your email if confirmation is required.");
    navigate({ to: "/dashboard", replace: true });
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) {
      setLoading(false);
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  };

  const handleGuest = () => {
    signInGuest();
    toast.success("Continuing as guest");
    navigate({ to: "/dashboard", replace: true });
  };

  const handleForgot = async () => {
    const email = window.prompt("Enter your account email:");
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Stethoscope className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">MediScan AI</h1>
          <p className="text-sm text-muted-foreground">Clinical Decision Support Platform</p>
        </div>

        <Card className="border-border/60 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {tab === "login" ? "Sign in to your account" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {tab === "login" ? "Welcome back. Enter your credentials below." : "Get started in seconds."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
              <TabsList className="grid grid-cols-2 mb-4 w-full">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <Field id="email" label="Email" icon={<Mail className="h-4 w-4" />}>
                    <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@clinic.com" required />
                  </Field>
                  <Field id="password" label="Password" icon={<Lock className="h-4 w-4" />}>
                    <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
                  </Field>
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                      <span className="text-muted-foreground">Remember me</span>
                    </label>
                    <button type="button" onClick={handleForgot} className="text-primary hover:underline">
                      Forgot password?
                    </button>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <Field id="name" label="Full name" icon={<UserIcon className="h-4 w-4" />}>
                    <Input id="name" name="name" autoComplete="name" placeholder="Dr. Jane Smith" required />
                  </Field>
                  <Field id="r-email" label="Email" icon={<Mail className="h-4 w-4" />}>
                    <Input id="r-email" name="email" type="email" autoComplete="email" placeholder="you@clinic.com" required />
                  </Field>
                  <Field id="r-password" label="Password" icon={<Lock className="h-4 w-4" />}>
                    <Input id="r-password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" required minLength={8} />
                  </Field>
                  <Field id="r-confirm" label="Confirm password" icon={<Lock className="h-4 w-4" />}>
                    <Input id="r-confirm" name="confirm" type="password" autoComplete="new-password" placeholder="Re-enter password" required />
                  </Field>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or continue with</span></div>
            </div>

            <div className="grid gap-2">
              <Button variant="outline" onClick={handleGoogle} disabled={loading} className="w-full">
                <GoogleIcon /> Continue with Google
              </Button>
              <Button variant="ghost" onClick={handleGuest} disabled={loading} className="w-full">
                <ShieldCheck className="h-4 w-4" /> Continue as Guest
              </Button>
            </div>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              {tab === "login" ? (
                <>Don't have an account? <button onClick={() => setTab("register")} className="text-primary hover:underline">Create account</button></>
              ) : (
                <>Already have one? <button onClick={() => setTab("login")} className="text-primary hover:underline">Sign in</button></>
              )}
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Protected by JWT authentication. Passwords are hashed with bcrypt.
        </p>
        <p className="mt-2 text-center text-xs">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">← Back home</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ id, label, icon, children }: { id: string; label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</Label>
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.95l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}
