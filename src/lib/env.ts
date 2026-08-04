const FALLBACK_ENVS: Record<string, string> = {
  VITE_GOOGLE_CLIENT_ID: "823257480066-j32lqpguvvp6ghg4bvgvm8t1i038ovgr.apps.googleusercontent.com",
  VITE_GOOGLE_MAPS_API_KEY: "AIzaSyB_oZLa7HmgpsFtXKu4va8GY7_R1ympdDE",
  VITE_SUPABASE_URL: "https://rhpyhlrwwzmagohmbitk.supabase.co",
  SUPABASE_URL: "https://rhpyhlrwwzmagohmbitk.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_VWJt5AbN92-EHHyczJF8Fg_DMOR5Py9",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_VWJt5AbN92-EHHyczJF8Fg_DMOR5Py9",
  VITE_RAZORPAY_KEY_ID: "rzp_live_TG32aPdqadAYlN",
};

export function getEnv(key: string): string | undefined {
  if (typeof window !== "undefined") {
    const val = (window as any).ENV?.[key] || (import.meta.env[key] as string);
    if (val) return val;
  }
  const cloudflareEnv = (globalThis as any).cloudflareEnv;
  const val =
    (cloudflareEnv?.[key] as string) ||
    (process.env[key] as string) ||
    (import.meta.env[key] as string);
  return val || FALLBACK_ENVS[key];
}

export function getBinding(key: string): any {
  const cloudflareEnv = (globalThis as any).cloudflareEnv;
  return cloudflareEnv?.[key] || (process.env as any)?.[key];
}
