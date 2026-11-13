import type { AuthError } from "@supabase/supabase-js";
import { z } from "zod";
import type { AtlasClient } from "./supabase";

export const SIGN_IN_CODE_LENGTH = 6;

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
const codeSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${SIGN_IN_CODE_LENGTH}}$`));

export type AuthResult = { ok: true } | { ok: false; message: string };

function describe(error: AuthError): string {
  if (error.status === 429) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (error.code === "otp_expired") {
    return "That code is wrong or has expired.";
  }
  return "Something went wrong. Try again.";
}

/** Emails a six-digit sign-in code. Creates the account on first use. */
export async function requestSignInCode(
  client: AtlasClient,
  email: string,
): Promise<AuthResult> {
  const parsedEmail = emailSchema.safeParse(email);
  if (!parsedEmail.success) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const { error } = await client.auth.signInWithOtp({
    email: parsedEmail.data,
  });
  return error ? { ok: false, message: describe(error) } : { ok: true };
}

/** Exchanges the emailed code for a session on this client. */
export async function verifySignInCode(
  client: AtlasClient,
  email: string,
  code: string,
): Promise<AuthResult> {
  const parsedEmail = emailSchema.safeParse(email);
  const parsedCode = codeSchema.safeParse(code);
  if (!parsedEmail.success || !parsedCode.success) {
    return {
      ok: false,
      message: `Enter the ${SIGN_IN_CODE_LENGTH}-digit code from the email.`,
    };
  }

  const { error } = await client.auth.verifyOtp({
    email: parsedEmail.data,
    token: parsedCode.data,
    type: "email",
  });
  return error ? { ok: false, message: describe(error) } : { ok: true };
}

export async function signOut(client: AtlasClient): Promise<AuthResult> {
  const { error } = await client.auth.signOut();
  return error ? { ok: false, message: describe(error) } : { ok: true };
}
