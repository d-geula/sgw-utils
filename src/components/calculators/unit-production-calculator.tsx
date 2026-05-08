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

interface CalculationResults {
  numberOfUpgradesToBuy: number
  finalUnitProduction: number
  totalCost: number
}

const UNIT_PRODUCTION_PER_UPGRADE = 3
const COST_PER_PRODUCTION_POINT = 5_000

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

  return num.toFixed(2)
}

const formatSmart = (num: number): string => {
  if (Math.abs(num) >= 1e9) {
    return formatCompact(num)
  }

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
        {formatNumber(value)}
      </div>
    </div>
  )
}

interface CalculatorProps {
  defaultOpen?: boolean
  displayMode?: "accordion" | "standalone"
}

export function UnitProductionCalculator({
  defaultOpen = false,
  displayMode = "accordion",
}: CalculatorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const isStandalone = displayMode === "standalone"
  const [currentUnitProduction, setCurrentUnitProduction] = useState("")
  const [desiredUnitProduction, setDesiredUnitProduction] = useState("")
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isTotalCostCopied, setIsTotalCostCopied] = useState(false)

  const calculate = () => {
    setError(null)

    const current = parseNonNegativeNumberOrZero(currentUnitProduction)
    const desired = parseNonNegativeNumber(desiredUnitProduction)

    if (current === null) {
      setError("Enter a valid non-negative number for current production.")
      setResults(null)
      return
    }

    if (desired === null) {
      setError("Enter a valid desired production above current production.")
      setResults(null)
      return
    }

    if (desired <= current) {
      setError("Desired production must be above current production.")
      setResults(null)
      return
    }

    const numberOfUpgradesToBuy = Math.max(
      0,
      Math.ceil((desired - current) / UNIT_PRODUCTION_PER_UPGRADE),
    )
    const totalCost =
      COST_PER_PRODUCTION_POINT *
      (numberOfUpgradesToBuy * (current + 2) +
        (UNIT_PRODUCTION_PER_UPGRADE *
          numberOfUpgradesToBuy *
          (numberOfUpgradesToBuy - 1)) /
          2)
    const finalUnitProduction =
      current + numberOfUpgradesToBuy * UNIT_PRODUCTION_PER_UPGRADE

    setResults({
      numberOfUpgradesToBuy,
      finalUnitProduction,
      totalCost,
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    calculate()
  }

  const copyTotalCost = async () => {
    if (!results) {
      return
    }

    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return
    }
    try {
      await navigator.clipboard.writeText(String(results.totalCost))
      setIsTotalCostCopied(true)
      window.setTimeout(() => {
        setIsTotalCostCopied(false)
      }, 1500)
    } catch {
      setIsTotalCostCopied(false)
    }
  }

  const handleTotalKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      void copyTotalCost()
    }
  }

  const description = "Calculate upgrade costs and projected unit production."
  const disclaimer = ""
  const disclaimerContent = disclaimer ? (
    <p className="mt-1 text-xs text-amber-100/80">
      <span className="font-semibold text-amber-100">Disclaimer:</span>{" "}
      {disclaimer}
    </p>
  ) : null

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid items-end gap-y-4 sm:grid-cols-2 sm:gap-x-8">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="current-unit-production">
                    Current Unit Production
                  </Label>
                  <Input
                    id="current-unit-production"
                    type="text"
                    value={currentUnitProduction}
                    onChange={(e) => setCurrentUnitProduction(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="desired-unit-production">
                    Desired Unit Production
                  </Label>
                  <Input
                    id="desired-unit-production"
                    type="text"
                    value={desiredUnitProduction}
                    onChange={(e) => setDesiredUnitProduction(e.target.value)}
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
                      label="Number of Upgrades to Buy"
                      value={results.numberOfUpgradesToBuy}
                    />
                    <ResultRow
                      label="Final Unit Production"
                      value={results.finalUnitProduction}
                    />
                  </div>

                  <div className="flex">
                    <div
                      className="relative min-h-24 flex-1 cursor-pointer rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20 transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      onClick={() => void copyTotalCost()}
                      onKeyDown={handleTotalKeyDown}
                      role="button"
                      tabIndex={0}
                      title={`Copy ${results.totalCost}`}
                    >
                      <div className="max-w-[calc(100%-6rem)]">
                        <div className="min-w-0">
                          <div className="mb-1 text-sm text-muted-foreground">
                            Total Cost
                          </div>
                          <div
                            className="text-2xl font-bold"
                            title={formatNumber(results.totalCost)}
                          >
                            {formatSmart(results.totalCost)}
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
                <CardTitle>Unit Production Calculator</CardTitle>
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
          <CardContent className="flex flex-col gap-6">
            {formContent}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
