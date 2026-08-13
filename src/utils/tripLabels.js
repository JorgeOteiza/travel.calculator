export const roadProfileLabels = {
  city: "Ciudad y tránsito urbano",
  mixed: "Uso mixto",
  highway: "Autopista o carretera",
  rural: "Camino rural o caletera",
};

export const drivingStyleLabels = {
  calm: "Ritmo tranquilo",
  moderate: "Ritmo moderado",
  hurried: "Ritmo apurado",
};

export const weatherLabels = {
  mild: "Templado",
  normal: "Normal",
  clear: "Despejado",
  cloudy: "Nublado",
  rain: "Lluvia",
  rainy: "Lluvia",
  cold: "Frío",
  hot: "Caluroso",
  windy: "Ventoso",
  snow: "Nieve",
  snowy: "Nieve",
};

export const trafficLabels = {
  light: "liviano",
  normal: "normal",
  moderate: "moderado",
  heavy: "intenso",
  peak: "de hora punta",
  "hora punta": "de hora punta",
};

export const getRoadProfileLabel = (value) => roadProfileLabels[value] || "Uso mixto";
export const getDrivingStyleLabel = (value) => drivingStyleLabels[value] || "Ritmo moderado";
export const getWeatherLabel = (value) => weatherLabels[String(value || "").toLowerCase()] || value || "Sin datos";
export const getTrafficLabel = (value) => trafficLabels[String(value || "").toLowerCase()] || value || "normal";
