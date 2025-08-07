"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/Navigation"
import UserCard from "@/components/UserCard"
import styles from "./followers.module.css"
import { useAuth } from "@/contexts/AuthContext"
import React from "react"

interface User {
  id: string
  username: string
  fullName: string
  avatar: string
  isFollowing: boolean
  followers: number
}

export default function FollowersPage() {
  const [followers, setFollowers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
      const { isAuthenticated, isLoading } = useAuth();


  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth");
    }
    // Generate mock followers data
    const generateMockFollowers = (): User[] => {
      const mockFollowers: User[] = []
      const followerNames = [
        "alex_photo", "sarah_travels", "mike_fitness", "emma_art", "john_music",
        "lisa_food", "david_tech", "anna_fashion", "chris_nature", "maya_design",
        "tom_sports", "julia_books", "ryan_gaming", "sophie_dance", "mark_cooking",
        "nina_yoga", "paul_movies", "zoe_pets", "luke_cars", "ivy_plants",
        "sam_coffee", "ruby_vintage", "max_adventure", "chloe_beauty", "noah_science"
      ]

      for (let i = 0; i < followerNames.length; i++) {
        const username = followerNames[i]

        mockFollowers.push({
          id: `follower-${i + 1}`,
          username: username,
          fullName: username.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          avatar: `/placeholder.svg?height=60&width=60&query=user avatar ${username}`,
          isFollowing: Math.random() > 0.3, // 70% chance of following back
          followers: Math.floor(Math.random() * 2000) + 100,
        })
      }

      return mockFollowers.sort((a, b) => a.username.localeCompare(b.username))
    }

    // Simulate loading delay
    setTimeout(() => {
      setFollowers(generateMockFollowers())
      setLoading(false)
    }, 800)
  }, [router])

  const handleFollow = (userId: string) => {
    setFollowers(prev =>
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

  const filteredFollowers = followers.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className={styles.container}>
        <Navigation />
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading followers...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Navigation />

      <main className={styles.main}>
        <div className={styles.followersContainer}>
          <div className={styles.header}>
            <button onClick={() => router.back()} className={styles.backButton}>
              ← Back
            </button>
            <h1 className={styles.title}>Followers</h1>
            <div className={styles.count}>{followers.length} followers</div>
          </div>

          <div className={styles.searchSection}>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Search followers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              <div className={styles.searchIcon}>🔍</div>
            </div>
          </div>

          <div className={styles.followersList}>
            {filteredFollowers.length === 0 ? (
              <div className={styles.noResults}>
                {searchQuery ? (
                  <p>No followers found matching "{searchQuery}"</p>
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>👥</div>
                    <h3>No followers yet</h3>
                    <p>When people follow you, they'll appear here.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.userList}>
                {filteredFollowers.map((user) => (
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
