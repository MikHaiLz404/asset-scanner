import { openDB } from 'idb'

const DB_NAME = 'asset-scanner-db'
const RECENT_STORE = 'recent-folders'
const BOOKMARK_STORE = 'bookmarked-folders'
const TAGS_STORE = 'asset-tags'
const RECENT_FILES_STORE = 'recent-files'
const FOLDER_BOOKMARKS_STORE = 'folder-bookmarks'

export const initDB = async () => {
    return openDB(DB_NAME, 5, { // Increment version
        upgrade(db) {
            if (!db.objectStoreNames.contains(RECENT_STORE)) {
                db.createObjectStore(RECENT_STORE, { keyPath: 'name' })
            }
            if (!db.objectStoreNames.contains(BOOKMARK_STORE)) {
                db.createObjectStore(BOOKMARK_STORE, { keyPath: 'name' })
            }
            if (!db.objectStoreNames.contains(TAGS_STORE)) {
                db.createObjectStore(TAGS_STORE, { keyPath: 'path' })
            }
            if (!db.objectStoreNames.contains(RECENT_FILES_STORE)) {
                db.createObjectStore(RECENT_FILES_STORE, { keyPath: 'path' })
            }
            if (!db.objectStoreNames.contains(FOLDER_BOOKMARKS_STORE)) {
                db.createObjectStore(FOLDER_BOOKMARKS_STORE, { keyPath: 'id' }) // Composite key: rootName + path
            }
        },
    })
}

export const saveFolderHandle = async (handle) => {
    const db = await initDB()
    await db.put(RECENT_STORE, {
        name: handle.name,
        handle: handle,
        lastOpened: new Date().getTime()
    })
}

export const getRecentFolders = async () => {
    const db = await initDB()
    const folders = await db.getAll(RECENT_STORE)
    return folders.sort((a, b) => b.lastOpened - a.lastOpened)
}

// Recent Files Functions
export const saveRecentFile = async (file) => {
    const db = await initDB()
    await db.put(RECENT_FILES_STORE, {
        path: file.path,
        name: file.name,
        type: file.type,
        handle: file.handle,
        lastOpened: new Date().getTime()
    })

    // Limit to 50 items
    const all = await db.getAll(RECENT_FILES_STORE)
    if (all.length > 50) {
        all.sort((a, b) => a.lastOpened - b.lastOpened) // Oldest first
        const toDelete = all.slice(0, all.length - 50)
        const tx = db.transaction(RECENT_FILES_STORE, 'readwrite')
        const store = tx.objectStore(RECENT_FILES_STORE)

        // Use Promise.all to avoid transaction timeout
        await Promise.all(toDelete.map(item => store.delete(item.path)))
        await tx.done
    }
}

export const getRecentFiles = async () => {
    const db = await initDB()
    const files = await db.getAll(RECENT_FILES_STORE)
    return files.sort((a, b) => b.lastOpened - a.lastOpened)
}

// Folder Bookmark Functions (Deep Links)
export const toggleFolderBookmark = async (rootName, path) => {
    const db = await initDB()
    const tx = db.transaction(FOLDER_BOOKMARKS_STORE, 'readwrite')
    const store = tx.objectStore(FOLDER_BOOKMARKS_STORE)
    const id = `${rootName}::${path}`

    const existing = await store.get(id)
    if (existing) {
        await store.delete(id)
        await tx.done
        return false // Removed
    } else {
        await store.put({
            id,
            rootName,
            path,
            name: path.split('/').pop() || rootName,
            addedAt: new Date().getTime()
        })
        await tx.done
        return true // Added
    }
}

export const getFolderBookmarks = async (rootName) => {
    const db = await initDB()
    const all = await db.getAll(FOLDER_BOOKMARKS_STORE)
    return all.filter(item => item.rootName === rootName).sort((a, b) => b.addedAt - a.addedAt)
}

export const isFolderBookmarked = async (rootName, path) => {
    const db = await initDB()
    const id = `${rootName}::${path}`
    const item = await db.get(FOLDER_BOOKMARKS_STORE, id)
    return !!item
}

// Global Project Bookmarks (Legacy/Project Switcher)
export const toggleBookmark = async (handle) => {
    const db = await initDB()
    const tx = db.transaction(BOOKMARK_STORE, 'readwrite')
    const store = tx.objectStore(BOOKMARK_STORE)

    // WARN: This uses folder name as key. Collisions possible for same-named folders.
    // Ideally we should use a unique ID for the project, but FileSystemHandle doesn't provide one.
    const existing = await store.get(handle.name)
    if (existing) {
        await store.delete(handle.name)
        await tx.done
        return false // Removed
    } else {
        await store.put({
            name: handle.name,
            handle: handle,
            addedAt: new Date().getTime()
        })
        await tx.done
        return true // Added
    }
}

export const getBookmarks = async () => {
    const db = await initDB()
    return await db.getAll(BOOKMARK_STORE)
}

export const isBookmarked = async (name) => {
    const db = await initDB()
    const item = await db.get(BOOKMARK_STORE, name)
    return !!item
}

// Tag Functions
export const addTag = async (file, tag) => {
    const db = await initDB()
    const tx = db.transaction(TAGS_STORE, 'readwrite')
    const store = tx.objectStore(TAGS_STORE)

    // file can be just path string (legacy) or object {path, handle, ...}
    // We want to ensure we store the handle if available
    const path = file.path || file

    // Validate path is not empty
    if (!path || typeof path !== 'string' || path.trim() === '') {
        console.error('Invalid path provided to addTag:', file)
        await tx.done
        return []
    }

    const item = await store.get(path) || { path, tags: [] }

    // Update handle if provided and missing
    if (file.handle && !item.handle) {
        item.handle = file.handle
        item.name = file.name
        item.type = file.type
    }

    if (!item.tags.includes(tag)) {
        item.tags.push(tag)
        await store.put(item)
    } else if (file.handle && !item.handle) {
        // Just updating handle
        await store.put(item)
    }

    await tx.done
    return item.tags
}

export const removeTag = async (path, tag) => {
    const db = await initDB()
    const tx = db.transaction(TAGS_STORE, 'readwrite')
    const store = tx.objectStore(TAGS_STORE)

    const item = await store.get(path)
    if (item) {
        item.tags = item.tags.filter(t => t !== tag)
        if (item.tags.length === 0) {
            await store.delete(path)
        } else {
            await store.put(item)
        }
        await tx.done
        return item.tags
    }
    return []
}

export const getTagsForFile = async (path) => {
    const db = await initDB()
    const item = await db.get(TAGS_STORE, path)
    return item ? item.tags : []
}

export const getAllTags = async () => {
    const db = await initDB()
    return await db.getAll(TAGS_STORE)
}
