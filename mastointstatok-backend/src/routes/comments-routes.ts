import express from "express"
import { AddComment, GetCommentsForPost, DeleteComment } from "../services/comments-service.js"
import type { User } from "../types.js" // Assuming User type is here

export const CommentsRouter = express.Router()

// POST /api/comments - Add a new comment to a post
CommentsRouter.post("/comments", async (req, res) => {
  try {
    const { postId, content } = req.body
    const user = req.user as User

    if (!user || !user.actorId) {
      return res.status(401).json({ error: "User not authenticated" })
    }
    if (!postId || !content) {
      return res.status(400).json({ error: "postId and content are required" })
    }

    const comment = await AddComment(user.actorId, postId, content)
    res.status(201).json({ message: "Comment added successfully", comment })
  } catch (error) {
    console.error("Error adding comment:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /api/posts/:postId/comments - Get all comments for a specific post
CommentsRouter.get("/posts/:postId/comments", async (req, res) => {
  try {
    const { postId } = req.params
    if (!postId) {
      return res.status(400).json({ error: "postId is required" })
    }

    const comments = await GetCommentsForPost(postId)
    res.json({ comments })
  } catch (error) {
    console.error("Error getting comments for post:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// DELETE /api/comments/:commentId - Delete a comment (only by owner)
CommentsRouter.delete("/comments/:commentId", async (req, res) => {
  try {
    const { commentId } = req.params
    const user = req.user as User

    if (!user || !user.actorId) {
      return res.status(401).json({ error: "User not authenticated" })
    }
    if (!commentId) {
      return res.status(400).json({ error: "commentId is required" })
    }

    const deleted = await DeleteComment(commentId, user.actorId) 
    if (deleted) {
      res.json({ message: "Comment deleted successfully" })
    } else {
      // This could mean comment not found, or user is not the owner
      res.status(403).json({ error: "Comment not found or you are not authorized to delete it" })
    }
  } catch (error) {
    console.error("Error deleting comment:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})
