import client from "../lib/mongo.js"
import type { CommentDocument } from "../types/PostTypes.js"
import { ObjectId } from "mongodb"

const db = client.db("app_db")
const commentsCollection = db.collection<CommentDocument>("comments")

/**
 * Adds a new comment to a post.
 * @param userId The Google ID of the user making the comment.
 * @param postId The ID of the post the comment belongs to.
 * @param content The content of the comment.
 * @returns The newly created comment document.
 */
export async function AddComment(userId: string, postId: string, content: string): Promise<CommentDocument> {
  const newComment: CommentDocument = {
    userId,
    postId,
    content,
    createdAt: new Date(),
  }
  const result = await commentsCollection.insertOne(newComment)
  return { ...newComment, _id: result.insertedId }
}

/**
 * Retrieves all comments for a specific post, sorted by creation date.
 * @param postId The ID of the post to get comments for.
 * @returns An array of comment documents.
 */
export async function GetCommentsForPost(postId: string): Promise<CommentDocument[]> {
  return await commentsCollection.find({ postId }).sort({ createdAt: 1 }).toArray()
}

/**
 * Deletes a comment by its ID, ensuring the requesting user is the owner.
 * @param commentId The ID of the comment to delete.
 * @param userId The Google ID of the user attempting to delete the comment.
 * @returns True if the comment was deleted, false otherwise (e.g., not found or not owner).
 */
export async function DeleteComment(commentId: string, userId: string): Promise<boolean> {
  // Ensure commentId is a valid ObjectId
  if (!ObjectId.isValid(commentId)) {
    console.warn(`Invalid ObjectId format for commentId: ${commentId}`)
    return false
  }

  const result = await commentsCollection.deleteOne({
    _id: new ObjectId(commentId),
    userId: userId, // Ensure only the owner can delete
  })
  return result.deletedCount === 1
}
