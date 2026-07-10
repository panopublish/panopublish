import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const code = params?.get("code");
    const isGoogleCallback =
      typeof window !== "undefined" && window.location.pathname.includes("/auth/google/callback");
    const shouldExchange = code && !isGoogleCallback;

    const initializeAuth = async () => {
      if (shouldExchange && code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("Error exchanging code for session:", error);
            const { toast } = await import("sonner");
            toast.error("Email verification failed: " + error.message);
          } else {
            const { toast } = await import("sonner");
            toast.success("Email confirmed successfully! Welcome.");
          }
        } catch (err) {
          console.error("Unexpected error exchanging code:", err);
        } finally {
          const url = new URL(window.location.href);
          url.searchParams.delete("code");
          window.history.replaceState({}, document.title, url.pathname + url.search);
        }
      }
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };

    initializeAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
