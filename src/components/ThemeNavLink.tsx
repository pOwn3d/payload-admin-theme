import React from 'react'

/**
 * ThemeNavLink — RSC rendered in `admin.components.afterNavLinks`.
 *
 * RESILIENCE — try/catch, not an ErrorBoundary. Like ThemeInjector and
 * LoginBranding this is a server component (no `'use client'`) mounted from
 * Payload's import map, so the plugin can never place a client boundary above
 * it. `afterNavLinks` renders on every admin page: a throw here would take the
 * whole sidebar with it. Losing the link is recoverable — the global is still
 * reachable from the Settings group of the nav.
 *
 * The props are destructured INSIDE the try for the same reason as
 * ThemeInjector: parameter destructuring runs before the body.
 */
const ThemeNavLink: React.FC<{ globalSlug?: string }> = (props) => {
  try {
    const { globalSlug = 'admin-theme' } = props
    return (
      <a
        href={`/admin/globals/${globalSlug}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          fontSize: '13px',
          color: 'var(--theme-text)',
          textDecoration: 'none',
          borderRadius: 'var(--style-radius-s)',
          transition: 'background 0.15s',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="13.5" cy="6.5" r="2.5" />
          <path d="M17.38 10.16A7 7 0 1 1 8.07 2.87" />
          <path d="M12 12l-5 5" />
          <path d="m2 22 5.5-1.5L21 7.12a2.13 2.13 0 0 0-3-3L4.5 17.5Z" />
        </svg>
        <span>Thème</span>
      </a>
    )
  } catch {
    return null
  }
}

export { ThemeNavLink }
