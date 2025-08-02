"use client";

import { useState, useEffect, useCallback, useRef } from "react"; // 👈 1. Import useRef
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Post from "@/components/Post";
import styles from "./feed.module.css";
import { apiService } from "@/services/apiService";
import { usePagination } from "@/hooks/usePagination";

export interface PostData {
  id: string;
  username: string;
  avatar?: string;
  imageURL: string;
  caption: string;
  likes: number;
  isLiked: boolean;
  timestamp: string;
}

const PAGE_SIZE = 5;

export async function fetchPostsApi(offset: number) {
   // THIS IS FOR TESTING VIA MOCKS
        //==========================================
        const response = await fetch(
          `/api/feed?startIndex=${offset}&pageSize=${PAGE_SIZE}`,
          {
            credentials: "include",
          }
        );
        const data = await response.json();
        //===========================================

        // const data = await apiService.get(
        //   `/feed?startIndex=${offset}&pageSize=${PAGE_SIZE}`
        // );

  return { items: data.posts, nextOffset: data.nextOffset };
}


export default function FeedPage() {
    const {
    items: posts,
    setItems: setPosts,
    loading,
    error, 
    offset,
    fetchNext,
    reset,
  } = usePagination<PostData>(fetchPostsApi);

  useEffect(() => {
    fetchNext();
  }, [fetchNext]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 1000 &&
        offset !== -1
      ) {
        fetchNext();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [offset, fetchNext]);

  const handleLike = async (postId: string) => {
    try {
      // Uncomment this line when using the real API
      // await apiService.post(`api//feed/like?postId=${postId}`, {});

      // Optimistically update the post's like status
      setPosts((prev) =>
        prev.map((post : PostData) =>
          post.id === postId
            ? {
                ...post,
                isLiked: !post.isLiked,
                likes: post.isLiked ? post.likes - 1 : post.likes + 1,
              }
            : post
        )
      );
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleTryAgain = () => {
    reset();
    fetchNext();
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
        {offset === -1 && !loading && posts.length > 0 && (
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
