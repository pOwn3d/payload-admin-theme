import type { FieldAccess, GlobalConfig, PayloadRequest } from 'payload'
import type { AdminThemePluginConfig } from '../types.js'

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

const CSS_DANGEROUS_PATTERNS = [
  /@import/i,
  /url\s*\(/i,
  /image-set\s*\(/i,
  /expression\s*\(/i,
  /javascript\s*:/i,
  /-moz-binding/i,
  /behavior\s*:/i,
  /<\/style/i,
  /<script/i,
]

/**
 * Resolve CSS escape sequences before scanning.
 *
 * CSS lets any character in an identifier be written as `\` + up to six hex
 * digits, so `@\69 mport` and `u\72 l(...)` are valid and used to slip past
 * the patterns above untouched.
 */
function decodeCssEscapes(value: string): string {
  return value.replace(
    /\\([0-9a-fA-F]{1,6})[ \t\n\r\f]?|\\([\s\S])/g,
    (_match, hex: string | undefined, char: string | undefined) => {
      if (hex) {
        const code = parseInt(hex, 16)
        if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return ''
        return String.fromCodePoint(code)
      }
      return char ?? ''
    },
  )
}

/** Strip CSS comments, which would otherwise hide part of a scanned value. */
function stripCssComments(value: string): string {
  return value.replace(/\/\*[\s\S]*?(?:\*\/|$)/g, '')
}

/**
 * Does this user hold the 'admin' role?
 *
 * `roles` is a plain string when the host declared it as a `select` field
 * without `hasMany`; `String.prototype.includes` would then also accept
 * 'admin-readonly' or 'non-admin', hence the exact match on that branch.
 */
function hasAdminRole(user: unknown): boolean {
  if (!user || typeof user !== 'object') return false
  const { role, roles } = user as { role?: unknown; roles?: unknown }
  if (role === 'admin') return true
  if (typeof roles === 'string') return roles === 'admin'
  if (Array.isArray(roles)) return roles.includes('admin')
  return false
}

/**
 * Layer 1 of `canOpenAdminPanel` below: does this user belong to the collection
 * the admin panel authenticates against? Call `canOpenAdminPanel`, not this —
 * it is the single entry point both the field `read` guard and the default
 * `update` rule go through.
 *
 * Deliberately NOT `!!req.user`: a host may declare several auth collections
 * (front-office customers, support agents...). Those users are authenticated,
 * yet they never open the admin panel and must not be handed its stylesheet.
 * The comparison is against `config.admin.user`, the collection Payload itself
 * uses for the admin panel; when the config does not declare one, any
 * authenticated user is accepted, which is the pre-existing behaviour.
 *
 * The `admin` role is NOT required here: an editor logged into the admin panel
 * needs the theme to be applied to their own session, and a user who can
 * `update` the global must be able to read every field it writes back.
 */
function isAdminPanelUser(user: unknown, adminUserSlug: unknown): boolean {
  if (!user || typeof user !== 'object') return false
  if (typeof adminUserSlug === 'string' && adminUserSlug) {
    const { collection } = user as { collection?: unknown }
    if (collection !== adminUserSlug) return false
  }
  return true
}

/**
 * The `access.admin` function the host declared on the user's own collection.
 *
 * Same lookup Payload performs in `utilities/canAccessAdmin` — deliberately the
 * user's own collection and not a slug of our own, so both gates read the same
 * declaration and cannot drift apart. Returns `undefined` when the host
 * declares none, which is the majority of installs.
 */
type AdminAccessFn = (args: { req: PayloadRequest }) => boolean | Promise<boolean>

function adminPanelAccessFn(req: PayloadRequest): AdminAccessFn | undefined {
  const collectionSlug = (req.user as { collection?: unknown } | null | undefined)?.collection
  if (typeof collectionSlug !== 'string' || !collectionSlug) return undefined
  const fn = req.payload?.collections?.[collectionSlug]?.config?.access?.admin
  return typeof fn === 'function' ? (fn as AdminAccessFn) : undefined
}

/**
 * May this request open the admin panel?
 *
 * Two layers, in the order Payload itself applies them:
 *
 *  1. membership of the collection Payload uses for the admin panel
 *     (`isAdminPanelUser`);
 *  2. the `access.admin` function of that collection, when one is declared.
 *
 * Layer 2 is what makes the guard mean what its name says. The most common
 * Payload 3 layout keeps ONE `users` collection for the public site and the
 * admin panel and separates them with `access.admin`; stopping at layer 1
 * there hands the admin stylesheet to every registered front-office account,
 * since their `collection` matches. Layer 2 is only ever restrictive: when the
 * host declares nothing, the previous behaviour stands.
 *
 * Anonymous requests are refused before layer 2 on purpose. Payload's own
 * helper falls back to a `payload.find()` on the users collection there (the
 * `/create-first-user` case); running that once per guarded field would turn
 * `curl /api/globals/admin-theme` into a burst of database reads driven by an
 * unauthenticated caller.
 *
 * Returns a plain boolean whenever no `access.admin` is declared, so the common
 * path costs no microtask; `FieldAccess` and `Access` both accept either shape.
 * A guard that throws denies — a host whose `access.admin` throws is already
 * locking that user out of the panel.
 */
function canOpenAdminPanel(req: PayloadRequest): boolean | Promise<boolean> {
  if (!isAdminPanelUser(req.user, req.payload?.config?.admin?.user)) return false
  const adminAccess = adminPanelAccessFn(req)
  if (!adminAccess) return true
  try {
    return Promise.resolve(adminAccess({ req })).then(Boolean, () => false)
  } catch {
    return false
  }
}

/**
 * Field-level `read` guard for the values nothing renders before login.
 *
 * The global stays readable by everyone by default, because `AdminBranding` /
 * `AdminIcon` (mounted in `admin.components.graphics`) fetch
 * `/api/globals/<slug>` from the browser while the login page is displayed —
 * they need `brandName` and `logoUrl` without a session.
 *
 * Every other value is only ever consumed by `ThemeInjectorClient`, mounted in
 * `afterNavLinks`, i.e. inside an authenticated admin session. Leaving them in
 * the anonymous response leaked `customCSS` — a developer-written stylesheet
 * routinely naming internal collection slugs, unreleased `data-*` hooks or
 * staging URLs — to `curl /api/globals/admin-theme`.
 *
 * `LoginBranding` is unaffected: it reads through the local API
 * (`payload.findGlobal`), which runs with `overrideAccess: true`.
 */
const readableByAdminPanelUsers: FieldAccess = ({ req }) => canOpenAdminPanel(req)

/** Spread onto every field with no anonymous reader. */
const adminPanelOnly = { access: { read: readableByAdminPanelUsers } }

function validateHexColor(value: string | null | undefined): string | true {
  if (!value) return true
  if (!HEX_COLOR_REGEX.test(value)) {
    return 'Must be a valid hex color (e.g. #FFF or #3B82F6)'
  }
  return true
}

function validateUrl(value: string | null | undefined): string | true {
  if (!value) return true
  if (
    !value.startsWith('/') &&
    !value.startsWith('https://') &&
    !value.startsWith('data:image/')
  ) {
    return 'URL must start with /, https://, or data:image/'
  }
  return true
}

/**
 * Reject the CSS constructs that pull in remote resources or execute code.
 *
 * This is hardening, NOT a sandbox: custom CSS is a developer-level capability
 * (a full-page overlay or an attribute-selector background can still be
 * expressed in plain, valid CSS). It is gated on the update access below,
 * which is admin-only by default.
 */
function validateCSS(value: string | null | undefined): string | true {
  if (!value) return true
  const normalized = decodeCssEscapes(stripCssComments(value))
  for (const pattern of CSS_DANGEROUS_PATTERNS) {
    if (pattern.test(normalized)) {
      return `CSS contains a disallowed pattern: ${pattern.source}`
    }
  }
  return true
}

export function createAdminThemeGlobal(
  pluginConfig: AdminThemePluginConfig = {},
): GlobalConfig {
  const slug = pluginConfig.globalSlug ?? 'admin-theme'
  const colorPickerPath =
    pluginConfig.colorPickerComponent ??
    '@consilioweb/payload-admin-theme/client#ColorPickerField'
  const colorPicker = pluginConfig.colorPickerComponent === false
    ? {}
    : { components: { Field: colorPickerPath } }

  return {
    slug,
    label: {
      en: 'Admin Theme',
      fr: 'Theme Admin',
    },
    admin: {
      group: {
        en: 'Settings',
        fr: 'Parametres',
      },
    },
    access: {
      read: pluginConfig.access?.read ?? (() => true),
      update: pluginConfig.access?.update ?? (({ req }) => {
        // Same gate as the field-level `read` above, on purpose: writing the
        // stylesheet must never be open to someone the read guard would turn
        // away. The role check runs first — it is sync and free, and it keeps
        // a host-supplied `access.admin` off the path for callers who are
        // rejected anyway.
        if (!hasAdminRole(req.user)) return false
        return canOpenAdminPanel(req)
      }),
    },
    fields: [
      {
        name: 'preset',
        ...adminPanelOnly,
        type: 'select',
        label: {
          en: 'Theme Preset',
          fr: 'Preset de theme',
        },
        admin: {
          description: {
            en: 'Choose a preset or "Custom" to configure colors manually',
            fr: 'Choisir un preset ou "Personnalise" pour configurer les couleurs manuellement',
          },
        },
        options: [
          { label: { en: 'Custom', fr: 'Personnalise' }, value: 'custom' },
          { label: 'Blue Professional', value: 'blue-professional' },
          { label: 'Dark Minimal', value: 'dark-minimal' },
          { label: 'Green Nature', value: 'green-nature' },
          { label: 'Purple Creative', value: 'purple-creative' },
        ],
        defaultValue: 'custom',
      },
      {
        name: 'brandName',
        type: 'text',
        label: {
          en: 'Brand Name',
          fr: 'Nom de la marque',
        },
        admin: {
          description: {
            en: 'Name displayed in the admin panel header',
            fr: 'Nom affiche dans l\'en-tete du panneau admin',
          },
        },
        defaultValue: pluginConfig.brandName ?? '',
      },
      {
        type: 'row',
        fields: [
          {
            name: 'primaryColor',
            type: 'text',
            ...adminPanelOnly,
            label: {
              en: 'Primary Color',
              fr: 'Couleur principale',
            },
            validate: validateHexColor,
            admin: {
              description: {
                en: 'Hex color code (e.g. #3B82F6)',
                fr: 'Code couleur hexadecimal (ex: #3B82F6)',
              },
              width: '33%',
              ...colorPicker,
            },
            defaultValue: pluginConfig.primaryColor ?? '#3B82F6',
          },
          {
            name: 'accentColor',
            type: 'text',
            ...adminPanelOnly,
            label: {
              en: 'Accent Color',
              fr: 'Couleur d\'accent',
            },
            validate: validateHexColor,
            admin: {
              description: {
                en: 'Hex color code (e.g. #10B981)',
                fr: 'Code couleur hexadecimal (ex: #10B981)',
              },
              width: '33%',
              ...colorPicker,
            },
            defaultValue: pluginConfig.accentColor ?? '#10B981',
          },
          {
            name: 'sidebarColor',
            type: 'text',
            ...adminPanelOnly,
            label: {
              en: 'Sidebar Color',
              fr: 'Couleur de la barre laterale',
            },
            validate: validateHexColor,
            admin: {
              description: {
                en: 'Background color for the navigation sidebar',
                fr: 'Couleur de fond de la barre de navigation laterale',
              },
              width: '33%',
              ...colorPicker,
            },
            defaultValue: pluginConfig.sidebarColor ?? '',
          },
        ],
      },
      {
        name: 'borderRadius',
        ...adminPanelOnly,
        type: 'number',
        label: {
          en: 'Border Radius (px)',
          fr: 'Rayon de bordure (px)',
        },
        admin: {
          description: {
            en: 'Border radius for buttons, cards, and inputs',
            fr: 'Rayon de bordure pour les boutons, cartes et champs',
          },
        },
        defaultValue: pluginConfig.borderRadius ?? 8,
        min: 0,
        max: 50,
      },
      {
        name: 'logoUrl',
        type: 'text',
        label: {
          en: 'Logo URL',
          fr: 'URL du logo',
        },
        validate: validateUrl,
        admin: {
          description: {
            en: 'URL to a custom logo image (PNG, SVG, or WebP recommended)',
            fr: 'URL vers une image de logo personnalisee (PNG, SVG ou WebP recommande)',
          },
        },
      },
      {
        name: 'faviconUrl',
        ...adminPanelOnly,
        type: 'text',
        label: {
          en: 'Favicon URL',
          fr: 'URL du favicon',
        },
        validate: validateUrl,
        admin: {
          description: {
            en: 'URL to a custom favicon for the admin panel',
            fr: 'URL vers un favicon personnalise pour le panneau admin',
          },
        },
        defaultValue: pluginConfig.faviconUrl ?? '',
      },
      {
        type: 'collapsible',
        label: {
          en: 'Login Page',
          fr: 'Page de connexion',
        },
        admin: {
          initCollapsed: true,
        },
        fields: [
          {
            name: 'loginTitle',
            type: 'text',
            label: {
              en: 'Login Title',
              fr: 'Titre de connexion',
            },
            admin: {
              description: {
                en: 'Title shown on the login page (e.g. "Welcome")',
                fr: 'Titre affiche sur la page de connexion (ex: "Bienvenue")',
              },
            },
            defaultValue: '',
          },
          {
            name: 'loginSubtitle',
            type: 'text',
            label: {
              en: 'Login Subtitle',
              fr: 'Sous-titre de connexion',
            },
            admin: {
              description: {
                en: 'Subtitle shown below the title on the login page',
                fr: 'Sous-titre affiche sous le titre sur la page de connexion',
              },
            },
            defaultValue: '',
          },
          {
            name: 'loginLogoUrl',
            type: 'text',
            label: {
              en: 'Login Logo URL',
              fr: 'URL du logo de connexion',
            },
            validate: validateUrl,
            admin: {
              description: {
                en: 'Logo image shown on the login page (overrides brand name badge)',
                fr: 'Image du logo affichee sur la page de connexion (remplace le badge nom de marque)',
              },
            },
          },
        ],
      },
      {
        name: 'darkMode',
        ...adminPanelOnly,
        type: 'group',
        label: {
          en: 'Dark Mode Overrides',
          fr: 'Couleurs mode sombre',
        },
        admin: {
          description: {
            en: 'Optional color overrides applied when Payload is in dark mode. Leave empty to use the same colors.',
            fr: 'Couleurs optionnelles pour le mode sombre de Payload. Laisser vide pour utiliser les memes couleurs.',
          },
        },
        fields: [
          {
            type: 'row',
            fields: [
              {
                name: 'primaryColor',
                type: 'text',
                label: {
                  en: 'Primary Color (Dark)',
                  fr: 'Couleur principale (sombre)',
                },
                validate: validateHexColor,
                admin: {
                  width: '33%',
                  ...colorPicker,
                },
              },
              {
                name: 'accentColor',
                type: 'text',
                label: {
                  en: 'Accent Color (Dark)',
                  fr: 'Couleur d\'accent (sombre)',
                },
                validate: validateHexColor,
                admin: {
                  width: '33%',
                  ...colorPicker,
                },
              },
              {
                name: 'sidebarColor',
                type: 'text',
                label: {
                  en: 'Sidebar Color (Dark)',
                  fr: 'Couleur barre laterale (sombre)',
                },
                validate: validateHexColor,
                admin: {
                  width: '33%',
                  ...colorPicker,
                },
              },
            ],
          },
        ],
      },
      {
        name: 'hidePayloadBranding',
        ...adminPanelOnly,
        type: 'checkbox',
        label: {
          en: 'Hide Payload Branding',
          fr: 'Masquer le branding Payload',
        },
        admin: {
          description: {
            en: 'Hide the default Payload logo and text in the admin UI',
            fr: 'Masquer le logo et le texte Payload par defaut dans l\'interface admin',
          },
        },
        defaultValue: pluginConfig.hidePayloadBranding ?? false,
      },
      {
        name: 'customCSS',
        ...adminPanelOnly,
        type: 'textarea',
        label: {
          en: 'Custom CSS',
          fr: 'CSS personnalise',
        },
        validate: validateCSS,
        admin: {
          description: {
            en: 'Additional CSS injected into the admin panel (advanced)',
            fr: 'CSS supplementaire injecte dans le panneau admin (avance)',
          },
        },
        defaultValue: pluginConfig.customCSS ?? '',
      },
    ],
  }
}
