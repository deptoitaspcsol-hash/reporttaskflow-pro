/// <reference types="vite-plugin-pwa/client" />
import { useEffect } from "react";
import { toast } from "sonner";
import { registerSW } from "virtual:pwa-register";

const HOUR = 60 * 60 * 1000;

/**
 * Registra el service worker y avisa al usuario cuando:
 *  - hay una versión nueva (con botón "Actualizar", sin recargar a la fuerza), y
 *  - la interfaz ya quedó guardada para abrirse sin conexión.
 * No renderiza nada.
 */
export default function PWAManager() {
  useEffect(() => {
    let intervalId;

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        toast("Hay una versión nueva de la app", {
          id: "pwa-update",
          duration: Infinity,
          action: { label: "Actualizar", onClick: () => updateSW(true) },
        });
      },
      onOfflineReady() {
        toast.success("La app ya se puede abrir sin conexión");
      },
      onRegisteredSW(_swUrl, registration) {
        // Busca versiones nuevas cada hora mientras la app esté abierta.
        if (registration) {
          intervalId = setInterval(() => registration.update().catch(() => {}), HOUR);
        }
      },
      onRegisterError(error) {
        console.error("No se pudo registrar el service worker:", error);
      },
    });

    return () => clearInterval(intervalId);
  }, []);

  return null;
}
