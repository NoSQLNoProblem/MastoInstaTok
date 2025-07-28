"use client"

import { useState, useEffect } from "react"
import Navigation from "@/components/Navigation"
import UserCard from "@/components/UserCard"
import styles from "./search.module.css"

interface User {
  id: string
  username: string
  fullName: string
  avatar: string
  isFollowing: boolean
  followers: number
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  // Generate mock users
  const generateMockUsers = (query: string): User[] => {
    if (!query.trim()) return []

    const mockUsers: User[] = []
    for (let i = 1; i <= 10; i++) {
      mockUsers.push({
        id: `user-${i}`,
        username: `${query.toLowerCase()}${i}`,
        fullName: `${query} User ${i}`,
        avatar: `/placeholder.svg?height=60&width=60&query=user avatar ${i}`,
        isFollowing: Math.random() > 0.5,
        followers: Math.floor(Math.random() * 1000),
      })
    }
    return mockUsers
  }

  // Search users with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        setLoading(true)
        // Simulate API delay
        setTimeout(() => {
          const results = generateMockUsers(searchQuery)
          setUsers(results)
          setLoading(false)
        }, 500)
      } else {
        setUsers([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleFollow = (userId: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? {
              ...user,
              isFollowing: !user.isFollowing,
              followers: user.isFollowing ? user.followers - 1 : user.followers + 1,
            }
          : user,
      ),
    )
  }

  return (
    <div className={styles.container}>
      <Navigation />

      <main className={styles.main}>
        <div className={styles.searchContainer}>
          <h1 className={styles.title}>Search Users</h1>

          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search for users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <div className={styles.searchIcon}>🔍</div>
          </div>

          <div className={styles.results}>
            {loading && (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Searching...</p>
              </div>
            )}

            {!loading && searchQuery && users.length === 0 && (
              <div className={styles.noResults}>
                <p>No users found for "{searchQuery}"</p>
              </div>
            )}

            {!loading && users.length > 0 && (
              <div className={styles.userList}>
                {users.map((user) => (
                  <UserCard key={user.id} user={user} onFollow={handleFollow} />
                ))}
              </div>
            )}

            {!searchQuery && (
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
