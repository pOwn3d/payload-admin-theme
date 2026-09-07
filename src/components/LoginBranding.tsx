import type { Payload } from 'payload'
import React from 'react'
import type { AdminThemeData } from '../types.js'

/**
 * LoginBranding — RSC rendered in `admin.components.beforeLogin`.
 *
 * The `loginTitle` / `loginSubtitle` / `loginLogoUrl` fields of the AdminTheme
 * global had no reader at all: they were saved and never displayed. This
 * component is that reader.
 *
 * Payload passes `payload` to server components registered in
 * `beforeLogin` (serverProps) and spreads the `clientProps` declared on the
 * component entry, which is where `globalSlug` comes from.
 *
 * Renders nothing when none of the three fields is filled in, so hosts that
 * leave them empty see the stock login page.
 */
export const LoginBranding: React.FC<{
  globalSlug?: string
  payload?: Payload
}> = async ({ globalSlug = 'admin-theme', payload }) => {
  if (!payload) return null

  let theme: AdminThemeData | null = null

  try {
    theme = (await payload.findGlobal({
      slug: globalSlug,
      depth: 0,
    })) as AdminThemeData
  } catch (err) {
    // The global may not exist yet (first boot, or a host that renamed it).
    // The login page must render regardless.
    payload.logger?.warn?.(
      `[admin-theme] Could not read the "${globalSlug}" global on the login page: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
    return null
  }

  const { loginTitle, loginSubtitle, loginLogoUrl } = theme ?? {}

  if (!loginTitle && !loginSubtitle && !loginLogoUrl) return null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '24px',
        textAlign: 'center',
      }}
    >
      {loginLogoUrl ? (
        <img
          alt={loginTitle || 'Logo'}
          src={loginLogoUrl}
          style={{ maxHeight: '64px', width: 'auto', objectFit: 'contain' }}
        />
      ) : null}
      {loginTitle ? (
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{loginTitle}</h1>
      ) : null}
      {loginSubtitle ? (
        <p style={{ margin: 0, opacity: 0.7 }}>{loginSubtitle}</p>
      ) : null}
    </div>
  )
}
