import { type FormEvent, type KeyboardEvent, useState } from "react"
import { Check, ChevronDown, ChevronUp, Copy } from "lucide-react"
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
}

interface TechBonusOption {
  label: string
  bonusNumerator: number
  bonusDenominator: number
}

type TechBonusKey = "none" | "tier1" | "tier2"

const NON_ASCENDED_WEAPON_STRENGTH = 2560

interface WeaponActionCalculatorConfig {
  title: string
  description: string
  disclaimer?: string
  weaponStrength: number
  techBonusOptions: Record<TechBonusKey, TechBonusOption>
  currentLabel: string
  currentPlaceholder: string
  totalLabel: string
  baseLabel: string
  planetContributionKind: PlanetContributionKind
  fieldIdPrefix: string
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

const getBaseAction = (
  normalUnits: number,
  superUnits: number,
  weapons: number,
  weaponStrength: number,
) => {
  const superWeaponCount = Math.min(superUnits, weapons)
  const normalWeaponCount = Math.min(normalUnits, Math.max(weapons - superUnits, 0))

  return (
    superWeaponCount * weaponStrength * 20 +
    normalWeaponCount * weaponStrength * 10
  )
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
        className="text-right text-sm font-semibold"
        title={formatNumber(value)}
      >
        {displayValue}
      </div>
    </div>
  )
}

function CheckboxToggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Label
      htmlFor={id}
      className={cn(
        "dark:bg-input/30 flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs transition-[color,box-shadow] hover:text-foreground",
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
          "flex size-4 shrink-0 items-center justify-center rounded border [&>svg]:size-3.5",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input bg-background",
        )}
      >
        {checked ? <Check /> : null}
      </span>
      <span className="font-medium leading-none">{label}</span>
    </Label>
  )
}

