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
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  setSession: () => {},
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
  const [loading, setLoading] = useState(true);

  const setSession = (s: CustomSession | null) => {
    if (s) {
      localStorage.setItem("panopublish_session", JSON.stringify(s));
    } else {
      localStorage.removeItem("panopublish_session");
    }
    setSessionState(s);
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
        signOut: async () => {
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
