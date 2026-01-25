import { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Planet type configurations
// Formula: Current Cost = (Total Upgrades × 0.005) + Planet Offset
const PLANET_TYPES = {
  income: {
    label: "Income",
    contributionLabel: "Income",
    facilitiesLabel: "Income Facilities",
    offset: -0.49,
    valuePerUpgrade: 8_640_000,
  },
  unitProduction: {
    label: "Unit Production",
    contributionLabel: "Unit Production",
    facilitiesLabel: "Production Facilities",
    offset: 10.35,
    valuePerUpgrade: 2,
  },
} as const

type PlanetType = keyof typeof PLANET_TYPES

interface CalculationResults {
  currentLevel: number
  targetLevel: number
  nextUpgradeCost: number
  totalCost: number
  projectedValue: number
  valueIncrease: number
}

const formatNumber = (num: number): string => {
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

// Compact format for large numbers (supports up to quintillions)
const formatCompact = (num: number): string => {
  const abs = Math.abs(num)
  const sign = num < 0 ? "-" : ""
  
  if (abs >= 1e18) {
    return sign + (abs / 1e18).toFixed(2) + "Qi" // Quintillion
  }
  if (abs >= 1e15) {
    return sign + (abs / 1e15).toFixed(2) + "Q" // Quadrillion
  }
  if (abs >= 1e12) {
    return sign + (abs / 1e12).toFixed(2) + "T" // Trillion
  }
  if (abs >= 1e9) {
    return sign + (abs / 1e9).toFixed(2) + "B" // Billion
  }
  if (abs >= 1e6) {
    return sign + (abs / 1e6).toFixed(2) + "M" // Million
  }
  if (abs >= 1e3) {
    return sign + (abs / 1e3).toFixed(2) + "K" // Thousand
  }
  return num.toFixed(2)
}

// Smart format: use compact for large numbers, full for smaller ones
const formatSmart = (num: number): string => {
  const abs = Math.abs(num)
  // Use compact format for numbers >= 1 billion
  if (abs >= 1e9) {
    return formatCompact(num)
  }
  return formatNumber(num)
}

export function PlanetUpgradeCalculator() {
  const [isOpen, setIsOpen] = useState(true)
  const [planetType, setPlanetType] = useState<PlanetType>("income")
  const [currentValue, setCurrentValue] = useState("")
  const [upgradesToBuy, setUpgradesToBuy] = useState("")
  const [results, setResults] = useState<CalculationResults | null>(null)

  const config = PLANET_TYPES[planetType]
  const COST_INCREMENT = 0.005

  const calculate = () => {
    const { offset, valuePerUpgrade } = config

    // Remove commas from input before parsing
    const current = parseFloat(currentValue.replace(/,/g, "")) || 0
    const n = parseInt(upgradesToBuy.replace(/,/g, "")) || 0

    if (n <= 0) {
      setResults(null)
      return
    }

    // Calculate current level
    const currentLevel = Math.floor(current / valuePerUpgrade)
    const startCost = currentLevel * COST_INCREMENT + offset

    // Calculate total cost using arithmetic series formula
    // Sum = (n/2) * (2a + (n-1)d) where a = startCost, d = COST_INCREMENT
    const a = startCost
    const d = COST_INCREMENT
    const totalPriceMillions = (n / 2) * (2 * a + (n - 1) * d)

    // Calculate future stats
    const futureLevel = currentLevel + n
    const futureValue = futureLevel * valuePerUpgrade
    const valueIncrease = futureValue - current

    // Next upgrade cost after buying n upgrades (the cost of upgrade n+1)
    const nextUpgradeCostAfterPurchase = a + n * d

    setResults({
      currentLevel,
      targetLevel: futureLevel,
      nextUpgradeCost: nextUpgradeCostAfterPurchase * 1_000_000,
      totalCost: totalPriceMillions * 1_000_000,
      projectedValue: futureValue,
      valueIncrease,
    })
  }

  // Clear results when planet type changes
  const handlePlanetTypeChange = (value: PlanetType | null) => {
    if (!value) {
      return
    }
    setPlanetType(value)
    setResults(null)
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Calculator className="size-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <CardTitle>Planet Upgrade Calculator</CardTitle>
                <CardDescription>
                  Calculate upgrade costs and projected values
                </CardDescription>
              </div>
              {isOpen ? (
                <ChevronUp className="size-5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="size-5 text-muted-foreground shrink-0" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Planet Type Selector */}
            <div className="space-y-2">
              <Label htmlFor="planet-type">Planet Type</Label>
              <Select value={planetType} onValueChange={handlePlanetTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select planet type">
                    {config.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLANET_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Input Fields */}
            <div className="grid gap-4 sm:grid-cols-2 items-end">
              <div className="space-y-2">
                <Label htmlFor="current-value" className="block min-h-[1.25rem]">
                  Current Planet {config.contributionLabel}
                </Label>
                <Input
                  id="current-value"
                  type="text"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder="Enter current value"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="upgrades" className="block min-h-[1.25rem]">
                  Upgrades to Buy
                </Label>
                <Input
                  id="upgrades"
                  type="text"
                  value={upgradesToBuy}
                  onChange={(e) => setUpgradesToBuy(e.target.value)}
                  placeholder="Enter number of upgrades"
                />
              </div>
            </div>

            <Button onClick={calculate} className="w-full">
              Calculate
            </Button>

            {/* Results */}
            {results && (
              <div className="space-y-4 border-t pt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="text-xs text-muted-foreground mb-1">
                      Current {config.facilitiesLabel}
                    </div>
                    <div className="text-2xl font-bold">
                      {formatNumber(results.currentLevel)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="text-xs text-muted-foreground mb-1">
                      Target {config.facilitiesLabel}
                    </div>
                    <div className="text-2xl font-bold">
                      {formatNumber(results.targetLevel)}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20">
                    <div className="text-sm text-muted-foreground mb-1">
                      Total Cost
                    </div>
                    <div className="text-2xl font-bold" title={formatNumber(results.totalCost)}>
                      {formatSmart(results.totalCost)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      Next Upgrade Cost
                    </div>
                    <div className="text-xl font-bold" title={formatNumber(results.nextUpgradeCost)}>
                      {formatCompact(results.nextUpgradeCost)}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-chart-3/10 p-4 ring-1 ring-chart-3/20">
                  <div className="text-sm text-muted-foreground mb-1">
                    Projected Planet {config.contributionLabel}
                  </div>
                  <div className="text-2xl font-bold" title={formatNumber(results.projectedValue)}>
                    {formatSmart(results.projectedValue)}
                    <span className="text-lg text-green-500 ml-2" title={formatNumber(results.valueIncrease)}>
                      (+{formatSmart(results.valueIncrease)})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
