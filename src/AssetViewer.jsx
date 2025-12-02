import React, { Suspense, useEffect, useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, Center, Bounds } from '@react-three/drei'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
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

function Model({ url, type, manager }) {
    console.log("Rendering Model:", type, url)
    if (type === '.fbx') return <FBXModel url={url} manager={manager} />
    if (type === '.obj') return <OBJModel url={url} manager={manager} />
    if (type === '.gltf' || type === '.glb') return <GLTFModel url={url} manager={manager} />
    return null
}

// Helper to apply default material if texture is missing
const fixMaterials = (scene) => {
    if (!scene) return
    console.log("--- fixMaterials starting ---")
    scene.traverse((child) => {
        if (child.isMesh) {
            // Ensure shadows
            child.castShadow = true
            child.receiveShadow = true

            // If no map (texture), apply a nice default material
            // We check if the material has a map, or if it's an array of materials
            const mat = child.material
            if (!mat) {
                console.log(`Mesh '${child.name}': No material`)
                return
            }

            const hasMap = Array.isArray(mat) ? mat.some(m => m && m.map) : (mat && mat.map)
            console.log(`Mesh '${child.name}': Material '${Array.isArray(mat) ? 'Multi' : mat.name}', hasMap: ${!!hasMap}`)

            if (hasMap) {
                // If it has a map, ensure it's set to needsUpdate and maybe check encoding
                const sanitize = (m) => {
                    if (m.map) m.map.colorSpace = THREE.SRGBColorSpace
                    // Sanitize to prevent black models
                    m.color.setHex(0xffffff) // Ensure white base
                    m.vertexColors = false // Ignore vertex colors
                    m.metalness = 0.1
                    m.roughness = 0.5
                    m.side = THREE.DoubleSide
                    m.needsUpdate = true
                }

                if (Array.isArray(mat)) {
                    mat.forEach(sanitize)
                } else {
                    sanitize(mat)
                }
            }

            if (!hasMap) {
                console.log(`Mesh '${child.name}': Applying default material`)
                // Create a default "Clay" material
                const defaultMat = new THREE.MeshStandardMaterial({
                    color: 0xcccccc, // Light Grey
                    roughness: 0.5,
                    metalness: 0.1,
                    side: THREE.DoubleSide,
                    vertexColors: false // Ignore vertex colors to prevent black meshes
                })

                // If it was an array, we might want to keep it or replace all?
                // Replacing all is safer for "black model" issues
                child.material = defaultMat
            }
        }
    })
    console.log("--- fixMaterials complete ---")
}

// Helper to create a 1x1 grey texture for fallback
const createPlaceholderTexture = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 2
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#cccccc'
    ctx.fillRect(0, 0, 2, 2)
    return new Promise(resolve => canvas.toBlob(resolve))
}

function FBXModel({ url, manager }) {
    const loaderFn = React.useCallback((loader) => {
        if (manager) loader.manager = manager
    }, [manager])

    const fbx = useLoader(FBXLoader, url, loaderFn)

    // Clone to avoid mutating cached object if we use it elsewhere (though useLoader caches)
    const scene = useMemo(() => {
        const clone = fbx.clone()
        fixMaterials(clone)
        return clone
    }, [fbx])
    return <primitive object={scene} />
}

function OBJModel({ url, manager }) {
    const loaderFn = React.useCallback((loader) => {
        if (manager) loader.manager = manager
    }, [manager])

    const obj = useLoader(OBJLoader, url, loaderFn)
    const scene = useMemo(() => {
        const clone = obj.clone()
        fixMaterials(clone)
        return clone
    }, [obj])
    return <primitive object={scene} />
}

