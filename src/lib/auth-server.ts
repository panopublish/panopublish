import { createServerFn } from "@tanstack/react-start";
import { getBinding, getEnv } from "./env";

// ─── Password Hashing ────────────────────────────────────────────────────────

export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations: 10000, hash: "SHA-256" },
    passwordKey,
    256
  );
  const bytes = new Uint8Array(derivedBits);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ─── JWT Helpers ─────────────────────────────────────────────────────────────

function uint8ToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function strToBase64Url(str: string): string {
  const encoder = new TextEncoder();
  return uint8ToBase64Url(encoder.encode(str));
}

export async function signJWT(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = strToBase64Url(JSON.stringify(header));
  const encodedPayload = strToBase64Url(JSON.stringify(payload));
  const tokenData = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(tokenData));
  return `${tokenData}.${uint8ToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyJWT(token: string, secret: string): Promise<any> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const tokenData = `${header}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    let b64sig = signature.replace(/-/g, "+").replace(/_/g, "/");
    const padSig = b64sig.length % 4;
    if (padSig === 2) b64sig += "==";
    else if (padSig === 3) b64sig += "=";
    const sigBin = atob(b64sig);
    const sigBytes = new Uint8Array(sigBin.length);
    for (let i = 0; i < sigBin.length; i++) sigBytes[i] = sigBin.charCodeAt(i);
    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(tokenData));
    if (!isValid) return null;
    const decoder = new TextDecoder();
    let b64pay = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padPay = b64pay.length % 4;
    if (padPay === 2) b64pay += "==";
    else if (padPay === 3) b64pay += "=";
    const payBin = atob(b64pay);
    const payBytes = new Uint8Array(payBin.length);
    for (let i = 0; i < payBin.length; i++) payBytes[i] = payBin.charCodeAt(i);
    return JSON.parse(decoder.decode(payBytes));
  } catch {
    return null;
  }
}

// ─── OTP Generator ────────────────────────────────────────────────────────────

function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

// ─── Email Sender ─────────────────────────────────────────────────────────────

