const formatterCache = new Map();

const getFormatter = (minimumFractionDigits, maximumFractionDigits) => {
  const key = `${minimumFractionDigits}-${maximumFractionDigits}`;
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.NumberFormat("es-CL", {
      minimumFractionDigits,
      maximumFractionDigits,
    }));
  }
  return formatterCache.get(key);
};

export const formatNumber = (
  value,
  { minimumFractionDigits = 0, maximumFractionDigits = 2 } = {},
) => {
  if (value === undefined || value === null || value === "") return "-";
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "-";
  return getFormatter(minimumFractionDigits, maximumFractionDigits).format(numericValue);
};

export const formatDistance = (value) => formatNumber(value, { maximumFractionDigits: 1 });
export const formatLiters = (value) => formatNumber(value, { maximumFractionDigits: 2 });
export const formatConsumption = (value) => formatNumber(value, { maximumFractionDigits: 2 });
export const formatPercentage = (value) => formatNumber(value, { maximumFractionDigits: 2 });
export const formatWeight = (value) => formatNumber(value, { maximumFractionDigits: 1 });
