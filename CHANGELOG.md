# Changelog

All notable changes to `@consilioweb/payload-admin-theme` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-09-08

Not a security release: nothing here is exploitable, no advisory is involved, and if you took 0.5.0
this morning you are already safe — take this one whenever it suits you. It closes what the two
security passes left open: the plugin's accessibility debt (EAA / RGAA), what your admin does when
one of these components throws, and the two questions every install eventually asks — does this
release owe my database a migration, and how do I remove the plugin cleanly. No schema change, no
breaking change.

### Fixed

- **Four accessibility defects — three in `ColorPickerField`, the plugin's only custom field
  component and the one Payload mounts six times on the same screen** (three light colors, three
  dark-mode overrides). (1) The `<label className="field-label">` carried no `htmlFor` and the text
  input no `id`, so the control had **no accessible name at all**, and clicking the label did not
  focus it; both now come from `useId()` rather than a literal, precisely because six instances
  share that screen and duplicate ids would break the association they are meant to create. (2) The
  `<input type="color">` overlaid on the field had no name either — no `<label>`, no `aria-label`,
  nothing — so a screen reader announced an unidentified control sitting on the same value as the
  one next to it. It now carries an `aria-label` of its own (`Couleur principale — selecteur de
  couleur`), built from the field's label plus a suffix resolved into the same language, and
  deliberately *not* wired to the `<label>`: a `<label>` names exactly one control, and it already
  names the text input. (3) `admin.description` was rendered in a bare `<div>` with no relationship
  to the input; it now gets an `id` and the input an `aria-describedby`, emitted **only** when a
  description exists, since an `aria-describedby` pointing at nothing is a failure on its own. That
  is WCAG 4.1.2 (Name, Role, Value) and 1.3.1 (Info and Relationships), both level A. (4) In
  `ThemeNavLink`, the sidebar icon is now `aria-hidden="true" focusable="false"`, so the link
  announces "Thème" instead of dragging its `<svg>` into the accessibility tree.
- **Nothing else in the package needed accessibility work, and stating that is part of the audit.**
  The plugin overrides none of Payload's focus indicators, renders no `<button>` (so there is no
  implicit-submit `type="button"` to correct), and builds no tabs widget: the single `role="alert"`
  in the package is the error panel added below.

### Added

- **An error boundary at the three client mount points — and the radius is the whole point.**
  `AdminBranding` / `AdminIcon` are mounted in `admin.components.graphics` and `ThemeInjectorClient`
  in `afterNavLinks` (see `plugin.ts`). `afterNavLinks` renders on **every** admin page, and
  `graphics.Logo` renders on the **unauthenticated login page**. React unmounts the tree up to the
  nearest boundary and Payload declares none around plugin slots, so until now a single throw inside
  a forty-line logo component did not degrade a corner of a screen — it blanked the admin, login
  page included, leaving nowhere to fix it from. `AdminThemeErrorBoundary`
  (`src/components/ErrorBoundary.tsx`) now wraps all three. Because Payload mounts them from the
  import map, the plugin can never place an ancestor around them: the boundary lives *inside* the
  module and the exported symbol is the wrapper. Each passes `fallback={null}` — a red panel across
  the sidebar of every admin page is worse than a missing logo — and the test is `'fallback' in
  props`, not `fallback ?? <panel>`, so an explicit `null` stays silent instead of quietly becoming
  the visible panel. The error goes to the console with the failing slot named, never on screen: on
  the graphics slot that string would be printed on an unauthenticated page. `resetKeys` clears a
  standing error and remounts the subtree under a fresh `key`, so it restarts instead of resuming
  the state that crashed it. Read what it does **not** catch: React boundaries catch render errors
  only, so the rejected `fetch('/api/globals/<slug>')` in `useEffect` and anything thrown in an
  event handler go straight past it — which is why `fetchTheme` keeps its own try/catch. The
  boundary is internal wiring, not public API; it is not re-exported from `./client`.
