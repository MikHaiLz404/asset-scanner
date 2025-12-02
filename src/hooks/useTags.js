import { useState, useCallback, useEffect, useMemo } from 'react'
import { getAllTags } from '../db'

export function useTags() {
    const [allTags, setAllTags] = useState([])

    const loadTags = useCallback(async () => {
        const tags = await getAllTags()
        setAllTags(tags)
    }, [])

    useEffect(() => {
        loadTags()
    }, [])

    // Extract unique tags from allTags for the dropdown
    const uniqueTags = useMemo(() => {
        const tags = new Set()
        allTags.forEach(item => item.tags.forEach(t => tags.add(t)))
        return Array.from(tags).sort()
    }, [allTags])

    return { allTags, loadTags, uniqueTags }
}
