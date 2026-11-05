import * as yup from "yup";

export const contratoSchema = yup.object().shape({
  cliente_id: yup
    .string()
    .required("Debe seleccionar un cliente"),
  titulo: yup
    .string()
    .required("El título es requerido")
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(255, "El título no puede exceder 255 caracteres"),
  descripcion: yup
    .string()
    .nullable()
    .max(2000, "La descripción no puede exceder 2000 caracteres"),
  fecha_inicio: yup
    .date()
    .required("La fecha de inicio es requerida")
    .typeError("La fecha de inicio debe ser una fecha válida"),
  fecha_fin: yup
    .date()
    .required("La fecha de fin es requerida")
    .typeError("La fecha de fin debe ser una fecha válida")
    .min(yup.ref("fecha_inicio"), "La fecha de fin debe ser posterior a la fecha de inicio"),
});
