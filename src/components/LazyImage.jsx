import React, { useState, useEffect, useRef } from 'react'

export default function LazyImage({ file, alt, style }) {
    const [src, setSrc] = useState(null)
    const [isVisible, setIsVisible] = useState(false)
    const imgRef = useRef(null)

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                    observer.disconnect() // Stop observing once visible
                }
            })
        }, {
            rootMargin: '100px' // Load slightly before it comes into view
        })

        const img = imgRef.current
        if (img) {
            observer.observe(img)
        }

        return () => {
            if (img) observer.unobserve(img)
        }
    }, [])

    useEffect(() => {
        let objectUrl = null
        let isActive = true

        const loadPreview = async () => {
            if (!isVisible || !file.handle) return

            try {
                const fileData = await file.handle.getFile()
                if (isActive) {
                    objectUrl = URL.createObjectURL(fileData)
                    setSrc(objectUrl)
                }
            } catch {
                console.warn('Failed to load preview:', file.name)
            }
        }

        loadPreview()

        return () => {
            isActive = false
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl)
            }
        }
    }, [isVisible, file])

    return (
        <div ref={imgRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-tertiary)' }}>
            {src ? (
                <img src={src} alt={alt} style={style} />
            ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Loading...</div>
            )}
        </div>
    )
}
