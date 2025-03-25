export const validateTripForm = (formData) => {
  const errors = {};

  if (!formData.brand) errors.brand = "Selecciona una marca.";
  if (!formData.model) errors.model = "Selecciona un modelo.";
  if (!formData.fuelType)
    errors.fuelType = "Selecciona un tipo de combustible.";
  if (!formData.location)
    errors.location = "Selecciona una ubicación de inicio.";
  if (!formData.destinity) errors.destinity = "Selecciona un destino.";
  if (isNaN(formData.totalWeight) || formData.totalWeight <= 0)
    errors.totalWeight = "Ingrese un peso válido.";
  if (isNaN(formData.passengers) || formData.passengers <= 0)
    errors.passengers = "Ingrese cantidad válida de pasajeros.";

  return errors;
};
