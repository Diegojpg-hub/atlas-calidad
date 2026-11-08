# Dependencia de npm corregida y fijada independientemente de la aplicación
FROM node:24-alpine AS npm-undici

WORKDIR /npm-undici
COPY npm-runtime/package*.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --fund=false

# Versión de Node.js con soporte vigente
FROM node:24-alpine
 
WORKDIR /app
 
# Instalar solo lo necesario para funcionar (las herramientas de prueba NO entran)
COPY package*.json ./
COPY scripts/patch-express-proxy.js ./scripts/patch-express-proxy.js
COPY scripts/patch-express-routing.js ./scripts/patch-express-routing.js
COPY src/proxy-addr-compat.js ./src/proxy-addr-compat.js
COPY src/path-to-regexp-compat.js ./src/path-to-regexp-compat.js
RUN npm ci --omit=dev && npm cache clean --force

# Los overrides de npm no se aplican a dependencias empaquetadas; se gestiona
# npm como proyecto separado sin modificar su código ni el de node-gyp.
COPY npm-runtime/package.json /usr/local/lib/npm-managed/package.json
RUN node -e 'const base="/usr/local/lib/node_modules/npm/"; const expected={"package.json":"11.19.1","node_modules/node-gyp/package.json":"12.4.0","node_modules/undici/package.json":"6.28.0"}; for (const [file, version] of Object.entries(expected)) { const actual=require(base+file).version; if (actual!==version) throw new Error("Revisar el override de undici: "+file+" esperado "+version+", encontrado "+actual); }' \
    && mkdir -p /usr/local/lib/npm-managed/node_modules \
    && mv /usr/local/lib/node_modules/npm /usr/local/lib/npm-managed/node_modules/npm \
    && rm -r /usr/local/lib/npm-managed/node_modules/npm/node_modules/undici \
    && ln -sf ../lib/npm-managed/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -sf ../lib/npm-managed/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && node -e 'const fs=require("fs"); const file="/usr/local/lib/npm-managed/package.json"; const manifest=JSON.parse(fs.readFileSync(file,"utf8")); manifest.dependencies.npm=require("/usr/local/lib/npm-managed/node_modules/npm/package.json").version; fs.writeFileSync(file,JSON.stringify(manifest,null,2)+"\n");'
COPY --from=npm-undici /npm-undici/node_modules/undici /usr/local/lib/npm-managed/node_modules/undici
RUN npm ls --prefix /usr/local/lib/npm-managed --all --json > /dev/null \
    && npm ls --global --all --json > /dev/null
 
COPY src/ ./src/
COPY licenses/path-to-regexp-MIT.txt ./licenses/path-to-regexp-MIT.txt
COPY sql/ ./sql/
 
# Carpeta para archivos subidos; su dueño es "node", un usuario SIN permisos de administrador
RUN mkdir -p uploads/contracts && chown -R node:node /app
USER node
 
# Puerto real de la API
EXPOSE 4000
 
CMD ["node", "src/app.js"]
