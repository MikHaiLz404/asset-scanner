import React, { useState } from 'react'
import './styles/NavBar.css'

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
        <nav className="navbar-container">
            {/* Left: Logo/Home */}
            <div className="navbar-left">
                <button
                    onClick={onHome}
                    className="home-button"
                    title="Home"
                >
                    🏠
                </button>
                <h1 className="app-title">
                    {title || 'Asset Scanner'}
                </h1>
            </div>

            {/* Center: Search */}
            <div className="navbar-center">
                <div className="search-container">
                    <select
                        value={searchType}
                        onChange={(e) => onSearchTypeChange(e.target.value)}
                        className="search-type-select"
                    >
                        <option value="file">File</option>
                        <option value="folder">Folder</option>
                    </select>
                    <input
                        type="text"
                        placeholder={searchType === 'folder' ? "Search folders..." : "Search assets..."}
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="search-tip">
                    💡 Tip: For the best FBX experience, please refresh textures before opening the file.
                </div>
            </div>

            {/* Right: Menus */}
            <div className="navbar-right">
                <button
                    onClick={onRecentClick}
                    className="nav-menu-button"
                >
                    🕒 Recent
                </button>

                {/* Saved Projects Dropdown */}
                <div className="dropdown-container">
                    <button
                        onClick={() => { setShowBookmarks(!showBookmarks); setShowCollections(false); setShowFavorites(false); }}
                        className="nav-menu-button"
                    >
                        📂 Saved Projects ▾
                    </button>
                    {showBookmarks && (
                        <>
                            <div
                                className="dropdown-overlay"
                                onClick={() => setShowBookmarks(false)}
                            />
                            <div className="dropdown-menu">
                                {bookmarks.length === 0 ? (
                                    <div className="empty-dropdown-message">
                                        No saved projects
                                    </div>
                                ) : (
                                    bookmarks.map(b => (
                                        <button
                                            key={b.name}
                                            onClick={() => { onBookmarkClick(b); setShowBookmarks(false); }}
                                            className="dropdown-item"
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
                <div className="dropdown-container">
                    <button
                        onClick={() => { setShowFavorites(!showFavorites); setShowBookmarks(false); setShowCollections(false); }}
                        className="nav-menu-button"
                    >
                        ⭐ Favorites ▾
                    </button>
                    {showFavorites && (
                        <>
                            <div
                                className="dropdown-overlay"
                                onClick={() => setShowFavorites(false)}
                            />
                            <div className="dropdown-menu">
                                {(!folderBookmarks || folderBookmarks.length === 0) ? (
                                    <div className="empty-dropdown-message">
                                        No favorites yet
                                    </div>
                                ) : (
                                    folderBookmarks.map(b => (
                                        <button
                                            key={b.id}
                                            onClick={() => { onFolderBookmarkClick(b); setShowFavorites(false); }}
                                            className="dropdown-item"
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
                <div className="dropdown-container">
                    <button
                        onClick={() => { setShowCollections(!showCollections); setShowBookmarks(false); setShowFavorites(false); }}
                        className="nav-menu-button"
                    >
                        🏷️ Collections ▾
                    </button>
                    {showCollections && (
                        <>
                            <div
                                className="dropdown-overlay"
                                onClick={() => setShowCollections(false)}
                            />
                            <div className="dropdown-menu">
                                {tags.length === 0 ? (
                                    <div className="empty-dropdown-message">
                                        No tags created
                                    </div>
                                ) : (
                                    tags.map(t => (
                                        <button
                                            key={t}
                                            onClick={() => { onTagClick(t); setShowCollections(false); }}
                                            className="dropdown-item"
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
