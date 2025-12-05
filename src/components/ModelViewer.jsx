
import React, { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, Bounds, Grid, useBounds } from '@react-three/drei'
import { useTextureLoader } from '../hooks/useTextureLoader'
import ModelRenderer from './ModelRenderer'
import '../styles/ModelViewer.css'

// Component to handle focus triggering
function FocusHandler({ trigger }) {
    const bounds = useBounds()
    useEffect(() => {
        if (trigger > 0) {
            // Use a small timeout to allow the frame to settle
            const timeout = setTimeout(() => {
                bounds.refresh().fit()
            }, 10)
            return () => clearTimeout(timeout)
        }
    }, [trigger, bounds])
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
    const [showGrid, setShowGrid] = useState(true)
    const [isWireframe, setIsWireframe] = useState(false)
    const [stats, setStats] = useState({ triangles: 0, vertices: 0, meshes: 0 })
    const [focusTrigger, setFocusTrigger] = useState(0)

    // Use custom hook for texture loading
    const { manager, readyUrl } = useTextureLoader(file, url, projectFiles)

    if (!readyUrl || !manager) {
        return <div className="loading-container">Loading textures...</div>
    }

    return (
        <div className="viewer-container">
            <ErrorBoundary>
                <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 10], fov: 50, far: 10000 }}>
                    <Suspense fallback={null}>
                        {/* Removed observe prop from Bounds to prevent auto-refit on updates */}
                        <Stage environment="studio" intensity={7} adjustCamera={false} shadows={false}>
                            <Bounds fit margin={2.0}>
                                <FocusHandler trigger={focusTrigger} />
                                <ModelRenderer
                                    url={readyUrl}
                                    type={file.type}
                                    manager={manager}
                                    isWireframe={isWireframe}
                                    onLoaded={(s) => {
                                        setStats(s)
                                        // Trigger focus slightly after load
                                        setTimeout(() => setFocusTrigger(t => t + 1), 100)
                                    }}
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
                <div className="divider"></div>
                <button
                    onClick={() => setFocusTrigger(t => t + 1)}
                    className="control-button action"
                    title="Reset Camera Focus"
                >
                    Focus
                </button>
            </div>
        </div>
    )
}

