"use client"

import { useEffect, useState } from "react"
import Navigation from "@/components/Navigation"
import UserCard from "@/components/UserCard"
import styles from "./search.module.css"
import { apiService } from "@/services/apiService"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Search } from "lucide-react"

interface User {
  actorId: string
  displayName: string
  fullHandle: string
  avatarURL: string | undefined
  bio: string
  email?: string
  followers: number
  isFollowing: boolean
  isFollowedBy: boolean
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)
    setUser(null)

    try {
      const handle = searchQuery.trim()
      const userData = await apiService.get(`/platform/users/${handle}`)

      const followers = await apiService.get(`/platform/users/${handle}/followers`)

      const followStatus = await apiService.get(`/platform/users/me/follows/${handle}`)

      const isFollowing = followStatus?.userFollowing?.follows ?? false

      const isFollowedBy = followStatus?.userFollowedBy?.follows ?? false

      setUser({
        ...userData,
        followers: followers.totalItems ?? 0,
        isFollowing: isFollowing,
        isFollowedBy: isFollowedBy,
      })

    } catch (err: any) {
      console.error(err)
      setError("No users found.")
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!user) return
    try {
      await apiService.post(`/platform/users/me/follows/${user.fullHandle}`)
      setUser((prev) =>
        prev ? { ...prev, isFollowing: true, followers: prev.followers + 1 } : null
      )
    } catch (err: any) {
      console.error(err)
      if (err.message?.includes("already")) {
        setError("You're already following this user.")
      } else {
        setError("An error occurred while trying to follow the user.")
      }
    }
  }

    const handleUnfollow = async () => {
    if (!user) return
    try {
      await apiService.delete(`/platform/users/me/follows/${user.fullHandle}`)
      setUser((prev) =>
        prev ? { ...prev, isFollowing: false, followers: Math.max(0, prev.followers - 1) } : null
      )
    } catch (err: any) {
      console.error(err)
      setError("An error occurred while trying to unfollow the user.")
    }
  }

  return (
    <div className={styles.container}>
      <Navigation />
      <main className={styles.main}>
        <div className={styles.searchContainer}>
          <h1 className={styles.title}>Search Users</h1>
          <form className={styles.searchBox} onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="@username@domain"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchIcon}>
              <Search color="grey"/>
            </button>
          </form>

          <div className={styles.results}>
            {loading && (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Searching...</p>
              </div>
            )}

            {!loading && error && (
              <div className={styles.noResults}>
                <p>{error}</p>
              </div>
            )}

            {!loading && user && (
              <div className={styles.userList}>
                <UserCard
                    user={{
                      id: user.actorId,
                      username: user.fullHandle,
                      fullName: user.displayName,
                      bio: user.bio,
                      avatarURL: user.avatarURL,
                      isFollowing: user.isFollowing,
                      isFollowedBy: user.isFollowedBy,
                      followers: user.followers,
                    }}
                    onFollow={() => handleFollow()}
                    onUnfollow={() => handleUnfollow()}
                  />
              </div>
            )}

            {!searchQuery && !user && (
              <div className={styles.placeholder}>
                <div className={styles.placeholderIcon}>👥</div>
                <p>Start typing to search for users</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
