import React, { useState } from 'react'

export default function NavBar({
    title,
    onHome,
    searchQuery,
    onSearchChange,
    searchType,
    onSearchTypeChange,
    onRecentClick,
    bookmarks,
    onBookmarkClick,
    folderBookmarks,
    onFolderBookmarkClick,
    tags,
    onTagClick
}) {
    const [showBookmarks, setShowBookmarks] = useState(false)
    const [showFavorites, setShowFavorites] = useState(false)
    const [showCollections, setShowCollections] = useState(false)

    return (
        <nav style={{
            height: 'auto',
            minHeight: '60px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            padding: '0.5rem 1.5rem',
            gap: '1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            {/* Left: Logo/Home */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '200px' }}>
                <button
                    onClick={onHome}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title="Home"
                >
                    🏠
                </button>
                <h1 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {title || 'Asset Scanner'}
                </h1>
            </div>

            {/* Center: Search */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'center', gap: '0.5rem' }}>
                    <select
                        value={searchType}
                        onChange={(e) => onSearchTypeChange(e.target.value)}
                        style={{
                            padding: '0 1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="file">File</option>
                        <option value="folder">Folder</option>
                    </select>
                    <input
                        type="text"
                        placeholder={searchType === 'folder' ? "Search folders..." : "Search assets..."}
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        style={{
                            width: '100%',
                            maxWidth: '500px',
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem',
                            outline: 'none'
                        }}
                    />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                    💡 Tip: For the best FBX experience, please refresh textures before opening the file.
                </div>
            </div>

            {/* Right: Menus */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '200px', justifyContent: 'flex-end' }}>
                <button
                    onClick={onRecentClick}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-md)',
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
                    onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
                >
                    🕒 Recent
                </button>

                {/* Saved Projects Dropdown */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => { setShowBookmarks(!showBookmarks); setShowCollections(false); setShowFavorites(false); }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}
                        onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
                    >
                        📂 Saved Projects ▾
                    </button>
                    {showBookmarks && (
                        <>
                            <div
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
                                onClick={() => setShowBookmarks(false)}
                            />
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '0.5rem',
                                width: '250px',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                                zIndex: 100,
                                maxHeight: '300px',
                                overflowY: 'auto',
                                padding: '0.5rem'
                            }}>
                                {bookmarks.length === 0 ? (
                                    <div style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>
                                        No saved projects
                                    </div>
                                ) : (
                                    bookmarks.map(b => (
                                        <button
                                            key={b.name}
                                            onClick={() => { onBookmarkClick(b); setShowBookmarks(false); }}
                                            style={{
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '0.5rem',
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-primary)',
                                                cursor: 'pointer',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.875rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <span>📂</span> {b.name}
                                        </button>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Favorites Dropdown */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => { setShowFavorites(!showFavorites); setShowBookmarks(false); setShowCollections(false); }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}
                        onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
                    >
                        ⭐ Favorites ▾
                    </button>
                    {showFavorites && (
                        <>
                            <div
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
                                onClick={() => setShowFavorites(false)}
                            />
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '0.5rem',
                                width: '250px',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                                zIndex: 100,
                                maxHeight: '300px',
                                overflowY: 'auto',
                                padding: '0.5rem'
                            }}>
                                {(!folderBookmarks || folderBookmarks.length === 0) ? (
                                    <div style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>
                                        No favorites yet
                                    </div>
                                ) : (
                                    folderBookmarks.map(b => (
                                        <button
                                            key={b.id}
                                            onClick={() => { onFolderBookmarkClick(b); setShowFavorites(false); }}
                                            style={{
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '0.5rem',
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-primary)',
                                                cursor: 'pointer',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.875rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <span>⭐</span> {b.name}
                                        </button>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Collections Dropdown */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => { setShowCollections(!showCollections); setShowBookmarks(false); setShowFavorites(false); }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}
                        onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
                    >
                        🏷️ Collections ▾
                    </button>
                    {showCollections && (
                        <>
                            <div
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
                                onClick={() => setShowCollections(false)}
                            />
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '0.5rem',
                                width: '250px',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                                zIndex: 100,
                                maxHeight: '300px',
                                overflowY: 'auto',
                                padding: '0.5rem'
                            }}>
                                {tags.length === 0 ? (
                                    <div style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>
                                        No tags created
                                    </div>
                                ) : (
                                    tags.map(t => (
                                        <button
                                            key={t}
                                            onClick={() => { onTagClick(t); setShowCollections(false); }}
                                            style={{
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '0.5rem',
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-primary)',
                                                cursor: 'pointer',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.875rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <span>🏷️</span> {t}
                                        </button>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}
