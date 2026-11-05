import { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Autocomplete,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import BusinessIcon from "@mui/icons-material/Business";
import { api } from "../../lib/api";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useFormik } from "formik";
import { clienteSchema } from "../../validations/clients";
import { cargosRepresentante, regionesDeChile, bancosChile, giros } from "../../lib/utils";
import { formatRut, RutFormat } from "@fdograph/rut-utilities";

export default function ClienteForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const formik = useFormik({
    initialValues: {
      // Información del cliente
      es_empresa: false,
      rut: "",
      nombre: "",
      nombre_fantasia: "",
      giro_actividad_economica: "",
      // Información del representante
      nombre_representante: "",
      cargo_representante: "",
      correo_representante: "",
      telefono_representante: "",
      relacion_representante: "",
      // Información de contacto
      direccion_calle: "",
      direccion_numero: "",
      direccion_ciudad: "",
      direccion_region: "",
      sitio_web: "",
      telefono_corporativo: "",
      correo: "",
      telefono: "",
      direccion: "",
      // Información financiera
      metodo_pago: "",
      dia_pago: "",
      moneda: "",
      nombre_banco: "",
      numero_cuenta: "",
      titular_cuenta: "",
    },
    validationSchema: clienteSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      console.log(values);
      setLoading(true);
      try {
        if (isEdit) {
          await api.put(`/clientes/${id}`, values);
          toast.success("Cliente actualizado");
        } else {
          await api.post("/clientes", values);
          toast.success("Cliente creado");
        }
        navigate("/clientes");
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    },
  });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await api.get(`/clientes/${id}`);
        const formData = {
          // Información del cliente
          es_empresa: data.es_empresa || false,
          rut: data.rut ? formatRut(data.rut, RutFormat.DOTS_DASH) : "",
          nombre: data.nombre || "",
          nombre_fantasia: data.nombre_fantasia || "",
          giro_actividad_economica: data.giro_actividad_economica || "",
          // Información del representante
          nombre_representante: data.nombre_representante || "",
          cargo_representante: data.cargo_representante || "",
          correo_representante: data.correo_representante || "",
          telefono_representante: data.telefono_representante || "",
          relacion_representante: data.relacion_representante || "",
          // Información de contacto
          direccion_calle: data.direccion_calle || "",
          direccion_numero: data.direccion_numero || "",
          direccion_ciudad: data.direccion_ciudad || "",
          direccion_region: data.direccion_region || "",
          sitio_web: data.sitio_web || "",
          telefono_corporativo: data.telefono_corporativo || "",
          correo: data.correo || "",
          telefono: data.telefono || "",
          direccion: data.direccion || "",
          // Información financiera
          metodo_pago: data.metodo_pago || "",
          dia_pago: data.dia_pago || "",
          moneda: data.moneda || "",
          nombre_banco: data.nombre_banco || "",
          numero_cuenta: data.numero_cuenta || "",
          titular_cuenta: data.titular_cuenta || "",
        };
        formik.setValues(formData);
      } catch {
        toast.error("Error al cargar cliente");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);  

  return (
    <Stack spacing={3}>
      {isEdit && (
        <div className="flex flex-row gap-4">
          <BusinessIcon className="text-primary" sx={{ fontSize: 40 }} />
          <div className="flex flex-col pt-1">
            <Typography variant="h5" color="primary">
              Editar Cliente
            </Typography>
            <Typography variant="body" className="!pt-1 !mt-0 text-gray-800">
              Actualiza la información del cliente en el sistema. Puedes
              modificar todos los datos del cliente según tus permisos.
            </Typography>
          </div>
        </div>
      )}

      <Card sx={{ boxShadow: "0 2px 0px rgba(0,0,0,0.1)" }}>
        <CardContent className="!p-6">
          <div className="py-2">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {isEdit ? "Editar cliente" : "Crear nuevo cliente"}
            </Typography>
            <Typography variant="body" color="text.secondary">
              {isEdit
                ? "Actualiza los datos del cliente en el sistema."
                : "Ingresa los datos del nuevo cliente para crearlo en el sistema."}
            </Typography>
          </div>
          <Divider sx={{ mb: 3, mt: 2 }} />
          <Stack spacing={4}>
            {/* 1. Información del cliente */}
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                1. Información del cliente
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Tipo de cliente</InputLabel>
                  <Select
                    value={formik.values.es_empresa ? "empresa" : "persona"}
                    label="Tipo de cliente"
                    inputProps={{ "data-testid": "select-cliente-tipo" }}
                    onChange={(e) =>
                      formik.setFieldValue("es_empresa", e.target.value === "empresa")
                    }
                  >
                    <MenuItem value="persona">Persona</MenuItem>
                    <MenuItem value="empresa">Empresa</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  id="rut-cliente-form"
                  label="RUT"
                  name="rut"
                  value={formik.values.rut}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/[^0-9kK-]/g, "");
                    const formatted = formatRut(rawValue, RutFormat.DOTS_DASH);
                    formik.setFieldValue("rut", formatted);
                  }}
                  onBlur={formik.handleBlur}
                  error={formik.touched.rut && Boolean(formik.errors.rut)}
                  helperText={formik.touched.rut && formik.errors.rut}
                  inputProps={{ "data-testid": "input-cliente-rut" }}
                  sx={{ flex: 1, minWidth: 200 }}
                  variant="outlined"
                  required
                />
                <TextField
                  id="nombre-cliente-form"
                  label="Nombre completo"
                  name="nombre"
                  value={formik.values.nombre}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.nombre && Boolean(formik.errors.nombre)}
                  helperText={formik.touched.nombre && formik.errors.nombre}
                  inputProps={{ "data-testid": "input-cliente-nombre" }}
                  sx={{ flex: 1, minWidth: 200 }}
                  variant="outlined"
                  fullWidth
                  required
                />
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <TextField
                  id="nombre-fantasia-cliente-form"
                  label="Nombre de fantasía"
                  name="nombre_fantasia"
                  value={formik.values.nombre_fantasia}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.nombre_fantasia && Boolean(formik.errors.nombre_fantasia)}
                  helperText={formik.touched.nombre_fantasia && formik.errors.nombre_fantasia}
                  inputProps={{ "data-testid": "input-cliente-nombre-fantasia" }}
                  sx={{ flex: 1, minWidth: 200 }}
                  variant="outlined"
                  fullWidth
                  required
                />
                <Autocomplete
                  id="giro-cliente-form"
                  options={giros}
                  value={formik.values.giro_actividad_economica || null}
                  onChange={(event, newValue) => {
                    formik.setFieldValue("giro_actividad_economica", newValue || "");
                  }}
                  onBlur={formik.handleBlur}
                  sx={{ flex: 1, minWidth: 200 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      name="giro_actividad_economica"
                      label="Giro o actividad económica"
                      error={formik.touched.giro_actividad_economica && Boolean(formik.errors.giro_actividad_economica)}
                      helperText={formik.touched.giro_actividad_economica && formik.errors.giro_actividad_economica}
                      inputProps={{ ...params.inputProps, "data-testid": "autocomplete-cliente-giro" }}
                      required
                    />
                  )}
                />
              </Stack>
            </Stack>

            <Divider />

            {/* 2. Información del representante del cliente */}
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                2. Información del representante del cliente
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <TextField
                  id="nombre-representante-cliente-form"
                  label="Nombre del representante"
                  name="nombre_representante"
                  value={formik.values.nombre_representante}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.nombre_representante && Boolean(formik.errors.nombre_representante)}
                  helperText={formik.touched.nombre_representante && formik.errors.nombre_representante}
                  inputProps={{ "data-testid": "input-cliente-nombre-representante" }}
                  sx={{ flex: 1, minWidth: 200 }}
                  variant="outlined"
                  fullWidth
                  required
                />
                <Autocomplete
                  id="cargo-representante-cliente-form"
                  options={cargosRepresentante}
                  value={formik.values.cargo_representante || null}
                  onChange={(event, newValue) => {
                    formik.setFieldValue("cargo_representante", newValue || "");
                  }}
                  onBlur={formik.handleBlur}
                  sx={{ flex: 1, minWidth: 200 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      name="cargo_representante"
                      label="Cargo del representante"
                      error={formik.touched.cargo_representante && Boolean(formik.errors.cargo_representante)}
                      helperText={formik.touched.cargo_representante && formik.errors.cargo_representante}
                      inputProps={{ ...params.inputProps, "data-testid": "autocomplete-cliente-cargo-representante" }}
                      required
                    />
                  )}
                />
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <TextField
                  id="correo-representante-cliente-form"
                  label="Correo del representante"
                  name="correo_representante"
                  type="email"
                  value={formik.values.correo_representante}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.correo_representante && Boolean(formik.errors.correo_representante)}
                  helperText={formik.touched.correo_representante && formik.errors.correo_representante}
                  inputProps={{ "data-testid": "input-cliente-correo-representante" }}
                  sx={{ flex: 1, minWidth: 200 }}
                  variant="outlined"
                  fullWidth
                  required
                />
                <TextField
                  id="telefono-representante-cliente-form"
                  label="Teléfono del representante"
                  name="telefono_representante"
                  value={formik.values.telefono_representante}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.telefono_representante && Boolean(formik.errors.telefono_representante)}
                  helperText={formik.touched.telefono_representante && formik.errors.telefono_representante}
                  inputProps={{ "data-testid": "input-cliente-telefono-representante" }}
                  sx={{ flex: 1, minWidth: 200 }}
                  variant="outlined"
                  fullWidth
                  required
                />
              </Stack>
              <TextField
                id="relacion-representante-cliente-form"
                label="Relación"
                name="relacion_representante"
                value={formik.values.relacion_representante}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.relacion_representante && Boolean(formik.errors.relacion_representante)}
                helperText={formik.touched.relacion_representante && formik.errors.relacion_representante}
                inputProps={{ "data-testid": "input-cliente-relacion-representante" }}
                variant="outlined"
                fullWidth
                required
              />
            </Stack>

            <Divider />

            {/* 3. Información de contacto */}
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                3. Información de contacto
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <TextField
                  id="direccion-calle-cliente-form"
                  label="Calle"
                  name="direccion_calle"
                  value={formik.values.direccion_calle}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.direccion_calle && Boolean(formik.errors.direccion_calle)}
                  helperText={formik.touched.direccion_calle && formik.errors.direccion_calle}
                  inputProps={{ "data-testid": "input-cliente-direccion-calle" }}
                  sx={{ flex: 1, minWidth: 200 }}
                  variant="outlined"
                  fullWidth
                  required
                />
                <TextField
                  id="direccion-numero-cliente-form"
                  label="Número"
                  name="direccion_numero"
                  value={formik.values.direccion_numero}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.direccion_numero && Boolean(formik.errors.direccion_numero)}
                  helperText={formik.touched.direccion_numero && formik.errors.direccion_numero}
                  inputProps={{ "data-testid": "input-cliente-direccion-numero" }}
                  sx={{ minWidth: 120 }}
                  variant="outlined"
                  required
                />
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <TextField
                  id="direccion-ciudad-cliente-form"
                  label="Ciudad"
                  name="direccion_ciudad"
                  value={formik.values.direccion_ciudad}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.direccion_ciudad && Boolean(formik.errors.direccion_ciudad)}
                  helperText={formik.touched.direccion_ciudad && formik.errors.direccion_ciudad}
                  inputProps={{ "data-testid": "input-cliente-direccion-ciudad" }}
                  sx={{ flex: 1, minWidth: 200 }}
                  variant="outlined"
                  fullWidth
                  required
                />
                <Autocomplete
                  id="direccion-region-cliente-form"
                  options={regionesDeChile}
                  value={formik.values.direccion_region || null}
                  onChange={(event, newValue) => {
                    formik.setFieldValue("direccion_region", newValue || "");
                  }}
                  onBlur={formik.handleBlur}
                  sx={{ flex: 1, minWidth: 200 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      name="direccion_region"
                      label="Región"
                      error={formik.touched.direccion_region && Boolean(formik.errors.direccion_region)}
                      helperText={formik.touched.direccion_region && formik.errors.direccion_region}
                      inputProps={{ ...params.inputProps, "data-testid": "autocomplete-cliente-direccion-region" }}
                      required
                    />
                  )}
                />
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <TextField
                  id="sitio-web-cliente-form"
                  label="Sitio web"
                  name="sitio_web"
                  type="url"
                  value={formik.values.sitio_web}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.sitio_web && Boolean(formik.errors.sitio_web)}
                  helperText={formik.touched.sitio_web && formik.errors.sitio_web}
                  inputProps={{ "data-testid": "input-cliente-sitio-web" }}
                  sx={{ flex: 1, minWidth: 200 }}
                  variant="outlined"
                  fullWidth
                  required
                />
                <TextField
                  id="telefono-corporativo-cliente-form"
                  label="Teléfono corporativo"
                  name="telefono_corporativo"
                  value={formik.values.telefono_corporativo}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.telefono_corporativo && Boolean(formik.errors.telefono_corporativo)}
                  helperText={formik.touched.telefono_corporativo && formik.errors.telefono_corporativo}
                  inputProps={{ "data-testid": "input-cliente-telefono-corporativo" }}
                  sx={{ flex: 1, minWidth: 200 }}
                  variant="outlined"
                  fullWidth
                  required
                />
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <TextField
                  id="correo-cliente-form"
                  label="Correo"
                  name="correo"
                  type="email"
                  value={formik.values.correo}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.correo && Boolean(formik.errors.correo)}
                  helperText={formik.touched.correo && formik.errors.correo}
                  inputProps={{ "data-testid": "input-cliente-correo" }}
                  sx={{ flex: 1, minWidth: 200 }}
                  variant="outlined"
                  fullWidth
                  required
                />
                <TextField
                  id="telefono-cliente-form"
                  label="Teléfono"
                  name="telefono"
                  value={formik.values.telefono}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.telefono && Boolean(formik.errors.telefono)}
                  helperText={formik.touched.telefono && formik.errors.telefono}
                  inputProps={{ "data-testid": "input-cliente-telefono" }}
                  sx={{ flex: 1, minWidth: 200 }}
                  variant="outlined"
                  fullWidth
                  required
                />
              </Stack>
            </Stack>

            <Divider />

            {/* 4. Información financiera */}
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                4. Información financiera
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <FormControl sx={{ flex: 1, minWidth: 200 }}>
                  <InputLabel>Método de pago</InputLabel>
                  <Select
                    value={formik.values.metodo_pago || ""}
                    label="Método de pago"
                    inputProps={{ "data-testid": "select-cliente-metodo-pago" }}
                    onChange={(e) =>
                      formik.setFieldValue("metodo_pago", e.target.value)
                    }
                    onBlur={formik.handleBlur}
                    error={formik.touched.metodo_pago && Boolean(formik.errors.metodo_pago)}
                  >
                    <MenuItem value="">Seleccionar</MenuItem>
                    <MenuItem value="transferencia">Transferencia</MenuItem>
                    <MenuItem value="cheque">Cheque</MenuItem>
                    <MenuItem value="efectivo">Efectivo</MenuItem>
                    <MenuItem value="tarjeta">Tarjeta</MenuItem>
                    <MenuItem value="otro">Otro</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  id="dia-pago-cliente-form"
                  label="Día de pago"
                  name="dia_pago"
                  type="number"
                  inputProps={{ min: 1, max: 31, "data-testid": "input-cliente-dia-pago" }}
                  value={formik.values.dia_pago}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 31)) {
                      formik.handleChange(e);
                    }
                  }}
                  onBlur={formik.handleBlur}
                  error={formik.touched.dia_pago && Boolean(formik.errors.dia_pago)}
                  helperText={formik.touched.dia_pago && formik.errors.dia_pago}
                  sx={{ minWidth: 150 }}
                  variant="outlined"
                  required
                />
                <FormControl sx={{ flex: 1, minWidth: 150 }}>
                  <InputLabel>Moneda</InputLabel>
                  <Select
                    value={formik.values.moneda || ""}
                    label="Moneda"
                    inputProps={{ "data-testid": "select-cliente-moneda" }}
                    onChange={(e) =>
                      formik.setFieldValue("moneda", e.target.value)
                    }
                    onBlur={formik.handleBlur}
                    error={formik.touched.moneda && Boolean(formik.errors.moneda)}
                  >
                    <MenuItem value="">Seleccionar</MenuItem>
                    <MenuItem value="CLP">CLP (Peso Chileno)</MenuItem>
                    <MenuItem value="USD">USD (Dólar)</MenuItem>
                    <MenuItem value="EUR">EUR (Euro)</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Autocomplete
                  id="nombre-banco-cliente-form"
                  options={bancosChile}
                  value={formik.values.nombre_banco || null}
                  onChange={(event, newValue) => {
                    formik.setFieldValue("nombre_banco", newValue || "");
                  }}
                  onBlur={formik.handleBlur}
                  sx={{ flex: 1, minWidth: 200 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      name="nombre_banco"
                      label="Nombre del banco"
                      error={formik.touched.nombre_banco && Boolean(formik.errors.nombre_banco)}
                      helperText={formik.touched.nombre_banco && formik.errors.nombre_banco}
                      inputProps={{ ...params.inputProps, "data-testid": "autocomplete-cliente-nombre-banco" }}
                      required
                    />
                  )}
                />
                <TextField
                  id="numero-cuenta-cliente-form"
                  label="Nº de cuenta bancaria"
                  name="numero_cuenta"
                  value={formik.values.numero_cuenta}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.numero_cuenta && Boolean(formik.errors.numero_cuenta)}
                  helperText={formik.touched.numero_cuenta && formik.errors.numero_cuenta}
                  inputProps={{ "data-testid": "input-cliente-numero-cuenta" }}
                  sx={{ flex: 1, minWidth: 200 }}
                  variant="outlined"
                  fullWidth
                  required
                />
              </Stack>
              <TextField
                id="titular-cuenta-cliente-form"
                label="Titular de la cuenta"
                name="titular_cuenta"
                value={formik.values.titular_cuenta}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.titular_cuenta && Boolean(formik.errors.titular_cuenta)}
                helperText={formik.touched.titular_cuenta && formik.errors.titular_cuenta}
                inputProps={{ "data-testid": "input-cliente-titular-cuenta" }}
                variant="outlined"
                fullWidth
                required
              />
            </Stack>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                id="cancelar-cliente-form"
                variant="outlined"
                data-testid="button-cliente-cancelar"
                onClick={() => navigate("/clientes")}
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
                id="crear-cliente-form"
                variant="contained"
                data-testid="button-cliente-guardar"
                onClick={formik.handleSubmit}
                disabled={loading || formik.isSubmitting}
                startIcon={isEdit ? <EditIcon /> : <PersonAddIcon />}
                sx={{
                  minWidth: 150,
                  backgroundColor: "#1B7576",
                  "&:hover": {
                    backgroundColor: "#155a5b",
                  },
                }}
              >
                {isEdit ? "Actualizar Cliente" : "Crear Cliente"}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
