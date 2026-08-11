const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  currencyDisplay: "symbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const formatCLP = (value) => {
  const numericValue = Number(value);
  return clpFormatter.format(Number.isFinite(numericValue) ? Math.round(numericValue) : 0);
};
