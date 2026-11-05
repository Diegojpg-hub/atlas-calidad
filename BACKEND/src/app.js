const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");

const { pool } = require("./db");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const clientRoutes = require("./routes/clients");
const contractRoutes = require("./routes/contracts");
const publicContractRoutes = require("./routes/public-contracts");
const auditRoutes = require("./routes/audit");
const empresasRoutes = require("./routes/empresas");
const rolesRoutes = require("./routes/roles");
const empresaUsuariosRoutes = require("./routes/empresa_usuarios");
const metricasRoutes = require("./routes/metricas");

const app = express();

app.use(helmet()); // agrega las protecciones y oculta "X-Powered-By"
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3351", // solo nuestra aplicación web
  })
);
app.use(express.json());
app.use(morgan("dev"));

const uploadsDir = path.join(__dirname, "..", "uploads", "contracts");
fs.mkdirSync(uploadsDir, { recursive: true });

app.use("/autenticacion", authRoutes);
app.use("/usuarios", userRoutes);
app.use("/clientes", clientRoutes);
app.use("/contratos", contractRoutes);
app.use("/public/contratos", publicContractRoutes);
app.use("/auditoria", auditRoutes);
app.use("/empresas", empresasRoutes);
app.use("/roles", rolesRoutes);
app.use("/empresa-usuarios", empresaUsuariosRoutes);
app.use("/metricas", metricasRoutes);

const openapi = require("./openapi.json");
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.get("/openapi.json", (req, res) => {
  res.json(openapi);
});

app.use("/files/contracts", express.static(uploadsDir));

app.get("/", (req, res) => {
  res.json({ name: "Atlas", status: "ok" });
});

// Solo encendemos el servidor si este archivo se ejecuta directamente
// (node src/app.js). Cuando lo usan las pruebas, NO se enciende.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Atlas API escuchando en puerto ${PORT}`);
  });
}
 
module.exports = app;