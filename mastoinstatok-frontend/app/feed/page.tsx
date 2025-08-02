"use client";

import { useState, useEffect, useCallback, useRef } from "react"; // 👈 1. Import useRef
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Post from "@/components/Post";
import styles from "./feed.module.css";
import { apiService } from "@/services/apiService";
import { PostData } from "@/types/post";

const PAGE_SIZE = 5;

export default function FeedPage() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState<number>(0);
  const router = useRouter();

  const isLoadingRef = useRef(false);

  const fetchPosts = useCallback(
    async (offset: number) => {
      if (isLoadingRef.current || offset === -1) return;

      isLoadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        // THIS IS FOR TESTING VIA MOCKS
        // ==========================================
        // const response = await fetch(
        //   `/api/feed?startIndex=${offset}&pageSize=${PAGE_SIZE}`,
        //   {
        //     credentials: "include",
        //   }
        // );
        // const data = await response.json();
        // ===========================================

        const data = await apiService.get(
          `/feed?startIndex=${offset}&pageSize=${PAGE_SIZE}`
        );

        setPosts((prev) =>
          offset === 0 ? data.posts : [...prev, ...data.posts]
        );
        setNextOffset(data.nextOffset);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred."
        );
        setNextOffset(-1);
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    [router]
  );

  useEffect(() => {
    fetchPosts(0);
  }, [fetchPosts]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 1000 &&
        nextOffset !== -1
      ) {
        fetchPosts(nextOffset);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [nextOffset, fetchPosts]);

  const handleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
  };

  const handleTryAgain = () => {
    setError(null);
    setPosts([]);
    setNextOffset(0);
    fetchPosts(0);
  };

  const renderContent = () => {
    if (loading && posts.length === 0) {
      return (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading posts...</p>
        </div>
      );
    }

    if (error && posts.length === 0) {
      return (
        <div className={styles.endMessage}>
          <p>Oops! Something went wrong.</p>
          <p>{error}</p>
          <button onClick={handleTryAgain} className={styles.tryAgainButton}>
            Try Again
          </button>
        </div>
      );
    }

    return (
      <>
        {posts.map((post) => (
          <Post key={post.id} post={post} onLike={handleLike} />
        ))}
        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading more posts...</p>
          </div>
        )}
        {nextOffset === -1 && !loading && posts.length > 0 && (
          <div className={styles.endMessage}>
            <p>You've reached the end!</p>
          </div>
        )}
      </>
    );
  };

  return (
    <div className={styles.container}>
      <Navigation />
      <main className={styles.main}>
        <div className={styles.feed}>{renderContent()}</div>
      </main>
    </div>
  );
}