- **The three server components are guarded by try/catch instead, because a client boundary cannot
  be their ancestor.** `ThemeInjector` and `ThemeNavLink` (`afterNavLinks`) and `LoginBranding`
  (`beforeLogin`) carry no `'use client'` directive on purpose — one would pull `createContext` into
  the server tree and break Turbopack, which is the reason the `./rsc` entrypoint exists — and
  Payload mounts them from the import map into the RSC stream, where no client boundary can ever
  wrap them. All three now return `null` rather than propagate, and all three destructure their
  props **inside** the try: parameter destructuring runs before the body, so a prop whose getter
  throws would otherwise slip past the guard entirely. `LoginBranding` gains a second layer — its
  existing catch covered `findGlobal` alone, so a document the database returned but the component
  could not read went past it and took the unauthenticated login page down with it; that path now
  warns through `payload.logger` and renders nothing.
- **`pnpm schema:diff`, so "no migration needed" is checked instead of asserted.**
  `scripts/schema-diff.mjs` extracts the schema-bearing literals declared under
  `src/{collections,globals,modules}` at two git refs — `name`, `slug`, `type`, `relationTo`, plus
  the `unique` / `index` / `required` / `hasMany` / `virtual` flags — and set-diffs them, exiting
  non-zero the day one of them moves. It strips comments first, because docblocks in this repo quote
  field names in backticks and a naive grep would turn a documentation-only release into a phantom
  schema diff — which is exactly what this release would have looked like. `access`, `hooks`,
  `validate`, labels and descriptions are excluded on purpose: Payload stores none of them, so
  changing them owes nobody a migration. Run with no argument it walks every consecutive tag;
  `v0.2.0` through `HEAD` all report `no schema change`.
- **Three README sections answering the questions this plugin kept being asked.** *Database and
  updates*: the plugin adds one global, owns no schema and touches none of your collections — and
  **Payload does not let a plugin ship migrations**, because `payload migrate` resolves its single
  migration directory in the host app and never in a dependency, so a migration file published
  inside an npm tarball is dead code. `push` covers development; production is `payload
  migrate:create` then `payload migrate`, and never `push`, which is skipped under
  `NODE_ENV=production` and raises a data-loss warning when mixed with migrations. *Upgrading from
  0.3.x*: no schema change, and the one observable consequence of the 0.4.0 field guard — an
  external consumer reading `/api/globals/<slug>` anonymously now receives a document with
  `customCSS`, the colors, the border radius, the favicon URL, the preset and the dark-mode
  overrides simply **missing**, not an error. Check for `undefined`, give the request a session, or
  read the global server-side through `payload.findGlobal()`, which is unaffected. *Uninstall*:
  remove it from the config, `pnpm remove`, and — not optional — regenerate the import map, since
  Payload refuses to build an admin panel whose import map points at a package that is no longer
  installed.
- **Data cleanup on uninstall, spelled out per adapter.** The `admin-theme` global is one row and it
  survives the uninstall; the README now gives the exact statement for SQLite, PostgreSQL and
  MongoDB, plus the naming rule for a custom `globalSlug` (SQL adapters snake_case it —
  `my-theme` becomes `my_theme` — while MongoDB keeps it verbatim in `globalType`). There is nothing
  else to remove and nothing to schedule: the plugin stores no personal data, writes to no
  collection of yours, and makes exactly one network call — from the browser, to your own
  `/api/globals/<slug>`. Dropping the row is housekeeping, not a retention obligation.
- **149 tests → 198**, in five new suites written against the defects above rather than around them.
  `colorPickerField` (6) walks the returned React tree — the package carries neither jsdom nor
  testing-library — and asserts the label/input pairing, the swatch's distinct name, and that no
  `aria-describedby` is emitted when there is no description to point at. `labels` (8) covers the
  extracted resolver, including that a non-string label resolves to empty rather than putting
  `[object Object]` in a `<label>`, and that the existing `fr`-then-`en` order is preserved.
  `errorBoundary` (15) drives `getDerivedStateFromError`, `getDerivedStateFromProps` and `render`
  directly and pins the two traps — `fallback={null}` must render exactly nothing, and the default
  panel must leak no stack — its last three cases asserting that the exported `AdminBranding`,
  `AdminIcon` and `ThemeInjectorClient` really are the wrappers, with an explicit `null` fallback.
  `rscGuards` (8) hands each server component a props object whose `globalSlug` getter throws, which
  is the only way to prove the guard reaches the props read. `readmeSections` (12) treats the new
  documentation as code: the uninstall SQL is checked against the table name the adapters actually
  derive from the slug, because a `DROP TABLE` in a doc that names the wrong table is a destructive
  command that fails — or worse, that hits something else.

