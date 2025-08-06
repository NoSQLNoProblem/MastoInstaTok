
export interface PostProps {
  post: PostData;
  onLike: (postId: string) => void;
}

export interface PostData {
  id: string;
  username: string;
  userHandle: string;
  mediaURL: string;
  mediaType: "image" | "video";
  caption: string;
  likedBy: string[];
  timestamp: string;
  avatar?: string;
}