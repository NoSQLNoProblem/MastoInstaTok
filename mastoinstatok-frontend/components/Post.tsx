"use client"

import { useState } from "react"
import styles from "./Post.module.css"

interface PostProps {
  post: {
    id: string
    username: string
    image: string
    caption: string
    likes: number
    isLiked: boolean
    timestamp: number
  }
  onLike: (postId: string) => void
}

export default function Post({ post, onLike }: PostProps) {
  const [imageLoaded, setImageLoaded] = useState(false)

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ago`
    } else if (hours > 0) {
      return `${hours}h ago`
    } else {
      return "Just now"
    }
  }

  return (
    <article className={styles.post}>
      <header className={styles.header}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            <img
              src={`/placeholder.svg?height=40&width=40&query=user avatar ${post.username}`}
              alt={post.username}
              className={styles.avatarImage}
            />
          </div>
          <div className={styles.userDetails}>
            <h3 className={styles.username}>{post.username}</h3>
            <span className={styles.timestamp}>{formatTimeAgo(post.timestamp)}</span>
          </div>
        </div>
      </header>

      <div className={styles.imageContainer}>
        {!imageLoaded && (
          <div className={styles.imagePlaceholder}>
            <div className={styles.spinner}></div>
          </div>
        )}
        <img
          src={post.image || "/placeholder.svg"}
          alt="Post content"
          className={`${styles.postImage} ${imageLoaded ? styles.loaded : ""}`}
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      <div className={styles.actions}>
        <button
          onClick={() => onLike(post.id)}
          className={`${styles.likeButton} ${post.isLiked ? styles.liked : ""}`}
          aria-label={post.isLiked ? "Unlike post" : "Like post"}
        >
          ❤️
        </button>
        <span className={styles.likeCount}>
          {post.likes} {post.likes === 1 ? "like" : "likes"}
        </span>
      </div>

      <div className={styles.caption}>
        <span className={styles.captionUsername}>{post.username}</span>
        <span className={styles.captionText}>{post.caption}</span>
      </div>
    </article>
  )
}
