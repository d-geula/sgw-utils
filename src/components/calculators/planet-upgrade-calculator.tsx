import { type FormEvent, type KeyboardEvent, useState } from "react"
import { Check, ChevronDown, ChevronUp, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const PLANET_SIZES = {
  tiny: { label: "Tiny", multiplier: 1 },
  verySmall: { label: "Very Small", multiplier: 2 },
  small: { label: "Small", multiplier: 3 },
  normal: { label: "Normal", multiplier: 4 },
  aboveAverage: { label: "Above Average", multiplier: 5 },
  large: { label: "Large", multiplier: 6 },
  huge: { label: "Huge", multiplier: 7 },
  massive: { label: "Massive", multiplier: 8 },
  mindblowing: { label: "Mindblowing", multiplier: 9 },
} as const

const PLANET_TYPES = {
  attack: {
    label: "Attack",
    contributionLabel: "Attack",
    facilitiesLabel: "Attack Facilities",
    costIncrement: 3_000,
    costLevelOffset: 0,
    constant: 150_000,
  },
  defence: {
    label: "Defence",
    contributionLabel: "Defence",
    facilitiesLabel: "Defence Facilities",
    costIncrement: 3_000,
    costLevelOffset: 0,
    constant: 160_000,
  },
  covert: {
    label: "Covert/Anti-Covert",
    contributionLabel: "Covert/Anti-Covert",
    facilitiesLabel: "Covert Facilities",
    costIncrement: 9_000,
    costLevelOffset: 0,
    constant: 905_096,
  },
  unitProduction: {
    label: "Unit Production",
    contributionLabel: "Unit Production",
    facilitiesLabel: "Production Facilities",
    costIncrement: 5_000,
    // Inferred from a Tiny UP purchase: contribution facilities and cost levels
    // do not appear to use the same base count for this planet type.
    costLevelOffset: 1_401,
    constant: null,
  },
  income: {
    label: "Income",
    contributionLabel: "Income",
    facilitiesLabel: "Income Facilities",
    costIncrement: 5_000,
    costLevelOffset: 0,
    constant: 960_000,
  },
} as const

type PlanetSize = keyof typeof PLANET_SIZES
type PlanetType = keyof typeof PLANET_TYPES

interface CalculationResults {
  currentFacilities: number
  finalFacilities: number
  upgradesToBuy: number
  totalCost: number
  projectedContribution: number
  contributionIncrease: number
}

const formatNumber = (num: number): string => {
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

const formatCompact = (num: number): string => {
  const abs = Math.abs(num)
  const sign = num < 0 ? "-" : ""

  if (abs >= 1e18) return sign + (abs / 1e18).toFixed(2) + "Qi"
  if (abs >= 1e15) return sign + (abs / 1e15).toFixed(2) + "Q"
  if (abs >= 1e12) return sign + (abs / 1e12).toFixed(2) + "T"
  if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B"
  if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M"

  return formatNumber(num)
}

const parseNonNegativeNumber = (value: string): number | null => {
  const normalized = value.replace(/,/g, "").trim()
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

const getContributionPerFacility = (
  planetType: PlanetType,
  planetSize: PlanetSize,
) => {
  const sizeMultiplier = PLANET_SIZES[planetSize].multiplier
  const config = PLANET_TYPES[planetType]

  if (planetType === "unitProduction") {
    return 1 + sizeMultiplier / 10
  }

  return sizeMultiplier * (config.constant ?? 0)
}

const getFacilitiesFromContribution = (
  contribution: number,
  planetType: PlanetType,
  planetSize: PlanetSize,
) => {
  const contributionPerFacility = getContributionPerFacility(planetType, planetSize)

  if (contributionPerFacility <= 0) {
    return 0
  }

  return Math.max(0, Math.ceil(contribution / contributionPerFacility))
}

const getContributionFromFacilities = (
  facilities: number,
  planetType: PlanetType,
  planetSize: PlanetSize,
) => {
  const contribution = facilities * getContributionPerFacility(planetType, planetSize)

  if (planetType === "unitProduction") {
    return Math.round(contribution)
  }

  return contribution
}

const getTotalUpgradeCost = (
  currentFacilities: number,
  targetFacilities: number,
  costIncrement: number,
  costLevelOffset: number,
) => {
  const upgradesToBuy = targetFacilities - currentFacilities
  const firstUpgradeCost = (currentFacilities + costLevelOffset) * costIncrement
  const finalUpgradeCost =
    (targetFacilities - 1 + costLevelOffset) * costIncrement

  return (upgradesToBuy / 2) * (firstUpgradeCost + finalUpgradeCost)
}

function ResultRow({
  label,
  value,
  delta,
  kind = "base",
}: {
  label: string
  value: number
  delta?: number
  kind?: "base" | "positive"
}) {
  const displayValue =
    kind === "positive" && value !== 0
      ? `+${formatCompact(value)}`
      : formatCompact(value)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-b border-border/60 py-2 last:border-b-0">
      <div className="min-w-0 text-sm text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-right text-sm font-semibold",
          kind === "positive" && value !== 0 ? "text-green-600" : undefined,
        )}
        title={formatNumber(value)}
      >
        {displayValue}
        {delta !== undefined && delta !== 0 ? (
          <span className="ml-1 text-green-600" title={formatNumber(delta)}>
            (+{formatCompact(delta)})
          </span>
        ) : null}
      </div>
    </div>
  )
}

