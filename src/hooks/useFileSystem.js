import { useState, useCallback, useRef } from 'react'
import { ALLOWED_EXTENSIONS, IMAGE_EXTENSIONS, IGNORED_FOLDERS } from '../utils/constants'

export function useFileSystem() {
    const [files, setFiles] = useState([]) // Displayed files (Grid)
    const [projectFiles, setProjectFiles] = useState([]) // All project files (Tree)
    const [folders, setFolders] = useState([]) // All folders (Tree structure)
    const [isScanning, setIsScanning] = useState(false)
    const [rootHandle, setRootHandle] = useState(null)

    // Use a ref to allow cancelling the scan if needed (not implemented yet, but good practice)
    const abortScan = useRef(false)

    // Generator function to yield files one by one (or in chunks)
    async function* scanDirectoryGenerator(dirHandle, path = '', depth = 0) {
        if (depth === 0) {
            console.log('scanDirectoryGenerator called with:', dirHandle.name)
        }

        let entryCount = 0
        try {
            for await (const entry of dirHandle.values()) {
                entryCount++
                if (depth === 0 && entryCount <= 3) {
                    console.log(`Top-level entry #${entryCount}:`, entry.name, entry.kind)
                }

                if (abortScan.current) break

                const entryPath = path ? `${path}/${entry.name}` : entry.name

                if (entry.kind === 'file') {
                    // Robust extension extraction: handle multiple dots, case, and whitespace
                    const parts = entry.name.split('.')
                    if (parts.length > 1) {
                        const ext = '.' + parts.pop().toLowerCase().trim()

                        // Targeted Debugging
                        if (path.includes('Haruhina')) {
                            console.log(`[Debug-Haruhina] Checking file: ${entry.name}, ext: ${ext}, Allowed: ${ALLOWED_EXTENSIONS.includes(ext)}`)
                        }

                        if (ALLOWED_EXTENSIONS.includes(ext)) {
                            yield {
                                id: entryPath,
                                name: entry.name,
                                path: entryPath,
                                kind: entry.kind,
                                type: ext,
                                handle: entry
                            }
                        } else {
                            // Log skipped file
                            if (path.includes('Haruhina')) {
                                console.log(`[Debug-Haruhina] Skipped file: ${entry.name} (ext: ${ext})`)
                            }
                        }
                    } else {
                        if (path.includes('Haruhina')) {
                            console.log(`[Debug-Haruhina] Skipped file (no extension): ${entry.name}`)
                        }
                    }
                } else if (entry.kind === 'directory') {
                    if (IGNORED_FOLDERS.includes(entry.name)) {
                        if (depth === 0) console.log(`Ignoring folder: ${entry.name}`)
                        continue
                    }

                    // Yield the directory itself so we can build the tree
                    yield {
                        id: entryPath,
                        name: entry.name,
                        path: entryPath,
                        kind: 'directory',
                        handle: entry
                    }

                    if (entry.name.includes('Haruhina') || path.includes('Haruhina')) {
                        console.log(`[Debug-Haruhina] Entering directory: ${entryPath}`)
                    }

                    yield* scanDirectoryGenerator(entry, entryPath, depth + 1)
                }
            }

            if (depth === 0) {
                console.log(`Top-level scan complete. Found ${entryCount} entries.`)
            }
        } catch (err) {
            console.error(`Error scanning directory at path "${path}":`, err)
            throw err
        }
    }

    const scan = useCallback(async (handle) => {
        console.log('=== Starting scan ===')
        console.log('Handle:', handle.name, handle.kind)

        setIsScanning(true)
        abortScan.current = false
        setFiles([])
        setProjectFiles([])
        setFolders([])

        const allFiles = []
        const allFolders = []
        let batchFiles = []
        const BATCH_SIZE = 50 // Update UI every 50 files
        let lastUpdate = Date.now()

        try {
            console.log('Starting directory scan generator...')
            let fileCount = 0
            let skippedCount = 0
            const skippedExtensions = new Set()

            for await (const entry of scanDirectoryGenerator(handle)) {
                if (entry.kind === 'directory') {
                    allFolders.push(entry)
                    // We don't batch update folders for now to keep it simple, 
                    // or we could if the tree is huge. Let's just collect them.
                } else {
                    fileCount++
                    if (fileCount <= 5) {
                        console.log(`Found file #${fileCount}:`, entry.name, entry.type)
                    }

                    allFiles.push(entry)
                    batchFiles.push(entry)
                }

                // Update state periodically to show progress
                const now = Date.now()
                if (batchFiles.length >= BATCH_SIZE || now - lastUpdate > 100) { // Every 50 items or 100ms
                    console.log(`Batch update: ${allFiles.length} files found so far`)
                    setFiles(prev => [...prev, ...batchFiles])
                    setProjectFiles(prev => [...prev, ...batchFiles])
                    // Also update folders incrementally if we want the tree to grow live
                    // But for now, let's just update files live. 
                    // Actually, let's update folders too so the tree appears.
                    if (allFolders.length > 0) {
                        setFolders(prev => {
                            // This is a bit inefficient (creating new array from allFolders every time)
                            // but correct since allFolders grows. 
                            // Better: just set it to the current allFolders snapshot
                            return [...allFolders]
                        })
                    }

                    batchFiles = []
                    lastUpdate = now
                    // Allow UI to breathe
                    await new Promise(resolve => setTimeout(resolve, 0))
                }
            }

            // Flush remaining
            if (batchFiles.length > 0) {
                setFiles(prev => [...prev, ...batchFiles])
                setProjectFiles(prev => [...prev, ...batchFiles])
            }
            // Final folder update
            setFolders([...allFolders])

            const haruhinaFiles = allFiles.filter(f => f.path.includes('Haruhina'))
            console.log(`[Debug] Scan complete.`)
            console.log(`[Debug] Total files found: ${allFiles.length}`)
            console.log(`[Debug] Total folders found: ${allFolders.length}`)
            console.log(`[Debug] Files containing 'Haruhina': ${haruhinaFiles.length}`)
            if (haruhinaFiles.length > 0) {
                console.log(`[Debug] First 5 Haruhina files:`, haruhinaFiles.slice(0, 5).map(f => f.path))
            }

            return { files: allFiles, folders: allFolders }
        } catch (err) {
            console.error("Scan failed:", err)
            console.error("Error stack:", err.stack)
            return { files: [], folders: [] }
        } finally {
            setIsScanning(false)
        }
    }, [])

    const stopScan = useCallback(() => {
        if (isScanning) {
            abortScan.current = true
            setIsScanning(false)
        }
    }, [isScanning])

    const refreshFolder = useCallback(async (folderPath) => {
        const folder = folders.find(f => f.path === folderPath)
        if (!folder || !folder.handle) {
            console.error("Folder handle not found for:", folderPath)
            return
        }

        console.log(`Refreshing folder: ${folderPath}`)

        // 1. Remove existing files in this folder from state to avoid duplicates
        // We use a functional update to ensure we have the latest state
        // Note: This removes files in subfolders too, which is what we want if we are rescanning recursively.
        setFiles(prev => prev.filter(f => !f.path.startsWith(folderPath + '/')))
        setProjectFiles(prev => prev.filter(f => !f.path.startsWith(folderPath + '/')))

        const newFiles = []
        const newFolders = []

        try {
            // Reuse scanDirectoryGenerator but start from this folder
            // We pass the folderPath as the 'path' argument so yielded paths are correct
            for await (const entry of scanDirectoryGenerator(folder.handle, folderPath)) {
                if (entry.kind === 'file') {
                    newFiles.push(entry)
                } else if (entry.kind === 'directory') {
                    newFolders.push(entry)
                }
            }

            // 2. Add new files and folders
            if (newFiles.length > 0) {
                console.log(`Refresh found ${newFiles.length} files`)
                setFiles(prev => [...prev, ...newFiles])
                setProjectFiles(prev => [...prev, ...newFiles])
            } else {
                console.log("Refresh found 0 files")
            }

            if (newFolders.length > 0) {
                // Update folders if we found new subfolders
                // We need to be careful not to duplicate existing folders in the 'folders' state
                setFolders(prev => {
                    const existingPaths = new Set(prev.map(f => f.path))
                    const uniqueNewFolders = newFolders.filter(f => !existingPaths.has(f.path))
                    if (uniqueNewFolders.length > 0) {
                        return [...prev, ...uniqueNewFolders]
                    }
                    return prev
                })
            }

        } catch (err) {
            console.error("Error refreshing folder:", err)
        }
    }, [folders, scanDirectoryGenerator]) // scanDirectoryGenerator is stable (generator) but we need to make sure it's accessible

    return {
        files,
        setFiles,
        projectFiles,
        setProjectFiles,
        folders,
        setFolders,
        isScanning,
        setIsScanning,
        rootHandle,
        setRootHandle,
        scanDirectory: scan,
        stopScan,
        refreshFolder
    }
}
