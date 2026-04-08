import type { GlobalConfig } from 'payload'
import type { AdminThemePluginConfig } from '../types.js'

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

const CSS_DANGEROUS_PATTERNS = [
  /@import/i,
  /url\s*\(/i,
  /expression\s*\(/i,
  /javascript\s*:/i,
  /-moz-binding/i,
  /<\/style/i,
  /<script/i,
]

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

function validateCSS(value: string | null | undefined): string | true {
  if (!value) return true
  for (const pattern of CSS_DANGEROUS_PATTERNS) {
    if (pattern.test(value)) {
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
      update: pluginConfig.access?.update ?? (({ req }) =>
        Boolean(
          req.user?.role === 'admin' || req.user?.roles?.includes('admin'),
        )),
    },
    fields: [
      {
        name: 'preset',
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
