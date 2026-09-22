// Ejemplo ilustrativo (no proviene de un cálculo real ejecutado con clima,
// pendiente ni elevación en vivo): distancia aproximada Santiago–Valparaíso
// por Ruta 68 (~115 km), con el rendimiento mixto real y vigente del
// Chevrolet Spark 2021 del catálogo (6,5 L/100 km, verificado contra el
// catálogo activo) y un precio de combustible declarado de $1.250/L. No se
// modela ningún ajuste por clima/pendiente/tráfico: baseFC y adjustedFC son
// iguales a propósito, para no insinuar una calibración que no se calculó.
// fuelUsed = 115 km × 6,5 L/100km = 7,475 L; totalCost = 7,475 L × $1.250.
const ILLUSTRATIVE_DISTANCE_KM = 115;
const ILLUSTRATIVE_CONSUMPTION_L100KM = 6.5;
const ILLUSTRATIVE_FUEL_PRICE_CLP = 1250;
const ILLUSTRATIVE_FUEL_USED_L = (ILLUSTRATIVE_DISTANCE_KM * ILLUSTRATIVE_CONSUMPTION_L100KM) / 100;

const elevationProfile = Array.from({ length: 18 }, (_, index) => ({
  distance: Number((index * (ILLUSTRATIVE_DISTANCE_KM / 17)).toFixed(2)),
  elevation: Math.round(110 + Math.sin(index / 2.4) * 55 + index * 9),
}));

const consumptionProfile = Array.from({ length: 18 }, (_, index) => ({
  distance_km: Number((ILLUSTRATIVE_DISTANCE_KM / 18).toFixed(2)),
  grade_percent: Number((Math.sin(index / 2) * 4.2).toFixed(2)),
  consumption_l100km: Number((ILLUSTRATIVE_CONSUMPTION_L100KM + Math.sin(index / 2) * 1.7).toFixed(2)),
  fuel_used: Number((ILLUSTRATIVE_FUEL_USED_L / 18).toFixed(2)),
}));

export const demoTrip = {
  id: "demo",
  distance: ILLUSTRATIVE_DISTANCE_KM,
  fuelUsed: ILLUSTRATIVE_FUEL_USED_L,
  totalCost: ILLUSTRATIVE_FUEL_USED_L * ILLUSTRATIVE_FUEL_PRICE_CLP,
  baseFC: ILLUSTRATIVE_CONSUMPTION_L100KM,
  adjustedFC: ILLUSTRATIVE_CONSUMPTION_L100KM,
  weather: "mild",
  roadGrade: 1.8,
  roadProfile: "mixed",
  drivingStyle: "moderate",
  consumptionSource: "standard",
  operatingConditions: { traffic_level: "moderate", departure_hour: 12, is_short_trip: false },
  segmentsAnalyzed: 18,
  elevationProfile,
  // "open_meteo" haría que ResultDetails.jsx muestre "obtenida desde
  // Open-Meteo / Copernicus DEM" y una atribución citando ese proveedor
  // real -- falso para un perfil sintético. "flat_fallback" es el único
  // otro valor que la app usa genuinamente (cuando la elevación real no
  // está disponible) y no reclama ninguna fuente externa real.
  elevationSource: "flat_fallback",
  consumptionProfile,
  vehicle: {
    make: "Chevrolet",
    model: "Spark",
    year: 2021,
    fuel_type: "Gasoline",
    engine_cc: 1200,
    weight_kg: 1200,
    lkm_mixed: ILLUSTRATIVE_CONSUMPTION_L100KM,
  },
  originLabel: "Santiago, Chile",
  destinationLabel: "Valparaíso, Chile",
  settings: { currency: "CLP", distanceUnit: "km" },
  isDemo: true,
};
