// ✅ Validación COMPLETA (submit final)
export const validateTripForm = (formData) => {
  const errors = {};

  // 🚗 Vehículo
  if (!formData.brand) errors.brand = "Selecciona una marca";
  if (!formData.model) errors.model = "Selecciona un modelo";
  if (!formData.year) errors.year = "Selecciona un año";
  if (!["city", "mixed", "highway", "rural"].includes(formData.roadProfile)) {
    errors.roadProfile = "Selecciona un tipo de vía válido";
  }

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
  const passengers = Number(formData.passengers);
  if (Number.isNaN(passengers) || passengers < 0 || passengers > 8) {
    errors.passengers = "Ingresa una cantidad válida de pasajeros (0–8)";
  }

  // ⚖️ Peso extra
  const extraWeight = Number(formData.extraWeight);
  if (Number.isNaN(extraWeight) || extraWeight < 0) {
    errors.extraWeight = "Ingresa un peso extra válido";
  }

  // ⛽ Combustible
  if (Number(formData.fuelPrice) <= 0) {
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

  const passengers = Number(formData.passengers);
  if (Number.isNaN(passengers) || passengers < 0 || passengers > 8) {
    errors.passengers = "Cantidad de pasajeros inválida";
  }

  return errors;
};
