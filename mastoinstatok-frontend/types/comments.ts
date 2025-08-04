export type Comment = {
  _id: string;
  userId: string;
  postId: string;
  content: string;
  createdAt: string;
  displayName: string;
  avatarURL?: string; 
};