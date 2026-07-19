import { createServerFn } from "@tanstack/react-start";
import { getBinding, getEnv } from "./env";

// 1. Password hashing via Web Crypto API (PBKDF2-HMAC-SHA256)
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const params = {
    name: "PBKDF2",
    salt: encoder.encode(salt),
    iterations: 10000,
    hash: "SHA-256"
  };
  const derivedBits = await crypto.subtle.deriveBits(
    params,
    passwordKey,
    256
  );
  // Base64 encoding the hash bytes
  const bytes = new Uint8Array(derivedBits);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: encode bytes to base64url
function uint8ToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// Helper: encode UTF-8 string to base64url
function strToBase64Url(str: string): string {
  const encoder = new TextEncoder();
  return uint8ToBase64Url(encoder.encode(str));
}

// Helper: decode base64url to string (padding-safe)
function base64UrlToStr(b64url: string): string {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad === 2) b64 += "==";
  else if (pad === 3) b64 += "=";
  return atob(b64);
}

// 2. Custom HS256 JWT signing using Web Crypto API
export async function signJWT(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = strToBase64Url(JSON.stringify(header));
  const encodedPayload = strToBase64Url(JSON.stringify(payload));
  const tokenData = `${encodedHeader}.${encodedPayload}`;
  
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(tokenData)
  );
  
  const encodedSignature = uint8ToBase64Url(new Uint8Array(signature));
  return `${tokenData}.${encodedSignature}`;
}

// 3. Custom HS256 JWT verification using Web Crypto API
export async function verifyJWT(token: string, secret: string): Promise<any> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const tokenData = `${header}.${payload}`;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    // Decode base64url signature to bytes safely
    let b64sig = signature.replace(/-/g, "+").replace(/_/g, "/");
    const padSig = b64sig.length % 4;
    if (padSig === 2) b64sig += "==";
    else if (padSig === 3) b64sig += "=";
    const sigBin = atob(b64sig);
    const sigBytes = new Uint8Array(sigBin.length);
    for (let i = 0; i < sigBin.length; i++) {
      sigBytes[i] = sigBin.charCodeAt(i);
    }
    
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder.encode(tokenData)
    );
    
    if (!isValid) return null;
    
    // Decode the payload using TextDecoder for correct UTF-8 handling
    const decoder = new TextDecoder();
    let b64pay = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padPay = b64pay.length % 4;
    if (padPay === 2) b64pay += "==";
    else if (padPay === 3) b64pay += "=";
    const payBin = atob(b64pay);
    const payBytes = new Uint8Array(payBin.length);
    for (let i = 0; i < payBin.length; i++) {
      payBytes[i] = payBin.charCodeAt(i);
    }
    return JSON.parse(decoder.decode(payBytes));
  } catch (err) {
    console.error("verifyJWT error:", err);
    return null;
  }
}

export const customSignUp = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { email, password, metadata } = ctx.data;
      const db = getBinding("DB");
      if (!db) throw new Error("Database binding missing");

      // Check if user already exists
      const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
      if (existing) {
        return { error: { message: "User already exists with this email" } };
      }

      const id = crypto.randomUUID();
      const salt = crypto.randomUUID();
      const password_hash = await hashPassword(password, salt);

      // 1. Insert into users
      await db.prepare("INSERT INTO users (id, email, password_hash, salt) VALUES (?, ?, ?, ?)")
        .bind(id, email, password_hash, salt)
        .run();

      // 2. Insert default profile
      const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      const username = `${baseUsername}_${id.slice(0, 4)}`;
      const name = metadata?.name || email.split("@")[0];

      await db.prepare(`
        INSERT INTO profiles (id, email, name, username, company_name, first_name, last_name, plan, trial_ends_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        email,
        name,
        username,
        metadata?.company_name || "",
        metadata?.first_name || "",
        metadata?.last_name || "",
        "trial",
        new Date(Date.now() + 14 * 86400000).toISOString() // 14-day trial
      ).run();

      // Generate JWT session
      const jwtSecret = getEnv("JWT_SECRET") || "secret";
      const exp = Math.floor(Date.now() / 1000) + 30 * 86400; // 30 days
      const token = await signJWT({ sub: id, email, exp }, jwtSecret);

      return {
        data: {
          session: { access_token: token, expires_at: exp, user: { id, email } }
        },
        error: null
      };
    } catch (err: any) {
      console.error("SignUp error:", err);
      return { error: { message: err.message || "Signup failed" } };
    }
  });

export const customSignIn = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { email, password } = ctx.data;
      const db = getBinding("DB");
      if (!db) throw new Error("Database binding missing");

      const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
      if (!user) {
        return { error: { message: "Invalid email or password" } };
      }

      const hash = await hashPassword(password, user.salt);
      if (hash !== user.password_hash) {
        return { error: { message: "Invalid email or password" } };
      }

      // Generate JWT session
      const jwtSecret = getEnv("JWT_SECRET") || "secret";
      const exp = Math.floor(Date.now() / 1000) + 30 * 86400; // 30 days
      const token = await signJWT({ sub: user.id, email, exp }, jwtSecret);

      return {
        data: {
          session: { access_token: token, expires_at: exp, user: { id: user.id, email } }
        },
        error: null
      };
    } catch (err: any) {
      console.error("SignIn error:", err);
      return { error: { message: err.message || "Signin failed" } };
    }
  });

export const customUpdatePassword = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { token, password } = ctx.data;
      const jwtSecret = getEnv("JWT_SECRET") || "secret";
      const claims = await verifyJWT(token, jwtSecret);
      if (!claims || !claims.sub) {
        return { error: { message: "Invalid or expired session token" } };
      }

      const db = getBinding("DB");
      if (!db) throw new Error("Database binding missing");

      const salt = crypto.randomUUID();
      const hash = await hashPassword(password, salt);

      await db.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?")
        .bind(hash, salt, claims.sub)
        .run();

      return { data: { success: true }, error: null };
    } catch (err: any) {
      console.error("UpdatePassword error:", err);
      return { error: { message: err.message || "Failed to update password" } };
    }
  });

export const customResetPasswordRequest = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { email } = ctx.data;
      const db = getBinding("DB");
      if (!db) throw new Error("Database binding missing");

      const user = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
      if (!user) {
        // Silent success for security
        return { data: { success: true }, error: null };
      }

      // Generate a short-lived password reset token
      const jwtSecret = getEnv("JWT_SECRET") || "secret";
      const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      const resetToken = await signJWT({ sub: user.id, email, exp, purpose: "reset" }, jwtSecret);

      console.log(`[AUTH] Password reset token for ${email}: ${resetToken}`);

      return { data: { success: true, token: resetToken }, error: null };
    } catch (err: any) {
      console.error("ResetPasswordRequest error:", err);
      return { error: { message: err.message || "Failed to request password reset" } };
    }
  });
