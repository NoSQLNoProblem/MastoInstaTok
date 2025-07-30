"use client"

import { useState } from "react"
import styles from "./Post.module.css"

// 1. Updated interface to match the backend response
interface PostProps {
  post: {
    id: string
    username: string
    imageURL: string
    caption: string
    likes: number
    isLiked: boolean
    timestamp: string 
    avatar?: string
  }
  onLike: (postId: string) => void
}

export default function Post({ post, onLike }: PostProps) {
  const [imageLoaded, setImageLoaded] = useState(false)

  const formatTimeAgo = (timestamp: string) => {
    const now = Date.now()
    const postDate = new Date(timestamp).getTime()
    const diff = now - postDate
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ago`
    } else if (hours > 0) {
      return `${hours}h ago`
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      if (minutes > 0) {
        return `${minutes}m ago`;
      }
      return "Just now"
    }
  }

  return (
    <article className={styles.post}>
      <header className={styles.header}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            <img
              src={post.avatar || `/placeholder-user.jpg`}
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
          src={post.imageURL || "/placeholder.jpg"}
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