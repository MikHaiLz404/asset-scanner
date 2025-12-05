import React, { useState, useMemo } from 'react'
import './styles/FolderTree.css'

// Helper to build tree from file list or folder list
const buildFolderTree = (items, isFolderList = false) => {
    const root = { name: 'Root', path: '', children: {} }

    console.log(`Building folder tree from ${items.length} ${isFolderList ? 'folders' : 'files'}`)

    items.forEach(item => {
        let parts
        if (isFolderList) {
            // item.path is "folder/subfolder"
            parts = item.path.split('/')
        } else {
            // item.path is "folder/subfolder/file.ext"
            // We want the directory part: "folder/subfolder"
            parts = item.path.split('/')
            parts.pop() // Remove filename
        }

        if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) return

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

    const result = convertToArray(root)
    console.log(`Folder tree built with ${result.children.length} top-level folders:`, result.children.map(c => c.name))
    return result
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
                className={`tree-node-content ${isActive ? 'active' : ''}`}
            >
                {hasChildren && (
                    <span
                        onClick={handleToggle}
                        className="tree-toggle-icon"
                    >
                        {isExpanded ? '▼' : '▶'}
                    </span>
                )}
                {!hasChildren && <span className="tree-spacer" />}

                <span className="tree-folder-icon">
                    {isActive ? '📂' : '📁'}
                </span>
                <span className="tree-node-name">
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

export default function FolderTree({ files, folders, currentPath, onSelect, width = 250 }) {
    const tree = useMemo(() => {
        if (folders && folders.length > 0) {
            return buildFolderTree(folders, true)
        }
        return buildFolderTree(files, false)
    }, [files, folders])

    return (
        <div
            className="folder-tree-container"
            style={{
                width: `${width}px`,
                minWidth: `${width}px`
            }}
        >
            <div className="folder-tree-header">
                Folders
            </div>
            {/* Render root's children directly, not the root node itself */}
            {tree.children && tree.children.length > 0 ? (
                tree.children.map(child => (
                    <TreeNode
                        key={child.path}
                        node={child}
                        currentPath={currentPath}
                        onSelect={onSelect}
                        level={0}
                    />
                ))
            ) : (
                <div className="no-folders-message">
                    No folders found
                </div>
            )}
        </div>
    )
}
