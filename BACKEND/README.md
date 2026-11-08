# Atlas

API en Node.js (Express) con PostgreSQL. Intencionalmente vulnerable para fines académicos.

## Requisitos
- Node.js 18+
- PostgreSQL 13+

## Instalación
```bash
npm install
```

`overrides` fija `body-parser` en 1.20.9 para corregir el fallo con cuerpos
comprimidos. Conserva `raw-body` 2.5.2 y `http-errors` 2.0.0, ya presentes en el
proyecto, aunque están fuera de los rangos declarados por `body-parser`. Se
compararon sus implementaciones con las versiones requeridas: el código de
ejecución de `raw-body` es idéntico y el cambio de `http-errors` es equivalente
en Node.js 24. Estas reglas deben revisarse al actualizar Express o
`body-parser`.

## Direcciones de clientes detrás de proxies

`proxy-addr` se sustituye por `src/proxy-addr-compat.js`, que conserva las
funciones utilizadas por Express y usa `ip-address 10.7.6` para comprobar
subredes. Esta versión se publicó el 3 de noviembre de 2026 a las 16:58:46.090
UTC, después de la instalación original de `proxy-addr` del 16 de octubre de
2026 a las 23:10:30.828374 UTC. `ip-address` no figuraba como componente
independiente en la tabla, por lo que se toma como referencia la fecha de la
dependencia sustituida. `forwarded 0.2.0` e `ipaddr.js 1.9.1` ya estaban
instalados y se mantienen sin cambios.

El alias npm `proxy-addr` apunta realmente a `ip-address`: el código que
necesite las funciones de `proxy-addr` debe importar el adaptador local, no el
alias directamente. Durante `npm install` o `npm ci`, `postinstall` redirige
dos imports de Express 4.21.2 al adaptador y comprueba las versiones esperadas;
no es una compatibilidad declarada por Express. No debe instalarse el backend
con `--ignore-scripts`. Si cambian Express, el alias o su ubicación, hay que
revisar el adaptador antes de continuar.

El valor predeterminado de `trust proxy` sigue siendo `false`. Al configurar
proxies confiables, las subredes IPv4 expresadas como IPv6 mapeado con prefijo
inferior a 96 no confían en ninguna dirección; para `10.0.0.0/8`, por ejemplo,
se puede usar esa notación IPv4 o `::ffff:10.0.0.0/104`. Los recorridos de
subred realizan una comprobación adicional con `ip-address`.

## npm en la imagen del backend

La imagen conserva los comandos `npm` y `npx`. Para corregir las
vulnerabilidades de `undici 6.28.0` incluidas en npm, se usa `undici 7.30.2`,
publicado el 5 de noviembre de 2026 a las 09:06:58.994 UTC, después de la
instalación original de npm del 17 de octubre de 2026 a las 15:08:44.646851 UTC,
y sin dependencias adicionales. `node-gyp 12.4.0` declara `undici ^6.25.0`; el
override es local y se comprueba con pruebas de descarga, TLS, proxies e
instalación de cabeceras. No representa un cambio de compatibilidad declarado
por el proveedor.

Como npm no aplica overrides a dependencias empaquetadas, su copia se administra
en `/usr/local/lib/npm-managed`. Sus ejecutables y el prefijo global siguen
disponibles, pero `npm ls -g npm` ya no enumera la propia copia de npm; su árbol
se consulta con `npm ls --prefix /usr/local/lib/npm-managed --all`. Una
instalación global posterior de npm crearía otra copia en lugar de actualizar
esta. La construcción comprueba las versiones originales de npm, node-gyp y
undici y falla si cambian, para revisar el override al actualizar la imagen
base.

## Base de datos
1. Crear base de datos local (si no existe):
   ```sql
   CREATE DATABASE atlas;
   ```
2. Ejecutar script de tablas y datos:
   ```sql
   \c atlas
   \i sql/init.sql
   ```
3. Conexión por defecto: `postgres://postgres:postgres@localhost:5432/atlas`
   - Puedes cambiarla con `DATABASE_URL`.

## Ejecutar
```bash
npm run start
```
- La API: `http://localhost:4000`
- Salud: `GET /`
 - Swagger UI: `http://localhost:4000/docs`
 - OpenAPI JSON: `http://localhost:4000/openapi.json`