### Changed

- **`AdminBranding`, `AdminIcon` and `ThemeInjectorClient` now export the boundary wrapper, not the
  component itself.** Same props, same output, same import-map paths, nothing to do on your side —
  but the rendered element's `type` is `AdminThemeErrorBoundary`, so anything of yours that asserts
  on the inner tree needs one hop more.
- **A failure in a plugin slot now degrades silently, which is a trade rather than a free win.** A
  crash that used to be impossible to miss is now a missing logo, or an admin that renders unthemed,
  plus one `[admin-theme] <slot> failed to render…` line in the browser console. If the theme stops
  applying after this upgrade, that console line is the first place to look.
- **The README now states that the plugin is incompatible with `@payloadcms/plugin-multi-tenant`.**
  No code changed — it is a statement of what a Payload global *is*: a single row per instance, read
  by every admin session, so tenants sharing one instance share one theme and the last administrator
  to save repaints the panel for all of them. One Payload instance per brand is the answer.
- **The build guard covers the two new client-pass artifacts.** `dist/components/ErrorBoundary.js`
  and `dist/utils/labels.js` must ship with the `"use client"` banner tsup prepends; `verify:build`
  now reports 9 client files, 5 server files and 8 export targets, and fails the build if either one
  lands in the RSC pass by mistake.

## [0.5.0] - 2026-09-08

Second security release of the day, and it reaches two audiences only: installs that copied the
README's Server-Side CSS Endpoint into their app, and installs whose lockfile still resolves a
Payload below 3.79.1. 0.4.0 closed the anonymous read of the `admin-theme` global; the audit pass
that followed found that the route 0.4.0 documented as the fix still admitted *any* authenticated
account, from any auth collection. No runtime source file changed in this release — the whole of it
is the documented recipe, the peer floor, and the tests that now execute both.

### Security

- **The documented CSS endpoint gated on `!user`, which is not an authorization check.** Payload
  issues a single `payload-token` cookie for *every* auth collection and resolves it without
  filtering on one, so `payload.auth()` returns a perfectly valid, non-null `user` for a front-office
  `customers` signup — or for a `users` account your own `access.admin` turns away at the panel door.
  Either caller walked straight through the `if (!user)` gate and received the whole stylesheet:
  `customCSS`, `primaryColor`, `accentColor`, `sidebarColor`, `borderRadius`, `faviconUrl` and the
  dark-mode overrides, all read with `overrideAccess: true` and therefore past the field guard 0.4.0
  added. The hole is as old as the section: 0.1.0 through 0.3.0 documented the route with no gate at
  all, and 0.4.0 — shipped hours ago — replaced that with a check that stops nobody who has an
  account. The snippet now destructures `permissions` from the same `payload.auth()` call and
  requires `permissions?.canAccessAdmin`, the same rule the plugin's own field guard applies;
  Payload's `sanitizePermissions` deletes that key when it is false, so it must be tested for
  truthiness and never against `=== false`. **What to check on your install:** if
  `src/app/api/admin-theme-css/route.ts` (or any route of yours reading this global through the local
  API) exists, patch it yourself — a package cannot reach into your app's route handlers. Then, if
  any auth collection on that site accepts public signups, treat everything in `customCSS` as having
  been readable by every account that could register: it is developer-written CSS, and its selectors
  and comments routinely name internal collection slugs, staging hosts and unreleased `data-*` hooks.
  `LoginBranding` and `AdminBranding` read the global server-side and are unaffected either way.
