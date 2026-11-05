import * as yup from "yup";

export const clienteSchema = yup.object().shape({
  nombre: yup
    .string()
    .required("El nombre es requerido")
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255, "El nombre no puede exceder 255 caracteres"),
  correo: yup
    .string()
    .required("El correo es requerido")
    .email("El correo debe tener un formato válido")
    .max(255, "El correo no puede exceder 255 caracteres"),
  telefono: yup
    .string()
    .required("El teléfono es requerido")
    .max(50, "El teléfono no puede exceder 50 caracteres"),
  es_empresa: yup.boolean().default(false),
  rut: yup
    .string()
    .required("El RUT es requerido")
    .max(20, "El RUT no puede exceder 20 caracteres"),
  nombre_fantasia: yup
    .string()
    .required("El nombre de fantasía es requerido")
    .max(255, "El nombre de fantasía no puede exceder 255 caracteres"),
  giro_actividad_economica: yup
    .string()
    .required("El giro o actividad económica es requerido")
    .max(255, "El giro no puede exceder 255 caracteres"),
  nombre_representante: yup
    .string()
    .required("El nombre del representante es requerido")
    .max(255, "El nombre del representante no puede exceder 255 caracteres"),
  cargo_representante: yup
    .string()
    .required("El cargo del representante es requerido")
    .max(100, "El cargo no puede exceder 100 caracteres"),
  correo_representante: yup
    .string()
    .required("El correo del representante es requerido")
    .email("El correo del representante debe tener un formato válido")
    .max(255, "El correo no puede exceder 255 caracteres"),
  telefono_representante: yup
    .string()
    .required("El teléfono del representante es requerido")
    .max(50, "El teléfono del representante no puede exceder 50 caracteres"),
  relacion_representante: yup
    .string()
    .required("La relación del representante es requerida")
    .max(100, "La relación no puede exceder 100 caracteres"),
  direccion_calle: yup
    .string()
    .required("La calle es requerida")
    .max(255, "La calle no puede exceder 255 caracteres"),
  direccion_numero: yup
    .string()
    .required("El número es requerido")
    .max(20, "El número no puede exceder 20 caracteres"),
  direccion_ciudad: yup
    .string()
    .required("La ciudad es requerida")
    .max(100, "La ciudad no puede exceder 100 caracteres"),
  direccion_region: yup
    .string()
    .required("La región es requerida")
    .max(100, "La región no puede exceder 100 caracteres"),
  sitio_web: yup
    .string()
    .required("El sitio web es requerido")
    .url("El sitio web debe ser una URL válida")
    .max(255, "El sitio web no puede exceder 255 caracteres"),
  telefono_corporativo: yup
    .string()
    .required("El teléfono corporativo es requerido")
    .max(50, "El teléfono corporativo no puede exceder 50 caracteres"),
  nombre_banco: yup
    .string()
    .required("El nombre del banco es requerido")
    .max(100, "El nombre del banco no puede exceder 100 caracteres"),
  numero_cuenta: yup
    .string()
    .required("El número de cuenta es requerido")
    .max(50, "El número de cuenta no puede exceder 50 caracteres"),
  titular_cuenta: yup
    .string()
    .required("El titular de la cuenta es requerido")
    .max(255, "El titular no puede exceder 255 caracteres"),
  metodo_pago: yup
    .string()
    .required("El método de pago es requerido")
    .oneOf(["transferencia", "cheque", "efectivo", "tarjeta", "otro"], "Método de pago inválido"),
  dia_pago: yup
    .string()
    .required("El día de pago es requerido")
    .test("is-valid-day", "El día de pago debe estar entre 1 y 31", (value) => {
      if (!value) return false;
      const day = parseInt(value, 10);
      return !isNaN(day) && day >= 1 && day <= 31;
    }),
  moneda: yup
    .string()
    .required("La moneda es requerida")
    .oneOf(["CLP", "USD", "EUR"], "Moneda inválida"),
});
