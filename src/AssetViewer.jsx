import React, { Suspense, useEffect, useState, useMemo } from 'react'
import ModelViewer from './components/ModelViewer'
import { addTag, removeTag, getTagsForFile } from './db'
import { IMAGE_EXTENSIONS, MODEL_EXTENSIONS } from './utils/constants'
import './styles/AssetViewer.css'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error("Viewer Error:", error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-container">
                    <h2>Something went wrong.</h2>
                    <pre className="error-pre">
                        {this.state.error?.message}
                    </pre>
                </div>
            )
        }

        return this.props.children
    }
}

function FormatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    // Clamp i to valid array indices to prevent undefined access
    const clampedI = Math.max(0, Math.min(i, sizes.length - 1))
    return `${parseFloat((bytes / Math.pow(k, clampedI)).toFixed(dm))} ${sizes[clampedI]}`
}

export default function AssetViewer({ file, onClose, onNext, onPrevious, hasNext, hasPrevious, projectFiles = [] }) {
    const [url, setUrl] = useState(null)
    const [metadata, setMetadata] = useState(null)
    const [dimensions, setDimensions] = useState(null) // { width, height }
    const [duration, setDuration] = useState(null) // seconds
    const [tags, setTags] = useState([])
    const [tagInput, setTagInput] = useState('')
    const [loadedFile, setLoadedFile] = useState(null) // Track which file the current URL belongs to

    useEffect(() => {
        let objectUrl = null

        const loadFile = async () => {
            // 1. Load the main model file
            const f = await file.handle.getFile()
            objectUrl = URL.createObjectURL(f)
            setUrl(objectUrl)
            setLoadedFile(file) // Mark this file as loaded
            setMetadata({
                size: f.size,
                lastModified: f.lastModified,
                type: f.type || 'Unknown'
            })
            setDimensions(null)
            setDuration(null)

            const fileTags = await getTagsForFile(file.path)
            setTags(fileTags)
        }

        loadFile()

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [file])

    const isImage = IMAGE_EXTENSIONS.includes(file.type)
    const isModel = MODEL_EXTENSIONS.includes(file.type)
    const isVideo = ['.mp4', '.webm', '.ogg', '.mov', '.avi'].includes(file.type)

    const handleAddTag = async (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            await addTag(file.path, tagInput.trim())
            setTags(await getTagsForFile(file.path))
            setTagInput('')
        }
    }

    const handleRemoveTag = async (tag) => {
        await removeTag(file.path, tag)
        setTags(await getTagsForFile(file.path))
    }

    const handleImageLoad = (e) => {
        setDimensions({ width: e.target.naturalWidth, height: e.target.naturalHeight })
    }

    const handleVideoLoadedMetadata = (e) => {
        setDimensions({ width: e.target.videoWidth, height: e.target.videoHeight })
        setDuration(e.target.duration)
    }

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' && onNext) onNext()
            if (e.key === 'ArrowLeft' && onPrevious) onPrevious()
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onNext, onPrevious, onClose])

    const handleDownload = async () => {
        if (!file.handle) return
        try {
            const fileData = await file.handle.getFile()
            const url = URL.createObjectURL(fileData)
            const a = document.createElement('a')
            a.href = url
            a.download = file.name
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Download failed:', err)
            alert('Failed to download file.')
        }
    }

    return (
        <div className="viewer-overlay">
            {/* Main Content Area */}
            <div className="viewer-content-wrapper">
                <button
                    onClick={onClose}
                    className="close-button"
                >
                    ✕
                </button>

                <div className="viewer-display-area">
                    {/* Only show content if the URL matches the current file */}
                    {url && loadedFile === file ? (
                        <>
                            {isModel && (
                                <ModelViewer file={file} url={url} projectFiles={projectFiles} />
                            )}

                            {isImage && (
                                <img
                                    src={url}
                                    alt={file.name}
                                    className="preview-image"
                                    onLoad={handleImageLoad}
                                />
                            )}

                            {isVideo && (
                                <video
                                    src={url}
                                    controls
                                    autoPlay
                                    className="preview-video"
                                    onLoadedMetadata={handleVideoLoadedMetadata}
                                />
                            )}

                            {!isModel && !isImage && !isVideo && (
                                <div className="no-preview">
                                    <div className="no-preview-icon">📄</div>
                                    <div>Preview not available for this file type</div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div>Loading...</div>
                    )}
                </div>
            </div>

            {/* Navigation Buttons */}
            {hasPrevious && (
                <button
                    onClick={(e) => { e.stopPropagation(); onPrevious(); }}
                    className="nav-button prev"
                >
                    ‹
                </button>
            )}
            {hasNext && (
                <button
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    className="nav-button next"
                >
                    ›
                </button>
            )}

            {/* Sidebar */}
            <div className="viewer-sidebar">
                <div className="file-details">
                    <h2>
                        {file.name}
                    </h2>
                    <p>
                        {file.path}
                    </p>
                </div>

                <button
                    onClick={handleDownload}
                    className="download-button"
                >
                    <span>⬇️</span> Download File
                </button>

                <div className="divider" />

                <div className="metadata-section">
                    <div>
                        <label className="metadata-label">
                            Type
                        </label>
                        <div className="metadata-value">{file.type.toUpperCase()}</div>
                    </div>

                    {metadata && (
                        <>
                            <div>
                                <label className="metadata-label">
                                    Size
                                </label>
                                <div className="metadata-value">{FormatBytes(metadata.size)}</div>
                            </div>
                            <div>
                                <label className="metadata-label">
                                    Last Modified
                                </label>
                                <div className="metadata-value">
                                    {new Date(metadata.lastModified).toLocaleString()}
                                </div>
                            </div>

                            {dimensions && (
                                <div>
                                    <label className="metadata-label">
                                        Resolution
                                    </label>
                                    <div className="metadata-value">{dimensions.width} x {dimensions.height} px</div>
                                </div>
                            )}

                            {duration && (
                                <div>
                                    <label className="metadata-label">
                                        Duration
                                    </label>
                                    <div className="metadata-value">{Math.round(duration)}s</div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="divider" />

                {/* Tags Section */}
                <div>
                    <label className="tags-label">
                        Tags
                    </label>
                    <div className="tags-list">
                        {tags.map(tag => (
                            <span
                                key={tag}
                                className="tag-item"
                            >
                                {tag}
                                <button
                                    onClick={() => handleRemoveTag(tag)}
                                    className="tag-remove-btn"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="Add tag + Enter"
                        className="tag-input"
                    />
                </div>
            </div>
        </div>
    )
}