- **The `payload` peer range allowed a Payload with a pre-authentication account takeover.**
  `peerDependencies` declared `^3.0.0` for `payload` and `@payloadcms/ui` — unchanged since 0.2.0 and
  still that in 0.4.0 — so a fresh install was free to resolve any 3.x, including the releases
  affected by GHSA-hp5w-3hxx-vmwf (pre-auth account takeover through password recovery) and by the
  SQL injection fixed in the same round. Both are patched in 3.79.1, which is now the floor. This is
  a Payload vulnerability, not one in this plugin's code, but the range was the plugin's instruction
  to your package manager, and it was also plainly wrong on its own terms: the `react@^19.0.1` peer
  already rules out everything below 3.79, so `^3.0.0` never described a combination that installs.
  **What to check on your install:** `pnpm why payload` / `npm ls payload` in the app, not the
  declared range — a floor in a peer range does not move a version your lockfile already pinned.

### Breaking

- **`peerDependencies.payload` and `peerDependencies['@payloadcms/ui']` move from `^3.0.0` to
  `^3.79.1`.** It stays a caret range on the 3 major — no ceiling was added — but npm 7+ fails an
  install on a peer conflict, and pnpm does too under `strict-peer-dependencies`, so an app on
  Payload 3.0–3.78 that installed quietly will now stop. There is no code change behind it: the
  plugin imports no 3.79+ API. Upgrading Payload is the fix; nothing here can be worked around by
  pinning the plugin.
- **The documented endpoint now refuses authenticated callers who cannot open the admin panel.** On
  hosts that adopt the updated snippet, an account from another auth collection, and an account
  `access.admin` rejects, go from `200` and a full stylesheet to `401`. If you were deliberately
  theming something outside the panel from that URL, use the public variant the README documents
  instead — `payload.findGlobal({ slug: 'admin-theme', overrideAccess: false, user })` — which keeps
  the route open and lets the field guard strip the restricted values from the response.

### Changed

- **README install line and Requirements table now state `^3.79.1`**, with the advisory named at both
  places. The most-copied line in the file, `pnpm add payload@^3.0.0 …`, would otherwise have kept
  the vulnerable version one shell command away while the peer range said the opposite.
- **Dev toolchain raised past the same advisories.** `payload` and `@payloadcms/ui` to `^3.88.0`,
  `next` to `^15.5.25`, `@types/react` to `^19.2.18`, `tsup` to `^8.5.1`, `typescript` to `^5.9.3`.
  These are `devDependencies` and ship in no tarball, but they ran in CI and in every checkout.
  Dependabot's security-updates stream — which ignores `open-pull-requests-limit` and any group
  without `applies-to` — is now grouped into a single pull request, and npm version updates dropped
  from weekly to monthly.

### Added

- **The README's route is now executed, not merely read: 138 tests → 149.** The six existing
  `readmeCssEndpoint` tests asserted only that *a* gate was textually present in the snippet, which
  is precisely how `!user` shipped in 0.4.0. Five new ones compile the documented code block, inject
  its imports and run it against a simulated `payload`, caller by caller: an admin-panel user still
  gets the complete sheet (the guard against over-correcting), an anonymous caller gets `401`, an
  account from another auth collection gets neither `200` nor `customCSS`, an account refused by
  `access.admin` likewise, and no restricted field leaks — the colors and the dark overrides are
  checked individually, not just `customCSS`. The fake `findGlobal` honours both documented modes, so
  the assertions hold whichever of the two fixes a host picks.
- **A new `peerRange` suite (6 tests) keeps the floor from drifting back.** It asserts the declared
  lower bound is at least 3.79.1 for both Payload peers, that the range stays `^3.x` rather than
  hardening into a pin, that `devDependencies` actually cover what `peerDependencies` promises — so
  the floor is exercised by the test run rather than merely announced — and that neither the README's
  Requirements table nor its `pnpm add` line drifts away from `package.json`.

## [0.4.0] - 2026-09-08

Security release. Every version published so far — 0.1.0 through 0.3.0 — answers an unauthenticated
`GET /api/globals/admin-theme` with the complete document, `customCSS` included. This release keeps
the document readable (the login page needs it) but restricts nine of its fields to users who can
actually open the admin panel, and fixes the README endpoint recipe that re-published the same
values from a route of your own. If you store anything in `customCSS` you would not put on a public
URL, treat it as having been public since you installed the plugin, and check your access logs for
hits on `/api/globals/<globalSlug>` from outside your admin.

### Security

