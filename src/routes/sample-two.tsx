import { createFileRoute } from "@tanstack/react-router"
import {
  ActivityIcon,
  ChartNoAxesColumnIcon,
  ClockIcon,
  CrownIcon,
  HeartPulseIcon,
  MedalIcon,
  TrendingUpIcon,
  TrophyIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

export const Route = createFileRoute("/sample-two")({
  component: SampleTwoPage,
})

const personalBests = [
  {
    exercise: "Pull-ups",
    value: "12 reps",
    achieved: "2 weeks ago",
    isNew: false,
  },
  { exercise: "Dips", value: "18 reps", achieved: "5 days ago", isNew: true },
  {
    exercise: "Pike push-ups",
    value: "10 reps",
    achieved: "1 month ago",
    isNew: false,
  },
  {
    exercise: "Hanging leg raise",
    value: "15 reps",
    achieved: "3 days ago",
    isNew: true,
  },
]

const monthlyVolume = [
  { week: "Week 1", reps: 184, percent: 62 },
  { week: "Week 2", reps: 212, percent: 71 },
  { week: "Week 3", reps: 248, percent: 83 },
  { week: "Week 4", reps: 296, percent: 100 },
]

const milestones = [
  { label: "First muscle-up", progress: 75 },
  { label: "20 pull-ups unbroken", progress: 40 },
  { label: "60 sec L-sit", progress: 55 },
  { label: "Freestanding handstand", progress: 30 },
]

function SampleTwoPage() {
  return (
    <div className="min-h-[calc(100svh-3.5rem)] bg-muted/30 text-foreground">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        {/* Heading */}
        <div className="flex flex-col gap-6 border-b pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Progress overview
            </p>
            <h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Your journey so far
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              A placeholder view for personal records, weekly training volume,
              and skill milestones while the product takes shape.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TrophyIcon className="size-8 text-primary" />
            <div>
              <p className="text-2xl font-semibold tracking-tight">Level 7</p>
              <p className="text-xs text-muted-foreground">
                Intermediate athlete
              </p>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <section className="grid gap-5 py-8 md:grid-cols-4">
          <Card size="sm">
            <CardHeader>
              <CardDescription>Total sessions</CardDescription>
              <CardAction>
                <ActivityIcon className="size-4 text-primary" />
              </CardAction>
              <CardTitle className="text-2xl">87</CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Training volume</CardDescription>
              <CardAction>
                <TrendingUpIcon className="size-4 text-primary" />
              </CardAction>
              <CardTitle className="text-2xl">940 reps</CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Personal bests</CardDescription>
              <CardAction>
                <MedalIcon className="size-4 text-primary" />
              </CardAction>
              <CardTitle className="text-2xl">4</CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Longest streak</CardDescription>
              <CardAction>
                <HeartPulseIcon className="size-4 text-primary" />
              </CardAction>
              <CardTitle className="text-2xl">18 days</CardTitle>
            </CardHeader>
          </Card>
        </section>

        {/* Personal bests + Monthly volume */}
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          {/* Personal bests */}
          <Card>
            <CardHeader className="border-b">
              <div>
                <CardDescription>Recent achievements</CardDescription>
                <CardTitle className="mt-1 text-base">Personal bests</CardTitle>
              </div>
              <CardAction>
                <CrownIcon className="size-4 text-primary" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="mt-2 border-t">
                {personalBests.map((pb, index) => (
                  <div key={pb.exercise}>
                    <div className="flex items-center gap-3 py-4">
                      <span className="flex size-8 items-center justify-center border bg-background text-muted-foreground">
                        <MedalIcon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">{pb.exercise}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {pb.achieved}
                        </p>
                      </div>
                      {pb.isNew && (
                        <Badge variant="secondary" className="text-[10px]">
                          New
                        </Badge>
                      )}
                      <span className="text-sm font-semibold tabular-nums">
                        {pb.value}
                      </span>
                    </div>
                    {index < personalBests.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly volume */}
          <Card>
            <CardHeader className="border-b">
              <CardDescription>This month</CardDescription>
              <CardTitle>Weekly volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5 pt-2">
                {monthlyVolume.map((week) => (
                  <div key={week.week}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        <ClockIcon className="size-3 text-muted-foreground" />
                        {week.week}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {week.reps} reps
                      </span>
                    </div>
                    <Progress
                      aria-label={`${week.week} volume`}
                      value={week.percent}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Skill milestones */}
        <section className="py-8">
          <div className="mb-6 flex items-center gap-2">
            <ChartNoAxesColumnIcon className="size-4 text-primary" />
            <h2 className="text-base font-medium">Skill milestones</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {milestones.map((milestone) => (
              <Card key={milestone.label} size="sm">
                <CardHeader>
                  <CardDescription className="text-sm">
                    {milestone.label}
                  </CardDescription>
                  <CardTitle className="mt-2 text-2xl tabular-nums">
                    {milestone.progress}%
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress
                    aria-label={`Progress toward ${milestone.label}`}
                    value={milestone.progress}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
