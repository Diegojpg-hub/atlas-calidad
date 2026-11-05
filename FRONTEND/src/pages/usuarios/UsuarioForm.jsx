import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import {
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { toast } from "sonner";
import PageHeader from "../../components/PageHeader";
import PersonIcon from "@mui/icons-material/Person";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useFormik } from "formik";
import { updateUsuarioSchema, updatePasswordSchema } from "../../validations/users";
import { useAuth } from "../../hooks/useAuth";

export default function UsuarioForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [esUnicoAdministrador, setEsUnicoAdministrador] = useState(false);
  
  // Verificar si el usuario editado es el mismo que el de la sesión
  const esUsuarioActual = user?.usuarioId && id && Number(user.usuarioId) === Number(id);

  const usuarioFormik = useFormik({
    initialValues: {
      nombre_usuario: "",
      correo: "",
      rol_id: "",
    },
    validationSchema: updateUsuarioSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        await api.put(`/usuarios/${id}`, {
          correo: values.correo,
          rol_id: values.rol_id ? Number(values.rol_id) : undefined,
        });
        toast.success("Información del usuario actualizada");
      } catch {
        // El error ya se maneja en el interceptor
      } finally {
        setLoading(false);
      }
    },
  });

  const passwordFormik = useFormik({
    initialValues: {
      contrasena_hash: "",
      confirmar_contrasena: "",
    },
    validationSchema: updatePasswordSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        await api.put(`/usuarios/${id}`, {
          contrasena_hash: values.contrasena_hash,
        });
        toast.success("Contraseña actualizada");
        passwordFormik.resetForm();
      } catch {
        // El error ya se maneja en el interceptor
      } finally {
        setLoading(false);
      }
    },
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        // Cargar roles disponibles
        const rolesResponse = await api.get("/roles");
        setRoles(rolesResponse.data || []);
        
        // Cargar información del usuario
        const { data } = await api.get(`/usuarios/${id}`);
        const usuarioData = {
          nombre_usuario: data.nombre_usuario || "",
          correo: data.correo || "",
          rol_id: data.rol_id || "",
        };
        setEsUnicoAdministrador(data.es_unico_administrador || false);
        usuarioFormik.setValues(usuarioData);
      } catch {
        toast.error("Error al cargar usuario");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Editar Usuario"
        actions={
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            data-testid="button-usuario-volver"
            onClick={() => navigate("/usuarios")}
            sx={{
              borderColor: "divider",
              "&:hover": {
                borderColor: "primary.main",
                backgroundColor: "rgba(25, 118, 210, 0.04)",
              },
            }}
          >
            Volver
          </Button>
        }
      />

      {/* Card informativa */}
      <Card
        sx={{
          background: "#1B7576",
          color: "white",
          boxShadow: "0 10px 30px rgba(27, 117, 118, 0.3)",
        }}
      >
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <PersonIcon sx={{ fontSize: 48, opacity: 0.9 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                Editar Información del Usuario
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Actualiza los datos del usuario y cambia su contraseña en el
                sistema.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Información del usuario */}
      <Card
        sx={{
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          borderRadius: 2,
        }}
      >
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <EditIcon color="primary" sx={{ fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Información del Usuario
            </Typography>
          </Stack>
          <Divider sx={{ mb: 3 }} />
          <Stack spacing={3}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <TextField
                label="Nombre de usuario"
                value={usuarioFormik.values.nombre_usuario}
                inputProps={{ "data-testid": "input-usuario-nombre" }}
                sx={{ flex: 1, minWidth: 200 }}
                variant="outlined"
                fullWidth
                readOnly
                disabled
              />
              <TextField
                label="Correo electrónico"
                name="correo"
                type="email"
                value={usuarioFormik.values.correo}
                onChange={usuarioFormik.handleChange}
                onBlur={usuarioFormik.handleBlur}
                error={usuarioFormik.touched.correo && Boolean(usuarioFormik.errors.correo)}
                helperText={usuarioFormik.touched.correo && usuarioFormik.errors.correo}
                inputProps={{ "data-testid": "input-usuario-correo" }}
                sx={{ flex: 1, minWidth: 200 }}
                variant="outlined"
                fullWidth
                required
              />
            </Stack>
            <FormControl sx={{ minWidth: 200 }} fullWidth>
              <InputLabel>Rol</InputLabel>
              <Select
                name="rol_id"
                value={usuarioFormik.values.rol_id || ""}
                label="Rol"
                onChange={usuarioFormik.handleChange}
                onBlur={usuarioFormik.handleBlur}
                disabled={esUnicoAdministrador || esUsuarioActual}
                inputProps={{ "data-testid": "select-usuario-rol" }}
              >
                {roles.map((rol) => (
                  <MenuItem key={rol.id} value={rol.id}>
                    {rol.nombre}
                  </MenuItem>
                ))}
              </Select>
              {esUnicoAdministrador && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.75 }}>
                  No se puede cambiar el rol del único administrador de la empresa
                </Typography>
              )}
              {esUsuarioActual && !esUnicoAdministrador && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.75 }}>
                  No puedes cambiar tu propio rol
                </Typography>
              )}
            </FormControl>
            <Divider sx={{ my: 1 }} />
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                data-testid="button-usuario-cancelar"
                onClick={() => navigate("/usuarios")}
                sx={{
                  minWidth: 120,
                  borderColor: "divider",
                  "&:hover": {
                    borderColor: "primary.main",
                    backgroundColor: "rgba(25, 118, 210, 0.04)",
                  },
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                data-testid="button-usuario-actualizar"
                onClick={usuarioFormik.handleSubmit}
                disabled={loading || usuarioFormik.isSubmitting}
                startIcon={<EditIcon />}
                sx={{
                  minWidth: 180,
                  backgroundColor: "#1B7576",
                  "&:hover": {
                    backgroundColor: "#155a5b",
                  },
                }}
              >
                Actualizar Información
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Cambiar contraseña */}
      <Card
        sx={{
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          borderRadius: 2,
        }}
      >
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <LockIcon color="primary" sx={{ fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Cambiar Contraseña
            </Typography>
          </Stack>
          <Divider sx={{ mb: 3 }} />
          <Stack spacing={3}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <TextField
                label="Nueva contraseña"
                name="contrasena_hash"
                type="password"
                value={passwordFormik.values.contrasena_hash}
                onChange={passwordFormik.handleChange}
                onBlur={passwordFormik.handleBlur}
                error={passwordFormik.touched.contrasena_hash && Boolean(passwordFormik.errors.contrasena_hash)}
                helperText={passwordFormik.touched.contrasena_hash && passwordFormik.errors.contrasena_hash}
                inputProps={{ "data-testid": "input-usuario-password" }}
                sx={{ flex: 1, minWidth: 200 }}
                variant="outlined"
                fullWidth
                required
              />
              <TextField
                label="Confirmar contraseña"
                name="confirmar_contrasena"
                type="password"
                value={passwordFormik.values.confirmar_contrasena}
                onChange={passwordFormik.handleChange}
                onBlur={passwordFormik.handleBlur}
                error={passwordFormik.touched.confirmar_contrasena && Boolean(passwordFormik.errors.confirmar_contrasena)}
                helperText={passwordFormik.touched.confirmar_contrasena && passwordFormik.errors.confirmar_contrasena}
                inputProps={{ "data-testid": "input-usuario-confirmar-password" }}
                sx={{ flex: 1, minWidth: 200 }}
                variant="outlined"
                fullWidth
                required
              />
            </Stack>
            <Divider sx={{ my: 1 }} />
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="contained"
                data-testid="button-usuario-actualizar-password"
                onClick={passwordFormik.handleSubmit}
                disabled={loading || passwordFormik.isSubmitting}
                startIcon={<LockIcon />}
                sx={{
                  minWidth: 180,
                  backgroundColor: "#1B7576",
                  "&:hover": {
                    backgroundColor: "#155a5b",
                  },
                }}
              >
                Actualizar Contraseña
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
