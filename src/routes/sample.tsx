import { createFileRoute } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckIcon,
  DumbbellIcon,
  FlameIcon,
  PlayIcon,
  TargetIcon,
  TimerIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, LinkButton } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

export const Route = createFileRoute("/sample")({
  component: SamplePage,
})

const exercises = [
  { name: "Ring push-ups", prescription: "4 × 8", complete: true },
  { name: "Pike push-ups", prescription: "3 × 6", complete: true },
  { name: "Support hold", prescription: "4 × 20 sec", complete: false },
  { name: "Hollow body hold", prescription: "3 × 30 sec", complete: false },
]

const week = [
  { day: "Mon", label: "Push", complete: true },
  { day: "Wed", label: "Pull", complete: true },
  { day: "Fri", label: "Skills", complete: false },
]

function SamplePage() {
  return (
    <main className="min-h-svh bg-muted/30 text-foreground">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <LinkButton href="/" variant="ghost">
            <ArrowLeftIcon data-icon="inline-start" />
            Back to home
          </LinkButton>
          <Badge variant="outline">Sample route</Badge>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-6 border-b pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Friday · Week 4
            </p>
            <h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Ready to train?
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              This placeholder dashboard demonstrates a simple authenticated
              product route using the current React Aria component set.
            </p>
          </div>
          <Button size="lg">
            <PlayIcon data-icon="inline-start" fill="currentColor" />
            Start workout
          </Button>
        </div>

        <section className="grid gap-5 py-8 md:grid-cols-3">
          <Card size="sm">
            <CardHeader>
              <CardDescription>Current streak</CardDescription>
              <CardAction>
                <FlameIcon className="size-4 text-primary" />
              </CardAction>
              <CardTitle className="text-2xl">12 days</CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Sessions this week</CardDescription>
              <CardAction>
                <CalendarDaysIcon className="size-4 text-primary" />
              </CardAction>
              <CardTitle className="text-2xl">2 of 3</CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Current goal</CardDescription>
              <CardAction>
                <TargetIcon className="size-4 text-primary" />
              </CardAction>
              <CardTitle className="text-2xl">10 pull-ups</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <Card>
            <CardHeader className="border-b">
              <div>
                <CardDescription>Up next</CardDescription>
                <CardTitle className="mt-1 text-base">Push strength</CardTitle>
              </div>
              <CardAction>
                <Badge variant="secondary">
                  <TimerIcon data-icon="inline-start" />
                  42 min
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="mb-5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  2 of 4 exercises
                </span>
                <span className="text-xs font-medium">50%</span>
              </div>
              <Progress aria-label="Workout progress" value={50} />

              <div className="mt-6 border-t">
                {exercises.map((exercise, index) => (
                  <div key={exercise.name}>
                    <div className="flex items-center gap-3 py-4">
                      <span
                        className={`flex size-8 items-center justify-center border ${
                          exercise.complete
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground"
                        }`}
                      >
                        {exercise.complete ? (
                          <CheckIcon className="size-4" />
                        ) : (
                          <DumbbellIcon className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">{exercise.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {exercise.prescription}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Open ${exercise.name}`}
                      >
                        <ArrowRightIcon />
                      </Button>
                    </div>
                    {index < exercises.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <span className="text-xs text-muted-foreground">
                Foundation program
              </span>
              <Button variant="outline">View session</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardDescription>Your schedule</CardDescription>
              <CardTitle>This week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {week.map((session) => (
                  <div key={session.day} className="flex items-center gap-3">
                    <span
                      className={`flex size-8 items-center justify-center border text-[10px] font-semibold ${
                        session.complete
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {session.complete ? (
                        <CheckIcon className="size-4" />
                      ) : (
                        session.day.slice(0, 1)
                      )}
                    </span>
                    <div>
                      <p className="text-xs font-medium">{session.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {session.day}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
