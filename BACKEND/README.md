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
subred realizan una comprobación adicional con `ip-address`. Los rangos
predefinidos se obtienen de las redes especiales de `ipaddr.js 1.9.1` y también
deben revisarse al cambiar esa versión.

## Compatibilidad del enrutador

Express 4.21.2 utiliza `src/path-to-regexp-compat.js` con
`path-to-regexp 9.0.0`, publicada el 22 de octubre de 2026 a las 18:22:16.576
UTC, después de la instalación original de `path-to-regexp` del 16 de octubre a
las 23:10:30.828374 UTC. La versión 9 es ESM y no ofrece la API de Express 4.
Durante `postinstall`, `@swc/wasm 1.16.22` la convierte a CommonJS para
conservar el soporte de Node.js 18+, aunque todavía no se ha probado la
instalación en Node.js 18. El compilador se publicó el 5 de noviembre de 2026 a
las 10:49:32.325 UTC y no tiene dependencias; como no figura en la tabla, se
toma como referencia la fecha de la dependencia sustituida.

El adaptador no es compatibilidad declarada por Express: conserva las rutas
actuales y la mayoría de formatos heredados, pero rechaza parámetros adyacentes
en un segmento, como `/:a:b`, y rutas de texto con más de un comodín `*`. Use
un separador entre parámetros y, cuando corresponda, una expresión regular
explícita revisada para las rutas que requieran varios comodines. Las
capturas de rutas con tres o más parámetros separados en un mismo segmento
pueden cambiar respecto de `path-to-regexp 0.1.12`: `/:a-:b-:c` captura `a-b`,
`c` y `d` para `/a-b-c-d`, en lugar de `a`, `b` y `c-d`. Las expresiones
regulares suministradas directamente se conservan sin cambios; tanto estas
como los patrones personalizados en rutas de texto deben revisarse por
separado. La representación textual de las expresiones generadas puede diferir
de la anterior. El código que necesite la API antigua debe importar el adaptador
local; `require("path-to-regexp")` no ofrece esa API. Si cambian las versiones
o ubicaciones esperadas, la instalación falla para obligar a revisar el
adaptador.

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

En esa misma copia, `minimatch 10.2.5` y las entradas compiladas de
`glob 13.0.6` utilizan un adaptador local derivado de `brace-expansion 5.0.9`.
El adaptador evita los recorridos recursivos por grupos consecutivos, limita el
anidamiento y elimina las llamadas con grandes listas de argumentos que podían
agotar la pila; también conserva la variante de escapes que ya incluía `glob`.
Se elimina el paquete original y se reutiliza
`balanced-match 4.0.4`, que ya estaba incluido en npm: no se instala una
versión adicional. La licencia MIT se conserva en
`licenses/brace-expansion-MIT.txt`.

Por defecto se aplican los límites de 100.000 resultados y 4.000.000 caracteres
totales, también a las expansiones intermedias. `minimatch` ya tenía ambos
límites, pero el código integrado anterior de `glob` no limitaba el total de
caracteres: los patrones que lo superen pueden producir menos resultados que
antes. Se rechazan con `RangeError` los patrones de más de 65.536 caracteres,
los anidamientos de más de 256 niveles, las reescrituras malformadas que
superen 256 pasos y los límites no finitos. El límite de resultados puede
ajustarse con `braceExpandMax` y el de caracteres en el adaptador interno;
aumentarlos incrementa el uso de recursos y solo debe hacerse con patrones
confiables. El instalador comprueba versiones, ubicaciones y huellas del código
antes de modificarlo y vuelve a comprobar la instalación si se ejecuta otra
vez. Si cambian npm, `minimatch`, `glob` o `balanced-match`, la construcción
falla hasta que se revise el adaptador; esta integración no es una
compatibilidad declarada por sus proveedores.

Al finalizar la construcción se eliminan los registros y la caché temporal
de compilación generados por npm. No se eliminan npm ni npx; los archivos
temporales pueden regenerarse cuando se ejecuten.

## Evaluación de Trivy para jws

La imagen mantiene `jws 3.2.2` sin modificar. El
[aviso oficial de CVE-2025-65945](https://github.com/advisories/GHSA-869p-cjfg-cm3x)
indica que quienes usan `jsonwebtoken` y `jws.verify` no están afectados por
ese problema. Atlas usa `jsonwebtoken` con `JWT_SECRET` de configuración; no
usa `jws.createVerify` para buscar secretos a partir de datos del token.

El pipeline muestra primero el análisis completo de Trivy sin VEX ni archivo
de exclusiones, incluidas todas las severidades y las vulnerabilidades sin
corrección disponible.
Después genera una declaración OpenVEX `not_affected` únicamente para ese
CVE, `jws 3.2.2` y la huella de la imagen revisada. El análisis que determina
el resultado conserva visibles las alertas declaradas no afectadas y mantiene
los criterios anteriores: HIGH/CRITICAL con `ignore-unfixed: true`. Los demás
hallazgos que cumplen esos criterios siguen bloqueando el control. Esta
declaración no repara `jws` ni descarta otras vulnerabilidades de la biblioteca.
El informe completo y la declaración se guardan como artefacto del pipeline, y
la evaluación aparece también como advertencia y en el resumen del trabajo.

La generación de VEX comprueba el contenido completo del sistema de archivos
de la imagen, su configuración de ejecución y `docker-compose.yml`. Si cambia
cualquiera de ellos, el pipeline falla hasta que se revise nuevamente el uso
de JWT, las dependencias, la configuración y el aviso antes de actualizar las
huellas aprobadas en `.github/scripts/jws_vex.py`. La evaluación corresponde
al funcionamiento predeterminado revisado; un despliegue que cambie el
comando, monte código o inyecte opciones de Node.js requiere otra evaluación.

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
