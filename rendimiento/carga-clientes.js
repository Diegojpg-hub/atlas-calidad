import http from "k6/http";
import { check, sleep } from "k6";
 
// URL de la API: en tu PC es localhost:4451. Dentro de Docker se cambia con -e API_URL=...
const API = __ENV.API_URL || "http://localhost:4451";
 
// Perfiles de carga: "humo" (rápido, para el pipeline) y "carga" (prueba completa)
const PERFILES = {
  estres: [
    { duration: "30s", target: 50 },
    { duration: "30s", target: 100 },
    { duration: "30s", target: 150 },
    { duration: "30s", target: 200 },
    { duration: "30s", target: 200 },
    { duration: "15s", target: 0 },
  ],
  humo: [
    { duration: "10s", target: 5 },
    { duration: "20s", target: 5 },
  ],
  carga: [
    { duration: "30s", target: 20 }, // subimos a 20 usuarios virtuales
    { duration: "1m", target: 20 },  // mantenemos la carga
    { duration: "15s", target: 0 },  // bajamos
  ],
};
 
export const options = {
  stages: PERFILES[__ENV.PERFIL || "carga"],
  // Criterios de aceptación (umbrales). Si no se cumplen, k6 termina con error.
  thresholds: {
    http_req_failed: ["rate<0.01"],    // menos de 1% de peticiones con error
    http_req_duration: ["p(95)<500"],  // el 95% responde en menos de 500 ms
  },
};
 
// setup() se ejecuta UNA vez: iniciamos sesión y compartimos el token
export function setup() {
  const res = http.post(
    `${API}/autenticacion/login`,
    JSON.stringify({ nombre_usuario: "admin", password: "admin" }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(res, { "login 200": (r) => r.status === 200 });
  return { token: res.json("token") };
}
 
// default() lo ejecuta CADA usuario virtual, una y otra vez
export default function (data) {
  const params = { headers: { Authorization: `Bearer ${data.token}` } };
 
  const lista = http.get(`${API}/clientes`, params);
  check(lista, {
    "listar clientes: status 200": (r) => r.status === 200,
    "listar clientes: devuelve un arreglo": (r) => Array.isArray(r.json()),
  });
 
  const busqueda = http.get(`${API}/clientes/search?name=Mar`, params);
  check(busqueda, { "buscar clientes: status 200": (r) => r.status === 200 });
 
  sleep(1); // "tiempo de pensar" de un usuario real
}
