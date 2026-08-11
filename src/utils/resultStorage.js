export const readStoredResult = () => {
  try {
    return JSON.parse(sessionStorage.getItem("travelCalculator:lastResult"));
  } catch {
    return null;
  }
};

const decimalFormatter = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export const formatShareValues = (result) => ({
  distance: `${decimalFormatter.format(Number(result.distance || 0))} km`,
  fuel: `${decimalFormatter.format(Number(result.fuelUsed || 0))} L`,
  consumption: `${decimalFormatter.format(Number(result.adjustedFC || 0))} L/100 km`,
  cost: clpFormatter.format(Number(result.totalCost || 0)),
});

export const buildShareText = (result) => {
  const values = formatShareValues(result);
  return [
    "Resumen de mi viaje · Travel Calculator",
    `Ruta: ${result.originLabel || "Origen"} → ${result.destinationLabel || "Destino"}`,
    `Distancia: ${values.distance}`,
    `Combustible estimado: ${values.fuel}`,
    `Consumo ajustado: ${values.consumption}`,
    `Costo estimado: ${values.cost}`,
    `Clima: ${result.weather || "Sin datos"}`,
  ].join("\n");
};
