import { hashPassword, passwordProblem } from "./auth/password.js";
import { newId } from "./ids.js";

/** Primer administrador: solo si no existe ningún usuario y se definieron BOOTSTRAP_ADMIN_EMAIL / _PASSWORD. */
export async function bootstrapAdmin({ cfg, db, log }) {
  const { rows } = await db.query("SELECT count(*)::int AS n FROM users");
  if (rows[0].n > 0) return false;
  if (!cfg.bootstrapAdminEmail || !cfg.bootstrapAdminPassword) {
    log.warn("No hay usuarios. Crea el primer administrador con: docker compose run --rm api node scripts/create-user.js <correo> admin");
    return false;
  }
  const problem = passwordProblem(cfg.bootstrapAdminPassword, { email: cfg.bootstrapAdminEmail });
  if (problem) throw new Error(`BOOTSTRAP_ADMIN_PASSWORD no es válida: ${problem}`);
  await db.query("INSERT INTO users (id, email, full_name, role, password_hash, password_changed_at) VALUES ($1,$2,$3,'admin',$4, now())",
    [newId(), cfg.bootstrapAdminEmail, "Administrador", await hashPassword(cfg.bootstrapAdminPassword)]);
  log.info(`Administrador inicial creado: ${cfg.bootstrapAdminEmail}. Cambia o elimina BOOTSTRAP_ADMIN_PASSWORD del .env.`);
  return true;
}
