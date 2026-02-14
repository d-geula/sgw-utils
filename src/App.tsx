import { PlanetUpgradeCalculator } from "@/components/calculators/planet-upgrade-calculator"
import { UnitProductionCalculator } from "@/components/calculators/unit-production-calculator"

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

        {/* Main Content - Symmetrical Two Column Layout */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left Column */}
          <div className="space-y-8">
            <PlanetUpgradeCalculator />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <UnitProductionCalculator />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
