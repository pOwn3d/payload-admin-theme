'use client'

import React from 'react'

/**
 * AdminThemeErrorBoundary — the only thing standing between a bug in this
 * plugin and a Payload admin nobody can open.
 *
 * WHY IT EXISTS. Three of this plugin's client components are mounted in
 * GLOBAL admin slots: `AdminBranding` / `AdminIcon` in
 * `admin.components.graphics` and `ThemeInjectorClient` in `afterNavLinks`
 * (see plugin.ts). The graphics slot is the severe one — Payload renders the
 * logo on the LOGIN page, before any session exists, so an uncaught render
 * error there does not degrade a screen, it locks everyone out of the admin
 * with no way back in. React unmounts the whole tree up to the nearest
 * boundary, and Payload declares none around plugin slots.
 *
 * WHY EACH SLOT WRAPS ITSELF. Payload mounts these components from the import
 * map: the plugin never gets to place an ancestor around them. The boundary
 * therefore has to live INSIDE the module, with the exported symbol being the
 * wrapper — `export const AdminBranding = (p) => <Boundary…><Inner {...p}/></Boundary>`.
 *
 * WHY `fallback={null}` AT THOSE THREE SITES. A red panel across the sidebar
 * of every admin page is worse than a missing logo. Global slots degrade
 * silently; the error still reaches the console through `componentDidCatch`.
 *
 * WHAT IT DOES NOT CATCH — do not read a boundary as "this component is now
 * safe". React boundaries only catch errors thrown during RENDER. Rejected
 * promises inside `useEffect` (all three components fetch `/api/globals/<slug>`)
 * and throws inside event handlers go straight past it; those need a try/catch
 * at the call site, which is what `fetchTheme` in utils/themeCache.ts does.
 *
 * Server components are out of scope by construction: `ThemeInjector`,
 * `LoginBranding` and `ThemeNavLink` have no `'use client'` directive and are
 * mounted from the import map into the RSC stream, so no client boundary can
 * ever be their ancestor. They guard themselves with a try/catch returning
 * `null`.
 */

export interface AdminThemeErrorBoundaryProps {
  children?: React.ReactNode
  /**
   * Rendered in place of the children once a render has thrown.
   *
   * Passing `null` explicitly is the silent-degradation mode used by every
   * global slot of this plugin. Omitting the prop entirely gets the visible
   * panel below instead — the two are deliberately NOT the same thing, which
   * is why the check is `'fallback' in props` and not `fallback ?? <Panel/>`.
   */
  fallback?: React.ReactNode
  /** Named in the console message so a bug report says which slot failed. */
  slotName?: string
  /**
   * Clearing an error. While any entry differs from the previous render the
   * boundary drops its error state and remounts the children under a fresh
   * `key`, so the subtree restarts from scratch instead of resuming the state
   * that produced the crash.
   */
  resetKeys?: unknown[]
}

interface AdminThemeErrorBoundaryState {
  hasError: boolean
  /** The `resetKeys` this render was reconciled against. */
  keySnapshot: unknown[]
  /** Bumped on every reset; used as the children `key` to force a remount. */
  generation: number
}

/** Shallow, order-sensitive comparison — same contract as a hook dep array. */
function sameKeys(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false
  return a.every((value, index) => Object.is(value, b[index]))
}

export class AdminThemeErrorBoundary extends React.Component<
  AdminThemeErrorBoundaryProps,
  AdminThemeErrorBoundaryState
> {
  constructor(props: AdminThemeErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      keySnapshot: props.resetKeys ?? [],
      generation: 0,
    }
  }

  static getDerivedStateFromError(): Pick<AdminThemeErrorBoundaryState, 'hasError'> {
    return { hasError: true }
  }

  static getDerivedStateFromProps(
    props: AdminThemeErrorBoundaryProps,
    state: AdminThemeErrorBoundaryState,
  ): Partial<AdminThemeErrorBoundaryState> | null {
    const next = props.resetKeys ?? []
    if (sameKeys(state.keySnapshot, next)) return null
    // The keys moved. Record them, and when an error is standing, clear it and
    // bump the generation so the children remount rather than resume.
    if (!state.hasError) return { keySnapshot: next }
    return { keySnapshot: next, hasError: false, generation: state.generation + 1 }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // The message and the stack belong in the console, never on screen: this
    // renders inside an admin panel and, for the graphics slot, on the
    // unauthenticated login page, where an error string is free reconnaissance.
    console.error(
      `[admin-theme] ${this.props.slotName ?? 'component'} failed to render and was replaced by its fallback.`,
      error,
      info?.componentStack,
    )
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // `'fallback' in props` and not `?? panel`: `fallback={null}` is a
      // deliberate instruction to render nothing, and `null ?? panel` would
      // silently turn it into the visible panel.
      if ('fallback' in this.props) return this.props.fallback

      return (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 'var(--style-radius-s)',
            background: 'var(--theme-elevation-50)',
            color: 'var(--theme-text)',
            fontSize: '13px',
            lineHeight: '20px',
          }}
        >
          Something went wrong in this part of the admin theme. Reload the page;
          the details are in the browser console.
        </div>
      )
    }

    // Keyed so a reset remounts the subtree instead of resuming its state.
    return <React.Fragment key={this.state.generation}>{this.props.children}</React.Fragment>
  }
}
