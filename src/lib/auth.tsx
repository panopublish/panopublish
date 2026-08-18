import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type CustomUser = {
  id: string;
  email: string;
};

type CustomSession = {
  access_token: string;
  expires_at: number;
  user: CustomUser;
};

type AuthCtx = {
  session: CustomSession | null;
  user: CustomUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setSession: (s: CustomSession | null) => void;
  impersonatorSession: CustomSession | null;
  startImpersonation: (targetSession: CustomSession) => void;
  stopImpersonation: () => void;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  setSession: () => {},
  impersonatorSession: null,
  startImpersonation: () => {},
  stopImpersonation: () => {},
});

function decodeJWT(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad === 2) base64 += '==';
    else if (pad === 3) base64 += '=';
    return JSON.parse(atob(base64));
  } catch (err) {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<CustomSession | null>(null);
  const [impersonatorSession, setImpersonatorSessionState] = useState<CustomSession | null>(null);
  const [loading, setLoading] = useState(true);

  const setSession = (s: CustomSession | null) => {
    if (s) {
      localStorage.setItem("panopublish_session", JSON.stringify(s));
    } else {
      localStorage.removeItem("panopublish_session");
    }
    setSessionState(s);
  };

  const startImpersonation = (targetSession: CustomSession) => {
    if (session) {
      localStorage.setItem("panopublish_admin_impersonator", JSON.stringify(session));
      setImpersonatorSessionState(session);
    }
    setSession(targetSession);
  };

  const stopImpersonation = () => {
    try {
      const adminSessionStr = localStorage.getItem("panopublish_admin_impersonator");
      localStorage.removeItem("panopublish_admin_impersonator");
      setImpersonatorSessionState(null);

      if (adminSessionStr) {
        const adminSession = JSON.parse(adminSessionStr);
        setSession(adminSession);
      }
      window.location.href = "/admin";
    } catch (err) {
      console.error("Failed to stop impersonation:", err);
      window.location.href = "/admin";
    }
  };

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const sessionStr = localStorage.getItem("panopublish_session");
        if (sessionStr) {
          const s = JSON.parse(sessionStr);
          if (s?.access_token) {
            const payload = decodeJWT(s.access_token);
            if (payload?.exp && payload.exp > Date.now() / 1000) {
              setSessionState(s);
            } else {
              localStorage.removeItem("panopublish_session");
            }
          }
        }

        const impersonatorStr = localStorage.getItem("panopublish_admin_impersonator");
        if (impersonatorStr) {
          const imp = JSON.parse(impersonatorStr);
          if (imp?.access_token) {
            const payload = decodeJWT(imp.access_token);
            if (payload?.exp && payload.exp > Date.now() / 1000) {
              setImpersonatorSessionState(imp);
            } else {
              localStorage.removeItem("panopublish_admin_impersonator");
            }
          }
        }
      } catch (err) {
        console.error("Failed to load session from local storage:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Custom event listener for storage changes to sync tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "panopublish_session") {
        if (e.newValue) {
          setSessionState(JSON.parse(e.newValue));
        } else {
          setSessionState(null);
        }
      } else if (e.key === "panopublish_admin_impersonator") {
        if (e.newValue) {
          setImpersonatorSessionState(JSON.parse(e.newValue));
        } else {
          setImpersonatorSessionState(null);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        setSession,
        impersonatorSession,
        startImpersonation,
        stopImpersonation,
        signOut: async () => {
          localStorage.removeItem("panopublish_admin_impersonator");
          setImpersonatorSessionState(null);
          setSession(null);
          window.location.href = "/login";
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
