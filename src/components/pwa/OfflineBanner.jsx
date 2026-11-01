import React from "react";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

/** Barra inferior que aparece mientras no hay conexión. */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[60] bg-slate-800 text-white text-xs sm:text-sm px-4 py-2.5 flex items-center justify-center gap-2"
      style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
    >
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      Sin conexión. Podrás consultar y guardar cambios cuando vuelva la red.
    </div>
  );
}