- **`customCSS` and eight other fields were readable by anyone, with no session at all.** The
  `admin-theme` global has been readable by default since 0.1.0 (`access.read` defaults to
  `() => true`) and nothing narrowed that per field, so an anonymous `GET /api/globals/<globalSlug>`
  — or the equivalent GraphQL selection — returned `preset`, `primaryColor`, `accentColor`,
  `sidebarColor`, `borderRadius`, `faviconUrl`, `darkMode`, `hidePayloadBranding` and `customCSS` to
  any caller on the internet. `customCSS` is the one that matters: it is a developer-written
  stylesheet, and its selectors and comments routinely name internal collection slugs, unreleased
  `data-*` hooks and staging URLs. Writing was never open — the `update` rule already required a
  role. Those nine fields now carry a field-level `access.read`; `brandName`, `logoUrl`,
  `loginTitle`, `loginSubtitle` and `loginLogoUrl` stay public, because `AdminBranding` / `AdminIcon`
  fetch them from the browser while the login page is on screen.
- **The new field guard admits admin-panel users, not merely authenticated ones.** It accepts a user
  belonging to the collection Payload authenticates the panel against (`config.admin.user`) *and*,
  when that collection declares an `access.admin` function, accepted by it. The second layer is what
  makes the guard mean what it says on the most common Payload 3 layout — one `users` collection for
  the public site and the admin, separated by `access.admin` — where checking collection membership
  alone would have handed the admin stylesheet to every registered front-office account. No role is
  required: an editor still gets their panel themed. When the config declares no `admin.user`, any
  authenticated user passes, which is the pre-existing behaviour. An `access.admin` that throws
  denies.
- **The documented Server-Side CSS Endpoint published the same values from a second URL.** The
  README's `src/app/api/admin-theme-css/route.ts` snippet read the global through the local API,
  which runs with `overrideAccess: true` and therefore bypasses the new field guard, then wrote
  `customCSS` and the colors straight into an ungated `GET` response — so on installs that copied it,
  `/api/admin-theme-css` stayed anonymously readable and the hardening above bought them nothing. The
  snippet now calls `payload.auth()` and returns `401` without a session; a same-origin `@import`
  from `custom.scss` carries the `payload-token` cookie, so a logged-in admin still gets the sheet.
  If you already deployed that route, patch it — the plugin cannot reach into it. A public variant is
  documented too: pass `overrideAccess: false` and the `user` to `findGlobal`, and anonymous
  responses simply come back without the restricted fields. A test now asserts the README snippet
  stays gated.
- **The default `update` rule applies the same admin-panel check on top of its role check.** Saving
  the global previously required an `admin` role plus membership of `config.admin.user`; it now also
  goes through the collection's `access.admin` when one is declared. An `admin`-role account that
  your own `access.admin` turns away at the panel door can no longer rewrite the panel's stylesheet
  through the API — and will start getting a write rejection it did not get on 0.3.0. Pass your own
  `access.update` if you need the old rule back.

### Changed

- **`access.read` is document-level and no longer the whole story.** Passing your own `access.read`
  widens or narrows who gets a response; the per-field guard always applies on top of it and is not
  overridable. If you were relying on the public global to feed theme colors to your front-end over
  REST, that read now comes back without them — move it server-side (`payload.findGlobal()` from the
  local API still returns the whole document, which is how `LoginBranding` renders) or copy the
  values into a global of your own.
- **The client-side theme cache is keyed by slug *and* read scope.** The same URL now answers two
  different documents depending on the session, and Payload's login is a client-side navigation that
  does not reload the JS module graph — with a single cache slot, the stripped document read on the
  login page would have been served to the injector right after login and left the panel unthemed
  until a manual refresh. `AdminBranding` / `AdminIcon` read the `branding` scope, `ThemeInjectorClient`
  the `full` one, and a `full` response that comes back stripped anyway is used once but never
  memoised. These functions are internal — no exported API changed.
- **Release pipeline hardened.** Every GitHub Action in `ci.yml` and `publish.yml` — the workflow that
  builds and publishes the tarball you install — is now pinned to a commit SHA instead of a movable
  tag, and a `security.yml` workflow runs `pnpm audit --audit-level high`, a gitleaks secret scan and
  CodeQL (`security-extended`) on every push, every pull request and weekly. A Dependabot config
  keeps dependencies current while holding back major bumps of the `payload`, `react`, `react-dom`
  and `next` peer ranges, which are a semver decision rather than an automated one.