function WeaponActionCalculator({
  config,
  defaultOpen = false,
  displayMode = "accordion",
}: {
  config: WeaponActionCalculatorConfig
  defaultOpen?: boolean
  displayMode?: "accordion" | "standalone"
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const isStandalone = displayMode === "standalone"
  const isExpanded = isStandalone || isOpen
  const [normalUnits, setNormalUnits] = useState("")
  const [superUnits, setSuperUnits] = useState("")
  const [weapons, setWeapons] = useState("")
  const [isAscended, setIsAscended] = useState(true)
  const [techBonus, setTechBonus] = useState<TechBonusKey>("none")
  const [raceBonusPercent, setRaceBonusPercent] = useState("")
  const [planetContributions, setPlanetContributions] = useState(() =>
    createDefaultPlanetContributions(),
  )
  const [currentAction, setCurrentAction] = useState("")
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedTotal, setCopiedTotal] = useState(false)
  const displayNormalUnits = parseNonNegativeNumberOrZero(normalUnits) ?? 0
  const displaySuperUnits = parseNonNegativeNumberOrZero(superUnits) ?? 0
  const displayWeapons = parseNonNegativeNumberOrZero(weapons) ?? 0
  const displayRaceBonus = parseNonNegativeNumberOrZero(raceBonusPercent) ?? 0
  const displayWeaponStrength = isAscended
    ? config.weaponStrength
    : NON_ASCENDED_WEAPON_STRENGTH
  const displayBaseAction = getBaseAction(
    displayNormalUnits,
    displaySuperUnits,
    displayWeapons,
    displayWeaponStrength,
  )
  const displayTechBonusOption = config.techBonusOptions[techBonus]
  const displayTechBonusAction =
    (displayBaseAction * displayTechBonusOption.bonusNumerator) /
    displayTechBonusOption.bonusDenominator
  const displayRaceBonusAction =
    (displayBaseAction + displayTechBonusAction) * (displayRaceBonus / 100)
  const displayPlanetContributionCap =
    (displayBaseAction + displayTechBonusAction + displayRaceBonusAction) / 2

  const calculate = () => {
    setError(null)

    const parsedNormalUnits = parseNonNegativeNumberOrZero(normalUnits)
    const parsedSuperUnits = parseNonNegativeNumberOrZero(superUnits)
    const parsedWeapons = parseNonNegativeNumberOrZero(weapons)

    if (
      parsedNormalUnits === null ||
      parsedSuperUnits === null ||
      parsedWeapons === null
    ) {
      setError("Enter valid non-negative numbers for units and weapons.")
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

    const weaponStrength = isAscended
      ? config.weaponStrength
      : NON_ASCENDED_WEAPON_STRENGTH
    const baseAction = getBaseAction(
      parsedNormalUnits,
      parsedSuperUnits,
      parsedWeapons,
      weaponStrength,
    )
    const techBonusOption = config.techBonusOptions[techBonus]
    const techBonusAction =
      (baseAction * techBonusOption.bonusNumerator) /
      techBonusOption.bonusDenominator
    const raceBonusAction = (baseAction + techBonusAction) * (raceBonusValue / 100)
    const planetContributionCap =
      (baseAction + techBonusAction + raceBonusAction) / 2
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
      baseAction +
      techBonusAction +
      raceBonusAction +
      planetContributionAction,
    )
    const difference =
      parsedCurrentAction === null ? null : totalAction - parsedCurrentAction

    setResults({
      totalAction,
      difference,
      baseAction,
      techBonusAction,
      raceBonusAction,
      planetContributionAction,
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
      <span className="font-semibold text-amber-100">
        Note:
      </span>{" "}
      {config.disclaimer}
    </p>
  ) : null

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid items-start gap-y-4 sm:grid-cols-2 sm:gap-x-8">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${config.fieldIdPrefix}-normal-units`}>
            Normal/Merc Units
          </Label>
          <Input
            id={`${config.fieldIdPrefix}-normal-units`}
            type="text"
            value={normalUnits}
            onChange={(e) => setNormalUnits(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${config.fieldIdPrefix}-super-units`}>
            Super Units
          </Label>
          <Input
            id={`${config.fieldIdPrefix}-super-units`}
            type="text"
            value={superUnits}
            onChange={(e) => setSuperUnits(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid items-start gap-y-4 sm:grid-cols-2 sm:gap-x-8">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${config.fieldIdPrefix}-weapons`}>
            Weapons
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={`${config.fieldIdPrefix}-weapons`}
              type="text"
              value={weapons}
              onChange={(e) => setWeapons(e.target.value)}
              placeholder="0"
              className="min-w-0 flex-1"
            />
            <CheckboxToggle
              id={`${config.fieldIdPrefix}-ascended`}
              label="Ascended"
              checked={isAscended}
              onChange={setIsAscended}
            />
          </div>
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
        <div className="grid items-start gap-y-4 sm:grid-cols-2 sm:gap-x-3">
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
            <Label htmlFor={`${config.fieldIdPrefix}-tech-bonus`}>
              Tech Bonus
            </Label>
            <Select
              value={techBonus}
              onValueChange={(value) => setTechBonus(value as TechBonusKey)}
            >
              <SelectTrigger
                id={`${config.fieldIdPrefix}-tech-bonus`}
                className="w-full"
              >
                <SelectValue placeholder="Select tech bonus">
                  {config.techBonusOptions[techBonus].label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                side="bottom"
                alignItemWithTrigger={false}
                collisionAvoidance={{ side: "none" }}
              >
                {Object.entries(config.techBonusOptions).map(
                  ([key, option]) => (
                    <SelectItem key={key} value={key}>
                      {option.label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
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
                        className={`ml-2 text-lg ${results.difference >= 0 ? "text-green-500" : "text-destructive"}`}
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
                {isExpanded ? disclaimer : null}
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

export function StrikeActionCalculator({
  defaultOpen = false,
  displayMode,
}: CalculatorProps) {
  return (
    <WeaponActionCalculator
      defaultOpen={defaultOpen}
      displayMode={displayMode}
      config={{
        title: "Strike Action",
        description:
          "Calculate strike action from units, weapons, tech bonus, and race bonus.",
        disclaimer:
          "Only best (normal) weapons for now.",
        weaponStrength: 5760,
        techBonusOptions: {
          none: { label: "None", bonusNumerator: 0, bonusDenominator: 1 },
          tier1: { label: "Tier 1", bonusNumerator: 55, bonusDenominator: 100 },
          tier2: { label: "Tier 2", bonusNumerator: 1635, bonusDenominator: 1000 },
        },
        currentLabel: "Current Strike Action (Optional)",
        currentPlaceholder: "Optional comparison value",
        totalLabel: "Total Strike",
        baseLabel: "Base Strike",
        planetContributionKind: "strike",
        fieldIdPrefix: "strike",
      }}
    />
  )
}

export function DefenceActionCalculator({
  defaultOpen = false,
  displayMode,
}: CalculatorProps) {
  return (
    <WeaponActionCalculator
      defaultOpen={defaultOpen}
      displayMode={displayMode}
      config={{
        title: "Defence Action",
        description:
          "Calculate defence action from units, weapons, tech bonus, and race bonus.",
        disclaimer:
          "Only best (normal) weapons for now.",
        weaponStrength: 5750,
        techBonusOptions: {
          none: { label: "None", bonusNumerator: 0, bonusDenominator: 1 },
          tier1: { label: "Tier 1", bonusNumerator: 50, bonusDenominator: 100 },
          tier2: { label: "Tier 2", bonusNumerator: 140, bonusDenominator: 100 },
        },
        currentLabel: "Current Defence Action (Optional)",
        currentPlaceholder: "Optional comparison value",
        totalLabel: "Total Defence",
        baseLabel: "Base Defence",
        planetContributionKind: "defence",
        fieldIdPrefix: "defence",
      }}
    />
  )
}
