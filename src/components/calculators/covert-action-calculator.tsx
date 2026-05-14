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
import {
  createDefaultPlanetContributions,
  getPlanetContributionSummary,
  type PlanetContributionKind,
  type PlanetContributionSummary,
} from "@/components/calculators/planet-contributions"
import {
  PlanetContributionsInput,
} from "@/components/calculators/planet-contributions-input"

interface CalculationResults {
  totalAction: number
  difference: number | null
  baseAction: number
  techBonusAction: number
  raceBonusAction: number
  planetContributionAction: number
  modifierBonusAction: number
}

const FINAL_MODIFIER = 2

const TECH_BONUS_OPTIONS = {
  none: { label: "None", multiplier: 1 },
  tier1: { label: "Tier 1", multiplier: 1.2 },
  tier2: { label: "Tier 2", multiplier: 1.56 },
} as const

type TechBonusKey = keyof typeof TECH_BONUS_OPTIONS

interface ActionCalculatorConfig {
  title: string
  description: string
  disclaimer?: string
  unitLabel: string
  unitPlaceholder: string
  levelLabel: string
  levelPlaceholder: string
  currentLabel: string
  currentPlaceholder: string
  totalLabel: string
  baseLabel: string
  planetContributionKind: PlanetContributionKind
  fieldIdPrefix: string
  getBaseAction: (units: number, level: number) => number
}

interface CalculatorProps {
  defaultOpen?: boolean
  displayMode?: "accordion" | "standalone"
}

