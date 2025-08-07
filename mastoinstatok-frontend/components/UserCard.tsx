"use client"

import styles from "./UserCard.module.css"
const placeHolderAvatar = "/placeholder-user.jpg"

interface UserCardProps {
  user: {
    actorId: string
    displayName: string
    fullHandle: string
    bio: string
    avatarURL: string | undefined
    isFollowing?: boolean
    isFollowedBy?: boolean
    followers?: number
  }
  onFollow: (fullHandle: string) => void
  onUnfollow: (fullHandle: string) => void
}

export default function UserCard({ user, onFollow, onUnfollow }: UserCardProps) {
  const handleClick = () => {
    if (user.isFollowing) {
      onUnfollow(user.fullHandle)
    } else {
      onFollow(user.fullHandle)
    }
  }

  return (
    <div className={styles.userCard}>
      <div className={styles.userInfo}>
        <div className={styles.avatar}>
          <img src={user?.avatarURL || placeHolderAvatar} alt={user.displayName} className={styles.avatarImage} />
        </div>
        <div className={styles.userDetails}>
          <h3 className={styles.username}>{user.displayName}</h3>
          <p className={styles.fullName}>{user.fullHandle}</p>
          <p className={styles.fullName}>{user.bio}</p>
          {user.followers && (
            <p className={styles.followers}>{user.followers.toLocaleString()} followers</p>
          )}
          {user.isFollowedBy && (<p className={styles.mutualFollow}>Follows you</p>)}
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
