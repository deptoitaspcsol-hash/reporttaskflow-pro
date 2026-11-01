import React, { useState } from "react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Paperclip, Download, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { safeHttpUrl, validateUploadFile, sanitizeFileName, MAX_UPLOAD_BYTES } from "@/lib/security";

export default function AttachmentsSection({ attachments = [], onUpdate, readOnly = false }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = "";
    if (!files.length) return;

    // Validación en el cliente: tamaño y tipo (el atributo "accept" solo es una sugerencia del navegador).
    const valid = [];
    for (const file of files) {
      const problem = validateUploadFile(file);
      if (problem) toast.error(problem);
      else valid.push(file);
    }
    if (!valid.length) return;

    setUploading(true);
    const items = [...attachments];
    let failed = 0;
    for (const file of valid) {
      try {
        const { file_url } = await api.integrations.Core.UploadFile({ file });
        if (!safeHttpUrl(file_url)) throw new Error("URL no válida");
        items.push({ url: file_url, name: sanitizeFileName(file.name), type: file.type });
      } catch {
        failed++;
      }
    }
    if (items.length > attachments.length) onUpdate(items);
    if (failed) toast.error(`No se pudieron subir ${failed} archivo(s). Intenta de nuevo.`);
    setUploading(false);
  };

  const removeAttachment = (idx) => {
    const updated = attachments.filter((_, i) => i !== idx);
    onUpdate(updated);
  };

  const getFileName = (att) => {
    if (typeof att === "string") {
      return att.split("/").pop().split("?")[0] || "Archivo";
    }
    return att.name || att.url?.split("/").pop().split("?")[0] || "Archivo";
  };

  // Solo http(s): un adjunto guardado con "javascript:..." ya no se vuelve un enlace ejecutable.
  const getUrl = (att) => safeHttpUrl(typeof att === "string" ? att : att?.url);

  const isImage = (att) => {
    const url = getUrl(att);
    const name = getFileName(att);
    return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url) || /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-slate-400" />
          Archivos Adjuntos
          {attachments.length > 0 && (
            <span className="bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full font-medium">{attachments.length}</span>
          )}
        </h3>
        {!readOnly && (
          <label className="cursor-pointer" title={`Máximo ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB por archivo`}>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
              <span>
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? "Subiendo..." : "Subir archivo"}
              </span>
            </Button>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {attachments.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-lg py-6 text-center text-sm text-slate-400">
          {readOnly ? "Sin archivos adjuntos" : "No hay archivos adjuntos aún"}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {attachments.map((att, i) => {
            const url = getUrl(att);
            const name = getFileName(att);
            const img = !!url && isImage(att);
            return (
              <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100 group hover:border-slate-200 transition-colors">
                {img ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <img src={url} alt={name} className="w-10 h-10 rounded object-cover border border-slate-200" />
                  </a>
                ) : (
                  <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <span className="flex-1 text-sm text-slate-700 truncate min-w-0">{name}</span>
                <div className="flex gap-1 shrink-0">
                  {url ? (
                    <a href={url} download={name} target="_blank" rel="noopener noreferrer" aria-label={`Descargar ${name}`}>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-emerald-600">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  ) : (
                    <span className="text-[10px] text-red-500 self-center px-1">Enlace no válido</span>
                  )}
                  {!readOnly && (
                    <Button type="button" variant="ghost" size="icon" aria-label={`Quitar ${name}`} className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => removeAttachment(i)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}