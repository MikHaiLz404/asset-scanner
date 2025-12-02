import { useState, useEffect, useCallback } from 'react'
import {
    getRecentFolders,
    getBookmarks,
    isBookmarked,
    toggleBookmark,
    getFolderBookmarks,
    isFolderBookmarked,
    toggleFolderBookmark
} from '../db'

export function useBookmarks() {
    const [recentFolders, setRecentFolders] = useState([])
    const [bookmarkedFolders, setBookmarkedFolders] = useState([]) // Project Bookmarks (Global)
    const [folderBookmarks, setFolderBookmarks] = useState([]) // Deep Links (Current Project)
    const [isCurrentBookmarked, setIsCurrentBookmarked] = useState(false)
    const [isCurrentPathBookmarked, setIsCurrentPathBookmarked] = useState(false)

    const loadFolders = useCallback(async () => {
        const recent = await getRecentFolders()
        setRecentFolders(recent)
        const bookmarks = await getBookmarks()
        setBookmarkedFolders(bookmarks)
    }, [])

    const loadFolderBookmarks = useCallback(async (rootName) => {
        const bookmarks = await getFolderBookmarks(rootName)
        setFolderBookmarks(bookmarks)
    }, [])

    const checkCurrentPathBookmark = useCallback(async (rootName, path) => {
        const status = await isFolderBookmarked(rootName, path)
        setIsCurrentPathBookmarked(status)
    }, [])

    const checkCurrentBookmark = useCallback(async (name) => {
        const status = await isBookmarked(name)
        setIsCurrentBookmarked(status)
    }, [])

    const handleToggleBookmark = useCallback(async (rootHandle) => {
        if (!rootHandle) return
        const newStatus = await toggleBookmark(rootHandle)
        setIsCurrentBookmarked(newStatus)
        await loadFolders()
    }, [loadFolders])

    const handleToggleFolderBookmark = useCallback(async (rootName, currentPath) => {
        if (!rootName) return
        const newStatus = await toggleFolderBookmark(rootName, currentPath)
        setIsCurrentPathBookmarked(newStatus)
        await loadFolderBookmarks(rootName)
    }, [loadFolderBookmarks])

    // Initial load
    useEffect(() => {
        loadFolders()
    }, [])

    return {
        recentFolders,
        bookmarkedFolders,
        folderBookmarks,
        isCurrentBookmarked,
        isCurrentPathBookmarked,
        loadFolders,
        loadFolderBookmarks,
        checkCurrentPathBookmark,
        checkCurrentBookmark,
        handleToggleBookmark,
        handleToggleFolderBookmark
    }
}