const formatNumber = (num: number): string => {
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

const formatCompact = (num: number): string => {
  const abs = Math.abs(num)
  const sign = num < 0 ? "-" : ""

  if (abs >= 1e15) return sign + (abs / 1e15).toFixed(2) + "Q"
  if (abs >= 1e12) return sign + (abs / 1e12).toFixed(2) + "T"
  if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B"
  if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M"
  if (abs >= 1e3) return sign + (abs / 1e3).toFixed(2) + "K"

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

const parseNonNegativeNumberOrZero = (value: string): number | null => {
  const normalized = value.replace(/,/g, "").trim()
  if (!normalized) {
    return 0
  }

  return parseNonNegativeNumber(value)
}

function ResultRow({
  label,
  value,
  kind = "base",
}: {
  label: string
  value: number
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
      </div>
    </div>
  )
}

function ActionCalculator({
  config,
  defaultOpen = false,
  displayMode = "accordion",
}: {
  config: ActionCalculatorConfig
  defaultOpen?: boolean
  displayMode?: "accordion" | "standalone"
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const isStandalone = displayMode === "standalone"
  const [units, setUnits] = useState("")
  const [level, setLevel] = useState("")
  const [techBonus, setTechBonus] = useState<TechBonusKey>("none")
  const [raceBonusPercent, setRaceBonusPercent] = useState("")
  const [planetContributions, setPlanetContributions] = useState(() =>
    createDefaultPlanetContributions(),
  )
  const [currentAction, setCurrentAction] = useState("")
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedTotal, setCopiedTotal] = useState(false)
  const displayUnits = parseNonNegativeNumberOrZero(units) ?? 0
  const displayLevel = parseNonNegativeNumberOrZero(level) ?? 0
  const displayRaceBonus = parseNonNegativeNumberOrZero(raceBonusPercent) ?? 0
  const displayBaseAction = config.getBaseAction(displayUnits, displayLevel)
  const displayTechMultiplier = TECH_BONUS_OPTIONS[techBonus].multiplier
  const displayTechBonusAction =
    displayBaseAction * (displayTechMultiplier - 1)
  const displayRaceBonusAction =
    (displayBaseAction + displayTechBonusAction) * (displayRaceBonus / 100)
  const displayModifiedAction =
    (displayBaseAction +
      displayTechBonusAction +
      displayRaceBonusAction +
      displayUnits) *
    FINAL_MODIFIER
  const displayPlanetContributionCap =
    displayModifiedAction / 2

  const calculate = () => {
    setError(null)

    const parsedUnits = parseNonNegativeNumber(units)
    const parsedLevel = parseNonNegativeNumber(level)

    if (parsedUnits === null || parsedLevel === null) {
      setError(
        `Enter valid non-negative numbers for ${config.unitLabel.toLowerCase()} and ${config.levelLabel.toLowerCase()}.`,
      )
      setResults(null)
      return
    }

    const parsedRaceBonus = parseNonNegativeNumber(raceBonusPercent)
    const raceBonusValue = parsedRaceBonus ?? 0

    if (parsedRaceBonus === null && raceBonusPercent.trim()) {
      setError("Race bonus must be a non-negative percentage.")
      setResults(null)
      return
    }

    const parsedCurrentAction = parseNonNegativeNumber(currentAction)
    if (parsedCurrentAction === null && currentAction.trim()) {
      setError("Current action must be a non-negative number.")
      setResults(null)
      return
    }

    const baseAction = config.getBaseAction(parsedUnits, parsedLevel)

    const techMultiplier = TECH_BONUS_OPTIONS[techBonus].multiplier
    const techBonusAction = baseAction * (techMultiplier - 1)
    const raceBonusAction = (baseAction + techBonusAction) * (raceBonusValue / 100)
    const modifiedAction =
      (baseAction + techBonusAction + raceBonusAction + parsedUnits) *
      FINAL_MODIFIER
    const planetContributionCap = modifiedAction / 2
    const planetContributionSummary: PlanetContributionSummary | null =
      getPlanetContributionSummary(
        planetContributions,
        planetContributionCap,
      )

    if (planetContributionSummary === null) {
      setError("Enter valid non-negative numbers.")
      setResults(null)
      return
    }

    const planetContributionAction = planetContributionSummary.effectiveTotal
    const totalAction = Math.floor(
      modifiedAction + planetContributionAction,
    )
    const modifierBonusAction =
      totalAction -
      baseAction -
      techBonusAction -
      raceBonusAction -
      planetContributionAction

    const difference =
      parsedCurrentAction === null ? null : totalAction - parsedCurrentAction

    setResults({
      totalAction,
      difference,
      baseAction,
      techBonusAction,
      raceBonusAction,
      planetContributionAction,
      modifierBonusAction,
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    calculate()
  }

  const copyTotalAction = async () => {
    if (!results) {
      return
    }

    await navigator.clipboard.writeText(String(results.totalAction))
    setCopiedTotal(true)
    window.setTimeout(() => setCopiedTotal(false), 1500)
  }

  const handleTotalKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      void copyTotalAction()
    }
  }

  const disclaimer = config.disclaimer ? (
    <p className="mt-1 text-xs text-amber-100/80">
      <span className="font-semibold text-amber-100">Disclaimer:</span>{" "}
      {config.disclaimer}
    </p>
  ) : null

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid items-start gap-y-4 sm:grid-cols-2 sm:gap-x-8">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${config.fieldIdPrefix}-units`}>
                    {config.unitLabel}
                  </Label>
                  <Input
                    id={`${config.fieldIdPrefix}-units`}
                    type="text"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    placeholder={config.unitPlaceholder}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${config.fieldIdPrefix}-level`}>
                    {config.levelLabel}
                  </Label>
                  <Input
                    id={`${config.fieldIdPrefix}-level`}
                    type="text"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    placeholder={config.levelPlaceholder}
                  />
                </div>
              </div>

              <div className="grid items-start gap-y-4 sm:grid-cols-2 sm:gap-x-8">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${config.fieldIdPrefix}-tech-bonus`}>
                    Tech Bonus
                  </Label>
                  <Select
                    value={techBonus}
                    onValueChange={(value) =>
                      setTechBonus(value as TechBonusKey)
                    }
                  >
                    <SelectTrigger
                      id={`${config.fieldIdPrefix}-tech-bonus`}
                      className="w-full"
                    >
                      <SelectValue placeholder="Select tech bonus">
                        {TECH_BONUS_OPTIONS[techBonus].label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent
                      side="bottom"
                      alignItemWithTrigger={false}
                      collisionAvoidance={{ side: "none" }}
                    >
                      {Object.entries(TECH_BONUS_OPTIONS).map(
                        ([key, option]) => (
                          <SelectItem key={key} value={key}>
                            {option.label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <PlanetContributionsInput
                  id={`${config.fieldIdPrefix}-planet-contributions`}
                  values={planetContributions}
                  cap={displayPlanetContributionCap}
                  kind={config.planetContributionKind}
                  description={`Enter each planet's ${config.planetContributionKind} contribution.`}
                  onChange={setPlanetContributions}
                  formatNumber={formatNumber}
                  formatCompact={formatCompact}
                />
              </div>

              <div className="grid items-start gap-y-4 sm:grid-cols-2 sm:gap-x-8">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${config.fieldIdPrefix}-race-bonus`}>
                    Race Bonus (%)
                  </Label>
                  <Input
                    id={`${config.fieldIdPrefix}-race-bonus`}
                    type="text"
                    value={raceBonusPercent}
                    onChange={(e) => setRaceBonusPercent(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${config.fieldIdPrefix}-current-action`}>
                    {config.currentLabel}
                  </Label>
                  <Input
                    id={`${config.fieldIdPrefix}-current-action`}
                    type="text"
                    value={currentAction}
                    onChange={(e) => setCurrentAction(e.target.value)}
                    placeholder={config.currentPlaceholder}
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
                    <ResultRow label={config.baseLabel} value={results.baseAction} />
                    <ResultRow
                      label="Tech Bonus"
                      value={results.techBonusAction}
                      kind="positive"
                    />
                    <ResultRow
                      label="Race Bonus"
                      value={results.raceBonusAction}
                      kind="positive"
                    />
                    <ResultRow
                      label="Modifier Bonus"
                      value={results.modifierBonusAction}
                      kind="positive"
                    />
                    <ResultRow
                      label="Planet Contribution"
                      value={results.planetContributionAction}
                      kind="positive"
                    />
                  </div>

                  <div className="self-start">
                    <div
                      className="relative min-h-24 cursor-pointer rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20 transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      onClick={() => void copyTotalAction()}
                      onKeyDown={handleTotalKeyDown}
                      role="button"
                      tabIndex={0}
                      title={`Copy ${results.totalAction}`}
                    >
                      <div className="max-w-[calc(100%-6rem)]">
                        <div className="min-w-0">
                          <div className="mb-1 text-sm text-muted-foreground">
                            {config.totalLabel}
                          </div>
                          <div
                            className="text-2xl font-bold"
                            title={formatNumber(results.totalAction)}
                          >
                            {formatCompact(results.totalAction)}
                            {results.difference !== null ? (
                              <span
                                className={`ml-2 text-lg ${results.difference >= 0 ? "text-green-600" : "text-destructive"}`}
                                title={formatNumber(results.difference)}
                              >
                                ({results.difference >= 0 ? "+" : ""}
                                {formatCompact(results.difference)})
                              </span>
                            ) : null}
                          </div>
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
                  </div>
                </div>
              ) : null}
            </form>
  )

  if (isStandalone) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">{config.description}</p>
          {disclaimer}
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
                <CardTitle>{config.title}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
                {isOpen ? disclaimer : null}
              </div>
              {isOpen ? (
                <ChevronUp className="size-5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {formContent}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

export function CovertActionCalculator({
  defaultOpen = false,
  displayMode,
}: CalculatorProps) {
  return (
    <ActionCalculator
      defaultOpen={defaultOpen}
      displayMode={displayMode}
      config={{
        title: "Covert Action",
        description:
          "Calculate covert action from spies, covert level, tech bonus, and race bonus.",
        disclaimer: "",
        unitLabel: "Spies",
        unitPlaceholder: "0",
        levelLabel: "Covert Level",
        levelPlaceholder: "0",
        currentLabel: "Current Covert Action (Optional)",
        currentPlaceholder: "Optional comparison value",
        totalLabel: "Total Covert",
        baseLabel: "Base Covert",
        planetContributionKind: "covert",
        fieldIdPrefix: "covert",
        getBaseAction: (spies, covertLevel) => spies * 2 ** (covertLevel / 2),
      }}
    />
  )
}

export function AntiCovertActionCalculator({
  defaultOpen = false,
  displayMode,
}: CalculatorProps) {
  return (
    <ActionCalculator
      defaultOpen={defaultOpen}
      displayMode={displayMode}
      config={{
        title: "Anti-Covert Action",
        description:
          "Calculate anti-covert action from spykillers, AC level, tech bonus, and race bonus.",
        disclaimer: "",
        unitLabel: "Spykillers",
        unitPlaceholder: "0",
        levelLabel: "AC Level",
        levelPlaceholder: "0",
        currentLabel: "Current Anti-Covert Action (Optional)",
        currentPlaceholder: "Optional comparison value",
        totalLabel: "Total Anti-Covert",
        baseLabel: "Base AC",
        planetContributionKind: "anti-covert",
        fieldIdPrefix: "anti-covert",
        getBaseAction: (spykillers, acLevel) =>
          spykillers * 2 * 2 ** (acLevel / 2),
      }}
    />
  )
}
