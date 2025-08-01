export interface UserPost {
  id: string
  image: string
  caption: string
  likes: number
  timestamp: number
}

export interface UserProfile {
  username: string
  fullName: string
  bio: string
  posts: number
  followers: number
  following: number
  avatar: string
}