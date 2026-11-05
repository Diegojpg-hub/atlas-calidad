import * as yup from "yup";

export const updateEmpresaSchema = yup.object().shape({
  nombre: yup
    .string()
    .required("El nombre es requerido")
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255, "El nombre no puede exceder 255 caracteres"),
  direccion: yup
    .string()
    .required("La dirección es requerida")
    .max(500, "La dirección no puede exceder 500 caracteres"),
  telefono: yup
    .string()
    .required("El teléfono es requerido")
    .max(50, "El teléfono no puede exceder 50 caracteres"),
  correo: yup
    .string()
    .required("El correo es requerido")
    .email("El correo debe tener un formato válido")
    .max(255, "El correo no puede exceder 255 caracteres"),
});
