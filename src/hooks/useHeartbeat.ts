import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { recordHeartbeat } from "@/lib/d1-server";

// Heartbeat every 45 seconds while tab is active and visible
const HEARTBEAT_INTERVAL_MS = 45 * 1000;

function getDeviceType(): "Mobile" | "Tablet" | "Desktop" {
  if (typeof window === "undefined") return "Desktop";
  const ua = navigator.userAgent || "";
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "Tablet";
  }
  if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      ua
    )
  ) {
    return "Mobile";
  }
  return "Desktop";
}

export function useHeartbeat() {
  const { session, user } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const lastPingRef = useRef<number>(0);
  const lastPathRef = useRef<string>("");

  useEffect(() => {
    if (!user || !session?.access_token) return;

    let isMounted = true;

    const sendPing = async (pathOverride?: string) => {
      // Don't ping if user has backgrounded or minimized tab
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      const now = Date.now();
      const currentPath =
        pathOverride ||
        pathname ||
        (typeof window !== "undefined" ? window.location.pathname : "");

      // Debounce: minimum 12 seconds between pings unless path changed
      const pathChanged = currentPath !== lastPathRef.current;
      if (!pathChanged && now - lastPingRef.current < 12000) {
        return;
      }

      lastPingRef.current = now;
      lastPathRef.current = currentPath;

      try {
        await recordHeartbeat({
          data: {
            token: session.access_token,
            path: currentPath,
            device: getDeviceType(),
          },
        });
      } catch {
        // Silently swallow errors to never disrupt client application flow
      }
    };

    // Initial ping on mount or route transition
    sendPing();

    // Periodic heartbeat interval
    const interval = setInterval(() => {
      if (isMounted) {
        sendPing();
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Visibility change listener: resume immediately when user switches back to this tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendPing();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.id, session?.access_token, pathname]);
}
