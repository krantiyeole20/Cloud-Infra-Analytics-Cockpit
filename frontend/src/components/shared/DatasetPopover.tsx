import { useEffect, useRef } from 'react'
import { PROJECT_ABOUT } from '../../constants/descriptions'

interface Props {
  open: boolean
  onClose: () => void
}

export default function DatasetPopover({ open, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, onClose])

  if (!open) return null

  const d = PROJECT_ABOUT.dataset

  const stats = [
    { label: 'Rows', value: d.rows },
    { label: 'Columns', value: d.cols },
    { label: 'Unique VMs', value: d.unique_vms },
    { label: 'Null rate', value: d.null_rate },
    { label: 'Waste threshold', value: d.waste_threshold },
    { label: 'Source', value: d.source },
  ]

  return (
    <div ref={ref} className="dataset-popover">
      <div className="dataset-popover-title">{d.name}</div>
      {stats.map(s => (
        <div key={s.label} className="dataset-popover-stat">
          <span className="dataset-popover-stat-label">{s.label}</span>
          <span className="dataset-popover-stat-val">{s.value}</span>
        </div>
      ))}
      <a
        href={d.kaggle_url}
        target="_blank"
        rel="noopener noreferrer"
        className="dataset-popover-cta"
      >
        Open on Kaggle ↗
      </a>
    </div>
  )
}
