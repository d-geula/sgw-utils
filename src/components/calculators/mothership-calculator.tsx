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
  weaponPower: number
  shieldPower: number
  fleetPower: number
  basePower: number
  totalPower: number
  difference: number | null
  weaponCost: number
  shieldCost: number
  fleetCost: number
  totalCost: number
}

interface CalculatorProps {
  defaultOpen?: boolean
}

const WEAPON_STRENGTH = 4_975_000
const SHIELD_STRENGTH = 7_475_000
const FLEET_STRENGTH = 1_156_000
const TECH_TIER_OPTIONS = Array.from({ length: 11 }, (_, index) => ({
  label: index === 0 ? "None" : `Tier ${index} (+${index * 3}%)`,
  value: String(index),
}))

const formatNumber = (num: number): string => {
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

const cleanNumber = (num: number): number => {
  return Object.is(num, -0) ? 0 : num
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

const getLinearUpgradeCost = (currentCapacity: number, desiredCapacity: number) => {
  const upgrades = desiredCapacity - currentCapacity

  if (upgrades <= 0) {
    return 0
  }

  return cleanNumber(
    (upgrades *
      (10_000 * currentCapacity +
        10_000 +
        (10_000 * (desiredCapacity - 1) + 10_000))) /
    2,
  )
}

const getShieldUpgradeCost = (
  currentCapacity: number,
  desiredCapacity: number,
) => {
  const upgrades = desiredCapacity - currentCapacity

  if (upgrades <= 0) {
    return 0
  }

  return cleanNumber(
    (upgrades *
      (12_000 * currentCapacity +
        5_000 +
        (12_000 * (desiredCapacity - 1) + 5_000))) /
    2,
  )
}

function CapacityInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0"
      />
    </div>
  )
}

function ResultRow({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-b border-border/60 py-2 last:border-b-0">
      <div className="min-w-0 text-sm text-muted-foreground">{label}</div>
      <div
        className="text-right text-sm font-semibold"
        title={formatNumber(value)}
      >
        {formatCompact(value)}
      </div>
    </div>
  )
}