## [0.3.0] - 2026-09-07

Theming actually applies again — the component that writes the CSS was registered nowhere in the
0.2.x line — and it now targets selectors that exist in Payload 3.7x. Also hardens write access to
the global and the custom-CSS filter, and finally renders the login-page fields.

### Breaking

- **Your admin panel will change appearance on upgrade.** `ThemeInjectorClient` — the only component
  that writes the CSS variables, the custom CSS, the favicon, the branding-hiding rules and the
  document title — was registered by no code path up to 0.2.2. One part of a 0.2.x install did have
  a visible effect: setting `faviconUrl` registered `AdminBranding` / `AdminIcon` as
  `admin.components.graphics`, so the nav showed `logoUrl` (or `brandName` as text) — while the
  `faviconUrl` that triggered it was itself never applied. Everything else stored in the global was
  inert. `ThemeInjectorClient` is now registered as its own `afterNavLinks` entry
  (`@consilioweb/payload-admin-theme/client#ThemeInjectorClient`, overridable with the new
  `themeInjectorClientPath`), which means whatever is already stored in the `admin-theme` global
  starts repainting the panel. Review the global before deploying; `enabled: false` or
  `skipComponentInjection: true` reproduces the 0.2.x (inert) behaviour.
- **Colors are mapped onto different CSS targets.** `primaryColor` no longer writes
  `--theme-success-500/400/600` nor `--theme-text-link`, `accentColor` no longer writes
  `--theme-warning-500/400/600`, and `sidebarColor` no longer writes `--nav-color`. They now write
  rules on `.btn--style-primary:not(.btn--disabled)`, `.btn--style-secondary:not(.btn--disabled)`,
  `.nav__link-indicator`, `:focus-visible`, `.nav` / `.nav .nav__scroll`, `.nav .nav-group__toggle`
  (which also receives `color: inherit` and `opacity: 0.65`) and
  `.nav .nav__link:hover, .nav .nav-group__toggle:hover` (a lightened sidebar background).
  `--nav-color` and `--theme-text-link` do not exist in Payload 3 and were inert; `--theme-success-*`
  was real, so "Primary Color" used to recolor success banners. If your `customCSS` or SCSS relied
  on `--theme-success-*` carrying the brand color, restate it explicitly in `customCSS`. These rules
  are unlayered while Payload ships its own inside `@layer payload-default`, so they win over
  Payload's regardless of specificity; `customCSS` is appended to the same stylesheet, so a host
  override of the sidebar hover now needs at least the specificity of `.nav .nav__link:hover`.
  `borderRadius` is *unchanged* — it still writes `--style-radius-s/m/l` on `:root`, nothing to
  migrate there.
- **`generateCSSVariables()` no longer returns a single `:root { … }` block.** It returns a full
  stylesheet (custom properties plus element rules). Host code that parsed, wrapped or concatenated
  its output must be reviewed. Use the new `generateThemeCSS(values, { scope })` for the dark-mode
  half; the README endpoint example is updated.
- **Peer dependencies rewritten.** `react` and `react-dom` move from `^18.0.0 || ^19.0.0` to
  `^19.0.1` (React 18 is no longer supported: `@payloadcms/ui` 3.79+ requires React 19).
  `peerDependenciesMeta` is gone, so `@payloadcms/ui`, `react` and `react-dom` are now required peers
  instead of `optional: true` — a strict package manager that installed silently will now report the
  missing peer. `@payloadcms/next`, `@payloadcms/translations` and `next` are removed from the peers
  entirely (the plugin never imports them); if you relied on this package to pin those versions, pin
  them in your own `package.json`.
- **`engines.node` narrowed** from `>=18` to `^18.20.2 || >=20.9.0`, aligned on Payload's own range.
  Node 18.0–18.19 and the whole 19.x branch are no longer declared supported; installs under
  `engine-strict` will fail there.
