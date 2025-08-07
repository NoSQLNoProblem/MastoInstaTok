"use client"

import styles from "./UserCard.module.css"

interface UserCardProps {
  user: {
    id: string
    username: string
    fullName: string
    avatar: string
    isFollowing: boolean
    followers: number
  }
  onFollow: (userId: string) => void
}

export default function UserCard({ user, onFollow }: UserCardProps) {
  return (
    <div className={styles.userCard}>
      <div className={styles.userInfo}>
        <div className={styles.avatar}>
          <img src={user.avatar || "/placeholder.svg"} alt={user.username} className={styles.avatarImage} />
        </div>
        <div className={styles.userDetails}>
          <h3 className={styles.username}>{user.username}</h3>
          <p className={styles.fullName}>{user.fullName}</p>
          <p className={styles.followers}>{user.followers.toLocaleString()} followers</p>
        </div>
      </div>

      <button
        onClick={() => onFollow(user.id)}
        className={`${styles.followButton} ${user.isFollowing ? styles.following : ""}`}
      >
        {user.isFollowing ? "Unfollow" : "Follow"}
      </button>
    </div>
  )
}
