import * as yup from "yup";

export const loginSchema = yup.object().shape({
  nombre_usuario: yup
    .string()
    .required("El nombre de usuario es requerido")
    .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
    .max(50, "El nombre de usuario no puede exceder 50 caracteres"),
  password: yup
    .string()
    .required("La contraseña es requerida")
    .min(1, "La contraseña es requerida"),
});

export const registerUserSchema = yup.object().shape({
  nombre_usuario: yup
    .string()
    .required("El nombre de usuario es requerido")
    .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
    .max(50, "El nombre de usuario no puede exceder 50 caracteres"),
  correo: yup
    .string()
    .required("El correo es requerido")
    .email("El correo debe tener un formato válido")
    .max(255, "El correo no puede exceder 255 caracteres"),
  contrasena_hash: yup
    .string()
    .required("La contraseña es requerida")
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const registerEmpresaSchema = yup.object().shape({
  nombre: yup
    .string()
    .required("El nombre de la empresa es requerido")
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255, "El nombre no puede exceder 255 caracteres"),
  calle: yup
    .string()
    .required("La calle es requerida")
    .max(255, "La calle no puede exceder 255 caracteres"),
  comuna: yup
    .string()
    .required("La comuna es requerida")
    .max(100, "La comuna no puede exceder 100 caracteres"),
  region: yup
    .string()
    .required("La región es requerida")
    .max(100, "La región no puede exceder 100 caracteres"),
  telefono: yup
    .string()
    .required("El teléfono es requerido")
    .max(50, "El teléfono no puede exceder 50 caracteres"),
  correo: yup
    .string()
    .required("El correo corporativo es requerido")
    .email("El correo debe tener un formato válido")
    .max(255, "El correo no puede exceder 255 caracteres"),
});
