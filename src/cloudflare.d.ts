/**
 * Ambient type declarations for Cloudflare Workers runtime-only modules.
 * These modules exist only inside the Cloudflare Workers runtime and have
 * no npm package — we declare them here so TypeScript doesn't error.
 */

declare module "cloudflare:email" {
  /** Represents an outbound email message that can be sent via the Email binding. */
  export class EmailMessage {
    /**
     * @param from   - The sender's email address (must match the verified binding address).
     * @param to     - The recipient's email address.
     * @param raw    - The full RFC 2822 raw email string (headers + body joined by \r\n).
     */
    constructor(from: string, to: string, raw: string);
  }
}
