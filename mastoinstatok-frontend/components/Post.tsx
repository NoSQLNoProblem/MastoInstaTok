"use client"

import { useEffect, useRef, useState } from "react"
import styles from "./Post.module.css"
import { PostProps } from "@/types/post"

// 1. Updated interface to match the backend response

export default function Post({ post, onLike }: PostProps) {
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null); // <-- Create a ref for the video element

  useEffect(() => {
    //
    // Set up the Intersection Observer to pause the video when it's not visible
    //
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Video is in view, play it
          videoRef.current!.currentTime = 0;
          videoRef.current?.play();
        } else {
          // Video is out of view, pause it
          videoRef.current?.pause();
        }
      },
      {
        // Trigger the callback when 50% of the video is visible
        threshold: 0.9,
      }
    );

    const currentVideo = videoRef.current;
    if (currentVideo) {
      observer.observe(currentVideo);
    }

    // Cleanup function to disconnect the observer when the component unmounts
    return () => {
      if (currentVideo) {
        observer.unobserve(currentVideo);
      }
    };
  }, []);

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

  const renderMedia = () => {
    if (post.mediaType === 'video') {
      return (
        <video
          ref={videoRef}
          src={post.mediaURL}
          className={`${styles.postMedia} ${mediaLoaded ? styles.loaded : ""}`}
          onLoadedData={() => setMediaLoaded(true)}
          controls 
          playsInline 
          loop
          muted 
        />
      );
    }

    return (
      <img
        src={post.mediaURL || "/placeholder.jpg"}
        alt="Post content"
        className={`${styles.postMedia} ${mediaLoaded ? styles.loaded : ""}`}
        onLoad={() => setMediaLoaded(true)}
      />
    );
  };

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
            <h3 className={styles.userHandle}>{post.userHandle}</h3>
            <span className={styles.timestamp}>{formatTimeAgo(post.timestamp)}</span>
          </div>
        </div>
      </header>

      <div className={styles.mediaContainer}>
        {!mediaLoaded && (
          <div className={styles.mediaPlaceholder}>
            <div className={styles.spinner}></div>
          </div>
        )}
        {renderMedia()}
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