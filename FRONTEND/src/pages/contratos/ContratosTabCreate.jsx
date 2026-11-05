import { useState, useEffect, useCallback } from "react";
import {
  Button,
  CardContent,
  Stack,
  TextField,
  Typography,
  Divider,
  MenuItem,
  Box,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import { api } from "../../lib/api";
import { toast } from "sonner";

export default function ContratosTabCreate({ onSuccess, onLoad }) {
  const [form, setForm] = useState({
    cliente_id: "",
    titulo: "",
    fecha_inicio: "",
    fecha_fin: "",
    descripcion: "",
  });
  const [clientes, setClientes] = useState([]);
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState("");

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

  const handleFiles = useCallback((fileList) => {
    const newFiles = Array.from(fileList).filter(validateFile);
    
    if (newFiles.length === 0) return;
    
    if (files.length + newFiles.length > 10) {
      toast.error("Máximo 10 archivos permitidos");
      return;
    }

    setFiles((prev) => [...prev, ...newFiles]);
  }, [files.length]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
  }, [handleFiles]);

  const removeFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

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
    setTimeout(() => {
      setPreviewUrl(null);
      setPreviewFileName("");
    }, 300);
  }, []);

  const onCreate = async () => {
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => formData.append(k, v ?? ""));
    
    // Agregar múltiples archivos
    files.forEach((file) => {
      formData.append("files", file);
    });

    await api.post("/contratos", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    toast.success("Contrato creado");
    setForm({
      cliente_id: "",
      titulo: "",
      fecha_inicio: "",
      fecha_fin: "",
      descripcion: "",
    });
    setFiles([]);
    onLoad();
    onSuccess(); // Cambiar a la pestaña de listar después de crear
  };

  return (
    <CardContent className="!p-6">
      <div className="py-2">
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Crear nuevo contrato
        </Typography>
        <Typography variant="body" color="text.secondary">
          Ingresa los datos del nuevo contrato para crearlo en el sistema.
        </Typography>
      </div>
      <Divider sx={{ mb: 3, mt: 2 }} />
      <Stack spacing={3}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <TextField
            select
            label="Cliente"
            value={form.cliente_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, cliente_id: e.target.value }))
            }
            sx={{ flex: 1, minWidth: 200 }}
            variant="outlined"
            fullWidth
          >
            <MenuItem value="">
              <em>Seleccione un cliente</em>
            </MenuItem>
            {clientes.map((cliente) => (
              <MenuItem key={cliente.id} value={cliente.id}>
                {cliente.nombre}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Título"
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            sx={{ flex: 1, minWidth: 200 }}
            variant="outlined"
            fullWidth
          />
        </Stack>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <TextField
            label="Fecha inicio"
            type="date"
            value={form.fecha_inicio}
            onChange={(e) =>
              setForm((f) => ({ ...f, fecha_inicio: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1, minWidth: 200 }}
            variant="outlined"
            fullWidth
          />
          <TextField
            label="Fecha fin"
            type="date"
            value={form.fecha_fin}
            onChange={(e) =>
              setForm((f) => ({ ...f, fecha_fin: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1, minWidth: 200 }}
            variant="outlined"
            fullWidth
          />
        </Stack>
        <TextField
          label="Descripción"
          multiline
          rows={3}
          value={form.descripcion}
          onChange={(e) =>
            setForm((f) => ({ ...f, descripcion: e.target.value }))
          }
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
              backgroundColor: isDragging ? "rgba(27, 117, 118, 0.05)" : "transparent",
              transition: "all 0.3s ease",
              cursor: "pointer",
              "&:hover": {
                borderColor: "#1B7576",
                backgroundColor: "rgba(27, 117, 118, 0.02)",
              },
            }}
            onClick={() => document.getElementById("file-input-tab").click()}
          >
            <input
              id="file-input-tab"
              type="file"
              accept=".pdf"
              multiple
              style={{ display: "none" }}
              onChange={handleFileInput}
              data-testid="input-contrato-archivo-tab"
            />
            <Stack spacing={2} alignItems="center">
              <CloudUploadIcon
                sx={{
                  fontSize: 48,
                  color: isDragging ? "#1B7576" : "text.secondary",
                }}
              />
              <Typography variant="body1" color="text.secondary" textAlign="center">
                {isDragging
                  ? "Suelta los archivos aquí"
                  : "Arrastra y suelta archivos PDF aquí, o haz clic para seleccionar"}
              </Typography>
              <Typography variant="caption" color="text.secondary" textAlign="center">
                Arrastra y suelta o selecciona múltiples archivos PDF (máximo 10, 10MB cada uno)
              </Typography>
            </Stack>
          </Paper>
          {files.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Archivos seleccionados ({files.length}/10):
              </Typography>
              <Stack spacing={1}>
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
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                      <DescriptionIcon color="primary" sx={{ fontSize: 20 }} />
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
                      <Chip
                        label="Nuevo"
                        size="small"
                        color="primary"
                        sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          previewNewFile(file);
                        }}
                        color="primary"
                        title="Previsualizar"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        color="error"
                        title="Eliminar"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
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
            <Stack direction="row" justifyContent="space-between" alignItems="center">
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
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={onCreate}
            startIcon={<DescriptionIcon />}
            sx={{
              minWidth: 150,
              backgroundColor: "#1B7576",
              "&:hover": {
                backgroundColor: "#155a5b",
              },
            }}
          >
            Crear Contrato
          </Button>
        </Stack>
      </Stack>
    </CardContent>
  );
}
