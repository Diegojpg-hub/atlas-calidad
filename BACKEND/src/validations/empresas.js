const yup = require("yup");

const createEmpresaSchema = yup.object().shape({
  nombre: yup
    .string()
    .required("El nombre es requerido")
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255, "El nombre no puede exceder 255 caracteres"),
  direccion: yup
    .string()
    .nullable()
    .max(500, "La dirección no puede exceder 500 caracteres"),
  telefono: yup
    .string()
    .nullable()
    .max(50, "El teléfono no puede exceder 50 caracteres"),
  correo: yup
    .string()
    .required("El correo es requerido")
    .email("El correo debe tener un formato válido")
    .max(255, "El correo no puede exceder 255 caracteres"),
});

const createEmpresaConUsuarioSchema = yup.object().shape({
  usuario: yup.object().shape({
    nombre_usuario: yup
      .string()
      .required("El nombre de usuario es requerido")
      .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
      .max(50, "El nombre de usuario no puede exceder 50 caracteres"),
    contrasena_hash: yup
      .string()
      .required("La contraseña es requerida")
      .min(6, "La contraseña debe tener al menos 6 caracteres"),
    correo: yup
      .string()
      .required("El correo del usuario es requerido")
      .email("El correo debe tener un formato válido")
      .max(255, "El correo no puede exceder 255 caracteres"),
  }).required(),
  empresa: yup.object().shape({
    nombre: yup
      .string()
      .required("El nombre de la empresa es requerido")
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(255, "El nombre no puede exceder 255 caracteres"),
    direccion: yup
      .string()
      .nullable()
      .max(500, "La dirección no puede exceder 500 caracteres"),
    telefono: yup
      .string()
      .nullable()
      .max(50, "El teléfono no puede exceder 50 caracteres"),
    correo: yup
      .string()
      .required("El correo de la empresa es requerido")
      .email("El correo debe tener un formato válido")
      .max(255, "El correo no puede exceder 255 caracteres"),
  }).required(),
});

const updateEmpresaSchema = yup.object().shape({
  nombre: yup
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255, "El nombre no puede exceder 255 caracteres")
    .required("El nombre es requerido"),
  direccion: yup
    .string()
    .nullable()
    .max(500, "La dirección no puede exceder 500 caracteres"),
  telefono: yup
    .string()
    .nullable()
    .max(50, "El teléfono no puede exceder 50 caracteres"),
  correo: yup
    .string()
    .required("El correo es requerido")
    .email("El correo debe tener un formato válido")
    .max(255, "El correo no puede exceder 255 caracteres"),
});

module.exports = {
  createEmpresaSchema,
  createEmpresaConUsuarioSchema,
  updateEmpresaSchema,
};
