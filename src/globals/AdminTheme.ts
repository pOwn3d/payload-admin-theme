import type { GlobalConfig } from 'payload'
import type { AdminThemePluginConfig } from '../types.js'

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
      read: () => true,
      update: ({ req }) => !!req.user,
    },
    fields: [
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
