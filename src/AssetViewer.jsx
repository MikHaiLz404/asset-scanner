import React, { Suspense, useEffect, useState, useMemo } from 'react'
import ModelViewer from './components/ModelViewer'
import { addTag, removeTag, getTagsForFile } from './db'
import { IMAGE_EXTENSIONS, MODEL_EXTENSIONS } from './utils/constants'

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
                <div style={{ color: 'red', padding: '2rem', textAlign: 'center' }}>
                    <h2>Something went wrong.</h2>
                    <pre style={{ background: '#333', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
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
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 1000,
            display: 'flex',
            color: 'white'
        }}>
            {/* Main Content Area */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        zIndex: 10,
                        background: 'rgba(0,0,0,0.5)',
                        border: 'none',
                        color: 'white',
                        fontSize: '1.5rem',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    ✕
                </button>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
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
                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                    onLoad={handleImageLoad}
                                />
                            )}

                            {isVideo && (
                                <video
                                    src={url}
                                    controls
                                    autoPlay
                                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                                    onLoadedMetadata={handleVideoLoadedMetadata}
                                />
                            )}

                            {!isModel && !isImage && !isVideo && (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📄</div>
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
                    style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.5)',
                        border: 'none',
                        color: 'white',
                        fontSize: '2rem',
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 20,
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                >
                    ‹
                </button>
            )}
            {hasNext && (
                <button
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    style={{
                        position: 'absolute',
                        right: '320px', // Avoid sidebar (300px + 20px padding)
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.5)',
                        border: 'none',
                        color: 'white',
                        fontSize: '2rem',
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 20,
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                >
                    ›
                </button>
            )}

            {/* Sidebar */}
            <div style={{
                width: '300px',
                backgroundColor: '#1a1a1a',
                borderLeft: '1px solid #333',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                overflowY: 'auto'
            }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', wordBreak: 'break-all' }}>
                        {file.name}
                    </h2>
                    <p style={{ color: '#888', fontSize: '0.875rem', wordBreak: 'break-all' }}>
                        {file.path}
                    </p>
                </div>

                <button
                    onClick={handleDownload}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--bg-primary)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <span>⬇️</span> Download File
                </button>

                <div style={{ height: '1px', backgroundColor: '#333' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Type
                        </label>
                        <div style={{ fontSize: '0.875rem' }}>{file.type.toUpperCase()}</div>
                    </div>

                    {metadata && (
                        <>
                            <div>
                                <label style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Size
                                </label>
                                <div style={{ fontSize: '0.875rem' }}>{FormatBytes(metadata.size)}</div>
                            </div>
                            <div>
                                <label style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Last Modified
                                </label>
                                <div style={{ fontSize: '0.875rem' }}>
                                    {new Date(metadata.lastModified).toLocaleString()}
                                </div>
                            </div>

                            {dimensions && (
                                <div>
                                    <label style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Resolution
                                    </label>
                                    <div style={{ fontSize: '0.875rem' }}>{dimensions.width} x {dimensions.height} px</div>
                                </div>
                            )}

                            {duration && (
                                <div>
                                    <label style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Duration
                                    </label>
                                    <div style={{ fontSize: '0.875rem' }}>{Math.round(duration)}s</div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div style={{ height: '1px', backgroundColor: '#333' }} />

                {/* Tags Section */}
                <div>
                    <label style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                        Tags
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                        {tags.map(tag => (
                            <span
                                key={tag}
                                style={{
                                    backgroundColor: '#333',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {tag}
                                <button
                                    onClick={() => handleRemoveTag(tag)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#888',
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontSize: '1rem',
                                        lineHeight: 1
                                    }}
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
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            backgroundColor: '#333',
                            border: '1px solid #444',
                            borderRadius: '4px',
                            color: 'white',
                            outline: 'none'
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
