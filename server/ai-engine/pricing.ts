export function calculateDynamicTax(distance: number, baseTime: Date): number {
  let baseTax = 7.0;
  if (distance > 5) baseTax += (distance - 5) * 1.5;

  const hour = baseTime.getHours();
  if (hour >= 11 && hour <= 14) baseTax *= 1.2;
  if (hour >= 18 && hour <= 20) baseTax *= 1.3;

  const day = baseTime.getDay();
  if (day === 0 || day === 6) baseTax *= 1.15;

  return Math.round(baseTax * 100) / 100;
}
