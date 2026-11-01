import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Download, CheckCircle2, XCircle, Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { parseCSVObjects, MAX_IMPORT_BYTES } from "@/lib/csv";

const EXPECTED_COLUMNS = ["full_name", "id_number", "phone", "group", "work_area", "hire_date", "base_salary", "worker_code"];
const REQUIRED = ["full_name", "id_number", "phone", "group", "hire_date", "base_salary"];

const normalizeHeader = (h) => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z_]/g, "");

// Parser compartido (src/lib/csv.js): respeta comillas y comas dentro de campos, y limita el tamaño.
function parseCSV(text) {
  return parseCSVObjects(text, normalizeHeader);
}

function validateRow(row, index) {
  const errors = [];
  REQUIRED.forEach(field => {
    if (!row[field] || String(row[field]).trim() === "") {
      errors.push(`Columna "${field}" requerida`);
    }
  });
  if (row.base_salary && (!Number.isFinite(Number(row.base_salary)) || Number(row.base_salary) < 0)) errors.push("base_salary debe ser un número mayor o igual a 0");
  if (row.hire_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.hire_date)) errors.push("hire_date debe ser YYYY-MM-DD");
  return errors;
}

const generateCode = (full_name, id_number) => {
  const initials = (full_name || "").trim().split(/\s+/).map(p => p.charAt(0).toUpperCase()).join("");
  const idSuffix = String(id_number || "").replace(/\D/g, "").slice(-4);
  return initials && idSuffix ? `${initials}-${idSuffix}` : initials;
};

export default function BulkUploadWorkers({ onDone }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState({ ok: 0, fail: 0 });
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error("El archivo es demasiado grande (máximo 2 MB).");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      let parsed;
      try {
        ({ rows: parsed } = parseCSV(ev.target.result));
      } catch (err) {
        toast.error(err.message || "No se pudo leer el archivo.");
        return;
      }
      const results = parsed.map((row, i) => ({
        row,
        index: i + 2,
        errors: validateRow(row, i),
      }));
      setRows(parsed);
      setValidationResults(results);
      setProgress(0);
      setDone(false);
      setSummary({ ok: 0, fail: 0 });
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const handleUpload = async () => {
    const valid = validationResults.filter(r => r.errors.length === 0);
    if (valid.length === 0) return;
    setUploading(true);
    let ok = 0, fail = 0;
    for (let i = 0; i < valid.length; i++) {
      const { row } = valid[i];
      const workerData = {
        full_name: row.full_name,
        id_number: row.id_number,
        phone: row.phone,
        group: row.group,
        work_area: row.work_area || "",
        hire_date: row.hire_date,
        base_salary: Number(row.base_salary),
        worker_code: row.worker_code || generateCode(row.full_name, row.id_number),
        status: "activo",
      };
      try {
        await base44.entities.Worker.create(workerData);
        ok++;
      } catch {
        fail++;
      }
      setProgress(Math.round(((i + 1) / valid.length) * 100));
    }
    setSummary({ ok, fail });
    setDone(true);
    setUploading(false);
    onDone?.();
  };

  const downloadTemplate = () => {
    const header = "full_name,id_number,phone,group,work_area,hire_date,base_salary,worker_code";
    const example = "Juan Pérez,12345678,555-0001,Cuadrilla A,Campo Norte,2024-01-15,5000,";
    const csv = `${header}\n${example}`;
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_trabajadores.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = validationResults.filter(r => r.errors.length === 0).length;
  const invalidCount = validationResults.filter(r => r.errors.length > 0).length;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2 text-slate-600">
        <FileSpreadsheet className="w-4 h-4" /> Carga Masiva
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setRows([]); setValidationResults([]); setDone(false); setProgress(0); } }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Carga Masiva de Trabajadores
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Template download */}
            <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-700">Plantilla CSV</p>
                <p className="text-xs text-slate-500">Descarga y llena la plantilla con los datos</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Descargar
              </Button>
            </div>

            {/* File picker */}
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Haz clic para seleccionar archivo</p>
              <p className="text-xs text-slate-400 mt-1">Solo archivos .csv</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </div>

            {/* Validation results */}
            {validationResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {validCount} válidos
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge className="bg-red-50 text-red-700 border-red-200 gap-1">
                      <XCircle className="w-3.5 h-3.5" /> {invalidCount} con errores
                    </Badge>
                  )}
                </div>

                {/* Error list */}
                {invalidCount > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {validationResults.filter(r => r.errors.length > 0).map((r) => (
                      <div key={r.index} className="text-xs bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                        <span className="font-semibold text-red-700">Fila {r.index} ({r.row.full_name || "sin nombre"}):</span>
                        <span className="text-red-600"> {r.errors.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Progress */}
                {(uploading || done) && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{done ? "Carga completada" : "Cargando..."}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    {done && (
                      <div className="flex gap-3 pt-1">
                        <span className="text-xs text-emerald-600 font-medium">✓ {summary.ok} creados</span>
                        {summary.fail > 0 && <span className="text-xs text-red-600 font-medium">✗ {summary.fail} fallidos</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setRows([]); setValidationResults([]); setDone(false); setProgress(0); }}>
              {done ? "Cerrar" : "Cancelar"}
            </Button>
            {!done && validCount > 0 && (
              <Button onClick={handleUpload} disabled={uploading} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Cargar {validCount} trabajadores
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}