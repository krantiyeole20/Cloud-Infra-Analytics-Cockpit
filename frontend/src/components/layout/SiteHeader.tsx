// src/components/layout/SiteHeader.tsx
import { useState, useRef, useEffect } from 'react'
import ProjectModal from '../shared/ProjectModal'
import DatasetPopover from '../shared/DatasetPopover'

const GITHUB_REPO = 'https://github.com/krantiyeole20/Cloud-Infra-Analytics-Cockpit'
const GITHUB_PROFILE = 'https://github.com/krantiyeole20/'
const LINKEDIN = 'https://www.linkedin.com/in/krantiyeole/'

function GithubIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
        </svg>
    )
}

function LinkedinIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
    )
}

export default function SiteHeader() {
    const [connectOpen, setConnectOpen] = useState(false)
    const [datasetOpen, setDatasetOpen] = useState(false)
    const [modalOpen, setModalOpen]     = useState(false)
    const connectRef = useRef<HTMLDivElement>(null)
    const datasetRef = useRef<HTMLDivElement>(null)

    // Close Connect dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (connectRef.current && !connectRef.current.contains(e.target as Node)) {
                setConnectOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <>
            <div className="site-header">
                {/* Left: title + subtitle */}
                <div className="site-header-brand">
                    <span className="site-header-icon">⚡</span>
                    <div>
                        <div className="site-header-title">Cloud VM Intelligence Cockpit</div>
                        <div className="site-header-sub">
                            Energy-efficiency analytics · 2M VM records · 4 ML models
                        </div>
                    </div>
                </div>

                {/* Right: links */}
                <nav className="site-header-nav">
                    {/* About — opens ProjectModal */}
                    <button
                        className="site-header-link"
                        onClick={() => setModalOpen(true)}
                        title="About this project — dataset, ML models, tech stack"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4M12 8h.01" />
                        </svg>
                        About
                    </button>

                    {/* Dataset — opens compact popover */}
                    <div ref={datasetRef} style={{ position: 'relative' }}>
                        <button
                            className="site-header-link"
                            onClick={() => setDatasetOpen(o => !o)}
                            title="Dataset quick reference"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <ellipse cx="12" cy="5" rx="9" ry="3" />
                                <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                                <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
                            </svg>
                            Dataset
                        </button>
                        <DatasetPopover
                            open={datasetOpen}
                            onClose={() => setDatasetOpen(false)}
                        />
                    </div>

                    {/* GitHub repo */}
                    <a
                        href={GITHUB_REPO}
                        target="_blank"
                        rel="noreferrer"
                        className="site-header-link"
                        title="Source code on GitHub"
                    >
                        <GithubIcon />
                        GitHub
                    </a>

                    {/* Connect dropdown */}
                    <div className="site-header-connect-wrap" ref={connectRef}>
                        <button
                            className="site-header-connect-btn"
                            onClick={() => setConnectOpen((o) => !o)}
                        >
                            Connect
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                style={{ transform: connectOpen ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }}>
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </button>

                        {connectOpen && (
                            <div className="site-header-dropdown">
                                <a href={GITHUB_PROFILE} target="_blank" rel="noreferrer" className="site-header-drop-item">
                                    <GithubIcon />
                                    GitHub Profile
                                </a>
                                <a href={LINKEDIN} target="_blank" rel="noreferrer" className="site-header-drop-item">
                                    <LinkedinIcon />
                                    LinkedIn
                                </a>
                            </div>
                        )}
                    </div>
                </nav>
            </div>

            <ProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </>
    )
}
