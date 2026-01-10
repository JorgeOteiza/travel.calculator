// ✅ Validación COMPLETA (submit final)
export const validateTripForm = (formData) => {
  const errors = {};

  // 🚗 Vehículo
  if (!formData.brand) errors.brand = "Selecciona una marca";
  if (!formData.model) errors.model = "Selecciona un modelo";
  if (!formData.year) errors.year = "Selecciona un año";

  // 📍 Origen
  if (
    !formData.locationCoords ||
    typeof formData.locationCoords.lat !== "number" ||
    typeof formData.locationCoords.lng !== "number"
  ) {
    errors.location = "Selecciona una ubicación de origen válida";
  }

  // 📍 Destino
  if (
    !formData.destinationCoords ||
    typeof formData.destinationCoords.lat !== "number" ||
    typeof formData.destinationCoords.lng !== "number"
  ) {
    errors.destination = "Selecciona una ubicación de destino válida";
  }

  // 👥 Pasajeros
  if (!formData.passengers || formData.passengers < 1) {
    errors.passengers = "Ingresa al menos 1 pasajero";
  }

  // ⚖️ Peso extra (equipaje)
  const extraWeight = Number(formData.extraWeight);

  if (Number.isNaN(extraWeight)) {
    errors.extraWeight = "Ingresa un número válido";
  } else if (extraWeight < 0) {
    errors.extraWeight = "El peso no puede ser negativo";
  }

  // ⛽ Combustible
  if (
    formData.fuelType !== "electric" &&
    (!formData.fuelPrice || Number(formData.fuelPrice) <= 0)
  ) {
    errors.fuelPrice = "Ingresa un precio de combustible válido";
  }

  return errors;
};

// ✅ Validación LIGERA (antes de calcular)
export const validateTripCalculation = (formData) => {
  const errors = {};

  const isValidCoords = (coords) =>
    coords && typeof coords.lat === "number" && typeof coords.lng === "number";

  if (!isValidCoords(formData.locationCoords)) {
    errors.location = "Selecciona un origen";
  }

  if (!isValidCoords(formData.destinationCoords)) {
    errors.destination = "Selecciona un destino";
  }

  return errors;
};