- **`skipComponentInjection: true` now also skips the nav link.** That option exists to avoid the
  plugin's component import paths on symlinked installs, and injecting `ThemeNavLink` anyway kept the
  exact import it is meant to avoid. Set `skipComponentInjection: false` and use `addNavLink` if you
  wanted only the nav link, or register `@consilioweb/payload-admin-theme/rsc#ThemeNavLink` yourself.
- **A `graphics.Logo` / `graphics.Icon` declared by the host is no longer overwritten.** The plugin
  now assigns them with `??=`. If you declared your own Logo *and* set `faviconUrl`, the plugin used
  to win silently — now yours does. Remove your own `graphics` entry to get the plugin's branding
  back. The trigger is also decoupled: the new `replaceBranding` option controls it, defaulting to
  `true` when `faviconUrl` is set so existing setups keep their current branding.
- **`hidePayloadBranding` has a visible effect for the first time.** It targeted `.nav__brand`,
  `.payload-icon` and `[class*="NavBrand"]`, none of which exist in Payload 3; it now hides
  `.graphic-logo` and `.graphic-icon`. As a plugin option it additionally sets
  `admin.meta.titleSuffix` (to `- <brandName>`, or `''`), so admin browser tabs lose the
  `- Payload` suffix. A `titleSuffix` already set by the host is never overwritten.
- **A component is appended to `admin.components.beforeLogin`** for every consumer that does not set
  `skipComponentInjection`. It renders `null` while `loginTitle`, `loginSubtitle` and `loginLogoUrl`
  are all empty, but it is appended *after* the host's own `beforeLogin` components, which changes
  that array's length and order.

### Security

- **Write access to the theme global is no longer granted by a substring match.** The default
  `access.update` used `req.user.roles?.includes('admin')`; `roles` is a plain string when declared
  as a non-`hasMany` `select`, so `String.prototype.includes` accepted `admin-readonly`, `non-admin`
  and `administrator`. It now requires an exact `'admin'` (string form) or membership in the array
  form, and requires the user to belong to the collection named by `admin.user` — another auth
  collection with a `roles` field of its own no longer qualifies. Anyone holding that global's
  `update` right can inject CSS into every admin page, so users who lose access here were holding
  more than a styling permission. Restore a broader rule explicitly via the `access.update` option
  if you depended on it.
- **The custom-CSS blocklist is no longer bypassable with CSS escapes.** `@import` and `url()` could
  be smuggled past the filter written as `@\69 mport` / `u\72 l(…)`, which let a user with `update`
  access make every admin page load a remote resource — enough to exfiltrate what attribute
  selectors can observe. Values are now stripped of comments and un-escaped before scanning, and
  `image-set(` and `behavior:` were added to the blocklist. Custom CSS you saved before that used
  those constructs will be rejected on its next save. This filter is hardening, not a sandbox — the
  README now says so.

### Added

- Login page branding: `loginTitle`, `loginSubtitle` and `loginLogoUrl` are finally rendered, by a
  new `LoginBranding` server component exported from `@consilioweb/payload-admin-theme/rsc` and
  registered in `admin.components.beforeLogin`. Path overridable with `loginBrandingPath`.
- `replaceBranding` option — replace the admin Logo/Icon independently of `faviconUrl`.
- `themeInjectorClientPath` option — override the client injector path, needed for `link:` installs
  alongside the existing `themeInjectorPath`.
- `generateThemeCSS(values, options?)` and the `ThemeCSSOptions` type, exported from the package
  root. `options.scope` prefixes the generated rules, which is how the `[data-theme="dark"]` block
  is produced.
- Foreground colors are now computed from the background's WCAG relative luminance: primary button
  labels and sidebar text take whichever of black or white has the better contrast ratio, switching
  at L ≈ 0.179 rather than at the naive L = 0.5 (a fixed white label leaves `#0EA5E9` at 2.77:1
  where black gives 7.58:1). It is a best-of-two, not a promise of WCAG AA: a background whose
  better option is still under 4.5:1 cannot be fixed by the foreground alone.
- A Vitest suite (74 tests across `plugin`, `cssVariables`, `presets`, `adminThemeGlobal` and button
  contrast) plus `scripts/check-build-artifacts.mjs`, run by `pnpm build`, which fails the build when
  a `"use client"` directive lands on the wrong artifact or an `exports` subpath points at a file
  tsup never emitted.
