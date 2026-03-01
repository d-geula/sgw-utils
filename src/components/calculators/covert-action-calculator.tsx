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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CalculationResults {
  totalAction: number
  difference: number | null
  baseAction: number
  techBonusAction: number
  raceBonusAction: number
  agentsAction: number
}

const FINAL_MODIFIER = 2

const TECH_BONUS_OPTIONS = {
  "0": { label: "0%", multiplier: 1 },
  "20": { label: "20%", multiplier: 1.2 },
  "50": { label: "50% (effective 56%)", multiplier: 1.56 },
} as const

type TechBonusKey = keyof typeof TECH_BONUS_OPTIONS

const formatNumber = (num: number): string => {
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 })
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

export function CovertActionCalculator() {
  const [isOpen, setIsOpen] = useState(false)
  const [agents, setAgents] = useState("")
  const [skillLevel, setSkillLevel] = useState("")
  const [techBonus, setTechBonus] = useState<TechBonusKey>("0")
  const [raceBonusPercent, setRaceBonusPercent] = useState("")
  const [currentAction, setCurrentAction] = useState("")
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  const calculate = () => {
    setError(null)

    const parsedAgents = parseNonNegativeNumber(agents)
    const parsedSkillLevel = parseNonNegativeNumber(skillLevel)

    if (parsedAgents === null || parsedSkillLevel === null) {
      setError("Enter valid non-negative numbers for agents and skill level.")
      setResults(null)
      return
    }

    const parsedRaceBonus = parseNonNegativeNumber(raceBonusPercent)
    const raceBonusValue = parsedRaceBonus ?? 0

    if (parsedRaceBonus === null && raceBonusPercent.trim()) {
      setError("Race bonus must be a non-negative percentage.")
      setResults(null)
      return
    }

    const parsedCurrentAction = parseNonNegativeNumber(currentAction)
    if (parsedCurrentAction === null && currentAction.trim()) {
      setError("Current action must be a non-negative number.")
      setResults(null)
      return
    }

    const multiplier = 2 ** (parsedSkillLevel / 2)
    const baseAction = parsedAgents * multiplier

    const techMultiplier = TECH_BONUS_OPTIONS[techBonus].multiplier
    const techBonusAction = baseAction * (techMultiplier - 1)
    const raceBonusAction = (baseAction + techBonusAction) * (raceBonusValue / 100)
    const agentsAction = parsedAgents

    const totalAction = Math.floor(
      (baseAction + techBonusAction + raceBonusAction + agentsAction) *
        FINAL_MODIFIER,
    )

    const difference =
      parsedCurrentAction === null ? null : totalAction - parsedCurrentAction

    setResults({
      totalAction,
      difference,
      baseAction,
      techBonusAction,
      raceBonusAction,
      agentsAction,
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
                <CardTitle>Covert/Anti-Covert Action Calculator</CardTitle>
                <CardDescription>
                  Calculate covert or anti-covert action from agents, skill,
                  tech bonus, and race bonus.
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
                  <Label htmlFor="covert-agents">Number of Agents</Label>
                  <Input
                    id="covert-agents"
                    type="text"
                    value={agents}
                    onChange={(e) => setAgents(e.target.value)}
                    placeholder="Agent count"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="covert-skill-level">Skill Level</Label>
                  <Input
                    id="covert-skill-level"
                    type="text"
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value)}
                    placeholder="Skill level"
                  />
                </div>
              </div>

              <div className="grid items-end gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="covert-tech-bonus">Tech Bonus</Label>
                  <Select
                    value={techBonus}
                    onValueChange={(value) => setTechBonus(value as TechBonusKey)}
                  >
                    <SelectTrigger id="covert-tech-bonus" className="w-full">
                      <SelectValue placeholder="Select tech bonus" />
                    </SelectTrigger>
                    <SelectContent
                      side="bottom"
                      alignItemWithTrigger={false}
                      collisionAvoidance={{ side: "none" }}
                    >
                      {Object.entries(TECH_BONUS_OPTIONS).map(([key, option]) => (
                        <SelectItem key={key} value={key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="covert-race-bonus">Race Bonus (%)</Label>
                  <Input
                    id="covert-race-bonus"
                    type="text"
                    value={raceBonusPercent}
                    onChange={(e) => setRaceBonusPercent(e.target.value)}
                    placeholder="e.g. 25"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-covert-action">
                  Current Covert/Anti-Covert Action (Optional)
                </Label>
                <Input
                  id="current-covert-action"
                  type="text"
                  value={currentAction}
                  onChange={(e) => setCurrentAction(e.target.value)}
                  placeholder="Current action"
                />
              </div>

              {error ? <p className="text-xs text-destructive">{error}</p> : null}

              <Button type="submit" className="w-full">
                Calculate
              </Button>

              {results ? (
                <div className="space-y-4 border-t pt-6">
                  <div className="rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20">
                    <div className="mb-1 text-sm text-muted-foreground">
                      Calculated Covert/Anti-Covert Action
                    </div>
                    <div
                      className="text-2xl font-bold"
                      title={formatNumber(results.totalAction)}
                    >
                      {formatCompact(results.totalAction)}
                      {results.difference !== null ? (
                        <span
                          className={`ml-2 text-lg ${results.difference >= 0 ? "text-green-500" : "text-destructive"}`}
                          title={formatNumber(results.difference)}
                        >
                          ({results.difference >= 0 ? "+" : ""}
                          {formatCompact(results.difference)})
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="mb-1 text-xs text-muted-foreground">
                        Base Action
                      </div>
                      <div
                        className="text-lg font-semibold"
                        title={formatNumber(results.baseAction)}
                      >
                        {formatCompact(results.baseAction)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="mb-1 text-xs text-muted-foreground">
                        Tech Bonus Action
                      </div>
                      <div
                        className="text-lg font-semibold"
                        title={formatNumber(results.techBonusAction)}
                      >
                        {formatCompact(results.techBonusAction)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="mb-1 text-xs text-muted-foreground">
                        Race Bonus Action
                      </div>
                      <div
                        className="text-lg font-semibold"
                        title={formatNumber(results.raceBonusAction)}
                      >
                        {formatCompact(results.raceBonusAction)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="mb-1 text-xs text-muted-foreground">
                        Agents (Spies) Action
                      </div>
                      <div
                        className="text-lg font-semibold"
                        title={formatNumber(results.agentsAction)}
                      >
                        {formatCompact(results.agentsAction)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </form>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
