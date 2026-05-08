import { ChevronDown, Plus, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  createDefaultPlanetContributions,
  getPlanetContributionSummary,
  parsePlanetContributionValue,
  type PlanetContributionKind,
} from "@/components/calculators/planet-contributions"

const MIN_PLANET_ROWS = 1
const MAX_PLANET_ROWS = 10

interface PlanetContributionsInputProps {
  id: string
  label?: string
  values: string[]
  cap: number
  valueDivisor?: number
  description?: string
  capLabel?: string
  capValueSuffix?: string
  rawTotalLabel?: string
  rawTotalValueSuffix?: string
  kind?: PlanetContributionKind
  onChange: (values: string[]) => void
  formatNumber: (value: number) => string
  formatCompact: (value: number) => string
}

export function PlanetContributionsInput({
  id,
  label = "Effective Planet Contribution",
  values,
  cap,
  valueDivisor = 1,
  description,
  capLabel = "Per-planet cap",
  capValueSuffix = "",
  rawTotalLabel = "Raw total",
  rawTotalValueSuffix = "",
  kind = "income",
  onChange,
  formatNumber,
  formatCompact,
}: PlanetContributionsInputProps) {
  const safeValues = values.length ? values : createDefaultPlanetContributions()
  const summary = getPlanetContributionSummary(safeValues, cap, valueDivisor)
  const hasEnteredDetails = safeValues.some((value) => value.trim())
  const hasInvalidValue = summary === null
  const planetListRef = useRef<HTMLDivElement>(null)
  const [hasScrollablePlanetList, setHasScrollablePlanetList] = useState(false)
  const [isPlanetListAtTop, setIsPlanetListAtTop] = useState(true)
  const shouldShowScrollHint =
    hasScrollablePlanetList && isPlanetListAtTop

  useEffect(() => {
    const planetList = planetListRef.current

    if (!planetList) {
      return
    }

    const updateScrollState = () => {
      setHasScrollablePlanetList(
        planetList.scrollHeight > planetList.clientHeight + 1,
      )
      setIsPlanetListAtTop(planetList.scrollTop <= 0)
    }

    updateScrollState()

    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(planetList)

    return () => resizeObserver.disconnect()
  }, [safeValues, cap, valueDivisor])

  const updateValue = (index: number, nextValue: string) => {
    onChange(
      safeValues.map((value, valueIndex) =>
        valueIndex === index ? nextValue : value,
      ),
    )
  }

  const addPlanet = () => {
    if (safeValues.length >= MAX_PLANET_ROWS) {
      return
    }

    onChange([...safeValues, ""])
  }

  const removePlanet = (index: number) => {
    if (safeValues.length <= MIN_PLANET_ROWS) {
      onChange([""])
      return
    }

    onChange(safeValues.filter((_, valueIndex) => valueIndex !== index))
  }

  const triggerText =
    hasInvalidValue && hasEnteredDetails
      ? "Check planet details"
      : summary && hasEnteredDetails
        ? `${formatNumber(Math.round(summary.effectiveTotal))} / turn`
        : "Click to edit planet details"

  const contributionName =
    kind === "income"
      ? "income"
      : kind === "covert" || kind === "anti-covert"
        ? "covert/anti-covert"
        : kind

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover>
        <PopoverTrigger
          id={id}
          className={cn(
            "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full min-w-0 items-center justify-start rounded-md border bg-transparent px-2.5 py-1 text-left text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] md:text-sm",
            hasEnteredDetails ? "text-foreground" : "text-muted-foreground",
            hasInvalidValue ? "border-destructive" : undefined,
          )}
        >
          <span className="truncate">{triggerText}</span>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(var(--anchor-width),calc(100vw-2rem))]"
        >
          <PopoverHeader>
            <PopoverTitle className="sr-only">Planet contribution(s)</PopoverTitle>
            <PopoverDescription>
              {description ??
                `Enter the actual ${contributionName} contribution for each planet.`}
            </PopoverDescription>
          </PopoverHeader>

          <div className="relative">
            <div
              ref={planetListRef}
              className="flex h-[14.5rem] flex-col gap-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={(event) => {
                setIsPlanetListAtTop(event.currentTarget.scrollTop <= 0)
              }}
            >
              {safeValues.map((value, index) => {
                const parsed = parsePlanetContributionValue(value)
                const isInvalid = parsed === null
                const hasValue = value.trim().length > 0
                const normalized = parsed === null ? 0 : parsed / valueDivisor
                const reduction =
                  parsed !== null && normalized > cap ? normalized - cap : 0
                const displayCap = cap * valueDivisor
                const displayReduction = reduction * valueDivisor

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex flex-col gap-1.5 transition-opacity",
                      hasValue ? undefined : "opacity-60",
                    )}
                  >
                    <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_2.25rem] items-center gap-3">
                      <Label htmlFor={`${id}-${index}`}>{index + 1}</Label>
                      <Input
                        id={`${id}-${index}`}
                        type="text"
                        value={value}
                        onChange={(event) =>
                          updateValue(index, event.target.value)
                        }
                        placeholder="0"
                        aria-invalid={isInvalid}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePlanet(index)}
                        aria-label={`Remove planet ${index + 1}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    {isInvalid ? (
                      <p className="pl-10 text-xs text-destructive">
                        Enter a valid non-negative number.
                      </p>
                    ) : reduction > 0 ? (
                      <p className="pl-10 text-xs text-destructive">
                        {formatCompact(displayCap)} effective (
                        {formatCompact(displayReduction)} lost)
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-popover via-popover/70 to-transparent pb-0.5 pt-4 text-muted-foreground transition-opacity duration-200",
                shouldShowScrollHint ? "opacity-100" : "opacity-0",
              )}
            >
              <ChevronDown />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {capLabel}: {formatCompact(cap * valueDivisor)}
                {capValueSuffix}
              </span>
              {summary ? (
                <span className="text-xs text-muted-foreground">
                  {rawTotalLabel}: {formatCompact(
                    summary.rawTotal * valueDivisor,
                  )}
                  {rawTotalValueSuffix}
                </span>
              ) : null}
            </div>
            {summary && summary.cappedCount > 0 ? (
              <Badge variant="destructive">
                {summary.cappedCount} capped
              </Badge>
            ) : null}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addPlanet}
            disabled={safeValues.length >= MAX_PLANET_ROWS}
          >
            <Plus data-icon="inline-start" />
            {safeValues.length >= MAX_PLANET_ROWS ? "Max planets" : "Add planet"}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  )
}
