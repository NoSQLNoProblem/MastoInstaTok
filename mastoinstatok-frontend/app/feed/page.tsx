"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/Navigation"
import Post from "@/components/Post"
import styles from "./feed.module.css"

interface PostData {
  id: string
  username: string
  image: string
  caption: string
  likes: number
  isLiked: boolean
  timestamp: number
}

export default function FeedPage() {
  const [posts, setPosts] = useState<PostData[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const router = useRouter()

  // Check authentication
  useEffect(() => {
    const authToken = document.cookie.includes("auth-token=authenticated")
    if (!authToken) {
      router.push("/auth")
    }
  }, [router])

  // Generate mock posts
  const generateMockPosts = useCallback((pageNum: number): PostData[] => {
    const mockPosts: PostData[] = []
    const baseTime = Date.now()

    for (let i = 0; i < 5; i++) {
      const postId = `${pageNum}-${i}`
      mockPosts.push({
        id: postId,
        username: `user${Math.floor(Math.random() * 100)}`,
        image: `/placeholder.svg?height=400&width=400&query=social media post ${postId}`,
        caption: `This is a sample post caption for post ${postId}. #socialapp #photography`,
        likes: Math.floor(Math.random() * 100),
        isLiked: Math.random() > 0.5,
        timestamp: baseTime - (pageNum * 5 + i) * 3600000, // Posts ordered by timestamp
      })
    }

    return mockPosts.sort((a, b) => b.timestamp - a.timestamp)
  }, [])

  // Load initial posts
  useEffect(() => {
    const initialPosts = generateMockPosts(1)
    setPosts(initialPosts)
  }, [generateMockPosts])

  // Load more posts
  const loadMorePosts = useCallback(() => {
    if (loading || !hasMore) return

    setLoading(true)

    // Simulate API delay
    setTimeout(() => {
      const newPosts = generateMockPosts(page + 1)
      setPosts((prev) => [...prev, ...newPosts])
      setPage((prev) => prev + 1)
      setLoading(false)

      // Stop loading after 5 pages
      if (page >= 5) {
        setHasMore(false)
      }
    }, 1000)
  }, [loading, hasMore, page, generateMockPosts])

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        loadMorePosts()
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [loadMorePosts])

  const handleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post,
      ),
    )
  }

  return (
    <div className={styles.container}>
      <Navigation />

      <main className={styles.main}>
        <div className={styles.feed}>
          {posts.map((post) => (
            <Post key={post.id} post={post} onLike={handleLike} />
          ))}

          {loading && (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading more posts...</p>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className={styles.endMessage}>
              <p>You've reached the end!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
