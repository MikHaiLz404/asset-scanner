import { useState, useEffect } from 'react'
import * as THREE from 'three'
import { IMAGE_EXTENSIONS } from '../utils/constants'
import { createPlaceholderTexture } from '../utils/modelUtils'

export function useTextureLoader(file, url, projectFiles) {
    const [manager, setManager] = useState(null)
    const [readyUrl, setReadyUrl] = useState(null)

    useEffect(() => {
        let textureUrls = []
        let placeholderUrl = null
        let isMounted = true

        const setupManager = async () => {
            setReadyUrl(null) // Reset ready URL when file changes

            // Helper to check if a file is "relevant" (nearby)
            const isRelevant = (texFile) => {
                const modelPath = file.path
                const texPath = texFile.path

                // 1. Same directory
                const modelDir = modelPath.substring(0, modelPath.lastIndexOf('/'))
                if (texPath.startsWith(modelDir + '/')) return true

                // 2. "textures", "Textures", "texture", "Texture" folder in the same directory as model
                const textureVariants = ['textures', 'Textures', 'texture', 'Texture']

                for (const variant of textureVariants) {
                    if (texPath.startsWith(modelDir + '/' + variant + '/')) return true
                }

                // 3. Texture folders in the PARENT directory of model
                // e.g. model: /a/b/Meshes/model.fbx
                // tex: /a/b/Texture/tex.png
                const parentDir = modelDir.substring(0, modelDir.lastIndexOf('/'))
                if (parentDir) {
                    for (const variant of textureVariants) {
                        if (texPath.startsWith(parentDir + '/' + variant + '/')) return true
                    }
                }

                return false
            }

            // Filter for relevant textures only
            const relevantTextures = projectFiles.filter(f =>
                IMAGE_EXTENSIONS.includes(f.type) && isRelevant(f)
            )

            console.log(`[Debug] Found ${relevantTextures.length} relevant textures for ${file.name}`)

            if (relevantTextures.length > 0) {
                // Create a map of filename -> blobURL
                const textureMap = new Map()

                await Promise.all(relevantTextures.map(async (tex) => {
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
                    if (resource === url) return resource
                    if (resource.startsWith('data:')) return resource

                    // If the resource is one of the valid blob URLs we created, return it.
                    if (textureUrls.includes(resource)) return resource

                    // Otherwise, if it's a 'blob:' URL not in our list, it's likely a malformed URL 
                    // created by the loader resolving a relative path against the model's blob URL.
                    // We fall through to extract the filename and look it up.

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
                                blobUrl = val;
                                break;
                            }
                        }
                    }

                    if (blobUrl) {
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

    return { manager, readyUrl }
}
