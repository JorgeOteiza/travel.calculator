const elevationProfile = Array.from({ length: 18 }, (_, index) => ({
  distance: Number((index * 2.35).toFixed(2)),
  elevation: Math.round(110 + Math.sin(index / 2.4) * 55 + index * 9),
}));

const consumptionProfile = Array.from({ length: 18 }, (_, index) => ({
  distance_km: 2.35,
  grade_percent: Number((Math.sin(index / 2) * 4.2).toFixed(2)),
  consumption_l100km: Number((7.2 + Math.sin(index / 2) * 1.7).toFixed(2)),
  fuel_used: 0.19,
}));

export const demoTrip = {
  id: "demo",
  distance: 42.11,
  fuelUsed: 3.61,
  totalCost: 5054,
  baseFC: 7.4,
  adjustedFC: 8.558,
  weather: "mild",
  roadGrade: 1.8,
  segmentsAnalyzed: 18,
  elevationProfile,
  consumptionProfile,
  vehicle: {
    make: "Chevrolet",
    model: "Spark",
    year: 2021,
    fuel_type: "Gasoline",
    engine_cc: 1200,
    weight_kg: 1019,
    lkm_mixed: 7.4,
  },
  originLabel: "Santiago, Chile",
  destinationLabel: "Valparaíso, Chile",
  settings: { currency: "CLP", distanceUnit: "km" },
  isDemo: true,
};
