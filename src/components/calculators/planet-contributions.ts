export type PlanetContributionKind =
  | "income"
  | "strike"
  | "defence"
  | "covert"
  | "anti-covert"

export interface PlanetContributionSummary {
  rawTotal: number
  effectiveTotal: number
  totalReduction: number
  cappedCount: number
}

export const createDefaultPlanetContributions = (count = 5): string[] =>
  Array.from({ length: count }, () => "")

export const parsePlanetContributionValue = (value: string): number | null => {
  const normalized = value.replace(/,/g, "").trim()

  if (!normalized) {
    return 0
  }

  const parsed = Number(normalized)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

export const getPlanetContributionSummary = (
  values: string[],
  cap: number,
  valueDivisor = 1,
): PlanetContributionSummary | null => {
  return values.reduce<PlanetContributionSummary | null>(
    (summary, value) => {
      if (summary === null) {
        return null
      }

      const parsed = parsePlanetContributionValue(value)

      if (parsed === null) {
        return null
      }

      const normalized = parsed / valueDivisor
      const effective = Math.min(normalized, cap)

      return {
        rawTotal: summary.rawTotal + normalized,
        effectiveTotal: summary.effectiveTotal + effective,
        totalReduction: summary.totalReduction + normalized - effective,
        cappedCount: summary.cappedCount + (normalized > cap ? 1 : 0),
      }
    },
    {
      rawTotal: 0,
      effectiveTotal: 0,
      totalReduction: 0,
      cappedCount: 0,
    },
  )
}
