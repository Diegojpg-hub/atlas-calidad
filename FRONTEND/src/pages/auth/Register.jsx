import { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { api } from "../../lib/api.jsx";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import bgRegistro from "../../assets/bg-registro.jpg";
import { registerUserSchema, registerEmpresaSchema } from "../../validations/auth";
import { Autocomplete, TextField } from "@mui/material";
import { Comunas, regionesDeChile, comunaARegion } from "../../lib/utils";

export default function Register() {
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  const onUserSubmit = (values) => {
    setUserData(values);
    setStep(2);
  };

  const onEmpresaSubmit = async (values) => {
    try {
      // Construir la dirección completa
      const direccion = `${values.calle}, ${values.comuna}, ${values.region}`;

      // Estructurar los datos según el formato requerido
      const payload = {
        usuario: {
          nombre_usuario: userData.nombre_usuario,
          contrasena_hash: userData.contrasena_hash,
          correo: userData.correo,
        },
        empresa: {
          nombre: values.nombre,
          direccion: direccion,
          telefono: values.telefono,
          correo: values.correo,
        },
      };

      await api.post("/empresas", payload);
      toast.success("Cuenta creada exitosamente, ahora inicia sesión");
      navigate("/login");
    } catch {
      // El interceptor de api ya maneja los toasts de error
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row relative overflow-hidden p-0">
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: `url(${bgRegistro})` }}
      ></div>

      <div className="w-full md:w-6/12 min-h-screen relative z-10 bg-white flex items-center justify-center shadow-lg overflow-y-auto">
        <div className="px-8 py-8 md:py-4 w-full max-w-2xl my-auto">
          {/* Indicador de pasos */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= 1
                    ? "bg-secondary text-primary"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                1
              </div>
              <div className="w-20 h-1 mx-2 bg-gray-200">
                <div
                  className={`h-full transition-all duration-300 ${
                    step >= 2 ? "bg-secondary" : "bg-gray-200"
                  }`}
                  style={{ width: step >= 2 ? "100%" : "0%" }}
                ></div>
              </div>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= 2
                    ? "bg-secondary text-primary"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                2
              </div>
            </div>
          </div>

          <h2 className="font-bold text-4xl text-center mb-2 text-primary">
            {step === 1
              ? "Información del Usuario"
              : "Información de la Empresa"}
          </h2>
          <p className="text-center text-gray-600 mb-8">
            {step === 1
              ? "Ingresa tus datos de usuario"
              : "Completa la información de tu empresa"}
          </p>

          {step === 1 ? (
            <Formik
              key="user-form"
              initialValues={{
                nombre_usuario: "",
                correo: "",
                contrasena_hash: "",
              }}
              validationSchema={registerUserSchema}
              onSubmit={onUserSubmit}
            >
              <Form className="space-y-6">
                <div>
                  <label
                    htmlFor="nombre_usuario"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Nombre de usuario *
                  </label>
                  <Field
                    id="nombre_usuario"
                    name="nombre_usuario"
                    type="text"
                    data-testid="input-registro-nombre-usuario"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent hover:border-secondary transition-colors"
                  />
                  <ErrorMessage
                    name="nombre_usuario"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>

                <div>
                  <label
                    htmlFor="correo"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Correo electrónico *
                  </label>
                  <Field
                    id="correo"
                    name="correo"
                    type="email"
                    data-testid="input-registro-correo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent hover:border-secondary transition-colors"
                  />
                  <ErrorMessage
                    name="correo"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contrasena_hash"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Contraseña *
                  </label>
                  <Field
                    id="contrasena_hash"
                    name="contrasena_hash"
                    type="password"
                    data-testid="input-registro-password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent hover:border-secondary transition-colors"
                  />
                  <ErrorMessage
                    name="contrasena_hash"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>

                <button
                  type="submit"
                  data-testid="button-registro-continuar"
                  className="w-full mt-4 py-3 text-lg font-semibold bg-secondary text-primary rounded-lg hover:bg-[#e6a600] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  Continuar
                </button>

                <p className="text-center mt-4 text-gray-600 text-sm">
                  ¿Ya tienes cuenta?{" "}
                  <Link
                    to="/login"
                    data-testid="link-login"
                    className="text-primary font-semibold no-underline hover:text-secondary hover:underline"
                  >
                    Inicia sesión
                  </Link>
                </p>
              </Form>
            </Formik>
          ) : (
            <Formik
              key="empresa-form"
              initialValues={{
                nombre: "",
                calle: "",
                comuna: "",
                region: "",
                telefono: "",
                correo: "",
              }}
              validationSchema={registerEmpresaSchema}
              onSubmit={onEmpresaSubmit}
            >
              <Form className="space-y-6">
                <div>
                  <label
                    htmlFor="nombre_empresa"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Nombre de la empresa *
                  </label>
                  <Field
                    id="nombre_empresa"
                    name="nombre"
                    type="text"
                    data-testid="input-registro-nombre-empresa"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent hover:border-secondary transition-colors"
                  />
                  <ErrorMessage
                    name="nombre"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>

                <div>
                  <label
                    htmlFor="calle"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Calle *
                  </label>
                  <Field
                    id="calle"
                    name="calle"
                    type="text"
                    data-testid="input-registro-calle"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent hover:border-secondary transition-colors"
                  />
                  <ErrorMessage
                    name="calle"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="comuna"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Comuna *
                    </label>
                    <Field name="comuna">
                      {({ field, form, meta }) => (
                        <>
                          <Autocomplete
                            id="comuna"
                            options={Comunas}
                            value={field.value || null}
                            onChange={(event, newValue) => {
                              form.setFieldValue("comuna", newValue || "");
                              // Auto-seleccionar la región correspondiente
                              if (newValue && comunaARegion[newValue]) {
                                form.setFieldValue("region", comunaARegion[newValue]);
                              }
                            }}
                            onBlur={field.onBlur}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                name="comuna"
                                placeholder="Selecciona una comuna"
                                error={meta.touched && Boolean(meta.error)}
                                helperText={meta.touched && meta.error}
                                inputProps={{
                                  ...params.inputProps,
                                  "data-testid": "autocomplete-registro-comuna",
                                }}
                                sx={{
                                  "& .MuiOutlinedInput-root": {
                                    borderRadius: "0.5rem",
                                    "&:hover fieldset": {
                                      borderColor: "#1B7576",
                                    },
                                    "&.Mui-focused fieldset": {
                                      borderColor: "#1B7576",
                                    },
                                  },
                                }}
                              />
                            )}
                          />
                        </>
                      )}
                    </Field>
                    <ErrorMessage
                      name="comuna"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="region"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Región *
                    </label>
                    <Field name="region">
                      {({ field, form, meta }) => (
                        <>
                          <Autocomplete
                            id="region"
                            options={regionesDeChile}
                            value={field.value || null}
                            onChange={(event, newValue) => {
                              form.setFieldValue("region", newValue || "");
                            }}
                            onBlur={field.onBlur}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                name="region"
                                placeholder="Selecciona una región"
                                error={meta.touched && Boolean(meta.error)}
                                helperText={meta.touched && meta.error}
                                inputProps={{
                                  ...params.inputProps,
                                  "data-testid": "autocomplete-registro-region",
                                }}
                                sx={{
                                  "& .MuiOutlinedInput-root": {
                                    borderRadius: "0.5rem",
                                    "&:hover fieldset": {
                                      borderColor: "#1B7576",
                                    },
                                    "&.Mui-focused fieldset": {
                                      borderColor: "#1B7576",
                                    },
                                  },
                                }}
                              />
                            )}
                          />
                        </>
                      )}
                    </Field>
                    <ErrorMessage
                      name="region"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="telefono"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Teléfono *
                    </label>
                    <Field
                      id="telefono"
                      name="telefono"
                      type="tel"
                      data-testid="input-registro-telefono"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent hover:border-secondary transition-colors"
                    />
                    <ErrorMessage
                      name="telefono"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="correo_empresa"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Correo corporativo *
                    </label>
                    <Field
                      id="correo_empresa"
                      name="correo"
                      type="email"
                      data-testid="input-registro-correo-empresa"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent hover:border-secondary transition-colors"
                    />
                    <ErrorMessage
                      name="correo"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    data-testid="button-registro-volver"
                    className="flex-1 mt-4 py-3 text-lg font-semibold bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-300"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    data-testid="button-registro-crear-cuenta"
                    className="flex-1 mt-4 py-3 text-lg font-semibold bg-secondary text-primary rounded-lg hover:bg-[#e6a600] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                  >
                    Crear cuenta
                  </button>
                </div>
              </Form>
            </Formik>
          )}
        </div>
      </div>
    </div>
  );
}
