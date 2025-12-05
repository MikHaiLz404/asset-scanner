import React, { Suspense, useEffect, useState, useMemo } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Stage, Bounds, Grid } from '@react-three/drei'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import * as THREE from 'three'
import { IMAGE_EXTENSIONS } from '../utils/constants'
import '../styles/ModelViewer.css'

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

// Helper to calculate model statistics
const getModelStats = (scene) => {
    let triangles = 0
    let vertices = 0
    let meshes = 0

    scene.traverse((child) => {
        if (child.isMesh && child.geometry) {
            meshes++
            if (child.geometry.index) {
                triangles += child.geometry.index.count / 3
                vertices += child.geometry.attributes.position.count
            } else if (child.geometry.attributes.position) {
                triangles += child.geometry.attributes.position.count / 3
                vertices += child.geometry.attributes.position.count
            }
        }
    })
    return { triangles, vertices, meshes }
}

function FBXModel({ url, manager, isWireframe, onLoaded }) {
    const loaderFn = React.useCallback((loader) => {
        if (manager) loader.manager = manager
    }, [manager])

    const fbx = useLoader(FBXLoader, url, loaderFn)

    const scene = useMemo(() => {
        const clone = fbx.clone()
        fixMaterials(clone)
        return clone
    }, [fbx])

    useEffect(() => {
        if (onLoaded) onLoaded(getModelStats(scene))
    }, [scene, onLoaded])

    useEffect(() => {
        scene.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.wireframe = isWireframe)
                } else {
                    child.material.wireframe = isWireframe
                }
            }
        })
    }, [scene, isWireframe])

    // Apply default rotation for FBX (often Z-up)
    return <primitive object={scene} rotation={[-Math.PI / 2, 0, 0]} />
}

function OBJModel({ url, manager, isWireframe, onLoaded }) {
    const loaderFn = React.useCallback((loader) => {
        if (manager) loader.manager = manager
    }, [manager])

    const obj = useLoader(OBJLoader, url, loaderFn)
    const scene = useMemo(() => {
        const clone = obj.clone()
        fixMaterials(clone)
        return clone
    }, [obj])

    useEffect(() => {
        if (onLoaded) onLoaded(getModelStats(scene))
    }, [scene, onLoaded])

    useEffect(() => {
        scene.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.wireframe = isWireframe)
                } else {
                    child.material.wireframe = isWireframe
                }
            }
        })
    }, [scene, isWireframe])

    // OBJ might also need rotation depending on export settings, but let's try 0 first or consistent with FBX?
    // Usually OBJ is less predictable. Let's stick to 0 for now unless user complains about OBJ too.
    // Actually, if the user says "model is lying down", it's likely they are testing FBX or similar.
    // Let's apply the same rotation for now as a safe bet for "Asset Scanner" context where Z-up is common.
    // Wait, let's just rotate FBX for now as it's the most notorious one.
    return <primitive object={scene} />
}

function GLTFModel({ url, manager, isWireframe, onLoaded }) {
    const loaderFn = React.useCallback((loader) => {
        if (manager) loader.manager = manager
    }, [manager])

    const gltf = useLoader(GLTFLoader, url, loaderFn)
    const scene = useMemo(() => {
        const clone = gltf.scene.clone()
        fixMaterials(clone)
        return clone
    }, [gltf])

    useEffect(() => {
        if (onLoaded) onLoaded(getModelStats(scene))
    }, [scene, onLoaded])

    useEffect(() => {
        scene.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.wireframe = isWireframe)
                } else {
                    child.material.wireframe = isWireframe
                }
            }
        })
    }, [scene, isWireframe])

    // GLTF is usually Y-up, so no rotation needed typically.
    return <primitive object={scene} />
}

function Model({ url, type, manager, isWireframe, onLoaded }) {
    console.log("Rendering Model:", type, url)
    if (type === '.fbx') return <FBXModel url={url} manager={manager} isWireframe={isWireframe} onLoaded={onLoaded} />
    if (type === '.obj') return <OBJModel url={url} manager={manager} isWireframe={isWireframe} onLoaded={onLoaded} />
    if (type === '.gltf' || type === '.glb') return <GLTFModel url={url} manager={manager} isWireframe={isWireframe} onLoaded={onLoaded} />
    return null
}

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

