import { loadConfig } from "./config.js";
import { createDb } from "./db.js";
import { migrate } from "./migrate.js";
import { buildApp } from "./app.js";
import { bootstrapAdmin } from "./bootstrap.js";

const cfg = loadConfig();
const db = createDb(cfg.databaseUrl);

// En el despliegue con Docker las migraciones las corre el servicio "migrate" con el rol propietario.
// Si AUTO_MIGRATE=true (desarrollo) también se aplican aquí.
if (process.env.AUTO_MIGRATE === "true") {
  const owner = createDb(cfg.migrateDatabaseUrl, { max: 2, application_name: "labores-migrate" });
  await migrate(owner);
  await owner.end();
}

const app = await buildApp({ cfg, db });
await bootstrapAdmin({ cfg, db, log: app.log });

const shutdown = async (signal) => {
  app.log.info(`${signal} recibido, cerrando...`);
  await app.close();
  await db.end();
  process.exit(0);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

await app.listen({ host: cfg.host, port: cfg.port });
