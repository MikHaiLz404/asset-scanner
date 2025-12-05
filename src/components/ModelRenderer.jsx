import React, { useMemo, useEffect } from 'react'
import { useLoader } from '@react-three/fiber'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { fixMaterials, getModelStats } from '../utils/modelUtils'

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

    return <primitive object={scene} />
}

export default function ModelRenderer({ url, type, manager, isWireframe, onLoaded }) {
    if (type === '.fbx') return <FBXModel url={url} manager={manager} isWireframe={isWireframe} onLoaded={onLoaded} />
    if (type === '.obj') return <OBJModel url={url} manager={manager} isWireframe={isWireframe} onLoaded={onLoaded} />
    if (type === '.gltf' || type === '.glb') return <GLTFModel url={url} manager={manager} isWireframe={isWireframe} onLoaded={onLoaded} />
    return null
}