export default function ModelViewer({ file, url, projectFiles }) {
    const [manager, setManager] = useState(null)
    const [showGrid, setShowGrid] = useState(true)
    const [isWireframe, setIsWireframe] = useState(false)
    const [readyUrl, setReadyUrl] = useState(null)
    const [stats, setStats] = useState({ triangles: 0, vertices: 0, meshes: 0 })

    useEffect(() => {
        let textureUrls = []
        let placeholderUrl = null
        let isMounted = true

        const setupManager = async () => {
            setReadyUrl(null) // Reset ready URL when file changes
            setStats({ triangles: 0, vertices: 0, meshes: 0 })

            // Texture Resolver Logic
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
                    if (!isMounted) return
                    try {
                        const texFile = await tex.handle.getFile()
                        const texUrl = URL.createObjectURL(texFile)
                        textureUrls.push(texUrl) // Keep track to revoke later
                        textureMap.set(tex.name, texUrl)
                        // Also map lowercase for case-insensitive matching
                        textureMap.set(tex.name.toLowerCase(), texUrl)
                    } catch (err) {
                        console.warn("Failed to load texture blob:", tex.name, err)
                    }
                }))

                if (!isMounted) return

                // Create LoadingManager
                const newManager = new THREE.LoadingManager()

                // Create placeholder blob
                const placeholderBlob = await createPlaceholderTexture()
                placeholderUrl = URL.createObjectURL(placeholderBlob)

                newManager.setURLModifier((resource) => {
                    // CRITICAL: Do not modify the main model file URL!
                    if (resource === url) return resource

                    // The loader might request 'wood.jpg' or './wood.jpg' or 'path/to/wood.jpg'
                    // We extract the filename using regex to handle both / and \
                    const filename = resource.split(/[/\\\\]/).pop()

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
                                blobUrl = val;
                                break;
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

                newManager.setURLModifier((resource) => {
                    if (resource === url) return resource
                    console.warn(`Texture not found(no siblings): ${resource}. Using placeholder.`)
                    return placeholderUrl
                })
                setManager(newManager)
            }

            // Manager is ready, now we can show the model
            setReadyUrl(url)
        }

        setupManager()

        return () => {
            isMounted = false
            if (placeholderUrl) URL.revokeObjectURL(placeholderUrl)
            textureUrls.forEach(u => URL.revokeObjectURL(u))
        }
    }, [file, projectFiles, url])

    if (!readyUrl || !manager) {
        return <div className="loading-container">Loading textures...</div>
    }

    return (
        <div className="viewer-container">
            <ErrorBoundary>
                <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 10], fov: 50 }}>
                    <Suspense fallback={null}>
                        {/* Removed observe prop from Bounds to prevent auto-refit on updates */}
                        <Stage environment="studio" intensity={7} adjustCamera={false} shadows={false}>
                            <Bounds fit clip margin={2.5}>
                                <Model
                                    url={readyUrl}
                                    type={file.type}
                                    manager={manager}
                                    isWireframe={isWireframe}
                                    onLoaded={setStats}
                                />
                            </Bounds>
                        </Stage>
                        {showGrid && <Grid infiniteGrid fadeDistance={500} sectionColor="#444" cellColor="#222" />}
                        {showGrid && <axesHelper args={[500]} />}
                    </Suspense>
                    <OrbitControls makeDefault />
                </Canvas>
            </ErrorBoundary>

            {/* Stats Panel (Top Right) */}
            <div className="stats-panel">
                <div className="stat-item">
                    <span className="stat-label">Tris</span>
                    <span className="stat-value">{stats.triangles.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Verts</span>
                    <span className="stat-value">{stats.vertices.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Meshes</span>
                    <span className="stat-value">{stats.meshes.toLocaleString()}</span>
                </div>
            </div>

            {/* Controls Bar (Bottom Center) */}
            <div className="controls-bar">
                <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`control-button ${showGrid ? 'active' : ''}`}
                    title="Toggle Grid"
                >
                    Grid
                </button>
                <button
                    onClick={() => setIsWireframe(!isWireframe)}
                    className={`control-button ${isWireframe ? 'active' : ''}`}
                    title="Toggle Wireframe"
                >
                    Wireframe
                </button>
            </div>
        </div>
    )
}
