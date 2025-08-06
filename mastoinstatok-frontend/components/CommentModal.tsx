"use client";

import { useState, useEffect, useCallback, useRef } from "react"; // Import useRef
import styles from "./Comments.module.css";
import { apiService } from "@/services/apiService";
import { Comment } from "@/types/comments";
import { useAuth } from "@/contexts/AuthContext";

interface CommentModalProps {
  postId: string;
  onClose: () => void;
}

export default function CommentModal({ postId, onClose }: CommentModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${scrollHeight}px`;
    }
  }, [newComment]);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      

      //==================================
      // const response = await fetch(`/api/posts/${postId}/comments`, {
      //   credentials: "include",
      // });
      // const data = await response.json();
      // setComments(data.comments || []);
      //===================================

      const response = await apiService.get(`/posts/${postId}/comments`);
      setComments(response.comments || []);
    } catch (err) {
      setError("Failed to load comments. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isPosting) return;

    setIsPosting(true);
    try {
      // =====================================
      // const response = await fetch(`/api/posts/${postId}/comments`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   credentials: "include",
      //   body: JSON.stringify({ content: newComment }),
      // });
      // const data = await response.json();
      // setComments((prev) => [data.comment, ...prev]);
      // setNewComment("");
      // =====================================

      const response = await apiService.post("/comments", {
        postId,
        content: newComment,
      });
      setComments((prev) => [response.comment, ...prev]);
      setNewComment("");
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setIsPosting(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const commentDate = new Date(timestamp).getTime();
    const diff = now - commentDate;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes > 0) return `${minutes}m`;
    return "Just now";
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Comments</h2>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        <div className={styles.commentsList}>
          {isLoading && (
            <p className={styles.loadingText}>Loading comments...</p>
          )}
          {error && <p className={styles.errorText}>{error}</p>}
          {!isLoading && !error && comments.length === 0 && (
            <p className={styles.loadingText}>No comments yet. Be the first!</p>
          )}
          {!isLoading &&
            !error &&
            comments.map((comment) => (
              <div key={comment._id} className={styles.commentItem}>
                <img
                  src={comment.avatarURL || "/placeholder-user.jpg"}
                  alt={comment.displayName}
                  className={styles.commentAvatar}
                />
                <p>
                  <span className={styles.commentDisplayName}>
                    {comment.displayName}
                  </span>
                  {comment.content}
                </p>
                <div className={styles.commentBody}>
                  <span className={styles.commentTimestamp}>
                    {formatTimeAgo(comment.createdAt)}
                  </span>
                </div>
              </div>
            ))}
        </div>

        <form className={styles.commentForm} onSubmit={handlePostComment}>
          <img
            src={user?.avatarURL || "/placeholder-user.jpg"}
            alt="Your avatar"
            className={styles.commentAvatar}
          />
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Erm.... actually ☝️🤓"
            className={styles.commentInput}
            rows={1}
            maxLength={255}
          />
          <button
            type="submit"
            className={styles.commentSubmitButton}
            disabled={isPosting || !newComment.trim()}
          >
            {isPosting ? "..." : "Post"}
          </button>
        </form>
        <p className={styles.characterCount}>{newComment.length}/255</p>
      </div>
    </div>
  );
}
