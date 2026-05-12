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

interface CalculatorProps {
  defaultOpen?: boolean
  displayMode?: "accordion" | "standalone"
}

interface CalculationResults {
  spiesRequired: number
  spiesRemainingSuccess: number
  spiesRemainingFailure: number
  spiesLostSuccess: number
  spiesLostFailure: number
}

const FINAL_MULTIPLIER = 2
const DISCLAIMER = "While it seems correct, definitely use with caution!"

const TECH_BONUS_OPTIONS = {
  none: { label: "None", multiplier: 1 },
  tier1: { label: "Tier 1", multiplier: 1.2 },
  tier2: { label: "Tier 2", multiplier: 1.56 },
} as const

type TechBonusKey = keyof typeof TECH_BONUS_OPTIONS

const REALM_ALERT_MULTIPLIERS = {
  none: { label: "None", multiplier: 1 },
  low: { label: "Low", multiplier: 1.1 },
  medium: { label: "Medium", multiplier: 1.2 },
  high: { label: "High", multiplier: 1.4 },
  critical: { label: "Critical", multiplier: 1.5 },
} as const

type RealmAlertKey = keyof typeof REALM_ALERT_MULTIPLIERS

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

const getCovertActionPerSpy = (
  covertLevel: number,
  techMultiplier: number,
  raceBonusPercent: number,
) => {
  const base = 2 ** (covertLevel / 2)
  const techBonus = base * (techMultiplier - 1)
  const raceBonus = (base + techBonus) * (raceBonusPercent / 100)

  return (base + techBonus + raceBonus + 1) * FINAL_MULTIPLIER
}

function ResultRow({
  label,
  value,
  delta,
}: {
  label: string
  value: number
  delta: number
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-b border-border/60 py-2 last:border-b-0">
      <div className="min-w-0 text-sm text-muted-foreground">{label}</div>
      <div
        className="text-right text-sm font-semibold"
        title={`${formatNumber(value)} (-${formatNumber(delta)})`}
      >
        {formatCompact(value)}{" "}
        <span className="text-destructive">(-{formatCompact(delta)})</span>
      </div>
    </div>
  )
}

