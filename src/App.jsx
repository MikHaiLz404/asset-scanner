import React, { useEffect, useState, useCallback } from 'react'
import NavBar from './NavBar'
import { saveFolderHandle, getRecentFiles, saveRecentFile } from './db'
import AssetViewer from './AssetViewer'
import FolderTree from './FolderTree'
import Breadcrumb from './Breadcrumb'
import LazyImage from './components/LazyImage'
import { MODEL_EXTENSIONS, IMAGE_EXTENSIONS, AUDIO_EXTENSIONS, VIDEO_EXTENSIONS } from './utils/constants'

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

        <div style={{ marginTop: '3rem', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Bookmarks Section */}
          {bookmarkedFolders.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⭐</span> Bookmarked Folders
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {bookmarkedFolders.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleFolderClick(item.handle)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.875rem',
                      textAlign: 'left', transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                      e.currentTarget.style.transform = 'translateX(4px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                      e.currentTarget.style.transform = 'none'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>📂</span>
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}



          {/* Recent Section */}
          {recentFolders.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Recent Folders
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentFolders.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleFolderClick(item.handle)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.875rem',
                      textAlign: 'left', transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)'
                      e.currentTarget.style.transform = 'translateX(4px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)'
                      e.currentTarget.style.transform = 'none'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>📂</span>
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
    <div className="container" style={{ maxWidth: '100%', padding: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
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
      <div style={{ padding: '0.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {viewMode === 'folder' ? (
            <>
              <button
                onClick={() => handleToggleBookmark(rootHandle)}
                title={isCurrentBookmarked ? "Remove Bookmark" : "Bookmark Folder"}
                style={{
                  background: 'none', fontSize: '1.25rem',
                  color: isCurrentBookmarked ? '#fbbf24' : 'var(--text-secondary)',
                  transition: 'transform 0.2s', border: 'none', cursor: 'pointer'
                }}
              >
                {isCurrentBookmarked ? '⭐' : '☆'}
              </button>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {files.length} total assets
              </span>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => {
                  if (viewMode === 'collection') {
                    handleCollectionsOverviewClick()
                  } else {
                    setViewMode('folder')
                    setFiles(projectFiles)
                  }
                }}
                style={{
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                  padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  color: 'var(--text-primary)'
                }}
              >
                <span>⬅️</span> {viewMode === 'collection' ? 'Back to Collections' : 'Back to Project'}
              </button>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                {viewMode === 'recent' ? 'Recent Files' :
                  viewMode === 'collections-overview' ? 'Collections' :
                    `Collection: ${activeCollection}`}
              </h3>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {selectedFiles.size > 0 && (
            <>
              <button
                onClick={() => downloadBatch(files, currentPath, rootHandle?.name)}
                disabled={isDownloading}
                style={{
                  backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)',
                  border: 'none', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-md)',
                  fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: '0.5rem', fontSize: '0.875rem'
                }}
              >
                {isDownloading ? 'Zipping...' : `Download (${selectedFiles.size})`}
              </button>

              <button
                onClick={clearSelection}
                style={{
                  backgroundColor: 'transparent', color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)', padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.875rem'
                }}
              >
                Clear
              </button>
            </>
          )}

          <button
            className="btn-primary"
            style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.25rem 0.75rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}
            onClick={handleOpenFolder}
          >
            Change Folder
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
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
          style={{
            width: '5px', cursor: 'col-resize',
            backgroundColor: isResizing ? 'var(--accent-primary)' : 'transparent',
            transition: 'background-color 0.2s', zIndex: 10
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-primary)'}
          onMouseLeave={(e) => !isResizing && (e.currentTarget.style.backgroundColor = 'transparent')}
        />

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem 2rem', overflowY: 'auto', position: 'relative' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            {viewMode === 'folder' ? (
              <>
                <Breadcrumb currentPath={currentPath} onNavigate={(path) => {
                  setCurrentPath(path)
                  checkCurrentPathBookmark(rootHandle.name, path)
                }} />

                <button
                  onClick={() => handleToggleFolderBookmark(rootHandle?.name, currentPath)}
                  title={isCurrentPathBookmarked ? "Remove Shortcut" : "Add Shortcut to this folder"}
                  style={{
                    background: isCurrentPathBookmarked ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '1rem',
                    color: isCurrentPathBookmarked ? 'white' : 'var(--text-secondary)',
                    transition: 'all 0.2s', width: '32px', height: '32px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => !isCurrentPathBookmarked && (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => !isCurrentPathBookmarked && (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  {isCurrentPathBookmarked ? '★' : '☆'}
                </button>
              </>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Showing {filteredFiles.length} assets in {viewMode === 'recent' ? 'Recent Files' : activeCollection}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {/* Sort Row */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              {/* Tag Filter - Only show in Folder mode or Recent mode */}
              {viewMode !== 'collection' && uniqueTags.length > 0 && (
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  style={{
                    padding: '0 1rem', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
                    cursor: 'pointer', minWidth: '150px'
                  }}
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
                style={{
                  padding: '0 1rem', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
                  cursor: 'pointer'
                }}
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
                style={{
                  padding: '0 1rem', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="type">Type</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          {isScanning ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--text-secondary)', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--bg-secondary)',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--accent-primary)',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}>
                <div className="spinner" style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid var(--text-secondary)',
                  borderTopColor: 'var(--accent-primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <span>Scanning... ({files.length} / {totalScanned} scanned)</span>
                <style>{`
                      @keyframes spin {
                          to { transform: rotate(360deg); }
                      }
                  `}</style>
              </div>
              <button
                onClick={stopScan}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                Stop Scan
              </button>
            </div>
          ) : (
            <>
              {/* Folder Search Logic */}
              {searchType === 'folder' && searchQuery ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '1.5rem',
                  alignContent: 'start'
                }}>
                  {folders
                    .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(folder => (
                      <div
                        key={folder.path}
                        onClick={() => {
                          setCurrentPath(folder.path)
                          setSearchQuery('') // Clear search on navigate
                        }}
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: '1px solid var(--border-color)',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          aspectRatio: '1',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '1rem',
                          textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
                          e.currentTarget.style.borderColor = 'var(--accent-primary)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none'
                          e.currentTarget.style.boxShadow = 'none'
                          e.currentTarget.style.borderColor = 'var(--border-color)'
                        }}
                      >
                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📂</div>
                        <div style={{ fontWeight: 500, wordBreak: 'break-word', fontSize: '0.9rem' }}>{folder.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', wordBreak: 'break-all' }}>
                          {folder.path}
                        </div>
                      </div>
                    ))}
                </div>
              ) : filteredFiles.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--text-secondary)', flexDirection: 'column', gap: '1rem' }}>
                  <div>No assets found.</div>
                  <button
                    onClick={() => {
                      if (currentPath) {
                        refreshFolder(currentPath)
                      }
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--accent-primary)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    Refresh Folder
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '1.5rem',
                  alignContent: 'start'
                }}>
                  {filteredFiles.map((file) => {
                    const isSelected = selectedFiles.has(file.path)
                    return (
                      <div
                        key={file.path}
                        onClick={(e) => {
                          if (e.ctrlKey || e.metaKey) {
                            toggleSelection(file.path)
                          } else {
                            setSelectedFile(file)
                          }
                        }}
                        style={{
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          aspectRatio: '1',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.transform = 'translateY(-4px)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.transform = 'none'
                            e.currentTarget.style.boxShadow = 'none'
                          }
                        }}
                      >
                        {/* Thumbnail */}
                        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {IMAGE_EXTENSIONS.includes(file.type) ? (
                            <LazyImage file={file} />
                          ) : (
                            <div style={{ fontSize: '3rem' }}>
                              {MODEL_EXTENSIONS.includes(file.type) ? '📦' :
                                AUDIO_EXTENSIONS.includes(file.type) ? '🎵' :
                                  VIDEO_EXTENSIONS.includes(file.type) ? '🎬' : '📄'}
                            </div>
                          )}
                          {/* Type Badge */}
                          <div style={{
                            position: 'absolute', top: '0.5rem', right: '0.5rem',
                            backgroundColor: 'rgba(0,0,0,0.7)', color: 'white',
                            padding: '0.25rem 0.5rem', borderRadius: '4px',
                            fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase'
                          }}>
                            {file.type.replace('.', '')}
                          </div>
                        </div>

                        {/* Info */}
                        <div style={{ padding: '0.75rem' }}>
                          <div style={{
                            fontWeight: 500, marginBottom: '0.25rem',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }} title={file.name}>
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