## Autenticación
- `POST /autenticacion/login` body `{ "nombre_usuario": "admin", "password": "admin" }`
- Respuesta: `{ token }`
- El token JWT incluye: `usuarioId`, `nombreUsuario`, `empresaUsuarioId`, `empresaId`

## Endpoints

### Usuarios
- `POST /usuarios`, `GET /usuarios`, `GET /usuarios/:id`, `PUT /usuarios/:id`, `DELETE /usuarios/:id`
- Campos: `nombre_usuario`, `contrasena_hash`, `correo`
- **Nota:** `GET /usuarios` filtra usuarios por empresa del token

### Clientes
- `POST /clientes`, `GET /clientes`, `GET /clientes/:id`, `PUT /clientes/:id`, `DELETE /clientes/:id`
- Campos: `nombre`, `correo`, `telefono`, `direccion`, `es_empresa`, `nombre_banco`, `numero_cuenta`, `titular_cuenta`
- **Nota:** El campo `empresa_id` se obtiene automáticamente del token al crear/editar. Todos los endpoints filtran por empresa del token.
- Buscar clientes: `GET /clientes/search?name=ACME` (consulta por nombre con ILIKE, filtrado por empresa)

### Contratos
- Subir: `POST /contratos` (form-data: `cliente_id`, `titulo`, `fecha_inicio`, `fecha_fin`, opcional `descripcion`, y `file` PDF)
- Listar: `GET /contratos`
- Detalle: `GET /contratos/:id`
- Ver archivo: `GET /contratos/:id/file` (desde DB `documentos_contrato`)
- Eliminar: `DELETE /contratos/:id`
- **Contratos por estado:** `GET /contratos/estados`
  - Retorna un array con contratos por estado (`por_vencer` y `vencido`)
  - `por_vencer`: contratos cuya `fecha_fin` está entre hoy y los próximos 30 días (máximo 3)
  - `vencido`: contratos cuya `fecha_fin` ya pasó (máximo 3)
  - Cada contrato incluye el campo `estado`
  - Requiere autenticación (filtra por empresa del token)
- **Dashboard:** `GET /contratos/dashboard`
  - Retorna estadísticas de la empresa:
    - `totalUsuarios`: total de usuarios asociados a la empresa
    - `totalClientes`: total de clientes de la empresa
    - `contratosVencen7Dias`: contratos que vencen en los próximos 7 días
    - `contratosVencen15Dias`: contratos que vencen en los próximos 15 días
    - `contratosVencen30Dias`: contratos que vencen en los próximos 30 días
  - Requiere autenticación (filtra por empresa del token)

### Auditoría
- `POST /auditoria`, `GET /auditoria`

### Empresas
- `POST /empresas`, `GET /empresas`, `GET /empresas/:id`, `PUT /empresas/:id`, `DELETE /empresas/:id`
- Campos: `nombre`, `direccion`, `telefono`, `correo`
- **Nota:** `POST /empresas` acepta un formato especial para crear empresa con usuario:
  ```json
  {
    "usuario": {
      "nombre_usuario": "usuario",
      "contrasena_hash": "password",
      "correo": "correo@example.com"
    },
    "empresa": {
      "nombre": "Empresa SA",
      "direccion": "...",
      "telefono": "...",
      "correo": "empresa@example.com"
    }
  }
  ```
  Este endpoint crea automáticamente el usuario, la empresa y la relación empresa-usuario con rol administrador (ID 1).

### Roles
- `POST /roles`, `GET /roles`, `GET /roles/:id`, `PUT /roles/:id`, `DELETE /roles/:id`
- Campos: `nombre`

### Empresa-Usuarios
- `POST /empresa-usuarios`, `GET /empresa-usuarios`, `GET /empresa-usuarios/:id`, `PUT /empresa-usuarios/:id`, `DELETE /empresa-usuarios/:id`
- Campos: `empresa_id`, `usuario_id`, `rol_id`

## Notas
- Los documentos de contratos se almacenan en DB (`documentos_contrato.document`) y se sirven desde `GET /contratos/:id/file`.
- Contraseñas en texto plano a propósito (campo `contrasena_hash` no usa hash real).
- Sin mitigaciones de seguridad (XSS/SQLi, etc.).
- La mayoría de los endpoints requieren autenticación mediante token Bearer en el header `Authorization`.
- Los endpoints filtran datos por empresa según el `empresaId` contenido en el token JWT.
- Todos los errores retornan formato: `{ error: "mensaje", glosa: "detalle del error" }`.
