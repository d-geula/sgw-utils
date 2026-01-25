import { useState } from "react"
import { Construction, ChevronDown, ChevronUp } from "lucide-react"
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

interface PlaceholderCalculatorProps {
  title: string
  description: string
  defaultOpen?: boolean
}

export function PlaceholderCalculator({
  title,
  description,
  defaultOpen = false,
}: PlaceholderCalculatorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="opacity-60">
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Construction className="size-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0 text-left">
                <CardTitle className="inline-flex items-center justify-center gap-2">
                  {title}
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Planned
                  </span>
                </CardTitle>
                <CardDescription>{description}</CardDescription>
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
          <CardContent>
            <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20">
              <p className="text-muted-foreground text-sm">
                This utility is planned for a future update
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
