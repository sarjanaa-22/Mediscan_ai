import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const GUEST_KEY = "mediscan_guest_mode";

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: { full_name: string | null; email: string | null } | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  signInGuest: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthState["profile"]>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        setIsGuest(false);
        try { localStorage.removeItem(GUEST_KEY); } catch {}
        // Defer profile fetch to avoid deadlocks
        setTimeout(() => {
          (supabase as any)
            .from("profiles")
            .select("full_name, email")
            .eq("id", sess.user.id)
            .maybeSingle()
            .then(({ data }: { data: { full_name: string | null; email: string | null } | null }) =>
              setProfile(data ?? { full_name: null, email: sess.user.email ?? null }),
            );
        }, 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) {
        try { setIsGuest(localStorage.getItem(GUEST_KEY) === "1"); } catch {}
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signInGuest = () => {
    try { localStorage.setItem(GUEST_KEY, "1"); } catch {}
    setIsGuest(true);
  };

  const signOut = async () => {
    try { localStorage.removeItem(GUEST_KEY); } catch {}
    setIsGuest(false);
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        isGuest,
        isAuthenticated: !!session || isGuest,
        loading,
        signInGuest,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
