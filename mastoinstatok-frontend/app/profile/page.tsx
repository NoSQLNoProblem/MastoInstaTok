"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/Navigation"
import styles from "./profile.module.css"
import { UserPost, UserProfile } from "@/types/profile"

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<UserPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<UserPost | null>(null)
  const router = useRouter()

  // Check authentication and get username
  useEffect(() => {
    const authToken = document.cookie.includes("auth-token=authenticated")
    if (!authToken) {
      router.push("/auth")
      return
    }

    // Get username from cookie
    const usernameCookie = document.cookie.split("; ").find((row) => row.startsWith("username="))
    const username = usernameCookie ? usernameCookie.split("=")[1] : "user"

    // Generate mock profile data
    const mockProfile: UserProfile = {
      username: username,
      fullName: `${username.charAt(0).toUpperCase() + username.slice(1)} Smith`,
      bio: "📸 Photography enthusiast | 🌍 Travel lover | ✨ Living life to the fullest",
      posts: 24,
      followers: 1250,
      following: 180,
      avatar: `/placeholder.svg?height=150&width=150&query=user avatar ${username}`,
    }

    // Generate mock posts
    const mockPosts: UserPost[] = []
    for (let i = 1; i <= 24; i++) {
      mockPosts.push({
        id: `post-${i}`,
        image: `/placeholder.svg?height=300&width=300&query=user post ${i}`,
        caption: `This is my post #${i}. Having a great time! #photography #life`,
        likes: Math.floor(Math.random() * 200) + 10,
        timestamp: Date.now() - i * 86400000, // Posts from different days
      })
    }

    setProfile(mockProfile)
    setPosts(mockPosts.sort((a, b) => b.timestamp - a.timestamp))
    setLoading(false)
  }, [router])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <Navigation />
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading profile...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className={styles.container}>
        <Navigation />
        <main className={styles.main}>
          <div className={styles.error}>
            <p>Profile not found</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Navigation />

      <main className={styles.main}>
        <div className={styles.profileContainer}>
          {/* Profile Header */}
          <header className={styles.profileHeader}>
            <div className={styles.avatarSection}>
              <div className={styles.avatar}>
                <img src={profile.avatar || "/placeholder.svg"} alt={profile.username} className={styles.avatarImage} />
              </div>
            </div>

            <div className={styles.profileInfo}>
              <div className={styles.usernameRow}>
                <h1 className={styles.username}>{profile.username}</h1>
                <button className={styles.editButton}>Edit Profile</button>
              </div>

              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>{profile.posts}</span>
                  <span className={styles.statLabel}>posts</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>{profile.followers.toLocaleString()}</span>
                  <span className={styles.statLabel}>followers</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>{profile.following}</span>
                  <span className={styles.statLabel}>following</span>
                </div>
              </div>

              <div className={styles.bio}>
                <p className={styles.fullName}>{profile.fullName}</p>
                <p className={styles.bioText}>{profile.bio}</p>
              </div>
            </div>
          </header>

          {/* Posts Grid */}
          <div className={styles.postsSection}>
            <div className={styles.postsHeader}>
              <h2 className={styles.postsTitle}>Posts</h2>
            </div>

            {posts.length === 0 ? (
              <div className={styles.noPosts}>
                <div className={styles.noPostsIcon}>📷</div>
                <h3>No posts yet</h3>
                <p>When you share photos, they'll appear on your profile.</p>
                <button onClick={() => router.push("/create")} className={styles.createFirstPost}>
                  Share your first photo
                </button>
              </div>
            ) : (
              <div className={styles.postsGrid}>
                {posts.map((post) => (
                  <div key={post.id} className={styles.postItem} onClick={() => setSelectedPost(post)}>
                    <img src={post.image || "/placeholder.svg"} alt="Post" className={styles.postImage} />
                    <div className={styles.postOverlay}>
                      <div className={styles.postStats}>
                        <span className={styles.postLikes}>❤️ {post.likes}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Post Modal */}
      {selectedPost && (
        <div className={styles.modal} onClick={() => setSelectedPost(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={() => setSelectedPost(null)}>
              ✕
            </button>
            <div className={styles.modalImage}>
              <img src={selectedPost.image || "/placeholder.svg"} alt="Post" />
            </div>
            <div className={styles.modalInfo}>
              <div className={styles.modalHeader}>
                <div className={styles.modalUser}>
                  <img
                    src={profile.avatar || "/placeholder.svg"}
                    alt={profile.username}
                    className={styles.modalAvatar}
                  />
                  <span className={styles.modalUsername}>{profile.username}</span>
                </div>
                <span className={styles.modalDate}>{formatDate(selectedPost.timestamp)}</span>
              </div>
              <div className={styles.modalCaption}>
                <p>{selectedPost.caption}</p>
              </div>
              <div className={styles.modalStats}>
                <span>❤️ {selectedPost.likes} likes</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
