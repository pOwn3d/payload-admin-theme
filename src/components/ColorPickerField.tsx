'use client'

import React, { useCallback, useId } from 'react'
import { useField } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'
import { colorPickerLabel, resolveLabel } from '../utils/labels.js'

const ColorPickerField: React.FC<TextFieldClientProps> = ({ path, field }) => {
  const { value, setValue } = useField<string>({ path })

  // `useId` and not a literal: the theme global renders this component six
  // times on the same screen (three colors, plus the three dark-mode
  // overrides), and duplicate ids would break the very association below.
  const id = useId()

  const { text: label, locale } = resolveLabel(field?.label)
  const { text: description } = resolveLabel(
    field && 'admin' in field ? field.admin?.description : undefined,
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value)
    },
    [setValue],
  )

  const descriptionId = description ? `${id}-description` : undefined

  return (
    <div className="field-type text" style={{ width: '100%' }}>
      {label && (
        <label
          className="field-label"
          htmlFor={id}
          style={{ display: 'block', marginBottom: 4 }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type="text"
          value={value || ''}
          onChange={handleChange}
          placeholder="#000000"
          aria-describedby={descriptionId}
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
          // Never `htmlFor`-associated with the label above: a <label> names
          // exactly one control, and it already names the text input.
          aria-label={colorPickerLabel(label, locale)}
          value={value || '#000000'}
          onChange={handleChange}
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
          id={descriptionId}
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