function ResultSection({
  title,
  empty,
  rows,
}: {
  title: string
  empty: string
  rows: Array<{ label: string; value: number }>
}) {
  const visibleRows = rows.filter((row) => row.value !== 0)

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          {title}
        </div>
        <div className="h-px flex-1 bg-border/70" />
      </div>
      {visibleRows.length > 0 ? (
        <div>
          {visibleRows.map((row) => (
            <ResultRow key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      ) : (
        <div className="rounded-md bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {empty}
        </div>
      )}
    </div>
  )
}

export function MothershipCalculator({ defaultOpen = false }: CalculatorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [rawWeaponCapacity, setRawWeaponCapacity] = useState("")
  const [desiredWeaponCapacity, setDesiredWeaponCapacity] = useState("")
  const [rawShieldCapacity, setRawShieldCapacity] = useState("")
  const [desiredShieldCapacity, setDesiredShieldCapacity] = useState("")
  const [rawFleetCapacity, setRawFleetCapacity] = useState("")
  const [desiredFleetCapacity, setDesiredFleetCapacity] = useState("")
  const [currentMothershipPower, setCurrentMothershipPower] = useState("")
  const [techTier, setTechTier] = useState("0")
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedPower, setCopiedPower] = useState(false)
  const selectedTechTier =
    TECH_TIER_OPTIONS.find((option) => option.value === techTier) ??
    TECH_TIER_OPTIONS[0]

  const calculate = () => {
    setError(null)

    const parsedRawWeapons = parseNonNegativeNumberOrZero(rawWeaponCapacity)
    const parsedDesiredWeapons =
      parseNonNegativeNumberOrZero(desiredWeaponCapacity)
    const parsedRawShields = parseNonNegativeNumberOrZero(rawShieldCapacity)
    const parsedDesiredShields =
      parseNonNegativeNumberOrZero(desiredShieldCapacity)
    const parsedRawFleet = parseNonNegativeNumberOrZero(rawFleetCapacity)
    const parsedDesiredFleet =
      parseNonNegativeNumberOrZero(desiredFleetCapacity)
    const parsedCurrentMothershipPower = currentMothershipPower.trim()
      ? parseNonNegativeNumberOrZero(currentMothershipPower)
      : undefined

    if (
      parsedRawWeapons === null ||
      parsedDesiredWeapons === null ||
      parsedRawShields === null ||
      parsedDesiredShields === null ||
      parsedRawFleet === null ||
      parsedDesiredFleet === null ||
      parsedCurrentMothershipPower === null
    ) {
      setError("Enter valid non-negative numbers.")
      setResults(null)
      return
    }

    if (
      (parsedDesiredWeapons > 0 && parsedRawWeapons > parsedDesiredWeapons) ||
      (parsedDesiredShields > 0 && parsedRawShields > parsedDesiredShields) ||
      (parsedDesiredFleet > 0 && parsedRawFleet > parsedDesiredFleet)
    ) {
      setError("Raw capacity cannot exceed desired capacity.")
      setResults(null)
      return
    }

    const targetWeaponCapacity =
      parsedDesiredWeapons > 0 ? parsedDesiredWeapons : parsedRawWeapons
    const targetShieldCapacity =
      parsedDesiredShields > 0 ? parsedDesiredShields : parsedRawShields
    const targetFleetCapacity =
      parsedDesiredFleet > 0 ? parsedDesiredFleet : parsedRawFleet
    const techMultiplier = 1 + Number(techTier) * 0.03
    const weaponPower = targetWeaponCapacity * WEAPON_STRENGTH * techMultiplier
    const shieldPower = targetShieldCapacity * SHIELD_STRENGTH * techMultiplier
    const fleetPower = targetFleetCapacity * FLEET_STRENGTH * techMultiplier
    const basePower = weaponPower + shieldPower + fleetPower
    const totalPower = Math.floor(basePower)
    const difference =
      parsedCurrentMothershipPower === undefined
        ? null
        : totalPower - parsedCurrentMothershipPower
    const weaponCost = getLinearUpgradeCost(
      parsedRawWeapons,
      parsedDesiredWeapons > 0 ? parsedDesiredWeapons : parsedRawWeapons,
    )
    const shieldCost = getShieldUpgradeCost(
      parsedRawShields,
      parsedDesiredShields > 0 ? parsedDesiredShields : parsedRawShields,
    )
    const fleetCost = getLinearUpgradeCost(
      parsedRawFleet,
      parsedDesiredFleet > 0 ? parsedDesiredFleet : parsedRawFleet,
    )

    setResults({
      weaponPower,
      shieldPower,
      fleetPower,
      basePower,
      totalPower,
      difference,
      weaponCost,
      shieldCost,
      fleetCost,
      totalCost: weaponCost + shieldCost + fleetCost,
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    calculate()
  }

  const copyTotalPower = async () => {
    if (!results) {
      return
    }

    await navigator.clipboard.writeText(String(results.totalPower))
    setCopiedPower(true)
    window.setTimeout(() => setCopiedPower(false), 1500)
  }

  const handleTotalPowerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      void copyTotalPower()
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
                <CardTitle>Mothership Calculator</CardTitle>
                <CardDescription>
                  Calculate mothership power and capacity upgrade costs.
                </CardDescription>
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
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid items-start gap-4 lg:grid-cols-3">
                <div className="rounded-md border border-border bg-muted/20 p-4">
                  <div className="mb-3 text-sm font-semibold">Weapons</div>
                  <div className="grid gap-3">
                    <CapacityInput
                      id="mothership-raw-weapon-capacity"
                      label="Raw Capacity"
                      value={rawWeaponCapacity}
                      onChange={setRawWeaponCapacity}
                    />
                    <CapacityInput
                      id="mothership-desired-weapon-capacity"
                      label="Desired Capacity"
                      value={desiredWeaponCapacity}
                      onChange={setDesiredWeaponCapacity}
                    />
                  </div>
                </div>

                <div className="rounded-md border border-border bg-muted/20 p-4">
                  <div className="mb-3 text-sm font-semibold">Shields</div>
                  <div className="grid gap-3">
                    <CapacityInput
                      id="mothership-raw-shield-capacity"
                      label="Raw Capacity"
                      value={rawShieldCapacity}
                      onChange={setRawShieldCapacity}
                    />
                    <CapacityInput
                      id="mothership-desired-shield-capacity"
                      label="Desired Capacity"
                      value={desiredShieldCapacity}
                      onChange={setDesiredShieldCapacity}
                    />
                  </div>
                </div>

                <div className="rounded-md border border-border bg-muted/20 p-4">
                  <div className="mb-3 text-sm font-semibold">Fleet</div>
                  <div className="grid gap-3">
                    <CapacityInput
                      id="mothership-raw-fleet-capacity"
                      label="Raw Capacity"
                      value={rawFleetCapacity}
                      onChange={setRawFleetCapacity}
                    />
                    <CapacityInput
                      id="mothership-desired-fleet-capacity"
                      label="Desired Capacity"
                      value={desiredFleetCapacity}
                      onChange={setDesiredFleetCapacity}
                    />
                  </div>
                </div>
              </div>

              <div className="grid items-start gap-y-4 sm:grid-cols-2 sm:gap-x-8">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="mothership-tech-tier">Tech Bonus</Label>
                  <Select
                    value={techTier}
                    onValueChange={(value) => {
                      if (value) {
                        setTechTier(value)
                      }
                    }}
                  >
                    <SelectTrigger
                      id="mothership-tech-tier"
                      className="w-full"
                    >
                      <SelectValue placeholder="Select tech tier">
                        {selectedTechTier.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent
                      side="bottom"
                      alignItemWithTrigger={false}
                      collisionAvoidance={{ side: "none" }}
                    >
                      {TECH_TIER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <CapacityInput
                  id="mothership-current-power"
                  label="Current Mothership Power (Optional)"
                  value={currentMothershipPower}
                  onChange={setCurrentMothershipPower}
                />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button type="submit" className="w-full">
                Calculate
              </Button>

              {results ? (
                <div className="grid items-stretch gap-4 border-t pt-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="grid gap-5">
                      <ResultSection
                        title="Power"
                        empty="No power to show."
                        rows={[
                          {
                            label: "Max Weapon Power",
                            value: results.weaponPower,
                          },
                          {
                            label: "Max Shield Power",
                            value: results.shieldPower,
                          },
                          {
                            label: "Max Fleet Power",
                            value: results.fleetPower,
                          },
                        ]}
                      />
                      <ResultSection
                        title="Upgrade Cost"
                        empty="No upgrade cost."
                        rows={[
                          {
                            label: "Weapon Upgrade Cost",
                            value: results.weaponCost,
                          },
                          {
                            label: "Shield Upgrade Cost",
                            value: results.shieldCost,
                          },
                          {
                            label: "Fleet Upgrade Cost",
                            value: results.fleetCost,
                          },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="self-start">
                    <div
                      className="relative min-h-24 cursor-pointer rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20 transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      onClick={() => void copyTotalPower()}
                      onKeyDown={handleTotalPowerKeyDown}
                      role="button"
                      tabIndex={0}
                      title={`Copy ${results.totalPower}`}
                    >
                      <div className="max-w-[calc(100%-6rem)]">
                        <div className="mb-1 text-sm text-muted-foreground">
                          Total Max Power
                        </div>
                        <div
                          className="text-2xl font-bold"
                          title={formatNumber(results.totalPower)}
                        >
                          {formatCompact(results.totalPower)}
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
                        {copiedPower ? (
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

                    <div className="mt-3 min-h-24 rounded-lg bg-muted/30 p-4">
                      <div>
                        <div className="mb-1 text-sm text-muted-foreground">
                          Total Upgrade Cost
                        </div>
                        <div
                          className="text-2xl font-bold"
                          title={formatNumber(results.totalCost)}
                        >
                          {formatCompact(results.totalCost)}
                        </div>
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
