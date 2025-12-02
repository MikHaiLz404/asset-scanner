import { useState, useCallback } from 'react'
import { MODEL_EXTENSIONS, IMAGE_EXTENSIONS, AUDIO_EXTENSIONS, VIDEO_EXTENSIONS } from '../utils/constants'

export function useNavigation() {
    const [currentPath, setCurrentPath] = useState('') // '' is root
    const [viewMode, setViewMode] = useState('folder') // 'folder', 'recent', 'collection', 'collections-overview'
    const [activeCollection, setActiveCollection] = useState(null)

    const [activeFilter, setActiveFilter] = useState('all') // 'all', 'model', 'image', 'audio', 'video'
    const [searchQuery, setSearchQuery] = useState('')
    const [searchType, setSearchType] = useState('file') // 'file' or 'folder'
    const [sortBy, setSortBy] = useState('name-asc') // 'name-asc', 'name-desc', 'type'
    const [selectedTag, setSelectedTag] = useState('')

    const getFilteredFiles = useCallback((files, allTags) => {
        let result = files

        // 0. Filter by Current Path (Folder Navigation)
        // ONLY apply this in 'folder' mode. In 'recent' or 'collection', we show everything.
        if (viewMode === 'folder') {
            if (searchQuery === '') {
                if (currentPath) {
                    result = result.filter(f => {
                        const relative = f.path.slice(currentPath.length + 1)
                        return f.path.startsWith(currentPath + '/') && !relative.includes('/')
                    })
                } else {
                    result = result.filter(f => !f.path.includes('/'))
                }
            }
        }

        // 1. Filter by Category
        if (activeFilter === 'model') result = result.filter(f => MODEL_EXTENSIONS.includes(f.type))
        else if (activeFilter === 'image') result = result.filter(f => IMAGE_EXTENSIONS.includes(f.type))
        else if (activeFilter === 'audio') result = result.filter(f => AUDIO_EXTENSIONS.includes(f.type))
        else if (activeFilter === 'video') result = result.filter(f => VIDEO_EXTENSIONS.includes(f.type))

        // 2. Filter by Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            // When searching, we might want to ignore folder structure and search EVERYTHING
            // But for now, let's keep it within the current view or maybe global?
            // Let's make search GLOBAL (override folder view) for better UX
            result = files.filter(f => f.name.toLowerCase().includes(query))

            // Re-apply category filter if searching
            if (activeFilter === 'model') result = result.filter(f => MODEL_EXTENSIONS.includes(f.type))
            else if (activeFilter === 'image') result = result.filter(f => IMAGE_EXTENSIONS.includes(f.type))
            else if (activeFilter === 'audio') result = result.filter(f => AUDIO_EXTENSIONS.includes(f.type))
            else if (activeFilter === 'video') result = result.filter(f => VIDEO_EXTENSIONS.includes(f.type))
        }

        // 3. Filter by Tag
        if (selectedTag) {
            const pathsWithTag = allTags
                .filter(item => item.tags.includes(selectedTag))
                .map(item => item.path)
            result = result.filter(f => pathsWithTag.includes(f.path))
        }

        // 4. Sort
        result.sort((a, b) => {
            if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
            if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
            if (sortBy === 'type') {
                const typeCompare = a.type.localeCompare(b.type)
                if (typeCompare !== 0) return typeCompare
                return a.name.localeCompare(b.name)
            }
            return 0
        })

        return result
    }, [activeFilter, searchQuery, sortBy, selectedTag, currentPath, viewMode])

    return {
        currentPath,
        setCurrentPath,
        viewMode,
        setViewMode,
        activeCollection,
        setActiveCollection,
        activeFilter,
        setActiveFilter,
        searchQuery,
        setSearchQuery,
        searchType,
        setSearchType,
        sortBy,
        setSortBy,
        selectedTag,
        setSelectedTag,
        getFilteredFiles
    }
}
