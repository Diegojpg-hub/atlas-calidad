import { useEffect, useMemo, useState } from "react";
import { api, setAuthToken } from "../lib/api";
import { AuthContext } from "./authContextInstance";
import { jwtDecode } from "jwt-decode";

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("token") || null
  );
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });
  const [loading, setLoading] = useState(false);

  // Obtener el rol del usuario desde el token decodificado
  const role = useMemo(() => {
    if (user?.rolNombre) {
      return user.rolNombre;
    }
    // Fallback para compatibilidad
    return user?.rolId === 1 ? "administrador" : "editor";
  }, [user]);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const login = async ({ nombre_usuario, password }) => {
    setLoading(true);
    try {
      const { data } = await api.post("/autenticacion/login", {
        nombre_usuario,
        password,
      });
      const newToken = data?.token;
      setToken(newToken);
      localStorage.setItem("token", newToken);
      setAuthToken(newToken);

      // Decodificar el token JWT usando jwt-decode
      let decodedToken = null;
      try {
        decodedToken = jwtDecode(newToken);
      } catch (error) {
        console.error("Error al decodificar JWT:", error);
      }

      // Crear objeto user con nombre_usuario y todo el contenido descifrado del token
      const userData = {
        nombre_usuario,
        ...(decodedToken || {}),
      };

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // No eliminamos "role" porque ya no se guarda en localStorage
  };

  const value = useMemo(
    () => ({ token, user, role, loading, login, logout }),
    [token, user, role, loading]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
