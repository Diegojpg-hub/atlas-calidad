import { useState } from "react";
import {
  Button,
  CardContent,
  Stack,
  TextField,
  Typography,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Autocomplete,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { useFormik } from "formik";
import { clienteSchema } from "../../validations/clients";
import { cargosRepresentante, regionesDeChile, bancosChile, giros } from "../../lib/utils";
import { formatRut, RutFormat } from "@fdograph/rut-utilities";

export default function ClientesTabCreate({ onSuccess, onLoad }) {
  const { role } = useAuth();
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
    onSubmit: async (values) => {
      setLoading(true);
      try {
        await api.post("/clientes", values);
        toast.success("Cliente creado");
        formik.resetForm();
        onLoad();
        onSuccess(); // Cambiar a la pestaña de listar después de crear
      } catch {
        // El error ya se maneja en el interceptor
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <CardContent className="!p-6">
      <div className="py-2">
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Crear nuevo cliente
        </Typography>
        <Typography variant="body" color="text.secondary">
          Ingresa los datos del nuevo cliente para crearlo en el sistema.
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
                onChange={(e) =>
                  formik.setFieldValue("es_empresa", e.target.value === "empresa")
                }
              >
                <MenuItem value="persona">Persona</MenuItem>
                <MenuItem value="empresa">Empresa</MenuItem>
              </Select>
            </FormControl>
            <TextField
              id="rut-cliente-create"
              label="RUT"
              name="rut"
              value={formik.values.rut}
              onChange={formik.handleChange}
              onBlur={(e) => {
                const formatted = formatRut(e.target.value, RutFormat.DOTS_DASH);
                formik.setFieldValue("rut", formatted);
                formik.handleBlur(e);
              }}
              error={formik.touched.rut && Boolean(formik.errors.rut)}
              helperText={formik.touched.rut && formik.errors.rut}
              sx={{ flex: 1, minWidth: 200 }}
              variant="outlined"
              required
            />
            <TextField
              id="nombre-cliente-create"
              label="Nombre completo"
              name="nombre"
              value={formik.values.nombre}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.nombre && Boolean(formik.errors.nombre)}
              helperText={formik.touched.nombre && formik.errors.nombre}
              sx={{ flex: 1, minWidth: 200 }}
              variant="outlined"
              fullWidth
              required
            />
          </Stack>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <TextField
              id="nombre-fantasia-cliente-create"
              label="Nombre de fantasía"
              name="nombre_fantasia"
              value={formik.values.nombre_fantasia}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.nombre_fantasia && Boolean(formik.errors.nombre_fantasia)}
              helperText={formik.touched.nombre_fantasia && formik.errors.nombre_fantasia}
              sx={{ flex: 1, minWidth: 200 }}
              variant="outlined"
              fullWidth
              required
            />
            <Autocomplete
              id="giro-cliente-create"
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
              id="nombre-representante-cliente-create"
              label="Nombre del representante"
              name="nombre_representante"
              value={formik.values.nombre_representante}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.nombre_representante && Boolean(formik.errors.nombre_representante)}
              helperText={formik.touched.nombre_representante && formik.errors.nombre_representante}
              sx={{ flex: 1, minWidth: 200 }}
              variant="outlined"
              fullWidth
              required
            />
            <Autocomplete
              id="cargo-representante-cliente-create"
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
                  required
                />
              )}
            />
          </Stack>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <TextField
              id="correo-representante-cliente-create"
              label="Correo del representante"
              name="correo_representante"
              type="email"
              value={formik.values.correo_representante}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.correo_representante && Boolean(formik.errors.correo_representante)}
              helperText={formik.touched.correo_representante && formik.errors.correo_representante}
              sx={{ flex: 1, minWidth: 200 }}
              variant="outlined"
              fullWidth
              required
            />
            <TextField
              id="telefono-representante-cliente-create"
              label="Teléfono del representante"
              name="telefono_representante"
              value={formik.values.telefono_representante}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.telefono_representante && Boolean(formik.errors.telefono_representante)}
              helperText={formik.touched.telefono_representante && formik.errors.telefono_representante}
              sx={{ flex: 1, minWidth: 200 }}
              variant="outlined"
              fullWidth
              required
            />
          </Stack>
          <TextField
            id="relacion-representante-cliente-create"
            label="Relación"
            name="relacion_representante"
            value={formik.values.relacion_representante}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.relacion_representante && Boolean(formik.errors.relacion_representante)}
            helperText={formik.touched.relacion_representante && formik.errors.relacion_representante}
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
              id="direccion-calle-cliente-create"
              label="Calle"
              name="direccion_calle"
              value={formik.values.direccion_calle}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.direccion_calle && Boolean(formik.errors.direccion_calle)}
              helperText={formik.touched.direccion_calle && formik.errors.direccion_calle}
              sx={{ flex: 1, minWidth: 200 }}
              variant="outlined"
              fullWidth
              required
            />
            <TextField
              id="direccion-numero-cliente-create"
              label="Número"
              name="direccion_numero"
              value={formik.values.direccion_numero}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.direccion_numero && Boolean(formik.errors.direccion_numero)}
              helperText={formik.touched.direccion_numero && formik.errors.direccion_numero}
              sx={{ minWidth: 120 }}
              variant="outlined"
              required
            />
          </Stack>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <TextField
              id="direccion-ciudad-cliente-create"
              label="Ciudad"
              name="direccion_ciudad"
              value={formik.values.direccion_ciudad}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.direccion_ciudad && Boolean(formik.errors.direccion_ciudad)}
              helperText={formik.touched.direccion_ciudad && formik.errors.direccion_ciudad}
              sx={{ flex: 1, minWidth: 200 }}
              variant="outlined"
              fullWidth
              required
            />
            <Autocomplete
              id="direccion-region-cliente-create"
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
                  required
                />
              )}
            />
          </Stack>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <TextField
              id="sitio-web-cliente-create"
              label="Sitio web"
              name="sitio_web"
              type="url"
              value={formik.values.sitio_web}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.sitio_web && Boolean(formik.errors.sitio_web)}
              helperText={formik.touched.sitio_web && formik.errors.sitio_web}
              sx={{ flex: 1, minWidth: 200 }}
              variant="outlined"
              fullWidth
              required
            />
            <TextField
              id="telefono-corporativo-cliente-create"
              label="Teléfono corporativo"
              name="telefono_corporativo"
              value={formik.values.telefono_corporativo}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.telefono_corporativo && Boolean(formik.errors.telefono_corporativo)}
              helperText={formik.touched.telefono_corporativo && formik.errors.telefono_corporativo}
              sx={{ flex: 1, minWidth: 200 }}
              variant="outlined"
              fullWidth
              required
            />
          </Stack>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <TextField
              id="correo-cliente-create"
              label="Correo"
              name="correo"
              type="email"
              value={formik.values.correo}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.correo && Boolean(formik.errors.correo)}
              helperText={formik.touched.correo && formik.errors.correo}
              sx={{ flex: 1, minWidth: 200 }}
              variant="outlined"
              fullWidth
              required
            />
            <TextField
              id="telefono-cliente-create"
              label="Teléfono"
              name="telefono"
              value={formik.values.telefono}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.telefono && Boolean(formik.errors.telefono)}
              helperText={formik.touched.telefono && formik.errors.telefono}
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
              id="dia-pago-cliente-create"
              label="Día de pago"
              name="dia_pago"
              type="number"
              inputProps={{ min: 1, max: 31 }}
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
              id="nombre-banco-cliente-create"
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
                  required
                />
              )}
            />
            <TextField
              id="numero-cuenta-cliente-create"
              label="Nº de cuenta bancaria"
              name="numero_cuenta"
              value={formik.values.numero_cuenta}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.numero_cuenta && Boolean(formik.errors.numero_cuenta)}
              helperText={formik.touched.numero_cuenta && formik.errors.numero_cuenta}
              sx={{ flex: 1, minWidth: 200 }}
              variant="outlined"
              fullWidth
              required
            />
          </Stack>
          <TextField
            id="titular-cuenta-cliente-create"
            label="Titular de la cuenta"
            name="titular_cuenta"
            value={formik.values.titular_cuenta}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.titular_cuenta && Boolean(formik.errors.titular_cuenta)}
            helperText={formik.touched.titular_cuenta && formik.errors.titular_cuenta}
            variant="outlined"
            fullWidth
            required
          />
        </Stack>
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            id="crear-cliente-create"
            variant="contained"
            onClick={formik.handleSubmit}
            disabled={loading || formik.isSubmitting}
            startIcon={<PersonAddIcon />}
            sx={{
              minWidth: 150,
              backgroundColor: "#1B7576",
              "&:hover": {
                backgroundColor: "#155a5b",
              },
            }}
          >
            Crear Cliente
          </Button>
        </Stack>
      </Stack>
    </CardContent>
  );
}

