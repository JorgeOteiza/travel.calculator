export const validateTripForm = (formData) => {
  const errors = {};

  if (!formData.brand) errors.brand = "Selecciona una marca.";
  if (!formData.model) errors.model = "Selecciona un modelo.";
  if (!formData.year) errors.year = "Selecciona un año.";
  if (!formData.fuelType)
    errors.fuelType = "Selecciona un tipo de combustible.";

  const isValidCoordinate = (value) => {
    const regex = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;
    return regex.test(value);
  };

  if (!formData.location) {
    errors.location = "Selecciona una ubicación de inicio.";
  } else if (!isValidCoordinate(formData.location)) {
    errors.location = "Coordenadas de ubicación inválidas.";
  }

  if (!formData.destinity) {
    errors.destinity = "Selecciona un destino.";
  } else if (!isValidCoordinate(formData.destinity)) {
    errors.destinity = "Coordenadas de destino inválidas.";
  }

  if (isNaN(formData.totalWeight) || formData.totalWeight <= 0)
    errors.totalWeight = "Ingrese un peso válido.";
  if (isNaN(formData.passengers) || formData.passengers <= 0)
    errors.passengers = "Ingrese cantidad válida de pasajeros.";

  return errors;
};
