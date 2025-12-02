import { useState, useCallback } from 'react'
import JSZip from 'jszip'

export function useSelection() {
    const [selectedFile, setSelectedFile] = useState(null)
    const [selectedFiles, setSelectedFiles] = useState(new Set()) // Set of file IDs (paths)
    const [isDownloading, setIsDownloading] = useState(false)

    const toggleSelection = useCallback((e, fileId) => {
        e.stopPropagation()
        setSelectedFiles(prev => {
            const newSelection = new Set(prev)
            if (newSelection.has(fileId)) {
                newSelection.delete(fileId)
            } else {
                newSelection.add(fileId)
            }
            return newSelection
        })
    }, [])

    const clearSelection = useCallback(() => {
        setSelectedFiles(new Set())
    }, [])

    const downloadBatch = useCallback(async (files, currentPath, rootName) => {
        if (selectedFiles.size === 0) return
        setIsDownloading(true)

        try {
            const zip = new JSZip()
            const filesToDownload = files.filter(f => selectedFiles.has(f.id))

            // Add files to zip
            for (const file of filesToDownload) {
                const fileData = await file.handle.getFile()
                // Use the full relative path in the zip to preserve structure!
                zip.file(file.path, fileData)
            }

            const content = await zip.generateAsync({ type: 'blob' })
            const url = URL.createObjectURL(content)

            // Determine filename: use current folder name, or root folder name
            const zipName = currentPath ? currentPath.split('/').pop() : rootName

            const a = document.createElement('a')
            a.href = url
            a.download = `${zipName}.zip`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

        } catch (err) {
            console.error('Batch download failed:', err)
            alert('Failed to create zip file.')
        } finally {
            setIsDownloading(false)
        }
    }, [selectedFiles])

    return {
        selectedFile,
        setSelectedFile,
        selectedFiles,
        setSelectedFiles,
        isDownloading,
        toggleSelection,
        clearSelection,
        downloadBatch
    }
}
