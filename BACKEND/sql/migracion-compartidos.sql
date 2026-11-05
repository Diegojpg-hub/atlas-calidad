-- R-08: convierte las contraseñas de contratos compartidos (texto plano) a hash bcrypt.
-- Solo toca las que aún no son un hash.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE contratos
SET share_password_hash = crypt(share_password_hash, gen_salt('bf', 10))
WHERE share_password_hash IS NOT NULL
  AND share_password_hash NOT LIKE '$2%';
