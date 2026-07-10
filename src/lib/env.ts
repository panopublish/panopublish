export function getEnv(key: string): string | undefined {
  if (typeof window !== "undefined") {
    return (window as any).ENV?.[key] || (import.meta.env[key] as string);
  }
  const cloudflareEnv = (globalThis as any).cloudflareEnv;
  return (
    (cloudflareEnv?.[key] as string) ||
    (process.env[key] as string) ||
    (import.meta.env[key] as string)
  );
}

export function getBinding(key: string): any {
  const cloudflareEnv = (globalThis as any).cloudflareEnv;
  return cloudflareEnv?.[key] || (process.env as any)?.[key];
}
