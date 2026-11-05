import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import {
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
  Divider,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputAdornment,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "sonner";

export default function ContratoDetalle() {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4451";

  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [shareInfo, setShareInfo] = useState(null);
  const navigate = useNavigate();
  const { role } = useAuth();

  const load = async () => {
    try {
      const { data } = await api.get(`/contratos/${id}`);
      setItem(data);
    } catch {
      toast.error("Error al cargar contrato");
    }
  };

  const loadFiles = async () => {
    try {
      const { data } = await api.get(`/contratos/${id}/files`);
      setFiles(data || []);
    } catch {
      // Si no hay archivos, no es un error crítico
      setFiles([]);
    }
  };

  const loadShareInfo = async () => {
    try {
      const { data } = await api.get(`/contratos/${id}/share`);
      setShareInfo(data);
      if (data.shareUrl) {
        setShareUrl(data.shareUrl);
      }
    } catch {
      // Si no hay información de compartir, no es un error crítico
      setShareInfo(null);
    }
  };

  useEffect(() => {
    load();
    loadFiles();
    loadShareInfo();
  }, [id]); // eslint-disable-line

  const onDelete = async () => {
    if (role !== "administrador") return;
    if (!window.confirm("¿Estás seguro de eliminar este contrato?")) return;
    try {
      await api.delete(`/contratos/${id}`);
      toast.success("Contrato eliminado");
      navigate("/contratos");
    } catch {
      toast.error("Error al eliminar contrato");
    }
  };

  const onDeleteFile = async (fileId, fileName) => {
    if (role !== "administrador") return;
    if (
      !window.confirm(
        `¿Estás seguro de eliminar el archivo "${fileName || "este archivo"}"?`
      )
    )
      return;
    try {
      setLoading(true);
      await api.delete(`/contratos/${id}/file/${fileId}`);
      toast.success("Archivo eliminado");
      loadFiles();
    } catch {
      toast.error("Error al eliminar archivo");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (role !== "administrador") {
      toast.error("No tienes permisos para compartir contratos");
      return;
    }
    if (!sharePassword || sharePassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.post(`/contratos/${id}/share`, {
        password: sharePassword,
      });
      setShareUrl(data.shareUrl);
      setShareInfo({ shareEnabled: true, shareUrl: data.shareUrl });
      toast.success("Enlace compartido generado exitosamente");
    } catch (error) {
      toast.error(
        error.response?.data?.glosa || "Error al generar enlace compartido"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDisableShare = async () => {
    if (role !== "administrador") {
      toast.error("No tienes permisos para desactivar enlaces compartidos");
      return;
    }
    if (!window.confirm("¿Estás seguro de desactivar el enlace compartido?"))
      return;
    try {
      setLoading(true);
      await api.delete(`/contratos/${id}/share`);
      setShareUrl("");
      setShareInfo({ shareEnabled: false, shareUrl: null });
      toast.success("Enlace compartido desactivado");
    } catch {
      toast.error("Error al desactivar enlace compartido");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Enlace copiado al portapapeles");
  };

  if (!item) return null;
  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">{item.titulo}</Typography>
            <Typography>Cliente: {item.cliente_id}</Typography>
            <Typography>Inicio: {item.fecha_inicio}</Typography>
            <Typography>Fin: {item.fecha_fin}</Typography>
            {item.descripcion && (
              <Typography>Descripción: {item.descripcion}</Typography>
            )}
            <Stack direction="row" spacing={2}>
              {role === "administrador" && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<ShareIcon />}
                    onClick={() => setShareDialogOpen(true)}
                  >
                    {shareInfo?.shareEnabled
                      ? "Gestionar Compartir"
                      : "Compartir Contrato"}
                  </Button>
                  <Button color="error" variant="contained" onClick={onDelete}>
                    Eliminar Contrato
                  </Button>
                </>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <div className="flex items-center gap-2">
              <DescriptionIcon className="text-primary" />
              <Typography variant="h6">Archivos del Contrato</Typography>
              {files.length > 0 && (
                <Chip
                  label={`${files.length} archivo${
                    files.length !== 1 ? "s" : ""
                  }`}
                  size="small"
                />
              )}
            </div>
            <Divider />
            {files.length === 0 ? (
              <Typography color="text.secondary">
                No hay archivos asociados a este contrato
              </Typography>
            ) : (
              <Stack spacing={1}>
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <DescriptionIcon color="primary" />
                      <Typography variant="body1" sx={{ flex: 1 }}>
                        {file.nombre_archivo || `Archivo ${file.id}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(file.created_at).toLocaleDateString()}
                      </Typography>
                    </div>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        href={`${apiUrl}/contratos/${id}/file/${file.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver
                      </Button>
                      {role === "administrador" && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() =>
                            onDeleteFile(file.id, file.nombre_archivo)
                          }
                          disabled={loading}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Stack>
                  </div>
                ))}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Dialog para compartir */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {shareInfo?.shareEnabled
            ? "Gestionar Enlace Compartido"
            : "Compartir Contrato"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {!shareInfo?.shareEnabled ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  Genera un enlace seguro con contraseña para compartir este
                  contrato y sus documentos. Cualquier persona con el enlace y
                  la contraseña podrá ver el contrato sin necesidad de iniciar
                  sesión.
                </Typography>
                <TextField
                  label="Contraseña para compartir"
                  type="password"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  fullWidth
                  required
                  helperText="Mínimo 8 caracteres. Comparte esta contraseña junto con el enlace."
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          edge="end"
                        >
                          <VisibilityOffIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">
                  El contrato ya está compartido. Puedes copiar el enlace o
                  desactivarlo.
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "grey.100",
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mb: 1 }}
                  >
                    Enlace compartido:
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        wordBreak: "break-all",
                        fontFamily: "monospace",
                        fontSize: "0.875rem",
                      }}
                    >
                      {shareUrl}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={handleCopyLink}
                      color="primary"
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
                <Box className="bg-orange-100 p-5 rounded-md">
                  <Typography variant="body2" className="text-orange-800">
                    <WarningIcon className="text-orange-800" /> Recuerda
                    compartir la contraseña junto con el enlace. Sin la
                    contraseña, no se podrá acceder al contrato.
                  </Typography>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Cancelar</Button>
          {shareInfo?.shareEnabled ? (
            <Button
              onClick={handleDisableShare}
              color="error"
              variant="outlined"
              disabled={loading}
            >
              Desactivar Enlace
            </Button>
          ) : (
            <Button
              onClick={handleShare}
              variant="contained"
              disabled={loading || !sharePassword || sharePassword.length < 8}
            >
              Generar Enlace
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
