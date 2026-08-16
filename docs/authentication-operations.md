# Authentication operations

FORM is a single-owner, password-only application. There is no public signup. Authentication state is stored in Cloudflare D1 and the browser receives an opaque, HTTP-only session cookie.

## Runtime requirements

`wrangler.jsonc` is the source of truth for both required bindings:

- `DB` — the `cal-isthenics-db` D1 database.
- `LOGIN_RATE_LIMITER` — the login rate-limit binding.

The application has no runtime plaintext-password or authentication-secret environment variable. A password exists only while provisioning, through standard input or the temporary `CAL_PASSWORD` process variable. Cloudflare credentials used by Wrangler are operator credentials and must not be committed to this repository.

The session cookie is `HttpOnly`, `Secure`, `SameSite=Lax`, scoped to `/`, and expires after 30 days. D1 stores only a SHA-256 token hash. Passwords are stored as salted PBKDF2-SHA-256 hashes.

## Local setup and provisioning

1. Install dependencies and apply all migrations:

   ```bash
   pnpm install
   pnpm db:migrate
   ```

2. Provision (or replace) the local owner password without putting it in command history:

   ```bash
    read -rsp "Password: " CAL_PASSWORD
   printf '%s' "$CAL_PASSWORD" | pnpm auth:provision
   unset CAL_PASSWORD
   ```

3. Start the Worker locally and sign in at `http://localhost:3000/login`:

   ```bash
   pnpm dev
   ```

Provisioning is reproducible and idempotent: running it again updates the `owner` row and deletes every existing session for that owner. This is also the password recovery and global session-revocation procedure.

Do not place `CAL_PASSWORD` in `.env`, `.dev.vars`, source control, shell history, CI configuration, issue comments, or logs. Secret-injected automation may set it only for the lifetime of the provisioning process.

## Production provisioning and deployment

Authenticate Wrangler using an operator account with access to the Worker and D1 database:

```bash
pnpm exec wrangler whoami
# If required:
pnpm exec wrangler login
```

For a new Cloudflare account, create D1 once and update the generated `database_id` in `wrangler.jsonc`:

```bash
pnpm exec wrangler d1 create cal-isthenics-db
pnpm cf-typegen
```

For each release:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm check
pnpm build
pnpm db:migrate:remote
pnpm deploy
```

Provision the production owner only after its migrations have applied:

```bash
 read -rsp "Password: " CAL_PASSWORD
printf '%s' "$CAL_PASSWORD" | pnpm auth:provision --remote
unset CAL_PASSWORD
```

Re-provisioning immediately invalidates all existing production sessions. Treat this as an operationally disruptive action.

## Security and logging rules

- Never log request bodies, cookie values, password values, password hashes, or session database rows.
- Authentication responses contain only an `ok` flag and a fixed error message; auth-state responses contain only `authenticated`.
- Invalid credentials use the same response whether the owner is absent or the password is wrong.
- Protected server operations must call `requireCurrentSession()`; a client route guard is not an authorization boundary.
- Logout revokes the hashed D1 session before deleting the browser cookie.
- To inspect production failures, use status/error filtering rather than logging request data: `pnpm exec wrangler tail --status error`.

## Release verification checklist

Record the deployment URL, Worker version, tester, and date in the release or ticket. Use a private browser window and a non-production password when testing local or staging environments.

### Automated and local checks

- [ ] `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm check`, and `pnpm build` pass.
- [ ] `pnpm db:migrate` reports that local migrations applied or are already applied.
- [ ] A valid password signs in; an invalid password shows the fixed credentials error.
- [ ] Reloading and closing/reopening the page preserves the session.
- [ ] Direct navigation to `/progress`, `/record`, and `/history` works while signed in.
- [ ] After sign out, direct navigation to a protected URL redirects to `/login`.
- [ ] Browser developer tools show no password, password hash, or raw session token in response payloads, console output, or application storage other than the opaque HTTP-only cookie entry.

### Responsive shell check

Check at minimum these representative CSS viewport sizes in browser responsive mode:

- [ ] `375 × 667` (small mobile): header, five-item bottom navigation, content, and sign-out control are usable without horizontal scrolling.
- [ ] `390 × 844` (common mobile): safe-area/bottom navigation does not cover page content.
- [ ] `768 × 1024` (tablet boundary): desktop sidebar appears and the mobile navigation is absent.
- [ ] `1440 × 900` (desktop): sidebar, page header, active navigation state, and content alignment render correctly.

At each width, use every navigation destination, verify the active state, keyboard-focus the controls, and sign out once.

### Deployed Worker smoke test

- [ ] Apply remote migrations and provision the owner using the commands above.
- [ ] Open a protected URL in a private browser; confirm redirect to `/login` with a local `returnTo` value.
- [ ] Confirm an invalid password fails without revealing account existence.
- [ ] Sign in, confirm return to the original protected URL, then revisit the deployment in the same browser and confirm persistence.
- [ ] Navigate through every shell destination.
- [ ] Sign out and confirm the protected page cannot be revisited with the old cookie.
- [ ] Confirm `wrangler tail --status error` contains no credential or token material during the smoke test.