- GitHub Actions: `ci.yml` runs typecheck, tests and build on Node 20 and 22 for every push and pull
  request; `publish.yml` publishes on a `v*` tag with `--provenance`, so releases from 0.3.0 on carry
  an npm provenance attestation.

### Changed

- `invalidateThemeCache(slug?)` now takes an optional slug; without an argument it clears every
  cached global as before.

### Fixed

- `globalSlug` is now honoured end to end. `AdminBranding` and `AdminIcon` called
  `fetchTheme('admin-theme')` literally, and `ThemeNavLink` — which does accept a `globalSlug` prop —
  was registered by the plugin as a bare path string with no `clientProps`, so its `'admin-theme'`
  default applied. A custom `globalSlug` therefore produced a nav link pointing at a non-existent
  `/admin/globals/admin-theme` and a logo that never loaded. Every component entry is now registered
  with `clientProps: { globalSlug }`, `ThemeInjectorClient` included — it used to read the slug from
  the `[data-admin-theme-slug]` marker rendered by the RSC, which is kept as the fallback for hosts
  that mount it by hand.
- The theme cache held a single slot for all slugs, so with more than one global the first response
  was served to every later caller. It is now keyed by slug.
- `getPresetColors()` answered for inherited object keys — `getPresetColors('toString')` returned
  `Object.prototype.toString` as if it were a preset — and handed back the internal preset object, so
  a caller mutating it poisoned that preset for the whole process. It now checks own properties and
  returns a copy.
- The plugin wrote `admin.components.graphics` in place on the incoming config; `graphics` and
  `admin.meta` are now cloned, so the config object you pass in is left untouched.
- Build artifacts: `"use client"` was prepended to every `.js` under `dist/components/`, including
  the output of the RSC pass, turning `ThemeInjector` and `ThemeNavLink` into client components and
  defeating the point of the `./rsc` entrypoint. The directive is now applied to an explicit file
  list — the directory walk was also racy, since tsup runs the three passes concurrently.
- README corrections: it documented a `presets` option that does not exist in
  `AdminThemePluginConfig`, listed preset hex values none of the four presets ever used (Blue
  Professional is `#2563EB` / `#0EA5E9`, not `#3B82F6` / `#10B981`), advertised "server-side
  rendering — no client-side flicker" and an `AdminThemeContext` that the code does not implement,
  and announced React 18 and Next.js 14 support.

## [0.2.0] - 2026-04-08

### Added
- Dark mode support with dedicated color fields (`[data-theme="dark"]`)
- 4 theme presets (Blue Professional, Dark Minimal, Green Nature, Purple Creative)
- `AdminThemeContext` — single fetch shared across all components (eliminates triple fetch)
- Dynamic `globalSlug` propagation (no more hardcoded 'admin-theme')
- CSS injection validation (rejects @import, url(), expression(), javascript:, script tags)
- Hex color validation on all color fields
- URL validation on logo/favicon fields (only /, https://, data:image/)
- Configurable access control with admin-only default
- `colorUtils.ts` — deduplicated hexToRgb/lighten/darken functions
- `AdminThemeData` type exported from types.ts

### Changed
- Deep clone of config in plugin.ts (prevents mutation of original config)
- Catch blocks now log warnings instead of silently failing

## [0.1.0] - 2026-03-10

### Added
- Initial release
- Color theming with built-in color picker fields
- Brand customization (name, logo, favicon)
- Login page customization (title, subtitle, logo)
- CSS variable injection overriding Payload's default theme
- Custom CSS injection from admin panel
- Hide Payload branding option
- Nav link in admin sidebar
- Server-side rendering (no client-side flicker)

[0.6.0]: https://github.com/pOwn3d/payload-admin-theme/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/pOwn3d/payload-admin-theme/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/pOwn3d/payload-admin-theme/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/pOwn3d/payload-admin-theme/compare/v0.2.2...v0.3.0
[0.2.0]: https://github.com/pOwn3d/payload-admin-theme/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/pOwn3d/payload-admin-theme/releases/tag/v0.1.0
