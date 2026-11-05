# Versión de Node.js con soporte vigente
FROM node:24-alpine
 
WORKDIR /app
 
# Instalar solo lo necesario para funcionar (las herramientas de prueba NO entran)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
 
COPY src/ ./src/
COPY sql/ ./sql/
 
# Carpeta para archivos subidos; su dueño es "node", un usuario SIN permisos de administrador
RUN mkdir -p uploads/contracts && chown -R node:node /app
USER node
 
# Puerto real de la API
EXPOSE 4000
 
CMD ["node", "src/app.js"]
