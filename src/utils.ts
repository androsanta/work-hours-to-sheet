export function toDecimalValueRounded(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  // round minutes to 15 minutes uncertainty (25 in decimal)
  const STEP = 25
  // 15 minutes gets converted to 0.25
  const decimalMinutes = (minutes * 100) / 60
  // 0.20 becomes 0.25, 0.10 becomes 0
  const triggerPoint = Math.floor(STEP / 2)
  const roundUp =
    Math.max(decimalMinutes % STEP, triggerPoint - 1) >= triggerPoint

  const decimalMinutesRounded =
    Math.floor(decimalMinutes / STEP) * STEP + (roundUp ? STEP : 0)
  return hours + decimalMinutesRounded / 100
}
