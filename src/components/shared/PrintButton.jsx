import React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { printCorporate } from "@/lib/corporate";
import { useRole } from "./useRole";

/**
 * Imprime el bloque `contentRef` con formato corporativo (membrete, fecha, usuario y pie).
 * Props opcionales: title, subtitle y period salen en el encabezado del documento.
 */
export default function PrintButton({ contentRef, label = "Imprimir", title = "Reporte", subtitle, period }) {
  const { user } = useRole();

  const handlePrint = () =>
    printCorporate({
      element: contentRef?.current,
      title,
      subtitle,
      period,
      generatedBy: user?.full_name || user?.email,
    });

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
      <Printer className="w-4 h-4" />
      {label}
    </Button>
  );
}