export function SabotageCalculator({
  defaultOpen = false,
  displayMode = "accordion",
}: CalculatorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const isStandalone = displayMode === "standalone"
  const [enemyCovertAction, setEnemyCovertAction] = useState("")
  const [covertLevel, setCovertLevel] = useState("")
  const [techBonus, setTechBonus] = useState<TechBonusKey>("tier2")
  const [raceBonusPercent, setRaceBonusPercent] = useState("")
  const [realmAlert, setRealmAlert] = useState<RealmAlertKey>("critical")
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedTotal, setCopiedTotal] = useState(false)

  const calculate = () => {
    setError(null)

    const parsedEnemyCovertAction = parseNonNegativeNumber(enemyCovertAction) ?? 0
    const parsedCovertLevel = parseNonNegativeNumber(covertLevel) ?? 0
    const parsedRaceBonus = parseNonNegativeNumber(raceBonusPercent) ?? 0

    if (
      (parseNonNegativeNumber(enemyCovertAction) === null &&
        enemyCovertAction.trim()) ||
      (parseNonNegativeNumber(covertLevel) === null && covertLevel.trim()) ||
      (parseNonNegativeNumber(raceBonusPercent) === null &&
        raceBonusPercent.trim())
    ) {
      setError("Enter valid non-negative numbers.")
      setResults(null)
      return
    }

    const enemyAdjusted =
      parsedEnemyCovertAction * REALM_ALERT_MULTIPLIERS[realmAlert].multiplier
    const perSpy = getCovertActionPerSpy(
      parsedCovertLevel,
      TECH_BONUS_OPTIONS[techBonus].multiplier,
      parsedRaceBonus,
    )
    const spiesRequired = Math.floor(enemyAdjusted / perSpy) + 1
    const spiesLostSuccess = Math.floor(spiesRequired * 0.05)
    const spiesLostFailure = Math.floor(spiesRequired * 0.5)

    setResults({
      spiesRequired,
      spiesRemainingSuccess: spiesRequired - spiesLostSuccess,
      spiesRemainingFailure: spiesRequired - spiesLostFailure,
      spiesLostSuccess,
      spiesLostFailure,
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    calculate()
  }

  const copySpiesRequired = async () => {
    if (!results) {
      return
    }

    await navigator.clipboard.writeText(String(results.spiesRequired))
    setCopiedTotal(true)
    window.setTimeout(() => setCopiedTotal(false), 1500)
  }

  const handleTotalKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      void copySpiesRequired()
    }
  }

  const disclaimer = DISCLAIMER ? (
    <p className="mt-1 text-xs text-amber-100/80">
      <span className="font-semibold text-amber-100">Disclaimer:</span> {DISCLAIMER}
    </p>
  ) : null

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid items-start gap-y-4 sm:grid-cols-2 sm:gap-x-8">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sabotage-enemy-covert">Enemy Covert</Label>
          <Input
            id="sabotage-enemy-covert"
            type="text"
            value={enemyCovertAction}
            onChange={(e) => setEnemyCovertAction(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="sabotage-covert-level">Covert Level</Label>
          <Input
            id="sabotage-covert-level"
            type="text"
            value={covertLevel}
            onChange={(e) => setCovertLevel(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid items-start gap-y-4 sm:grid-cols-2 sm:gap-x-8">
        <div className="grid items-start gap-y-4 sm:grid-cols-2 sm:gap-x-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sabotage-tech-bonus">Tech Bonus</Label>
            <Select
              value={techBonus}
              onValueChange={(value) => setTechBonus(value as TechBonusKey)}
            >
              <SelectTrigger id="sabotage-tech-bonus" className="w-full">
                <SelectValue placeholder="Select tech bonus">
                  {TECH_BONUS_OPTIONS[techBonus].label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                side="bottom"
                alignItemWithTrigger={false}
                collisionAvoidance={{ side: "none" }}
              >
                {Object.entries(TECH_BONUS_OPTIONS).map(([key, option]) => (
                  <SelectItem key={key} value={key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sabotage-race-bonus">Race Bonus (%)</Label>
            <Input
              id="sabotage-race-bonus"
              type="text"
              value={raceBonusPercent}
              onChange={(e) => setRaceBonusPercent(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="sabotage-realm-alert">Realm Alert</Label>
          <Select
            value={realmAlert}
            onValueChange={(value) => setRealmAlert(value as RealmAlertKey)}
          >
            <SelectTrigger id="sabotage-realm-alert" className="w-full">
              <SelectValue placeholder="Select realm alert">
                {REALM_ALERT_MULTIPLIERS[realmAlert].label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              side="bottom"
              alignItemWithTrigger={false}
              collisionAvoidance={{ side: "none" }}
            >
              {Object.entries(REALM_ALERT_MULTIPLIERS).map(([key, option]) => (
                <SelectItem key={key} value={key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              label="Spies Remaining (Success)"
              value={results.spiesRemainingSuccess}
              delta={results.spiesLostSuccess}
            />
            <ResultRow
              label="Spies Remaining (Failure)"
              value={results.spiesRemainingFailure}
              delta={results.spiesLostFailure}
            />
          </div>

          <div className="self-start">
            <div
              className="relative min-h-24 cursor-pointer rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20 transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              onClick={() => void copySpiesRequired()}
              onKeyDown={handleTotalKeyDown}
              role="button"
              tabIndex={0}
              title={`Copy ${results.spiesRequired}`}
            >
              <div className="max-w-[calc(100%-6rem)]">
                <div className="min-w-0">
                  <div className="mb-1 text-sm text-muted-foreground">
                    Spies Required
                  </div>
                  <div
                    className="text-2xl font-bold"
                    title={formatNumber(results.spiesRequired)}
                  >
                    {formatCompact(results.spiesRequired)}
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
          <p className="text-sm text-muted-foreground">
            Calculate the number of spies required for a successful sabotage.
          </p>
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
                <CardTitle>Sabotage</CardTitle>
                <CardDescription>
                  Calculate spies required for sabotage.
                </CardDescription>
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
          <CardContent className="space-y-6">{formContent}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
