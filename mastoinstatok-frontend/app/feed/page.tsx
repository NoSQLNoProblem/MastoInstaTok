"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Post from "@/components/Post";
import styles from "./feed.module.css";
import { apiService } from "@/services/apiService";
import { usePagination } from "@/hooks/usePagination";
import { PostData } from "@/types/post";
import { useAuth } from "@/contexts/AuthContext";
const PAGE_SIZE = 5;

export async function fetchPostsApi(cursor: number) {
   // THIS IS FOR TESTING VIA MOCKS
        //==========================================
        // const response = await fetch(
        //   `/api/feed?startIndex=${offset}&pageSize=${PAGE_SIZE}`,
        //   {
        //     credentials: "include",
        //   }
        // );
        // const data = await response.json();
        //===========================================

  const endpoint = cursor === 0 ? `/platform/users/me/feed` : `/platform/users/me/feed?cursor=${cursor}`;
  const data = await apiService.get(endpoint);

  return { items: data.posts, nextOffset: data.nextCursor };
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
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    fetchNext();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, isLoading, router]);

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

  const { user } = useAuth();
  const currentUserId = user?.fullHandle;

const handleLike = async (postId: string) => {
  try {
    const response = await apiService.post(`/likes/toggle`, { postId });
    const { action } = response; 

    setPosts((prev) =>
      prev.map((post: PostData) => {
        if (post.id === postId) {
          let newLikedBy: string[] = [...(post.likedBy || [])];

          if (action === "liked") {
            if (!newLikedBy.includes(currentUserId!)) {
              newLikedBy.push(currentUserId!);
            }
          } else {
            newLikedBy = newLikedBy.filter((id) => id !== currentUserId);
          }

          return {
            ...post,
            likedBy: newLikedBy, 

          };
        }
        return post; 
      })
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

    if (!loading && posts.length === 0 && offset === -1) {
      return (
        <div className={styles.endMessage}>
          <h2>Welcome to your feed!</h2>
          <p>It's looking a little empty here. Find some people to follow to see their posts.</p>
          <button onClick={() => router.push('/search')} className={styles.tryAgainButton}>
            Find People
          </button>
        </div>
      )
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
