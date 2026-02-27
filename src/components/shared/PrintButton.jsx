import React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrintButton({ contentRef, label = "Imprimir" }) {
  const handlePrint = () => {
    const content = contentRef?.current;
    if (!content) {
      window.print();
      return;
    }
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte</title>
          <style>
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 20px; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; font-size: 13px; }
            th { background: #f8fafc; font-weight: 600; }
            h1, h2, h3 { margin: 8px 0; }
            .print-header { border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 20px; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .text-sm { font-size: 13px; }
            .text-xs { font-size: 11px; }
            .mt-4 { margin-top: 16px; }
            .mb-2 { margin-bottom: 8px; }
            .text-slate-500 { color: #64748b; }
            .bg-emerald { background: #ecfdf5; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
      <Printer className="w-4 h-4" />
      {label}
    </Button>
  );
}