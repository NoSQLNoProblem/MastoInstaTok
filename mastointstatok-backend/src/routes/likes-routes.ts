import express from "express"
import { ToggleLike, GetPostLikes, GetUserLikes } from "../services/likes-service.js"
import type { PostData, User } from "../types.js"
import type { Profile } from "passport"
import { FindUser } from "../database/user-queries.js"

export const LikesRouter = express.Router()

// POST /api/likes/toggle - Toggle like/unlike for a post
LikesRouter.post("/likes/toggle", async (req, res) => {
  try {
    const { postId } = req.body
    const user = await FindUser(req.user as Profile) as User;

    console.log("=== USER DEBUG ===")
    console.log("User object:", user)
    console.log("User.actorId:", user?.fullHandle) 

    if (!user || !user.fullHandle) {
      return res.status(401).json({ error: "User not authenticated" })
    }

    if (!postId) {
      return res.status(400).json({ error: "postId is required" })
    }

    const result = await ToggleLike(user.fullHandle, postId)
    res.json({
      message: `Post ${result.action} successfully`,
      ...result,
    })
  } catch (error) {
    console.error("Error toggling like:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /api/likes/:postId - Get likes for a specific post
LikesRouter.get("/likes/:postId", async (req, res) => {
  try {
    const { postId } = req.params
    const user = await FindUser(req.user as Profile) as User;

    // Pass actorId if user is authenticated, otherwise undefined
    const postLikes = await GetPostLikes(postId, user?.fullHandle)
    res.json(postLikes)
  } catch (error) {
    console.error("Error getting post likes:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /api/users/:userId/likes - Get posts liked by a user
LikesRouter.get("/users/:userId/likes", async (req, res) => {
  try {
    const { userId } = req.params
    if (!userId) {
      return res.status(400).json({ error: "userId (googleId) is required" })
    }

    const likedPosts: PostData[] = await GetUserLikes(userId)
    res.json({ likedPosts })
  } catch (error) {
    console.error("Error getting user likes:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})
