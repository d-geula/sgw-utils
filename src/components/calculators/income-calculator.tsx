import { type FormEvent, type KeyboardEvent, useState } from "react"
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createDefaultPlanetContributions,
  getPlanetContributionSummary,
  type PlanetContributionSummary,
} from "@/components/calculators/planet-contributions"
import {
  PlanetContributionsInput,
} from "@/components/calculators/planet-contributions-input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type AlertLevel = "none" | "low" | "medium" | "high" | "critical"

interface CalculationResults {
  baseIncome: number
  adsBonus: number
  raceBonus: number
  planetContribution: number
  houseBonus: number
  incomePenalty: number
  commanderBonus: number
  totalPerTurn: number
  totalPerDay: number
  totalPerPpt: number
  difference: number | null
}

interface AlertOption {
  label: string
  value: AlertLevel
  penalty: number
}

interface CalculatorProps {
  defaultOpen?: boolean
  displayMode?: "accordion" | "standalone"
}

const UNTRAINED_INCOME = 20
const MINER_INCOME = 80
const TURNS_PER_DAY = 48
const DAYS_PER_PPT = 2

const ALERT_OPTIONS: AlertOption[] = [
  { label: "None", value: "none", penalty: 0 },
  { label: "Low", value: "low", penalty: 0.1 },
  { label: "Medium", value: "medium", penalty: 0.2 },
  { label: "High", value: "high", penalty: 0.4 },
  { label: "Critical", value: "critical", penalty: 0.5 },
]

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
  if (abs >= 1e3) return sign + (abs / 1e3).toFixed(2) + "K"

  return formatNumber(num)
}

const formatSmart = (num: number): string => {
  if (Math.abs(num) >= 1e9) {
    return formatCompact(num)
  }

  return formatNumber(num)
}

const parseNonNegativeNumberOrZero = (value: string): number | null => {
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

const getAlertPenalty = (alertLevel: AlertLevel): number => {
  return (
    ALERT_OPTIONS.find((option) => option.value === alertLevel)?.penalty ?? 0
  )
}

function CheckboxToggle({
  id,
  label,
  detail,
  checked,
  onChange,
}: {
  id: string
  label: string
  detail: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Label
      htmlFor={id}
      className={cn(
        "dark:bg-input/30 flex cursor-pointer items-center gap-3 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] hover:text-foreground",
        checked
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded border",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input bg-background",
        )}
      >
        {checked ? <Check /> : null}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-medium leading-none">{label}</span>
        <span className="mt-1 text-xs text-muted-foreground">{detail}</span>
      </span>
    </Label>
  )
}

function ResultRow({
  label,
  value,
  kind = "positive",
  description,
}: {
  label: string
  value: number
  kind?: "base" | "positive" | "negative"
  description?: string
}) {
  const signedValue =
    kind === "base" || value === 0
      ? formatSmart(value)
      : `${kind === "negative" ? "-" : "+"}${formatSmart(value)}`

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-b border-border/60 py-2 last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm text-muted-foreground">{label}</div>
        {description ? (
          <div className="mt-1 text-xs text-destructive">
            {description}
          </div>
        ) : null}
      </div>
      <div className="text-right">
        <div
          className={cn(
            "text-sm font-semibold",
            kind === "negative" && value > 0 ? "text-destructive" : undefined,
          )}
          title={formatNumber(value)}
        >
          {signedValue}
        </div>
      </div>
    </div>
  )
}

