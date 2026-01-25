import { Button } from '@/components/ui/button'

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Vite + React + Bun + shadcn/ui
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Foundations are wired up
        </h1>
        <p className="text-base text-muted-foreground">
          This is a minimal smoke test for Tailwind, shadcn/ui, and Vite routing.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button>Primary action</Button>
          <Button variant="outline">Secondary</Button>
        </div>
      </main>
    </div>
  )
}

export default App
