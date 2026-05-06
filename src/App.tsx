import {
  AntiCovertActionCalculator,
  CovertActionCalculator,
} from "@/components/calculators/covert-action-calculator"
import { PlanetUpgradeCalculator } from "@/components/calculators/planet-upgrade-calculator"
import { SkillUpgradeCalculator } from "@/components/calculators/skill-upgrade-calculator"
import { UnitProductionCalculator } from "@/components/calculators/unit-production-calculator"
import {
  DefenceActionCalculator,
  StrikeActionCalculator,
} from "@/components/calculators/weapon-action-calculator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const CATEGORIES = [
  {
    id: "resources",
    title: "Resources",
    description: "Tools for planning production and resource growth.",
    calculators: [PlanetUpgradeCalculator, UnitProductionCalculator],
  },
  {
    id: "skills",
    title: "Skills",
    description: "Tools for planning skill progression.",
    calculators: [SkillUpgradeCalculator],
  },
  {
    id: "stats",
    title: "Stats",
    description: "Tools for planning stat upgrades.",
    calculators: [
      CovertActionCalculator,
      AntiCovertActionCalculator,
      StrikeActionCalculator,
      DefenceActionCalculator,
    ],
  },
] as const

export function App() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[oklch(15.7% 0 0)]">
      <div
        aria-hidden="true"
        className="noise-bg pointer-events-none absolute inset-0"
      />

      <div className="relative container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <header className="mb-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            <a href="/" className="transition-colors hover:text-primary">
              StarGateWars Utils
            </a>
          </h1>
          <p className="mt-2 text-muted-foreground">
            A collection of calculators and utilities
          </p>
        </header>

        <div className="space-y-8">
          {CATEGORIES.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle>{category.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
              </CardHeader>

              <CardContent>
                <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
                  {category.calculators.map((CalculatorComponent, index) => (
                    <div key={`${category.id}-${index}`} className="space-y-8">
                      <CalculatorComponent />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
