const { Pool } = require("pg");
require("dotenv").config();
 
if (!process.env.DATABASE_URL) {
  throw new Error("Falta la variable de entorno DATABASE_URL");
}
 
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 
module.exports = { pool };
