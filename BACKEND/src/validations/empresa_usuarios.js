const yup = require("yup");

const createEmpresaUsuarioSchema = yup.object().shape({
  usuario_id: yup
    .number()
    .integer("El ID del usuario debe ser un número entero")
    .positive("El ID del usuario debe ser positivo")
    .optional(),
  rol_id: yup
    .number()
    .required("El ID del rol es requerido")
    .integer("El ID del rol debe ser un número entero")
    .positive("El ID del rol debe ser positivo"),
  nombre_usuario: yup
    .string()
    .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
    .max(50, "El nombre de usuario no puede exceder 50 caracteres")
    .optional(),
  contrasena_hash: yup
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .optional(),
  correo: yup
    .string()
    .email("El correo debe tener un formato válido")
    .max(255, "El correo no puede exceder 255 caracteres")
    .optional(),
}).test(
  "usuario-id-or-user-data",
  "Debe proporcionar usuario_id o los datos del usuario (nombre_usuario, contrasena_hash, correo)",
  function (value) {
    const hasUsuarioId = !!value.usuario_id;
    const hasUserData = !!(value.nombre_usuario && value.contrasena_hash && value.correo);
    return hasUsuarioId || hasUserData;
  }
);

const updateEmpresaUsuarioSchema = yup.object().shape({
  empresa_id: yup
    .number()
    .required("El ID de la empresa es requerido")
    .integer("El ID de la empresa debe ser un número entero")
    .positive("El ID de la empresa debe ser positivo"),
  usuario_id: yup
    .number()
    .required("El ID del usuario es requerido")
    .integer("El ID del usuario debe ser un número entero")
    .positive("El ID del usuario debe ser positivo"),
  rol_id: yup
    .number()
    .required("El ID del rol es requerido")
    .integer("El ID del rol debe ser un número entero")
    .positive("El ID del rol debe ser positivo"),
});

module.exports = {
  createEmpresaUsuarioSchema,
  updateEmpresaUsuarioSchema,
};
