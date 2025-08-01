"use client"

import type React from "react"

import { useState, useRef, use, useEffect, useContext } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/Navigation"
import styles from "./create.module.css"

export default function CreatePage() {
  const [image, setImage] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!image || !caption.trim()) return

    setIsUploading(true)

    // Simulate upload delay
    setTimeout(() => {
      setIsUploading(false)
      router.push("/feed")
    }, 2000)
  }

  const removeImage = () => {
    setImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className={styles.container}>
      <Navigation />

      <main className={styles.main}>
        <div className={styles.createForm}>
          <h1 className={styles.title}>Create New Post</h1>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.imageSection}>
              {!image ? (
                <div className={styles.uploadArea}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className={styles.fileInput}
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className={styles.uploadLabel}>
                    <div className={styles.uploadIcon}>📷</div>
                    <p>Click to upload an image</p>
                    <p className={styles.uploadHint}>JPG, PNG, GIF up to 10MB</p>
                  </label>
                </div>
              ) : (
                <div className={styles.imagePreview}>
                  <img src={image || "/placeholder.svg"} alt="Preview" className={styles.previewImage} />
                  <button type="button" onClick={removeImage} className={styles.removeButton}>
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className={styles.captionSection}>
              <label htmlFor="caption" className={styles.captionLabel}>
                Caption
              </label>
              <textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className={styles.captionInput}
                rows={4}
                maxLength={500}
              />
              <div className={styles.characterCount}>{caption.length}/500</div>
            </div>

            <button type="submit" disabled={!image || !caption.trim() || isUploading} className={styles.submitButton}>
              {isUploading ? "Posting..." : "Share Post"}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
