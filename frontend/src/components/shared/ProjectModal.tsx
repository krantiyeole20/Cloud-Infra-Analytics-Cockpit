import { useEffect, useRef } from 'react'
import { PROJECT_ABOUT } from '../../constants/descriptions'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ProjectModal({ open, onClose }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Focus trap
  useEffect(() => {
    if (!open || !boxRef.current) return
    const focusable = boxRef.current.querySelectorAll<HTMLElement>(
      'a, button, input, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', onTab)
    first?.focus()
    return () => document.removeEventListener('keydown', onTab)
  }, [open])

  if (!open) return null

  const d = PROJECT_ABOUT.dataset

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="About This Project"
    >
      <div
        ref={boxRef}
        className="modal-box"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <span className="modal-title">⚡ About This Project</span>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        <div className="modal-body">
          {/* Problem Statement */}
          <div className="modal-section">
            <div className="modal-section-title">Problem Statement</div>
            <p className="modal-text">{PROJECT_ABOUT.problem}</p>
          </div>

          {/* Dataset */}
          <div className="modal-section">
            <div className="modal-section-title">Dataset</div>
            <div className="modal-dl">
              <span className="modal-dt">Name</span>
              <span className="modal-dd">{d.name}</span>
              <span className="modal-dt">Source</span>
              <span className="modal-dd">
                <a
                  href={d.kaggle_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent)', textDecoration: 'none' }}
                >
                  {d.source} ↗
                </a>
              </span>
              <span className="modal-dt">Rows</span>
              <span className="modal-dd">{d.rows}</span>
              <span className="modal-dt">Columns</span>
              <span className="modal-dd">{d.cols}</span>
              <span className="modal-dt">Unique VMs</span>
              <span className="modal-dd">{d.unique_vms}</span>
              <span className="modal-dt">Null rate</span>
              <span className="modal-dd">{d.null_rate}</span>
              <span className="modal-dt">Waste threshold</span>
              <span className="modal-dd">{d.waste_threshold}</span>
            </div>
          </div>

          {/* ML Models */}
          <div className="modal-section">
            <div className="modal-section-title">ML Models</div>
            <div className="modal-model-grid">
              {PROJECT_ABOUT.models.map(m => (
                <div key={m.name} className="modal-model-card">
                  <div className="modal-model-name">{m.name}</div>
                  <div className="modal-model-purpose">{m.purpose}</div>
                  <div className="modal-model-detail">{m.detail}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div className="modal-section">
            <div className="modal-section-title">Tech Stack</div>
            <div className="modal-stack-row">
              <span className="modal-stack-label">Backend</span>
              <span className="modal-stack-val">{PROJECT_ABOUT.stack.backend}</span>
            </div>
            <div className="modal-stack-row">
              <span className="modal-stack-label">Frontend</span>
              <span className="modal-stack-val">{PROJECT_ABOUT.stack.frontend}</span>
            </div>
            <div className="modal-stack-row">
              <span className="modal-stack-label">Data</span>
              <span className="modal-stack-val">{PROJECT_ABOUT.stack.data}</span>
            </div>
          </div>

          {/* Author */}
          <div className="modal-section">
            <div className="modal-section-title">Author — {PROJECT_ABOUT.author.name}</div>
            <div className="modal-links">
              <a
                href={PROJECT_ABOUT.author.github_repo}
                target="_blank"
                rel="noopener noreferrer"
                className="modal-link-btn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.13 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z" />
                </svg>
                GitHub Repo
              </a>
              <a
                href={PROJECT_ABOUT.author.github_profile}
                target="_blank"
                rel="noopener noreferrer"
                className="modal-link-btn"
              >
                GitHub Profile
              </a>
              <a
                href={PROJECT_ABOUT.author.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="modal-link-btn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452H16.89v-5.57c0-1.327-.024-3.036-1.85-3.036-1.851 0-2.134 1.445-2.134 2.939v5.667H9.35V9h3.414v1.561h.048c.476-.9 1.637-1.85 3.37-1.85 3.603 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a1.985 1.985 0 1 1 0-3.97 1.985 1.985 0 0 1 0 3.97zm1.71 13.019H3.627V9h3.42v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
