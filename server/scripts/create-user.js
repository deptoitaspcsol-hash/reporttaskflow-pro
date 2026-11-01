// Uso:  node scripts/create-user.js <correo> [rol=admin] ["Nombre completo"]
// La contraseña se pide por la terminal (no queda en el historial). Con PASSWORD en el entorno se usa esa (para scripts).
import readline from "node:readline";
import { loadConfig } from "../src/config.js";
import { createDb } from "../src/db.js";
import { hashPassword, passwordProblem } from "../src/auth/password.js";
import { newId } from "../src/ids.js";

const [email, role = "admin", fullName] = process.argv.slice(2);
if (!email) { console.error('Uso: node scripts/create-user.js <correo> [rol=admin] ["Nombre"]'); process.exit(1); }

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise((resolve) => {
    rl.stdoutMuted = true;
    rl._writeToOutput = (s) => { if (!rl.stdoutMuted || s.includes(question)) rl.output.write(s); };
    rl.question(question, (answer) => { rl.close(); console.log(); resolve(answer); });
  });
}

const cfg = loadConfig();
const db = createDb(cfg.migrateDatabaseUrl, { max: 1 });
try {
  const mail = email.trim().toLowerCase();
  const password = process.env.PASSWORD || (await ask("Contraseña (mínimo 10 caracteres): "));
  const problem = passwordProblem(password, { email: mail });
  if (problem) throw new Error(problem);
  const hash = await hashPassword(password);
  const { rows } = await db.query("SELECT id FROM users WHERE email = $1", [mail]);
  if (rows[0]) {
    await db.query("UPDATE users SET password_hash = $2, role = $3, blocked = false, failed_attempts = 0, locked_until = NULL, password_changed_at = now(), updated_date = now() WHERE id = $1", [rows[0].id, hash, role]);
    console.log(`Usuario existente actualizado: ${mail} (${role})`);
  } else {
    await db.query("INSERT INTO users (id, email, full_name, role, password_hash, password_changed_at) VALUES ($1,$2,$3,$4,$5, now())", [newId(), mail, fullName ?? null, role, hash]);
    console.log(`Usuario creado: ${mail} (${role})`);
  }
} catch (err) {
  console.error("Error:", err.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
