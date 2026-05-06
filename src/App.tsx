import { useMemo, useState, type ComponentType } from "react"
import {
  AntiCovertActionCalculator,
  CovertActionCalculator,
} from "@/components/calculators/covert-action-calculator"
import { PlanetUpgradeCalculator } from "@/components/calculators/planet-upgrade-calculator"
import { SkillUpgradeCalculator } from "@/components/calculators/skill-upgrade-calculator"
import { IncomeCalculator } from "@/components/calculators/income-calculator"
import { UnitProductionCalculator } from "@/components/calculators/unit-production-calculator"
import {
  DefenceActionCalculator,
  StrikeActionCalculator,
} from "@/components/calculators/weapon-action-calculator"
import { Button } from "@/components/ui/button"

type CalculatorComponent = ComponentType<{ defaultOpen?: boolean }>

interface CalculatorDefinition {
  id: string
  title: string
  Component: CalculatorComponent
}

interface CategoryDefinition {
  id: string
  title: string
  description: string
  calculators: CalculatorDefinition[]
}

const CATEGORIES = [
  {
    id: "stats",
    title: "Stats",
    description: "Tools for planning stat upgrades.",
    calculators: [
      {
        id: "income",
        title: "Income",
        Component: IncomeCalculator,
      },
      {
        id: "strike-action",
        title: "Strike Action",
        Component: StrikeActionCalculator,
      },
      {
        id: "defence-action",
        title: "Defence Action",
        Component: DefenceActionCalculator,
      },
      {
        id: "covert-action",
        title: "Covert Action",
        Component: CovertActionCalculator,
      },
      {
        id: "anti-covert-action",
        title: "Anti-Covert Action",
        Component: AntiCovertActionCalculator,
      },
    ],
  },
  {
    id: "resources",
    title: "Resources",
    description: "Tools for planning production and resource growth.",
    calculators: [
      {
        id: "planet-upgrade",
        title: "Planet Upgrade",
        Component: PlanetUpgradeCalculator,
      },
      {
        id: "unit-production",
        title: "Unit Production",
        Component: UnitProductionCalculator,
      },
    ],
  },
  {
    id: "skills",
    title: "Skills",
    description: "Tools for planning skill progression.",
    calculators: [
      {
        id: "skill-upgrade",
        title: "Skill Upgrade",
        Component: SkillUpgradeCalculator,
      },
    ],
  },
] satisfies CategoryDefinition[]

type Selection =
  | { type: "category"; id: string }
  | { type: "calculator"; id: string }

export function App() {
  const [selection, setSelection] = useState<Selection>({
    type: "category",
    id: CATEGORIES[0].id,
  })

  const selectedCategory = useMemo(() => {
    if (selection.type === "category") {
      return CATEGORIES.find((category) => category.id === selection.id)
    }

    return CATEGORIES.find((category) =>
      category.calculators.some((calculator) => calculator.id === selection.id),
    )
  }, [selection])

  const selectedCalculator = useMemo<CalculatorDefinition | undefined>(() => {
    if (selection.type !== "calculator") {
      return undefined
    }

    return CATEGORIES.flatMap((category) => category.calculators).find(
      (calculator) => calculator.id === selection.id,
    )
  }, [selection])
  const SelectedCalculatorComponent = selectedCalculator?.Component

  return (
    <div className="dark relative min-h-screen overflow-x-hidden bg-background lg:h-screen lg:overflow-hidden">
      <div
        aria-hidden="true"
        className="noise-bg pointer-events-none absolute inset-0"
      />

      <div className="relative flex min-h-screen flex-col lg:h-screen lg:min-h-0 lg:flex-row">
        <aside className="border-b border-sidebar-border bg-sidebar/90 px-4 py-5 text-sidebar-foreground backdrop-blur lg:h-screen lg:w-72 lg:shrink-0 lg:self-stretch lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <header className="mb-6">
            <a
              href="/"
              className="block text-2xl font-bold tracking-tight transition-colors hover:text-sidebar-primary"
              onClick={(event) => {
                event.preventDefault()
                setSelection({ type: "category", id: CATEGORIES[0].id })
              }}
            >
              GateWars Utils
              <span className="ml-2 inline-flex -translate-y-1 rounded-sm border border-amber-200/70 bg-amber-200/10 px-1.5 py-0.5 align-middle text-[0.625rem] font-bold uppercase leading-none tracking-normal text-amber-200 shadow-[1px_1px_0_color-mix(in_oklab,var(--color-amber-200)_35%,transparent)]">
                WIP
              </span>
            </a>
            <p className="mt-1 text-base text-muted-foreground">
              Calculators and utilities
            </p>
          </header>

          <nav aria-label="Calculator navigation" className="flex flex-col gap-4">
            {CATEGORIES.map((category) => (
              <div key={category.id} className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant={
                    selection.type === "category" && selection.id === category.id
                      ? "secondary"
                      : "ghost"
                  }
                  className="h-auto justify-start px-2 py-2 text-left text-base"
                  onClick={() =>
                    setSelection({ type: "category", id: category.id })
                  }
                >
                  {category.title}
                </Button>

                <div className="flex flex-col gap-1 pl-3">
                  {category.calculators.map((calculator) => (
                    <Button
                      key={calculator.id}
                      type="button"
                      variant={
                        selection.type === "calculator" &&
                        selection.id === calculator.id
                          ? "outline"
                          : "ghost"
                      }
                      size="sm"
                      className="h-auto justify-start px-2 py-1.5 text-left text-sm text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setSelection({
                          type: "calculator",
                          id: calculator.id,
                        })
                      }
                    >
                      {calculator.title}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:h-screen lg:min-h-0 lg:overflow-y-auto lg:px-10 lg:py-10 xl:px-16 2xl:px-24">
          {selectedCalculator ? (
            <section className="mx-auto w-full max-w-5xl 2xl:max-w-6xl">
              <div className="mb-6">
                <p className="text-sm text-muted-foreground">
                  {selectedCategory?.title}
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">
                  {selectedCalculator.title}
                </h1>
              </div>

              {SelectedCalculatorComponent ? (
                <SelectedCalculatorComponent
                  key={selectedCalculator.id}
                  defaultOpen
                />
              ) : null}
            </section>
          ) : selectedCategory ? (
            <section className="mx-auto w-full max-w-6xl 2xl:max-w-7xl">
              <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">
                  {selectedCategory.title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {selectedCategory.description}
                </p>
              </div>

              <div className="flex flex-col gap-8">
                {selectedCategory.calculators.map((calculator) => (
                  <div key={calculator.id}>
                    <calculator.Component />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  )
}

export default App
