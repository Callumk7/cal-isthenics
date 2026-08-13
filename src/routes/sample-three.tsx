import { createFileRoute } from "@tanstack/react-router"
import {
  BatteryChargingIcon,
  CheckCircle2Icon,
  CircleIcon,
  FootprintsIcon,
  HeartPulseIcon,
  MoonIcon,
  SparklesIcon,
  TimerResetIcon,
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

export const Route = createFileRoute("/sample-three")({
  component: RecoveryPage,
})

const readinessMetrics = [
  { label: "Sleep", value: "7h 48m", score: 86, icon: MoonIcon },
  { label: "Energy", value: "High", score: 82, icon: BatteryChargingIcon },
  { label: "Mobility", value: "Good", score: 74, icon: FootprintsIcon },
]

const recoveryPlan = [
  { label: "Wrist preparation", duration: "4 min", complete: true },
  { label: "Shoulder CARs", duration: "6 min", complete: true },
  { label: "Thoracic flow", duration: "8 min", complete: false },
  { label: "Hip mobility", duration: "7 min", complete: false },
]

function RecoveryPage() {
  return (
    <div className="min-h-[calc(100svh-3.5rem)] bg-muted/30 text-foreground">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-6 border-b pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Daily readiness
            </p>
            <h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Move better today
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              Review your recovery signals and complete a short mobility session
              before your next strength workout.
            </p>
          </div>
          <Button size="lg">
            <SparklesIcon data-icon="inline-start" />
            Begin mobility flow
          </Button>
        </div>

        <section className="grid gap-5 py-8 md:grid-cols-3">
          {readinessMetrics.map((metric) => (
            <Card key={metric.label} size="sm">
              <CardHeader>
                <CardDescription>{metric.label}</CardDescription>
                <CardAction>
                  <metric.icon className="size-4 text-primary" />
                </CardAction>
                <CardTitle className="text-2xl">{metric.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress
                  aria-label={`${metric.label} readiness`}
                  value={metric.score}
                />
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <Card>
            <CardHeader className="border-b">
              <div>
                <CardDescription>Recommended today</CardDescription>
                <CardTitle className="mt-1 text-base">
                  Upper-body reset
                </CardTitle>
              </div>
              <CardAction>
                <Badge variant="secondary">
                  <TimerResetIcon data-icon="inline-start" />
                  25 min
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="mb-5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  2 of 4 movements
                </span>
                <span className="text-xs font-medium">50%</span>
              </div>
              <Progress aria-label="Mobility session progress" value={50} />

              <div className="mt-6 border-t">
                {recoveryPlan.map((movement, index) => (
                  <div key={movement.label}>
                    <div className="flex items-center gap-3 py-4">
                      {movement.complete ? (
                        <CheckCircle2Icon className="size-5 text-primary" />
                      ) : (
                        <CircleIcon className="size-5 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">{movement.label}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {movement.duration}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {movement.complete ? "Done" : "Up next"}
                      </Badge>
                    </div>
                    {index < recoveryPlan.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardDescription>Recovery score</CardDescription>
              <CardTitle>Ready to train</CardTitle>
              <CardAction>
                <HeartPulseIcon className="size-4 text-primary" />
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-5xl font-semibold tracking-tight tabular-nums">
                  81
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Your recovery is above your four-week average. Keep
                  today&apos;s session at the planned intensity.
                </p>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">4-week average</span>
                <span className="font-medium tabular-nums">76</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
