import { NextResponse } from 'next/server';
import { Comment } from '@/types/comments';

// Helper function to generate mock comments for a given post
const generateMockComments = (postId: string): Comment[] => {
  const comments: Comment[] = [];
  const count = Math.floor(Math.random() * 10) + 1; // Generate 1 to 10 comments
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const randomUser = `user${Math.floor(Math.random() * 20)}`;
    comments.push({
      _id: `comment_${postId}_${i}`,
      userId: `http://localhost:5000/api/users/${randomUser}`,
      postId: postId,
      content: `This is a mock comment #${i + 1} from ${randomUser}. What a great post!`,
      createdAt: new Date(now.getTime() - i * 60000 * 15).toISOString(), // 15 mins apart
      displayName: randomUser,
      avatarURL: `https://i.pravatar.cc/40?u=${randomUser}`
    });
  }
  return comments.reverse(); // Show newest first
};

// Handler for GET /api/posts/[postId]/comments
export async function GET(
  request: Request,
  { params }: { params: { postId: string } }
) {
  const postId = params.postId;
  const comments = generateMockComments(postId);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return NextResponse.json({ comments });
}

// Handler for POST /api/posts/[postId]/comments
// Note: Your request specified POST /comments, but for a RESTful mock,
// it's better to post to the specific resource.
// The CommentModal will post to this endpoint.
export async function POST(
  request: Request,
  { params }: { params: { postId: string } }
) {
  const postId = params.postId;
  const body = await request.json();
  const { content } = body;
  
  // Simulate creating a new comment
  const newComment: Comment = {
    _id: `new_comment_${Date.now()}`,
    userId: 'http://localhost:5000/api/users/currentUser-mock', // Mocked current user
    postId: postId,
    content: content,
    createdAt: new Date().toISOString(),
    displayName: 'currentUser-mock',
    avatarURL: 'https://i.pravatar.cc/40?u=currentUser-mock'
  };

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return NextResponse.json({
    message: "Comment added successfully",
    comment: newComment,
  });
}
