// Configuración por variables de entorno. Falla al arrancar si algo inseguro o incompleto.
const bool = (v, def) => (v === undefined || v === "" ? def : ["1", "true", "yes", "si"].includes(String(v).toLowerCase()));
const int = (v, def) => (v === undefined || v === "" ? def : Number.parseInt(v, 10));

export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === "production";
  const publicUrl = (env.PUBLIC_URL || "http://localhost:3000").replace(/\/+$/, "");

  const cfg = {
    production,
    host: env.HOST || "0.0.0.0",
    port: int(env.PORT, 3000),
    databaseUrl: env.DATABASE_URL,
    migrateDatabaseUrl: env.MIGRATE_DATABASE_URL || env.DATABASE_URL,
    publicUrl,
    publicOrigin: new URL(publicUrl).origin,
    // Detrás de Caddy/nginx: confiar en X-Forwarded-* para la IP real y el protocolo.
    trustProxy: bool(env.TRUST_PROXY, production),
    cookieSecure: bool(env.COOKIE_SECURE, publicUrl.startsWith("https://")),
    sessionTtlHours: int(env.SESSION_TTL_HOURS, 24 * 7),
    loginMaxAttempts: int(env.LOGIN_MAX_ATTEMPTS, 5),
    lockoutMinutes: int(env.LOCKOUT_MINUTES, 15),
    inviteTtlHours: int(env.INVITE_TTL_HOURS, 72),
    resetTtlMinutes: int(env.RESET_TTL_MINUTES, 60),
    uploadDir: env.UPLOAD_DIR || "/data/uploads",
    maxUploadBytes: int(env.MAX_UPLOAD_MB, 10) * 1024 * 1024,
    listDefaultLimit: int(env.LIST_DEFAULT_LIMIT, 1000),
    listMaxLimit: int(env.LIST_MAX_LIMIT, 10000),
    bulkMax: int(env.BULK_MAX, 1000),
    rateLimitPerMinute: int(env.RATE_LIMIT_PER_MINUTE, 600),
    loginRatePerMinute: int(env.LOGIN_RATE_PER_MINUTE, 10), // intentos de inicio de sesión por IP y minuto
    smtpUrl: env.SMTP_URL || "",
    mailFrom: env.MAIL_FROM || "Control de Labores <no-reply@localhost>",
    bootstrapAdminEmail: (env.BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase(),
    bootstrapAdminPassword: env.BOOTSTRAP_ADMIN_PASSWORD || "",
    logLevel: env.LOG_LEVEL || (production ? "info" : "warn"),
  };

  const problems = [];
  if (!cfg.databaseUrl) problems.push("DATABASE_URL es obligatoria.");
  if (production && !cfg.publicUrl.startsWith("https://")) problems.push("En producción PUBLIC_URL debe ser https://.");
  if (production && !cfg.cookieSecure) problems.push("En producción COOKIE_SECURE debe estar activa.");
  if (problems.length) throw new Error("Configuración inválida:\n - " + problems.join("\n - "));
  return cfg;
}