interface CalculatorProps {
  defaultOpen?: boolean
  displayMode?: "accordion" | "standalone"
}

export function PlanetUpgradeCalculator({
  defaultOpen = false,
  displayMode = "accordion",
}: CalculatorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const isStandalone = displayMode === "standalone"
  const isExpanded = isStandalone || isOpen
  const [planetType, setPlanetType] = useState<PlanetType>("attack")
  const [planetSize, setPlanetSize] = useState<PlanetSize>("mindblowing")
  const [currentContribution, setCurrentContribution] = useState("")
  const [desiredContribution, setDesiredContribution] = useState("")
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedTotal, setCopiedTotal] = useState(false)

  const config = PLANET_TYPES[planetType]
  const sizeConfig = PLANET_SIZES[planetSize]

  const calculate = () => {
    setError(null)

    const current = parseNonNegativeNumber(currentContribution)
    const desired = parseNonNegativeNumber(desiredContribution)

    if (current === null || desired === null) {
      setError("Enter valid non-negative current and desired contributions.")
      setResults(null)
      return
    }

    const currentFacilities = getFacilitiesFromContribution(
      current,
      planetType,
      planetSize,
    )
    const targetFacilities = getFacilitiesFromContribution(
      desired,
      planetType,
      planetSize,
    )
    if (targetFacilities <= currentFacilities) {
      setError("Desired contribution must exceed current contribution.")
      setResults(null)
      return
    }

    const normalizedCurrent = getContributionFromFacilities(
      currentFacilities,
      planetType,
      planetSize,
    )
    const normalizedDesired = getContributionFromFacilities(
      targetFacilities,
      planetType,
      planetSize,
    )
    setCurrentContribution(formatNumber(normalizedCurrent))
    setDesiredContribution(formatNumber(normalizedDesired))

    const upgradesToBuy = targetFacilities - currentFacilities
    const finalFacilities = currentFacilities + upgradesToBuy
    const projectedContribution = getContributionFromFacilities(
      finalFacilities,
      planetType,
      planetSize,
    )

    setResults({
      currentFacilities,
      finalFacilities,
      upgradesToBuy,
      totalCost: getTotalUpgradeCost(
        currentFacilities,
        finalFacilities,
        config.costIncrement,
        config.costLevelOffset,
      ),
      projectedContribution,
      contributionIncrease: Math.max(projectedContribution - current, 0),
    })
  }

  const handlePlanetTypeChange = (value: PlanetType | null) => {
    if (!value) {
      return
    }

    setPlanetType(value)
    setCurrentContribution("")
    setDesiredContribution("")
    setError(null)
    setResults(null)
  }

  const handlePlanetSizeChange = (value: PlanetSize | null) => {
    if (!value) {
      return
    }

    setPlanetSize(value)
    setCurrentContribution("")
    setDesiredContribution("")
    setError(null)
    setResults(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    calculate()
  }

  const copyTotalCost = async () => {
    if (!results) {
      return
    }

    await navigator.clipboard.writeText(String(results.totalCost))
    setCopiedTotal(true)
    window.setTimeout(() => setCopiedTotal(false), 1500)
  }

  const handleTotalKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      void copyTotalCost()
    }
  }

  const description =
    "Calculate planet facility upgrades from current and desired contribution."
  const disclaimer =
    "All planet type/size values should be correct (AFAIK) except very minor inaccuracies for unit production. Planets are annoying to test everything on."
  const disclaimerContent = (
    <p className="mt-1 text-xs text-amber-100/80">
      <span className="font-semibold text-amber-100">Note:</span>{" "}
      {disclaimer}
    </p>
  )

  const projectedLabel =
    planetType === "income"
      ? "Projected Planet Income"
      : "Projected Planet Contribution"

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid items-start gap-y-4 sm:grid-cols-2 sm:gap-x-8">
        <div className="flex flex-col gap-2">
          <Label htmlFor="planet-type">Planet Type</Label>
          <Select value={planetType} onValueChange={handlePlanetTypeChange}>
            <SelectTrigger id="planet-type" className="w-full">
              <SelectValue placeholder="Select planet type">
                {config.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              side="bottom"
              alignItemWithTrigger={false}
              collisionAvoidance={{ side: "none" }}
            >
              {Object.entries(PLANET_TYPES).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="planet-size">Planet Size</Label>
          <Select value={planetSize} onValueChange={handlePlanetSizeChange}>
            <SelectTrigger id="planet-size" className="w-full">
              <SelectValue placeholder="Select planet size">
                {sizeConfig.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              side="bottom"
              alignItemWithTrigger={false}
              collisionAvoidance={{ side: "none" }}
            >
              {Object.entries(PLANET_SIZES).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid items-start gap-y-4 sm:grid-cols-2 sm:gap-x-8">
        <div className="flex flex-col gap-2">
          <Label htmlFor="current-contribution">
            Current Planet Contribution
          </Label>
          <Input
            id="current-contribution"
            type="text"
            value={currentContribution}
            onChange={(e) => setCurrentContribution(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="desired-contribution">
            Desired Planet Contribution
          </Label>
          <Input
            id="desired-contribution"
            type="text"
            value={desiredContribution}
            onChange={(e) => setDesiredContribution(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <Button type="submit" className="w-full">
        Calculate
      </Button>

      {results ? (
        <div className="grid items-stretch gap-4 border-t pt-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <ResultRow
              label={config.facilitiesLabel}
              value={results.finalFacilities}
              delta={results.upgradesToBuy}
            />
            <ResultRow
              label="Upgrades to Buy"
              value={results.upgradesToBuy}
            />
            <ResultRow
              label="Contribution Increase"
              value={results.contributionIncrease}
              kind="positive"
            />
          </div>

          <div className="flex flex-col gap-4 self-start">
            <div
              className="relative min-h-20 cursor-pointer rounded-lg bg-muted/30 p-4 ring-1 ring-border transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              onClick={() => void copyTotalCost()}
              onKeyDown={handleTotalKeyDown}
              role="button"
              tabIndex={0}
              title={`Copy ${results.totalCost}`}
            >
              <div className="max-w-[calc(100%-6rem)]">
                <div className="mb-1 text-sm text-muted-foreground">
                  Total Cost
                </div>
                <div
                  className="text-2xl font-bold"
                  title={formatNumber(results.totalCost)}
                >
                  {formatCompact(results.totalCost)}
                </div>
                <div className="absolute right-4 top-4 flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  {copiedTotal ? (
                    <>
                      <Check className="size-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Copy raw
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20">
              <div className="mb-1 text-sm text-muted-foreground">
                {projectedLabel}
              </div>
              <div
                className="text-2xl font-bold"
                title={formatNumber(results.projectedContribution)}
              >
                {formatCompact(results.projectedContribution)}
                {results.contributionIncrease > 0 ? (
                  <span
                    className="ml-2 text-lg text-green-600"
                    title={formatNumber(results.contributionIncrease)}
                  >
                    (+{formatCompact(results.contributionIncrease)})
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  )

  if (isStandalone) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">{description}</p>
          {disclaimerContent}
        </div>
        {formContent}
      </div>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="cursor-pointer select-none">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <CardTitle>Planet Upgrades</CardTitle>
                <CardDescription>{description}</CardDescription>
                {isExpanded ? disclaimerContent : null}
              </div>
              {isExpanded ? (
                <ChevronUp className="size-5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">{formContent}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
