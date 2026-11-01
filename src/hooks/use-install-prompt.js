import { useSyncExternalStore } from "react";

// El navegador dispara "beforeinstallprompt" una sola vez y muy pronto (antes de que React
// termine de autenticar y pintar el Layout). Por eso se escucha a nivel de módulo, desde que
// arranca la app, y los componentes solo se suscriben al resultado.
let deferredPrompt = null;
let installed = false;
const listeners = new Set();

const emit = () => listeners.forEach((l) => l());

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

if (typeof window !== "undefined") {
  installed = isStandalone();
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    emit();
  });
}

const subscribe = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const getSnapshot = () => (installed ? "installed" : deferredPrompt ? "available" : "none");

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export function useInstallPrompt() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => "none");

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    emit();
  };

  return {
    installed: state === "installed",
    canInstall: state === "available", // Chrome / Edge / Android
    needsManualInstall: state === "none" && isIOS(), // Safari en iOS: se instala desde "Compartir"
    promptInstall,
  };
}
