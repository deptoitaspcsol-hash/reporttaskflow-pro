import { scrypt as _scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt);
// scrypt (incluido en Node, sin dependencias nativas). N=2^15, r=8, p=1 ≈ 32 MB y ~80 ms por intento.
const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };
const KEYLEN = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [alg, N, r, p, saltB64, keyB64] = String(stored).split("$");
    if (alg !== "scrypt") return false;
    const expected = Buffer.from(keyB64, "base64");
    const key = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, { N: +N, r: +r, p: +p, maxmem: PARAMS.maxmem });
    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

// Hash de relleno para que "usuario inexistente" tarde lo mismo que "contraseña incorrecta".
export const DUMMY_HASH = await hashPassword(randomBytes(12).toString("hex"));

/** Política de contraseñas: longitud mínima y nada trivial. Devuelve un mensaje de error o null. */
export function passwordProblem(password, { email = "" } = {}) {
  const p = String(password ?? "");
  if (p.length < 10) return "La contraseña debe tener al menos 10 caracteres.";
  if (p.length > 200) return "La contraseña es demasiado larga.";
  if (new Set(p).size < 4) return "La contraseña es demasiado simple.";
  const local = String(email).split("@")[0].toLowerCase();
  if (local.length >= 4 && p.toLowerCase().includes(local)) return "La contraseña no debe contener tu correo.";
  if (/^(password|contrase[nñ]a|12345678|qwertyuiop|labores)/i.test(p)) return "Elige una contraseña menos común.";
  return null;
}

export const sha256 = (value) => createHash("sha256").update(value).digest();
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
