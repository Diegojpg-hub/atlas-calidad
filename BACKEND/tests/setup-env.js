// Variables de entorno SOLO para las pruebas (nunca usar estos valores en producción)
process.env.JWT_SECRET = "secreto-solo-para-pruebas";
process.env.DATABASE_URL = "postgres://no-se-usa:en@pruebas:5432/atlas";