function GLTFModel({ url, manager }) {
    const loaderFn = React.useCallback((loader) => {
        if (manager) loader.manager = manager
    }, [manager])

    const gltf = useLoader(GLTFLoader, url, loaderFn)
    const scene = useMemo(() => {
        const clone = gltf.scene.clone()
        fixMaterials(clone)
        return clone
    }, [gltf])
    return <primitive object={scene} />
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

    const [manager, setManager] = useState(null)
    const [loadedFile, setLoadedFile] = useState(null) // Track which file the current URL belongs to

    useEffect(() => {
        let objectUrl = null
        let textureUrls = []
        let placeholderUrl = null

        const loadFile = async () => {
            // 1. Load the main model file
            const f = await file.handle.getFile()
            objectUrl = URL.createObjectURL(f)
            // setUrl(objectUrl) // Delayed until manager is ready
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

            // 2. Texture Resolver Logic
            // Only for 3D models
            if (MODEL_EXTENSIONS.includes(file.type)) {
                // Strategy: Look for textures in:
                // 1. Same directory
                // 2. Parent directory (e.g. if model is in /mesh and texture is in /)
                // 3. Sibling directories (e.g. if model is in /mesh and texture is in /texture)

                // We achieve this by filtering files that start with the "Grandparent" path
                // path: A/B/C/model.fbx -> Parent: A/B/C -> Grandparent: A/B

                const parts = file.path.split('/')
                parts.pop() // Remove filename -> A/B/C
                parts.pop() // Remove current dir -> A/B
                const grandparentPath = parts.join('/')

                // Find all potential texture files in the subtree of the grandparent
                const nearbyTextures = projectFiles.filter(f => {
                    const isImage = IMAGE_EXTENSIONS.includes(f.type)
                    // Check if file is within the grandparent path (or root if no grandparent)
                    const isInScope = grandparentPath ? f.path.startsWith(grandparentPath + '/') : true
                    return isInScope && isImage
                })

                if (nearbyTextures.length > 0) {
                    console.log(`Found ${nearbyTextures.length} nearby textures in scope: ${grandparentPath || 'Root'} `)

                    // Create a map of filename -> blobURL
                    const textureMap = new Map()

                    await Promise.all(nearbyTextures.map(async (tex) => {
                        try {
                            const texFile = await tex.handle.getFile()
                            const texUrl = URL.createObjectURL(texFile)
                            textureUrls.push(texUrl) // Keep track to revoke later
                            textureMap.set(tex.name, texUrl)
                            // Also map lowercase for case-insensitive matching
                            textureMap.set(tex.name.toLowerCase(), texUrl)
                        } catch {
                            console.warn('Failed to load texture:', tex.name)
                        }
                    }))

                    // Create LoadingManager
                    const newManager = new THREE.LoadingManager()

                    // Create placeholder blob
                    const placeholderBlob = await createPlaceholderTexture()
                    placeholderUrl = URL.createObjectURL(placeholderBlob)

                    newManager.setURLModifier((url) => {
                        // CRITICAL: Do not modify the main model file URL!
                        if (url === objectUrl) return url

                        // The loader might request 'wood.jpg' or './wood.jpg' or 'path/to/wood.jpg'
                        // We extract the filename using regex to handle both / and \
                        const filename = url.split(/[/\\]/).pop()

                        // Try exact match
                        let blobUrl = textureMap.get(filename)
                        // Try case-insensitive
                        if (!blobUrl) blobUrl = textureMap.get(filename.toLowerCase())

                        // Try matching without extension (e.g. 'skin.tga' -> match 'skin.png')
                        if (!blobUrl) {
                            const basename = filename.split('.').slice(0, -1).join('.')
                            // Find any key that starts with basename + '.'
                            for (const [key, val] of textureMap.entries()) {
                                if (key.toLowerCase().startsWith(basename.toLowerCase() + '.')) {
                                    console.log(`Fuzzy matched texture: ${filename} -> ${key} `)
                                    blobUrl = val
                                    break
                                }
                            }
                        }

                        if (blobUrl) {
                            console.log(`Resolved texture: ${filename} -> ${blobUrl} `)
                            return blobUrl
                        }

                        console.warn(`Texture not found: ${filename}. Using placeholder.`)
                        return placeholderUrl
                    })

                    setManager(newManager)
                } else {
                    // Even if no sibling textures found, we should use a manager that returns placeholder
                    // to prevent black models for missing textures
                    const newManager = new THREE.LoadingManager()
                    const placeholderBlob = await createPlaceholderTexture()
                    placeholderUrl = URL.createObjectURL(placeholderBlob)

                    newManager.setURLModifier((url) => {
                        if (url === objectUrl) return url
                        console.warn(`Texture not found(no siblings): ${url}. Using placeholder.`)
                        return placeholderUrl
                    })
                    setManager(newManager)
                }
            }

            setUrl(objectUrl)
        }
        loadFile()

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl)
            if (placeholderUrl) URL.revokeObjectURL(placeholderUrl)
            textureUrls.forEach(u => URL.revokeObjectURL(u))
        }
    }, [file]) // Remove projectFiles to prevent reloading when background scan updates

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' && onNext) onNext()
            if (e.key === 'ArrowLeft' && onPrevious) onPrevious()
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onNext, onPrevious, onClose])

    const handleAddTag = async (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            const newTags = await addTag(file, tagInput.trim())
            setTags(newTags)
            setTagInput('')
        }
    }

    const handleRemoveTag = async (tagToRemove) => {
        const newTags = await removeTag(file.path, tagToRemove)
        setTags(newTags)
    }

    const isModel = MODEL_EXTENSIONS.includes(file.type)
    const isImage = IMAGE_EXTENSIONS.includes(file.type)
    const isAudio = ['.mp3', '.wav', '.ogg'].includes(file.type)
    const isVideo = ['.mp4', '.webm'].includes(file.type)

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
                                <div style={{ width: '100%', height: '100%' }}>
                                    <ErrorBoundary>
                                        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 10], fov: 50 }}>
                                            <Suspense fallback={null}>
                                                <Stage environment="studio" intensity={7} adjustCamera={false} shadows={false}>
                                                    <Bounds fit clip observe margin={2.5}>
                                                        <Model url={url} type={file.type} manager={manager} />
                                                    </Bounds>
                                                </Stage>
                                            </Suspense>
                                            <OrbitControls makeDefault />
                                        </Canvas>
                                    </ErrorBoundary>
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '20px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        fontSize: '0.875rem',
                                        pointerEvents: 'none'
                                    }}>
                                        Left Click to Rotate • Right Click to Pan • Scroll to Zoom
                                    </div>
                                </div>
                            )}

                            {isImage && (
                                <img
                                    src={url}
                                    alt={file.name}
                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                    onLoad={(e) => setDimensions({ width: e.target.naturalWidth, height: e.target.naturalHeight })}
                                />
                            )}

                            {isAudio && (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '5rem', marginBottom: '2rem' }}>🎵</div>
                                    <audio
                                        controls
                                        src={url}
                                        style={{ width: '300px' }}
                                        onLoadedMetadata={(e) => setDuration(e.target.duration)}
                                    />
                                </div>
                            )}

                            {isVideo && (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <video
                                        controls
                                        src={url}
                                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                                        onLoadedMetadata={(e) => {
                                            setDimensions({ width: e.target.videoWidth, height: e.target.videoHeight })
                                            setDuration(e.target.duration)
                                        }}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ color: '#888', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <div className="spinner" style={{
                                width: '40px',
                                height: '40px',
                                border: '4px solid #333',
                                borderTop: '4px solid #fff',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <div>Loading...</div>
                            <style>{`
@keyframes spin { 0 % { transform: rotate(0deg); } 100 % { transform: rotate(360deg); } }
`}</style>
                        </div>
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
