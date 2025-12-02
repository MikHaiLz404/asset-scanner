import React, { useState, useMemo } from 'react'

// Helper to build tree from file list
const buildFolderTree = (files) => {
    const root = { name: 'Root', path: '', children: {} }

    files.forEach(file => {
        // file.path is like "folder/subfolder/file.ext"
        // We want the directory part: "folder/subfolder"
        const parts = file.path.split('/')
        parts.pop() // Remove filename

        let current = root
        let currentPath = ''

        parts.forEach(part => {
            if (!current.children[part]) {
                const newPath = currentPath ? `${currentPath}/${part}` : part
                current.children[part] = {
                    name: part,
                    path: newPath,
                    children: {}
                }
            }
            current = current.children[part]
            currentPath = current.path
        })
    })

    // Convert children objects to arrays recursively
    const convertToArray = (node) => {
        const children = Object.values(node.children).map(convertToArray)
        // Sort folders: A-Z
        children.sort((a, b) => a.name.localeCompare(b.name))
        return { ...node, children }
    }

    return convertToArray(root)
}

const TreeNode = ({ node, currentPath, onSelect, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(true)
    const nodeRef = React.useRef(null)

    // Check if this folder is part of the current path to auto-expand
    // or if it is the current path
    const isActive = node.path === currentPath
    const isAncestor = currentPath.startsWith(node.path + '/')

    // Auto-expand if ancestor of current path
    React.useEffect(() => {
        if (isAncestor) {
            setIsExpanded(true)
        }
    }, [currentPath, isAncestor, node.path])

    // Scroll into view if active
    React.useEffect(() => {
        if (isActive && nodeRef.current) {
            nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
    }, [isActive])

    const hasChildren = node.children && node.children.length > 0

    const handleToggle = (e) => {
        e.stopPropagation()
        setIsExpanded(!isExpanded)
    }

    const handleClick = (e) => {
        e.stopPropagation()
        onSelect(node.path)
    }

    return (
        <div style={{ paddingLeft: level === 0 ? 0 : '1rem' }}>
            <div
                ref={nodeRef}
                onClick={handleClick}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem 0.5rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                    color: isActive ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    marginBottom: '2px',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                    if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                    }
                }}
            >
                {hasChildren && (
                    <span
                        onClick={handleToggle}
                        style={{
                            marginRight: '0.5rem',
                            fontSize: '0.75rem',
                            width: '1rem',
                            display: 'inline-block',
                            textAlign: 'center'
                        }}
                    >
                        {isExpanded ? '▼' : '▶'}
                    </span>
                )}
                {!hasChildren && <span style={{ width: '1.5rem' }} />}

                <span style={{ marginRight: '0.5rem' }}>
                    {isActive ? '📂' : '📁'}
                </span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {node.name}
                </span>
            </div>

            {hasChildren && isExpanded && (
                <div>
                    {node.children.map(child => (
                        <TreeNode
                            key={child.path}
                            node={child}
                            currentPath={currentPath}
                            onSelect={onSelect}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default function FolderTree({ files, currentPath, onSelect, width = 250, viewMode, onRecentClick, onCollectionsOverviewClick }) {
    const tree = useMemo(() => buildFolderTree(files), [files])

    return (
        <div style={{
            width: `${width}px`,
            minWidth: `${width}px`, // Prevent shrinking
            borderRight: '1px solid var(--border-color)',
            padding: '1rem',
            overflowY: 'auto',
            overflowX: 'hidden', // Hide horizontal scrollbar if possible, or 'auto'
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        }}>
            <div style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                fontWeight: 'bold',
                marginBottom: '0.5rem',
                letterSpacing: '0.05em'
            }}>
                Navigation
            </div>

            {/* Recent Node */}
            <div
                onClick={onRecentClick}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem 0.5rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    backgroundColor: viewMode === 'recent' ? 'var(--accent-primary)' : 'transparent',
                    color: viewMode === 'recent' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    marginBottom: '0.5rem',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                    if (viewMode !== 'recent') {
                        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                    }
                }}
                onMouseLeave={(e) => {
                    if (viewMode !== 'recent') {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                    }
                }}
            >
                <span style={{ marginRight: '0.5rem' }}>🕒</span>
                <span>Recent Files</span>
            </div>

            {/* Collections Section */}
            <div
                onClick={onCollectionsOverviewClick}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem 0.5rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    backgroundColor: (viewMode === 'collections-overview' || viewMode === 'collection') ? 'var(--accent-primary)' : 'transparent',
                    color: (viewMode === 'collections-overview' || viewMode === 'collection') ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    marginBottom: '0.5rem',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                    if (viewMode !== 'collections-overview' && viewMode !== 'collection') {
                        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                    }
                }}
                onMouseLeave={(e) => {
                    if (viewMode !== 'collections-overview' && viewMode !== 'collection') {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                    }
                }}
            >
                <span style={{ marginRight: '0.5rem' }}>🏷️</span>
                <span>Collections</span>
            </div>

            <div style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                fontWeight: 'bold',
                marginBottom: '0.5rem',
                marginTop: '0.5rem',
                letterSpacing: '0.05em'
            }}>
                Folders
            </div>
            <TreeNode node={tree} currentPath={currentPath} onSelect={onSelect} />
        </div>
    )
}
