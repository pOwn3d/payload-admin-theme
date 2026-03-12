'use client'

import { useEffect, useState } from 'react'

interface BrandingData {
  logoUrl?: string | null
  brandName?: string | null
}

/**
 * AdminBranding — replaces the default Payload logo/icon
 * with the configured custom branding.
 */
export const AdminBranding: React.FC = () => {
  const [branding, setBranding] = useState<BrandingData | null>(null)

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await fetch('/api/globals/admin-theme', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          setBranding(data)
        }
      } catch {
        // Silently fail
      }
    }

    fetchBranding()
  }, [])

  if (!branding?.logoUrl) {
    // Render brand name as text fallback
    if (branding?.brandName) {
      return (
        <span
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {branding.brandName}
        </span>
      )
    }
    return null
  }

  return (
    <img
      src={branding.logoUrl}
      alt={branding.brandName || 'Admin Logo'}
      style={{
        maxHeight: '28px',
        width: 'auto',
        objectFit: 'contain',
      }}
    />
  )
}

/**
 * AdminIcon — smaller version for nav/tab icon usage
 */
export const AdminIcon: React.FC = () => {
  const [branding, setBranding] = useState<BrandingData | null>(null)

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await fetch('/api/globals/admin-theme', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          setBranding(data)
        }
      } catch {
        // Silently fail
      }
    }

    fetchBranding()
  }, [])

  if (!branding?.logoUrl) return null

  return (
    <img
      src={branding.logoUrl}
      alt={branding.brandName || 'Icon'}
      style={{
        maxHeight: '20px',
        width: 'auto',
        objectFit: 'contain',
      }}
    />
  )
}
