import { useState, useEffect } from 'react'

interface Props {
  text: string
  side?: 'top' | 'bottom'
}

export default function InfoTooltip({ text, side = 'top' }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const popupStyle: React.CSSProperties =
    side === 'bottom'
      ? { bottom: 'auto', top: 'calc(100% + 8px)' }
      : {}

  return (
    <span className="info-tooltip-wrap">
      <button
        type="button"
        className="info-icon-btn"
        aria-label="More information"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        ⓘ
      </button>
      {open && (
        <span
          role="tooltip"
          className="info-tooltip-popup"
          style={popupStyle}
        >
          {text}
        </span>
      )}
    </span>
  )
}
