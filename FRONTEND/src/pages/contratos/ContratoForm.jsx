import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
  Divider,
  MenuItem,
  Box,
  Paper,
  IconButton,
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import EditIcon from "@mui/icons-material/Edit";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import InputAdornment from "@mui/material/InputAdornment";
import WarningIcon from "@mui/icons-material/Warning";
import { api } from "../../lib/api";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useFormik } from "formik";
import { contratoSchema } from "../../validations/contracts";
import { useAuth } from "../../hooks/useAuth";

export default function ContratoForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [files, setFiles] = useState([]); // Archivos nuevos a subir
  const [existingFiles, setExistingFiles] = useState([]); // Archivos existentes del servidor
  const [filesToDelete, setFilesToDelete] = useState([]); // IDs de archivos a eliminar
  const [isDragging, setIsDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [shareInfo, setShareInfo] = useState(null);

  const formik = useFormik({
    initialValues: {
      cliente_id: "",
      titulo: "",
      fecha_inicio: "",
      fecha_fin: "",
      descripcion: "",
    },
    validationSchema: contratoSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const formData = new FormData();
        Object.entries(values).forEach(([k, v]) => formData.append(k, v ?? ""));

        // Agregar múltiples archivos nuevos
        files.forEach((file) => {
          formData.append("files", file);
        });

        if (isEdit) {
          // Eliminar archivos del servidor primero si hay alguno marcado para eliminar
          if (filesToDelete.length > 0) {
            await Promise.all(
              filesToDelete.map((fileId) =>
                api.delete(`/contratos/${id}/file/${fileId}`)
              )
            );
          }

          // Actualizar el contrato con los nuevos archivos
          await api.put(`/contratos/${id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          toast.success("Contrato actualizado");
        } else {
          await api.post("/contratos", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          toast.success("Contrato creado");
        }
        navigate("/contratos");
      } catch {
        // El error ya se maneja en el interceptor
      } finally {
        setLoading(false);
      }
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/clientes");
        setClientes(data || []);
      } catch {
        toast.error("Error al cargar clientes");
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await api.get(`/contratos/${id}`);

        // Formatear fechas para input type="date" (YYYY-MM-DD)
        const formatDateForInput = (dateString) => {
          if (!dateString) return "";
          // Si viene con hora (ISO), usar solo la parte de la fecha para evitar el desfase de zona horaria
          if (
            typeof dateString === "string" &&
            /^\d{4}-\d{2}-\d{2}/.test(dateString)
          ) {
            return dateString.slice(0, 10);
          }
          // Si viene como objeto Date u otro formato, convertirlo
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return "";
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        };

        const formData = {
          cliente_id: data.cliente_id ? String(data.cliente_id) : "",
          titulo: data.titulo || "",
          fecha_inicio: formatDateForInput(data.fecha_inicio),
          fecha_fin: formatDateForInput(data.fecha_fin),
          descripcion: data.descripcion || "",
        };
        formik.setValues(formData);

        // Cargar archivos existentes
        try {
          const { data: filesData } = await api.get(`/contratos/${id}/files`);
          setExistingFiles(filesData || []);
        } catch {
          // Si no hay archivos, no es un error crítico
          setExistingFiles([]);
        }

        // Cargar información de compartir
        try {
          const { data: shareData } = await api.get(`/contratos/${id}/share`);
          setShareInfo(shareData);
          if (shareData.shareUrl) {
            setShareUrl(shareData.shareUrl);
          }
        } catch {
          // Si no hay información de compartir, no es un error crítico
          setShareInfo(null);
        }
      } catch {
        toast.error("Error al cargar contrato");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const validateFile = (file) => {
    if (file.type !== "application/pdf") {
      toast.error(`El archivo ${file.name} no es un PDF válido`);
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`El archivo ${file.name} excede el tamaño máximo de 10MB`);
      return false;
    }
    return true;
  };

  const handleFiles = useCallback(
    (fileList) => {
      const newFiles = Array.from(fileList).filter(validateFile);

      if (newFiles.length === 0) return;

      // En modo creación, solo contamos los archivos nuevos
      // En modo edición, contamos archivos existentes + nuevos - eliminados
      const totalFiles = isEdit
        ? files.length + existingFiles.length - filesToDelete.length
        : files.length;

      if (totalFiles + newFiles.length > 10) {
        toast.error("Máximo 10 archivos permitidos");
        return;
      }

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [files.length, existingFiles.length, filesToDelete.length, isEdit]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        handleFiles(droppedFiles);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        handleFiles(selectedFiles);
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeExistingFile = useCallback((fileId) => {
    setFilesToDelete((prev) => [...prev, fileId]);
    setExistingFiles((prev) => prev.filter((file) => file.id !== fileId));
  }, []);

  const previewExistingFile = useCallback(
    async (fileId, fileName) => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4451";
        const url = `${apiUrl}/contratos/${id}/file/${fileId}`;
        setPreviewUrl(url);
        setPreviewFileName(fileName || `Archivo ${fileId}`);
        setPreviewOpen(true);
      } catch {
        toast.error("Error al cargar el archivo para previsualización");
      }
    },
    [id]
  );

  const previewNewFile = useCallback((file) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
        setPreviewFileName(file.name);
        setPreviewOpen(true);
      };
      reader.onerror = () => {
        toast.error("Error al leer el archivo");
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Error al previsualizar el archivo");
    }
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
    // Limpiar la URL después de un pequeño delay para liberar memoria
    setTimeout(() => {
      setPreviewUrl(null);
      setPreviewFileName("");
    }, 300);
  }, []);

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

  const visibleExistingFiles = existingFiles.filter(
    (file) => !filesToDelete.includes(file.id)
  );

  const totalFilesCount = files.length + visibleExistingFiles.length;

  return (
    <Stack spacing={3}>
      {isEdit && (
        <div className="flex flex-row gap-4">
          <DescriptionIcon className="text-primary" sx={{ fontSize: 40 }} />
          <div className="flex flex-col pt-1">
            <Typography variant="h5" color="primary">
              Editar Contrato
            </Typography>
            <Typography variant="body" className="!pt-1 !mt-0 text-gray-800">
              Actualiza la información del contrato en el sistema. Puedes
              modificar todos los datos del contrato según tus permisos.
            </Typography>
          </div>
        </div>
      )}

      <Card sx={{ boxShadow: "0 2px 0px rgba(0,0,0,0.1)" }}>
        <CardContent className="!p-6">
          <div className="flex flex-row justify-between items-center w-full">
            <div className="py-2">
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {isEdit ? "Editar contrato" : "Crear nuevo contrato"}
              </Typography>
              <Typography variant="body" color="text.secondary">
                {isEdit
                  ? "Actualiza los datos del contrato en el sistema."
                  : "Ingresa los datos del nuevo contrato para crearlo en el sistema."}
              </Typography>
            </div>

            {isEdit && role === "administrador" && (
              <div>
                <Button
                  variant="outlined"
                  startIcon={<ShareIcon />}
                  onClick={() => setShareDialogOpen(true)}
                  sx={{
                    borderColor: "primary.main",
                    "&:hover": {
                      borderColor: "primary.dark",
                    },
                  }}
                >
                  {shareInfo?.shareEnabled
                    ? "Gestionar Compartir"
                    : "Compartir Contrato"}
                </Button>
              </div>
            )}
          </div>

          <Divider sx={{ mb: 3, mt: 2 }} />
          <Stack spacing={3}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <TextField
                select
                label="Cliente"
                name="cliente_id"
                value={formik.values.cliente_id}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.cliente_id && Boolean(formik.errors.cliente_id)
                }
                helperText={
                  formik.touched.cliente_id && formik.errors.cliente_id
                }
                inputProps={{ "data-testid": "select-contrato-cliente" }}
                sx={{ flex: 1, minWidth: 200 }}
                variant="outlined"
                fullWidth
                required
              >
                <MenuItem value="">
                  <em>Seleccione un cliente</em>
                </MenuItem>
                {clientes.map((cliente) => (
                  <MenuItem key={cliente.id} value={String(cliente.id)}>
                    {cliente.nombre}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Título"
                name="titulo"
                value={formik.values.titulo}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.titulo && Boolean(formik.errors.titulo)}
                helperText={formik.touched.titulo && formik.errors.titulo}
                inputProps={{ "data-testid": "input-contrato-titulo" }}
                sx={{ flex: 1, minWidth: 200 }}
                variant="outlined"
                fullWidth
                required
              />
            </Stack>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <TextField
                label="Fecha inicio"
                name="fecha_inicio"
                type="date"
                value={formik.values.fecha_inicio}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.fecha_inicio &&
                  Boolean(formik.errors.fecha_inicio)
                }
                helperText={
                  formik.touched.fecha_inicio && formik.errors.fecha_inicio
                }
                InputLabelProps={{ shrink: true }}
                inputProps={{ "data-testid": "input-contrato-fecha-inicio" }}
                sx={{ flex: 1, minWidth: 200 }}
                variant="outlined"
                fullWidth
                required
              />
              <TextField
                label="Fecha fin"
                name="fecha_fin"
                type="date"
                value={formik.values.fecha_fin}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.fecha_fin && Boolean(formik.errors.fecha_fin)
                }
                helperText={formik.touched.fecha_fin && formik.errors.fecha_fin}
                InputLabelProps={{ shrink: true }}
                inputProps={{ "data-testid": "input-contrato-fecha-fin" }}
                sx={{ flex: 1, minWidth: 200 }}
                variant="outlined"
                fullWidth
                required
              />
            </Stack>
            <TextField
              label="Descripción"
              name="descripcion"
              multiline
              rows={3}
              value={formik.values.descripcion}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={
                formik.touched.descripcion && Boolean(formik.errors.descripcion)
              }
              helperText={
                formik.touched.descripcion && formik.errors.descripcion
              }
              inputProps={{ "data-testid": "input-contrato-descripcion" }}
              variant="outlined"
              fullWidth
            />
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Archivos del contrato
              </Typography>
              <Paper
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                sx={{
                  p: 3,
                  border: `2px dashed ${isDragging ? "#1B7576" : "#e0e0e0"}`,
                  borderRadius: 2,
                  backgroundColor: isDragging
                    ? "rgba(27, 117, 118, 0.05)"
                    : "transparent",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  "&:hover": {
                    borderColor: "#1B7576",
                    backgroundColor: "rgba(27, 117, 118, 0.02)",
                  },
                }}
                onClick={() => document.getElementById("file-input").click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFileInput}
                  data-testid="input-contrato-archivo"
                />
                <Stack spacing={2} alignItems="center">
                  <CloudUploadIcon
                    sx={{
                      fontSize: 48,
                      color: isDragging ? "#1B7576" : "text.secondary",
                    }}
                  />
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    textAlign="center"
                  >
                    {isDragging
                      ? "Suelta los archivos aquí"
                      : "Arrastra y suelta archivos PDF aquí, o haz clic para seleccionar"}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    textAlign="center"
                  >
                    {isEdit
                      ? "Puedes agregar múltiples archivos PDF (máximo 10, 10MB cada uno)"
                      : "Arrastra y suelta o selecciona múltiples archivos PDF (máximo 10, 10MB cada uno)"}
                  </Typography>
                </Stack>
              </Paper>
              {(visibleExistingFiles.length > 0 || files.length > 0) && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Archivos ({totalFilesCount}/10):
                  </Typography>
                  <Stack spacing={1}>
                    {/* Archivos existentes */}
                    {visibleExistingFiles.map((file) => (
                      <Paper
                        key={file.id}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: "#dcedc8",
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={2}
                          alignItems="center"
                          sx={{ flex: 1, minWidth: 0 }}
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircleIcon
                              color="success"
                              sx={{ fontSize: 20 }}
                            />
                            <Typography
                              variant="body2"
                              sx={{
                                flex: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {file.nombre_archivo || `Archivo ${file.id}`}
                            </Typography>
                          </div>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label="Existente"
                            size="medium"
                            color="success"
                            sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 1 }}
                          >
                            {new Date(file.created_at).toLocaleDateString()}
                          </Typography>
                          <IconButton
                            size="medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              previewExistingFile(file.id, file.nombre_archivo);
                            }}
                            color="primary"
                            title="Previsualizar"
                          >
                            <VisibilityIcon fontSize="medium" />
                          </IconButton>
                          {role === "administrador" && (
                            <IconButton
                              size="medium"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeExistingFile(file.id);
                              }}
                              color="error"
                              title="Eliminar"
                            >
                              <DeleteIcon fontSize="medium" />
                            </IconButton>
                          )}
                        </Stack>
                      </Paper>
                    ))}
                    {/* Archivos nuevos */}
                    {files.map((file, index) => (
                      <Paper
                        key={`new-${index}`}
                        sx={{
                          p: 1.5,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: "grey.50",
                          "&:hover": {
                            backgroundColor: "grey.100",
                          },
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ flex: 1, minWidth: 0 }}
                        >
                          <DescriptionIcon
                            color="primary"
                            sx={{ fontSize: 20 }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {file.name}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label="Nuevo"
                            size="medium"
                            color="primary"
                            sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 1 }}
                          >
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                          <IconButton
                            size="medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              previewNewFile(file);
                            }}
                            color="primary"
                            title="Previsualizar"
                          >
                            <VisibilityIcon fontSize="medium" />
                          </IconButton>
                          {role === "administrador" && (
                            <IconButton
                              size="medium"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(index);
                              }}
                              color="error"
                              title="Eliminar"
                            >
                              <DeleteIcon fontSize="medium" />
                            </IconButton>
                          )}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>

            {/* Modal de previsualización */}
            <Dialog
              open={previewOpen}
              onClose={handleClosePreview}
              maxWidth="lg"
              fullWidth
              PaperProps={{
                sx: {
                  height: "90vh",
                  maxHeight: "90vh",
                },
              }}
            >
              <DialogTitle>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="h6">{previewFileName}</Typography>
                  <IconButton onClick={handleClosePreview} size="small">
                    <CloseIcon />
                  </IconButton>
                </Stack>
              </DialogTitle>
              <DialogContent dividers sx={{ p: 0, height: "100%" }}>
                {previewUrl && (
                  <iframe
                    src={previewUrl}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      minHeight: "70vh",
                    }}
                    title="Vista previa del PDF"
                  />
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={handleClosePreview} variant="contained">
                  Cerrar
                </Button>
              </DialogActions>
            </Dialog>
            <Stack
              direction="row"
              spacing={2}
              justifyContent="space-between"
              alignItems="center"
            >
              <Stack
                direction="row"
                spacing={2}
                justifyContent="flex-end"
                sx={{ flex: 1 }}
              >
                <Button
                  variant="outlined"
                  data-testid="button-contrato-cancelar"
                  onClick={() => navigate("/contratos")}
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
                  data-testid="button-contrato-guardar"
                  onClick={formik.handleSubmit}
                  disabled={loading || formik.isSubmitting}
                  startIcon={isEdit ? <EditIcon /> : <DescriptionIcon />}
                  sx={{
                    minWidth: 150,
                    backgroundColor: "#1B7576",
                    "&:hover": {
                      backgroundColor: "#155a5b",
                    },
                  }}
                >
                  {isEdit ? "Actualizar Contrato" : "Crear Contrato"}
                </Button>
              </Stack>
            </Stack>

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
                        Genera un enlace seguro con contraseña para compartir
                        este contrato y sus documentos. Cualquier persona con el
                        enlace y la contraseña podrá ver el contrato sin
                        necesidad de iniciar sesión.
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
                        El contrato ya está compartido. Puedes copiar el enlace
                        o desactivarlo.
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
                <Button onClick={() => setShareDialogOpen(false)}>
                  Cancelar
                </Button>
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
                    disabled={
                      loading || !sharePassword || sharePassword.length < 8
                    }
                  >
                    Generar Enlace
                  </Button>
                )}
              </DialogActions>
            </Dialog>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
