import React, { useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { safeNext } from "@/api/selfhostedClient";

/**
 * Pantalla de acceso de la versión autoalojada. Modos:
 *  - login:     correo + contraseña
 *  - forgot:    pedir enlace para restablecer
 *  - set:       elegir contraseña (llegó con ?token=...&mode=invite|reset desde el correo)
 */
export default function LoginPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const [mode, setMode] = useState(token ? "set" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const next = safeNext(params.get("next"));
  const enter = () => window.location.assign(next);

  const run = async (fn) => {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); } catch (e) { setError(e.status === 0 ? "No hay conexión con el servidor." : e.message || "No se pudo completar la acción."); }
    finally { setBusy(false); }
  };

  const submitLogin = (e) => { e.preventDefault(); run(async () => { await base44.auth.login(email, password); enter(); }); };
  const submitForgot = (e) => { e.preventDefault(); run(async () => {
    await base44.auth.forgotPassword(email);
    setNotice("Si el correo está registrado, te enviamos un enlace para elegir una nueva contraseña.");
  }); };
  const submitSet = (e) => { e.preventDefault(); run(async () => {
    if (password !== confirm) throw new Error("Las contraseñas no coinciden.");
    await base44.auth.setPassword(token, password);
    window.location.assign("/");
  }); };

  const titles = {
    login: ["Control de Labores", "Inicia sesión para continuar"],
    forgot: ["Restablecer contraseña", "Te enviaremos un enlace por correo"],
    set: [params.get("mode") === "invite" ? "Bienvenido" : "Nueva contraseña", "Elige una contraseña de al menos 10 caracteres"],
  };

  return (
    <div className="min-h-dvh bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-7 space-y-5">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-600/30">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">{titles[mode][0]}</h1>
          <p className="text-sm text-slate-500">{titles[mode][1]}</p>
        </div>

        {error && <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
        {notice && <div role="status" className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{notice}</div>}

        {mode === "login" && (
          <form onSubmit={submitLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Entrar
            </Button>
            <button type="button" onClick={() => { setMode("forgot"); setError(""); }} className="block mx-auto text-xs text-slate-500 hover:text-emerald-700 underline">
              Olvidé mi contraseña
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={submitForgot} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email2">Correo electrónico</Label>
              <Input id="email2" type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Enviar enlace
            </Button>
            <button type="button" onClick={() => { setMode("login"); setError(""); setNotice(""); }} className="block mx-auto text-xs text-slate-500 hover:text-emerald-700 underline">
              Volver a iniciar sesión
            </button>
          </form>
        )}

        {mode === "set" && (
          <form onSubmit={submitSet} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="np">Contraseña nueva</Label>
              <Input id="np" type="password" autoComplete="new-password" autoFocus required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np2">Repite la contraseña</Label>
              <Input id="np2" type="password" autoComplete="new-password" required minLength={10} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Guardar y entrar
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
