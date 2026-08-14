import { createFileRoute } from "@tanstack/react-router"
import {
  CircleIcon,
  FlameIcon,
  GaugeIcon,
  HandIcon,
  ListChecksIcon,
  PlayIcon,
  StarIcon,
  TargetIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

export const Route = createFileRoute("/sample-four")({
  component: SkillsPage,
})

const skillProgressions = [
  {
    skill: "Handstand",
    stage: "Wall walk-ups",
    progress: 62,
  },
  {
    skill: "L-sit",
    stage: "Tuck hold",
    progress: 48,
  },
  {
    skill: "Muscle-up",
    stage: "Transition drills",
    progress: 35,
  },
  {
    skill: "Front lever",
    stage: "Tuck lever",
    progress: 27,
  },
]

const sessionDrills = [
  { label: "Wall handstand hold", duration: "5 × 30 sec", complete: true },
  { label: "L-sit tuck hold", duration: "4 × 20 sec", complete: true },
  { label: "Straight bar dips", duration: "4 × 6", complete: false },
  { label: "Tuck front lever hold", duration: "3 × 15 sec", complete: false },
]

function SkillsPage() {
  return (
    <div className="min-h-[calc(100svh-3.5rem)] bg-muted/30 text-foreground">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-6 border-b pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Skill practice
            </p>
            <h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Master your skills
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              A placeholder workspace for planning skill practice sessions and
              tracking progressions like the handstand, L-sit, muscle-up, and
              front lever.
            </p>
          </div>
          <Button size="lg">
            <PlayIcon data-icon="inline-start" fill="currentColor" />
            Start practice
          </Button>
        </div>

        <section className="grid gap-5 py-8 md:grid-cols-3">
          <Card size="sm">
            <CardHeader>
              <CardDescription>Skills in progress</CardDescription>
              <CardAction>
                <TargetIcon className="size-4 text-primary" />
              </CardAction>
              <CardTitle className="text-2xl">4</CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Practice streak</CardDescription>
              <CardAction>
                <FlameIcon className="size-4 text-primary" />
              </CardAction>
              <CardTitle className="text-2xl">9 days</CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Closest to unlock</CardDescription>
              <CardAction>
                <StarIcon className="size-4 text-primary" />
              </CardAction>
              <CardTitle className="text-2xl">Handstand</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <Card>
            <CardHeader className="border-b">
              <div>
                <CardDescription>Today&apos;s session</CardDescription>
                <CardTitle className="mt-1 text-base">
                  Handstand &amp; L-sit focus
                </CardTitle>
              </div>
              <CardAction>
                <Badge variant="secondary">
                  <GaugeIcon data-icon="inline-start" />
                  30 min
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="mb-5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  2 of 4 drills
                </span>
                <span className="text-xs font-medium">50%</span>
              </div>
              <Progress aria-label="Practice session progress" value={50} />

              <div className="mt-6 border-t">
                {sessionDrills.map((drill, index) => (
                  <div key={drill.label}>
                    <div className="flex items-center gap-3 py-4">
                      <span
                        className={`flex size-8 items-center justify-center border ${
                          drill.complete
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground"
                        }`}
                      >
                        {drill.complete ? (
                          <HandIcon className="size-4" />
                        ) : (
                          <CircleIcon className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">{drill.label}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {drill.duration}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {drill.complete ? "Done" : "Up next"}
                      </Badge>
                    </div>
                    {index < sessionDrills.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardDescription>Progressions</CardDescription>
              <CardTitle>Skill roadmap</CardTitle>
              <CardAction>
                <ListChecksIcon className="size-4 text-primary" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {skillProgressions.map((item) => (
                  <div key={item.skill}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-medium">{item.skill}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {item.progress}%
                      </span>
                    </div>
                    <Progress
                      aria-label={`${item.skill} progression`}
                      value={item.progress}
                    />
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {item.stage}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
