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
                                handle: entry,
                                status: 'accepted'
                            }
                        } else {
                            // Yield skipped file so we can count it
                            yield {
                                id: entryPath,
                                name: entry.name,
                                path: entryPath,
                                kind: entry.kind,
                                type: ext,
                                handle: entry,
                                status: 'skipped'
                            }
                        }
                    } else {
                        // No extension
                        yield {
                            id: entryPath,
                            name: entry.name,
                            path: entryPath,
                            kind: entry.kind,
                            type: 'unknown',
                            handle: entry,
                            status: 'skipped'
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

    const [totalScanned, setTotalScanned] = useState(0) // Total files encountered

    const scan = useCallback(async (handle) => {
        console.log('=== Starting scan ===')
        console.log('Handle:', handle.name, handle.kind)

        setIsScanning(true)
        abortScan.current = false
        setFiles([])
        setProjectFiles([])
        setFolders([])
        setTotalScanned(0)

        const allAcceptedFiles = []
        const allAcceptedFolders = []
        let batchAcceptedFiles = []
        const BATCH_SIZE = 500 // Update UI every 500 files to reduce overhead
        let lastUpdate = Date.now()

        try {
            console.log('Starting directory scan generator...')
            let acceptedFileCount = 0
            let totalEntriesScanned = 0 // Track all files and directories seen by the generator

            for await (const entry of scanDirectoryGenerator(handle)) {
                totalEntriesScanned++

                if (entry.kind === 'directory') {
                    if (IGNORED_FOLDERS.includes(entry.name)) {
                        // console.log(`Ignoring folder: ${entry.name}`)
                        continue // Skip this directory and its contents
                    }
                    allAcceptedFolders.push(entry)
                } else { // entry.kind === 'file'
                    // Robust extension extraction: handle multiple dots, case, and whitespace
                    if (entry.status === 'accepted') {
                        acceptedFileCount++
                        // Log less frequently
                        if (acceptedFileCount % 1000 === 0) {
                            console.log(`Found accepted file #${acceptedFileCount}:`, entry.name)
                        }

                        allAcceptedFiles.push(entry)
                        batchAcceptedFiles.push(entry)
                    } else {
                        // console.log(`Skipped file (unallowed extension): ${entry.name} (ext: ${ext})`)
                    }
                }

                // Update state periodically to show progress
                const now = Date.now()
                // Update if batch is full OR if 200ms has passed (less frequent updates = faster scan)
                if (batchAcceptedFiles.length >= BATCH_SIZE || now - lastUpdate > 200) {
                    console.log(`Batch update: ${allAcceptedFiles.length} accepted files found so far, ${totalEntriesScanned} total entries scanned.`)
                    setFiles(prev => [...prev, ...batchAcceptedFiles])
                    setProjectFiles(prev => [...prev, ...batchAcceptedFiles])
                    setTotalScanned(totalEntriesScanned) // Update total scanned entries

                    if (allAcceptedFolders.length > 0) {
                        setFolders(prev => {
                            // Optimization: Only append new folders if we really need to.
                            // For now, just replacing with current list is safest but maybe slow if huge.
                            // Let's stick to the previous safe logic but maybe optimize later if needed.
                            return [...allAcceptedFolders]
                        })
                    }

                    batchAcceptedFiles = []
                    lastUpdate = now
                    // Allow UI to breathe, but use a slightly longer timeout to ensure browser handles events
                    // In background tabs, this might still be throttled, but processing 500 items per tick helps.
                    await new Promise(resolve => setTimeout(resolve, 0))
                }
            }

            // Flush remaining
            if (batchAcceptedFiles.length > 0) {
                setFiles(prev => [...prev, ...batchAcceptedFiles])
                setProjectFiles(prev => [...prev, ...batchAcceptedFiles])
            }
            // Final folder update
            setFolders([...allAcceptedFolders])
            setTotalScanned(totalEntriesScanned) // Final update for total scanned

            const haruhinaFiles = allAcceptedFiles.filter(f => f.path.includes('Haruhina'))
            console.log(`[Debug] Scan complete.`)
            console.log(`[Debug] Total entries scanned (files+folders): ${totalEntriesScanned}`)
            console.log(`[Debug] Total accepted files found: ${allAcceptedFiles.length}`)
            console.log(`[Debug] Total accepted folders found: ${allAcceptedFolders.length}`)
            console.log(`[Debug] Files containing 'Haruhina': ${haruhinaFiles.length}`)
            if (haruhinaFiles.length > 0) {
                console.log(`[Debug] First 5 Haruhina files:`, haruhinaFiles.slice(0, 5).map(f => f.path))
            }

            return { files: allAcceptedFiles, folders: allAcceptedFolders }
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
                    if (entry.status === 'accepted') {
                        newFiles.push(entry)
                    }
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
        refreshFolder,
        totalScanned
    }
}
