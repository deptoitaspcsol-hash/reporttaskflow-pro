// Cliente de la API propia (server/). Imita la parte del SDK de Base44 que usa esta aplicación
// (entities.X.list/filter/get/create/bulkCreate/update/delete, auth.*, users.inviteUser, integrations.Core.UploadFile),
// de modo que las páginas funcionan igual sin cambios.

const HEADERS = { "X-Requested-With": "labores" }; // protección CSRF: el servidor lo exige en peticiones que modifican datos

class ApiError extends Error {
  constructor(status, message, data) { super(message); this.status = status; this.data = data; }
}

let redirecting = false;
function goToLogin(next) {
  if (redirecting || window.location.pathname === "/login") return;
  redirecting = true;
  const target = next ?? window.location.pathname + window.location.search;
  window.location.assign(`/login?next=${encodeURIComponent(target)}`);
}

async function request(method, path, { body, form } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: { ...HEADERS, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(0, "No hay conexión con el servidor.", null); // sin status: la interfaz lo trata como problema de red
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* respuesta no JSON */ }
  if (!res.ok) {
    // Sesión vencida en mitad del trabajo: volver al login (excepto en las propias llamadas de acceso).
    if (res.status === 401 && !path.startsWith("/api/auth/")) goToLogin();
    throw new ApiError(res.status, data?.message || `Error ${res.status}`, data);
  }
  return data;
}

const enc = encodeURIComponent;

function entityApi(name) {
  const base = `/api/entities/${enc(name)}`;
  return {
    list: (sort, limit, skip) => {
      const q = new URLSearchParams();
      if (sort) q.set("sort", sort);
      if (limit) q.set("limit", String(limit));
      if (skip) q.set("skip", String(skip));
      return request("GET", `${base}${q.size ? `?${q}` : ""}`);
    },
    filter: (where, sort, limit, skip) => request("POST", `${base}/query`, { body: { where: where ?? {}, ...(sort ? { sort } : {}), ...(limit ? { limit } : {}), ...(skip ? { skip } : {}) } }),
    get: (id) => request("GET", `${base}/${enc(id)}`),
    create: (data) => request("POST", base, { body: data }),
    bulkCreate: (items) => request("POST", `${base}/bulk`, { body: items }),
    update: (id, data) => request("PATCH", `${base}/${enc(id)}`, { body: data }),
    delete: (id) => request("DELETE", `${base}/${enc(id)}`),
    // Las actualizaciones en tiempo real no se usan en esta aplicación: se devuelve una función de baja vacía.
    subscribe: () => () => {},
  };
}

export function createSelfHostedClient() {
  return {
    entities: new Proxy({}, { get: (cache, name) => (cache[name] ??= entityApi(String(name))) }),
    auth: {
      me: () => request("GET", "/api/auth/me"),
      login: (email, password) => request("POST", "/api/auth/login", { body: { email, password } }),
      async logout(redirectTo) {
        try { await request("POST", "/api/auth/logout", { body: {} }); } catch { /* aunque falle, se sale de la sesión local */ }
        window.location.assign(typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : "/login");
      },
      redirectToLogin: (from) => goToLogin(typeof from === "string" ? safeNext(from) : undefined),
      changePassword: (current_password, new_password) => request("POST", "/api/auth/change-password", { body: { current_password, new_password } }),
      forgotPassword: (email) => request("POST", "/api/auth/forgot", { body: { email } }),
      setPassword: (token, password) => request("POST", "/api/auth/set-password", { body: { token, password } }),
    },
    users: {
      // Devuelve { invite_url } cuando el servidor no puede enviar el correo (sin SMTP configurado).
      inviteUser: (email, role) => request("POST", "/api/users/invite", { body: { email, role } }),
    },
    integrations: {
      Core: {
        async UploadFile({ file }) {
          const form = new FormData();
          form.append("file", file);
          return request("POST", "/api/files", { form });
        },
      },
    },
  };
}

/**
 * Devuelve una ruta interna segura para volver tras iniciar sesión. Acepta "/Tasks" o una URL absoluta de este
 * mismo sitio; cualquier otro origen ("//sitio-malo.com", "https://otro.com", "javascript:...") se descarta.
 */
export function safeNext(value) {
  try {
    const u = new URL(String(value ?? ""), window.location.origin);
    if (u.origin !== window.location.origin || u.pathname === "/login") return "/";
    return u.pathname + u.search + u.hash;
  } catch { return "/"; }
}
