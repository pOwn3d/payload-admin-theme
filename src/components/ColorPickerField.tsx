'use client'

import React, { useCallback } from 'react'
import { useField } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'

const ColorPickerField: React.FC<TextFieldClientProps> = ({ path, field }) => {
  const { value, setValue } = useField<string>({ path })

  const label =
    typeof field?.label === 'string'
      ? field.label
      : typeof field?.label === 'object'
        ? (field.label as Record<string, string>).fr || (field.label as Record<string, string>).en || ''
        : ''

  const description =
    'admin' in field && field.admin?.description
      ? typeof field.admin.description === 'string'
        ? field.admin.description
        : typeof field.admin.description === 'object'
          ? (field.admin.description as Record<string, string>).fr ||
            (field.admin.description as Record<string, string>).en ||
            ''
          : ''
      : ''

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value)
    },
    [setValue],
  )

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value)
    },
    [setValue],
  )

  return (
    <div className="field-type text" style={{ width: '100%' }}>
      {label && (
        <label className="field-label" style={{ display: 'block', marginBottom: 4 }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={value || ''}
          onChange={handleTextChange}
          placeholder="#000000"
          style={{
            width: '100%',
            padding: '10px 48px 10px 12px',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 'var(--style-radius-s)',
            backgroundColor: 'var(--theme-input-bg)',
            color: 'var(--theme-text)',
            fontSize: '14px',
            lineHeight: '20px',
          }}
        />
        <input
          type="color"
          value={value || '#000000'}
          onChange={handleColorChange}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 30,
            height: 30,
            padding: 0,
            border: '2px solid var(--theme-elevation-200)',
            borderRadius: 'var(--style-radius-s)',
            cursor: 'pointer',
            backgroundColor: 'transparent',
          }}
        />
      </div>
      {description && (
        <div
          className="field-description"
          style={{ marginTop: 4, fontSize: 12, color: 'var(--theme-elevation-400)' }}
        >
          {description}
        </div>
      )}
    </div>
  )
}

export { ColorPickerField }
