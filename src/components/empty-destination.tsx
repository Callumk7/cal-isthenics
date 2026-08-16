import type { LucideIcon } from "lucide-react"

export function EmptyDestination({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: LucideIcon
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-8.5rem)] max-w-5xl flex-col px-5 py-8 sm:px-8 sm:py-12 md:min-h-[calc(100svh-3.5rem)]">
      <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
        Your training log
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <section className="mt-8 flex flex-1 flex-col items-center justify-center border border-dashed bg-background px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-base font-semibold">Nothing here yet</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </section>
    </div>
  )
}
