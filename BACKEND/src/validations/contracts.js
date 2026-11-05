const yup = require("yup");

const createContractSchema = yup.object().shape({
  cliente_id: yup
    .mixed()
    .required("El ID del cliente es requerido")
    .test("is-number", "El ID del cliente debe ser un número válido", (value) => {
      const num = Number(value);
      return !isNaN(num) && Number.isInteger(num) && num > 0;
    })
    .transform((value) => (value ? Number(value) : null)),
  titulo: yup
    .string()
    .required("El título es requerido")
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(255, "El título no puede exceder 255 caracteres"),
  descripcion: yup
    .string()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .max(2000, "La descripción no puede exceder 2000 caracteres"),
  fecha_inicio: yup
    .date()
    .required("La fecha de inicio es requerida")
    .typeError("La fecha de inicio debe ser una fecha válida")
    .transform((value, originalValue) => {
      if (originalValue === "" || originalValue == null) return null;
      return new Date(originalValue);
    }),
  fecha_fin: yup
    .date()
    .required("La fecha de fin es requerida")
    .typeError("La fecha de fin debe ser una fecha válida")
    .min(yup.ref("fecha_inicio"), "La fecha de fin debe ser posterior a la fecha de inicio")
    .transform((value, originalValue) => {
      if (originalValue === "" || originalValue == null) return null;
      return new Date(originalValue);
    }),
});

const updateContractSchema = yup.object().shape({
  cliente_id: yup
    .mixed()
    .test("is-number", "El ID del cliente debe ser un número válido", (value) => {
      if (value === undefined || value === null || value === "") return true;
      const num = Number(value);
      return !isNaN(num) && Number.isInteger(num) && num > 0;
    })
    .transform((value) => (value && value !== "" ? Number(value) : undefined))
    .optional(),
  titulo: yup
    .string()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(255, "El título no puede exceder 255 caracteres")
    .optional(),
  descripcion: yup
    .string()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .max(2000, "La descripción no puede exceder 2000 caracteres")
    .optional(),
  fecha_inicio: yup
    .date()
    .typeError("La fecha de inicio debe ser una fecha válida")
    .transform((value, originalValue) => {
      if (originalValue === undefined || originalValue === null || originalValue === "") return undefined;
      return new Date(originalValue);
    })
    .optional(),
  fecha_fin: yup
    .date()
    .typeError("La fecha de fin debe ser una fecha válida")
    .transform((value, originalValue) => {
      if (originalValue === undefined || originalValue === null || originalValue === "") return undefined;
      return new Date(originalValue);
    })
    .optional(),
}).test(
  "fecha-fin-after-inicio",
  "La fecha de fin debe ser posterior a la fecha de inicio",
  function (value) {
    if (value.fecha_inicio && value.fecha_fin) {
      return new Date(value.fecha_fin) >= new Date(value.fecha_inicio);
    }
    return true;
  }
);

module.exports = {
  createContractSchema,
  updateContractSchema,
};
