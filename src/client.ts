// Client-side barrel — re-exports only, NO 'use client' directive here.
// Individual component files get "use client" prepended by tsup onSuccess.
// This pattern is required for Next.js 16 Turbopack compatibility.
//
// No createContext anywhere in this module tree — safe for Turbopack SSR bundling.
export { ThemeInjectorClient } from './components/ThemeProvider.js'
export { AdminBranding, AdminIcon } from './components/AdminBranding.js'
export { ColorPickerField } from './components/ColorPickerField.js'