export function IncomeCalculator({
  defaultOpen = false,
  displayMode = "accordion",
}: CalculatorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const isStandalone = displayMode === "standalone"
  const [untrainedUnits, setUntrainedUnits] = useState("")
  const [miners, setMiners] = useState("")
  const [raceBonusPercent, setRaceBonusPercent] = useState("")
  const [planetContributions, setPlanetContributions] = useState(() =>
    createDefaultPlanetContributions(),
  )
  const [currentIncome, setCurrentIncome] = useState("")
  const [hasAds, setHasAds] = useState(false)
  const [hasHouseBonus, setHasHouseBonus] = useState(false)
  const [hasNoCommanderBonus, setHasNoCommanderBonus] = useState(false)
  const [hasNoxPenalty, setHasNoxPenalty] = useState(false)
  const [alertLevel, setAlertLevel] = useState<AlertLevel>("none")
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedTotal, setCopiedTotal] = useState(false)
  const selectedAlertOption =
    ALERT_OPTIONS.find((option) => option.value === alertLevel) ??
    ALERT_OPTIONS[0]
  const displayUntrained = parseNonNegativeNumberOrZero(untrainedUnits) ?? 0
  const displayMiners = parseNonNegativeNumberOrZero(miners) ?? 0
  const displayRaceBonus = parseNonNegativeNumberOrZero(raceBonusPercent) ?? 0
  const displayBaseIncome =
    displayUntrained * UNTRAINED_INCOME + displayMiners * MINER_INCOME
  const displayAdsBonus = hasAds ? displayBaseIncome * 0.01 : 0
  const displayPlanetContributionCap =
    displayBaseIncome +
    displayAdsBonus +
    (displayBaseIncome + displayAdsBonus) * (displayRaceBonus / 100)

  const calculate = () => {
    setError(null)

    const parsedUntrained = parseNonNegativeNumberOrZero(untrainedUnits)
    const parsedMiners = parseNonNegativeNumberOrZero(miners)
    const parsedRaceBonus = parseNonNegativeNumberOrZero(raceBonusPercent)
    const parsedCurrentIncome = currentIncome.trim()
      ? parseNonNegativeNumberOrZero(currentIncome)
      : undefined

    if (
      parsedUntrained === null ||
      parsedMiners === null ||
      parsedRaceBonus === null ||
      parsedCurrentIncome === null
    ) {
      setError("Enter valid non-negative numbers.")
      setResults(null)
      return
    }

    const baseIncome =
      parsedUntrained * UNTRAINED_INCOME + parsedMiners * MINER_INCOME
    const rawAdsBonus = hasAds ? baseIncome * 0.01 : 0
    const rawRaceBonus =
      (baseIncome + rawAdsBonus) * (parsedRaceBonus / 100)
    const planetContributionCap = baseIncome + rawAdsBonus + rawRaceBonus
    const planetContributionSummary: PlanetContributionSummary | null =
      getPlanetContributionSummary(
        planetContributions,
        planetContributionCap,
        TURNS_PER_DAY,
      )

    if (planetContributionSummary === null) {
      setError("Enter valid non-negative numbers.")
      setResults(null)
      return
    }

    const rawPlanetContribution =
      planetContributionSummary.effectiveTotal
    const houseBonusBase =
      baseIncome + rawAdsBonus + rawRaceBonus + rawPlanetContribution
    const rawHouseBonus = hasHouseBonus ? houseBonusBase * 0.1 : 0
    const penaltyRate =
      getAlertPenalty(alertLevel) + (hasNoxPenalty ? 0.1 : 0)
    const rawIncomePenalty =
      (houseBonusBase + rawHouseBonus) * penaltyRate
    const commanderBonusBase =
      houseBonusBase + rawHouseBonus - rawIncomePenalty
    const rawCommanderBonus = hasNoCommanderBonus
      ? commanderBonusBase * 0.1
      : 0
    const rawTotalPerTurn =
      baseIncome +
      rawAdsBonus +
      rawRaceBonus +
      rawPlanetContribution +
      rawHouseBonus +
      rawCommanderBonus -
      rawIncomePenalty
    const totalPerTurn = Math.round(rawTotalPerTurn)
    const totalPerDay = Math.round(rawTotalPerTurn * TURNS_PER_DAY)
    const totalPerPpt = Math.round(rawTotalPerTurn * TURNS_PER_DAY * DAYS_PER_PPT)

    setResults({
      baseIncome,
      adsBonus: Math.round(rawAdsBonus),
      raceBonus: Math.round(rawRaceBonus),
      planetContribution: Math.round(rawPlanetContribution),
      houseBonus: Math.round(rawHouseBonus),
      incomePenalty: Math.round(rawIncomePenalty),
      commanderBonus: Math.round(rawCommanderBonus),
      totalPerTurn,
      totalPerDay,
      totalPerPpt,
      difference:
        parsedCurrentIncome === undefined
          ? null
          : totalPerTurn - parsedCurrentIncome,
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    calculate()
  }

  const copyTotalPerTurn = async () => {
    if (!results) {
      return
    }

    await navigator.clipboard.writeText(String(results.totalPerTurn))
    setCopiedTotal(true)
    window.setTimeout(() => setCopiedTotal(false), 1500)
  }

  const handleTotalKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      void copyTotalPerTurn()
    }
  }

  const description =
    "Calculate income per turn, day, and PPT from units and bonuses."
  const disclaimer = ""
  const disclaimerContent = disclaimer ? (
    <p className="mt-1 text-xs text-amber-100/80">
      <span className="font-semibold text-amber-100">Disclaimer:</span>{" "}
      {disclaimer}
    </p>
  ) : null

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid items-start gap-y-4 sm:grid-cols-2 sm:gap-x-8">
        <div className="flex flex-col gap-2">
          <Label htmlFor="income-untrained-units">
            Untrained Units
          </Label>
          <Input
            id="income-untrained-units"
            type="text"
            value={untrainedUnits}
            onChange={(event) => setUntrainedUnits(event.target.value)}
            placeholder="20 Naq / unit"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="income-miners">Miners/Lifers</Label>
          <Input
            id="income-miners"
            type="text"
            value={miners}
            onChange={(event) => setMiners(event.target.value)}
            placeholder="80 Naq / unit"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="income-race-bonus">Race Bonus (%)</Label>
          <Input
            id="income-race-bonus"
            type="text"
            value={raceBonusPercent}
            onChange={(event) =>
              setRaceBonusPercent(event.target.value)
            }
            placeholder="0"
          />
        </div>

        <PlanetContributionsInput
          id="income-planet-contributions"
          values={planetContributions}
          cap={displayPlanetContributionCap}
          valueDivisor={TURNS_PER_DAY}
          description="Enter each planet's daily income contribution. Values are automatically converted to per-turn income."
          capLabel="Per-planet cap"
          capValueSuffix=" / day"
          rawTotalLabel="Raw total"
          rawTotalValueSuffix=" / day"
          onChange={setPlanetContributions}
          formatNumber={formatNumber}
          formatCompact={formatSmart}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="income-alert-level">Realm Alert Level</Label>
          <Select
            value={alertLevel}
            onValueChange={(value) =>
              setAlertLevel(value as AlertLevel)
            }
          >
            <SelectTrigger id="income-alert-level" className="w-full">
              <SelectValue>{selectedAlertOption.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {ALERT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="income-current-income">
            Current Income (Optional)
          </Label>
          <Input
            id="income-current-income"
            type="text"
            value={currentIncome}
            onChange={(event) => setCurrentIncome(event.target.value)}
            placeholder="Optional comparison value"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CheckboxToggle
          id="income-ads"
          label="Ads"
          detail="+1%"
          checked={hasAds}
          onChange={setHasAds}
        />
        <CheckboxToggle
          id="income-house-bonus"
          label="House"
          detail="+10%"
          checked={hasHouseBonus}
          onChange={setHasHouseBonus}
        />
        <CheckboxToggle
          id="income-no-commander"
          label="No Commander"
          detail="+10%"
          checked={hasNoCommanderBonus}
          onChange={setHasNoCommanderBonus}
        />
        <CheckboxToggle
          id="income-nox"
          label="NOX"
          detail="-10%"
          checked={hasNoxPenalty}
          onChange={setHasNoxPenalty}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" className="w-full">
        Calculate
      </Button>

      {results ? (
        <div className="grid items-stretch gap-4 border-t pt-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <ResultRow
              label="Base Income"
              value={results.baseIncome}
              kind="base"
            />
            <ResultRow label="Ads" value={results.adsBonus} />
            <ResultRow label="Race Bonus" value={results.raceBonus} />
            <ResultRow
              label="Planet Contribution"
              value={results.planetContribution}
            />
            <ResultRow label="House Bonus" value={results.houseBonus} />
            <ResultRow
              label="Realm Alert/NOX"
              value={results.incomePenalty}
              kind="negative"
            />
            <ResultRow
              label="No Commander"
              value={results.commanderBonus}
            />
          </div>

          <div className="flex h-full flex-col gap-3">
            <div
              className="flex flex-1 cursor-pointer rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20"
              onClick={() => {
                void copyTotalPerTurn()
              }}
              onKeyDown={handleTotalKeyDown}
              role="button"
              tabIndex={0}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 text-sm text-muted-foreground">
                    Total / Turn
                  </div>
                  <div
                    className="text-2xl font-bold"
                    title={`${formatNumber(results.totalPerTurn)} (click to copy raw)`}
                  >
                    {formatSmart(results.totalPerTurn)}
                    {results.difference !== null ? (
                      <span
                        className={cn(
                          "ml-2 text-lg",
                          results.difference >= 0
                            ? "text-green-500"
                            : "text-destructive",
                        )}
                        title={formatNumber(results.difference)}
                      >
                        ({results.difference >= 0 ? "+" : ""}
                        {formatSmart(results.difference)})
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  {copiedTotal ? (
                    <>
                      <Check />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy />
                      Copy raw
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid flex-[2] gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-lg bg-muted/30 p-4">
                <div className="mb-1 text-sm text-muted-foreground">
                  Total / Day
                </div>
                <div
                  className="text-xl font-bold"
                  title={formatNumber(results.totalPerDay)}
                >
                  {formatSmart(results.totalPerDay)}
                </div>
              </div>

              <div className="rounded-lg bg-muted/30 p-4">
                <div className="mb-1 text-sm text-muted-foreground">
                  Total / PPT
                </div>
                <div
                  className="text-xl font-bold"
                  title={formatNumber(results.totalPerPpt)}
                >
                  {formatSmart(results.totalPerPpt)}
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
                <CardTitle>Income Calculator</CardTitle>
                <CardDescription>{description}</CardDescription>
                {isOpen ? disclaimerContent : null}
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
          <CardContent>
            {formContent}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
