"use client"

import styles from "./UserCard.module.css"

interface UserCardProps {
  user: {
    id: string
    username: string
    fullName: string
    bio: string
    avatar: string
    isFollowing: boolean
    followers: number
  }
  onFollow: (userId: string) => void
  onUnfollow: (userId: string) => void
}

export default function UserCard({ user, onFollow, onUnfollow }: UserCardProps) {
  const handleClick = () => {
    if (user.isFollowing) {
      onUnfollow(user.id)
    } else {
      onFollow(user.id)
    }
  }

  return (
    <div className={styles.userCard}>
      <div className={styles.userInfo}>
        <div className={styles.avatar}>
          <img src={user.avatar || "/placeholder.svg"} alt={user.username} className={styles.avatarImage} />
        </div>
        <div className={styles.userDetails}>
          <h3 className={styles.username}>{user.username}</h3>
          <p className={styles.fullName}>{user.fullName}</p>
          <p className={styles.fullName}>{user.bio}</p>
          <p className={styles.followers}>{user.followers.toLocaleString()} followers</p>
        </div>
      </div>

      <button
        onClick={handleClick}
        className={`${styles.followButton} ${user.isFollowing ? styles.following : ""}`}
      >
        {user.isFollowing ? "Unfollow" : "Follow"}
      </button>
    </div>
  )
}
