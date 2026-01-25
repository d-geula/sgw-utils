import { PlanetUpgradeCalculator } from "@/components/calculators/planet-upgrade-calculator"
import { PlaceholderCalculator } from "@/components/calculators/placeholder-calculator"

export function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <header className="mb-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            StarGateWars Utils
          </h1>
          <p className="mt-2 text-muted-foreground">
            A collection of calculators and utilities
          </p>
        </header>

        {/* Main Content - Symmetrical Two Column Layout */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-15">
          {/* Left Column */}
          <div className="space-y-8">
            <PlanetUpgradeCalculator />

            <PlaceholderCalculator
              title="Placeholder"
              description="Coming soon..."
            />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <PlaceholderCalculator
              title="Placeholder"
              description="Coming soon..."
            />

            <PlaceholderCalculator
              title="Placeholder"
              description="Coming soon..."
            />

            <PlaceholderCalculator
              title="Placeholder"
              description="Coming soon..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
