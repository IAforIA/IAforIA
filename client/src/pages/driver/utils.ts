export const parseDecimalSafe = (value: string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(value);
  return Number.isNaN(num) ? 0 : num;
};
