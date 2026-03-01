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

interface CalculationResults {
  nextUpgradeCost: number
  totalCost: number
  projectedUnitProduction: number
  productionIncrease: number
}

const UNIT_PRODUCTION_PER_UPGRADE = 3
const COST_PER_PRODUCTION_POINT = 5_000
const COST_PER_UPGRADE =
  UNIT_PRODUCTION_PER_UPGRADE * COST_PER_PRODUCTION_POINT

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

const getNextUpgradeCost = (unitProduction: number): number => {
  return Math.max(0, unitProduction) * COST_PER_PRODUCTION_POINT
}

export function UnitProductionCalculator() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentUnitProduction, setCurrentUnitProduction] = useState("")
  const [upgradesToBuy, setUpgradesToBuy] = useState("")
  const [results, setResults] = useState<CalculationResults | null>(null)

  const calculate = () => {
    const current = parseFloat(currentUnitProduction.replace(/,/g, "")) || 0
    const n = parseInt(upgradesToBuy.replace(/,/g, "")) || 0

    if (n <= 0) {
      setResults(null)
      return
    }

    const firstUpgradeCost = getNextUpgradeCost(current)
    const costStep = COST_PER_UPGRADE
    const totalCost = (n / 2) * (2 * firstUpgradeCost + (n - 1) * costStep)
    const projectedUnitProduction = current + n * UNIT_PRODUCTION_PER_UPGRADE
    const productionIncrease = n * UNIT_PRODUCTION_PER_UPGRADE
    const nextUpgradeCost = firstUpgradeCost + n * costStep

    setResults({
      nextUpgradeCost,
      totalCost,
      projectedUnitProduction,
      productionIncrease,
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    calculate()
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="cursor-pointer select-none">
            <div className="flex items-center gap-3">
              <Calculator className="size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <CardTitle>Unit Production Calculator</CardTitle>
                <CardDescription>
                  Calculate upgrade costs and projected unit production.
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
              <div className="grid items-end gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="current-unit-production">
                    Current Unit Production
                  </Label>
                  <Input
                    id="current-unit-production"
                    type="text"
                    value={currentUnitProduction}
                    onChange={(e) => setCurrentUnitProduction(e.target.value)}
                    placeholder="Current unit production"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit-upgrades">Upgrades to Buy</Label>
                  <Input
                    id="unit-upgrades"
                    type="text"
                    value={upgradesToBuy}
                    onChange={(e) => setUpgradesToBuy(e.target.value)}
                    placeholder="Number of upgrades"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                Calculate
              </Button>

              {results && (
                <div className="space-y-4 border-t pt-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20">
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
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="mb-1 text-sm text-muted-foreground">
                        Next Upgrade Cost
                      </div>
                      <div
                        className="text-xl font-bold"
                        title={formatNumber(results.nextUpgradeCost)}
                      >
                        {formatSmart(results.nextUpgradeCost)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-chart-3/10 p-4 ring-1 ring-chart-3/20">
                    <div className="mb-1 text-sm text-muted-foreground">
                      Projected Unit Production
                    </div>
                    <div
                      className="text-2xl font-bold"
                      title={formatNumber(results.projectedUnitProduction)}
                    >
                      {formatSmart(results.projectedUnitProduction)}
                      <span
                        className="ml-2 text-lg text-green-500"
                        title={formatNumber(results.productionIncrease)}
                      >
                        (+{formatSmart(results.productionIncrease)})
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
