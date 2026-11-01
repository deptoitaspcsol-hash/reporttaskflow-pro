// Formato corporativo único para todo lo que sale de la app: impresión y PDF.
// Para cambiar nombre de la empresa o color, editar solo CORPORATE.
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { escapeHtml } from "./security";

export const CORPORATE = {
  company: "Control de Labores",
  system: "TaskFlow Pro",
  color: "#059669", // esmeralda (mismo color de la interfaz)
  colorRgb: [5, 150, 105],
  colorSoftRgb: [236, 253, 245],
  colorDarkRgb: [6, 95, 70],
  confidentiality: "Documento confidencial · Uso interno",
};

export const formatMoney = (value) =>
  `$${Number(value || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatNumber = (value, digits = 0) =>
  Number(value || 0).toLocaleString("es-MX", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const stamp = () => format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });

/* ------------------------------------------------------------------ */
/* Impresión corporativa                                               */
/* ------------------------------------------------------------------ */

const PRINT_CSS = `
  @page { size: A4; margin: 14mm 12mm 17mm;
    @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 9px sans-serif; color: #64748b; } }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
  html, body { background: #fff !important; }
  body { margin: 0; color: #0f172a; font-family: Inter, -apple-system, "Segoe UI", Arial, sans-serif; font-size: 11.5px; }
  .corp-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px;
    border-bottom: 3px solid ${CORPORATE.color}; padding-bottom: 10px; margin-bottom: 16px; }
  .corp-brand { display: flex; align-items: center; gap: 10px; }
  .corp-logo { width: 34px; height: 34px; border-radius: 8px; background: ${CORPORATE.color};
    display: flex; align-items: center; justify-content: center; flex: none; }
  .corp-company { font-size: 13px; font-weight: 700; line-height: 1.1; }
  .corp-system { font-size: 9px; color: #64748b; letter-spacing: .08em; text-transform: uppercase; }
  .corp-title { font-size: 19px; font-weight: 700; line-height: 1.15; margin: 0; }
  .corp-sub { color: #475569; margin: 2px 0 0; }
  .corp-meta { text-align: right; font-size: 10px; color: #475569; line-height: 1.5; white-space: nowrap; }
  .corp-foot { position: fixed; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between;
    border-top: 1px solid #e2e8f0; padding-top: 4px; font-size: 9px; color: #64748b; background: #fff; }
  main { padding-bottom: 8mm; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr, img, svg, .recharts-wrapper { page-break-inside: avoid; break-inside: avoid; }
  th { background: ${CORPORATE.color}1a !important; color: #065f46; font-weight: 600; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 5px 8px; text-align: left; }
  .shadow, .shadow-sm, .shadow-md, .shadow-lg { box-shadow: none !important; }
  .recharts-wrapper { max-width: 100% !important; }
`;

const LOGO_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>`;

/**
 * Imprime un bloque de la página con membrete, fecha, usuario y pie corporativos.
 * El contenido se copia a un iframe oculto con "sandbox" (sin scripts), con los mismos estilos
 * de la app, para que se imprima igual que se ve. Reemplaza al antiguo document.write en una
 * ventana emergente (que fallaba si el navegador bloqueaba el popup).
 */
export function printCorporate({ element, title = "Reporte", subtitle, period, generatedBy }) {
  if (!element) {
    window.print();
    return;
  }

  const clone = element.cloneNode(true);
  clone.querySelectorAll("[data-no-print], button, input[type='file']").forEach((n) => n.remove());

  const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
    .map((n) => n.outerHTML)
    .join("\n");

  const meta = [
    period ? `Período: ${escapeHtml(period)}` : "",
    `Generado: ${escapeHtml(stamp())}`,
    generatedBy ? `Por: ${escapeHtml(generatedBy)}` : "",
  ].filter(Boolean).join("<br/>");

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"/>
    <title>${escapeHtml(title)}</title>${styles}<style>${PRINT_CSS}</style></head>
    <body>
      <header class="corp-head">
        <div class="corp-brand">
          <div class="corp-logo">${LOGO_SVG}</div>
          <div><div class="corp-company">${escapeHtml(CORPORATE.company)}</div>
          <div class="corp-system">${escapeHtml(CORPORATE.system)}</div></div>
        </div>
        <div style="flex:1;min-width:0;padding-left:12px">
          <h1 class="corp-title">${escapeHtml(title)}</h1>
          ${subtitle ? `<p class="corp-sub">${escapeHtml(subtitle)}</p>` : ""}
        </div>
        <div class="corp-meta">${meta}</div>
      </header>
      <main>${clone.outerHTML}</main>
      <footer class="corp-foot"><span>${escapeHtml(CORPORATE.confidentiality)}</span><span>${escapeHtml(CORPORATE.company)}</span></footer>
    </body></html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("sandbox", "allow-same-origin allow-modals");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  const cleanup = () => iframe.remove();
  iframe.onload = () => {
    const win = iframe.contentWindow;
    win.addEventListener("afterprint", cleanup);
    setTimeout(() => { win.focus(); win.print(); }, 250);
    setTimeout(cleanup, 5 * 60 * 1000); // por si el navegador no avisa al terminar
  };
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
}

/* ------------------------------------------------------------------ */
/* PDF corporativo (archivo descargable)                               */
/* ------------------------------------------------------------------ */

// Las fuentes estándar de PDF solo cubren Latin-1: se reemplaza lo demás (emojis, etc.).
const pdfText = (value) =>
  String(value ?? "")
    .replace(/[^\u0020-\u007e\u00a0-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u20ac]/gu, "")
    .replace(/ {2,}/g, " ");

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.subtitle]
 * @param {string} [opts.period]
 * @param {string} [opts.generatedBy]
 * @param {"portrait"|"landscape"} [opts.orientation]
 * @param {{label:string,value:string}[]} [opts.summary]  Indicadores destacados bajo el título
 * @param {{heading?:string, columns:{header:string,key:string,align?:string,money?:boolean,format?:Function}[],
 *          rows:object[], totals?:object}[]} opts.sections
 * @returns {Promise<import("jspdf").jsPDF>}
 */
export async function buildCorporatePDF({
  title, subtitle, period, generatedBy, orientation = "portrait", summary = [], sections = [],
}) {
  // Carga diferida: jsPDF pesa bastante y solo se necesita al exportar.
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const [r, g, b] = CORPORATE.colorRgb;

  // Membrete (primera página)
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, W, 54, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(15).text(pdfText(CORPORATE.company), M, 30);
  doc.setFont("helvetica", "normal").setFontSize(8).text(pdfText(CORPORATE.system.toUpperCase()), M, 43);
  doc.setFontSize(8.5).text(pdfText(`Generado: ${stamp()}`), W - M, 28, { align: "right" });
  if (generatedBy) doc.text(pdfText(`Por: ${generatedBy}`), W - M, 41, { align: "right" });

  // Título
  let y = 84;
  doc.setTextColor(15, 23, 42).setFont("helvetica", "bold").setFontSize(17).text(pdfText(title), M, y);
  y += 16;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(71, 85, 105);
  if (subtitle) { doc.text(pdfText(subtitle), M, y); y += 14; }
  if (period) { doc.text(pdfText(`Período: ${period}`), M, y); y += 14; }
  y += 6;

  // Indicadores destacados
  if (summary.length) {
    const gap = 10;
    const boxW = (W - 2 * M - gap * (summary.length - 1)) / summary.length;
    summary.forEach((item, i) => {
      const x = M + i * (boxW + gap);
      doc.setFillColor(...CORPORATE.colorSoftRgb).setDrawColor(r, g, b).roundedRect(x, y, boxW, 44, 4, 4, "FD");
      doc.setTextColor(...CORPORATE.colorDarkRgb).setFont("helvetica", "normal").setFontSize(8)
        .text(pdfText(String(item.label).toUpperCase()), x + 10, y + 16);
      doc.setTextColor(15, 23, 42).setFont("helvetica", "bold").setFontSize(13)
        .text(pdfText(item.value), x + 10, y + 34);
    });
    y += 44 + 18;
  }

  // Tablas
  for (const section of sections) {
    if (section.heading) {
      if (y > H - 110) { doc.addPage(); y = 60; }
      doc.setTextColor(...CORPORATE.colorDarkRgb).setFont("helvetica", "bold").setFontSize(11)
        .text(pdfText(section.heading), M, y);
      y += 8;
    }
    const cols = section.columns;
    const cell = (col, row) => {
      const raw = row[col.key];
      if (col.format) return pdfText(col.format(raw, row));
      if (col.money) return pdfText(formatMoney(raw));
      return pdfText(raw ?? "");
    };
    autoTable(doc, {
      startY: y,
      head: [cols.map((c) => pdfText(c.header))],
      body: section.rows.map((row) => cols.map((c) => cell(c, row))),
      foot: section.totals ? [cols.map((c, i) => {
        if (section.totals[c.key] === undefined) return i === 0 ? "Total" : "";
        return cell(c, section.totals);
      })] : undefined,
      showFoot: "lastPage",
      theme: "grid",
      margin: { left: M, right: M, top: 64, bottom: 44 },
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [r, g, b], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: CORPORATE.colorSoftRgb, textColor: CORPORATE.colorDarkRgb, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: Object.fromEntries(cols.map((c, i) => [i, { halign: c.align || (c.money ? "right" : "left") }])),
      // Encabezado y fila de totales deben alinearse igual que los datos de su columna.
      didParseCell: (data) => {
        const col = cols[data.column.index];
        if (col && data.section !== "body") data.cell.styles.halign = col.align || (col.money ? "right" : "left");
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          doc.setFillColor(r, g, b).rect(0, 0, W, 6, "F");
          doc.setTextColor(100, 116, 139).setFont("helvetica", "normal").setFontSize(8)
            .text(pdfText(`${CORPORATE.company} · ${title}`), M, 28);
        }
      },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 22;
  }

  // Pie de página en todas las hojas
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240).line(M, H - 32, W - M, H - 32);
    doc.setTextColor(100, 116, 139).setFont("helvetica", "normal").setFontSize(8)
      .text(pdfText(CORPORATE.confidentiality), M, H - 20)
      .text(`Página ${i} de ${pages}`, W - M, H - 20, { align: "right" });
  }
  return doc;
}

export async function exportCorporatePDF({ fileName = "reporte.pdf", ...opts }) {
  const doc = await buildCorporatePDF(opts);
  doc.save(fileName);
}
