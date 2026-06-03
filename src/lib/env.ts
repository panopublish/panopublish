export function getEnv(key: string): string | undefined {
  if (typeof window !== 'undefined') {
    return (window as any).ENV?.[key] || (import.meta.env[key] as string);
  }
  return (process.env[key] as string) || (import.meta.env[key] as string);
}
