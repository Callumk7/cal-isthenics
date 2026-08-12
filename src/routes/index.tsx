import { createFileRoute } from "@tanstack/react-router"
import {
  ArrowRightIcon,
  BarChart3Icon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronRightIcon,
  FlameIcon,
  PlayIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TargetIcon,
  TimerIcon,
  TrophyIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button, LinkButton } from "@/components/ui/button"
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

export const Route = createFileRoute("/")({ component: LandingPage })

const features = [
  {
    icon: TargetIcon,
    title: "Adaptive programming",
    description:
      "Your plan progresses with you, from first push-up to advanced skills.",
  },
  {
    icon: BarChart3Icon,
    title: "Progress that shows",
    description:
      "Track reps, holds, volume, and personal bests without spreadsheet admin.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Built for longevity",
    description:
      "Smart deloads and mobility work help you train consistently and safely.",
  },
]

const sessions = [
  {
    day: "MON",
    name: "Push strength",
    detail: "42 min · 6 movements",
    done: true,
  },
  {
    day: "WED",
    name: "Pull & core",
    detail: "38 min · 5 movements",
    done: false,
  },
  {
    day: "FRI",
    name: "Skill session",
    detail: "30 min · Handstand",
    done: false,
  },
]

const stats = [
  { value: "10k+", label: "workouts completed", icon: CalendarDaysIcon },
  { value: "2.4k", label: "active athletes", icon: UsersIcon },
  { value: "86%", label: "hit a new personal best", icon: TrophyIcon },
]

