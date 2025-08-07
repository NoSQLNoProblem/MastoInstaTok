"use client";

import type React from "react";

import { useState, useRef, use, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";

import Navigation from "@/components/Navigation";
import styles from "./create.module.css";
import { apiService } from "@/services/apiService";
import { useAuth } from "@/contexts/AuthContext";

export default function CreatePage() {
  const [media, setMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, isLoading, router]);

  // Maximum file size for uploads
  // will need to adjust for videos
  const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/x-m4v"];
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        alert("File size must be 20MB or less.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)){
        alert("Invalid file type. Please select a JPEG, PNG, GIF, or MP4 file.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setFileType(file.type);
      setMediaType(file.type.startsWith("video") ? "video" : "image");
      const reader = new FileReader();
      reader.onload = (e) => {
        setMedia(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!media || !caption.trim() || !fileType) return;

    setIsUploading(true);

    console.log(mediaType);
    try{
      // Remove data URL prefix before sending
      const base64Data = media.split(',')[1];
      await apiService.post("/platform/users/me/posts", {
        caption,
        data: base64Data,
        fileType,
      });
      router.push("/feed");
    } catch (error) {
      alert("Failed to upload post. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const removeMedia = () => {
    setMedia(null);
    setMediaType(null);
    setFileType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={styles.container}>
      <Navigation />

      <main className={styles.main}>
        <div className={styles.createForm}>
          <h1 className={styles.title}>Create New Post</h1>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.imageSection}>
              {!media ? (
                <div className={styles.uploadArea}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_FILE_TYPES.join(",")}
                    onChange={handleMediaUpload}
                    className={styles.fileInput}
                    id="media-upload"
                  />
                  <label htmlFor="media-upload" className={styles.uploadLabel}>
                    <div className={styles.uploadIcon}>📷🎬</div>
                    <p>Click to upload an image or video</p>
                    <p className={styles.uploadHint}>
                      JPG, PNG, MP4 up to 15MB
                    </p>
                  </label>
                </div>
              ) : (
                <div className={styles.imagePreview}>
                  {mediaType === "image" ? (
                    <img
                      src={media}
                      alt="Preview"
                      className={styles.previewImage}
                    />
                  ) : (
                    <video
                      src={media}
                      controls
                      className={styles.previewImage}
                    />
                  )}
                  <button
                    type="button"
                    onClick={removeMedia}
                    className={styles.removeButton}
                  >
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

            <button
              type="submit"
              disabled={!media || !caption.trim() || isUploading}
              className={styles.submitButton}
            >
              {isUploading ? "Posting..." : "Share Post"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
