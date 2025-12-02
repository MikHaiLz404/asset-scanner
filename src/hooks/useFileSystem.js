import { useState, useCallback, useRef } from 'react'
import { ALLOWED_EXTENSIONS, IMAGE_EXTENSIONS, IGNORED_FOLDERS } from '../utils/constants'

export function useFileSystem() {
    const [files, setFiles] = useState([]) // Displayed files (Grid)
    const [projectFiles, setProjectFiles] = useState([]) // All project files (Tree)
    const [isScanning, setIsScanning] = useState(false)
    const [rootHandle, setRootHandle] = useState(null)

    // Use a ref to allow cancelling the scan if needed (not implemented yet, but good practice)
    const abortScan = useRef(false)

    // Generator function to yield files one by one (or in chunks)
    async function* scanDirectoryGenerator(dirHandle, path = '') {
        for await (const entry of dirHandle.values()) {
            if (abortScan.current) break

            const entryPath = path ? `${path}/${entry.name}` : entry.name

            if (entry.kind === 'file') {
                // Robust extension extraction: handle multiple dots, case, and whitespace
                const parts = entry.name.split('.')
                if (parts.length > 1) {
                    const ext = '.' + parts.pop().toLowerCase().trim()
                    if (ALLOWED_EXTENSIONS.includes(ext)) {
                        yield {
                            id: entryPath,
                            name: entry.name,
                            path: entryPath,
                            kind: entry.kind,
                            type: ext,
                            handle: entry
                        }
                    }
                }
            } else if (entry.kind === 'directory') {
                if (IGNORED_FOLDERS.includes(entry.name)) continue
                yield* scanDirectoryGenerator(entry, entryPath)
            }
        }
    }

    const scan = useCallback(async (handle) => {
        setIsScanning(true)
        abortScan.current = false
        setFiles([])
        setProjectFiles([])

        const allFiles = []
        let batch = []
        const BATCH_SIZE = 50 // Update UI every 50 files
        let lastUpdate = Date.now()

        try {
            for await (const file of scanDirectoryGenerator(handle)) {
                allFiles.push(file)
                batch.push(file)

                // Update state periodically to show progress
                const now = Date.now()
                if (batch.length >= BATCH_SIZE || now - lastUpdate > 100) { // Every 50 items or 100ms
                    setFiles(prev => [...prev, ...batch])
                    setProjectFiles(prev => [...prev, ...batch])
                    batch = []
                    lastUpdate = now
                    // Allow UI to breathe
                    await new Promise(resolve => setTimeout(resolve, 0))
                }
            }

            // Flush remaining
            if (batch.length > 0) {
                setFiles(prev => [...prev, ...batch])
                setProjectFiles(prev => [...prev, ...batch])
            }

            return allFiles
        } catch (err) {
            console.error("Scan failed:", err)
            return []
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

    return {
        files,
        setFiles,
        projectFiles,
        setProjectFiles,
        isScanning,
        setIsScanning,
        rootHandle,
        setRootHandle,
        scanDirectory: scan,
        stopScan
    }
}
