import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Stack,
  Typography,
  TextField,
  Button,
  Divider,
  Box,
  Paper,
  CircularProgress,
  Alert,
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LockIcon from "@mui/icons-material/Lock";
import { api } from "../../lib/api";
import { toast } from "sonner";

export default function ContratoCompartido() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [contrato, setContrato] = useState(null);
  const [files, setFiles] = useState([]);
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error("Por favor ingresa la contraseña");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Verificar contraseña y obtener información del contrato
      const { data } = await api.post(`/public/contratos/${token}/verify`, {
        password,
      });
      setContrato(data);
      setVerified(true);
      setAccessToken(data.accessToken);

      // Cargar archivos (autorizado con el token temporal, no con la contraseña)
      const filesResponse = await api.get(
        `/public/contratos/${token}/files`,
        { headers: { Authorization: `Bearer ${data.accessToken}` } }
      );
      setFiles(filesResponse.data || []);

      toast.success("Acceso autorizado");
    } catch (err) {
      const errorMessage =
        err.response?.data?.glosa ||
        err.response?.data?.error ||
        "Error al verificar contraseña";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewFile = async (fileId) => {
    try {
      const response = await api.get(
        `/public/contratos/${token}/file/${fileId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          responseType: "blob",
        }
      );
      const blobUrl = URL.createObjectURL(response.data);
      window.open(blobUrl, "_blank");
    } catch {
      toast.error("No se pudo abrir el archivo. Vuelve a ingresar la contraseña.");
    }
  };

  if (!verified) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "grey.50",
          p: 3,
        }}
      >
        <Card sx={{ maxWidth: 500, width: "100%" }}>
          <CardContent>
            <Stack spacing={3} alignItems="center">
              <LockIcon sx={{ fontSize: 48, color: "primary.main" }} />
              <Typography variant="h5" textAlign="center">
                Contrato Compartido
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
              >
                Este contrato está protegido con contraseña. Por favor ingresa
                la contraseña para acceder.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ width: "100%" }}>
                  {error}
                </Alert>
              )}

              <Box
                component="form"
                onSubmit={handleVerify}
                sx={{ width: "100%" }}
              >
                <Stack spacing={2}>
                  <TextField
                    label="Contraseña"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    required
                    autoFocus
                    disabled={loading}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading || !password}
                    sx={{
                      backgroundColor: "#1B7576",
                      "&:hover": {
                        backgroundColor: "#155a5b",
                      },
                    }}
                  >
                    {loading ? <CircularProgress size={24} /> : "Acceder"}
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3 }}>
      <Stack spacing={3} sx={{ maxWidth: 1200, mx: "auto" }}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h4">{contrato?.titulo}</Typography>
              <Divider />
              <Stack spacing={1}>
                <Typography>
                  <strong>Cliente:</strong> {contrato?.cliente_nombre}
                </Typography>
                <Typography>
                  <strong>Fecha de inicio:</strong> {contrato?.fecha_inicio}
                </Typography>
                <Typography>
                  <strong>Fecha de fin:</strong> {contrato?.fecha_fin}
                </Typography>
                {contrato?.descripcion && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Descripción:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {contrato.descripcion}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <DescriptionIcon color="primary" />
                <Typography variant="h6">Documentos del Contrato</Typography>
                {files.length > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    ({files.length} archivo{files.length !== 1 ? "s" : ""})
                  </Typography>
                )}
              </Stack>
              <Divider />
              {files.length === 0 ? (
                <Typography color="text.secondary">
                  No hay archivos asociados a este contrato
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {files.map((file) => (
                    <Paper
                      key={file.id}
                      sx={{
                        p: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        "&:hover": {
                          bgcolor: "action.hover",
                        },
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        sx={{ flex: 1 }}
                      >
                        <DescriptionIcon color="primary" />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1">
                            {file.nombre_archivo || `Archivo ${file.id}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(file.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Stack>
                      <Button
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewFile(file.id)}
                      >
                        Ver Documento
                      </Button>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
