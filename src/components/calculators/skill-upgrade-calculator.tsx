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

interface UpgradeAtLevelResult {
  level: number
  nextLevel: number
  cost: number
}

interface TotalUpgradeResult {
  currentLevel: number
  targetLevel: number
  totalCost: number
}

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

interface CalculatorProps {
  defaultOpen?: boolean
  displayMode?: "accordion" | "standalone"
}

export function SkillUpgradeCalculator({
  defaultOpen = false,
  displayMode = "accordion",
}: CalculatorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const isStandalone = displayMode === "standalone"
  const [upgradeLevel, setUpgradeLevel] = useState("")
  const [currentLevel, setCurrentLevel] = useState("")
  const [targetLevel, setTargetLevel] = useState("")
  const [upgradeResult, setUpgradeResult] =
    useState<UpgradeAtLevelResult | null>(null)
  const [totalResult, setTotalResult] = useState<TotalUpgradeResult | null>(null)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const [totalError, setTotalError] = useState<string | null>(null)
  const [isUpgradeCostCopied, setIsUpgradeCostCopied] = useState(false)
  const [isTotalCostCopied, setIsTotalCostCopied] = useState(false)

  const calculate = () => {
    setUpgradeError(null)
    setTotalError(null)
    setUpgradeResult(null)
    setTotalResult(null)

    if (upgradeLevel.trim()) {
      const parsedUpgradeLevel = parseIntegerInput(upgradeLevel)

      if (parsedUpgradeLevel === null) {
        setUpgradeError("Enter a whole number of 0 or higher.")
      } else if (parsedUpgradeLevel < 0) {
        setUpgradeError("Upgrade level must be 0 or higher.")
      } else {
        setUpgradeResult({
          level: parsedUpgradeLevel,
          nextLevel: parsedUpgradeLevel + 1,
          cost: getUpgradeCostAtLevel(parsedUpgradeLevel),
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
      } else if (parsedCurrentLevel < 0 || parsedTargetLevel < 0) {
        setTotalError("Current and target levels must be 0 or higher.")
      } else if (parsedTargetLevel < parsedCurrentLevel) {
        setTotalError("Target level must be greater than or equal to current level.")
      } else {
        setTotalResult({
          currentLevel: parsedCurrentLevel,
          targetLevel: parsedTargetLevel,
          totalCost: getTotalUpgradeCost(parsedCurrentLevel, parsedTargetLevel),
        })
      }
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    calculate()
  }

  const copyRawValue = async (
    value: number,
    setCopied: (copied: boolean) => void,
  ) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return
    }
    try {
      await navigator.clipboard.writeText(value.toString())
      setCopied(true)
      window.setTimeout(() => {
        setCopied(false)
      }, 1500)
    } catch {
      setCopied(false)
    }
  }

  const handleRawValueKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    value: number,
    setCopied: (copied: boolean) => void,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      void copyRawValue(value, setCopied)
    }
  }

  const description =
    "Calculate single-upgrade cost and total cost to reach a target skill level."
  const disclaimer = ""
  const disclaimerContent = disclaimer ? (
    <p className="mt-1 text-xs text-amber-100/80">
      <span className="font-semibold text-amber-100">Disclaimer:</span>{" "}
      {disclaimer}
    </p>
  ) : null

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid items-end gap-y-4 sm:grid-cols-2 sm:gap-x-8">
                <div className="space-y-2">
                  <Label htmlFor="current-level">Current Skill Level</Label>
                  <Input
                    id="current-level"
                    type="text"
                    value={currentLevel}
                    onChange={(e) => setCurrentLevel(e.target.value)}
                    placeholder="Current level"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-level">Target Skill Level</Label>
                  <Input
                    id="target-level"
                    type="text"
                    value={targetLevel}
                    onChange={(e) => setTargetLevel(e.target.value)}
                    placeholder="Target level"
                  />
                </div>
              </div>

              {totalError ? (
                <p className="text-xs text-destructive">{totalError}</p>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="upgrade-level">Upgrade Cost at Level X</Label>
                <Input
                  id="upgrade-level"
                  type="text"
                  value={upgradeLevel}
                  onChange={(e) => setUpgradeLevel(e.target.value)}
                  placeholder="Skill level"
                />
                <p className="text-xs text-muted-foreground">
                  Uses level X to calculate the cost for upgrading to level X+1.
                </p>
                {upgradeError ? (
                  <p className="text-xs text-destructive">{upgradeError}</p>
                ) : null}
              </div>

              <Button type="submit" className="w-full">
                Calculate
              </Button>

              {(upgradeResult || totalResult) && (
                <div className="space-y-4 border-t pt-6">
                  {totalResult ? (
                    <div
                      className="relative min-h-24 cursor-pointer rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20 transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      onClick={() => {
                        void copyRawValue(totalResult.totalCost, setIsTotalCostCopied)
                      }}
                      onKeyDown={(event) =>
                        handleRawValueKeyDown(
                          event,
                          totalResult.totalCost,
                          setIsTotalCostCopied,
                        )
                      }
                      role="button"
                      tabIndex={0}
                      title={`Copy ${totalResult.totalCost}`}
                    >
                      <div className="max-w-[calc(100%-6rem)]">
                        <div className="mb-1 text-sm text-muted-foreground">
                          Total Cost: Level {totalResult.currentLevel} to {totalResult.targetLevel}
                        </div>
                        <div
                          className="text-2xl font-bold"
                          title={formatNumber(totalResult.totalCost)}
                        >
                          {formatCompact(totalResult.totalCost)}
                        </div>
                      </div>
                      <div className="absolute right-4 top-4 flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        {isTotalCostCopied ? (
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
                  ) : null}

                  {upgradeResult ? (
                    <div
                      className="relative min-h-24 cursor-pointer rounded-lg bg-muted/50 p-4 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      onClick={() => {
                        void copyRawValue(upgradeResult.cost, setIsUpgradeCostCopied)
                      }}
                      onKeyDown={(event) =>
                        handleRawValueKeyDown(
                          event,
                          upgradeResult.cost,
                          setIsUpgradeCostCopied,
                        )
                      }
                      role="button"
                      tabIndex={0}
                      title={`Copy ${upgradeResult.cost}`}
                    >
                      <div className="mb-1 text-sm text-muted-foreground">
                        Upgrade Cost at Level {upgradeResult.level}
                      </div>
                      <div className="max-w-[calc(100%-6rem)]">
                        <div
                          className="text-2xl font-bold"
                          title={formatNumber(upgradeResult.cost)}
                        >
                          {formatCompact(upgradeResult.cost)}
                          <span className="ml-2 text-lg text-muted-foreground">
                            (to level {upgradeResult.nextLevel})
                          </span>
                        </div>
                      </div>
                      <div className="absolute right-4 top-4 flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        {isUpgradeCostCopied ? (
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
                  ) : null}
                </div>
              )}
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
                <CardTitle>Intel/Counter-Intel Skill Calculator</CardTitle>
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
          <CardContent className="space-y-6">
            {formContent}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
