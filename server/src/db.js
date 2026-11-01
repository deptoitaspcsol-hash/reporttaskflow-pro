import pg from "pg";

// Los NUMERIC y BIGINT llegan como número cuando es seguro; las fechas, como ISO.
pg.types.setTypeParser(20, (v) => Number(v)); // bigint

/** Envoltura mínima de pg: query() y tx() con reintento de conexión. */
export function createDb(connectionString, { max = 10, application_name = "labores-api" } = {}) {
  const pool = new pg.Pool({ connectionString, max, application_name, idleTimeoutMillis: 30000, connectionTimeoutMillis: 8000 });
  pool.on("error", (err) => console.error("[db] error en el pool:", err.message));

  return {
    pool,
    query: (text, params) => pool.query(text, params),
    /** Ejecuta fn(client) dentro de una transacción; hace ROLLBACK si lanza. */
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn({ query: (t, p) => client.query(t, p) });
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    end: () => pool.end(),
  };
}
