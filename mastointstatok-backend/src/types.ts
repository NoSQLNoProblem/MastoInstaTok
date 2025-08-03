import type { Follow, Note } from "@fedify/fedify";

export type User = {
    googleId ?: string,
    email ?: string | undefined,
    displayName: string | null,
    actorId: string,
    bio : string | null,
    username ?: string,
    fullHandle : string,
    avatarURL ?: string
  };

export type Follower = {
  followerId : string,
  inboxUri : string,
  actorId : string
}

export type Following = {
  followerId : string,
  followeeId : string,
  inboxUri : string
}

export type AcceptObject = {
  id : URL,
  actor : URL,
  object : Follow,
  to: URL
}

export type FollowObject = {
  id: string,
  actor: string,
  object : string
}

export type UndoObject = {
  id: string,
  actor: string,
  object : string
}

export type PostData =  {
  id: string;
  userHandle: string;
  mediaURL: string;
  mediaType: "image" | "video";
  fileType : FileType;
  caption: string;
  likes: number;
  isLiked: boolean;
  timestamp: number;
}

export type NoteObject = {
  id: string;
  senderId : string;
  content : string;
  attachmentUrl : string;
}

export type Attachment = {
  id : URL,
  url : URL
}

export type CreateObject = {
  id: string,
  actor: string,
  object: Note
}

export type FileType =  "png" | "jpeg" | "mp4"