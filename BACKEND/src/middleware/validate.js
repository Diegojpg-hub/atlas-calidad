const validate = (schema, source = "body") => {
  return async (req, res, next) => {
    try {
      const data = req[source];
      await schema.validate(data, { abortEarly: false, stripUnknown: true });
      next();
    } catch (error) {
      if (error.name === "ValidationError") {
        const errors = error.inner.map((err) => ({
          field: err.path,
          message: err.message,
        }));
        return res.status(400).json({
          error: "Error de validación",
          glosa: "Los datos proporcionados no son válidos",
          detalles: errors,
        });
      }
      return res.status(500).json({
        error: "Error en la validación",
        glosa: "Ocurrió un error interno",
      });
    }
  };
};

module.exports = validate;
