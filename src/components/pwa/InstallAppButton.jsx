import React, { useState } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

/**
 * Botón "Instalar app". Solo se muestra si la app aún no está instalada y el navegador
 * permite instalarla (Chrome/Edge/Android) o necesita instrucciones manuales (Safari en iOS).
 */
export default function InstallAppButton({ className }) {
  const { installed, canInstall, needsManualInstall, promptInstall } = useInstallPrompt();
  const [helpOpen, setHelpOpen] = useState(false);

  if (installed || (!canInstall && !needsManualInstall)) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => (canInstall ? promptInstall() : setHelpOpen(true))}
      >
        <Download className="w-4 h-4 mr-2" />
        Instalar app
      </Button>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Instalar Control de Labores</DialogTitle>
            <DialogDescription>En iPhone y iPad se instala desde Safari:</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-3">
              <Share className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>Toca el botón <strong>Compartir</strong> de la barra de Safari.</span>
            </li>
            <li className="flex items-start gap-3">
              <SquarePlus className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>Elige <strong>Añadir a pantalla de inicio</strong> y confirma.</span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
