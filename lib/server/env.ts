import "server-only";
import { AppError } from "@/lib/errors";

/**
 * Server-only configuration. Nothing here is ever sent to the browser.
 * Missing values surface as a typed "not configured" error, never a crash.
 */
function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function required(name: string, code: AppError["code"]): string {
  const v = read(name);
  if (!v) throw new AppError(code, `${name} is not set`);
  return v;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", "supabase_unavailable"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY", "supabase_unavailable"),
  supabaseServiceKey: () => required("SUPABASE_SERVICE_ROLE_KEY", "supabase_unavailable"),
  geminiKey: () => required("GEMINI_API_KEY", "ai_not_configured"),
  geminiModel: () => read("GEMINI_MODEL") ?? "gemini-2.5-flash",
  /** Tried in order when the primary model is overloaded. */
  geminiFallbackModels: () =>
    (read("GEMINI_FALLBACK_MODELS") ?? "gemini-3.7-flash,gemini-3.5-flash")
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m && m !== read("GEMINI_MODEL")),
  googleClientId: () => required("GOOGLE_CLIENT_ID", "gmail_not_configured"),
  googleClientSecret: () => required("GOOGLE_CLIENT_SECRET", "gmail_not_configured"),
  googleRedirectUri: () => required("GOOGLE_REDIRECT_URI", "gmail_not_configured"),
  tokenEncryptionKey: () => required("TOKEN_ENCRYPTION_KEY", "gmail_not_configured"),
  appSecret: () => required("APP_SECRET", "server_misconfigured"),
  analyzerVisitorLimit: () => Number(read("ANALYZER_VISITOR_LIMIT") ?? 5),
  analyzerUserDailyLimit: () => Number(read("ANALYZER_USER_DAILY_LIMIT") ?? 50),
  isConfigured: {
    gemini: () => Boolean(read("GEMINI_API_KEY")),
    gmail: () =>
      Boolean(read("GOOGLE_CLIENT_ID") && read("GOOGLE_CLIENT_SECRET") && read("GOOGLE_REDIRECT_URI") && read("TOKEN_ENCRYPTION_KEY")),
  },
};
