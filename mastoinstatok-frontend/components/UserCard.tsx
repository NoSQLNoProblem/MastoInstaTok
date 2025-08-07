"use client"

import { User } from "@/types/auth-context"
import styles from "./UserCard.module.css"

interface UserCardProps {
  user: {
      actorId: string
  displayName: string
  fullHandle: string
  avatarURL: string | undefined
  bio: string
  email?: string
  followers?: number
  isFollowing?: boolean
  isFollowedBy?: boolean
  }
  onFollow: (userId: string) => void
  onUnfollow?: (userId: string) => void
}

export default function UserCard({ user, onFollow }: UserCardProps) {
  return (
    <div className={styles.userCard}>
      <div className={styles.userInfo}>
        <div className={styles.avatar}>
          <img src={user.avatarURL || "/placeholder.svg"} alt={user.displayName} className={styles.avatarImage} />
        </div>
        <div className={styles.userDetails}>
          <h3 className={styles.username}>{user.displayName}</h3>
          <p className={styles.fullName}>{user.fullHandle}</p>
        </div>
      </div>

      <button
        onClick={() => onFollow(user.actorId)}
        className={`${styles.followButton} ${user.isFollowing ? styles.following : ""}`}
      >
        {user.isFollowing ? "Unfollow" : "Follow"}
      </button>
    </div>
  )
}
