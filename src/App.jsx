import React, { useEffect, useState, useCallback } from 'react'
import NavBar from './NavBar'
import { saveFolderHandle, getRecentFiles, saveRecentFile } from './db'
import AssetViewer from './AssetViewer'
import FolderTree from './FolderTree'
import Breadcrumb from './Breadcrumb'
import LazyImage from './components/LazyImage'
import { MODEL_EXTENSIONS, IMAGE_EXTENSIONS, AUDIO_EXTENSIONS, VIDEO_EXTENSIONS } from './utils/constants'
import './styles/App.css'

// Hooks
import { useFileSystem } from './hooks/useFileSystem'
import { useSelection } from './hooks/useSelection'
import { useBookmarks } from './hooks/useBookmarks'
import { useNavigation } from './hooks/useNavigation'
import { useTags } from './hooks/useTags'

function App() {
  // 1. File System State
  const {
    files, setFiles,
    folders,
    scanDirectory,
    rootHandle, setRootHandle,
    projectFiles, setProjectFiles,
    refreshFolder,
    isScanning, setIsScanning,
    stopScan,
    totalScanned
  } = useFileSystem()

  // 2. Navigation State
  const {
    currentPath, setCurrentPath,
    viewMode, setViewMode,
    activeCollection, setActiveCollection,
    activeFilter, setActiveFilter,
    searchQuery, setSearchQuery,
    searchType, setSearchType,
    sortBy, setSortBy,
    selectedTag, setSelectedTag,
    getFilteredFiles
  } = useNavigation()

  // 3. Bookmarks State
  const {
    recentFolders, bookmarkedFolders, folderBookmarks,
    isCurrentBookmarked, isCurrentPathBookmarked,
    loadFolders, loadFolderBookmarks,
    checkCurrentPathBookmark, checkCurrentBookmark,
    handleToggleBookmark, handleToggleFolderBookmark
  } = useBookmarks()

  // 4. Selection State
  const {
    selectedFile, setSelectedFile,
    selectedFiles,
    isDownloading,
    toggleSelection, clearSelection, downloadBatch
  } = useSelection()

  // 5. Tags State
  const { allTags, loadTags, uniqueTags } = useTags()

  // Sidebar Resize State
  const [sidebarWidth, setSidebarWidth] = useState(250)
  const [isResizing, setIsResizing] = useState(false)

  const startResizing = useCallback(() => setIsResizing(true), [])
  const stopResizing = useCallback(() => setIsResizing(false), [])
  const resize = useCallback((mouseMoveEvent) => {
    if (isResizing) {
      const newWidth = mouseMoveEvent.clientX
      if (newWidth > 150 && newWidth < 600) {
        setSidebarWidth(newWidth)
      }
    }
  }, [isResizing])

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize)
      window.addEventListener("mouseup", stopResizing)
    } else {
      window.removeEventListener("mousemove", resize)
      window.removeEventListener("mouseup", stopResizing)
    }
    return () => {
      window.removeEventListener("mousemove", resize)
      window.removeEventListener("mouseup", stopResizing)
    }
  }, [isResizing, resize, stopResizing])

  // --- Actions ---

  const processFolderHandle = async (handle) => {
    console.log('=== processFolderHandle called ===')
    console.log('Resetting all state for new folder:', handle.name)

    // Reset everything FIRST
    setRootHandle(null)  // Clear root first
    setFiles([])
    setProjectFiles([])
    setViewMode('folder')
    setIsScanning(true)

    // Reset Navigation
    setActiveFilter('all')
    setSearchQuery('')
    setSortBy('name-asc')
    setSelectedTag('')
    setCurrentPath('')

    // Reset Selection
    setSelectedFile(null)
    clearSelection()

    // Now set the new root handle
    setRootHandle(handle)

    // Bookmarks & Recent
    await checkCurrentBookmark(handle.name)
    await loadFolderBookmarks(handle.name)
    await checkCurrentPathBookmark(handle.name, '')
    await saveFolderHandle(handle)
    await loadFolders()

    // scanDirectory now handles state updates internally for progress
    try {
      console.log('Starting scan for:', handle.name)
      await scanDirectory(handle)
      console.log('Scan completed for:', handle.name)
    } catch (err) {
      console.error("Scan failed:", err)
      alert("Failed to scan directory. See console for details.")
    }
  }

  const handleOpenFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker()
      await processFolderHandle(handle)
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error accessing folder:', err)
        alert('Could not access folder. Please try again.')
      }
    }
  }

  const handleFolderClick = async (handle) => {
    try {
      console.log('handleFolderClick called for:', handle.name)
      const permission = await handle.queryPermission({ mode: 'read' })
      console.log('Current permission:', permission)

      if (permission !== 'granted') {
        console.log('Requesting permission...')
        const request = await handle.requestPermission({ mode: 'read' })
        console.log('Permission request result:', request)
        if (request !== 'granted') {
          console.log('Permission denied by user')
          return
        }
      }

      await processFolderHandle(handle)
    } catch (err) {
      console.error('Error in handleFolderClick:', err)
      alert('Could not access folder. Please try again or select the folder manually.')
    }
  }

  const handleRecentView = async () => {
    setIsScanning(true)
    try {
      const recentFiles = await getRecentFiles(rootHandle?.name)
      setFiles(recentFiles)
      setViewMode('recent')
      setCurrentPath('')
      clearSelection()
    } finally {
      setIsScanning(false)
    }
  }

  const handleCollectionClick = async (tag) => {
    setIsScanning(true)
    try {
      // We need fresh tags
      await loadTags()

      const taggedItems = allTags.filter(item => item.tags.includes(tag))

      const mappedFiles = taggedItems.map((item) => {
        // Safe type extraction with validation
        let fileType = item.type
        if (!fileType) {
          const filename = item.path.split('/').pop()
          const parts = filename.split('.')
          // Only extract extension if there's actually a dot and an extension
          fileType = parts.length > 1 ? '.' + parts.pop().toLowerCase() : ''
        }

        return {
          id: item.path,
          name: item.name || item.path.split('/').pop(),
          path: item.path,
          type: fileType,
          handle: item.handle,
          kind: 'file'
        }
      })

      setFiles(mappedFiles)
      setViewMode('collection')
      setActiveCollection(tag)
      setCurrentPath('')
      clearSelection()
    } finally {
      setIsScanning(false)
    }
  }

  const handleCollectionsOverviewClick = () => {
    setViewMode('collections-overview')
    setFiles([])
    setCurrentPath('')
    clearSelection()
  }

  const handleHome = () => {
    setRootHandle(null)
    setViewMode('folder')
    setFiles([])
    setProjectFiles([])
  }

  const handleViewerClose = () => {
    setSelectedFile(null)
    loadTags() // Reload tags when viewer closes
  }

  const handleFileClick = (file) => {
    setSelectedFile(file)
    // Only save to recent files if the file has a valid handle
    if (file && file.handle && file.path) {
      saveRecentFile(file, rootHandle?.name || file.rootName)
    }
  }

  // Derived State
  const filteredFiles = getFilteredFiles(files, allTags)

  const handleNextAsset = useCallback(() => {
    if (!selectedFile || filteredFiles.length <= 1) return
    const currentIndex = filteredFiles.findIndex(f => f.id === selectedFile.id)
    if (currentIndex === -1) return
    const nextIndex = (currentIndex + 1) % filteredFiles.length
    setSelectedFile(filteredFiles[nextIndex])
  }, [selectedFile, filteredFiles, setSelectedFile])

  const handlePreviousAsset = useCallback(() => {
    if (!selectedFile || filteredFiles.length <= 1) return
    const currentIndex = filteredFiles.findIndex(f => f.id === selectedFile.id)
    if (currentIndex === -1) return
    const prevIndex = (currentIndex - 1 + filteredFiles.length) % filteredFiles.length
    setSelectedFile(filteredFiles[prevIndex])
  }, [selectedFile, filteredFiles, setSelectedFile])

  // --- Render ---

  if (!rootHandle && viewMode === 'folder') {
    return (
      <div className="empty-state">
        <h1>Asset Scanner</h1>
        <p>Open a local folder to scan for 3D models, textures, and audio without uploading anything.</p>
        <button className="btn-primary" onClick={handleOpenFolder}>
          Open Project Folder
        </button>

        <div className="bookmarks-wrapper">
          {/* Bookmarks Section */}
          {bookmarkedFolders.length > 0 && (
            <div>
              <h3 className="section-title accent">
                <span>⭐</span> Bookmarked Folders
              </h3>
              <div className="list-container">
                {bookmarkedFolders.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleFolderClick(item.handle)}
                    className="list-item-button bookmark"
                  >
                    <span className="icon-lg">📂</span>
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Section */}
          {recentFolders.length > 0 && (
            <div>
              <h3 className="section-title secondary">
                Recent Folders
              </h3>
              <div className="list-container">
                {recentFolders.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleFolderClick(item.handle)}
                    className="list-item-button recent"
                  >
                    <span className="icon-lg">📂</span>
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      {selectedFile && (
        <AssetViewer
          file={selectedFile}
          onClose={handleViewerClose}
          onNext={handleNextAsset}
          onPrevious={handlePreviousAsset}
          hasNext={filteredFiles.length > 1}
          hasPrevious={filteredFiles.length > 1}
          projectFiles={projectFiles}
        />
      )}

      <NavBar
        title={rootHandle?.name}
        onHome={handleHome}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchType={searchType}
        onSearchTypeChange={setSearchType}
        onRecentClick={handleRecentView}
        bookmarks={bookmarkedFolders}
        onBookmarkClick={(bm) => {
          if (bm.handle) {
            processFolderHandle(bm.handle)
          } else {
            console.error("Bookmark has no handle:", bm)
            alert("This bookmark is invalid or missing permission.")
          }
        }}
        folderBookmarks={folderBookmarks}
        onFolderBookmarkClick={(bm) => {
          setCurrentPath(bm.path)
          setViewMode('folder')
          checkCurrentPathBookmark(rootHandle.name, bm.path)
        }}
        tags={uniqueTags}
        onTagClick={handleCollectionClick}
      />

      {/* Sub-Header / Toolbar */}
      <div className="sub-header">
        <div className="sub-header-left">
          {viewMode === 'folder' ? (
            <>
              <button
                onClick={() => handleToggleBookmark(rootHandle)}
                title={isCurrentBookmarked ? "Remove Bookmark" : "Bookmark Folder"}
                className="bookmark-toggle-btn"
                style={{ color: isCurrentBookmarked ? '#fbbf24' : 'var(--text-secondary)' }}
              >
                {isCurrentBookmarked ? '⭐' : '☆'}
              </button>
              <span className="stats-text">
                {files.length} total assets
              </span>
            </>
          ) : (
            <div className="sub-header-left">
              <button
                onClick={() => {
                  if (viewMode === 'collection') {
                    handleCollectionsOverviewClick()
                  } else {
                    setViewMode('folder')
                    setFiles(projectFiles)
                  }
                }}
                className="back-button"
              >
                <span>⬅️</span> {viewMode === 'collection' ? 'Back to Collections' : 'Back to Project'}
              </button>
              <h3 className="collection-title">
                {viewMode === 'recent' ? 'Recent Files' :
                  viewMode === 'collections-overview' ? 'Collections' :
                    `Collection: ${activeCollection}`}
              </h3>
            </div>
          )}
        </div>

        <div className="sub-header-right">
          {selectedFiles.size > 0 && (
            <>
              <button
                onClick={() => downloadBatch(files, currentPath, rootHandle?.name)}
                disabled={isDownloading}
                className="action-btn primary"
              >
                {isDownloading ? 'Zipping...' : `Download (${selectedFiles.size})`}
              </button>

              <button
                onClick={clearSelection}
                className="action-btn secondary"
              >
                Clear
              </button>
            </>
          )}

          <button
            className="action-btn tertiary"
            onClick={handleOpenFolder}
          >
            Change Folder
          </button>
        </div>
      </div>

      <div className="main-layout">
        {/* Sidebar */}
        <FolderTree
          key={rootHandle?.name || 'no-root'}
          files={projectFiles}
          folders={folders} // Pass folders here
          currentPath={currentPath}
          onSelect={(path) => {
            setCurrentPath(path)
            setViewMode('folder')
            setFiles(projectFiles)
            checkCurrentPathBookmark(rootHandle?.name, path)
          }}
          width={sidebarWidth}
        />

        {/* Resizer Handle */}
        <div
          onMouseDown={startResizing}
          className={`resizer ${isResizing ? 'active' : ''}`}
          style={{ backgroundColor: isResizing ? 'var(--accent-primary)' : 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-primary)'}
          onMouseLeave={(e) => !isResizing && (e.currentTarget.style.backgroundColor = 'transparent')}
        />

        {/* Main Content */}
        <div className="content-area">

          <div className="breadcrumb-row">
            {viewMode === 'folder' ? (
              <>
                <Breadcrumb currentPath={currentPath} onNavigate={(path) => {
                  setCurrentPath(path)
                  checkCurrentPathBookmark(rootHandle.name, path)
                }} />

                <button
                  onClick={() => handleToggleFolderBookmark(rootHandle?.name, currentPath)}
                  title={isCurrentPathBookmarked ? "Remove Shortcut" : "Add Shortcut to this folder"}
                  className={`shortcut-btn ${isCurrentPathBookmarked ? 'active' : 'inactive'}`}
                >
                  {isCurrentPathBookmarked ? '★' : '☆'}
                </button>
              </>
            ) : (
              <div className="stats-text">
                Showing {filteredFiles.length} assets in {viewMode === 'recent' ? 'Recent Files' : activeCollection}
              </div>
            )}
          </div>

          <div className="controls-row">
            {/* Sort Row */}
            <div className="filters-container">
              {/* Tag Filter - Only show in Folder mode or Recent mode */}
              {viewMode !== 'collection' && uniqueTags.length > 0 && (
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="filter-select min-w"
                >
                  <option value="">All Tags</option>
                  {uniqueTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              )}

              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Assets</option>
                <option value="model">3D Models</option>
                <option value="image">Images</option>
                <option value="audio">Audio</option>
                <option value="video">Video</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="type">Type</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          {isScanning ? (
            <div className="scanning-container">
              <div className="scanning-badge">
                <div className="spinner" />
                <span>Scanning... ({files.length} / {totalScanned} scanned)</span>
              </div>
              <button
                onClick={stopScan}
                className="stop-scan-btn"
              >
                Stop Scan
              </button>
            </div>
          ) : (
            <>
              {/* Folder Search Logic */}
              {searchType === 'folder' && searchQuery ? (
                <div className="folder-grid">
                  {folders
                    .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(folder => (
                      <div
                        key={folder.path}
                        onClick={() => {
                          setCurrentPath(folder.path)
                          setSearchQuery('') // Clear search on navigate
                        }}
                        className="folder-card"
                      >
                        <div className="folder-icon">📂</div>
                        <div className="folder-name">{folder.name}</div>
                        <div className="folder-path">
                          {folder.path}
                        </div>
                      </div>
                    ))}
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="no-assets-container">
                  <div>No assets found.</div>
                  <button
                    onClick={() => {
                      if (currentPath) {
                        refreshFolder(currentPath)
                      }
                    }}
                    className="refresh-btn"
                  >
                    Refresh Folder
                  </button>
                </div>
              ) : (
                <div className="file-grid">
                  {filteredFiles.map((file) => {
                    const isSelected = selectedFiles.has(file.path)
                    return (
                      <div
                        key={file.path}
                        onClick={(e) => {
                          if (e.ctrlKey || e.metaKey) {
                            toggleSelection(e, file.path)
                          } else {
                            setSelectedFile(file)
                          }
                        }}
                        className={`file-card ${isSelected ? 'selected' : ''}`}
                      >
                        {/* Selection Checkbox */}
                        <div
                          onClick={(e) => toggleSelection(e, file.path)}
                          className="checkbox-wrapper"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => { }} // Handled by div onClick
                            className="checkbox-input"
                          />
                        </div>

                        {/* Thumbnail */}
                        <div className="thumbnail-wrapper">
                          {IMAGE_EXTENSIONS.includes(file.type) ? (
                            <LazyImage file={file} />
                          ) : (
                            <div className="file-icon-placeholder">
                              {MODEL_EXTENSIONS.includes(file.type) ? '📦' :
                                AUDIO_EXTENSIONS.includes(file.type) ? '🎵' :
                                  VIDEO_EXTENSIONS.includes(file.type) ? '🎬' : '📄'}
                            </div>
                          )}
                          {/* Type Badge */}
                          <div className="type-badge">
                            {file.type.replace('.', '')}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="file-info">
                          <div className="file-name-text" title={file.name}>
                            {file.name}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
