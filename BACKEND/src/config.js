// Configuración central de la API.
// Si falta una variable crítica, la aplicación NO arranca (falla rápido y seguro).
require("dotenv").config();
 
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("Falta la variable de entorno JWT_SECRET");
}
 
module.exports = { JWT_SECRET };