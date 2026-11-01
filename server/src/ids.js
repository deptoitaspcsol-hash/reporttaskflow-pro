import { randomBytes } from "node:crypto";

// Identificadores de 24 caracteres hexadecimales (como los de Base44): permiten conservar los id
// al importar datos y se ordenan aproximadamente por fecha de creación.
let counter = randomBytes(3).readUIntBE(0, 3);
export function newId() {
  const buf = Buffer.alloc(12);
  buf.writeUInt32BE(Math.floor(Date.now() / 1000), 0);
  randomBytes(5).copy(buf, 4);
  counter = (counter + 1) & 0xffffff;
  buf.writeUIntBE(counter, 9, 3);
  return buf.toString("hex");
}
export const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
