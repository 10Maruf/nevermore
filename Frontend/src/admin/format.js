export function formatTk(value) {
  if (value === null || value === undefined || isNaN(Number(value))) return "Tk 0.00";
  const num = Number(value);
  return `Tk ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
