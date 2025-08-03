import express from "express"
import { ToggleLike, GetPostLikes, GetUserLikes } from "../services/likes-service.js"
import type { User } from "../types.js"

export const LikesRouter = express.Router()

// POST /api/likes/toggle - Toggle like/unlike for a post
LikesRouter.post("/likes/toggle", async (req, res) => {
  try {
    const { postId } = req.body
    const user = req.user as User

    console.log("=== USER DEBUG ===")
    console.log("User object:", user)
    console.log("User.actorId:", user?.actorId) 

    if (!user || !user.actorId) {
      return res.status(401).json({ error: "User not authenticated" })
    }

    if (!postId) {
      return res.status(400).json({ error: "postId is required" })
    }

    const result = await ToggleLike(user.actorId, postId)
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
    const user = req.user as User

    // Pass actorId if user is authenticated, otherwise undefined
    const postLikes = await GetPostLikes(postId, user?.actorId)
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
      return res.status(400).json({ error: "userId (actorId) is required" })
    }

    const userLikes = await GetUserLikes(userId)
    res.json({ likes: userLikes })
  } catch (error) {
    console.error("Error getting user likes:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})
