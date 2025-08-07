"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/Navigation"
import UserCard from "@/components/UserCard"
import styles from "./following.module.css"

interface User {
  id: string
  username: string
  fullName: string
  avatar: string
  isFollowing: boolean
  followers: number
}

export default function FollowingPage() {
  const [following, setFollowing] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  useEffect(() => {
    // const authToken = document.cookie.includes("auth-token=authenticated")
    // if (!authToken) {
    //   router.push("/auth")
    //   return
    // }

    // Generate mock following data
    const generateMockFollowing = (): User[] => {
      const mockFollowing: User[] = []
      const followingData = [
        { username: "best_friend_jane", fullName: "Jane Smith" },
        { username: "college_buddy_mike", fullName: "Mike Johnson" },
        { username: "sister_emma", fullName: "Emma Wilson" },
        { username: "photo_master_alex", fullName: "Alex Chen" },
        { username: "landscape_lover", fullName: "Sarah Davis" },
        { username: "portrait_pro", fullName: "David Kim" },
        { username: "world_wanderer", fullName: "Lisa Garcia" },
        { username: "backpack_adventures", fullName: "Tom Rodriguez" },
        { username: "city_explorer", fullName: "Anna Martinez" },
        { username: "gym_motivation", fullName: "Chris Brown" },
        { username: "yoga_master", fullName: "Maya Patel" },
        { username: "running_coach", fullName: "Ryan Lee" },
        { username: "digital_artist", fullName: "Sophie Turner" },
        { username: "street_art_fan", fullName: "Mark Wilson" },
        { username: "abstract_creator", fullName: "Nina Anderson" },
        { username: "indie_musician", fullName: "Paul Thompson" },
        { username: "jazz_lover", fullName: "Zoe Clark" },
        { username: "guitar_hero", fullName: "Luke Miller" }
      ]

      followingData.forEach((user, index) => {
        mockFollowing.push({
          id: `following-${index + 1}`,
          username: user.username,
          fullName: user.fullName,
          avatar: `/placeholder.svg?height=60&width=60&query=user avatar ${user.username}`,
          isFollowing: true, // All are being followed
          followers: Math.floor(Math.random() * 5000) + 500,
        })
      })

      return mockFollowing.sort((a, b) => a.username.localeCompare(b.username))
    }

    // Simulate loading delay
    setTimeout(() => {
      setFollowing(generateMockFollowing())
      setLoading(false)
    }, 800)
  }, [router])

  const handleFollow = (userId: string) => {
    setFollowing(prev =>
      prev.map(user =>
        user.id === userId
          ? {
              ...user,
              isFollowing: !user.isFollowing,
              followers: user.isFollowing ? user.followers - 1 : user.followers + 1,
            }
          : user
      )
    )
  }

  const filteredFollowing = following.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  if (loading) {
    return (
      <div className={styles.container}>
        <Navigation />
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading following...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Navigation />

      <main className={styles.main}>
        <div className={styles.followingContainer}>
          <div className={styles.header}>
            <button onClick={() => router.back()} className={styles.backButton}>
              ← Back
            </button>
            <h1 className={styles.title}>Following</h1>
            <div className={styles.count}>{following.length} following</div>
          </div>

          <div className={styles.searchSection}>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Search following..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              <div className={styles.searchIcon}>🔍</div>
            </div>
          </div>

          <div className={styles.followingList}>
            {filteredFollowing.length === 0 ? (
              <div className={styles.noResults}>
                {searchQuery ? (
                  <p>No users found matching "{searchQuery}"</p>
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>👥</div>
                    <h3>Not following anyone yet</h3>
                    <p>When you follow people, they'll appear here.</p>
                    <button 
                      onClick={() => router.push("/search")} 
                      className={styles.findPeopleButton}
                    >
                      Find people to follow
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.userList}>
                {filteredFollowing.map((user) => (
                  <UserCard key={user.id} user={user} onFollow={handleFollow} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
