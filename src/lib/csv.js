// CSV seguro: comillas correctas y neutralización de "inyección de fórmulas".
// Si un nombre o una nota empieza con = + - @, Excel/Sheets lo ejecuta como fórmula al abrir el CSV.
// Se antepone un apóstrofo para que se muestre como texto.

const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

export function escapeCsvCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = String(value);
  if (FORMULA_START.test(text) && !PLAIN_NUMBER.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCSV(rows) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

/** Descarga un CSV (con BOM para que Excel respete los acentos). */
export function downloadCSV(fileName, rows) {
  const blob = new Blob(["﻿" + toCSV(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Lee un CSV (RFC 4180): campos entre comillas, comas y saltos de línea dentro de comillas.
 * Devuelve un arreglo de filas (arreglos de texto), sin filas vacías.
 */
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const src = String(text).replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_IMPORT_ROWS = 1000;

/**
 * Convierte el CSV a objetos usando la primera fila como encabezados.
 * Lanza Error con mensaje en español si el archivo es demasiado grande.
 */
export function parseCSVObjects(text, normalizeHeader = (h) => h.trim()) {
  const table = parseCSV(text);
  if (table.length < 2) return { headers: [], rows: [] };
  if (table.length - 1 > MAX_IMPORT_ROWS) {
    throw new Error(`El archivo tiene más de ${MAX_IMPORT_ROWS} filas. Divídelo en partes.`);
  }
  const headers = table[0].map(normalizeHeader);
  const rows = table.slice(1).map((values) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (values[i] ?? "").trim(); });
    return obj;
  });
  return { headers, rows };
}
