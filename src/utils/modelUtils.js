import * as THREE from 'three'

// Helper to apply default material if texture is missing
export const fixMaterials = (scene) => {
    if (!scene) return
    scene.traverse((child) => {
        if (child.isMesh) {
            // Ensure shadows
            child.castShadow = true
            child.receiveShadow = true

            // If no map (texture), apply a nice default material
            // We check if the material has a map, or if it's an array of materials
            const mat = child.material
            if (!mat) {
                return
            }

            const hasMap = Array.isArray(mat) ? mat.some(m => m && m.map) : (mat && mat.map)

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
}

// Helper to create a 1x1 grey texture for fallback
export const createPlaceholderTexture = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 2
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#cccccc'
    ctx.fillRect(0, 0, 2, 2)
    return new Promise(resolve => canvas.toBlob(resolve))
}

// Helper to calculate model statistics
export const getModelStats = (scene) => {
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
