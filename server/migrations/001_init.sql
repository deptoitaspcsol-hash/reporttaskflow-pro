-- Control de Labores: esquema inicial.
-- Ejecutado por el rol propietario (migrador). La API trabaja con un rol limitado (ver 002_roles.sql).

CREATE TABLE users (
  id               text PRIMARY KEY,
  email            text NOT NULL,
  full_name        text,
  role             text NOT NULL DEFAULT 'visor',
  blocked          boolean NOT NULL DEFAULT false,
  job_title        text,
  department       text,
  extra            jsonb NOT NULL DEFAULT '{}'::jsonb,       -- campos adicionales de Base44 u otros
  password_hash    text,                                      -- NULL = invitación pendiente
  failed_attempts  integer NOT NULL DEFAULT 0,
  locked_until     timestamptz,
  last_login_at    timestamptz,
  password_changed_at timestamptz,
  created_date     timestamptz NOT NULL DEFAULT now(),
  updated_date     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_format CHECK (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  CONSTRAINT users_email_lower  CHECK (email = lower(email))
);
CREATE UNIQUE INDEX users_email_uq ON users (email);

-- Sesiones: el navegador guarda un token aleatorio; aquí solo está su huella SHA-256.
CREATE TABLE sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash   bytea NOT NULL UNIQUE,
  user_id      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ip           text,
  user_agent   text
);
CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_expires_idx ON sessions (expires_at);

-- Enlaces de un solo uso para fijar contraseña (invitación) o restablecerla.
CREATE TABLE user_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     text NOT NULL CHECK (purpose IN ('invite','reset')),
  token_hash  bytea NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_tokens_user_idx ON user_tokens (user_id);

-- Registros de todas las entidades (Worker, DailyReport, ...). La forma de cada una la define schemas/*.json
-- y la valida la API; JSONB permite agregar campos sin migrar y filtrar con índices GIN.
CREATE TABLE records (
  entity       text NOT NULL,
  id           text NOT NULL,
  data         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by   text,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity, id),
  CONSTRAINT records_data_is_object CHECK (jsonb_typeof(data) = 'object'),
  CONSTRAINT records_data_size CHECK (pg_column_size(data) < 1048576)
);
CREATE INDEX records_recent_idx ON records (entity, created_date DESC);
CREATE INDEX records_data_gin   ON records USING gin (data jsonb_path_ops);

-- Archivos subidos: el contenido vive en disco; aquí quedan los metadatos y quién lo subió.
CREATE TABLE files (
  id            text PRIMARY KEY,
  original_name text NOT NULL,
  mime          text NOT NULL,
  size          bigint NOT NULL,
  sha256        text NOT NULL,
  storage_key   text NOT NULL UNIQUE,
  uploaded_by   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Auditoría de seguridad (inicios de sesión, cambios de rol, altas/bajas...). Solo se agrega: nunca se edita ni se borra.
CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  actor_id    text,
  actor_email text,
  action      text NOT NULL,
  entity      text,
  record_id   text,
  ip          text,
  details     jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX audit_at_idx ON audit_log (at DESC);
CREATE INDEX audit_actor_idx ON audit_log (actor_email, at DESC);

CREATE FUNCTION forbid_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La tabla % es de solo agregar: no se permite % ', TG_TABLE_NAME, TG_OP USING ERRCODE = 'insufficient_privilege';
END $$;

CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_change();

-- La bitácora de cambios de la aplicación (entidad Historial) también es inmutable.
CREATE FUNCTION forbid_historial_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.entity = 'Historial') OR (TG_OP = 'UPDATE' AND OLD.entity = 'Historial') THEN
    RAISE EXCEPTION 'El historial de cambios no se puede modificar ni borrar' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER records_historial_immutable BEFORE UPDATE OR DELETE ON records
  FOR EACH ROW EXECUTE FUNCTION forbid_historial_change();
