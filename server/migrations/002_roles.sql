-- Rol de la API con el mínimo privilegio: lee y escribe datos, pero no puede crear ni borrar tablas.
-- El rol "app_rw" lo crea deploy/db/init.sh al inicializar la base. Si no existe (p. ej. en pruebas),
-- esta migración no hace nada.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    GRANT USAGE ON SCHEMA public TO app_rw;
    GRANT SELECT, INSERT, UPDATE, DELETE ON users, sessions, user_tokens, records, files TO app_rw;
    GRANT SELECT, INSERT ON audit_log TO app_rw;          -- sin UPDATE ni DELETE
    GRANT USAGE, SELECT ON SEQUENCE audit_log_id_seq TO app_rw;
  END IF;
END $$;