async function sendOtpEmail(
  env: any,
  toEmail: string,
  subject: string,
  code: string,
  bodyHtml: string
): Promise<void> {

  // ── 1. Resend (primary — works immediately, free tier 3k emails/month) ────
  const resendKey = env?.RESEND_API_KEY;
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // NOTE: Using resend.dev from address until panopublish.com domain is verified in Resend dashboard.
          // After verification at resend.com/domains, change this to: "PanoPublish <noreply@panopublish.com>"
          from: "PanoPublish <onboarding@resend.dev>",
          to: [toEmail],
          subject,
          html: bodyHtml,
        }),
      });

      if (res.ok || res.status === 200 || res.status === 201) {
        console.log(`[EMAIL] Sent via Resend to ${toEmail}`);
        return;
      }
      const errBody = await res.text();
      console.error(`[EMAIL] Resend failed: ${res.status} ${errBody}`);
    } catch (err) {
      console.error("[EMAIL] Resend exception:", err);
    }
  }

  // ── 2. Cloudflare native Email Service (requires dashboard binding setup) ─
  if (env?.EMAIL) {
    try {
      const { EmailMessage } = await import("cloudflare:email");
      const rawEmail = [
        `From: PanoPublish <noreply@panopublish.com>`,
        `To: ${toEmail}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        ``,
        bodyHtml,
      ].join("\r\n");
      const msg = new EmailMessage("noreply@panopublish.com", toEmail, rawEmail);
      await env.EMAIL.send(msg);
      console.log(`[EMAIL] Sent via Cloudflare Email Service to ${toEmail}`);
      return;
    } catch (err) {
      console.error("[EMAIL] Cloudflare Email Service failed:", err);
    }
  }

  // ── 3. Local dev fallback — check Worker logs ─────────────────────────────
  console.warn(`[EMAIL DEV] No email provider configured.`);
  console.warn(`[EMAIL DEV] To: ${toEmail} | Subject: ${subject}`);
  console.warn(`[EMAIL DEV] OTP CODE: ${code}`);
}

function verificationEmailBody(code: string): string {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px"><div style="text-align:center;margin-bottom:24px"><span style="font-size:28px;font-weight:900;color:#1D4ED8">P°</span><span style="font-size:20px;font-weight:700;color:#1D4ED8">anoPublish</span></div><h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">Verify your email</h2><p style="color:#64748b;margin:0 0 24px;font-size:15px">Use the code below to verify your account. It expires in <strong>15 minutes</strong>.</p><div style="background:#1D4ED8;color:#fff;font-size:36px;font-weight:800;letter-spacing:10px;text-align:center;padding:20px;border-radius:12px;margin-bottom:24px">${code}</div><p style="color:#94a3b8;font-size:12px;text-align:center">If you didn't create an account, ignore this email.</p></div>`;
}

function passwordResetEmailBody(code: string): string {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px"><div style="text-align:center;margin-bottom:24px"><span style="font-size:28px;font-weight:900;color:#1D4ED8">P°</span><span style="font-size:20px;font-weight:700;color:#1D4ED8">anoPublish</span></div><h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">Reset your password</h2><p style="color:#64748b;margin:0 0 24px;font-size:15px">Use the code below to reset your password. It expires in <strong>15 minutes</strong>.</p><div style="background:#dc2626;color:#fff;font-size:36px;font-weight:800;letter-spacing:10px;text-align:center;padding:20px;border-radius:12px;margin-bottom:24px">${code}</div><p style="color:#94a3b8;font-size:12px;text-align:center">If you didn't request this, ignore this email.</p></div>`;
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────

export const customSignUp = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { email, password, metadata } = ctx.data;
      const db = getBinding("DB");
      if (!db) throw new Error("Database binding missing");

      const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email.toLowerCase()).first();
      if (existing) return { error: { message: "An account with this email already exists" } };

      const id = crypto.randomUUID();
      const salt = crypto.randomUUID();
      const password_hash = await hashPassword(password, salt);

      await db.prepare("INSERT INTO users (id, email, password_hash, salt, email_verified) VALUES (?, ?, ?, ?, 0)")
        .bind(id, email.toLowerCase(), password_hash, salt)
        .run();

      const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      const username = metadata?.username || `${baseUsername}_${id.slice(0, 4)}`;
      const name = metadata?.name || email.split("@")[0];

      await db.prepare(`INSERT INTO profiles (id, email, name, username, company_name, first_name, last_name, plan, trial_ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, email.toLowerCase(), name, username, metadata?.company_name || "", metadata?.first_name || "", metadata?.last_name || "", "trial", new Date(Date.now() + 14 * 86400000).toISOString())
        .run();

      // Generate OTP
      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await db.prepare("DELETE FROM email_verification_tokens WHERE user_id = ?").bind(id).run();
      await db.prepare("INSERT INTO email_verification_tokens (id, user_id, code, expires_at) VALUES (?, ?, ?, ?)")
        .bind(crypto.randomUUID(), id, code, expiresAt)
        .run();

      await sendOtpEmail(ctx.env, email, "Verify your PanoPublish account", code, verificationEmailBody(code));

      return { data: { verificationRequired: true, userId: id, email }, error: null };
    } catch (err: any) {
      console.error("SignUp error:", err);
      return { error: { message: err.message || "Signup failed" } };
    }
  });

// ─── Verify Email OTP ─────────────────────────────────────────────────────────

export const customVerifyEmail = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { userId, code } = ctx.data;
      const db = getBinding("DB");
      if (!db) throw new Error("Database binding missing");

      const token = await db.prepare(
        "SELECT * FROM email_verification_tokens WHERE user_id = ? AND code = ? ORDER BY created_at DESC LIMIT 1"
      ).bind(userId, code).first();

      if (!token) return { error: { message: "Invalid verification code" } };
      if (new Date(token.expires_at as string) < new Date()) {
        return { error: { message: "Code expired. Please request a new one." } };
      }

      await db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").bind(userId).run();
      await db.prepare("DELETE FROM email_verification_tokens WHERE user_id = ?").bind(userId).run();

      const user = await db.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first();
      const jwtSecret = getEnv("JWT_SECRET") || "secret";
      const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
      const accessToken = await signJWT({ sub: userId, email: user?.email, exp }, jwtSecret);

      return {
        data: { session: { access_token: accessToken, expires_at: exp, user: { id: userId, email: user?.email } } },
        error: null
      };
    } catch (err: any) {
      console.error("VerifyEmail error:", err);
      return { error: { message: err.message || "Verification failed" } };
    }
  });

// ─── Resend Verification ──────────────────────────────────────────────────────

export const customResendVerification = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { userId } = ctx.data;
      const db = getBinding("DB");
      if (!db) throw new Error("Database binding missing");

      const user = await db.prepare("SELECT email, email_verified FROM users WHERE id = ?").bind(userId).first();
      if (!user) return { error: { message: "User not found" } };
      if (user.email_verified) return { error: { message: "Email already verified" } };

      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await db.prepare("DELETE FROM email_verification_tokens WHERE user_id = ?").bind(userId).run();
      await db.prepare("INSERT INTO email_verification_tokens (id, user_id, code, expires_at) VALUES (?, ?, ?, ?)")
        .bind(crypto.randomUUID(), userId, code, expiresAt)
        .run();

      await sendOtpEmail(ctx.env, user.email as string, "Your new PanoPublish verification code", code, verificationEmailBody(code));
      return { data: { success: true }, error: null };
    } catch (err: any) {
      console.error("ResendVerification error:", err);
      return { error: { message: err.message || "Failed to resend code" } };
    }
  });

// ─── Sign In (email OR username) ──────────────────────────────────────────────

export const customSignIn = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { identifier, password } = ctx.data;
      const db = getBinding("DB");
      if (!db) throw new Error("Database binding missing");

      const isEmail = identifier.includes("@");
      let user: any;

      if (isEmail) {
        user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(identifier.trim().toLowerCase()).first();
      } else {
        const profile = await db.prepare("SELECT id FROM profiles WHERE username = ?").bind(identifier.trim().toLowerCase()).first();
        if (profile) {
          user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(profile.id).first();
        }
      }

      if (!user) return { error: { message: "Invalid email/username or password" } };

      const hash = await hashPassword(password, user.salt as string);
      if (hash !== user.password_hash) return { error: { message: "Invalid email/username or password" } };

      if (!user.email_verified) {
        return { error: { message: "VERIFICATION_REQUIRED", userId: user.id as string, email: user.email as string } };
      }

      const jwtSecret = getEnv("JWT_SECRET") || "secret";
      const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
      const token = await signJWT({ sub: user.id, email: user.email, exp }, jwtSecret);

      return {
        data: { session: { access_token: token, expires_at: exp, user: { id: user.id, email: user.email } } },
        error: null
      };
    } catch (err: any) {
      console.error("SignIn error:", err);
      return { error: { message: err.message || "Signin failed" } };
    }
  });

// ─── Forgot Password – Send OTP ───────────────────────────────────────────────

export const customResetPasswordRequest = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { email } = ctx.data;
      const db = getBinding("DB");
      if (!db) throw new Error("Database binding missing");

      const user = await db.prepare("SELECT id, email FROM users WHERE email = ?").bind(email.trim().toLowerCase()).first();
      if (!user) return { data: { success: true }, error: null }; // silent success

      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").bind(user.id).run();
      await db.prepare("INSERT INTO password_reset_tokens (id, user_id, code, expires_at) VALUES (?, ?, ?, ?)")
        .bind(crypto.randomUUID(), user.id as string, code, expiresAt)
        .run();

      await sendOtpEmail(ctx.env, user.email as string, "Reset your PanoPublish password", code, passwordResetEmailBody(code));
      return { data: { success: true, userId: user.id }, error: null };
    } catch (err: any) {
      console.error("ResetPasswordRequest error:", err);
      return { error: { message: err.message || "Failed to send reset code" } };
    }
  });

// ─── Forgot Password – Verify OTP ────────────────────────────────────────────

export const customVerifyResetCode = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { userId, code } = ctx.data;
      const db = getBinding("DB");
      if (!db) throw new Error("Database binding missing");

      const token = await db.prepare(
        "SELECT * FROM password_reset_tokens WHERE user_id = ? AND code = ? ORDER BY created_at DESC LIMIT 1"
      ).bind(userId, code).first();

      if (!token) return { error: { message: "Invalid reset code" } };
      if (new Date(token.expires_at as string) < new Date()) {
        return { error: { message: "Code expired. Please request a new one." } };
      }

      const jwtSecret = getEnv("JWT_SECRET") || "secret";
      const exp = Math.floor(Date.now() / 1000) + 5 * 60; // 5 min window to set password
      const resetToken = await signJWT({ sub: userId, exp, purpose: "reset" }, jwtSecret);
      await db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").bind(userId).run();

      return { data: { resetToken }, error: null };
    } catch (err: any) {
      console.error("VerifyResetCode error:", err);
      return { error: { message: err.message || "Failed to verify reset code" } };
    }
  });

// ─── Update Password ──────────────────────────────────────────────────────────

export const customUpdatePassword = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { token, password } = ctx.data;
      const jwtSecret = getEnv("JWT_SECRET") || "secret";
      const claims = await verifyJWT(token, jwtSecret);
      if (!claims || !claims.sub || claims.purpose !== "reset") {
        return { error: { message: "Invalid or expired reset token" } };
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
