export const validateTripForm = (formData) => {
  const errors = {};

  const isEmpty = (value) =>
    value === undefined || value === null || value === "";
  const isPositiveNumber = (value) => !isNaN(value) && Number(value) > 0;
  const isValidCoordinate = (value) =>
    /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value);

  // Marca, modelo y año
  if (isEmpty(formData.brand)) errors.brand = "Selecciona una marca.";
  if (isEmpty(formData.model)) errors.model = "Selecciona un modelo.";
  if (isEmpty(formData.year)) errors.year = "Selecciona un año.";

  // Combustible si no es eléctrico
  const isElectric = formData?.fuelType?.toLowerCase?.().includes("electric");
  if (!isElectric && isEmpty(formData.fuelType)) {
    errors.fuelType = "Selecciona un tipo de combustible.";
  }

  // Ubicación
  if (isEmpty(formData.location)) {
    errors.location = "Selecciona una ubicación de inicio.";
  } else if (!isValidCoordinate(formData.location)) {
    errors.location = "Coordenadas de ubicación inválidas.";
  }

  if (isEmpty(formData.destinity)) {
    errors.destinity = "Selecciona un destino.";
  } else if (!isValidCoordinate(formData.destinity)) {
    errors.destinity = "Coordenadas de destino inválidas.";
  }

  // Pasajeros y peso
  if (!isPositiveNumber(formData.passengers)) {
    errors.passengers = "Ingresa una cantidad válida de pasajeros.";
  }
  if (!isPositiveNumber(formData.totalWeight)) {
    errors.totalWeight = "Ingresa un peso válido.";
  }

  // Precio del combustible si no es eléctrico
  if (!isElectric && !isPositiveNumber(formData.fuelPrice)) {
    errors.fuelPrice = "Ingresa un precio de combustible válido.";
  }

  return errors;
};