function LandingPage() {
  return (
    <main className="min-h-svh overflow-hidden bg-background text-foreground">
      <header className="relative z-20 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <a
            href="#"
            className="flex items-center gap-2.5"
            aria-label="Form home"
          >
            <span className="flex size-8 items-center justify-center bg-primary text-primary-foreground">
              <ZapIcon className="size-4" fill="currentColor" />
            </span>
            <span className="text-sm font-semibold tracking-tight">FORM</span>
          </a>

          <nav className="hidden items-center gap-7 text-xs font-medium text-muted-foreground md:flex">
            <a
              className="transition-colors hover:text-foreground"
              href="#program"
            >
              Program
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="#features"
            >
              Features
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="#community"
            >
              Community
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <LinkButton
              href="#"
              variant="ghost"
              className="hidden sm:inline-flex"
            >
              Sign in
            </LinkButton>
            <LinkButton href="#get-started">
              Start training
              <ArrowRightIcon data-icon="inline-end" />
            </LinkButton>
          </div>
        </div>
      </header>

      <section className="relative border-b">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_85%)] bg-[size:48px_48px] opacity-35" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-6 bg-background">
              <SparklesIcon data-icon="inline-start" />
              Your body is the equipment
            </Badge>
            <h1 className="max-w-3xl font-heading text-5xl leading-[0.96] font-semibold tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Build strength.
              <br />
              Master your body.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Personalised calisthenics programming that meets you where you are
              and takes you where you want to go.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="#get-started" size="lg" className="sm:min-w-40">
                Build my program
                <ArrowRightIcon data-icon="inline-end" />
              </LinkButton>
              <Button variant="outline" size="lg" className="sm:min-w-36">
                <PlayIcon data-icon="inline-start" fill="currentColor" />
                See how it works
              </Button>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <AvatarGroup>
                <Avatar size="sm">
                  <AvatarFallback className="bg-amber-100 text-amber-800">
                    AM
                  </AvatarFallback>
                </Avatar>
                <Avatar size="sm">
                  <AvatarFallback className="bg-blue-100 text-blue-800">
                    JL
                  </AvatarFallback>
                </Avatar>
                <Avatar size="sm">
                  <AvatarFallback className="bg-emerald-100 text-emerald-800">
                    SK
                  </AvatarFallback>
                </Avatar>
              </AvatarGroup>
              <span>
                Join{" "}
                <strong className="font-medium text-foreground">2,400+</strong>{" "}
                athletes training this week
              </span>
            </div>
          </div>

          <div
            id="program"
            className="relative mx-auto w-full max-w-xl lg:mx-0"
          >
            <div className="absolute -top-5 -right-5 size-28 bg-primary/10" />
            <div className="absolute -bottom-5 -left-5 size-36 border border-primary/20" />
            <Card className="relative gap-0 py-0 shadow-2xl shadow-foreground/10">
              <CardHeader className="border-b py-5">
                <div>
                  <CardDescription>This week</CardDescription>
                  <CardTitle className="mt-1 text-base">
                    Foundation · Week 4
                  </CardTitle>
                </div>
                <CardAction>
                  <Badge variant="secondary">
                    <FlameIcon data-icon="inline-start" />
                    12 day streak
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="py-5">
                <div className="mb-6 flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-semibold tracking-tight">67%</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Weekly progress
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    2 of 3 sessions
                  </span>
                </div>
                <Progress aria-label="Weekly progress" value={67} />

                <div className="mt-6 border-t">
                  {sessions.map((session, index) => (
                    <div key={session.day}>
                      <div className="flex items-center gap-4 py-4">
                        <div className="w-8 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">
                          {session.day}
                        </div>
                        <div
                          className={`flex size-8 items-center justify-center border ${
                            session.done
                              ? "border-primary bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {session.done ? (
                            <CheckIcon className="size-4" />
                          ) : (
                            <TimerIcon className="size-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium">{session.name}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {session.detail}
                          </p>
                        </div>
                        <ChevronRightIcon className="size-4 text-muted-foreground" />
                      </div>
                      {index < sessions.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28"
      >
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <Badge variant="secondary">Train with intent</Badge>
            <h2 className="mt-5 max-w-md text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Everything you need to keep moving forward.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">
              No random workouts. Every session has a purpose, every progression
              is earned, and every milestone is visible.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden border bg-border sm:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-background p-6 sm:min-h-64"
              >
                <feature.icon className="size-5 text-primary" />
                <h3 className="mt-16 text-sm font-medium">{feature.title}</h3>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="community" className="border-y bg-muted/40">
        <div className="mx-auto grid max-w-7xl divide-y px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0">
          {stats.map(({ value, label, icon: Icon }, index) => (
            <div
              key={String(label)}
              className={`flex items-center gap-5 py-8 md:px-8 ${index === 0 ? "md:pl-0" : ""}`}
            >
              <Icon className="size-5 text-primary" />
              <div>
                <p className="text-2xl font-semibold tracking-tight">{value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="get-started" className="px-5 py-20 sm:px-8 sm:py-28">
        <Card className="relative mx-auto max-w-7xl overflow-hidden bg-foreground py-0 text-background ring-0">
          <div className="pointer-events-none absolute top-0 right-0 size-72 translate-x-1/3 -translate-y-1/3 rounded-full border border-background/15" />
          <div className="pointer-events-none absolute top-0 right-0 size-96 translate-x-1/3 -translate-y-1/3 rounded-full border border-background/10" />
          <CardContent className="relative flex flex-col items-start gap-8 px-7 py-12 sm:px-12 sm:py-16 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge className="bg-background text-foreground">
                Start today
              </Badge>
              <h2 className="mt-6 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Your strongest self is built one rep at a time.
              </h2>
            </div>
            <LinkButton
              href="#"
              variant="secondary"
              size="lg"
              className="shrink-0"
            >
              Take the assessment
              <ArrowRightIcon data-icon="inline-end" />
            </LinkButton>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2">
            <ZapIcon className="size-3.5 text-primary" fill="currentColor" />
            <span className="font-medium text-foreground">FORM</span>
            <span>© 2026</span>
          </div>
          <p>Train smart. Move well. Stay consistent.</p>
        </div>
      </footer>
    </main>
  )
}
