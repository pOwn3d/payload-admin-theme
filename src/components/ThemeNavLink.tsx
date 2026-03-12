import React from 'react'

const ThemeNavLink: React.FC<{ globalSlug?: string }> = ({ globalSlug = 'admin-theme' }) => {
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
      >
        <circle cx="13.5" cy="6.5" r="2.5" />
        <path d="M17.38 10.16A7 7 0 1 1 8.07 2.87" />
        <path d="M12 12l-5 5" />
        <path d="m2 22 5.5-1.5L21 7.12a2.13 2.13 0 0 0-3-3L4.5 17.5Z" />
      </svg>
      <span>Thème</span>
    </a>
  )
}

export { ThemeNavLink }
