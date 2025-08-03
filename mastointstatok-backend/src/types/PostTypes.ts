import type { ObjectId } from "mongodb"

export type LikeDocument = {
  _id?: ObjectId
  userId: string 
  postId: string 
  createdAt: Date
}

export type CommentDocument = {
  _id?: ObjectId
  userId: string 
  postId: string 
  content: string
  createdAt: Date
}

export type PostLikesResponse = {
  postId: string
  likeCount: number
  userHasLiked: boolean
  likes: LikeDocument[]
}

export type ToggleLikeResponse = {
  action: "liked" | "unliked"
  likeCount: number
  userHasLiked: boolean
}
