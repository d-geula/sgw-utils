import { type FormEvent, type KeyboardEvent, useState } from "react"
import { Calculator, Check, ChevronDown, ChevronUp, Copy } from "lucide-react"
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

interface CalculationResults {
  totalAction: number
  difference: number | null
  baseAction: number
  techBonusAction: number
  raceBonusAction: number
}

interface TechBonusOption {
  label: string
  bonusNumerator: number
  bonusDenominator: number
}

type TechBonusKey = "none" | "tier1" | "tier2"

interface WeaponActionCalculatorConfig {
  title: string
  description: string
  weaponStrength: number
  techBonusOptions: Record<TechBonusKey, TechBonusOption>
  currentLabel: string
  currentPlaceholder: string
  calculatedLabel: string
  baseLabel: string
  fieldIdPrefix: string
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

function WeaponActionCalculator({
  config,
}: {
  config: WeaponActionCalculatorConfig
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [normalUnits, setNormalUnits] = useState("")
  const [superUnits, setSuperUnits] = useState("")
  const [weapons, setWeapons] = useState("")
  const [techBonus, setTechBonus] = useState<TechBonusKey>("none")
  const [raceBonusPercent, setRaceBonusPercent] = useState("")
  const [currentAction, setCurrentAction] = useState("")
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedTotal, setCopiedTotal] = useState(false)

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

    const baseAction = getBaseAction(
      parsedNormalUnits,
      parsedSuperUnits,
      parsedWeapons,
      config.weaponStrength,
    )
    const techBonusOption = config.techBonusOptions[techBonus]
    const techBonusAction =
      (baseAction * techBonusOption.bonusNumerator) /
      techBonusOption.bonusDenominator
    const raceBonusAction = (baseAction + techBonusAction) * (raceBonusValue / 100)
    const totalAction = Math.floor(baseAction + techBonusAction + raceBonusAction)
    const difference =
      parsedCurrentAction === null ? null : totalAction - parsedCurrentAction

    setResults({
      totalAction,
      difference,
      baseAction,
      techBonusAction,
      raceBonusAction,
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

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="cursor-pointer select-none">
            <div className="flex items-center gap-3">
              <Calculator className="size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <CardTitle>{config.title}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
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
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${config.fieldIdPrefix}-normal-units`}>
                    Normal/Merc Units
                  </Label>
                  <Input
                    id={`${config.fieldIdPrefix}-normal-units`}
                    type="text"
                    value={normalUnits}
                    onChange={(e) => setNormalUnits(e.target.value)}
                    placeholder="Normal/merc unit count"
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
                    placeholder="Super unit count"
                  />
                </div>
              </div>

              <div className="grid items-start gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${config.fieldIdPrefix}-weapons`}>
                    Weapons
                  </Label>
                  <Input
                    id={`${config.fieldIdPrefix}-weapons`}
                    type="text"
                    value={weapons}
                    onChange={(e) => setWeapons(e.target.value)}
                    placeholder="Weapon count (best)"
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

              <div className="grid items-start gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor={`${config.fieldIdPrefix}-race-bonus`}
                    className="flex min-h-10 items-end"
                  >
                    Race Bonus (%)
                  </Label>
                  <Input
                    id={`${config.fieldIdPrefix}-race-bonus`}
                    type="text"
                    value={raceBonusPercent}
                    onChange={(e) => setRaceBonusPercent(e.target.value)}
                    placeholder="e.g. 25"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor={`${config.fieldIdPrefix}-current-action`}
                    className="flex min-h-10 items-end"
                  >
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
                <div className="flex flex-col gap-4 border-t pt-6">
                  <div
                    className="rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20 transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    onClick={() => void copyTotalAction()}
                    onKeyDown={handleTotalKeyDown}
                    role="button"
                    tabIndex={0}
                    title={`Copy ${results.totalAction}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 text-sm text-muted-foreground">
                          {config.calculatedLabel}
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
                      <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
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

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="mb-1 text-xs text-muted-foreground">
                        {config.baseLabel}
                      </div>
                      <div
                        className="text-lg font-semibold"
                        title={formatNumber(results.baseAction)}
                      >
                        {formatCompact(results.baseAction)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="mb-1 text-xs text-muted-foreground">
                        Tech Bonus Action
                      </div>
                      <div
                        className="text-lg font-semibold"
                        title={formatNumber(results.techBonusAction)}
                      >
                        {formatCompact(results.techBonusAction)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="mb-1 text-xs text-muted-foreground">
                        Race Bonus Action
                      </div>
                      <div
                        className="text-lg font-semibold"
                        title={formatNumber(results.raceBonusAction)}
                      >
                        {formatCompact(results.raceBonusAction)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </form>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

export function StrikeActionCalculator() {
  return (
    <WeaponActionCalculator
      config={{
        title: "Strike Action",
        description:
          "Calculate strike action from units, weapons, tech bonus, and race bonus.",
        weaponStrength: 5760,
        techBonusOptions: {
          none: { label: "None", bonusNumerator: 0, bonusDenominator: 1 },
          tier1: { label: "Tier 1", bonusNumerator: 55, bonusDenominator: 100 },
          tier2: { label: "Tier 2", bonusNumerator: 1635, bonusDenominator: 1000 },
        },
        currentLabel: "Current Strike Action (Optional)",
        currentPlaceholder: "Current strike action",
        calculatedLabel: "Calculated Strike Action",
        baseLabel: "Base Strike",
        fieldIdPrefix: "strike",
      }}
    />
  )
}

export function DefenceActionCalculator() {
  return (
    <WeaponActionCalculator
      config={{
        title: "Defence Action",
        description:
          "Calculate defence action from units, weapons, tech bonus, and race bonus.",
        weaponStrength: 5750,
        techBonusOptions: {
          none: { label: "None", bonusNumerator: 0, bonusDenominator: 1 },
          tier1: { label: "Tier 1", bonusNumerator: 50, bonusDenominator: 100 },
          tier2: { label: "Tier 2", bonusNumerator: 140, bonusDenominator: 100 },
        },
        currentLabel: "Current Defence Action (Optional)",
        currentPlaceholder: "Current defence action",
        calculatedLabel: "Calculated Defence Action",
        baseLabel: "Base Defence",
        fieldIdPrefix: "defence",
      }}
    />
  )
}
