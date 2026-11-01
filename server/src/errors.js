export class HttpError extends Error {
  constructor(status, message, code = "error") { super(message); this.status = status; this.code = code; }
}
export const badRequest = (m) => new HttpError(400, m, "bad_request");
export const unauthorized = (m = "Inicia sesión para continuar.") => new HttpError(401, m, "unauthenticated");
export const forbidden = (m = "No tienes permiso para esta acción.") => new HttpError(403, m, "forbidden");
export const notFound = (m = "No encontrado.") => new HttpError(404, m, "not_found");
export const conflict = (m) => new HttpError(409, m, "conflict");
export const invalid = (m) => new HttpError(422, m, "validation");
