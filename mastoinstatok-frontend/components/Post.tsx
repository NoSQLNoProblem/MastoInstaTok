"use client"

import { useEffect, useRef, useState } from "react"
import styles from "./Post.module.css"
import { PostProps } from "@/types/post"
import CommentModal from "./CommentModal";
import { useAuth } from "@/contexts/AuthContext";

// 1. Updated interface to match the backend response

export default function Post({ post, onLike }: PostProps) {
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const currentUserId = user?.fullHandle;
  const isLiked = post.likedBy?.includes(currentUserId!) || false
  const likeCount = post.likedBy?.length || 0;

  const isInternalUser = post.isInternalUser;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current!.currentTime = 0;
          videoRef.current?.play();
        } else {
          videoRef.current?.pause();
        }
      },
      {
        threshold: 0.9,
      }
    );

    const currentVideo = videoRef.current;
    if (currentVideo) {
      observer.observe(currentVideo);
    }

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
    <>
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
          {isInternalUser && (
            <button
              onClick={() => onLike(post.id)}
              className={`${styles.likeButton} ${isLiked ? styles.liked : ""}`}
              aria-label={isLiked ? "Unlike post" : "Like post"}
            >
              ❤️
            </button>
          )}
          <button
            onClick={() => setIsCommentModalOpen(true)}
            className={styles.commentButton}
            aria-label="View comments"
          >
            💬
          </button>
          {isInternalUser && (
            <span className={styles.likeCount}>
              {likeCount} {likeCount === 1 ? "like" : "likes"}
            </span>
          )}
        </div>

        <div className={styles.caption}>
          <span className={styles.captionUsername}>{post.username}</span>
          <span className={styles.captionText}>{post.caption}</span>
        </div>
      </article>
      {isCommentModalOpen && (
        <CommentModal
          postId={post.id}
          onClose={() => setIsCommentModalOpen(false)}
        />
      )}
    </>
  )
}