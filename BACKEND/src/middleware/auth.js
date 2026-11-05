const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");
 
// Una sola función para todas las rutas (antes estaba copiada en 8 archivos)
function getUserFromAuthHeader(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.substring(7), JWT_SECRET);
  } catch {
    return null;
  }
}
 
module.exports = { getUserFromAuthHeader };