// Utilidades de seguridad del lado del cliente.
// OJO: son defensas de interfaz. La autorización real (quién puede leer/editar cada entidad)
// debe estar configurada también en Base44; ver SECURITY.md.

/**
 * Devuelve la URL solo si es http(s); si no (javascript:, data:, vbscript:...) devuelve null.
 * Se usa antes de poner en un href/src cualquier URL que venga de datos guardados.
 */
export function safeHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim(), window.location.origin);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB por archivo

// Lista blanca de extensiones. Se excluye .svg a propósito: puede contener scripts.
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "xls", "xlsx", "txt",
]);

export function getExtension(name = "") {
  const dot = String(name).lastIndexOf(".");
  return dot === -1 ? "" : String(name).slice(dot + 1).toLowerCase();
}

/** Devuelve un mensaje de error en español, o null si el archivo es aceptable. */
export function validateUploadFile(file, maxBytes = MAX_UPLOAD_BYTES) {
  if (!file) return "No se seleccionó ningún archivo.";
  if (file.size > maxBytes) {
    return `"${file.name}" pesa más de ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  }
  if (!ALLOWED_EXTENSIONS.has(getExtension(file.name))) {
    return `"${file.name}": tipo de archivo no permitido.`;
  }
  return null;
}

/** Quita rutas, caracteres de control y símbolos problemáticos de un nombre de archivo. */
export function sanitizeFileName(name = "archivo") {
  const clean = String(name)
    .replace(/[\\/]+/g, "_")
    .replace(/[\u0000-\u001f<>:"|?*]/g, "")
    .trim()
    .slice(0, 120);
  return clean || "archivo";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isValidEmail = (value) => EMAIL_RE.test(String(value || "").trim());

/** Escapa texto para insertarlo en HTML generado a mano (p. ej. la ventana de impresión). */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
