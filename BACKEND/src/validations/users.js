const yup = require("yup");

const createUserSchema = yup.object().shape({
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
    .required("El correo es requerido")
    .email("El correo debe tener un formato válido")
    .max(255, "El correo no puede exceder 255 caracteres"),
});

const updateUserSchema = yup.object().shape({
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
  "at-least-one-field",
  "Debe proporcionar al menos un campo para actualizar",
  function (value) {
    return Object.keys(value).length > 0;
  }
);

module.exports = {
  createUserSchema,
  updateUserSchema,
};
