// Lector CSV (RFC 4180): comillas, comas y saltos de línea dentro de campos entre comillas.
export function parseCSV(text) {
  const rows = []; let row = []; let field = ""; let inQuotes = false;
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

export function parseCSVObjects(text, normalizeHeader = (h) => h.trim(), { maxRows = 100000 } = {}) {
  const table = parseCSV(text);
  if (table.length < 2) return { headers: [], rows: [] };
  if (table.length - 1 > maxRows) throw new Error(`El archivo tiene más de ${maxRows} filas.`);
  const headers = table[0].map(normalizeHeader);
  const rows = table.slice(1).map((values) => Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? "").trim()])));
  return { headers, rows };
}
