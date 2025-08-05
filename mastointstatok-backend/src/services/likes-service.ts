import client from "../lib/mongo.js"
import type { LikeDocument, PostLikesResponse, ToggleLikeResponse } from "../types/PostTypes.js"

const db = client.db("app_db")

export async function ToggleLike(userId: string, postId: string): Promise<ToggleLikeResponse> {
  const likesCollection = db.collection<LikeDocument>("likes")

  const existingLike = await likesCollection.findOne({ userId, postId })

  if (existingLike) {
    await likesCollection.deleteOne({ userId, postId })

    const likeCount = await likesCollection.countDocuments({ postId })

    return {
      action: "unliked",
      likeCount,
      userHasLiked: false,
    }
  } else {
    const likeToInsert: LikeDocument = {
      userId,
      postId,
      createdAt: new Date(),
    }

    await likesCollection.insertOne(likeToInsert)

    const likeCount = await likesCollection.countDocuments({ postId })

    return {
      action: "liked",
      likeCount,
      userHasLiked: true,
    }
  }
}

export async function GetPostLikes(postId: string, currentUserId?: string): Promise<PostLikesResponse> {
  const likesCollection = db.collection<LikeDocument>("likes")

  const likes = await likesCollection.find({ postId }).toArray()
  const likeCount = likes.length
  const userHasLiked = currentUserId ? likes.some((like) => like.userId === currentUserId) : false

  return {
    postId,
    likeCount,
    userHasLiked,
    likes,
  }
}

export async function GetUserLikes(userId: string) {
  const likesCollection = db.collection<LikeDocument>("likes")
  return await likesCollection.find({ userId }).toArray()
}
