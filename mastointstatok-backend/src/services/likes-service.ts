import client from "../lib/mongo.js"
import type { PostData } from "../types.js"
import type { LikeDocument, PostLikesResponse, ToggleLikeResponse } from "../types/PostTypes.js"

const db = client.db("app_db")
const postsCollection = db.collection<PostData>("posts")

export async function ToggleLike(userId: string, postId: string): Promise<ToggleLikeResponse> {
  const post = await postsCollection.findOne({ id: postId })


  if (!post) {
    throw new Error("Post not found")
  }

  let action: "liked" | "unliked"
  let userHasLiked: boolean

  const currentLikedBy = post.likedBy || [];

  if (currentLikedBy.includes(userId)) {
    await postsCollection.updateOne(
        {id: postId},
        {$pull: { likedBy: userId} }
    )
    action = "unliked"
    userHasLiked = false
  } else {
    await postsCollection.updateOne(
        {id: postId},
        {$addToSet: { likedBy: userId }}
    )
    action = "liked"
    userHasLiked = true
  }

  const updatedPost = await postsCollection.findOne({ id: postId })
  const likeCount = updatedPost?.likedBy.length || 0

    return {
      action,
      likeCount,
      userHasLiked
    }
}

export async function GetPostLikes(postId: string, currentUserId?: string): Promise<PostLikesResponse> {
    const post = await postsCollection.findOne({ id: postId })

    if (!post) {
        return {
            postId,
            likeCount: 0,
            userHasLiked: false,
        }
    }

    const likeCount = post.likedBy.length || 0
    const userHasLiked = currentUserId ? (post.likedBy.includes(currentUserId) || false) : false

  return {
    postId,
    likeCount,
    userHasLiked,
  }
}

export async function GetUserLikes(userId: string) {
    return await postsCollection.find<PostData>({ likedBy: userId }).toArray()
}
