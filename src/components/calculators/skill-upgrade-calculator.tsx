import { type FormEvent, useState } from "react"
import { Calculator, ChevronDown, ChevronUp } from "lucide-react"
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

interface UpgradeAtLevelResult {
  level: number
  nextLevel: number
  cost: number | null
}

interface TotalUpgradeResult {
  currentLevel: number
  targetLevel: number
  upgradesNeeded: number
  totalCost: number
}

const MAX_SKILL_LEVEL = 40
const BASE_UPGRADE_COST = 6_000

const formatNumber = (num: number): string => {
  return num.toLocaleString("en-US", { maximumFractionDigits: 0 })
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

const getUpgradeCostAtLevel = (level: number): number => {
  return BASE_UPGRADE_COST * 2 ** level
}

const getTotalUpgradeCost = (currentLevel: number, targetLevel: number): number => {
  return BASE_UPGRADE_COST * (2 ** targetLevel - 2 ** currentLevel)
}

const parseIntegerInput = (value: string): number | null => {
  const normalized = value.replace(/,/g, "").trim()

  if (!normalized) {
    return null
  }

  if (!/^\d+$/.test(normalized)) {
    return null
  }

  return Number.parseInt(normalized, 10)
}

export function SkillUpgradeCalculator() {
  const [isOpen, setIsOpen] = useState(false)
  const [upgradeLevel, setUpgradeLevel] = useState("")
  const [currentLevel, setCurrentLevel] = useState("")
  const [targetLevel, setTargetLevel] = useState("")
  const [upgradeResult, setUpgradeResult] =
    useState<UpgradeAtLevelResult | null>(null)
  const [totalResult, setTotalResult] = useState<TotalUpgradeResult | null>(null)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const [totalError, setTotalError] = useState<string | null>(null)
  const [isTotalCostCopied, setIsTotalCostCopied] = useState(false)

  const calculate = () => {
    setUpgradeError(null)
    setTotalError(null)
    setUpgradeResult(null)
    setTotalResult(null)

    if (upgradeLevel.trim()) {
      const parsedUpgradeLevel = parseIntegerInput(upgradeLevel)

      if (parsedUpgradeLevel === null) {
        setUpgradeError("Enter a whole number between 0 and 40.")
      } else if (parsedUpgradeLevel < 0 || parsedUpgradeLevel > MAX_SKILL_LEVEL) {
        setUpgradeError("Upgrade level must be between 0 and 40.")
      } else {
        setUpgradeResult({
          level: parsedUpgradeLevel,
          nextLevel: parsedUpgradeLevel + 1,
          cost:
            parsedUpgradeLevel === MAX_SKILL_LEVEL
              ? null
              : getUpgradeCostAtLevel(parsedUpgradeLevel),
        })
      }
    }

    if (currentLevel.trim() || targetLevel.trim()) {
      if (!currentLevel.trim() || !targetLevel.trim()) {
        setTotalError("Enter both current and target levels.")
        return
      }

      const parsedCurrentLevel = parseIntegerInput(currentLevel)
      const parsedTargetLevel = parseIntegerInput(targetLevel)

      if (parsedCurrentLevel === null || parsedTargetLevel === null) {
        setTotalError("Current and target levels must be whole numbers.")
      } else if (
        parsedCurrentLevel < 0 ||
        parsedCurrentLevel > MAX_SKILL_LEVEL ||
        parsedTargetLevel < 0 ||
        parsedTargetLevel > MAX_SKILL_LEVEL
      ) {
        setTotalError("Current and target levels must be between 0 and 40.")
      } else if (parsedTargetLevel < parsedCurrentLevel) {
        setTotalError("Target level must be greater than or equal to current level.")
      } else {
        setTotalResult({
          currentLevel: parsedCurrentLevel,
          targetLevel: parsedTargetLevel,
          upgradesNeeded: parsedTargetLevel - parsedCurrentLevel,
          totalCost: getTotalUpgradeCost(parsedCurrentLevel, parsedTargetLevel),
        })
      }
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    calculate()
  }

  const copyRawValue = async (value: number) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return
    }
    try {
      await navigator.clipboard.writeText(value.toString())
      setIsTotalCostCopied(true)
      window.setTimeout(() => {
        setIsTotalCostCopied(false)
      }, 1500)
    } catch {
      setIsTotalCostCopied(false)
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
                <CardTitle>Skill Upgrade Calculator</CardTitle>
                <CardDescription>
                  Calculate single-upgrade cost and total cost to reach a target
                  skill level.
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
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="upgrade-level">Upgrade Cost at Level X</Label>
                <Input
                  id="upgrade-level"
                  type="text"
                  value={upgradeLevel}
                  onChange={(e) => setUpgradeLevel(e.target.value)}
                  placeholder="Skill level (0-40)"
                />
                <p className="text-xs text-muted-foreground">
                  Uses level X to calculate the cost for upgrading to level X+1.
                </p>
                {upgradeError ? (
                  <p className="text-xs text-destructive">{upgradeError}</p>
                ) : null}
              </div>

              <div className="grid items-end gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="current-level">Current Skill Level</Label>
                  <Input
                    id="current-level"
                    type="text"
                    value={currentLevel}
                    onChange={(e) => setCurrentLevel(e.target.value)}
                    placeholder="Current level (0-40)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-level">Target Skill Level</Label>
                  <Input
                    id="target-level"
                    type="text"
                    value={targetLevel}
                    onChange={(e) => setTargetLevel(e.target.value)}
                    placeholder="Target level (0-40)"
                  />
                </div>
              </div>

              {totalError ? (
                <p className="text-xs text-destructive">{totalError}</p>
              ) : null}

              <Button type="submit" className="w-full">
                Calculate
              </Button>

              {(upgradeResult || totalResult) && (
                <div className="space-y-4 border-t pt-6">
                  {upgradeResult ? (
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="mb-1 text-sm text-muted-foreground">
                        Upgrade Cost at Level {upgradeResult.level}
                      </div>
                      {upgradeResult.cost === null ? (
                        <div className="text-xl font-bold">
                          Max level reached (no further upgrades)
                        </div>
                      ) : (
                        <div
                          className="text-2xl font-bold"
                          title={formatNumber(upgradeResult.cost)}
                        >
                          {formatCompact(upgradeResult.cost)}
                          <span className="ml-2 text-lg text-muted-foreground">
                            (to level {upgradeResult.nextLevel})
                          </span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {totalResult ? (
                    <div
                      className="rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20 cursor-pointer"
                      onClick={() => {
                        void copyRawValue(totalResult.totalCost)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          void copyRawValue(totalResult.totalCost)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="mb-1 text-sm text-muted-foreground">
                        Total Cost: Level {totalResult.currentLevel} to {totalResult.targetLevel}
                      </div>
                      <div
                        className="text-2xl font-bold"
                        title={`${totalResult.totalCost} (click to copy raw)`}
                      >
                        {formatCompact(totalResult.totalCost)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {isTotalCostCopied ? "Copied raw value" : "Click to copy raw value"}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Upgrades needed: {formatNumber(totalResult.upgradesNeeded)}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </form>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
