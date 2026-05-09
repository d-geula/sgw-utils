import { useMemo, useState, type ComponentType } from "react"
import {
  AntiCovertActionCalculator,
  CovertActionCalculator,
} from "@/components/calculators/covert-action-calculator"
import { PlanetUpgradeCalculator } from "@/components/calculators/planet-upgrade-calculator"
import { SkillUpgradeCalculator } from "@/components/calculators/skill-upgrade-calculator"
import { IncomeCalculator } from "@/components/calculators/income-calculator"
import { MothershipCalculator } from "@/components/calculators/mothership-calculator"
import { UnitProductionCalculator } from "@/components/calculators/unit-production-calculator"
import {
  DefenceActionCalculator,
  StrikeActionCalculator,
} from "@/components/calculators/weapon-action-calculator"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"

type CalculatorDisplayMode = "accordion" | "standalone"

type CalculatorComponent = ComponentType<{
  defaultOpen?: boolean
  displayMode?: CalculatorDisplayMode
}>

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
    id: "military-stats",
    title: "Military Stats",
    description: "Tools for planning military stat upgrades.",
    calculators: [
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
      {
        id: "mothership",
        title: "Mothership",
        Component: MothershipCalculator,
      },
    ],
  },
  {
    id: "resources",
    title: "Resources",
    description: "Tools for planning production and resource growth.",
    calculators: [
      {
        id: "income",
        title: "Income",
        Component: IncomeCalculator,
      },
      {
        id: "unit-production",
        title: "Unit Production",
        Component: UnitProductionCalculator,
      },
      {
        id: "planet-upgrade",
        title: "Planet Upgrades",
        Component: PlanetUpgradeCalculator,
      },
    ],
  },
  {
    id: "upgrades",
    title: "Tech/Skill Upgrades",
    description: "Tools for planning tech and skill progression (WIP).",
    calculators: [
      {
        id: "skill-upgrade",
        title: "Intel/Counter-Intel Skill",
        Component: SkillUpgradeCalculator,
      },
    ],
  },
] satisfies CategoryDefinition[]

const calculatorSectionClassName = "mx-auto w-full max-w-5xl 2xl:max-w-6xl"

type Selection =
  | { type: "category"; id: string }
  | { type: "calculator"; id: string }

export function App() {
  const [selection, setSelection] = useState<Selection>({
    type: "category",
    id: CATEGORIES[0].id,
  })
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

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
  const updateSelection = (nextSelection: Selection) => {
    setSelection(nextSelection)
    setIsMobileNavOpen(false)
  }

  return (
    <div className="dark relative min-h-screen overflow-x-hidden bg-background lg:h-screen lg:overflow-hidden">
      <div
        aria-hidden="true"
        className="noise-bg pointer-events-none absolute inset-0"
      />

      <div className="relative flex min-h-screen flex-col lg:h-screen lg:min-h-0 lg:flex-row">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-sidebar-border bg-sidebar/95 px-4 py-4 text-sidebar-foreground backdrop-blur lg:hidden">
          <a
            href="/"
            className="min-w-0 text-xl font-bold tracking-tight text-sidebar-foreground transition-colors hover:text-amber-100"
            onClick={(event) => {
              event.preventDefault()
              updateSelection({ type: "category", id: CATEGORIES[0].id })
            }}
          >
            GateWars Utils
            <span className="ml-2 inline-flex -translate-y-1 rounded-sm border border-amber-200/70 bg-amber-200/10 px-1.5 py-0.5 align-middle text-[0.625rem] font-bold uppercase leading-none tracking-normal text-amber-200 shadow-[1px_1px_0_color-mix(in_oklab,var(--color-amber-200)_35%,transparent)]">
              WIP
            </span>
          </a>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={isMobileNavOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isMobileNavOpen}
            aria-controls="calculator-navigation"
            onClick={() => setIsMobileNavOpen((isOpen) => !isOpen)}
          >
            {isMobileNavOpen ? <X /> : <Menu />}
          </Button>
        </header>

        {isMobileNavOpen ? (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 top-[73px] z-20 bg-background/70 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileNavOpen(false)}
          />
        ) : null}

        <aside
          id="calculator-navigation"
          className={cn(
            "fixed inset-x-0 top-[73px] z-30 max-h-[calc(100dvh-73px)] overflow-y-auto border-b border-sidebar-border bg-sidebar/95 px-4 py-5 text-sidebar-foreground shadow-lg backdrop-blur lg:static lg:z-auto lg:block lg:h-screen lg:max-h-none lg:w-72 lg:shrink-0 lg:self-stretch lg:border-b-0 lg:border-r lg:px-5 lg:py-6 lg:shadow-none",
            isMobileNavOpen ? "block" : "hidden",
          )}
        >
          <header className="mb-6 hidden lg:block">
            <a
              href="/"
              className="block text-2xl font-bold tracking-tight text-sidebar-foreground transition-colors hover:text-amber-100"
              onClick={(event) => {
                event.preventDefault()
                updateSelection({ type: "category", id: CATEGORIES[0].id })
              }}
            >
              GateWars Utils
              <span className="ml-2 inline-flex -translate-y-1 rounded-sm border border-amber-200/70 bg-amber-200/10 px-1.5 py-0.5 align-middle text-[0.625rem] font-bold uppercase leading-none tracking-normal text-amber-200 shadow-[1px_1px_0_color-mix(in_oklab,var(--color-amber-200)_35%,transparent)]">
                WIP
              </span>
            </a>
            <p className="mt-1 text-base text-muted-foreground">
              Handy Collection of Calcs
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
                    updateSelection({ type: "category", id: category.id })
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
                        updateSelection({
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
            <section className={calculatorSectionClassName}>
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
                  displayMode="standalone"
                />
              ) : null}
            </section>
          ) : selectedCategory ? (
            <section className={calculatorSectionClassName}>
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
