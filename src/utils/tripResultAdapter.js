export const tripToResult = (trip) => ({
  id: trip.id,
  distance: Number(trip.distance || 0),
  fuelUsed: Number(trip.fuel_consumed || 0),
  totalCost: Number(trip.total_cost || 0),
  adjustedFC: Number(trip.adjusted_consumption || trip.expected_consumption || 0),
  baseFC: Number(trip.base_consumption || 0),
  weather: trip.weather,
  roadGrade: Number(trip.road_grade || 0),
  roadProfile: trip.road_profile,
  drivingStyle: trip.driving_style || "moderate",
  segmentsAnalyzed: Number(trip.segments_analyzed || 0),
  elevationProfile: trip.elevation_profile || [],
  elevationSource: trip.elevation_source || "unavailable",
  consumptionProfile: trip.consumption_profile || [],
  operatingConditions: trip.operating_conditions || null,
  originLabel: trip.origin_label || "Origen no guardado",
  destinationLabel: trip.destination_label || "Destino no guardado",
  fuelOctane: trip.fuel_octane,
  userConsumptionKml: trip.user_consumption_kml,
  consumptionReferenceProfile: trip.consumption_reference_profile,
  consumptionSource: trip.consumption_source || "standard",
  // vehicle_id es el indicador persistido de vehículo personalizado (ver
  // backend, commit 22a2c19): null significa que no proviene del catálogo.
  isCustomVehicle: trip.vehicle_id === null,
  vehicle: { make: trip.brand, model: trip.model, year: trip.year, fuel_type: trip.fuel_type },
  settings: { currency: "CLP", distanceUnit: "km" },
  fromHistory: true,
  // Todo lo que pasa por este adaptador viene de un Trip ya persistido
  // (tiene id, viene del historial autenticado) — siempre guardado.
  saved: true,
});
