import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth/google/callback")({
  component: GoogleAuthCallback,
});

function GoogleAuthCallback() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const exchangeStarted = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (!user || exchangeStarted.current) return;
      exchangeStarted.current = true;

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        setError("No authorization code found in URL.");
        return;
      }

      try {
        const redirectUri = window.location.origin + "/auth/google/callback";
        const { data, error: fnError } = await supabase.functions.invoke("google-oauth", {
          body: { action: "exchange_code", code, user_id: user.id, redirect_uri: redirectUri },
        });

        if (fnError || data?.error) {
          throw new Error(fnError?.message || data?.error || "Failed to connect Google Account");
        }

        toast.success("Google Account connected successfully ✓");
        localStorage.setItem("google_connected", "true");
        window.location.href = "/dashboard?onboarding=success";
      } catch (err: any) {
        setError(err.message);
        toast.error("Failed to connect Google Account: " + err.message);
        // Reset ref on failure so user can try again if needed
        exchangeStarted.current = false;
      }
    };

    handleCallback();
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Connecting Google Account...</h1>
        {error ? (
          <div className="text-red-500 mb-4">{error}</div>
        ) : (
          <div className="animate-pulse flex space-x-4 justify-center">
            <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
            <div className="h-3 w-3 bg-blue-500 rounded-full animation-delay-200"></div>
            <div className="h-3 w-3 bg-blue-500 rounded-full animation-delay-400"></div>
          </div>
        )}
        {error && (
          <button
            onClick={() => navigate({ to: "/tours" })}
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Back to Tours
          </button>
        )}
      </div>
    </div>
  );
}
