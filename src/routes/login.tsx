import { useEffect, useRef, useState } from "react"
import type { FormEvent } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { LockKeyholeIcon, ZapIcon } from "lucide-react"

import { DEFAULT_AUTHENTICATED_PATH, getSafeReturnTo } from "@/auth/access"
import { login } from "@/auth/server-functions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: getSafeReturnTo(search.returnTo),
  }),
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — FORM" }] }),
})

function LoginPage() {
  const navigate = useNavigate()
  const { returnTo } = Route.useSearch()
  const passwordRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setPending(true)
    const form = new FormData(event.currentTarget)

    try {
      const result = await login({
        data: { password: String(form.get("password") ?? "") },
      })
      if (result.ok) {
        await navigate({ href: returnTo ?? DEFAULT_AUTHENTICATED_PATH })
      } else {
        setError(result.error)
      }
    } catch {
      setError("Unable to sign in. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-5 py-12">
      <div className="w-full max-w-sm border bg-background p-7 shadow-sm sm:p-9">
        <div className="mb-8">
          <span className="mb-6 flex size-10 items-center justify-center bg-primary text-primary-foreground">
            <ZapIcon
              className="size-5"
              fill="currentColor"
              aria-hidden="true"
            />
          </span>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            FORM
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Enter your password to open your training workspace.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          aria-describedby={error ? "login-error" : undefined}
        >
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              ref={passwordRef}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              disabled={pending}
            />
          </div>
          {error && (
            <p
              ref={errorRef}
              id="login-error"
              role="alert"
              tabIndex={-1}
              className="mt-3 text-xs text-destructive outline-none"
            >
              {error}
            </p>
          )}
          <Button type="submit" className="mt-6 w-full" isDisabled={pending}>
            <LockKeyholeIcon aria-hidden="true" />
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  )
}
