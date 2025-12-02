import React from 'react'

export default function Breadcrumb({ currentPath, onNavigate }) {
    // Split path into segments
    // path: "models/char/hero" -> ["models", "char", "hero"]
    const segments = currentPath ? currentPath.split('/') : []

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)'
        }}>
            <button
                onClick={() => onNavigate('')}
                style={{
                    background: 'none',
                    border: 'none',
                    color: currentPath === '' ? 'var(--text-primary)' : 'var(--accent-primary)',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: currentPath === '' ? 'bold' : 'normal'
                }}
            >
                Root
            </button>

            {segments.map((segment, index) => {
                // Reconstruct path for this segment
                // index 0 ("models") -> "models"
                // index 1 ("char") -> "models/char"
                const path = segments.slice(0, index + 1).join('/')
                const isLast = index === segments.length - 1

                return (
                    <React.Fragment key={path}>
                        <span>/</span>
                        <button
                            onClick={() => onNavigate(path)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: isLast ? 'var(--text-primary)' : 'var(--accent-primary)',
                                cursor: isLast ? 'default' : 'pointer',
                                padding: 0,
                                fontWeight: isLast ? 'bold' : 'normal',
                                opacity: isLast ? 1 : 0.9
                            }}
                            disabled={isLast}
                        >
                            {segment}
                        </button>
                    </React.Fragment>
                )
            })}
        </div>
    )
}
